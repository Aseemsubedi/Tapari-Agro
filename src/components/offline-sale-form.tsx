"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { placeOfflineSaleAction } from "@/app/actions";
import type { OfflineSaleState } from "@/lib/admin-action-helpers";
import { AdminSubmit } from "@/components/admin-ui";
import { ProductSearchSelect } from "@/components/product-search-select";
import { formatNprFromInt } from "@/lib/products";
import { sellableQty } from "@/lib/inventory-mode";

const field =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/15";
const fieldDense =
  "w-full min-w-0 rounded-md border border-black/10 bg-white px-2 py-1.5 text-[13px] outline-none transition focus:border-pine focus:ring-1 focus:ring-pine/20";

const MAX_LINES = 20;
const START_LINES = 4;

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  digitalAvailable: number;
  inventoryMode: string;
  price: number;
};

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  address1: string;
  address2: string;
};

type Line = {
  key: string;
  productId: string;
  quantity: string;
};

function makeLine(): Line {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: "",
    quantity: "1",
  };
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

type PayMethod = "cash" | "bank_qr" | "credit" | "partial";
type DiscountMode = "amount" | "percent";

export function OfflineSaleForm({
  products,
  customers = [],
}: {
  products: ProductOption[];
  customers?: CustomerOption[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [remarks, setRemarks] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>(() =>
    Array.from({ length: START_LINES }, () => makeLine()),
  );

  const [state, formAction, pending] = useActionState<
    OfflineSaleState,
    FormData
  >(placeOfflineSaleAction, {});

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const matchedByPhone = useMemo(() => {
    const digits = phoneDigits(phone);
    if (digits.length < 7) return null;
    return customers.find((c) => phoneDigits(c.phone) === digits) ?? null;
  }, [customers, phone]);

  const savedAddresses = useMemo(() => {
    const row = selectedCustomer ?? matchedByPhone;
    if (!row) return [] as string[];
    return [row.address1, row.address2].filter((a) => a.trim());
  }, [selectedCustomer, matchedByPhone]);

  useEffect(() => {
    if (!state.orderId) return;
    setSuccessOrderId(state.orderId);
    setCustomerId("");
    setCustomerName("");
    setPhone("");
    setDeliveryAddress("");
    setDeliveryFee("");
    setPaymentMethod("cash");
    setAmountPaid("");
    setRemarks("");
    setDiscountMode("amount");
    setDiscountValue("");
    setLines(Array.from({ length: START_LINES }, () => makeLine()));
    setClientError(null);
    router.refresh();
  }, [state.orderId, router]);

  const filled = useMemo(
    () => lines.filter((l) => l.productId),
    [lines],
  );
  const linesJson = useMemo(() => JSON.stringify(filled), [filled]);

  const subtotal = filled.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId);
    const q = Number.parseInt(line.quantity, 10);
    if (!product || Number.isNaN(q) || q < 1) return sum;
    return sum + product.price * q;
  }, 0);

  const discountParsed = Number.parseFloat(discountValue);
  const discountAmount = (() => {
    if (
      !discountValue.trim() ||
      Number.isNaN(discountParsed) ||
      discountParsed < 0
    ) {
      return 0;
    }
    if (discountMode === "percent") {
      return Math.min(
        subtotal,
        Math.round((subtotal * Math.min(discountParsed, 100)) / 100),
      );
    }
    return Math.min(subtotal, Math.round(discountParsed));
  })();

  const discountPercentShown =
    subtotal > 0 && discountAmount > 0
      ? Math.round((discountAmount / subtotal) * 100)
      : discountMode === "percent" && !Number.isNaN(discountParsed)
        ? Math.min(100, Math.max(0, Math.round(discountParsed)))
        : 0;

  const deliveryFeeParsed = Number.parseInt(deliveryFee, 10);
  const deliveryFeeAmount =
    deliveryFee.trim() &&
    !Number.isNaN(deliveryFeeParsed) &&
    deliveryFeeParsed > 0
      ? deliveryFeeParsed
      : 0;

  const total = Math.max(0, subtotal - discountAmount) + deliveryFeeAmount;

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const avail = sellableQty(p);
        return {
          id: p.id,
          name: p.name,
          detail: `${formatNprFromInt(p.price)} · ${p.unit} · avail ${avail}`,
        };
      }),
    [products],
  );

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        detail: [c.phone, c.address1].filter(Boolean).join(" · ") || undefined,
      })),
    [customers],
  );

  function applyCustomer(c: CustomerOption) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setPhone(c.phone);
    if (c.address1 && !deliveryAddress.trim()) {
      setDeliveryAddress(c.address1);
    }
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function validate(): string | null {
    if (filled.length === 0) return "Add at least one product.";
    for (let i = 0; i < filled.length; i++) {
      const line = filled[i]!;
      const product = products.find((p) => p.id === line.productId);
      const q = Number.parseInt(line.quantity, 10);
      if (!product) return `Row ${i + 1}: choose a product.`;
      if (Number.isNaN(q) || q < 1) return `Row ${i + 1}: quantity must be ≥ 1.`;
      if (q > sellableQty(product)) {
        return `${product.name}: only ${sellableQty(product)} available.`;
      }
    }
    if (paymentMethod === "credit" || paymentMethod === "partial") {
      const name = customerName.trim();
      const isAnon =
        !name || name.toLowerCase() === "walk-in customer";
      if (isAnon) {
        return "Credit / partial needs a customer name — not Walk-in.";
      }
      if (!phoneDigits(phone) || phoneDigits(phone).length < 7) {
        return "Credit / partial needs a phone number to track the due.";
      }
    }
    if (discountValue.trim()) {
      const v = Number.parseFloat(discountValue);
      if (Number.isNaN(v) || v < 0) return "Enter a valid discount.";
      if (discountMode === "percent" && v > 100) {
        return "Discount percent cannot exceed 100%.";
      }
      if (discountMode === "amount" && v > subtotal) {
        return "Discount cannot exceed the bill subtotal.";
      }
    }
    if (deliveryFee.trim()) {
      const fee = Number.parseInt(deliveryFee, 10);
      if (Number.isNaN(fee) || fee < 0) {
        return "Enter a valid delivery fee.";
      }
    }
    if (paymentMethod === "partial") {
      const paid = Number.parseInt(amountPaid, 10);
      if (Number.isNaN(paid) || paid <= 0) {
        return "Enter how much was paid (partial).";
      }
      if (paid >= total) {
        return "Partial amount must be less than payable — use Cash or Bank QR.";
      }
    }
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const error = validate();
    if (error) {
      event.preventDefault();
      setClientError(error);
      return;
    }
    setClientError(null);
  }

  const error = clientError || state.error;
  const payOptions: {
    id: PayMethod;
    label: string;
    hint: string;
  }[] = [
    { id: "cash", label: "Cash", hint: "Paid in full" },
    { id: "bank_qr", label: "Bank QR", hint: "Paid in full" },
    { id: "credit", label: "Credit", hint: "Needs name + phone" },
    { id: "partial", label: "Partial", hint: "Needs name + phone" },
  ];

  const dueNow =
    paymentMethod === "partial"
      ? Math.max(0, total - (Number.parseInt(amountPaid, 10) || 0))
      : paymentMethod === "credit"
        ? total
        : 0;

  const addressSlotsUsed = savedAddresses.length;
  const canSaveAnother =
    !deliveryAddress.trim() ||
    savedAddresses.some(
      (a) => a.trim().toLowerCase() === deliveryAddress.trim().toLowerCase(),
    ) ||
    addressSlotsUsed < 2;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="lines" value={linesJson} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input type="hidden" name="amountPaid" value={amountPaid} />
      <input type="hidden" name="customerName" value={customerName} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="deliveryAddress" value={deliveryAddress} />
      <input type="hidden" name="deliveryFee" value={deliveryFee} />
      <input type="hidden" name="remarks" value={remarks} />
      <input type="hidden" name="discountMode" value={discountMode} />
      <input type="hidden" name="discountValue" value={discountValue} />

      {successOrderId ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <p>
            Sale saved{" "}
            <span className="font-semibold">#{successOrderId.slice(0, 8)}</span>
          </p>
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <a
              href={`/order/${successOrderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Customer statement
            </a>
            <a
              href={`/admin/orders/${successOrderId}`}
              className="hover:underline"
            >
              Open bill
            </a>
            <a href="/admin/profits" className="hover:underline">
              Analysis
            </a>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">
          1 · Customer
        </p>

        {customers.length > 0 ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/55">
              Saved customer
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
              inputClassName={field}
            />
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/55">
              Name
              {paymentMethod === "credit" || paymentMethod === "partial" ? (
                <span className="text-amber-800"> · required for credit</span>
              ) : null}
            </label>
            <input
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setCustomerId("");
              }}
              placeholder={
                paymentMethod === "credit" || paymentMethod === "partial"
                  ? "Customer name (required)"
                  : "Walk-in customer"
              }
              className={field}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/55">
              Phone
              {paymentMethod === "credit" || paymentMethod === "partial" ? (
                <span className="text-amber-800"> · required for credit</span>
              ) : null}
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
                  if (match) {
                    setCustomerId(match.id);
                    setCustomerName(match.name);
                    if (match.address1 && !deliveryAddress.trim()) {
                      setDeliveryAddress(match.address1);
                    }
                  }
                }
              }}
              placeholder={
                paymentMethod === "credit" || paymentMethod === "partial"
                  ? "Phone to track due (required)"
                  : "Optional — links saved addresses"
              }
              className={field}
            />
            {matchedByPhone && !customerId ? (
              <button
                type="button"
                onClick={() => applyCustomer(matchedByPhone)}
                className="mt-1 text-[11px] font-semibold text-pine hover:underline"
              >
                Use saved {matchedByPhone.name}
              </button>
            ) : null}
          </div>
        </div>
        {paymentMethod === "credit" || paymentMethod === "partial" ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-900">
            Credit is not for anonymous walk-in. Enter the customer’s{" "}
            <span className="font-semibold">name and phone</span> so the due
            shows under Customers and Payments / Due.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-ink/55">
                Delivery / shipping address
              </label>
              <span className="text-[10px] font-medium text-ink/40">
                Auto-saves · max 2 per customer
              </span>
            </div>
            {savedAddresses.length > 0 ? (
              <div className="mb-2 flex flex-col gap-1.5">
                {savedAddresses.map((addr, index) => {
                  const active =
                    deliveryAddress.trim().toLowerCase() ===
                    addr.trim().toLowerCase();
                  return (
                    <button
                      key={`${index}-${addr}`}
                      type="button"
                      onClick={() => setDeliveryAddress(addr)}
                      className={`rounded-xl border px-3 py-2 text-left text-[13px] transition ${
                        active
                          ? "border-pine/40 bg-pine/5 text-ink ring-2 ring-pine/15"
                          : "border-black/10 bg-white text-ink/75 hover:border-pine/25"
                      }`}
                    >
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                        Address {index + 1}
                      </span>
                      {addr}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={2}
              placeholder={
                savedAddresses.length >= 2
                  ? "New address replaces the oldest of the 2 saved"
                  : "Leave blank for shop pickup · or enter delivery address"
              }
              className={`${field} resize-y`}
            />
            <p className="mt-1 text-[11px] text-ink/40">
              {savedAddresses.length === 0
                ? "New address is saved on this customer when you complete the sale."
                : canSaveAnother
                  ? `${savedAddresses.length}/2 saved · new addresses are kept automatically.`
                  : "2/2 saved · this new address will replace the older one."}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/55">
              Delivery fee (NPR)
            </label>
            <input
              type="number"
              min={0}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0"
              className={field}
            />
            <p className="mt-1 text-[11px] text-ink/40">
              Optional · added to total
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">
          2 · Payment
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {payOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setPaymentMethod(opt.id);
                if (opt.id !== "partial") setAmountPaid("");
              }}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                paymentMethod === opt.id
                  ? opt.id === "credit"
                    ? "border-amber-300 bg-amber-50 ring-2 ring-amber-200/60"
                    : opt.id === "partial"
                      ? "border-sky-300 bg-sky-50 ring-2 ring-sky-200/60"
                      : "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200/60"
                  : "border-black/10 bg-white hover:border-pine/25"
              }`}
            >
              <span className="block text-sm font-semibold text-ink">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink/45">
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
        {paymentMethod === "partial" ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/55">
              Amount paid now (NPR)
            </label>
            <input
              type="number"
              min={1}
              max={total > 0 ? total - 1 : undefined}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={total > 0 ? `Less than ${total}` : "Enter amount"}
              className={field}
            />
            {total > 0 && Number.parseInt(amountPaid, 10) > 0 ? (
              <p className="mt-1 text-[11px] text-ink/45">
                Due after sale: {formatNprFromInt(dueNow)}
              </p>
            ) : null}
          </div>
        ) : null}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink/55">
            Remarks
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Anything needed for this offline sale — bill ref, due date, QR note…"
            className={`${field} resize-y`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">
              3 · Products
            </p>
            <p className="mt-0.5 text-xs text-ink/45">
              Offline-channel products only. Empty rows are skipped.
            </p>
          </div>
          <button
            type="button"
            disabled={lines.length >= MAX_LINES}
            onClick={() =>
              setLines((prev) =>
                prev.length >= MAX_LINES ? prev : [...prev, makeLine()],
              )
            }
            className="rounded-lg border border-pine/20 bg-pine/5 px-2.5 py-1 text-[12px] font-semibold text-pine disabled:opacity-40"
          >
            + Row
          </button>
        </div>

        <div className="space-y-3 sm:hidden">
          {lines.map((line, index) => {
            const product = products.find((p) => p.id === line.productId);
            const q = Number.parseInt(line.quantity, 10) || 0;
            const lineTotal = product && q > 0 ? product.price * q : 0;
            return (
              <div
                key={line.key}
                className="rounded-2xl border border-black/[0.08] bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink/35">
                    Item {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) =>
                        prev.length <= 1
                          ? [makeLine()]
                          : prev.filter((l) => l.key !== line.key),
                      )
                    }
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg text-sm font-semibold text-ink/40 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove line"
                  >
                    ✕
                  </button>
                </div>
                <ProductSearchSelect
                  products={productOptions}
                  value={line.productId}
                  onChange={(productId) =>
                    updateLine(line.key, { productId })
                  }
                  placeholder="Search offline product…"
                  inputClassName={field}
                />
                <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-ink/45">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={product ? sellableQty(product) : undefined}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: e.target.value })
                      }
                      className={`${field} mt-1 min-h-11`}
                    />
                  </div>
                  <div className="pb-2 text-right">
                    <p className="text-[11px] text-ink/40">
                      {product ? formatNprFromInt(product.price) : "—"} each
                    </p>
                    <p className="text-base font-bold tabular-nums text-ink">
                      {lineTotal > 0 ? formatNprFromInt(lineTotal) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-black/[0.08] sm:block">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                <th className="w-8 px-2 py-2 text-center">#</th>
                <th className="min-w-[220px] px-2 py-2">Product</th>
                <th className="w-[80px] px-2 py-2">Qty</th>
                <th className="w-[100px] px-2 py-2 text-right">Price</th>
                <th className="w-[100px] px-2 py-2 text-right">Total</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const product = products.find((p) => p.id === line.productId);
                const q = Number.parseInt(line.quantity, 10) || 0;
                const lineTotal = product && q > 0 ? product.price * q : 0;
                return (
                  <tr
                    key={line.key}
                    className="border-b border-black/[0.05] align-top last:border-b-0"
                  >
                    <td className="px-2 py-2 text-center text-[12px] text-ink/35">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2">
                      <ProductSearchSelect
                        products={productOptions}
                        value={line.productId}
                        onChange={(productId) =>
                          updateLine(line.key, { productId })
                        }
                        placeholder="Search offline product…"
                        inputClassName={fieldDense}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        max={product ? sellableQty(product) : undefined}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, { quantity: e.target.value })
                        }
                        className={fieldDense}
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-[13px] tabular-nums text-ink/60">
                      {product ? formatNprFromInt(product.price) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right text-[13px] font-semibold tabular-nums text-ink">
                      {lineTotal > 0 ? formatNprFromInt(lineTotal) : "—"}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length <= 1
                              ? [makeLine()]
                              : prev.filter((l) => l.key !== line.key),
                          )
                        }
                        className="inline-flex h-9 w-9 items-center justify-center text-[11px] font-semibold text-ink/35 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">
          4 · Discount
        </p>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="flex rounded-xl border border-black/10 bg-[#fafbfc] p-1">
            <button
              type="button"
              onClick={() => {
                setDiscountMode("amount");
                setDiscountValue("");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                discountMode === "amount"
                  ? "bg-white text-pine shadow-sm"
                  : "text-ink/50"
              }`}
            >
              NPR
            </button>
            <button
              type="button"
              onClick={() => {
                setDiscountMode("percent");
                setDiscountValue("");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                discountMode === "percent"
                  ? "bg-white text-pine shadow-sm"
                  : "text-ink/50"
              }`}
            >
              %
            </button>
          </div>
          <div>
            <input
              type="number"
              min={0}
              max={discountMode === "percent" ? 100 : subtotal || undefined}
              step={1}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={
                discountMode === "percent"
                  ? "Discount %"
                  : "Discount amount (NPR)"
              }
              className={field}
            />
            {discountAmount > 0 ? (
              <p className="mt-1 text-[11px] text-ink/45">
                −{formatNprFromInt(discountAmount)}
                {discountPercentShown > 0 ? ` (${discountPercentShown}%)` : ""}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-ink/40">Optional</p>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur sm:bottom-3 sm:mx-0">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">
            Payable
          </p>
          <p className="font-display text-2xl font-bold tabular-nums text-ink">
            {formatNprFromInt(total)}
          </p>
          <p className="line-clamp-2 text-xs text-ink/40">
            {filled.length} item{filled.length === 1 ? "" : "s"}
            {subtotal > 0 ? ` · Subtotal ${formatNprFromInt(subtotal)}` : ""}
            {discountAmount > 0 ? (
              <span className="text-amber-800">
                {" "}
                · Disc −{formatNprFromInt(discountAmount)}
                {discountPercentShown > 0 ? ` (${discountPercentShown}%)` : ""}
              </span>
            ) : null}
            {deliveryFeeAmount > 0 ? (
              <span className="text-ink/55">
                {" "}
                · Delivery +{formatNprFromInt(deliveryFeeAmount)}
              </span>
            ) : null}
            {" · "}
            {paymentMethod === "credit" ? (
              <span className="text-amber-800">Credit · unpaid</span>
            ) : paymentMethod === "partial" ? (
              <span className="text-sky-800">
                Partial
                {Number.parseInt(amountPaid, 10) > 0
                  ? ` · paid ${formatNprFromInt(Number.parseInt(amountPaid, 10))} · due ${formatNprFromInt(dueNow)}`
                  : ""}
              </span>
            ) : paymentMethod === "bank_qr" ? (
              <span className="text-emerald-700">Bank QR · paid</span>
            ) : (
              <span className="text-emerald-700">Cash · paid</span>
            )}
          </p>
        </div>
        <AdminSubmit disabled={pending} className="min-h-11 w-full min-w-[10rem] sm:w-auto">
          {pending ? "Saving…" : "Complete sale"}
        </AdminSubmit>
      </div>
    </form>
  );
}
