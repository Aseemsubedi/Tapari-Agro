import { formatNprFromInt } from "@/lib/products";

/** Report tabs available in /admin/reports */
export const REPORT_VIEWS = [
  "hub",
  "sales",
  "products",
  "cost",
  "suppliers",
  "stock",
  "writeoffs",
  "settlements",
  "cashbook",
] as const;

export type ReportView = (typeof REPORT_VIEWS)[number];

export function parseReportView(raw: string | undefined): ReportView {
  if (raw && (REPORT_VIEWS as readonly string[]).includes(raw)) {
    return raw as ReportView;
  }
  return "hub";
}

export const REPORT_VIEW_META: Record<
  ReportView,
  { title: string; hint: string; source: string }
> = {
  hub: {
    title: "All reports",
    hint: "Pick a report — sales, cost, suppliers, stock, losses",
    source: "Orders · Purchases · Stock · Money",
  },
  sales: {
    title: "Sales by date",
    hint: "Day-by-day revenue, cost, profit, collected",
    source: "Orders (non-cancelled)",
  },
  products: {
    title: "Sales by product",
    hint: "Qty, revenue, COGS, profit per SKU",
    source: "Order lines",
  },
  cost: {
    title: "Cost & margin",
    hint: "Product cost price vs sell price and margin",
    source: "Product.costPrice · OrderItem.unitCost",
  },
  suppliers: {
    title: "Suppliers",
    hint: "Purchase spend, dues, and digital seller payouts",
    source: "StockPurchase · SellerSettlement",
  },
  stock: {
    title: "Stock value",
    hint: "On-hand inventory at cost (owned lots)",
    source: "Product.stock × costPrice",
  },
  writeoffs: {
    title: "Write-offs",
    hint: "Spoilage / damage / expiry losses",
    source: "PaymentEvent (writeoff)",
  },
  settlements: {
    title: "Seller settlements",
    hint: "Digital seller amounts owed and paid",
    source: "SellerSettlement",
  },
  cashbook: {
    title: "Cashbook",
    hint: "Collect / pay / settle / write-off money events",
    source: "PaymentEvent",
  },
};

export type SupplierPurchaseAgg = {
  vendorId: string;
  name: string;
  phone: string;
  bills: number;
  spend: number;
  paid: number;
  due: number;
  units: number;
};

export function aggregateSupplierPurchases(
  lines: {
    vendorId: string | null;
    vendorName: string | null;
    vendorPhone: string | null;
    batchId: string;
    quantity: number;
    unitCost: number;
    amountPaid: number;
    paid: boolean;
  }[],
): SupplierPurchaseAgg[] {
  type Acc = SupplierPurchaseAgg & { batchIds: Set<string> };
  const map = new Map<string, Acc>();

  for (const line of lines) {
    if (!line.vendorId) continue;
    const spend = line.quantity * line.unitCost;
    const due = Math.max(0, spend - Math.max(0, line.amountPaid));
    const prev = map.get(line.vendorId);
    if (prev) {
      prev.batchIds.add(line.batchId);
      prev.bills = prev.batchIds.size;
      prev.spend += spend;
      prev.paid += Math.max(0, line.amountPaid);
      prev.due += due;
      prev.units += line.quantity;
    } else {
      map.set(line.vendorId, {
        vendorId: line.vendorId,
        name: line.vendorName || "Supplier",
        phone: line.vendorPhone || "",
        bills: 1,
        spend,
        paid: Math.max(0, line.amountPaid),
        due,
        units: line.quantity,
        batchIds: new Set([line.batchId]),
      });
    }
  }

  return [...map.values()]
    .map(({ batchIds: _b, ...rest }) => rest)
    .sort((a, b) => b.spend - a.spend);
}

export type StockValueRow = {
  productId: string;
  name: string;
  unit: string;
  category: string;
  mode: string;
  owned: number;
  digital: number;
  costPrice: number;
  stockValue: number;
};

export function buildStockValueRows(
  products: {
    id: string;
    name: string;
    unit: string;
    category: string;
    inventoryMode: string;
    stock: number;
    digitalAvailable: number;
    costPrice: number;
    published: boolean;
  }[],
): { rows: StockValueRow[]; totalValue: number; unitsOwned: number } {
  const rows: StockValueRow[] = products
    .filter((p) => p.published && p.stock > 0)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      unit: p.unit,
      category: p.category || "Uncategorized",
      mode: p.inventoryMode || "owned",
      owned: p.stock,
      digital: p.digitalAvailable,
      costPrice: p.costPrice ?? 0,
      stockValue: p.stock * (p.costPrice ?? 0),
    }))
    .sort((a, b) => b.stockValue - a.stockValue);

  return {
    rows,
    totalValue: rows.reduce((s, r) => s + r.stockValue, 0),
    unitsOwned: rows.reduce((s, r) => s + r.owned, 0),
  };
}

export function formatReportMoney(n: number) {
  return formatNprFromInt(n);
}

/** Where each report type already lives elsewhere in admin */
export const REPORT_SHORTCUTS: {
  title: string;
  href: string;
  body: string;
}[] = [
  {
    title: "Analysis — bill & product profit",
    href: "/admin/profits",
    body: "Quick P&L by bill or top products (same date presets).",
  },
  {
    title: "Money — collect / pay / aging",
    href: "/admin/payments",
    body: "Open dues, purchase bills, seller payables, 31+ aging, ledger.",
  },
  {
    title: "Customers — credit rollup",
    href: "/admin/customers?view=credit",
    body: "Who owes, spent, paid — per-customer statements.",
  },
  {
    title: "Purchases — bill history",
    href: "/admin/purchases?view=history",
    body: "Supplier bills, due / settled filters.",
  },
  {
    title: "Suppliers — spend & dues",
    href: "/admin/suppliers",
    body: "Vendor list with unpaid purchase totals.",
  },
  {
    title: "Inventory — stock queue",
    href: "/admin/inventory",
    body: "Exceptions, digital, expiry lots, on-hand cost hint.",
  },
];
