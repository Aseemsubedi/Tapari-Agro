import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type DigitalLotSlice = {
  stockPurchaseId: string;
  vendorId: string;
  quantity: number;
  unitCost: number;
  billNo: string;
};

const ownedLotWhere = {
  OR: [{ stockKind: "owned" }, { stockKind: "" }],
};

/** Sum open digital reservation remainings for a product. */
export async function sumDigitalRemaining(tx: Tx, productId: string) {
  const lots = await tx.stockPurchase.findMany({
    where: {
      productId,
      stockKind: "digital",
      remainingQty: { gt: 0 },
    },
    select: { remainingQty: true },
  });
  return lots.reduce((s, l) => s + l.remainingQty, 0);
}

/**
 * Refresh Product.digitalAvailable from digital lots and set inventoryMode.
 * sellerVendorId / sellerUnitCost become defaults from the oldest open lot
 * (or latest purchase if none open).
 */
export async function syncDigitalAvailable(tx: Tx, productId: string) {
  const [product, openLots, latestDigital] = await Promise.all([
    tx.product.findUnique({
      where: { id: productId },
      select: { stock: true, sellerVendorId: true, sellerUnitCost: true },
    }),
    tx.stockPurchase.findMany({
      where: {
        productId,
        stockKind: "digital",
        remainingQty: { gt: 0 },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        vendorId: true,
        unitCost: true,
        remainingQty: true,
      },
    }),
    tx.stockPurchase.findFirst({
      where: { productId, stockKind: "digital" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { vendorId: true, unitCost: true },
    }),
  ]);
  if (!product) return;

  const digitalAvailable = openLots.reduce((s, l) => s + l.remainingQty, 0);
  const owned = Math.max(0, product.stock);
  let inventoryMode = "owned";
  if (owned > 0 && digitalAvailable > 0) inventoryMode = "hybrid";
  else if (digitalAvailable > 0) inventoryMode = "digital";

  const primary = openLots[0] ?? latestDigital;
  const sellerVendorId =
    primary?.vendorId ?? product.sellerVendorId ?? null;
  const sellerUnitCost =
    primary && primary.unitCost > 0
      ? primary.unitCost
      : product.sellerUnitCost;

  await tx.product.update({
    where: { id: productId },
    data: {
      digitalAvailable,
      inventoryMode,
      sellerVendorId,
      sellerUnitCost,
    },
  });
}

/** Open digital lots with remaining, oldest first. */
export async function listOpenDigitalLots(tx: Tx, productId: string) {
  return tx.stockPurchase.findMany({
    where: {
      productId,
      stockKind: "digital",
      remainingQty: { gt: 0 },
      vendorId: { not: null },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      vendorId: true,
      unitCost: true,
      remainingQty: true,
      billNo: true,
      createdAt: true,
      vendor: { select: { id: true, name: true } },
    },
  });
}

/**
 * Consume digital reservation lots FIFO. Returns per-lot slices.
 * Does not update Product.digitalAvailable — caller must syncDigitalAvailable.
 */
export async function consumeDigitalLotsFifo(
  tx: Tx,
  productId: string,
  quantity: number,
): Promise<DigitalLotSlice[]> {
  let need = quantity;
  if (need <= 0) return [];

  const lots = await tx.stockPurchase.findMany({
    where: {
      productId,
      stockKind: "digital",
      remainingQty: { gt: 0 },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const slices: DigitalLotSlice[] = [];
  for (const lot of lots) {
    if (need <= 0) break;
    if (!lot.vendorId) continue;
    const take = Math.min(lot.remainingQty, need);
    if (take <= 0) continue;
    await tx.stockPurchase.update({
      where: { id: lot.id },
      data: { remainingQty: lot.remainingQty - take },
    });
    slices.push({
      stockPurchaseId: lot.id,
      vendorId: lot.vendorId,
      quantity: take,
      unitCost: lot.unitCost,
      billNo: lot.billNo,
    });
    need -= take;
  }

  if (need > 0) {
    throw new Error(
      `Digital stock short by ${need} — refresh inventory and try again.`,
    );
  }
  return slices;
}

/** Put qty back onto specific digital lots (used when releasing a reservation). */
export async function restoreDigitalLotSlices(
  tx: Tx,
  slices: { stockPurchaseId: string; quantity: number }[],
) {
  for (const slice of slices) {
    if (slice.quantity <= 0) continue;
    const lot = await tx.stockPurchase.findUnique({
      where: { id: slice.stockPurchaseId },
    });
    if (!lot || lot.stockKind !== "digital") continue;
    const next = Math.min(lot.quantity, lot.remainingQty + slice.quantity);
    await tx.stockPurchase.update({
      where: { id: lot.id },
      data: { remainingQty: next },
    });
  }
}

/** Where-clause helper: owned warehouse lots only (exclude digital reservations). */
export function ownedLotsFilter(productId: string) {
  return {
    productId,
    remainingQty: { gt: 0 },
    NOT: { stockKind: "digital" },
  };
}

/**
 * Align digital lot remainings to a target total (manual inventory adjust).
 * Increases go onto the newest open lot, or create a reservation lot if needed.
 * Decreases consume oldest digital lots FIFO.
 */
export async function setDigitalRemainingTotal(
  tx: Tx,
  productId: string,
  targetQty: number,
) {
  const target = Math.max(0, targetQty);
  const current = await sumDigitalRemaining(tx, productId);
  const delta = target - current;

  if (delta === 0) {
    await syncDigitalAvailable(tx, productId);
    return;
  }

  if (delta < 0) {
    await consumeDigitalLotsFifo(tx, productId, -delta);
    await syncDigitalAvailable(tx, productId);
    return;
  }

  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { sellerVendorId: true, sellerUnitCost: true },
  });
  const newest = await tx.stockPurchase.findFirst({
    where: { productId, stockKind: "digital" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (newest) {
    await tx.stockPurchase.update({
      where: { id: newest.id },
      data: {
        quantity: newest.quantity + delta,
        remainingQty: newest.remainingQty + delta,
      },
    });
  } else if (product?.sellerVendorId) {
    await tx.stockPurchase.create({
      data: {
        productId,
        vendorId: product.sellerVendorId,
        billNo: "manual",
        quantity: delta,
        remainingQty: delta,
        stockKind: "digital",
        unitCost: Math.max(0, product.sellerUnitCost ?? 0),
        amountPaid: 0,
        paid: true,
        payMethod: "reservation",
        note: "Manual digital availability",
      },
    });
  } else {
    // No seller / lots — keep cache only until a reservation is recorded
    await tx.product.update({
      where: { id: productId },
      data: { digitalAvailable: target },
    });
    return;
  }

  await syncDigitalAvailable(tx, productId);
}

export { ownedLotWhere };
