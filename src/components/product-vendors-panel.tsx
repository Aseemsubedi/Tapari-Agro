import Link from "next/link";
import { AdminBtn, AdminCard, AdminCardHeader } from "@/components/admin-ui";
import { marginPercent } from "@/lib/categories";
import { formatNprFromInt } from "@/lib/products";
import { lineDue, paymentLabel } from "@/lib/purchase-payment";
import {
  formatVendorRateHint,
  summarizeProductVendors,
  type ProductVendorCost,
} from "@/lib/vendor-costs";

type PurchaseLot = {
  id: string;
  quantity: number;
  unitCost: number;
  amountPaid?: number;
  paid: boolean;
  billNo: string;
  createdAt: Date;
  vendor: { id: string; name: string; phone: string } | null;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProductVendorsPanel({
  avgCost,
  sellPrice,
  purchases,
}: {
  avgCost: number;
  sellPrice: number;
  purchases: PurchaseLot[];
}) {
  const vendors = summarizeProductVendors(purchases);
  const hint = formatVendorRateHint(vendors);
  const margin = marginPercent(sellPrice, avgCost);
  const unpaidTotal = vendors.reduce((sum, v) => sum + v.unpaidSpend, 0);

  return (
    <div className="space-y-4">
      <AdminCard flush>
        <AdminCardHeader
          title="Suppliers from purchases"
          action={
            <AdminBtn href="/admin/purchases" size="sm" variant="secondary">
              New purchase
            </AdminBtn>
          }
        />

        <div className="grid grid-cols-2 gap-px border-b border-black/[0.06] bg-black/[0.04] sm:grid-cols-4">
          <SummaryCell label="Avg cost" value={formatNprFromInt(avgCost)} />
          <SummaryCell label="Sell price" value={formatNprFromInt(sellPrice)} />
          <SummaryCell label="Margin" value={`${margin}%`} />
          <SummaryCell
            label="Payable"
            value={formatNprFromInt(unpaidTotal)}
            tone={unpaidTotal > 0 ? "warn" : "ok"}
          />
        </div>

        {vendors.length === 0 ? (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink">No suppliers yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-ink/45">
              Vendors are linked only when you record a purchase for this
              product — not set manually.
            </p>
            <div className="mt-3">
              <AdminBtn href="/admin/purchases" size="sm">
                Record purchase
              </AdminBtn>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Vendor</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Bills</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Avg rate
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Last rate
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Last buy</th>
                    <th className="px-4 py-2.5 text-right font-semibold sm:px-5">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <VendorRow key={vendor.id} vendor={vendor} />
                  ))}
                </tbody>
              </table>
            </div>
            {hint ? (
              <p className="border-t border-black/[0.06] px-4 py-2.5 text-[11px] text-ink/45 sm:px-5">
                {hint}. Inventory cost uses weighted average across all lots.
              </p>
            ) : null}
          </>
        )}
      </AdminCard>

      {purchases.length > 0 ? (
        <AdminCard flush>
          <AdminCardHeader
            title="Purchase history"
            action={
              <span className="text-xs font-medium text-ink/45">
                Last {Math.min(purchases.length, 12)} lots
              </span>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                  <th className="px-4 py-2.5 font-semibold sm:px-5">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Vendor</th>
                  <th className="px-3 py-2.5 font-semibold">Bill</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold sm:px-5">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchases.slice(0, 12).map((lot) => {
                  const amount = lot.quantity * lot.unitCost;
                  return (
                    <tr
                      key={lot.id}
                      className="border-b border-black/[0.05] last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink/70 sm:px-5">
                        {formatDate(lot.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-ink">
                        {lot.vendor?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-ink/50">
                        {lot.billNo || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                        {lot.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                        {formatNprFromInt(lot.unitCost)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">
                        {formatNprFromInt(amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right sm:px-5">
                        {(() => {
                          const spend = lot.quantity * lot.unitCost;
                          const paidAmt = lot.paid
                            ? spend
                            : Math.max(0, lot.amountPaid ?? 0);
                          const status = paymentLabel(paidAmt, spend);
                          if (status === "Paid") {
                            return (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Paid
                              </span>
                            );
                          }
                          if (status === "Partial") {
                            return (
                              <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                                Due {formatNprFromInt(lineDue({
                                  quantity: lot.quantity,
                                  unitCost: lot.unitCost,
                                  amountPaid: lot.amountPaid ?? 0,
                                  paid: lot.paid,
                                }))}
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              Unpaid
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-black/[0.06] px-4 py-2.5 text-[11px] text-ink/40 sm:px-5">
            Full bills:{" "}
            <Link
              href="/admin/purchases"
              className="font-semibold text-pine hover:underline"
            >
              Purchases
            </Link>
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="bg-white px-4 py-3 sm:px-5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
        {label}
      </p>
      <p
        className={`mt-0.5 text-base font-bold tabular-nums ${
          tone === "warn"
            ? "text-amber-800"
            : tone === "ok"
              ? "text-emerald-700"
              : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function VendorRow({ vendor }: { vendor: ProductVendorCost }) {
  return (
    <tr className="border-b border-black/[0.05] last:border-b-0">
      <td className="px-4 py-2.5 sm:px-5">
        <p className="font-semibold text-ink">{vendor.name}</p>
        {vendor.phone ? (
          <p className="text-[11px] text-ink/40">{vendor.phone}</p>
        ) : null}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ink/70">
        {vendor.purchaseCount}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ink/70">
        {vendor.totalQty}
      </td>
      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">
        {formatNprFromInt(vendor.avgCost)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
        {formatNprFromInt(vendor.lastCost)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-ink/55">
        {formatDate(vendor.lastAt)}
      </td>
      <td className="px-4 py-2.5 text-right sm:px-5">
        {vendor.unpaidSpend > 0 ? (
          <span className="font-semibold tabular-nums text-amber-800">
            {formatNprFromInt(vendor.unpaidSpend)}
          </span>
        ) : (
          <span className="text-ink/35">—</span>
        )}
      </td>
    </tr>
  );
}
