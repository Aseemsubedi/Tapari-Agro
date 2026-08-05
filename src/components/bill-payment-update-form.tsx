"use client";

import { useState } from "react";
import { setPurchaseBillPaidAction } from "@/app/actions";
import { AdminSubmit } from "@/components/admin-ui";
import type { PurchasePayMethod } from "@/lib/purchase-payment";

const OPTIONS: { id: PurchasePayMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "bank", label: "Bank" },
  { id: "cheque", label: "Cheque" },
];

function PayHiddens({
  method,
  chequeNo,
  chequeDate,
  redirectTo,
}: {
  method: PurchasePayMethod;
  chequeNo: string;
  chequeDate: string;
  redirectTo?: string;
}) {
  return (
    <>
      <input type="hidden" name="payMethod" value={method} />
      <input type="hidden" name="chequeNo" value={chequeNo} />
      <input type="hidden" name="chequeDate" value={chequeDate} />
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}
    </>
  );
}

export function BillPaymentUpdateForm({
  batchId,
  amountPaid,
  total,
  defaultMethod = "cash",
  defaultChequeNo = "",
  defaultChequeDate = "",
  redirectTo,
}: {
  batchId: string;
  amountPaid: number;
  total: number;
  defaultMethod?: PurchasePayMethod | "";
  defaultChequeNo?: string;
  defaultChequeDate?: string;
  redirectTo?: string;
}) {
  const [method, setMethod] = useState<PurchasePayMethod>(
    defaultMethod === "bank" || defaultMethod === "cheque"
      ? defaultMethod
      : "cash",
  );
  const [chequeNo, setChequeNo] = useState(defaultChequeNo);
  const [chequeDate, setChequeDate] = useState(defaultChequeDate);
  const due = Math.max(0, total - amountPaid);

  return (
    <div className="w-full max-w-md space-y-2.5 sm:max-w-[17rem]">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMethod(opt.id)}
            className={`min-h-11 rounded-lg px-1.5 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:py-2 sm:text-xs sm:text-[13px] ${
              method === opt.id
                ? "bg-pine text-white"
                : "bg-black/[0.04] text-ink/65 hover:bg-black/[0.07]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {method === "cheque" ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={chequeNo}
            onChange={(e) => setChequeNo(e.target.value)}
            placeholder="Cheque no."
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
          />
          <input
            type="date"
            value={chequeDate}
            onChange={(e) => setChequeDate(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
          />
        </div>
      ) : null}

      <form
        action={setPurchaseBillPaidAction}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="batchId" value={batchId} />
        <input type="hidden" name="mode" value="amount" />
        <PayHiddens
          method={method}
          chequeNo={chequeNo}
          chequeDate={chequeDate}
          redirectTo={redirectTo}
        />
        <input
          type="number"
          name="amountPaid"
          min={0}
          max={total}
          defaultValue={amountPaid}
          placeholder="Paid"
          aria-label="Amount paid"
          className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:border-pine"
        />
        <AdminSubmit size="sm" variant="secondary">
          Save
        </AdminSubmit>
      </form>

      <div className="flex flex-wrap gap-2">
        {due > 0 ? (
          <form action={setPurchaseBillPaidAction} className="flex-1">
            <input type="hidden" name="batchId" value={batchId} />
            <input type="hidden" name="mode" value="full" />
            <PayHiddens
              method={method}
              chequeNo={chequeNo}
              chequeDate={chequeDate}
              redirectTo={redirectTo}
            />
            <AdminSubmit size="sm" className="w-full">
              Mark settled
            </AdminSubmit>
          </form>
        ) : null}
        {amountPaid > 0 ? (
          <form action={setPurchaseBillPaidAction}>
            <input type="hidden" name="batchId" value={batchId} />
            <input type="hidden" name="mode" value="clear" />
            {redirectTo ? (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            ) : null}
            <AdminSubmit size="sm" variant="secondary">
              Clear
            </AdminSubmit>
          </form>
        ) : null}
      </div>
    </div>
  );
}
