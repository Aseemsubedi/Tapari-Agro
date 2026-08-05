import { formatNprFromInt } from "@/lib/products";
import { lineDue } from "@/lib/purchase-payment";

export type LotRow = {
  id: string;
  batchId: string;
  vendorId: string | null;
  quantity: number;
  remainingQty: number;
  unitCost: number;
  amountPaid: number;
  paid: boolean;
  payMethod: string;
  chequeNo: string;
  chequeDate: Date | null;
  billNo: string;
  expiresAt: Date | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    unit: string;
    stock: number;
    imageUrl: string;
    price?: number;
  };
  vendor: { id: string; name: string; phone: string } | null;
};

export type SupplierProductStock = {
  productId: string;
  name: string;
  unit: string;
  imageUrl: string;
  sellPrice: number;
  remainingQty: number;
  stockValue: number;
  avgRate: number;
  lastRate: number;
  lotCount: number;
};

export type SupplierStockGroup = {
  id: string;
  name: string;
  phone: string;
  productCount: number;
  remainingQty: number;
  stockValue: number;
  unpaidSpend: number;
  products: SupplierProductStock[];
};

export function buildSupplierStock(lots: LotRow[]): SupplierStockGroup[] {
  type Acc = {
    id: string;
    name: string;
    phone: string;
    unpaidSpend: number;
    products: Map<
      string,
      {
        productId: string;
        name: string;
        unit: string;
        imageUrl: string;
        sellPrice: number;
        remainingQty: number;
        stockValue: number;
        rateSpend: number;
        lastRate: number;
        lastAt: number;
        lotCount: number;
      }
    >;
  };

  const map = new Map<string, Acc>();

  for (const lot of lots) {
    if (!lot.vendor || lot.remainingQty <= 0) continue;
    const value = lot.remainingQty * lot.unitCost;
    let supplier = map.get(lot.vendor.id);
    if (!supplier) {
      supplier = {
        id: lot.vendor.id,
        name: lot.vendor.name,
        phone: lot.vendor.phone,
        unpaidSpend: 0,
        products: new Map(),
      };
      map.set(lot.vendor.id, supplier);
    }
    if (!lot.paid) {
      supplier.unpaidSpend += lineDue(lot);
    }

    const existing = supplier.products.get(lot.product.id);
    if (existing) {
      existing.remainingQty += lot.remainingQty;
      existing.stockValue += value;
      existing.rateSpend += value;
      existing.lotCount += 1;
      if (lot.createdAt.getTime() >= existing.lastAt) {
        existing.lastRate = lot.unitCost;
        existing.lastAt = lot.createdAt.getTime();
      }
    } else {
      supplier.products.set(lot.product.id, {
        productId: lot.product.id,
        name: lot.product.name,
        unit: lot.product.unit,
        imageUrl: lot.product.imageUrl,
        sellPrice: lot.product.price ?? 0,
        remainingQty: lot.remainingQty,
        stockValue: value,
        rateSpend: value,
        lastRate: lot.unitCost,
        lastAt: lot.createdAt.getTime(),
        lotCount: 1,
      });
    }
  }

  return [...map.values()]
    .map((s) => {
      const products = [...s.products.values()]
        .map((p) => ({
          productId: p.productId,
          name: p.name,
          unit: p.unit,
          imageUrl: p.imageUrl,
          sellPrice: p.sellPrice,
          remainingQty: p.remainingQty,
          stockValue: p.stockValue,
          avgRate:
            p.remainingQty > 0
              ? Math.round(p.rateSpend / p.remainingQty)
              : p.lastRate,
          lastRate: p.lastRate,
          lotCount: p.lotCount,
        }))
        .sort((a, b) => b.stockValue - a.stockValue);

      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        productCount: products.length,
        remainingQty: products.reduce((n, p) => n + p.remainingQty, 0),
        stockValue: products.reduce((n, p) => n + p.stockValue, 0),
        unpaidSpend: s.unpaidSpend,
        products,
      };
    })
    .sort((a, b) => b.stockValue - a.stockValue);
}

export type SupplierInventory = {
  id: string;
  name: string;
  phone: string;
  productIds: Set<string>;
  productCount: number;
  totalQty: number;
  totalSpend: number;
  unpaidSpend: number;
  lotCount: number;
  lastAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(date: Date, now = Date.now()) {
  return Math.ceil((date.getTime() - now) / DAY_MS);
}

export function expiryBucket(date: Date, now = Date.now()) {
  const d = daysUntil(date, now);
  if (d < 0) return "expired" as const;
  if (d <= 7) return "week" as const;
  if (d <= 30) return "month" as const;
  return "ok" as const;
}

export function expiryTone(date: Date, now = Date.now()) {
  const bucket = expiryBucket(date, now);
  if (bucket === "expired") return "text-red-600 font-semibold";
  if (bucket === "week") return "text-red-600 font-semibold";
  if (bucket === "month") return "text-amber-700 font-semibold";
  return "text-ink/50";
}

export function summarizeSuppliers(lots: LotRow[]): SupplierInventory[] {
  const map = new Map<string, SupplierInventory>();

  for (const lot of lots) {
    if (!lot.vendor) continue;
    const spend = lot.quantity * lot.unitCost;
    const existing = map.get(lot.vendor.id);
    if (existing) {
      existing.productIds.add(lot.product.id);
      existing.productCount = existing.productIds.size;
      existing.totalQty += lot.quantity;
      existing.totalSpend += spend;
      existing.lotCount += 1;
      if (!lot.paid) existing.unpaidSpend += lineDue(lot);
      if (lot.createdAt > existing.lastAt) existing.lastAt = lot.createdAt;
    } else {
      map.set(lot.vendor.id, {
        id: lot.vendor.id,
        name: lot.vendor.name,
        phone: lot.vendor.phone,
        productIds: new Set([lot.product.id]),
        productCount: 1,
        totalQty: lot.quantity,
        totalSpend: spend,
        unpaidSpend: lineDue(lot),
        lotCount: 1,
        lastAt: lot.createdAt,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.totalSpend - a.totalSpend);
}

export function nearestExpiryByProduct(
  lots: LotRow[],
  now = Date.now(),
): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const lot of lots) {
    if (!lot.expiresAt) continue;
    const current = map.get(lot.product.id);
    // Prefer soonest date (including past)
    if (!current || lot.expiresAt.getTime() < current.getTime()) {
      // Skip very far future for "nearest relevant" — keep all, UI filters
      map.set(lot.product.id, lot.expiresAt);
    }
  }
  // Prefer showing soonest upcoming or most recent expired
  void now;
  return map;
}

export function formatInventoryHint(parts: string[]) {
  return parts.filter(Boolean).join(" · ");
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatSupplierValue(spend: number) {
  return formatNprFromInt(spend);
}
