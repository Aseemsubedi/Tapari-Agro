import type { Prisma } from "@prisma/client";
import { allocateSaleQty, sellableQty } from "@/lib/inventory-mode";
import {
  consumeDigitalLotsFifo,
  restoreDigitalLotSlices,
  syncDigitalAvailable,
} from "@/lib/digital-lots";

type Tx = Prisma.TransactionClient;

/** Backfill allocation for orders created before hybrid inventory. */
export function normalizeLineAllocation<
  T extends {
    quantity: number;
    ownedQty: number;
    digitalQty: number;
    fulfillMode: string;
  },
>(item: T): T & { ownedQty: number; digitalQty: number } {
  if (item.ownedQty > 0 || item.digitalQty > 0) return item;
  return {
    ...item,
    ownedQty: item.quantity,
    digitalQty: 0,
    fulfillMode: item.fulfillMode || "owned",
  };
}

export type AllocatedLine = {
  productId: string;
  name: string;
  price: number;
  unitCost: number;
  quantity: number;
  fulfillMode: string;
  ownedQty: number;
  digitalQty: number;
  digitalReserved: boolean;
  vendorId: string | null;
  sellerUnitCost: number;
};

/** Build order line fields + validate sellable qty (does not mutate stock). */
export function buildAllocatedLines(
  items: { productId: string; quantity: number }[],
  products: {
    id: string;
    name: string;
    price: number;
    stock: number;
    costPrice: number;
    digitalAvailable: number;
    inventoryMode: string;
    sellerUnitCost: number;
    sellerVendorId: string | null;
  }[],
): AllocatedLine[] {
  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new Error("One or more products are unavailable");
    }
    const available = sellableQty(product);
    if (available < item.quantity) {
      throw new Error(
        `${product.name} is sold out or has too few left — please update your cart.`,
      );
    }
    const alloc = allocateSaleQty(product, item.quantity);
    // Digital vendor is resolved from lots at reserve time (multi-supplier).
    if (alloc.digitalQty > 0 && alloc.digitalQty > product.digitalAvailable) {
      throw new Error(
        `${product.name} is temporarily unavailable. Please try again later or WhatsApp us.`,
      );
    }
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      unitCost: alloc.unitCost,
      quantity: item.quantity,
      fulfillMode: alloc.fulfillMode,
      ownedQty: alloc.ownedQty,
      digitalQty: alloc.digitalQty,
      digitalReserved: false,
      vendorId: alloc.vendorId,
      sellerUnitCost: alloc.sellerUnitCost,
    };
  });
}

/** Consume owned portion immediately (FIFO). */
export async function consumeOwnedAllocation(
  tx: Tx,
  line: { productId: string; name: string; ownedQty: number },
  consumeLotsFifo: (
    tx: Tx,
    productId: string,
    quantity: number,
  ) => Promise<void>,
) {
  if (line.ownedQty <= 0) return;
  const updated = await tx.product.updateMany({
    where: { id: line.productId, stock: { gte: line.ownedQty } },
    data: { stock: { decrement: line.ownedQty } },
  });
  if (updated.count === 0) {
    throw new Error(`Not enough stock for ${line.name}`);
  }
  await consumeLotsFifo(tx, line.productId, line.ownedQty);
  await syncDigitalAvailable(tx, line.productId);
}

/** Reserve digital portion from supplier lots FIFO; record per-lot slices. */
export async function reserveDigitalAllocation(
  tx: Tx,
  line: {
    id?: string;
    productId: string;
    name: string;
    quantity?: number;
    ownedQty?: number;
    digitalQty: number;
    digitalReserved?: boolean;
    unitCost?: number;
  },
) {
  if (line.digitalQty <= 0 || line.digitalReserved) return;

  const product = await tx.product.findUnique({
    where: { id: line.productId },
    select: {
      digitalAvailable: true,
      costPrice: true,
      stock: true,
    },
  });
  if (!product || product.digitalAvailable < line.digitalQty) {
    throw new Error(
      `${line.name} is sold out or has too few left — please update your cart.`,
    );
  }

  const slices = await consumeDigitalLotsFifo(
    tx,
    line.productId,
    line.digitalQty,
  );
  await syncDigitalAvailable(tx, line.productId);

  const digitalCostTotal = slices.reduce(
    (s, x) => s + x.quantity * x.unitCost,
    0,
  );
  const sellerUnitCost =
    line.digitalQty > 0
      ? Math.round(digitalCostTotal / line.digitalQty)
      : 0;
  const primaryVendorId = slices[0]?.vendorId ?? null;

  const ownedQty = line.ownedQty ?? 0;
  const qty = line.quantity ?? ownedQty + line.digitalQty;
  const ownedCost = Math.max(0, product.costPrice ?? 0);
  const costTotal = ownedQty * ownedCost + digitalCostTotal;
  const unitCost = qty > 0 ? Math.round(costTotal / qty) : 0;

  if (line.id) {
    await tx.orderItemDigitalLot.createMany({
      data: slices.map((slice) => ({
        orderItemId: line.id!,
        stockPurchaseId: slice.stockPurchaseId,
        vendorId: slice.vendorId,
        quantity: slice.quantity,
        unitCost: slice.unitCost,
      })),
    });
    await tx.orderItem.update({
      where: { id: line.id },
      data: {
        digitalReserved: true,
        vendorId: primaryVendorId,
        sellerUnitCost,
        unitCost,
      },
    });
  }
}

/** Release reserved digital qty back onto the same lots. */
export async function releaseDigitalAllocation(
  tx: Tx,
  line: {
    id?: string;
    productId: string;
    digitalQty: number;
    digitalReserved?: boolean;
  },
) {
  if (line.digitalQty <= 0 || !line.digitalReserved) return;

  if (line.id) {
    const slices = await tx.orderItemDigitalLot.findMany({
      where: { orderItemId: line.id },
      select: { stockPurchaseId: true, quantity: true },
    });
    if (slices.length > 0) {
      await restoreDigitalLotSlices(tx, slices);
      await tx.orderItemDigitalLot.deleteMany({
        where: { orderItemId: line.id },
      });
    } else {
      // Legacy lines without lot slices — bump newest digital lot or cache
      const newest = await tx.stockPurchase.findFirst({
        where: { productId: line.productId, stockKind: "digital" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      if (newest) {
        await tx.stockPurchase.update({
          where: { id: newest.id },
          data: {
            remainingQty: Math.min(
              newest.quantity,
              newest.remainingQty + line.digitalQty,
            ),
          },
        });
      } else {
        await tx.product.update({
          where: { id: line.productId },
          data: { digitalAvailable: { increment: line.digitalQty } },
        });
      }
    }
  } else {
    await tx.product.update({
      where: { id: line.productId },
      data: { digitalAvailable: { increment: line.digitalQty } },
    });
  }

  await syncDigitalAvailable(tx, line.productId);

  if (line.id) {
    await tx.orderItem.update({
      where: { id: line.id },
      data: { digitalReserved: false },
    });
  }
}

/** Restore owned portion to stock + lots. */
export async function restoreOwnedAllocation(
  tx: Tx,
  line: { productId: string; ownedQty: number },
  restoreLotsLifo: (
    tx: Tx,
    productId: string,
    quantity: number,
  ) => Promise<void>,
) {
  if (line.ownedQty <= 0) return;
  await tx.product.update({
    where: { id: line.productId },
    data: { stock: { increment: line.ownedQty } },
  });
  await restoreLotsLifo(tx, line.productId, line.ownedQty);
  await syncDigitalAvailable(tx, line.productId);
}

/**
 * Create seller settlement rows per vendor slice (idempotent).
 * Prefers OrderItemDigitalLot; falls back to single product-level seller.
 */
export async function ensureSellerSettlements(
  tx: Tx,
  orderId: string,
  items: {
    id: string;
    name: string;
    digitalQty: number;
    vendorId: string | null;
    sellerUnitCost: number;
  }[],
) {
  for (const item of items) {
    if (item.digitalQty <= 0) continue;

    const lots = await tx.orderItemDigitalLot.findMany({
      where: { orderItemId: item.id },
    });

    if (lots.length > 0) {
      const byVendor = new Map<
        string,
        { quantity: number; costTotal: number }
      >();
      for (const lot of lots) {
        const cur = byVendor.get(lot.vendorId) ?? {
          quantity: 0,
          costTotal: 0,
        };
        cur.quantity += lot.quantity;
        cur.costTotal += lot.quantity * lot.unitCost;
        byVendor.set(lot.vendorId, cur);
      }
      for (const [vendorId, agg] of byVendor) {
        const existing = await tx.sellerSettlement.findUnique({
          where: {
            orderItemId_vendorId: { orderItemId: item.id, vendorId },
          },
        });
        if (existing) continue;
        const unitCost =
          agg.quantity > 0 ? Math.round(agg.costTotal / agg.quantity) : 0;
        await tx.sellerSettlement.create({
          data: {
            vendorId,
            orderId,
            orderItemId: item.id,
            productName: item.name,
            quantity: agg.quantity,
            unitCost,
            amount: agg.quantity * unitCost,
          },
        });
      }
      continue;
    }

    if (!item.vendorId) continue;
    const existing = await tx.sellerSettlement.findUnique({
      where: {
        orderItemId_vendorId: {
          orderItemId: item.id,
          vendorId: item.vendorId,
        },
      },
    });
    if (existing) continue;
    const unitCost = Math.max(0, item.sellerUnitCost);
    await tx.sellerSettlement.create({
      data: {
        vendorId: item.vendorId,
        orderId,
        orderItemId: item.id,
        productName: item.name,
        quantity: item.digitalQty,
        unitCost,
        amount: item.digitalQty * unitCost,
      },
    });
  }
}

/** Delete unpaid settlements when cancelling (paid ones stay as history). */
export async function removeUnpaidSettlementsForOrder(tx: Tx, orderId: string) {
  await tx.sellerSettlement.deleteMany({
    where: { orderId, paid: false, amountPaid: 0 },
  });
}
