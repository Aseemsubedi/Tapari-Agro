"use client";

import { useState } from "react";
import type { PurchasePayMethod } from "@/lib/purchase-payment";

const field =
  "w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/15";

const OPTIONS: {
  id: PurchasePayMethod;
  label: string;
  hint: string;
}[] = [
  { id: "cash", label: "Cash", hint: "Handed over" },
  { id: "bank", label: "Bank", hint: "Transfer / deposit" },
  { id: "cheque", label: "Cheque", hint: "No. + date" },
];

export function PurchasePayMethodFields({
  namePrefix = "",
  defaultMethod = "cash",
  defaultChequeNo = "",
  defaultChequeDate = "",
  compact = false,
}: {
  namePrefix?: string;
  defaultMethod?: PurchasePayMethod | "";
  defaultChequeNo?: string;
  defaultChequeDate?: string;
  compact?: boolean;
}) {
  const methodName = `${namePrefix}payMethod`;
  const chequeNoName = `${namePrefix}chequeNo`;
  const chequeDateName = `${namePrefix}chequeDate`;

  const [method, setMethod] = useState<PurchasePayMethod>(
    defaultMethod === "bank" || defaultMethod === "cheque"
      ? defaultMethod
      : "cash",
  );
  const [chequeNo, setChequeNo] = useState(defaultChequeNo);
  const [chequeDate, setChequeDate] = useState(defaultChequeDate);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <input type="hidden" name={methodName} value={method} />
      <input type="hidden" name={chequeNoName} value={chequeNo} />
      <input type="hidden" name={chequeDateName} value={chequeDate} />

      <p
        className={
          compact
            ? "text-[10px] font-medium uppercase tracking-wide text-ink/40"
            : "text-xs font-medium text-ink/55"
        }
      >
        Paid via
      </p>
      <div className={`grid grid-cols-3 gap-1.5 ${compact ? "" : "gap-2"}`}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMethod(opt.id)}
            className={`rounded-xl border text-left transition ${
              compact ? "px-2 py-1.5" : "px-2.5 py-2"
            } ${
              method === opt.id
                ? "border-pine/40 bg-pine/5 ring-2 ring-pine/15"
                : "border-black/10 bg-white hover:border-pine/25"
            }`}
          >
            <span
              className={`block font-semibold text-ink ${
                compact ? "text-[12px]" : "text-sm"
              }`}
            >
              {opt.label}
            </span>
            {!compact ? (
              <span className="mt-0.5 block text-[11px] text-ink/45">
                {opt.hint}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {method === "cheque" ? (
        <div
          className={`grid gap-2 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}
        >
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink/50">
              Cheque no.
            </label>
            <input
              value={chequeNo}
              onChange={(e) => setChequeNo(e.target.value)}
              placeholder="Given number"
              className={
                compact
                  ? "w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] outline-none focus:border-pine"
                  : field
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink/50">
              Cheque date
            </label>
            <input
              type="date"
              value={chequeDate}
              onChange={(e) => setChequeDate(e.target.value)}
              className={
                compact
                  ? "w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] outline-none focus:border-pine"
                  : field
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
