import { expiryBucket } from "@/lib/inventory";
import { sellableQty, type StockSourceProduct } from "@/lib/inventory-mode";

/** Global low threshold until per-SKU reorder levels exist */
export const LOW_STOCK_THRESHOLD = 5;

/** Days ahead for expiry alerts (badge + queue) — unified */
export const EXPIRY_ALERT_DAYS = 30;

export type InventoryQueueReason =
  | "cannot_sell"
  | "low"
  | "expired"
  | "expiring"
  | "digital_short";

export const INVENTORY_QUEUE_REASON_META: Record<
  InventoryQueueReason,
  { label: string; cta: string; hint: string }
> = {
  cannot_sell: {
    label: "Cannot sell",
    cta: "Restock",
    hint: "Nothing left to sell on shop channels",
  },
  low: {
    label: "Low",
    cta: "Restock",
    hint: `Sellable ≤ ${LOW_STOCK_THRESHOLD}`,
  },
  expired: {
    label: "Expired lot",
    cta: "Write off",
    hint: "Remaining units past best-before",
  },
  expiring: {
    label: "Expiring soon",
    cta: "Open",
    hint: `Best-before within ${EXPIRY_ALERT_DAYS} days`,
  },
  digital_short: {
    label: "Digital short",
    cta: "Update digital",
    hint: "Supplier availability is low",
  },
};

export type QueueProductInput = StockSourceProduct & {
  id: string;
  published: boolean;
  sellOnline?: boolean;
  sellOffline?: boolean;
  inventoryMode?: string | null;
  /** Soonest lot expiry with remaining qty (if any) */
  nearestExpiry?: Date | null;
};

/** Reasons this SKU belongs on the stock queue (priority order). */
export function inventoryQueueReasons(
  product: QueueProductInput,
  now = Date.now(),
): InventoryQueueReason[] {
  if (!product.published) return [];

  const reasons: InventoryQueueReason[] = [];
  const mode = product.inventoryMode || "owned";
  const sellable = sellableQty(product);
  const digital = Math.max(0, product.digitalAvailable);
  const selling =
    product.sellOnline !== false || product.sellOffline !== false;

  if (selling && sellable === 0) {
    reasons.push("cannot_sell");
  } else if (sellable > 0 && sellable <= LOW_STOCK_THRESHOLD) {
    reasons.push("low");
  }

  if (
    (mode === "digital" || mode === "hybrid") &&
    digital <= LOW_STOCK_THRESHOLD &&
    !reasons.includes("cannot_sell")
  ) {
    // Hybrid with owned covering sellable still needs seller stock topped up
    if (mode === "hybrid" || (mode === "digital" && digital > 0)) {
      reasons.push("digital_short");
    }
  }

  if (product.nearestExpiry) {
    const bucket = expiryBucket(product.nearestExpiry, now);
    if (bucket === "expired") reasons.push("expired");
    else if (bucket === "week" || bucket === "month") reasons.push("expiring");
  }

  return reasons;
}

export function inventoryQueuePrimaryReason(
  product: QueueProductInput,
  now = Date.now(),
): InventoryQueueReason | null {
  return inventoryQueueReasons(product, now)[0] ?? null;
}

export function productInInventoryQueue(
  product: QueueProductInput,
  now = Date.now(),
): boolean {
  return inventoryQueueReasons(product, now).length > 0;
}

/** Primary CTA href for a queue row */
export function inventoryQueueCtaHref(
  productId: string,
  reason: InventoryQueueReason,
): string {
  switch (reason) {
    case "cannot_sell":
    case "low":
      return `/admin/purchases?view=new&productId=${encodeURIComponent(productId)}`;
    case "digital_short":
      return `/admin/inventory?view=digital&q=`;
    case "expired":
    case "expiring":
      return `/admin/inventory?view=expiry`;
    default:
      return `/admin/products/${productId}`;
  }
}

export function inventoryQueueCtaHrefForProduct(
  productId: string,
  reason: InventoryQueueReason,
): string {
  if (reason === "digital_short") {
    return `/admin/products/${productId}#adjust-stock`;
  }
  if (reason === "expired" || reason === "expiring") {
    return `/admin/products/${productId}#adjust-stock`;
  }
  return inventoryQueueCtaHref(productId, reason);
}
