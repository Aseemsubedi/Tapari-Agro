import { formatNprFromInt } from "@/lib/products";
import { lineDue } from "@/lib/purchase-payment";

export type ProductVendorCost = {
  id: string;
  name: string;
  phone: string;
  purchaseCount: number;
  totalQty: number;
  totalSpend: number;
  avgCost: number;
  lastCost: number;
  lastQty: number;
  lastAt: Date;
  lastPaid: boolean;
  unpaidSpend: number;
};

type PurchaseLike = {
  quantity: number;
  unitCost: number;
  amountPaid?: number;
  paid: boolean;
  createdAt: Date;
  vendor: { id: string; name: string; phone: string } | null;
};

/** Build per-vendor cost stats from purchase lots (same product, many sellers). */
export function summarizeProductVendors(
  purchases: PurchaseLike[],
): ProductVendorCost[] {
  const map = new Map<
    string,
    ProductVendorCost & { _seenLatest: boolean }
  >();

  // purchases assumed newest-first
  for (const row of purchases) {
    if (!row.vendor) continue;
    const spend = row.quantity * row.unitCost;
    const due = lineDue({
      quantity: row.quantity,
      unitCost: row.unitCost,
      amountPaid: row.amountPaid ?? 0,
      paid: row.paid,
    });
    const existing = map.get(row.vendor.id);
    if (existing) {
      existing.purchaseCount += 1;
      existing.totalQty += row.quantity;
      existing.totalSpend += spend;
      existing.avgCost =
        existing.totalQty > 0
          ? Math.round(existing.totalSpend / existing.totalQty)
          : 0;
      existing.unpaidSpend += due;
    } else {
      map.set(row.vendor.id, {
        id: row.vendor.id,
        name: row.vendor.name,
        phone: row.vendor.phone,
        purchaseCount: 1,
        totalQty: row.quantity,
        totalSpend: spend,
        avgCost: row.unitCost,
        lastCost: row.unitCost,
        lastQty: row.quantity,
        lastAt: row.createdAt,
        lastPaid: row.paid,
        unpaidSpend: due,
        _seenLatest: true,
      });
    }
  }

  return [...map.values()]
    .map(({ _seenLatest: _, ...rest }) => rest)
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export function vendorRatesDiffer(vendors: ProductVendorCost[]): boolean {
  if (vendors.length < 2) return false;
  const avgs = vendors.map((v) => v.avgCost);
  return Math.min(...avgs) !== Math.max(...avgs);
}

export function formatVendorRateHint(vendors: ProductVendorCost[]): string {
  if (vendors.length === 0) return "";
  if (vendors.length === 1) {
    return `One vendor · avg ${formatNprFromInt(vendors[0]!.avgCost)}`;
  }
  if (vendorRatesDiffer(vendors)) {
    const min = Math.min(...vendors.map((v) => v.avgCost));
    const max = Math.max(...vendors.map((v) => v.avgCost));
    return `${vendors.length} vendors · rates ${formatNprFromInt(min)}–${formatNprFromInt(max)}`;
  }
  return `${vendors.length} vendors · same rate ${formatNprFromInt(vendors[0]!.avgCost)}`;
}
