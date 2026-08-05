import Link from "next/link";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
} from "@/components/admin-ui";
import {
  aggregateProductSales,
  analysisRangeLabel,
  analysisRangeStart,
  parseAnalysisRange,
  type AnalysisRange,
} from "@/lib/analysis";
import { prisma } from "@/lib/db";
import { billEconomics, paymentMethodLabel } from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  searchParams: Promise<{
    channel?: string;
    range?: string;
    q?: string;
    view?: string;
  }>;
};

export default async function AdminAnalysisPage({ searchParams }: Props) {
  const {
    channel: channelParam = "all",
    range: rangeParam,
    q = "",
    view: viewParam = "bills",
  } = await searchParams;

  const range = parseAnalysisRange(rangeParam);
  const view = viewParam === "products" ? "products" : "bills";
  const channelFilter =
    channelParam === "online" || channelParam === "offline"
      ? channelParam
      : null;
  const since = analysisRangeStart(range);

  const orders = await prisma.order.findMany({
    where: {
      AND: [
        { status: { not: "cancelled" } },
        since ? { createdAt: { gte: since } } : {},
        channelFilter ? { channel: channelFilter } : {},
        q
          ? {
              OR: [
                { customerName: { contains: q } },
                { phone: { contains: q } },
                { id: { contains: q } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: range === "all" ? 500 : 300,
    include: { items: true },
  });

  const totals = orders.reduce(
    (acc, order) => {
      const eco = billEconomics(order.items, {
        discountAmount: order.discountAmount ?? 0,
        deliveryFee: order.deliveryFee ?? 0,
      });
      acc.revenue += eco.revenue;
      acc.cost += eco.cost;
      acc.profit += eco.profit;
      acc.bills += 1;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, bills: 0 },
  );

  const marginPct =
    totals.revenue > 0
      ? Math.round((totals.profit / totals.revenue) * 100)
      : 0;

  const productRows = aggregateProductSales(
    orders.flatMap((o) => o.items),
  ).slice(0, 40);

  function href(next: {
    channel?: string;
    range?: AnalysisRange;
    q?: string;
    view?: string;
  }) {
    const params = new URLSearchParams();
    const ch = next.channel ?? channelParam;
    const r = next.range ?? range;
    const query = next.q ?? q;
    const v = next.view ?? view;
    if (ch !== "all") params.set("channel", ch);
    if (r !== "30d") params.set("range", r);
    if (query.trim()) params.set("q", query.trim());
    if (v !== "bills") params.set("view", v);
    const s = params.toString();
    return s ? `/admin/profits?${s}` : "/admin/profits";
  }

  const ranges: { value: AnalysisRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "all", label: "All time" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">
            Analysis
          </h2>
          <p className="mt-0.5 text-sm text-ink/50">
            Sales, cost, and profit · {analysisRangeLabel(range)}
            {channelFilter ? ` · ${channelFilter}` : ""}. Digital lines use
            seller payout as cost.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminBtn href="/admin/products" variant="secondary" size="sm">
            Products
          </AdminBtn>
          <AdminBtn href="/admin/sales" size="sm">
            Offline sale
          </AdminBtn>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ranges.map((r) => {
          const active = range === r.value;
          return (
            <Link
              key={r.value}
              href={href({ range: r.value })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-pine text-white"
                  : "border border-black/10 bg-white text-ink/60 hover:text-ink"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
            Bills
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {totals.bills}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
            Sales
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {formatNprFromInt(totals.revenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
            Cost of goods
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {formatNprFromInt(totals.cost)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-800/70">
            Profit
          </p>
          <p
            className={`mt-1 font-display text-2xl font-bold tabular-nums ${
              totals.profit >= 0 ? "text-emerald-900" : "text-red-700"
            }`}
          >
            {formatNprFromInt(totals.profit)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
            Margin
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {marginPct}%
          </p>
        </div>
      </div>

      <AdminCard flush>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-2 py-2">
          <div className="flex flex-wrap gap-1">
            {[
              { value: "bills", label: "By bill" },
              { value: "products", label: "By product" },
            ].map((tab) => {
              const active = view === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={href({ view: tab.value })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? "bg-pine/10 text-pine"
                      : "text-ink/50 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { value: "all", label: "All" },
              { value: "online", label: "Online" },
              { value: "offline", label: "Offline" },
            ].map((tab) => {
              const active = channelParam === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={href({ channel: tab.value })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? "bg-pine/10 text-pine"
                      : "text-ink/50 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {view === "bills" ? (
          <>
            <form
              method="get"
              className="flex flex-wrap gap-2 border-b border-black/[0.06] p-3"
            >
              {channelFilter ? (
                <input type="hidden" name="channel" value={channelFilter} />
              ) : null}
              {range !== "30d" ? (
                <input type="hidden" name="range" value={range} />
              ) : null}
              <input type="hidden" name="view" value="bills" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search customer, phone, bill id…"
                className="min-w-[200px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
              />
              <button
                type="submit"
                className="rounded-lg border border-black/10 bg-[#fafbfc] px-3 py-2 text-sm font-semibold"
              >
                Search
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Bill</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium text-right">Sale</th>
                    <th className="px-4 py-2.5 font-medium text-right">Cost</th>
                    <th className="px-4 py-2.5 font-medium text-right">Profit</th>
                    <th className="px-4 py-2.5 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {orders.map((order) => {
                    const eco = billEconomics(order.items, {
                      discountAmount: order.discountAmount ?? 0,
                      deliveryFee: order.deliveryFee ?? 0,
                    });
                    return (
                      <tr key={order.id} className="hover:bg-[#f7f8f9]">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-medium text-pine hover:underline"
                          >
                            #{order.id.slice(0, 8)}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                order.channel === "offline"
                                  ? "bg-brass/20 text-pine"
                                  : "bg-leaf/15 text-pine"
                              }`}
                            >
                              {order.channel === "offline"
                                ? "Offline"
                                : "Online"}
                            </span>
                            {order.paymentMethod ? (
                              <span className="text-[10px] text-ink/40">
                                {paymentMethodLabel(order.paymentMethod)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink/55">
                          {order.createdAt.toLocaleString("en-NP")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{order.customerName}</div>
                          {order.phone ? (
                            <span className="text-xs text-ink/45">
                              {order.phone}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatNprFromInt(eco.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink/55">
                          {formatNprFromInt(eco.cost)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            eco.profit >= 0
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {formatNprFromInt(eco.profit)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink/45">
                          {eco.marginPct}%
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <AdminEmpty
                          title="No bills in this range"
                          body="Try a wider date range or clear filters."
                          action={
                            <AdminBtn href="/admin/sales" size="sm">
                              Offline sale
                            </AdminBtn>
                          }
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium text-right">Qty sold</th>
                  <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cost</th>
                  <th className="px-4 py-2.5 font-medium text-right">Profit</th>
                  <th className="px-4 py-2.5 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {productRows.map((row) => {
                  const pct =
                    row.revenue > 0
                      ? Math.round((row.profit / row.revenue) * 100)
                      : 0;
                  return (
                    <tr key={row.productId || row.name} className="hover:bg-[#f7f8f9]">
                      <td className="px-4 py-3">
                        {row.productId ? (
                          <Link
                            href={`/admin/products/${row.productId}`}
                            className="font-medium text-pine hover:underline"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.qty}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatNprFromInt(row.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink/55">
                        {formatNprFromInt(row.cost)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          row.profit >= 0
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {formatNprFromInt(row.profit)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink/45">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
                {productRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <AdminEmpty
                        title="No product sales"
                        body="Sales in this range will show product-level profit here."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <p className="border-t border-black/[0.06] px-4 py-2.5 text-[11px] text-ink/40">
              Product totals are before bill-level discounts. Bill view includes
              discounts and delivery.
            </p>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
