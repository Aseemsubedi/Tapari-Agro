export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "bank_qr", "credit", "partial"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Online checkout — customer pays later / on delivery */
export const CHECKOUT_PAYMENT_METHODS = ["cash", "bank_qr", "bank"] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

/** How money was received when collecting a due */
export const COLLECT_METHODS = ["cash", "bank_qr", "bank", "other"] as const;
export type CollectMethod = (typeof COLLECT_METHODS)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isCheckoutPaymentMethod(
  value: string,
): value is CheckoutPaymentMethod {
  return (CHECKOUT_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isCollectMethod(value: string): value is CollectMethod {
  return (COLLECT_METHODS as readonly string[]).includes(value);
}

export function orderStatusLabel(status: string): string {
  if (!isOrderStatus(status)) return status;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function paymentMethodLabel(method: string, note = "") {
  switch (method) {
    case "cash":
      return "Cash";
    case "bank_qr":
      return "QR";
    case "bank":
      return "Bank deposit";
    case "other":
      return note.trim() ? `Other · ${note.trim()}` : "Other";
    case "credit":
      return "Credit";
    case "partial":
      return "Partial";
    default:
      return method ? method : "—";
  }
}

/** Customer-facing labels on the website checkout / statement */
export function checkoutPaymentLabel(method: string) {
  switch (method) {
    case "cash":
      return "Cash on delivery";
    case "bank_qr":
      return "QR payment";
    case "bank":
      return "Bank deposit";
    case "credit":
      return "Credit";
    default:
      return paymentMethodLabel(method);
  }
}

export const CHECKOUT_PAYMENT_OPTIONS: {
  id: CheckoutPaymentMethod;
  label: string;
  hint: string;
}[] = [
  {
    id: "cash",
    label: "Cash on delivery",
    hint: "Pay when your order arrives",
  },
  {
    id: "bank_qr",
    label: "QR payment",
    hint: "Pay by QR first — we pack after payment is confirmed",
  },
  {
    id: "bank",
    label: "Bank deposit",
    hint: "Transfer first — we pack after payment is confirmed",
  },
];

/** QR / bank deposit: money must clear before packing starts */
export function isPrepaidCheckoutMethod(method: string) {
  return method === "bank_qr" || method === "bank";
}

/** Prefer checkoutMethod; fall back to paymentMethod for legacy rows */
export function orderCheckoutMethod(order: {
  checkoutMethod?: string | null;
  paymentMethod?: string | null;
}) {
  const raw = (order.checkoutMethod || order.paymentMethod || "cash").trim();
  if (isCheckoutPaymentMethod(raw)) return raw;
  if (raw === "credit" || raw === "partial" || raw === "other") return "cash";
  return "cash";
}

/** True when online prepaid order still needs payment before fulfill */
export function awaitsPaymentBeforeFulfill(order: {
  channel?: string;
  checkoutMethod?: string | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  status?: string;
}) {
  if (order.channel === "offline") return false;
  if (order.status === "cancelled") return false;
  const intent = orderCheckoutMethod(order);
  if (!isPrepaidCheckoutMethod(intent)) return false;
  return order.paymentStatus !== "paid";
}

/** Digital lines need supplier stock marked before ship */
export function orderNeedsSupplierStock(items: { digitalQty: number }[]) {
  return items.some((i) => i.digitalQty > 0);
}

export function canShipDigitalOrder(order: {
  supplierStockReceived?: boolean;
  items: { digitalQty: number }[];
}) {
  if (!orderNeedsSupplierStock(order.items)) return true;
  return Boolean(order.supplierStockReceived);
}

/** Admin orders queue — one next job per order (run-sheet stage) */
export const ORDER_QUEUE_STAGES = [
  "confirm_pay",
  "confirm",
  "supplier",
  "ship",
  "complete",
  "collect",
  "done",
  "cancelled",
] as const;

export type OrderQueueStage = (typeof ORDER_QUEUE_STAGES)[number];

export const ORDER_QUEUE_STAGE_META: Record<
  OrderQueueStage,
  { title: string; hint: string; cta: string }
> = {
  confirm_pay: {
    title: "1 · Confirm payment",
    hint: "QR / bank — settle money before packing",
    cta: "Settle",
  },
  confirm: {
    title: "2 · Confirm order",
    hint: "Call the customer, then confirm",
    cta: "Confirm",
  },
  supplier: {
    title: "3 · Collect from supplier",
    hint: "Get digital stock before you pack",
    cta: "Stock",
  },
  ship: {
    title: "4 · Pack & ship",
    hint: "Ready to pack and send",
    cta: "Ship",
  },
  complete: {
    title: "5 · Complete delivery",
    hint: "Mark done when delivered",
    cta: "Done",
  },
  collect: {
    title: "6 · Collect due",
    hint: "Cash, QR, bank, or set credit",
    cta: "Collect",
  },
  done: {
    title: "Done",
    hint: "Completed and paid",
    cta: "Open",
  },
  cancelled: {
    title: "Cancelled",
    hint: "No further action",
    cta: "Open",
  },
};

/** Primary next action for an order in the admin queue */
export function orderQueueStage(order: {
  channel?: string;
  status: string;
  checkoutMethod?: string | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  amountPaid?: number;
  total?: number;
  supplierStockReceived?: boolean;
  items?: { digitalQty: number }[];
}): OrderQueueStage {
  if (order.status === "cancelled") return "cancelled";
  if (awaitsPaymentBeforeFulfill(order)) return "confirm_pay";

  const due =
    order.total != null
      ? orderPaymentDue({
          total: order.total,
          amountPaid: order.amountPaid ?? 0,
          paymentStatus: order.paymentStatus,
        })
      : 0;

  if (order.status === "pending") return "confirm";

  if (order.status === "confirmed") {
    const items = order.items ?? [];
    if (
      orderNeedsSupplierStock(items) &&
      !canShipDigitalOrder({
        supplierStockReceived: order.supplierStockReceived,
        items,
      })
    ) {
      return "supplier";
    }
    return "ship";
  }

  if (order.status === "shipped") return "complete";

  if (order.status === "completed") {
    if (due > 0) return "collect";
    return "done";
  }

  if (due > 0) return "collect";
  return "done";
}

/** Short badge for admin header — what customer chose */
export function checkoutIntentBadge(method: string) {
  switch (orderCheckoutMethod({ checkoutMethod: method })) {
    case "bank_qr":
      return "Chose QR";
    case "bank":
      return "Chose bank deposit";
    default:
      return "Chose COD";
  }
}

export function paymentStatusLabel(status: string): string {
  if (status === "unpaid") return "Unpaid";
  if (status === "partial") return "Partial";
  return "Paid";
}

export function orderPaymentDue(order: {
  total: number;
  amountPaid: number;
  paymentStatus: string;
}) {
  if (order.paymentStatus === "paid") return 0;
  return Math.max(0, order.total - Math.max(0, order.amountPaid));
}

export function resolvePaymentStatus(
  total: number,
  amountPaid: number,
): "paid" | "partial" | "unpaid" {
  const paid = Math.max(0, Math.min(amountPaid, total));
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

export const ORDER_STATUS_STYLES: Record<
  OrderStatus,
  { bg: string; text: string }
> = {
  pending: { bg: "bg-amber-50", text: "text-amber-800" },
  confirmed: { bg: "bg-sky-50", text: "text-sky-800" },
  shipped: { bg: "bg-violet-50", text: "text-violet-800" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-800" },
  cancelled: { bg: "bg-red-50", text: "text-red-700" },
};

/** Store-owner next action in the fulfillment pipeline */
export function nextFulfillmentStep(
  status: string,
): { status: OrderStatus; label: string; shortLabel: string } | null {
  switch (status) {
    case "pending":
      return {
        status: "confirmed",
        label: "Confirm order",
        shortLabel: "Confirm",
      };
    case "confirmed":
      return {
        status: "shipped",
        label: "Mark as shipped",
        shortLabel: "Ship",
      };
    case "shipped":
      return {
        status: "completed",
        label: "Mark completed",
        shortLabel: "Done",
      };
    default:
      return null;
  }
}

/** Relative time for order queues (e.g. "2h ago", "Yesterday"). */
export function formatOrderWhen(date: Date, now = new Date()) {
  const ms = now.getTime() - date.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-NP", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/** Pipeline steps for the order detail UI. */
export const FULFILLMENT_PIPELINE: {
  status: OrderStatus;
  label: string;
}[] = [
  { status: "pending", label: "Pending" },
  { status: "confirmed", label: "Confirmed" },
  { status: "shipped", label: "Shipped" },
  { status: "completed", label: "Done" },
];

export function fulfillmentStepIndex(status: string) {
  if (status === "cancelled") return -1;
  const i = FULFILLMENT_PIPELINE.findIndex((s) => s.status === status);
  return i >= 0 ? i : 0;
}

export function orderContactMessage(order: {
  id: string;
  customerName: string;
  total: number;
  status: string;
}): string {
  return `Namaste ${order.customerName}, Tapari Agro here about your order (${order.id.slice(0, 8)}…) — status: ${order.status}. Total Rs ${order.total}.`;
}

export function customerWhatsAppHref(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  const wa = digits.startsWith("977")
    ? digits
    : `977${digits.replace(/^0/, "")}`;
  const text = encodeURIComponent(
    message ?? "Namaste from Tapari Agro.",
  );
  return `https://wa.me/${wa}?text=${text}`;
}

type ProfitLine = {
  price: number;
  quantity: number;
  unitCost: number;
};

/** Revenue, COGS, and profit for one sales bill / order. */
export function billEconomics(
  items: ProfitLine[],
  options?: {
    cancelled?: boolean;
    discountAmount?: number;
    deliveryFee?: number;
  },
) {
  const gross = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = Math.max(0, options?.discountAmount ?? 0);
  const delivery = Math.max(0, options?.deliveryFee ?? 0);
  const revenue = Math.max(0, gross - discount) + delivery;
  const cost = items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
  const profit = options?.cancelled ? 0 : revenue - cost;
  const marginPct =
    !options?.cancelled && revenue > 0
      ? Math.round((profit / revenue) * 100)
      : 0;
  return { revenue, cost, profit, marginPct, gross, discount, delivery };
}

