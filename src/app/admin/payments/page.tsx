import Link from "next/link";
import { paySellerSettlementsAction } from "@/app/actions";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminStat,
  AdminSubmit,
} from "@/components/admin-ui";
import { BillPaymentUpdateForm } from "@/components/bill-payment-update-form";
import { OrderPaymentUpdateForm } from "@/components/order-payment-update-form";
import { prisma } from "@/lib/db";
import { customerLedgerKey } from "@/lib/customers";
import {
  customerWhatsAppHref,
  isCollectMethod,
  orderPaymentDue,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders";
import {
  buildCreditAging,
  creditAgeBucketLabel,
  creditRemindMessage,
  type CreditAgeBucket,
} from "@/lib/payment-ledger";
import { formatNprFromInt } from "@/lib/products";
import { groupPurchaseBills } from "@/lib/purchase-bills";
import {
  formatPurchasePay,
  isPurchasePayMethod,
} from "@/lib/purchase-payment";

type Props = {
  searchParams: Promise<{ view?: string; q?: string; age?: string }>;
};

type Receivable = {
  kind: "collect";
  id: string;
  party: string;
  phone: string;
  ref: string;
  createdAt: Date;
  total: number;
  paid: number;
  due: number;
  status: string;
  channel: string;
  method: string;
  paymentNote: string;
  customerKey: string;
};

type Payable = {
  kind: "pay";
  id: string;
  batchId: string;
  party: string;
  vendorId: string | null;
  ref: string;
  createdAt: Date;
  total: number;
  paid: number;
  due: number;
  status: string;
  payMethod: string;
  chequeNo: string;
  chequeDate: Date | null;
};

function statusBadge(status: string) {
  const settled = status === "Paid" || status === "Settled";
  const partial = status === "Partial";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        settled
          ? "bg-emerald-50 text-emerald-700"
          : partial
            ? "bg-sky-50 text-sky-800"
            : "bg-amber-50 text-amber-900"
      }`}
    >
      {status}
    </span>
  );
}

function eventMethodLabel(method: string, chequeNo: string, chequeDate: Date | null) {
  if (method === "clear") return "Cleared";
  if (method === "cheque" || method === "bank" || method === "cash") {
    return formatPurchasePay(method, chequeNo, chequeDate) || method;
  }
  return paymentMethodLabel(method) || method || "—";
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const {
    view: viewParam = "all",
    q = "",
    age: ageParam = "all",
  } = await searchParams;
  const view =
    viewParam === "collect" ||
    viewParam === "pay" ||
    viewParam === "sellers" ||
    viewParam === "aging" ||
    viewParam === "ledger" ||
    viewParam === "all"
      ? viewParam
      : "all";
  const ageFilter =
    ageParam === "0-7" ||
    ageParam === "8-15" ||
    ageParam === "16-30" ||
    ageParam === "31+"
      ? (ageParam as CreditAgeBucket)
      : "all";
  const needle = q.trim().toLowerCase();

  const [orders, purchases, events, settlements] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        phone: true,
        total: true,
        amountPaid: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentNote: true,
        channel: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.stockPurchase.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        batchId: true,
        billNo: true,
        vendorId: true,
        quantity: true,
        unitCost: true,
        amountPaid: true,
        paid: true,
        payMethod: true,
        chequeNo: true,
        chequeDate: true,
        createdAt: true,
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.paymentEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.sellerSettlement.findMany({
      where: { paid: false },
      orderBy: { createdAt: "asc" },
      include: {
        vendor: { select: { id: true, name: true, phone: true } },
        order: { select: { id: true, customerName: true } },
      },
    }),
  ]);

  const receivables: Receivable[] = [];
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const due = orderPaymentDue(order);
    if (due <= 0) continue;
    const paid =
      order.paymentStatus === "paid"
        ? order.total
        : Math.max(0, order.amountPaid);
    receivables.push({
      kind: "collect",
      id: order.id,
      party: order.customerName,
      phone: order.phone,
      ref: `#${order.id.slice(0, 8)}`,
      createdAt: order.createdAt,
      total: order.total,
      paid,
      due,
      status: paymentStatusLabel(order.paymentStatus),
      channel: order.channel,
      method: order.paymentMethod,
      paymentNote: order.paymentNote,
      customerKey: customerLedgerKey(order.phone, order.customerName),
    });
  }

  const purchaseBills = groupPurchaseBills(purchases);
  const payables: Payable[] = [];
  for (const bill of purchaseBills) {
    if (bill.due <= 0) continue;
    payables.push({
      kind: "pay",
      id: bill.key,
      batchId: bill.batchId,
      party: bill.vendorName ?? "No vendor",
      vendorId: bill.vendorId,
      ref: bill.billNo ? `Batch ${bill.billNo}` : "Purchase",
      createdAt: bill.createdAt,
      total: bill.total,
      paid: bill.amountPaid,
      due: bill.due,
      status: bill.status,
      payMethod: bill.payMethod,
      chequeNo: bill.chequeNo,
      chequeDate: bill.chequeDate,
    });
  }

  receivables.sort(
    (a, b) => b.due - a.due || b.createdAt.getTime() - a.createdAt.getTime(),
  );
  payables.sort(
    (a, b) => b.due - a.due || b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const agingAll = buildCreditAging(orders, customerLedgerKey);
  const aging =
    ageFilter === "all"
      ? agingAll
      : agingAll.filter((r) => r.bucket === ageFilter);

  const agingTotals: Record<CreditAgeBucket, { count: number; due: number }> = {
    "0-7": { count: 0, due: 0 },
    "8-15": { count: 0, due: 0 },
    "16-30": { count: 0, due: 0 },
    "31+": { count: 0, due: 0 },
  };
  for (const row of agingAll) {
    agingTotals[row.bucket].count += 1;
    agingTotals[row.bucket].due += row.due;
  }

  const collectTotal = receivables.reduce((s, r) => s + r.due, 0);
  const payTotal = payables.reduce((s, p) => s + p.due, 0);
  const sellerDueTotal = settlements.reduce(
    (s, r) => s + Math.max(0, r.amount - r.amountPaid),
    0,
  );
  const overdue31 = agingTotals["31+"].due;

  function matchQ(party: string, ref: string, phone = "") {
    if (!needle) return true;
    return (
      party.toLowerCase().includes(needle) ||
      ref.toLowerCase().includes(needle) ||
      phone.toLowerCase().includes(needle)
    );
  }

  const sellerGroups = new Map<
    string,
    {
      vendorId: string;
      name: string;
      phone: string;
      due: number;
      rows: typeof settlements;
    }
  >();
  for (const row of settlements) {
    const due = Math.max(0, row.amount - row.amountPaid);
    if (due <= 0) continue;
    const existing = sellerGroups.get(row.vendorId);
    if (existing) {
      existing.due += due;
      existing.rows.push(row);
    } else {
      sellerGroups.set(row.vendorId, {
        vendorId: row.vendorId,
        name: row.vendor.name,
        phone: row.vendor.phone,
        due,
        rows: [row],
      });
    }
  }
  const sellerPayables = [...sellerGroups.values()].sort(
    (a, b) => b.due - a.due,
  );
  const shownSellers = sellerPayables.filter((g) =>
    matchQ(g.name, g.rows.map((r) => r.productName).join(" "), g.phone),
  );

  const shownCollect = receivables.filter((r) =>
    matchQ(r.party, r.ref, r.phone),
  );
  const shownPay = payables.filter((p) => matchQ(p.party, p.ref));
  const shownAging = aging.filter((r) =>
    matchQ(r.customerName, `#${r.orderId.slice(0, 8)}`, r.phone),
  );
  const shownEvents = events.filter((e) => {
    if (!needle) return true;
    return (
      e.partyName.toLowerCase().includes(needle) ||
      e.refLabel.toLowerCase().includes(needle) ||
      e.partyPhone.toLowerCase().includes(needle) ||
      e.method.toLowerCase().includes(needle)
    );
  });

  const redirectBase =
    view === "all" ? "/admin/payments" : `/admin/payments?view=${view}`;

  function tabHref(next: string, age?: string) {
    const params = new URLSearchParams();
    if (next !== "all") params.set("view", next);
    if (age && age !== "all") params.set("age", age);
    if (q.trim()) params.set("q", q.trim());
    const s = params.toString();
    return s ? `/admin/payments?${s}` : "/admin/payments";
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/55">
        One money desk — collect from customers, pay purchase bills, settle
        sellers.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="To collect"
          value={formatNprFromInt(collectTotal)}
          hint={`${receivables.length} customer bill${receivables.length === 1 ? "" : "s"}`}
          href={tabHref("collect")}
          tone={collectTotal > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="Pay purchases"
          value={formatNprFromInt(payTotal)}
          hint={`${payables.length} bill${payables.length === 1 ? "" : "s"}`}
          href={tabHref("pay")}
          tone={payTotal > 0 ? "warn" : "default"}
        />
        <AdminStat
          label="Pay sellers"
          value={formatNprFromInt(sellerDueTotal)}
          hint={`${settlements.length} open`}
          href={tabHref("sellers")}
          tone={sellerDueTotal > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="31+ days overdue"
          value={formatNprFromInt(overdue31)}
          hint={`${agingTotals["31+"].count} bill${agingTotals["31+"].count === 1 ? "" : "s"}`}
          href={tabHref("aging", "31+")}
          tone={overdue31 > 0 ? "warn" : "ok"}
        />
      </div>

      <AdminCard flush>
        <div className="flex flex-wrap items-center gap-1 border-b border-black/[0.06] bg-[#fafbfc] px-2 py-2">
          {(
            [
              {
                id: "all",
                label: "All dues",
                count: receivables.length + payables.length + settlements.length,
              },
              { id: "collect", label: "Collect", count: receivables.length },
              { id: "pay", label: "Purchases", count: payables.length },
              { id: "sellers", label: "Sellers", count: settlements.length },
              { id: "aging", label: "Aging", count: agingAll.length },
              { id: "ledger", label: "Ledger", count: events.length },
            ] as const
          ).map((tab) => {
            const active = view === tab.id;
            return (
              <Link
                key={tab.id}
                href={tabHref(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-sm ${
                  active
                    ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-black/5"
                    : "font-medium text-ink/55 hover:text-ink"
                }`}
              >
                {tab.label}{" "}
                <span className="text-ink/35">{tab.count}</span>
              </Link>
            );
          })}
        </div>

        <form method="get" className="border-b border-black/[0.06] p-3">
          {view !== "all" ? (
            <input type="hidden" name="view" value={view} />
          ) : null}
          {ageFilter !== "all" ? (
            <input type="hidden" name="age" value={ageFilter} />
          ) : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, bill, phone…"
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-pine sm:max-w-sm"
          />
        </form>

        {(view === "all" || view === "collect") && (
          <section>
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-ink">
                Collect from customers
              </h2>
              <span className="text-sm font-semibold tabular-nums text-amber-900">
                {formatNprFromInt(
                  shownCollect.reduce((s, r) => s + r.due, 0),
                )}
              </span>
            </div>
            {shownCollect.length === 0 ? (
              <AdminEmpty
                title="Nothing to collect"
                body="Credit and partial bills show here. Start a counter sale if someone is buying."
                action={
                  <AdminBtn href="/admin/sales" size="sm">
                    Offline sale
                  </AdminBtn>
                }
              />
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {shownCollect.map((row) => (
                  <li key={row.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-ink sm:text-lg">
                            {row.party}
                          </p>
                          {statusBadge(row.status)}
                        </div>
                        <p className="mt-1 font-display text-xl font-bold tabular-nums tracking-tight text-amber-900 sm:text-2xl">
                          {formatNprFromInt(row.due)}
                          <span className="ml-1.5 text-sm font-semibold text-ink/40">
                            due
                          </span>
                        </p>
                        <p className="mt-1.5 text-sm text-ink/50">
                          <Link
                            href={`/admin/orders/${row.id}`}
                            className="font-semibold text-pine hover:underline"
                          >
                            {row.ref}
                          </Link>
                          {" · "}
                          {row.channel === "offline" ? "Offline" : "Online"}
                          {" · "}
                          {paymentMethodLabel(row.method, row.paymentNote)}
                          {" · "}
                          {row.createdAt.toLocaleString("en-NP", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                        <p className="mt-1 text-sm text-ink/45">
                          Bill {formatNprFromInt(row.total)}
                          {row.paid > 0
                            ? ` · Paid ${formatNprFromInt(row.paid)}`
                            : ""}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-3 text-sm font-semibold">
                          <Link
                            href={`/admin/customers/${encodeURIComponent(row.customerKey)}`}
                            className="text-pine hover:underline"
                          >
                            Customer
                          </Link>
                          {row.phone ? (
                            <>
                              <a
                                href={`tel:${row.phone.replace(/\s+/g, "")}`}
                                className="text-ink/55 hover:text-ink"
                              >
                                Call
                              </a>
                              <a
                                href={customerWhatsAppHref(
                                  row.phone,
                                  `Namaste ${row.party}, Tapari Agro — ${row.ref} due ${formatNprFromInt(row.due)}.`,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ink/55 hover:text-ink"
                              >
                                WhatsApp
                              </a>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <OrderPaymentUpdateForm
                        orderId={row.id}
                        amountPaid={row.paid}
                        total={row.total}
                        defaultMethod={
                          isCollectMethod(row.method) ? row.method : "cash"
                        }
                        defaultNote={row.paymentNote}
                        redirectTo={redirectBase}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {(view === "all" || view === "pay") && (
          <section
            className={
              view === "all" ? "border-t border-black/[0.06]" : undefined
            }
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-ink">Pay suppliers</h2>
              <span className="text-sm font-semibold tabular-nums text-ink">
                {formatNprFromInt(shownPay.reduce((s, r) => s + r.due, 0))}
              </span>
            </div>
            {shownPay.length === 0 ? (
              <AdminEmpty
                title="No supplier dues"
                body="Record a purchase bill first — then pay it here or on the bill."
                action={
                  <AdminBtn href="/admin/purchases?view=new" size="sm">
                    New bill
                  </AdminBtn>
                }
              />
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {shownPay.map((row) => (
                  <li key={row.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-ink sm:text-lg">
                            {row.vendorId ? (
                              <Link
                                href={`/admin/suppliers/${row.vendorId}`}
                                className="hover:underline"
                              >
                                {row.party}
                              </Link>
                            ) : (
                              row.party
                            )}
                          </p>
                          {statusBadge(row.status)}
                        </div>
                        <p className="mt-1 font-display text-xl font-bold tabular-nums tracking-tight text-ink sm:text-2xl">
                          {formatNprFromInt(row.due)}
                          <span className="ml-1.5 text-sm font-semibold text-ink/40">
                            due
                          </span>
                        </p>
                        <p className="mt-1.5 text-sm text-ink/50">
                          {row.ref}
                          {" · "}
                          {row.createdAt.toLocaleString("en-NP", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {row.paid > 0 && row.payMethod
                            ? ` · ${formatPurchasePay(row.payMethod, row.chequeNo, row.chequeDate)}`
                            : ""}
                        </p>
                        <p className="mt-1 text-sm text-ink/45">
                          Bill {formatNprFromInt(row.total)}
                          {row.paid > 0
                            ? ` · Paid ${formatNprFromInt(row.paid)}`
                            : ""}
                        </p>
                      </div>
                      {row.batchId ? (
                        <BillPaymentUpdateForm
                          batchId={row.batchId}
                          amountPaid={row.paid}
                          total={row.total}
                          defaultMethod={
                            isPurchasePayMethod(row.payMethod)
                              ? row.payMethod
                              : "cash"
                          }
                          defaultChequeNo={row.chequeNo}
                          defaultChequeDate={
                            row.chequeDate
                              ? row.chequeDate.toISOString().slice(0, 10)
                              : ""
                          }
                          redirectTo={redirectBase}
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {(view === "all" || view === "sellers") && (
          <section
            className={
              view === "all" ? "border-t border-black/[0.06]" : undefined
            }
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-ink">
                Pay sellers
              </h2>
              <span className="text-sm font-semibold tabular-nums text-pine">
                {formatNprFromInt(sellerDueTotal)}
              </span>
            </div>
            {shownSellers.length === 0 ? (
              <AdminEmpty
                title="No seller settlements"
                body="Complete digital / hybrid sales to create seller payouts."
                action={
                  <AdminBtn
                    href="/admin/inventory?view=digital"
                    size="sm"
                    variant="secondary"
                  >
                    Digital inventory
                  </AdminBtn>
                }
              />
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {shownSellers.map((group) => (
                  <li key={group.vendorId} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-ink sm:text-lg">
                          {group.name}
                        </p>
                        <p className="mt-1 font-display text-xl font-bold tabular-nums tracking-tight text-pine sm:text-2xl">
                          {formatNprFromInt(group.due)}
                        </p>
                        <p className="mt-1.5 text-sm text-ink/50">
                          {group.rows.length} line
                          {group.rows.length === 1 ? "" : "s"} ·{" "}
                          {group.rows
                            .slice(0, 3)
                            .map((r) => `${r.productName}×${r.quantity}`)
                            .join(", ")}
                          {group.rows.length > 3
                            ? ` +${group.rows.length - 3}`
                            : ""}
                        </p>
                      </div>
                      <form
                        action={paySellerSettlementsAction}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="vendorId"
                          value={group.vendorId}
                        />
                        <input
                          type="hidden"
                          name="settlementIds"
                          value={group.rows.map((r) => r.id).join(",")}
                        />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value="/admin/payments?view=sellers"
                        />
                        <select
                          name="method"
                          defaultValue="cash"
                          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                          <option value="bank_qr">QR</option>
                          <option value="other">Other</option>
                        </select>
                        <AdminSubmit size="sm">
                          Pay {formatNprFromInt(group.due)}
                        </AdminSubmit>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {view === "aging" ? (
          <section>
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-ink">Credit aging</h2>
              <span className="text-sm font-semibold tabular-nums text-amber-900">
                {formatNprFromInt(agingAll.reduce((s, r) => s + r.due, 0))}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 border-b border-black/[0.06] px-3 py-2.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "0-7", label: "0–7" },
                  { id: "8-15", label: "8–15" },
                  { id: "16-30", label: "16–30" },
                  { id: "31+", label: "31+" },
                ] as const
              ).map((tab) => {
                const active = ageFilter === tab.id;
                const due =
                  tab.id === "all"
                    ? agingAll.reduce((s, r) => s + r.due, 0)
                    : agingTotals[tab.id].due;
                return (
                  <Link
                    key={tab.id}
                    href={tabHref("aging", tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                      active
                        ? "bg-pine text-white"
                        : "text-ink/50 hover:bg-black/[0.04] hover:text-ink"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1.5 opacity-80">
                      {formatNprFromInt(due)}
                    </span>
                  </Link>
                );
              })}
            </div>
            {shownAging.length === 0 ? (
              <AdminEmpty
                title="No credit in this bucket"
                body="Open customer dues appear here by how old the bill is."
              />
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {shownAging.map((row) => (
                  <li key={row.orderId} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-ink sm:text-lg">
                            {row.customerName}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              row.bucket === "31+"
                                ? "bg-red-50 text-red-800"
                                : row.bucket === "16-30"
                                  ? "bg-amber-50 text-amber-900"
                                  : "bg-stone-100 text-ink/60"
                            }`}
                          >
                            {row.days}d · {creditAgeBucketLabel(row.bucket)}
                          </span>
                        </div>
                        <p className="mt-1 font-display text-xl font-bold tabular-nums tracking-tight text-amber-900 sm:text-2xl">
                          {formatNprFromInt(row.due)}
                          <span className="ml-1.5 text-sm font-semibold text-ink/40">
                            due
                          </span>
                        </p>
                        <p className="mt-1.5 text-sm text-ink/50">
                          <Link
                            href={`/admin/orders/${row.orderId}`}
                            className="font-semibold text-pine hover:underline"
                          >
                            #{row.orderId.slice(0, 8)}
                          </Link>
                          {" · "}
                          {row.createdAt.toLocaleDateString("en-NP", {
                            dateStyle: "medium",
                          })}
                          {" · "}
                          {row.channel === "offline" ? "Offline" : "Online"}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-3 text-sm font-semibold">
                          <Link
                            href={`/admin/customers/${encodeURIComponent(row.customerKey)}`}
                            className="text-pine hover:underline"
                          >
                            Customer
                          </Link>
                          {row.phone ? (
                            <a
                              href={customerWhatsAppHref(
                                row.phone,
                                creditRemindMessage(row),
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-pine px-3 py-1.5 text-white"
                            >
                              WhatsApp remind
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <OrderPaymentUpdateForm
                        orderId={row.orderId}
                        amountPaid={row.paid}
                        total={row.total}
                        defaultMethod="cash"
                        redirectTo={tabHref("aging", ageFilter)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {view === "ledger" ? (
          <section>
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-ink">
                Payment ledger
              </h2>
              <span className="text-sm text-ink/45">
                Latest {shownEvents.length}
              </span>
            </div>
            {shownEvents.length === 0 ? (
              <AdminEmpty
                title="No payment events yet"
                body="Collections and supplier settlements are logged here automatically."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-sm text-ink/45">
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Party</th>
                      <th className="px-4 py-3 font-medium">Ref</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Amount
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {shownEvents.map((e) => (
                      <tr key={e.id} className="hover:bg-[#f7f8f9]">
                        <td className="px-4 py-3.5 text-ink/55">
                          {e.createdAt.toLocaleString("en-NP", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              e.direction === "collect"
                                ? "bg-amber-50 text-amber-800"
                                : e.direction === "writeoff"
                                  ? "bg-red-50 text-red-700"
                                  : e.direction === "settle"
                                    ? "bg-pine/10 text-pine"
                                    : "bg-sky-50 text-sky-800"
                            }`}
                          >
                            {e.direction === "collect"
                              ? "In"
                              : e.direction === "writeoff"
                                ? "Write-off"
                                : e.direction === "settle"
                                  ? "Settle"
                                  : "Out"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium">{e.partyName || "—"}</p>
                          {e.partyPhone ? (
                            <p className="text-xs text-ink/40">
                              {e.partyPhone}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5">
                          {e.orderId ? (
                            <Link
                              href={`/admin/orders/${e.orderId}`}
                              className="font-medium text-pine hover:underline"
                            >
                              {e.refLabel || `#${e.orderId.slice(0, 8)}`}
                            </Link>
                          ) : e.batchId ? (
                            <Link
                              href="/admin/purchases"
                              className="font-medium text-pine hover:underline"
                            >
                              {e.refLabel || "Purchase"}
                            </Link>
                          ) : (
                            e.refLabel || "—"
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-ink/60">
                          {eventMethodLabel(e.method, e.chequeNo, e.chequeDate)}
                          {e.note ? (
                            <span className="mt-0.5 block text-xs text-ink/40">
                              {e.note}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 text-right text-base font-semibold tabular-nums">
                          {e.amount > 0
                            ? formatNprFromInt(e.amount)
                            : e.method === "clear"
                              ? "Clear"
                              : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-ink/55">
                          {formatNprFromInt(e.balanceAfter)}
                          <span className="mt-0.5 block text-xs text-ink/35">
                            was {formatNprFromInt(e.previousPaid)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </AdminCard>
    </div>
  );
}
