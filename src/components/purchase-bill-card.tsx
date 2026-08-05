import Link from "next/link";
import { BillPaymentUpdateForm } from "@/components/bill-payment-update-form";
import type { PurchaseBill } from "@/lib/purchase-bills";
import { formatNprFromInt } from "@/lib/products";
import {
  formatPurchasePay,
  isPurchasePayMethod,
} from "@/lib/purchase-payment";

function expiryClass(date: Date) {
  const now = Date.now();
  if (date.getTime() < now) return "font-semibold text-red-600";
  if (date.getTime() - now < 30 * 24 * 60 * 60 * 1000) {
    return "font-semibold text-amber-700";
  }
  return "text-ink/40";
}

function StatusPill({ status }: { status: PurchaseBill["status"] }) {
  if (status === "Settled") {
    return (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        Settled
      </span>
    );
  }
  if (status === "Reserved") {
    return (
      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
        Reserved
      </span>
    );
  }
  if (status === "Partial") {
    return (
      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
        Partial
      </span>
    );
  }
  return (
    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
      Pending
    </span>
  );
}

export function PurchaseBillCard({
  bill,
  redirectTo,
  showVendor = true,
}: {
  bill: PurchaseBill;
  redirectTo: string;
  showVendor?: boolean;
}) {
  const payLabel =
    bill.amountPaid > 0 && bill.payMethod
      ? formatPurchasePay(bill.payMethod, bill.chequeNo, bill.chequeDate)
      : null;

  return (
    <li className="px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex flex-wrap items-center gap-1.5 text-sm">
          {showVendor ? (
            bill.vendorId ? (
              <Link
                href={`/admin/suppliers/${bill.vendorId}`}
                className="font-semibold text-ink hover:underline"
              >
                {bill.vendorName ?? "Vendor"}
              </Link>
            ) : (
              <span className="font-semibold text-ink">
                {bill.vendorName ?? "No vendor"}
              </span>
            )
          ) : (
            <span className="font-semibold text-ink">
              {bill.billNo ? `Batch ${bill.billNo}` : "Purchase bill"}
            </span>
          )}
          {showVendor ? (
            (() => {
              const batches = [
                ...new Set(
                  bill.lines
                    .map((l) => l.billNo?.trim())
                    .filter((b): b is string => Boolean(b)),
                ),
              ];
              if (batches.length === 0) return null;
              return (
                <span className="text-[11px] font-bold text-pine">
                  {batches.length === 1
                    ? `Batch ${batches[0]}`
                    : `${batches.length} batches`}
                </span>
              );
            })()
          ) : null}
          <StatusPill status={bill.status} />
          <span className="text-[11px] text-ink/35">
            {bill.createdAt.toLocaleDateString("en-NP", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {bill.note ? ` · ${bill.note}` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12px] tabular-nums">
          <span className="text-ink/50">
            {bill.status === "Reserved" ? "Payout value" : "Total"}{" "}
            <span className="font-semibold text-ink">
              {formatNprFromInt(bill.total)}
            </span>
          </span>
          {bill.status === "Reserved" ? (
            <span className="text-sky-800">No payment · settle on sale</span>
          ) : (
            <>
              <span className="text-emerald-700">
                Paid {formatNprFromInt(bill.amountPaid)}
                {payLabel ? (
                  <span className="text-ink/35"> · {payLabel}</span>
                ) : null}
              </span>
              {bill.due > 0 ? (
                <span className="font-semibold text-amber-800">
                  Due {formatNprFromInt(bill.due)}
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>

      <ul className="mt-1.5 space-y-0.5 border-l border-black/[0.06] pl-2.5">
        {bill.lines.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0 text-[12px]"
          >
            <span className="min-w-0 truncate text-ink/80">
              {row.product.id ? (
                <Link
                  href={`/admin/products/${row.product.id}`}
                  className="hover:text-pine hover:underline"
                >
                  {row.product.name}
                </Link>
              ) : (
                row.product.name || "Product"
              )}
              {(row.stockKind ?? "owned") === "digital" ? (
                <span className="ml-1 rounded bg-sky-50 px-1 py-px text-[9px] font-bold uppercase text-sky-700">
                  Digi
                </span>
              ) : null}
              {row.billNo ? (
                <span className="ml-1 text-ink/40">· batch {row.billNo}</span>
              ) : null}
              <span className="text-ink/35">
                {" "}
                · {row.quantity} {row.product.unit}
                {" · "}
                {formatNprFromInt(row.unitCost)}
              </span>
              {row.expiresAt ? (
                <span className={`ml-1 ${expiryClass(row.expiresAt)}`}>
                  exp{" "}
                  {row.expiresAt.toLocaleDateString("en-NP", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-ink">
              {formatNprFromInt(row.quantity * row.unitCost)}
            </span>
          </li>
        ))}
      </ul>

      {bill.batchId && bill.due > 0 ? (
        <details className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/40 open:bg-amber-50/60">
          <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-semibold text-amber-900 marker:content-none [&::-webkit-details-marker]:hidden">
            Record payment · {formatNprFromInt(bill.due)} due
          </summary>
          <div className="border-t border-amber-200/60 px-2.5 py-2.5">
            <BillPaymentUpdateForm
              batchId={bill.batchId}
              amountPaid={bill.amountPaid}
              total={bill.total}
              defaultMethod={
                isPurchasePayMethod(bill.payMethod) ? bill.payMethod : "cash"
              }
              defaultChequeNo={bill.chequeNo}
              defaultChequeDate={
                bill.chequeDate
                  ? bill.chequeDate.toISOString().slice(0, 10)
                  : ""
              }
              redirectTo={redirectTo}
            />
          </div>
        </details>
      ) : null}
    </li>
  );
}
