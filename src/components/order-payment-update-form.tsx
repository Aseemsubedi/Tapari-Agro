"use client";

import { useMemo, useState } from "react";
import { setOrderPaymentPaidAction } from "@/app/actions";
import { AdminSubmit } from "@/components/admin-ui";
import {
  ProductSearchSelect,
  type ProductSearchOption,
} from "@/components/product-search-select";
import type { CollectMethod } from "@/lib/orders";
import { checkoutPaymentLabel } from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";

const COLLECT_OPTIONS: { id: CollectMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "bank_qr", label: "QR" },
  { id: "bank", label: "Bank" },
  { id: "other", label: "Other" },
];

export type OrderBillCustomerOption = {
  id: string;
  name: string;
  phone: string;
  address1?: string;
};

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toCollectMethod(value: string): CollectMethod {
  if (
    value === "bank_qr" ||
    value === "bank" ||
    value === "other" ||
    value === "cash"
  ) {
    return value;
  }
  return "cash";
}

/** Step 1 — confirm prepaid QR / bank payment (how money actually arrived) */
export function ConfirmPrepaidPay({
  orderId,
  total,
  checkoutMethod,
  redirectTo,
}: {
  orderId: string;
  total: number;
  checkoutMethod: string;
  redirectTo?: string;
}) {
  const [method, setMethod] = useState<CollectMethod>(
    toCollectMethod(checkoutMethod),
  );
  const [paymentNote, setPaymentNote] = useState("");

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/55">
        Customer chose{" "}
        <span className="font-semibold text-ink">
          {checkoutPaymentLabel(checkoutMethod)}
        </span>
        . Settle how the money actually came in — then packing can start.
      </p>
      <p className="font-display text-lg font-bold tabular-nums text-amber-900">
        Due {formatNprFromInt(total)}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1">
        {COLLECT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMethod(opt.id)}
            className={`min-h-11 rounded-lg px-2 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:px-1.5 sm:py-2 sm:text-xs sm:text-[13px] ${
              method === opt.id
                ? "bg-pine text-white"
                : "bg-black/[0.04] text-ink/65 hover:bg-black/[0.07]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {method === "other" || method === "bank" ? (
        <input
          value={paymentNote}
          onChange={(e) => setPaymentNote(e.target.value)}
          placeholder={
            method === "bank" ? "Bank ref (optional)" : "How was it paid?"
          }
          className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-pine"
        />
      ) : null}

      <form action={setOrderPaymentPaidAction}>
        <input type="hidden" name="id" value={orderId} />
        <input type="hidden" name="mode" value="full" />
        <input type="hidden" name="collectMethod" value={method} />
        <input type="hidden" name="paymentNote" value={paymentNote} />
        {redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}
        <AdminSubmit className="w-full px-5 py-3 text-base">
          Mark paid ·{" "}
          {COLLECT_OPTIONS.find((o) => o.id === method)?.label ?? method}
        </AdminSubmit>
      </form>
    </div>
  );
}

/** Collect remaining due (COD / credit / partial) */
export function CollectDueForm({
  orderId,
  amountPaid,
  total,
  defaultMethod = "cash",
  defaultNote = "",
  redirectTo,
}: {
  orderId: string;
  amountPaid: number;
  total: number;
  defaultMethod?: string;
  defaultNote?: string;
  redirectTo?: string;
}) {
  const [paidInput, setPaidInput] = useState(String(amountPaid));
  const [method, setMethod] = useState<CollectMethod>(
    toCollectMethod(defaultMethod),
  );
  const [paymentNote, setPaymentNote] = useState(defaultNote);
  const due = Math.max(0, total - amountPaid);

  return (
    <div className="w-full max-w-md space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1">
        {COLLECT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMethod(opt.id)}
            className={`min-h-11 rounded-lg px-2 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:px-1.5 sm:py-2 sm:text-xs sm:text-[13px] ${
              method === opt.id
                ? "bg-pine text-white"
                : "bg-black/[0.04] text-ink/65 hover:bg-black/[0.07]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {method === "other" || method === "bank" ? (
        <input
          value={paymentNote}
          onChange={(e) => setPaymentNote(e.target.value)}
          placeholder={
            method === "bank" ? "Bank ref (optional)" : "How was it paid?"
          }
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
        />
      ) : null}

      <form
        action={setOrderPaymentPaidAction}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="id" value={orderId} />
        <input type="hidden" name="mode" value="amount" />
        <input type="hidden" name="collectMethod" value={method} />
        <input type="hidden" name="paymentNote" value={paymentNote} />
        {redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}
        <input
          type="number"
          name="amountPaid"
          min={0}
          max={total}
          value={paidInput}
          onChange={(e) => setPaidInput(e.target.value)}
          placeholder="Paid"
          aria-label="Amount paid"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:border-pine sm:min-h-0"
        />
        <AdminSubmit size="sm" className="min-h-11 w-full sm:min-h-0 sm:w-auto" variant="secondary">
          Save
        </AdminSubmit>
      </form>

      {due > 0 ? (
        <form action={setOrderPaymentPaidAction}>
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="mode" value="full" />
          <input type="hidden" name="collectMethod" value={method} />
          <input type="hidden" name="paymentNote" value={paymentNote} />
          {redirectTo ? (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          ) : null}
          <AdminSubmit size="sm" className="w-full">
            Mark paid in full
          </AdminSubmit>
        </form>
      ) : null}
    </div>
  );
}

/** Set bill as credit — select or create customer */
export function SetCreditBillForm({
  orderId,
  customers = [],
  defaultCustomerName = "",
  defaultPhone = "",
  redirectTo,
}: {
  orderId: string;
  customers?: OrderBillCustomerOption[];
  defaultCustomerName?: string;
  defaultPhone?: string;
  redirectTo?: string;
}) {
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [phone, setPhone] = useState(defaultPhone);

  const customerOptions: ProductSearchOption[] = useMemo(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        detail: c.phone || undefined,
        category: "Customer",
      })),
    [customers],
  );

  function applyCustomer(c: OrderBillCustomerOption) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setPhone(c.phone);
  }

  return (
    <div className="space-y-2.5 rounded-xl bg-amber-50/80 px-3 py-3 ring-1 ring-amber-200/60">
      <p className="text-sm text-ink/65">
        Credit needs a saved customer — pick one or enter name + phone to
        create.
      </p>

      {customers.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/50">
            Select customer
          </label>
          <ProductSearchSelect
            products={customerOptions}
            value={customerId}
            onChange={(id) => {
              const c = customers.find((row) => row.id === id);
              if (c) applyCustomer(c);
              else setCustomerId("");
            }}
            placeholder="Search name or phone…"
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/50">
            Name · required
          </label>
          <input
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              setCustomerId("");
            }}
            placeholder="Customer name"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/50">
            Phone · required
          </label>
          <input
            value={phone}
            onChange={(e) => {
              const next = e.target.value;
              setPhone(next);
              const digits = phoneDigits(next);
              if (digits.length >= 7) {
                const match = customers.find(
                  (c) => phoneDigits(c.phone) === digits,
                );
                if (match) applyCustomer(match);
              } else {
                setCustomerId("");
              }
            }}
            placeholder="98xxxxxxxx"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
          />
        </div>
      </div>

      <form action={setOrderPaymentPaidAction}>
        <input type="hidden" name="id" value={orderId} />
        <input type="hidden" name="mode" value="credit" />
        <input type="hidden" name="customerName" value={customerName} />
        <input type="hidden" name="phone" value={phone} />
        {redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}
        <AdminSubmit size="sm" className="w-full">
          {customerId ? "Save as credit" : "Create customer & save credit"}
        </AdminSubmit>
      </form>
    </div>
  );
}

/** Compact collect form for payments list rows (legacy API) */
export function OrderPaymentUpdateForm({
  orderId,
  amountPaid,
  total,
  defaultMethod = "cash",
  defaultNote = "",
  redirectTo,
  compact = true,
}: {
  orderId: string;
  amountPaid: number;
  total: number;
  defaultMethod?: CollectMethod | string;
  defaultNote?: string;
  redirectTo?: string;
  compact?: boolean;
  showBillModes?: boolean;
  customers?: OrderBillCustomerOption[];
  defaultCustomerName?: string;
  defaultPhone?: string;
}) {
  return (
    <div className={compact ? "max-w-[17rem]" : "max-w-md"}>
      <CollectDueForm
        orderId={orderId}
        amountPaid={amountPaid}
        total={total}
        defaultMethod={defaultMethod}
        defaultNote={defaultNote}
        redirectTo={redirectTo}
      />
    </div>
  );
}
