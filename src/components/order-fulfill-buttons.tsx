"use client";

import { useState } from "react";
import Link from "next/link";
import { updateOrderStatusAction } from "@/app/actions";
import { AdminSubmit } from "@/components/admin-ui";
import { nextFulfillmentStep } from "@/lib/orders";

export function OrderFulfillButtons({
  orderId,
  status,
  compact = false,
  prominent = false,
  paymentBlocked = false,
}: {
  orderId: string;
  status: string;
  compact?: boolean;
  /** Full-width bold CTA for the order run sheet. */
  prominent?: boolean;
  /** Prepaid QR/bank — confirm money before fulfill */
  paymentBlocked?: boolean;
}) {
  const next = nextFulfillmentStep(status);
  if (!next) return null;

  if (paymentBlocked) {
    return (
      <Link
        href={`/admin/orders/${orderId}`}
        className={
          compact
            ? "inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-950"
            : "inline-flex items-center justify-center rounded-lg bg-amber-100 px-3.5 py-2 text-sm font-semibold text-amber-950"
        }
      >
        {compact ? "Confirm pay" : "Confirm payment first"}
      </Link>
    );
  }

  return (
    <form
      action={updateOrderStatusAction}
      className={
        compact
          ? "inline-flex flex-wrap items-center gap-1.5"
          : "flex flex-wrap items-end gap-2"
      }
    >
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="status" value={next.status} />
      <AdminSubmit
        size={compact ? "sm" : "md"}
        variant="primary"
        className={
          prominent
            ? "w-full px-5 py-3 text-base sm:w-auto"
            : compact
              ? ""
              : "w-full sm:w-auto"
        }
      >
        {compact ? next.shortLabel : next.label}
      </AdminSubmit>
    </form>
  );
}

export function OrderCancelButton({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  if (status === "cancelled" || status === "completed") return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
      >
        Cancel order
      </button>
    );
  }

  return (
    <form
      action={updateOrderStatusAction}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-red-200 bg-red-50/80 p-2"
    >
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="status" value="cancelled" />
      <p className="text-xs text-red-700">Cancel this order?</p>
      <AdminSubmit size="sm" variant="danger">
        Confirm cancel
      </AdminSubmit>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-ink/50"
      >
        Back
      </button>
    </form>
  );
}

export function OrderStatusUpdateForm({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const statuses = [
    "pending",
    "confirmed",
    "shipped",
    "completed",
    "cancelled",
  ] as const;

  return (
    <form action={updateOrderStatusAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <select
        name="status"
        defaultValue={status}
        className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      <AdminSubmit className="w-full">Update status</AdminSubmit>
      <p className="text-xs text-ink/40">
          Prefer Confirm / Confirm pay on the run sheet. Cancel restores stock if
          it was held; reopening deducts it again.
      </p>
    </form>
  );
}
