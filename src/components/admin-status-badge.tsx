import {
  isOrderStatus,
  ORDER_STATUS_STYLES,
  orderStatusLabel,
} from "@/lib/orders";

export function AdminStatusBadge({ status }: { status: string }) {
  const style = isOrderStatus(status)
    ? ORDER_STATUS_STYLES[status]
    : { bg: "bg-stone-100", text: "text-stone-600" };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
