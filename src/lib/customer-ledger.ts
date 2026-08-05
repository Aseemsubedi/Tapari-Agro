import { orderPaymentDue, paymentStatusLabel } from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";
import { shopConfig } from "@/lib/shop";

export type LedgerOrder = {
  id: string;
  createdAt: Date;
  total: number;
  amountPaid: number;
  paymentStatus: string;
  status: string;
  channel: string;
  items: { name: string; quantity: number; price: number }[];
};

export type LedgerLine = {
  orderId: string;
  ref: string;
  dateLabel: string;
  itemsLabel: string;
  bill: number;
  paid: number;
  due: number;
  statusLabel: string;
  createdAt: number;
};

export function buildCustomerLedger(orders: LedgerOrder[]) {
  const active = orders.filter((o) => o.status !== "cancelled");
  const dueLines: LedgerLine[] = [];
  let spent = 0;
  let paid = 0;
  let due = 0;

  for (const order of active) {
    spent += order.total;
    const billDue = orderPaymentDue(order);
    const billPaid =
      order.paymentStatus === "paid"
        ? order.total
        : Math.max(0, order.amountPaid);
    paid += billPaid;
    due += billDue;

    if (billDue > 0) {
      dueLines.push({
        orderId: order.id,
        ref: `#${order.id.slice(0, 8)}`,
        dateLabel: order.createdAt.toLocaleDateString("en-NP", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        itemsLabel: order.items
          .map((i) => `${i.name} ×${i.quantity}`)
          .join(", "),
        bill: order.total,
        paid: billPaid,
        due: billDue,
        statusLabel: paymentStatusLabel(order.paymentStatus),
        createdAt: order.createdAt.getTime(),
      });
    }
  }

  dueLines.sort((a, b) => a.createdAt - b.createdAt);

  return {
    spent,
    paid,
    due,
    dueLines,
    openBills: dueLines.length,
  };
}

/** Plain-text invoice / ledger for WhatsApp or copy. */
export function customerLedgerMessage(input: {
  customerName: string;
  phone?: string;
  spent: number;
  paid: number;
  due: number;
  dueLines: LedgerLine[];
  asOf?: Date;
}) {
  const asOf = (input.asOf ?? new Date()).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const lines = [
    `*${shopConfig.name} — Credit statement*`,
    `Customer: ${input.customerName}`,
    input.phone ? `Phone: ${input.phone}` : null,
    `Date: ${asOf}`,
    "",
    `Total billed: ${formatNprFromInt(input.spent)}`,
    `Total paid: ${formatNprFromInt(input.paid)}`,
    `*Remaining due: ${formatNprFromInt(input.due)}*`,
  ].filter((x): x is string => Boolean(x));

  if (input.dueLines.length > 0) {
    lines.push("", "Open bills:");
    for (const row of input.dueLines) {
      lines.push(
        `• ${row.ref} (${row.dateLabel}) — Bill ${formatNprFromInt(row.bill)}, Paid ${formatNprFromInt(row.paid)}, *Due ${formatNprFromInt(row.due)}*`,
      );
      if (row.itemsLabel) {
        lines.push(`  ${row.itemsLabel}`);
      }
    }
  } else {
    lines.push("", "No open dues — thank you!");
  }

  lines.push(
    "",
    `Please settle when convenient. Call/WhatsApp ${shopConfig.phoneDisplay}.`,
    `— ${shopConfig.name}`,
  );

  return lines.join("\n");
}
