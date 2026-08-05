/** Shared date ranges for sales / profit analysis. */

export type AnalysisRange = "today" | "7d" | "30d" | "90d" | "all";

export function parseAnalysisRange(raw: string | undefined): AnalysisRange {
  if (
    raw === "today" ||
    raw === "7d" ||
    raw === "30d" ||
    raw === "90d" ||
    raw === "all"
  ) {
    return raw;
  }
  return "30d";
}

export function analysisRangeLabel(range: AnalysisRange) {
  switch (range) {
    case "today":
      return "Today";
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "all":
      return "All time";
  }
}

export function analysisRangeStart(range: AnalysisRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

export type ProductSaleAgg = {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
};

/**
 * Roll order lines into per-product sales.
 * `unitCost` is already blended (owned FIFO cost and/or seller payout).
 */
export function aggregateProductSales(
  lines: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    unitCost: number;
  }[],
): ProductSaleAgg[] {
  const map = new Map<string, ProductSaleAgg>();
  for (const line of lines) {
    const key = line.productId || line.name;
    const prev = map.get(key);
    const revenue = line.price * line.quantity;
    const cost = line.unitCost * line.quantity;
    if (prev) {
      prev.qty += line.quantity;
      prev.revenue += revenue;
      prev.cost += cost;
      prev.profit += revenue - cost;
    } else {
      map.set(key, {
        productId: line.productId,
        name: line.name,
        qty: line.quantity,
        revenue,
        cost,
        profit: revenue - cost,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit);
}

export type DaySaleAgg = {
  day: string;
  bills: number;
  revenue: number;
  cost: number;
  profit: number;
  collected: number;
};

/** Group orders by calendar day (local YYYY-MM-DD). */
export function aggregateSalesByDay(
  orders: {
    createdAt: Date;
    total: number;
    amountPaid: number;
    paymentStatus: string;
    discountAmount?: number | null;
    deliveryFee?: number | null;
    items: { price: number; quantity: number; unitCost: number }[];
  }[],
  billEconomicsFn: (
    items: { price: number; quantity: number; unitCost: number }[],
    opts: { discountAmount: number; deliveryFee: number },
  ) => { revenue: number; cost: number; profit: number },
): DaySaleAgg[] {
  const map = new Map<string, DaySaleAgg>();
  for (const order of orders) {
    const day = order.createdAt.toLocaleDateString("en-CA");
    const eco = billEconomicsFn(order.items, {
      discountAmount: order.discountAmount ?? 0,
      deliveryFee: order.deliveryFee ?? 0,
    });
    const collected =
      order.paymentStatus === "paid"
        ? order.total
        : Math.max(0, order.amountPaid);
    const prev = map.get(day);
    if (prev) {
      prev.bills += 1;
      prev.revenue += eco.revenue;
      prev.cost += eco.cost;
      prev.profit += eco.profit;
      prev.collected += collected;
    } else {
      map.set(day, {
        day,
        bills: 1,
        revenue: eco.revenue,
        cost: eco.cost,
        profit: eco.profit,
        collected,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.day.localeCompare(a.day));
}

export type CategorySaleAgg = {
  category: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
};

export function aggregateSalesByCategory(
  lines: {
    category: string;
    price: number;
    quantity: number;
    unitCost: number;
  }[],
): CategorySaleAgg[] {
  const map = new Map<string, CategorySaleAgg>();
  for (const line of lines) {
    const category = line.category.trim() || "Uncategorized";
    const revenue = line.price * line.quantity;
    const cost = line.unitCost * line.quantity;
    const prev = map.get(category);
    if (prev) {
      prev.qty += line.quantity;
      prev.revenue += revenue;
      prev.cost += cost;
      prev.profit += revenue - cost;
    } else {
      map.set(category, {
        category,
        qty: line.quantity,
        revenue,
        cost,
        profit: revenue - cost,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export type MethodAgg = {
  method: string;
  count: number;
  amount: number;
};

export function aggregatePaymentMethods(
  events: { method: string; amount: number; direction: string }[],
  direction = "collect",
): MethodAgg[] {
  const map = new Map<string, MethodAgg>();
  for (const e of events) {
    if (e.direction !== direction) continue;
    const method = e.method.trim() || "other";
    const prev = map.get(method);
    if (prev) {
      prev.count += 1;
      prev.amount += e.amount;
    } else {
      map.set(method, { method, count: 1, amount: e.amount });
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}
