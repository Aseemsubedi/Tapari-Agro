import Link from "next/link";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminStat,
} from "@/components/admin-ui";
import {
  aggregatePaymentMethods,
  aggregateProductSales,
  aggregateSalesByCategory,
  aggregateSalesByDay,
  analysisRangeLabel,
  analysisRangeStart,
  parseAnalysisRange,
  type AnalysisRange,
} from "@/lib/analysis";
import { prisma } from "@/lib/db";
import { billEconomics, paymentMethodLabel } from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";
import {
  REPORT_SHORTCUTS,
  REPORT_VIEW_META,
  aggregateSupplierPurchases,
  buildStockValueRows,
  parseReportView,
  type ReportView,
} from "@/lib/reports";

type Props = {
  searchParams: Promise<{
    view?: string;
    range?: string;
    channel?: string;
    q?: string;
  }>;
};

export default async function AdminReportsPage({ searchParams }: Props) {
  const {
    view: viewParam,
    range: rangeParam,
    channel: channelParam = "all",
    q = "",
  } = await searchParams;

  const view = parseReportView(viewParam);
  const range = parseAnalysisRange(rangeParam);
  const since = analysisRangeStart(range);
  const channelFilter =
    channelParam === "online" || channelParam === "offline"
      ? channelParam
      : null;

  function href(next: {
    view?: ReportView;
    range?: AnalysisRange;
    channel?: string;
    q?: string;
  }) {
    const params = new URLSearchParams();
    const v = next.view ?? view;
    const r = next.range ?? range;
    const ch = next.channel ?? channelParam;
    const query = next.q ?? q;
    if (v !== "hub") params.set("view", v);
    if (r !== "30d") params.set("range", r);
    if (ch !== "all") params.set("channel", ch);
    if (query.trim()) params.set("q", query.trim());
    const s = params.toString();
    return s ? `/admin/reports?${s}` : "/admin/reports";
  }

  const ranges: { value: AnalysisRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "all", label: "All time" },
  ];

  const tabs: { value: ReportView; label: string }[] = [
    { value: "hub", label: "Hub" },
    { value: "sales", label: "By date" },
    { value: "products", label: "By product" },
    { value: "cost", label: "Cost / margin" },
    { value: "suppliers", label: "Suppliers" },
    { value: "stock", label: "Stock value" },
    { value: "writeoffs", label: "Write-offs" },
    { value: "settlements", label: "Settlements" },
    { value: "cashbook", label: "Cashbook" },
  ];

  const needsOrders =
    view === "sales" || view === "products" || view === "cost";
  const needsPurchases = view === "suppliers";
  const needsStock = view === "stock" || view === "cost";
  const needsEvents = view === "writeoffs" || view === "cashbook";
  const needsSettlements = view === "settlements" || view === "suppliers";

  const [orders, purchases, products, events, settlements, productMeta] =
    await Promise.all([
      needsOrders
        ? prisma.order.findMany({
            where: {
              AND: [
                { status: { not: "cancelled" } },
                since ? { createdAt: { gte: since } } : {},
                channelFilter ? { channel: channelFilter } : {},
                q.trim()
                  ? {
                      OR: [
                        { customerName: { contains: q.trim() } },
                        { phone: { contains: q.trim() } },
                        { id: { contains: q.trim() } },
                      ],
                    }
                  : {},
              ],
            },
            orderBy: { createdAt: "desc" },
            take: range === "all" ? 800 : 500,
            include: { items: true },
          })
        : Promise.resolve([]),
      needsPurchases
        ? prisma.stockPurchase.findMany({
            where: since ? { createdAt: { gte: since } } : {},
            orderBy: { createdAt: "desc" },
            take: 800,
            include: {
              vendor: { select: { id: true, name: true, phone: true } },
            },
          })
        : Promise.resolve([]),
      needsStock
        ? prisma.product.findMany({
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              unit: true,
              category: true,
              inventoryMode: true,
              stock: true,
              digitalAvailable: true,
              costPrice: true,
              price: true,
              published: true,
            },
          })
        : Promise.resolve([]),
      needsEvents
        ? prisma.paymentEvent.findMany({
            where: {
              AND: [
                since ? { createdAt: { gte: since } } : {},
                view === "writeoffs" ? { direction: "writeoff" } : {},
                q.trim()
                  ? {
                      OR: [
                        { partyName: { contains: q.trim() } },
                        { note: { contains: q.trim() } },
                        { refLabel: { contains: q.trim() } },
                      ],
                    }
                  : {},
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 300,
          })
        : Promise.resolve([]),
      needsSettlements
        ? prisma.sellerSettlement.findMany({
            include: {
              vendor: { select: { id: true, name: true, phone: true } },
              order: {
                select: { id: true, customerName: true, createdAt: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 300,
          })
        : Promise.resolve([]),
      needsOrders
        ? prisma.product.findMany({
            select: { id: true, category: true, costPrice: true, price: true },
          })
        : Promise.resolve([]),
    ]);

  const productById = Object.fromEntries(productMeta.map((p) => [p.id, p]));

  const dayRows = needsOrders
    ? aggregateSalesByDay(orders, billEconomics)
    : [];
  const productSales = needsOrders
    ? aggregateProductSales(orders.flatMap((o) => o.items)).slice(0, 60)
    : [];
  const categorySales = needsOrders
    ? aggregateSalesByCategory(
        orders.flatMap((o) =>
          o.items.map((i) => ({
            category: productById[i.productId]?.category ?? "",
            price: i.price,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        ),
      )
    : [];

  const salesTotals = needsOrders
    ? orders.reduce(
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
      )
    : { revenue: 0, cost: 0, profit: 0, bills: 0 };

  const supplierRows = needsPurchases
    ? aggregateSupplierPurchases(
        purchases.map((p) => ({
          vendorId: p.vendorId,
          vendorName: p.vendor?.name ?? null,
          vendorPhone: p.vendor?.phone ?? null,
          batchId: p.batchId,
          quantity: p.quantity,
          unitCost: p.unitCost,
          amountPaid: p.amountPaid,
          paid: p.paid,
        })),
      )
    : [];

  const stockValue = needsStock
    ? buildStockValueRows(products)
    : { rows: [], totalValue: 0, unitsOwned: 0 };

  const costRows = needsStock
    ? products
        .filter((p) => p.published)
        .map((p) => {
          const margin =
            p.price > 0
              ? Math.round(((p.price - (p.costPrice ?? 0)) / p.price) * 100)
              : 0;
          return { ...p, margin };
        })
        .sort((a, b) => (b.costPrice ?? 0) * b.stock - (a.costPrice ?? 0) * a.stock)
        .slice(0, 80)
    : [];

  const writeoffTotal = events
    .filter((e) => e.direction === "writeoff")
    .reduce((s, e) => s + e.amount, 0);

  const methodMix = aggregatePaymentMethods(events, "collect");

  const unpaidSettlements = settlements.filter((s) => !s.paid);
  const settlementDue = unpaidSettlements.reduce(
    (s, row) => s + Math.max(0, row.amount - row.amountPaid),
    0,
  );
  const settlementPaid = settlements
    .filter((s) => s.paid)
    .reduce((s, row) => s + row.amount, 0);

  const meta = REPORT_VIEW_META[view];
  const showRange =
    view !== "hub" && view !== "stock" && view !== "cost";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">
            Reports
          </h2>
          <p className="mt-0.5 text-sm text-ink/50">
            {meta.hint}{" "}
            <span className="text-ink/35">· Source: {meta.source}</span>
          </p>
        </div>
        <AdminBtn href="/admin/profits" variant="secondary" size="sm">
          Open Analysis
        </AdminBtn>
      </div>

      <AdminCard flush>
        <div className="flex flex-wrap gap-1 border-b border-black/[0.06] bg-[#fafbfc] px-2 py-2">
          {tabs.map((tab) => {
            const active = view === tab.value;
            return (
              <Link
                key={tab.value}
                href={href({ view: tab.value })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:text-sm sm:px-3 sm:py-2 ${
                  active
                    ? "bg-white text-ink shadow-sm ring-1 ring-black/5"
                    : "text-ink/50 hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {showRange ? (
          <div className="flex flex-wrap items-center gap-1 border-b border-black/[0.06] px-2 py-2">
            {ranges.map((r) => (
              <Link
                key={r.value}
                href={href({ range: r.value })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  range === r.value
                    ? "bg-pine/10 text-pine"
                    : "text-ink/45 hover:text-ink"
                }`}
              >
                {r.label}
              </Link>
            ))}
            {(view === "sales" || view === "products") && (
              <>
                <span
                  className="mx-1 hidden h-5 w-px bg-black/10 sm:block"
                  aria-hidden
                />
                {(
                  [
                    ["all", "All channels"],
                    ["online", "Online"],
                    ["offline", "Offline"],
                  ] as const
                ).map(([value, label]) => (
                  <Link
                    key={value}
                    href={href({ channel: value })}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      channelParam === value
                        ? "bg-pine/10 text-pine"
                        : "text-ink/45 hover:text-ink"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </>
            )}
          </div>
        ) : null}

        {(view === "sales" ||
          view === "products" ||
          view === "cashbook" ||
          view === "writeoffs") && (
          <form
            method="get"
            className="flex flex-wrap gap-2 border-b border-black/[0.06] p-3"
          >
            <input type="hidden" name="view" value={view} />
            {range !== "30d" ? (
              <input type="hidden" name="range" value={range} />
            ) : null}
            {channelParam !== "all" ? (
              <input type="hidden" name="channel" value={channelParam} />
            ) : null}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search…"
              className="min-w-[180px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
            />
            <button
              type="submit"
              className="rounded-lg border border-black/10 bg-[#fafbfc] px-3 py-2 text-sm font-semibold"
            >
              Search
            </button>
          </form>
        )}

        <div className="p-4 sm:p-5">
          {/* HUB */}
          {view === "hub" ? (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">
                  Report types
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {tabs
                    .filter((t) => t.value !== "hub")
                    .map((t) => {
                      const m = REPORT_VIEW_META[t.value];
                      return (
                        <li key={t.value}>
                          <Link
                            href={href({ view: t.value })}
                            className="block rounded-xl border border-black/[0.06] bg-[#fafbfc] px-4 py-3 transition hover:border-pine/25 hover:bg-white"
                          >
                            <p className="font-semibold text-ink">{m.title}</p>
                            <p className="mt-0.5 text-xs text-ink/45">
                              {m.hint}
                            </p>
                            <p className="mt-1 text-[10px] text-ink/30">
                              {m.source}
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">
                  Also available elsewhere
                </p>
                <ul className="space-y-2">
                  {REPORT_SHORTCUTS.map((s) => (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        className="flex flex-col rounded-xl border border-black/[0.06] px-4 py-3 hover:bg-[#f7f9f6] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-ink">{s.title}</p>
                          <p className="text-xs text-ink/45">{s.body}</p>
                        </div>
                        <span className="mt-2 text-xs font-semibold text-pine sm:mt-0">
                          Open →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {/* SALES BY DATE */}
          {view === "sales" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <AdminStat
                  label="Bills"
                  value={String(salesTotals.bills)}
                  hint={analysisRangeLabel(range)}
                />
                <AdminStat
                  label="Sales"
                  value={formatNprFromInt(salesTotals.revenue)}
                />
                <AdminStat
                  label="COGS"
                  value={formatNprFromInt(salesTotals.cost)}
                />
                <AdminStat
                  label="Profit"
                  value={formatNprFromInt(salesTotals.profit)}
                  tone={salesTotals.profit >= 0 ? "ok" : "warn"}
                />
              </div>
              {dayRows.length === 0 ? (
                <AdminEmpty
                  title="No sales in this range"
                  body="Try a wider date range or another channel."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Date</th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Bills
                        </th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Sales
                        </th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Cost
                        </th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Profit
                        </th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Collected
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05]">
                      {dayRows.map((row) => (
                        <tr key={row.day}>
                          <td className="px-3 py-2.5 font-medium text-ink">
                            {row.day}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {row.bills}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatNprFromInt(row.revenue)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-ink/55">
                            {formatNprFromInt(row.cost)}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                              row.profit >= 0
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            {formatNprFromInt(row.profit)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-ink/55">
                            {formatNprFromInt(row.collected)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {categorySales.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-ink">
                    By category
                  </p>
                  <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.06]">
                    {categorySales.slice(0, 12).map((c) => (
                      <li
                        key={c.category}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium text-ink">
                          {c.category}
                        </span>
                        <span className="tabular-nums text-ink/55">
                          {c.qty} u · {formatNprFromInt(c.revenue)} ·{" "}
                          <span className="font-semibold text-emerald-700">
                            {formatNprFromInt(c.profit)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* PRODUCTS */}
          {view === "products" ? (
            productSales.length === 0 ? (
              <AdminEmpty
                title="No product sales"
                body="No order lines in this range."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 font-medium text-right">Qty</th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Revenue
                      </th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        COGS
                      </th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    {productSales.map((row) => (
                      <tr key={row.productId || row.name}>
                        <td className="px-3 py-2.5">
                          {row.productId ? (
                            <Link
                              href={`/admin/products/${row.productId}`}
                              className="font-medium text-ink hover:text-pine hover:underline"
                            >
                              {row.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{row.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {row.qty}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatNprFromInt(row.revenue)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink/55">
                          {formatNprFromInt(row.cost)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                            row.profit >= 0
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {formatNprFromInt(row.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {/* COST / MARGIN */}
          {view === "cost" ? (
            <div className="space-y-4">
              <p className="text-sm text-ink/50">
                Catalog cost price (weighted avg from purchases) vs sell price.
                Sales COGS may differ when digital lines use seller payout.
              </p>
              <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Cost
                      </th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Sell
                      </th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Margin
                      </th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        On hand
                      </th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Stock value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    {costRows.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="font-medium text-ink hover:text-pine hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-[11px] text-ink/40">
                            {p.category || "—"} · {p.unit}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatNprFromInt(p.costPrice ?? 0)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatNprFromInt(p.price)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                            p.margin >= 30
                              ? "text-emerald-700"
                              : p.margin < 10
                                ? "text-amber-800"
                                : "text-ink"
                          }`}
                        >
                          {p.margin}%
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {p.stock}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink/55">
                          {formatNprFromInt(p.stock * (p.costPrice ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* SUPPLIERS */}
          {view === "suppliers" ? (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">
                  Purchase spend ({analysisRangeLabel(range)})
                </p>
                {supplierRows.length === 0 ? (
                  <AdminEmpty
                    title="No purchases"
                    body="Record a supplier bill to see spend here."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                        <tr>
                          <th className="px-3 py-2.5 font-medium">Supplier</th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Bills
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Units
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Spend
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Paid
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Due
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.05]">
                        {supplierRows.map((s) => (
                          <tr key={s.vendorId}>
                            <td className="px-3 py-2.5">
                              <Link
                                href={`/admin/suppliers/${s.vendorId}`}
                                className="font-medium text-ink hover:text-pine hover:underline"
                              >
                                {s.name}
                              </Link>
                              {s.phone ? (
                                <p className="text-[11px] text-ink/40">
                                  {s.phone}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {s.bills}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {s.units}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatNprFromInt(s.spend)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-ink/55">
                              {formatNprFromInt(s.paid)}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                                s.due > 0 ? "text-amber-900" : "text-ink"
                              }`}
                            >
                              {formatNprFromInt(s.due)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <AdminStat
                  label="Seller dues (open)"
                  value={formatNprFromInt(settlementDue)}
                  hint={`${unpaidSettlements.length} unpaid`}
                  href="/admin/payments?view=sellers"
                  tone={settlementDue > 0 ? "warn" : "ok"}
                />
                <AdminBtn
                  href="/admin/suppliers?view=due"
                  variant="secondary"
                  size="sm"
                >
                  Purchase dues →
                </AdminBtn>
              </div>
            </div>
          ) : null}

          {/* STOCK VALUE */}
          {view === "stock" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminStat
                  label="Owned stock value"
                  value={formatNprFromInt(stockValue.totalValue)}
                  hint={`${stockValue.unitsOwned} units at cost`}
                />
                <AdminStat
                  label="SKUs with stock"
                  value={String(stockValue.rows.length)}
                />
              </div>
              {stockValue.rows.length === 0 ? (
                <AdminEmpty
                  title="No owned stock"
                  body="Purchase stock to build inventory value."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Product</th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Qty
                        </th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Unit cost
                        </th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05]">
                      {stockValue.rows.slice(0, 80).map((r) => (
                        <tr key={r.productId}>
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/admin/products/${r.productId}`}
                              className="font-medium hover:text-pine hover:underline"
                            >
                              {r.name}
                            </Link>
                            <p className="text-[11px] text-ink/40">
                              {r.category} · {r.unit}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {r.owned}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-ink/55">
                            {formatNprFromInt(r.costPrice)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {formatNprFromInt(r.stockValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* WRITE-OFFS */}
          {view === "writeoffs" ? (
            <div className="space-y-4">
              <AdminStat
                label="Write-off total"
                value={formatNprFromInt(writeoffTotal)}
                hint={`${events.length} events · ${analysisRangeLabel(range)}`}
                tone={writeoffTotal > 0 ? "warn" : "ok"}
              />
              {events.length === 0 ? (
                <AdminEmpty
                  title="No write-offs"
                  body="Spoilage and expiry write-offs from Inventory / product adjust show here."
                />
              ) : (
                <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.06]">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-ink">
                          {e.refLabel || e.partyName || "Write-off"}
                        </p>
                        <p className="text-xs text-ink/40">
                          {e.createdAt.toLocaleString("en-NP")}
                          {e.note ? ` · ${e.note}` : ""}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums text-red-700">
                        −{formatNprFromInt(e.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {/* SETTLEMENTS */}
          {view === "settlements" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminStat
                  label="Open seller dues"
                  value={formatNprFromInt(settlementDue)}
                  hint={`${unpaidSettlements.length} open`}
                  href="/admin/payments?view=sellers"
                  tone={settlementDue > 0 ? "warn" : "ok"}
                />
                <AdminStat
                  label="Paid settlements (loaded)"
                  value={formatNprFromInt(settlementPaid)}
                  hint="Recent paid rows"
                />
              </div>
              {settlements.length === 0 ? (
                <AdminEmpty
                  title="No settlements"
                  body="Digital / hybrid sales create seller settlements when orders complete."
                />
              ) : (
                <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.06]">
                  {settlements.slice(0, 80).map((s) => {
                    const due = Math.max(0, s.amount - s.amountPaid);
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                      >
                        <div>
                          <Link
                            href={`/admin/suppliers/${s.vendorId}`}
                            className="font-medium text-ink hover:text-pine hover:underline"
                          >
                            {s.vendor.name}
                          </Link>
                          <p className="text-xs text-ink/40">
                            Order #{s.order.id.slice(0, 8)} ·{" "}
                            {s.order.customerName} · {s.quantity} u
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">
                            {formatNprFromInt(s.amount)}
                          </p>
                          <p
                            className={`text-xs ${
                              s.paid ? "text-emerald-700" : "text-amber-800"
                            }`}
                          >
                            {s.paid
                              ? "Paid"
                              : `Due ${formatNprFromInt(due)}`}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {/* CASHBOOK */}
          {view === "cashbook" ? (
            <div className="space-y-4">
              {methodMix.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-ink">
                    Collections by method
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {methodMix.map((m) => (
                      <li
                        key={m.method}
                        className="rounded-lg bg-[#f7f9f6] px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-ink">
                          {paymentMethodLabel(m.method)}
                        </span>
                        <span className="ml-2 tabular-nums text-ink/50">
                          {m.count} · {formatNprFromInt(m.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {events.length === 0 ? (
                <AdminEmpty
                  title="No money events"
                  body="Collect, pay, settle, and write-off events appear here."
                />
              ) : (
                <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.06]">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium capitalize text-ink">
                          {e.direction}
                          {e.refLabel ? ` · ${e.refLabel}` : ""}
                        </p>
                        <p className="text-xs text-ink/40">
                          {e.createdAt.toLocaleString("en-NP")}
                          {e.partyName ? ` · ${e.partyName}` : ""}
                          {e.method
                            ? ` · ${paymentMethodLabel(e.method)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`font-semibold tabular-nums ${
                          e.direction === "collect"
                            ? "text-emerald-700"
                            : e.direction === "writeoff"
                              ? "text-red-700"
                              : "text-ink"
                        }`}
                      >
                        {e.direction === "collect" ? "+" : "−"}
                        {formatNprFromInt(e.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-ink/40">
                Full ledger also on{" "}
                <Link
                  href="/admin/payments?view=ledger"
                  className="font-semibold text-pine hover:underline"
                >
                  Money → Ledger
                </Link>
                .
              </p>
            </div>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
