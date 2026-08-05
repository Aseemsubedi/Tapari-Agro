/** Hybrid inventory: owned warehouse + digital (supplier-owned) availability. */

export const INVENTORY_MODES = ["owned", "digital", "hybrid"] as const;
export type InventoryMode = (typeof INVENTORY_MODES)[number];

export function isInventoryMode(value: string): value is InventoryMode {
  return (INVENTORY_MODES as readonly string[]).includes(value);
}

export function inventoryModeLabel(mode: string) {
  switch (mode) {
    case "digital":
      return "Digital";
    case "hybrid":
      return "Hybrid";
    default:
      return "Owned";
  }
}

export type StockSourceProduct = {
  stock: number;
  digitalAvailable: number;
  inventoryMode?: string | null;
  costPrice?: number | null;
  sellerUnitCost?: number | null;
  sellerVendorId?: string | null;
};

/** Units customers can buy right now. */
export function sellableQty(product: StockSourceProduct): number {
  const mode = (product.inventoryMode || "owned") as InventoryMode;
  const owned = Math.max(0, product.stock);
  const digital = Math.max(0, product.digitalAvailable);
  if (mode === "digital") return digital;
  if (mode === "hybrid") return owned + digital;
  return owned;
}

export function isInStock(product: StockSourceProduct): boolean {
  return sellableQty(product) > 0;
}

export type LineAllocation = {
  ownedQty: number;
  digitalQty: number;
  fulfillMode: InventoryMode;
  unitCost: number;
  sellerUnitCost: number;
  vendorId: string | null;
};

/**
 * Prefer owned stock first (hybrid), then digital.
 * Does not mutate — caller applies stock changes.
 */
export function allocateSaleQty(
  product: StockSourceProduct,
  quantity: number,
): LineAllocation {
  const qty = Math.max(0, quantity);
  const mode = (product.inventoryMode || "owned") as InventoryMode;
  const owned = Math.max(0, product.stock);
  const digital = Math.max(0, product.digitalAvailable);
  const sellerUnitCost = Math.max(0, product.sellerUnitCost ?? 0);
  const ownedCost = Math.max(0, product.costPrice ?? 0);
  const vendorId = product.sellerVendorId ?? null;

  let ownedQty = 0;
  let digitalQty = 0;

  if (mode === "owned") {
    ownedQty = qty;
  } else if (mode === "digital") {
    digitalQty = qty;
  } else {
    ownedQty = Math.min(owned, qty);
    digitalQty = qty - ownedQty;
  }

  const costTotal = ownedQty * ownedCost + digitalQty * sellerUnitCost;
  const unitCost = qty > 0 ? Math.round(costTotal / qty) : 0;

  let fulfillMode: InventoryMode = "owned";
  if (ownedQty > 0 && digitalQty > 0) fulfillMode = "hybrid";
  else if (digitalQty > 0) fulfillMode = "digital";

  return {
    ownedQty,
    digitalQty,
    fulfillMode,
    unitCost,
    sellerUnitCost,
    vendorId: digitalQty > 0 ? vendorId : null,
  };
}

/** Effective COGS for a line (settlement / analysis). */
export function lineCogs(item: {
  quantity: number;
  unitCost: number;
  ownedQty?: number | null;
  digitalQty?: number | null;
  sellerUnitCost?: number | null;
  costPrice?: number | null;
}) {
  const owned = item.ownedQty ?? 0;
  const digital = item.digitalQty ?? 0;
  if (owned > 0 || digital > 0) {
    const ownedCost = item.costPrice ?? item.unitCost;
    // Prefer snapshotted unitCost when blended already stored
    if (owned + digital === item.quantity) {
      return (
        owned * Math.max(0, ownedCost) +
        digital * Math.max(0, item.sellerUnitCost ?? 0)
      );
    }
  }
  return item.quantity * Math.max(0, item.unitCost);
}
