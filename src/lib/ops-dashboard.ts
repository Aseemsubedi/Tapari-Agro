import { billEconomics, orderPaymentDue } from "@/lib/orders";

/** Morning ops priorities for a small agro counter + online shop. */
export type OpsAction = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "urgent" | "warn" | "ok";
  count?: number;
};

export function buildOpsActions(input: {
  pendingOrders: number;
  confirmedOrders: number;
  creditDue: number;
  creditOverdue31: number;
  creditOverdue31Count: number;
  supplierDue: number;
  supplierDueCount: number;
  outOfStock: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
}): OpsAction[] {
  const actions: OpsAction[] = [];

  if (input.pendingOrders > 0) {
    actions.push({
      id: "pending",
      title: `Confirm ${input.pendingOrders} online order${input.pendingOrders === 1 ? "" : "s"}`,
      body: "Call the customer, then confirm before packing.",
      href: "/admin/orders?status=pending",
      tone: "urgent",
      count: input.pendingOrders,
    });
  }

  if (input.creditOverdue31Count > 0) {
    actions.push({
      id: "overdue",
      title: `Collect ${input.creditOverdue31Count} bill${input.creditOverdue31Count === 1 ? "" : "s"} overdue 31+ days`,
      body: `${formatHint(input.creditOverdue31)} sitting too long — WhatsApp remind.`,
      href: "/admin/payments?view=aging&age=31%2B",
      tone: "urgent",
      count: input.creditOverdue31Count,
    });
  }

  if (input.outOfStock > 0) {
    actions.push({
      id: "out",
      title: `${input.outOfStock} product${input.outOfStock === 1 ? "" : "s"} out of stock`,
      body: "Buy from kishan or hide from the shop.",
      href: "/admin/inventory?view=queue&filter=cannot_sell",
      tone: "urgent",
      count: input.outOfStock,
    });
  }

  if (input.expired > 0) {
    actions.push({
      id: "expired",
      title: `${input.expired} lot${input.expired === 1 ? "" : "s"} expired`,
      body: "Write off or remove from sale so stock stays honest.",
      href: "/admin/inventory?view=expiry&filter=expired",
      tone: "urgent",
      count: input.expired,
    });
  }

  if (input.confirmedOrders > 0) {
    actions.push({
      id: "ship",
      title: `Pack & ship ${input.confirmedOrders} order${input.confirmedOrders === 1 ? "" : "s"}`,
      body: "Confirmed — ready to pack for valley delivery.",
      href: "/admin/orders?status=confirmed",
      tone: "warn",
      count: input.confirmedOrders,
    });
  }

  if (input.supplierDueCount > 0) {
    actions.push({
      id: "supplier",
      title: `Settle ${input.supplierDueCount} supplier bill${input.supplierDueCount === 1 ? "" : "s"}`,
      body: `${formatHint(input.supplierDue)} still owed to kishan / vendors.`,
      href: "/admin/payments?view=pay",
      tone: "warn",
      count: input.supplierDueCount,
    });
  }

  if (input.lowStock > 0) {
    actions.push({
      id: "low",
      title: `Restock ${input.lowStock} low item${input.lowStock === 1 ? "" : "s"}`,
      body: "5 or fewer left — record a purchase bill.",
      href: "/admin/inventory?view=queue&filter=low",
      tone: "warn",
      count: input.lowStock,
    });
  }

  if (input.expiringSoon > 0) {
    actions.push({
      id: "expiring",
      title: `${input.expiringSoon} lot${input.expiringSoon === 1 ? "" : "s"} expiring soon`,
      body: "Sell or discount before best-before.",
      href: "/admin/inventory?view=expiry&filter=soon",
      tone: "warn",
      count: input.expiringSoon,
    });
  }

  if (input.creditDue > 0 && input.creditOverdue31Count === 0) {
    actions.push({
      id: "credit",
      title: "Open customer credit",
      body: `${formatHint(input.creditDue)} to collect when convenient.`,
      href: "/admin/payments?view=collect",
      tone: "ok",
    });
  }

  return actions;
}

function formatHint(npr: number) {
  return `Rs ${npr.toLocaleString("en-NP")}`;
}

export function summarizeTodaySales(
  orders: {
    total: number;
    amountPaid: number;
    paymentStatus: string;
    channel: string;
    status: string;
    discountAmount?: number;
    deliveryFee?: number;
    items: { price: number; quantity: number; unitCost: number }[];
  }[],
) {
  let sales = 0;
  let collected = 0;
  let creditBooked = 0;
  let profit = 0;
  let online = 0;
  let offline = 0;
  let bills = 0;

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    bills += 1;
    sales += order.total;
    if (order.channel === "offline") offline += order.total;
    else online += order.total;

    const paid =
      order.paymentStatus === "paid"
        ? order.total
        : Math.max(0, order.amountPaid);
    collected += paid;
    creditBooked += orderPaymentDue(order);

    const eco = billEconomics(order.items, {
      discountAmount: order.discountAmount ?? 0,
      deliveryFee: order.deliveryFee ?? 0,
    });
    profit += eco.profit;
  }

  return { sales, collected, creditBooked, profit, online, offline, bills };
}
