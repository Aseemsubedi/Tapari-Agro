import Link from "next/link";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
} from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { customerLedgerKey } from "@/lib/customers";
import {
  customerWhatsAppHref,
  orderPaymentDue,
} from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  searchParams: Promise<{ q?: string; view?: string }>;
};

type CustomerRow = {
  key: string;
  phone: string;
  name: string;
  orders: number;
  spent: number;
  paid: number;
  due: number;
  creditBills: number;
  lastOrderAt: Date;
  lastOrderId: string;
};

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { q = "", view: viewParam = "all" } = await searchParams;
  const view = viewParam === "credit" ? "credit" : "all";

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerName: true,
      phone: true,
      total: true,
      amountPaid: true,
      paymentStatus: true,
      status: true,
      channel: true,
      createdAt: true,
    },
  });

  const map = new Map<string, CustomerRow>();
  for (const order of orders) {
    const key = customerLedgerKey(order.phone, order.customerName);
    const active = order.status !== "cancelled";
    const due = active ? orderPaymentDue(order) : 0;
    const paidAmt = active
      ? order.paymentStatus === "paid"
        ? order.total
        : Math.max(0, order.amountPaid)
      : 0;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        phone: order.phone,
        name: order.customerName,
        orders: 1,
        spent: active ? order.total : 0,
        paid: paidAmt,
        due,
        creditBills: due > 0 ? 1 : 0,
        lastOrderAt: order.createdAt,
        lastOrderId: order.id,
      });
    } else {
      existing.orders += 1;
      if (active) {
        existing.spent += order.total;
        existing.paid += paidAmt;
        existing.due += due;
        if (due > 0) existing.creditBills += 1;
      }
      if (order.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = order.createdAt;
        existing.lastOrderId = order.id;
        existing.name = order.customerName;
        if (order.phone) existing.phone = order.phone;
      }
    }
  }

  let customers = [...map.values()];
  if (view === "credit") {
    customers = customers.filter((c) => c.due > 0);
    customers.sort((a, b) => b.due - a.due);
  } else {
    customers.sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
  }

  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    const phoneNeedle = needle.replace(/\s+/g, "");
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.phone.replace(/\s+/g, "").includes(phoneNeedle),
    );
  }

  const creditCustomers = [...map.values()].filter((c) => c.due > 0);
  const creditDueTotal = creditCustomers.reduce((s, c) => s + c.due, 0);

  function href(next: { view?: string; q?: string }) {
    const params = new URLSearchParams();
    const v = next.view ?? view;
    const query = next.q ?? q;
    if (v !== "all") params.set("view", v);
    if (query.trim()) params.set("q", query.trim());
    const s = params.toString();
    return s ? `/admin/customers?${s}` : "/admin/customers";
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/55">
        Customer history from sales — for settling credit and supplier dues use{" "}
        <Link href="/admin/payments" className="font-semibold text-pine hover:underline">
          Payments / Due
        </Link>
        .
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
            Customers
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-ink">
            {map.size}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800/70">
            On credit
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-amber-900">
            {creditCustomers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800/70">
            Total due
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-amber-900">
            {formatNprFromInt(creditDueTotal)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {[
          { value: "all", label: "All customers" },
          { value: "credit", label: `Credit due (${creditCustomers.length})` },
        ].map((tab) => {
          const active = view === tab.value;
          return (
            <Link
              key={tab.value}
              href={href({ view: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active ? "bg-pine/10 text-pine" : "text-ink/50 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex gap-2">
        {view !== "all" ? (
          <input type="hidden" name="view" value={view} />
        ) : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or phone…"
          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-pine"
        />
        <button
          type="submit"
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold shadow-sm"
        >
          Search
        </button>
      </form>

      <AdminCard flush>
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
              <tr>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium text-right">Bills</th>
                <th className="px-4 py-2.5 font-medium text-right">Spent</th>
                <th className="px-4 py-2.5 font-medium text-right">Paid</th>
                <th className="px-4 py-2.5 font-medium text-right">Credit due</th>
                <th className="px-4 py-2.5 font-medium">Last bill</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {customers.map((c) => (
                <tr key={c.key} className="hover:bg-[#f7f8f9]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(c.key)}`}
                      className="font-medium text-pine hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-ink/45">
                      {c.phone || "No phone"}
                    </div>
                    {c.creditBills > 0 ? (
                      <span className="mt-1 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {c.creditBills} credit bill
                        {c.creditBills === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.orders}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatNprFromInt(c.spent)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {formatNprFromInt(c.paid)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      c.due > 0 ? "text-amber-800" : "text-ink/35"
                    }`}
                  >
                    {c.due > 0 ? formatNprFromInt(c.due) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${c.lastOrderId}`}
                      className="text-pine hover:underline"
                    >
                      #{c.lastOrderId.slice(0, 8)}
                    </Link>
                    <div className="text-xs text-ink/40">
                      {c.lastOrderAt.toLocaleDateString("en-NP")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {c.due > 0 ? (
                        <Link
                          href={`/admin/customers/${encodeURIComponent(c.key)}/invoice`}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900"
                        >
                          Invoice
                        </Link>
                      ) : null}
                      {c.phone ? (
                        <>
                          <a
                            href={`tel:${c.phone.replace(/\s+/g, "")}`}
                            className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold"
                          >
                            Call
                          </a>
                          <a
                            href={customerWhatsAppHref(
                              c.phone,
                              c.due > 0
                                ? `Namaste ${c.name}, Tapari Agro here. Reminder: credit due Rs ${c.due}.`
                                : `Namaste ${c.name}, Tapari Agro here.`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold"
                          >
                            WA
                          </a>
                        </>
                      ) : c.due <= 0 ? (
                        <span className="text-xs text-ink/35">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <AdminEmpty
                      title={
                        view === "credit"
                          ? "No credit dues"
                          : "No customers yet"
                      }
                      body={
                        view === "credit"
                          ? "Customers with unpaid or partial offline bills will show here."
                          : "Customers appear automatically after the first order or offline sale."
                      }
                      action={
                        view === "credit" ? (
                          <AdminBtn href="/admin/sales" size="sm">
                            Offline sale
                          </AdminBtn>
                        ) : (
                          <AdminBtn href="/admin/sales" size="sm">
                            Offline sale
                          </AdminBtn>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
