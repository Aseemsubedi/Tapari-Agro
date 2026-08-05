import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

/** Write off remaining units from one purchase lot (damage / expiry). */
export async function consumeLotById(
  tx: Tx,
  lotId: string,
  quantity: number,
) {
  if (quantity <= 0) return;
  const lot = await tx.stockPurchase.findUnique({ where: { id: lotId } });
  if (!lot) throw new Error("Lot not found.");
  if (lot.remainingQty < quantity) {
    throw new Error(
      `Lot only has ${lot.remainingQty} left — cannot write off ${quantity}.`,
    );
  }
  await tx.stockPurchase.update({
    where: { id: lotId },
    data: { remainingQty: lot.remainingQty - quantity },
  });
}

/** Consume stock from oldest lots first (FIFO). Throws if lots cannot cover qty. */
export async function consumeLotsFifo(
  tx: Tx,
  productId: string,
  quantity: number,
) {
  let need = quantity;
  if (need <= 0) return;

  const lots = await tx.stockPurchase.findMany({
    where: {
      productId,
      remainingQty: { gt: 0 },
      NOT: { stockKind: "digital" },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  for (const lot of lots) {
    if (need <= 0) break;
    const take = Math.min(lot.remainingQty, need);
    if (take <= 0) continue;
    await tx.stockPurchase.update({
      where: { id: lot.id },
      data: { remainingQty: lot.remainingQty - take },
    });
    need -= take;
  }

  if (need > 0) {
    throw new Error(
      `Stock lots short by ${need} for this product — refresh inventory and try again.`,
    );
  }
}

/**
 * Restore stock into newest lots that still have room.
 * Leftover (e.g. seed stock without lots) is ignored — product.stock is source of truth.
 */
export async function restoreLotsLifo(
  tx: Tx,
  productId: string,
  quantity: number,
) {
  let left = quantity;
  if (left <= 0) return;

  const lots = await tx.stockPurchase.findMany({
    where: { productId, NOT: { stockKind: "digital" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  for (const lot of lots) {
    if (left <= 0) break;
    const room = Math.max(0, lot.quantity - lot.remainingQty);
    const add = Math.min(room, left);
    if (add <= 0) continue;
    await tx.stockPurchase.update({
      where: { id: lot.id },
      data: { remainingQty: lot.remainingQty + add },
    });
    left -= add;
  }
}

/** Align owned lot remainingQty to product.stock (keep remaining in newest lots). */
export async function reconcileLotsToStock(
  tx: Tx,
  productId: string,
  targetStock: number,
) {
  const lots = await tx.stockPurchase.findMany({
    where: { productId, NOT: { stockKind: "digital" } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (lots.length === 0) return;

  let left = Math.max(0, targetStock);
  for (const lot of [...lots].reverse()) {
    const keep = Math.min(lot.quantity, left);
    await tx.stockPurchase.update({
      where: { id: lot.id },
      data: { remainingQty: keep },
    });
    left -= keep;
  }
}

/**
 * Heal products where Product.stock ≠ Σ lot remainingQty.
 * Safe to call often — only touches drifted products.
 */
export async function ensureLotRemainingSynced() {
  if (!("remainingQty" in Prisma.StockPurchaseScalarFieldEnum)) {
    return;
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      stock: true,
      purchases: {
        where: { NOT: { stockKind: "digital" } },
        select: { remainingQty: true },
      },
    },
  });

  const drifted = products.filter((p) => {
    const rem = p.purchases.reduce((s, l) => s + l.remainingQty, 0);
    return p.purchases.length > 0 && rem !== p.stock;
  });

  if (drifted.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const product of drifted) {
      await reconcileLotsToStock(tx, product.id, product.stock);
    }
  });
}
