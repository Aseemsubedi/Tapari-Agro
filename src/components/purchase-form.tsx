"use client";

import { useActionState, useMemo, useState } from "react";
import { purchaseStockAction } from "@/app/actions";
import type { PurchaseActionState } from "@/lib/admin-action-helpers";
import { AdminSubmit } from "@/components/admin-ui";
import { ProductSearchSelect } from "@/components/product-search-select";
import { PurchasePayMethodFields } from "@/components/purchase-pay-method-fields";
import { formatNprFromInt } from "@/lib/products";

const MAX_LINES = 20;
const START_LINES = 1;

const field =
  "w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-pine focus:ring-1 focus:ring-pine/20";
const fieldDense =
  "w-full min-w-0 rounded-md border border-black/10 bg-white px-2 py-1 text-[13px] outline-none transition focus:border-pine focus:ring-1 focus:ring-pine/15";

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  costPrice: number;
  digitalAvailable?: number;
  inventoryMode?: string;
  sellerUnitCost?: number;
};

type VendorOption = {
  id: string;
  name: string;
  phone: string;
  address: string;
};

type Line = {
  key: string;
  mode: "existing" | "new";
  productId: string;
  newProductName: string;
  newUnit: string;
  sellingPrice: string;
  batchNo: string;
  quantity: string;
  unitCost: string;
  expiresAt: string;
};

function makeLine(defaultUnit: string, mode: Line["mode"] = "existing"): Line {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode,
    productId: "",
    newProductName: "",
    newUnit: defaultUnit,
    sellingPrice: "",
    batchNo: "",
    quantity: "",
    unitCost: "",
    expiresAt: "",
  };
}

function isLineFilled(line: Line) {
  if (line.mode === "new") return Boolean(line.newProductName.trim());
  return Boolean(line.productId);
}

function lineTotal(line: Line) {
  const q = Number.parseInt(line.quantity, 10);
  const c = Number.parseInt(line.unitCost, 10);
  if (Number.isNaN(q) || Number.isNaN(c) || q <= 0 || c < 0) return 0;
  return q * c;
}

function SegBtn({
  active,
  onClick,
  children,
  tone = "pine",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "pine" | "emerald" | "sky" | "amber";
}) {
  const activeCls =
    tone === "emerald"
      ? "bg-emerald-600 text-white"
      : tone === "sky"
        ? "bg-sky-600 text-white"
        : tone === "amber"
          ? "bg-amber-700 text-white"
          : "bg-pine text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
        active ? activeCls : "bg-black/[0.04] text-ink/60 hover:bg-black/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

export function PurchaseForm({
  products,
  units = [],
  vendors,
  initialProductId = "",
}: {
  products: ProductOption[];
  units?: string[];
  vendors: VendorOption[];
  /** Prefill first line from inventory queue Restock link */
  initialProductId?: string;
}) {
  const unitOptions =
    units.length > 0 ? units : ["1 pack", "100 g", "500 g", "1 kg", "1 L"];
  const defaultUnit = unitOptions[0]!;
  const prefillOk =
    Boolean(initialProductId) &&
    products.some((p) => p.id === initialProductId);

  const [vendorChoice, setVendorChoice] = useState(
    vendors.length === 0 ? "__new__" : "",
  );
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorAddress, setNewVendorAddress] = useState("");
  const [paymentMode, setPaymentMode] = useState<"paid" | "partial" | "unpaid">(
    "paid",
  );
  const [stockKind, setStockKind] = useState<"owned" | "digital">("owned");
  const [amountPaid, setAmountPaid] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>(() => {
    if (prefillOk) {
      const first = makeLine(defaultUnit, "existing");
      first.productId = initialProductId;
      const product = products.find((p) => p.id === initialProductId);
      if (product && product.costPrice > 0) {
        first.unitCost = String(product.costPrice);
      }
      first.quantity = "1";
      return [first];
    }
    return Array.from({ length: START_LINES }, () =>
      makeLine(defaultUnit, products.length === 0 ? "new" : "existing"),
    );
  });

  const [state, formAction, pending] = useActionState<
    PurchaseActionState,
    FormData
  >(purchaseStockAction, {});

  const filledLines = useMemo(() => lines.filter(isLineFilled), [lines]);
  const effectivePaymentMode =
    stockKind === "digital" ? ("unpaid" as const) : paymentMode;
  const linesJson = useMemo(
    () =>
      JSON.stringify(
        filledLines.map((line) => ({
          mode: line.mode,
          stockKind,
          productId: line.productId,
          newProductName: line.newProductName,
          newUnit: line.newUnit,
          sellingPrice: line.sellingPrice,
          batchNo: line.batchNo.trim(),
          quantity: line.quantity || "1",
          unitCost: line.unitCost,
          expiresAt: line.expiresAt,
        })),
      ),
    [filledLines, stockKind],
  );
  const isNewVendor = vendorChoice === "__new__";
  const billTotal = filledLines.reduce((sum, line) => sum + lineTotal(line), 0);
  const partialPaid = Number.parseInt(amountPaid, 10) || 0;
  const duePreview =
    stockKind === "digital"
      ? 0
      : paymentMode === "unpaid"
        ? billTotal
        : paymentMode === "partial"
          ? Math.max(0, billTotal - partialPaid)
          : 0;

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const mode = p.inventoryMode || "owned";
        const digital = p.digitalAvailable ?? 0;
        const parts = [`${p.stock} owned`];
        if (mode === "digital" || mode === "hybrid" || digital > 0) {
          parts.push(`${digital} digital`);
        }
        parts.push(p.unit);
        return {
          id: p.id,
          name: p.name,
          detail: parts.join(" · "),
        };
      }),
    [products],
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function selectProduct(key: string, productId: string) {
    const line = lines.find((l) => l.key === key);
    const duplicate = lines.some(
      (l) =>
        l.key !== key &&
        l.mode === "existing" &&
        l.productId === productId,
    );
    if (duplicate) {
      setClientError(
        "That product is already on this bill — raise its quantity instead.",
      );
      return;
    }
    setClientError(null);
    const product = products.find((p) => p.id === productId);
    const suggestedCost =
      stockKind === "digital"
        ? product && (product.sellerUnitCost ?? 0) > 0
          ? String(product.sellerUnitCost)
          : product && product.costPrice > 0
            ? String(product.costPrice)
            : line?.unitCost || ""
        : product && product.costPrice > 0
          ? String(product.costPrice)
          : line?.unitCost || "";
    updateLine(key, {
      productId,
      unitCost: suggestedCost,
      quantity: line?.quantity || "1",
    });
  }

  function setLineMode(key: string, mode: Line["mode"]) {
    updateLine(key, {
      mode,
      productId: "",
      newProductName: "",
      unitCost: lines.find((l) => l.key === key)?.unitCost || "",
    });
  }

  function changeStockKind(next: "owned" | "digital") {
    setStockKind(next);
    setLines((prev) =>
      prev.map((line) => {
        if (line.mode !== "existing" || !line.productId) return line;
        const product = products.find((p) => p.id === line.productId);
        if (!product) return line;
        let unitCost = line.unitCost;
        if (next === "digital" && (product.sellerUnitCost ?? 0) > 0) {
          unitCost = String(product.sellerUnitCost);
        } else if (next === "owned" && product.costPrice > 0) {
          unitCost = String(product.costPrice);
        }
        return { ...line, unitCost };
      }),
    );
  }

  function addRows(count: number) {
    setLines((prev) => {
      const room = MAX_LINES - prev.length;
      if (room <= 0) return prev;
      const n = Math.min(count, room);
      return [
        ...prev,
        ...Array.from({ length: n }, () => makeLine(defaultUnit, "existing")),
      ];
    });
  }

  function clearEmptyRows() {
    setLines((prev) => {
      const kept = prev.filter(isLineFilled);
      if (kept.length === 0) {
        return [makeLine(defaultUnit, "existing")];
      }
      return kept;
    });
  }

  function validate(): string | null {
    if (isNewVendor && !newVendorName.trim()) {
      return "Enter a vendor name, or pick one from the list.";
    }
    if (filledLines.length === 0) {
      return "Fill at least one product row.";
    }
    for (let i = 0; i < filledLines.length; i++) {
      const line = filledLines[i]!;
      const q = Number.parseInt(line.quantity || "1", 10);
      const c = Number.parseInt(line.unitCost, 10);
      if (line.mode === "existing" && !line.productId) {
        return `Row ${i + 1}: choose a product.`;
      }
      if (line.mode === "new" && !line.newProductName.trim()) {
        return `Row ${i + 1}: enter a product name.`;
      }
      if (!line.batchNo.trim()) {
        return `Row ${i + 1}: enter a batch no.`;
      }
      if (Number.isNaN(q) || q <= 0) {
        return `Row ${i + 1}: quantity must be at least 1.`;
      }
      if (Number.isNaN(c) || c < 0 || line.unitCost === "") {
        return `Row ${i + 1}: enter unit cost.`;
      }
    }
    const ids = filledLines
      .filter((l) => l.mode === "existing")
      .map((l) => l.productId);
    if (new Set(ids).size !== ids.length) {
      return "Same product appears twice — combine quantities.";
    }
    const newNames = filledLines
      .filter((l) => l.mode === "new")
      .map((l) => l.newProductName.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(newNames).size !== newNames.length) {
      return "Same new product name appears twice — use one row.";
    }
    if (stockKind === "digital") {
      if (isNewVendor && !newVendorName.trim()) {
        return "Digital stock needs a vendor (seller).";
      }
      if (!isNewVendor && !vendorChoice) {
        return "Digital stock needs a vendor (seller).";
      }
    }
    if (stockKind === "owned" && paymentMode === "partial") {
      const paidAmt = Number.parseInt(amountPaid, 10);
      if (Number.isNaN(paidAmt) || paidAmt <= 0) {
        return "Enter how much was paid (partial).";
      }
      if (billTotal > 0 && paidAmt >= billTotal) {
        return "Partial amount must be less than the bill total — use Paid instead.";
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

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="lines" value={linesJson} />
      <input type="hidden" name="paymentMode" value={effectivePaymentMode} />
      <input
        type="hidden"
        name="amountPaid"
        value={stockKind === "digital" ? "" : amountPaid}
      />
      <input type="hidden" name="stockKind" value={stockKind} />
      {!isNewVendor && vendorChoice ? (
        <input type="hidden" name="vendorId" value={vendorChoice} />
      ) : null}
      {isNewVendor ? (
        <>
          <input type="hidden" name="newVendorName" value={newVendorName} />
          <input type="hidden" name="newVendorPhone" value={newVendorPhone} />
          <input
            type="hidden"
            name="newVendorAddress"
            value={newVendorAddress}
          />
        </>
      ) : null}

      {/* Header: vendor + bill meta + payment in one block */}
      <div className="rounded-xl border border-black/[0.06] bg-[#fafbfc] p-3 sm:p-3.5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
                Vendor
              </label>
              <button
                type="button"
                onClick={() => {
                  setVendorChoice((v) => (v === "__new__" ? "" : "__new__"));
                  if (vendorChoice !== "__new__") {
                    setNewVendorName("");
                    setNewVendorPhone("");
                    setNewVendorAddress("");
                  }
                }}
                className="text-[11px] font-semibold text-pine hover:underline"
              >
                {isNewVendor ? "Pick existing" : "+ New"}
              </button>
            </div>

            {isNewVendor ? (
              <div className="grid gap-1.5 sm:grid-cols-3">
                <input
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="Name *"
                  className={`${field} sm:col-span-1`}
                  autoFocus
                />
                <input
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                  placeholder="Phone"
                  className={field}
                />
                <input
                  value={newVendorAddress}
                  onChange={(e) => setNewVendorAddress(e.target.value)}
                  placeholder="Address"
                  className={field}
                />
              </div>
            ) : (
              <ProductSearchSelect
                products={vendors.map((v) => ({
                  id: v.id,
                  name: v.name,
                  detail:
                    [v.phone, v.address].filter(Boolean).join(" · ") ||
                    undefined,
                }))}
                value={vendorChoice}
                onChange={setVendorChoice}
                placeholder="Search vendor…"
                inputClassName={field}
              />
            )}

            <div>
              <label
                htmlFor="note"
                className="mb-1 block text-[11px] font-medium text-ink/50"
              >
                Note
              </label>
              <input
                id="note"
                name="note"
                placeholder="Optional note for this bill"
                className={field}
                aria-label="Note"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
                Stock type
              </p>
              <div className="flex flex-wrap gap-1">
                <SegBtn
                  active={stockKind === "owned"}
                  onClick={() => changeStockKind("owned")}
                  tone="pine"
                >
                  Owned purchase
                </SegBtn>
                <SegBtn
                  active={stockKind === "digital"}
                  onClick={() => changeStockKind("digital")}
                  tone="sky"
                >
                  Digital reservation
                </SegBtn>
              </div>
              <p className="text-[11px] text-ink/40">
                {stockKind === "digital"
                  ? "Same catalog product, any supplier — owned sells first, then digital. Reservation only · payout on sale."
                  : "Same catalog product from any supplier. Buys warehouse stock · pay now or leave due · sells before digital."}
              </p>
            </div>

            {stockKind === "owned" ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  Payment
                </p>
                <div className="flex flex-wrap gap-1">
                  <SegBtn
                    active={paymentMode === "paid"}
                    onClick={() => setPaymentMode("paid")}
                    tone="emerald"
                  >
                    Paid
                  </SegBtn>
                  <SegBtn
                    active={paymentMode === "partial"}
                    onClick={() => setPaymentMode("partial")}
                    tone="sky"
                  >
                    Partial
                  </SegBtn>
                  <SegBtn
                    active={paymentMode === "unpaid"}
                    onClick={() => setPaymentMode("unpaid")}
                    tone="amber"
                  >
                    Unpaid
                  </SegBtn>
                  {paymentMode === "partial" ? (
                    <input
                      type="number"
                      min={1}
                      max={billTotal > 0 ? billTotal - 1 : undefined}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="Amount paid"
                      className="w-28 rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:border-pine"
                    />
                  ) : null}
                </div>
                {paymentMode !== "unpaid" ? (
                  <PurchasePayMethodFields compact />
                ) : (
                  <p className="text-[11px] text-amber-800/80">
                    Full bill stays due — pay later in Money / Purchases.
                  </p>
                )}
                {duePreview > 0 ? (
                  <p className="text-[11px] font-medium text-amber-800">
                    Due after save: {formatNprFromInt(duePreview)}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 px-3 py-2.5">
                <p className="text-xs font-semibold text-sky-900">
                  Digital stock reservation
                </p>
                <p className="mt-0.5 text-[11px] text-sky-800/80">
                  No payment on this bill. Cost is the seller payout rate — you
                  settle the seller when you sell.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
              Products
              <span className="ml-2 font-medium normal-case tracking-normal text-ink/35">
                {filledLines.length}/{lines.length} · max {MAX_LINES} ·{" "}
                {stockKind === "digital"
                  ? "digital reservation"
                  : "owned purchase"}
              </span>
            </p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={clearEmptyRows}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-ink/45 hover:bg-black/[0.04] hover:text-ink"
            >
              Clear empty
            </button>
            <button
              type="button"
              disabled={lines.length >= MAX_LINES}
              onClick={() => addRows(1)}
              className="rounded-md bg-pine/10 px-2 py-1 text-[11px] font-semibold text-pine hover:bg-pine/15 disabled:opacity-40"
            >
              + Row
            </button>
            <button
              type="button"
              disabled={lines.length >= MAX_LINES}
              onClick={() => addRows(5)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-pine/70 hover:bg-pine/10 disabled:opacity-40"
            >
              +5
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-black/[0.07]">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                <th className="w-7 px-1.5 py-1.5 text-center">#</th>
                <th className="min-w-[200px] px-1.5 py-1.5">Product</th>
                <th className="w-[110px] px-1.5 py-1.5">
                  Batch no <span className="normal-case text-red-500">*</span>
                </th>
                <th className="w-[64px] px-1.5 py-1.5">Qty</th>
                <th className="w-[88px] px-1.5 py-1.5">
                  {stockKind === "digital" ? "Payout" : "Cost"}
                </th>
                <th className="w-[118px] px-1.5 py-1.5">Expiry</th>
                <th className="w-[80px] px-1.5 py-1.5 text-right">Amount</th>
                <th className="w-8 px-1 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const selected = products.find((p) => p.id === line.productId);
                const qtyNum = Number.parseInt(line.quantity || "0", 10);
                const afterOwned =
                  stockKind === "owned" &&
                  selected &&
                  !Number.isNaN(qtyNum) &&
                  qtyNum > 0
                    ? selected.stock + qtyNum
                    : null;
                const afterDigital =
                  stockKind === "digital" &&
                  selected &&
                  !Number.isNaN(qtyNum) &&
                  qtyNum > 0
                    ? (selected.digitalAvailable ?? 0) + qtyNum
                    : null;
                const total = lineTotal({
                  ...line,
                  quantity: line.quantity || (isLineFilled(line) ? "1" : ""),
                });

                return (
                  <tr
                    key={line.key}
                    className={`border-b border-black/[0.04] align-middle last:border-b-0 ${
                      isLineFilled(line) ? "bg-white" : "bg-[#fcfcfb]"
                    }`}
                  >
                    <td className="px-1.5 py-1.5 text-center text-[11px] text-ink/30">
                      {index + 1}
                    </td>
                    <td className="px-1.5 py-1.5">
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        <SegBtn
                          active={line.mode === "existing"}
                          onClick={() => setLineMode(line.key, "existing")}
                          tone="pine"
                        >
                          Catalog
                        </SegBtn>
                        <SegBtn
                          active={line.mode === "new"}
                          onClick={() => setLineMode(line.key, "new")}
                          tone="amber"
                        >
                          New
                        </SegBtn>
                      </div>
                      {line.mode === "new" ? (
                        <div className="grid gap-1 sm:grid-cols-[1.3fr_0.7fr_0.7fr]">
                          <input
                            value={line.newProductName}
                            onChange={(e) =>
                              updateLine(line.key, {
                                newProductName: e.target.value,
                              })
                            }
                            placeholder="New product name"
                            className={fieldDense}
                          />
                          <select
                            value={line.newUnit}
                            onChange={(e) =>
                              updateLine(line.key, {
                                newUnit: e.target.value,
                              })
                            }
                            className={fieldDense}
                          >
                            {unitOptions.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={line.sellingPrice}
                            onChange={(e) =>
                              updateLine(line.key, {
                                sellingPrice: e.target.value,
                              })
                            }
                            placeholder="Sell ₹"
                            className={fieldDense}
                          />
                        </div>
                      ) : (
                        <ProductSearchSelect
                          products={productOptions}
                          value={line.productId}
                          excludeIds={lines
                            .filter(
                              (l) =>
                                l.key !== line.key &&
                                l.mode === "existing" &&
                                l.productId,
                            )
                            .map((l) => l.productId)}
                          onChange={(productId) =>
                            selectProduct(line.key, productId)
                          }
                          placeholder="Search product…"
                          inputClassName={fieldDense}
                        />
                      )}
                      {line.mode === "existing" && selected ? (
                        <p className="mt-0.5 text-[10px] text-ink/40">
                          {selected.unit}
                          {stockKind === "digital" ? (
                            <>
                              {" · digital "}
                              {selected.digitalAvailable ?? 0}
                              {afterDigital != null ? (
                                <span className="font-medium text-sky-700">
                                  {" "}
                                  → {afterDigital}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {" · owned "}
                              {selected.stock}
                              {afterOwned != null ? (
                                <span className="font-medium text-pine">
                                  {" "}
                                  → {afterOwned}
                                </span>
                              ) : null}
                            </>
                          )}
                        </p>
                      ) : line.mode === "new" && line.newProductName ? (
                        <p className="mt-0.5 text-[10px] text-ink/40">
                          Creates{" "}
                          {stockKind === "digital" ? "digital" : "owned"}{" "}
                          product
                        </p>
                      ) : null}
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        value={line.batchNo}
                        onChange={(e) =>
                          updateLine(line.key, { batchNo: e.target.value })
                        }
                        placeholder="Batch *"
                        required={isLineFilled(line)}
                        className={fieldDense}
                        aria-label={`Batch no row ${index + 1}`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, { quantity: e.target.value })
                        }
                        placeholder="1"
                        className={fieldDense}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={line.unitCost}
                        onChange={(e) =>
                          updateLine(line.key, { unitCost: e.target.value })
                        }
                        placeholder={
                          stockKind === "digital" ? "Payout ₹" : "NPR"
                        }
                        className={fieldDense}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="date"
                        value={line.expiresAt}
                        onChange={(e) =>
                          updateLine(line.key, { expiresAt: e.target.value })
                        }
                        className={fieldDense}
                      />
                    </td>
                    <td className="px-1.5 py-1.5 text-right text-[13px] font-semibold tabular-nums text-ink">
                      {total > 0 ? formatNprFromInt(total) : "—"}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) => {
                            if (prev.length <= 1) {
                              return [makeLine(defaultUnit, "existing")];
                            }
                            return prev.filter((l) => l.key !== line.key);
                          })
                        }
                        className="text-[12px] font-semibold text-ink/30 hover:text-red-600"
                        aria-label={`Remove row ${index + 1}`}
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
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-white/95 px-3.5 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-md backdrop-blur sm:bottom-3 sm:mx-0">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold tabular-nums text-ink sm:text-2xl">
            {formatNprFromInt(billTotal)}
          </p>
          <p className="text-[11px] text-ink/45">
            {filledLines.length === 1
              ? "1 item"
              : `${filledLines.length} items`}
            {" · "}
            <span
              className={
                stockKind === "digital"
                  ? "text-sky-800"
                  : paymentMode === "paid"
                    ? "text-emerald-700"
                    : paymentMode === "partial"
                      ? "text-sky-800"
                      : "text-amber-800"
              }
            >
              {stockKind === "digital"
                ? "Digital reservation · no payment"
                : paymentMode === "paid"
                  ? "Owned · Paid in full"
                  : paymentMode === "partial"
                    ? partialPaid > 0
                      ? `Owned · Paid ${formatNprFromInt(partialPaid)} · due ${formatNprFromInt(duePreview)}`
                      : "Owned · Partial"
                    : `Owned · Unpaid · due ${formatNprFromInt(billTotal)}`}
            </span>
          </p>
        </div>
        <AdminSubmit disabled={pending} className="min-w-[9.5rem]">
          {pending
            ? "Saving…"
            : stockKind === "digital"
              ? "Save reservation"
              : "Save purchase"}
        </AdminSubmit>
      </div>
    </form>
  );
}
