import {
  checkoutPaymentLabel,
  orderCheckoutMethod,
  orderPaymentDue,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";
import { shopConfig } from "@/lib/shop";

export type ReceiptOrder = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  channel: string;
  checkoutMethod?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  amountPaid: number;
  paymentNote: string;
  remarks: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  total: number;
  deliveryFee: number;
  createdAt: Date;
  items: { name: string; quantity: number; price: number }[];
};

/** Plain-text order statement for WhatsApp / copy. */
export function orderReceiptMessage(
  order: ReceiptOrder,
  opts?: { includeLink?: string },
) {
  const ref = `#${order.id.slice(0, 8)}`;
  const dateLabel = order.createdAt.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const due = orderPaymentDue(order);
  const paid =
    order.paymentStatus === "paid"
      ? order.total
      : Math.max(0, order.amountPaid);

  const lines = [
    `*${shopConfig.name} — Order statement*`,
    `Bill: ${ref}`,
    `Date: ${dateLabel}`,
    `Customer: ${order.customerName}`,
    order.phone ? `Phone: ${order.phone}` : null,
    order.address ? `Address: ${order.address}` : null,
    "",
    "Items:",
    ...order.items.map(
      (i) =>
        `• ${i.name} ×${i.quantity} — ${formatNprFromInt(i.price * i.quantity)}`,
    ),
  ].filter((x): x is string => Boolean(x));

  const lineSubtotal =
    order.subtotal > 0
      ? order.subtotal
      : order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (order.discountAmount > 0) {
    lines.push(`Subtotal: ${formatNprFromInt(lineSubtotal)}`);
    lines.push(
      `Discount${order.discountPercent > 0 ? ` (${order.discountPercent}%)` : ""}: −${formatNprFromInt(order.discountAmount)}`,
    );
  }
  if (order.deliveryFee > 0) {
    lines.push(`Delivery: ${formatNprFromInt(order.deliveryFee)}`);
  }

  lines.push(`*Total: ${formatNprFromInt(order.total)}*`);

  if (order.paymentMethod || order.channel === "offline") {
    const methodLabel =
      order.channel === "online"
        ? checkoutPaymentLabel(orderCheckoutMethod(order))
        : paymentMethodLabel(order.paymentMethod, order.paymentNote);
    lines.push(
      `Payment: ${methodLabel} · ${paymentStatusLabel(order.paymentStatus)}`,
    );
    if (paid > 0 && due > 0) {
      lines.push(`Paid: ${formatNprFromInt(paid)}`);
    }
    if (due > 0) {
      lines.push(`*Remaining due: ${formatNprFromInt(due)}*`);
    }
  } else if (order.channel === "online") {
    lines.push("Payment: To confirm on call");
  }

  if (opts?.includeLink) {
    lines.push("", `View statement: ${opts.includeLink}`);
  }

  lines.push(
    "",
    `Thank you! Call/WhatsApp ${shopConfig.phoneDisplay}.`,
    `— ${shopConfig.name}`,
  );

  return lines.join("\n");
}
