import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminStat,
} from "@/components/admin-ui";
import { OrderFulfillButtons } from "@/components/order-fulfill-buttons";
import { prisma } from "@/lib/db";
import {
  ORDER_QUEUE_STAGE_META,
  ORDER_QUEUE_STAGES,
  type OrderQueueStage,
  awaitsPaymentBeforeFulfill,
  checkoutIntentBadge,
  checkoutPaymentLabel,
  customerWhatsAppHref,
  formatOrderWhen,
  orderCheckoutMethod,
  orderContactMessage,
  orderPaymentDue,
  orderQueueStage,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  searchParams: Promise<{
    stage?: string;
    q?: string;
    view?: string;
  }>;
};

const ACTION_STAGES: OrderQueueStage[] = [
  "confirm_pay",
  "confirm",
  "supplier",
  "ship",
  "complete",
  "collect",
];

function isQueueStage(value: string): value is OrderQueueStage {
  return (ORDER_QUEUE_STAGES as readonly string[]).includes(value);
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const {
    stage: stageParam = "all",
    q = "",
    view: viewParam = "needs",
  } = await searchParams;

  const view =
    viewParam === "all" || viewParam === "needs" ? viewParam : "needs";
  const stageFilter =
    stageParam !== "all" && isQueueStage(stageParam) ? stageParam : null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [allForStats, orders] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        status: true,
        channel: true,
        total: true,
        amountPaid: true,
        paymentStatus: true,
        paymentMethod: true,
        checkoutMethod: true,
        supplierStockReceived: true,
        createdAt: true,
        items: { select: { digitalQty: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        AND: [
          view === "needs"
            ? {
                OR: [
                  { status: { in: ["pending", "confirmed", "shipped"] } },
                  {
                    status: { not: "cancelled" },
                    paymentStatus: { in: ["unpaid", "partial"] },
                  },
                ],
              }
            : {},
          q.trim()
            ? {
                OR: [
                  { customerName: { contains: q.trim() } },
                  { phone: { contains: q.trim() } },
                  { address: { contains: q.trim() } },
                  { remarks: { contains: q.trim() } },
                  { notes: { contains: q.trim() } },
                  { id: { contains: q.trim() } },
                ],
              }
            : {},
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 250,
    }),
  ]);

  const now = new Date();

  const stageCounts = Object.fromEntries(
    ORDER_QUEUE_STAGES.map((s) => [s, 0]),
  ) as Record<OrderQueueStage, number>;

  let todaySales = 0;
  let todayCount = 0;
  let openDue = 0;
  let openDueBills = 0;

  for (const o of allForStats) {
    const stage = orderQueueStage(o);
    stageCounts[stage] += 1;
    if (o.status !== "cancelled") {
      const due = orderPaymentDue(o);
      if (due > 0) {
        openDue += due;
        openDueBills += 1;
      }
      if (o.createdAt >= startOfDay) {
        todaySales += o.total;
        todayCount += 1;
      }
    }
  }

  const needsCount = ACTION_STAGES.reduce((n, s) => n + stageCounts[s], 0);

  const withStage = orders
    .map((order) => ({
      order,
      stage: orderQueueStage(order),
      due: orderPaymentDue(order),
    }))
    .filter(({ stage }) => {
      if (stageFilter) return stage === stageFilter;
      if (view === "needs") return ACTION_STAGES.includes(stage);
      return true;
    });

  const stageRank = (s: OrderQueueStage) => ORDER_QUEUE_STAGES.indexOf(s);
  withStage.sort((a, b) => {
    const d = stageRank(a.stage) - stageRank(b.stage);
    if (d !== 0) return d;
    return b.order.createdAt.getTime() - a.order.createdAt.getTime();
  });

  const grouped = ACTION_STAGES.map((stage) => ({
    stage,
    meta: ORDER_QUEUE_STAGE_META[stage],
    rows: withStage.filter((r) => r.stage === stage),
  })).filter((g) => g.rows.length > 0);

  const archiveRows = withStage.filter(
    (r) => r.stage === "done" || r.stage === "cancelled",
  );

  function href(next: { view?: string; stage?: string; q?: string }) {
    const params = new URLSearchParams();
    const v = next.view ?? view;
    const st = next.stage ?? stageParam;
    const query = next.q ?? q;
    if (v !== "needs") params.set("view", v);
    if (st !== "all") params.set("stage", st);
    if (query.trim()) params.set("q", query.trim());
    const s = params.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink/55">
            One queue, in business order — settle → confirm → supplier → ship →
            done → collect.
          </p>
        </div>
        <AdminBtn href="/admin/sales" size="sm">
          Offline sale
        </AdminBtn>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Needs action"
          value={String(needsCount)}
          hint={[
            stageCounts.confirm_pay ? `${stageCounts.confirm_pay} pay` : null,
            stageCounts.confirm ? `${stageCounts.confirm} confirm` : null,
            stageCounts.supplier ? `${stageCounts.supplier} supplier` : null,
            stageCounts.ship ? `${stageCounts.ship} ship` : null,
            stageCounts.complete ? `${stageCounts.complete} complete` : null,
            stageCounts.collect ? `${stageCounts.collect} collect` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "All clear"}
          href={href({ view: "needs", stage: "all" })}
          tone={needsCount > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="Confirm payment"
          value={String(stageCounts.confirm_pay)}
          hint="QR / bank waiting"
          href={href({ view: "needs", stage: "confirm_pay" })}
          tone={stageCounts.confirm_pay > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="Open due"
          value={formatNprFromInt(openDue)}
          hint={`${openDueBills} bill${openDueBills === 1 ? "" : "s"}`}
          href={href({ view: "needs", stage: "collect" })}
          tone={openDue > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="Sales today"
          value={formatNprFromInt(todaySales)}
          hint={`${todayCount} bill${todayCount === 1 ? "" : "s"}`}
          href="/admin/profits"
        />
      </div>

      <AdminCard flush>
        {/* Primary tabs */}
        <div className="flex flex-wrap gap-1 border-b border-black/[0.06] bg-[#fafbfc] px-2 py-2">
          <Link
            href={href({ view: "needs", stage: "all" })}
            className={`rounded-lg px-3.5 py-2 text-sm ${
              view === "needs" && !stageFilter
                ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-black/5"
                : "font-medium text-ink/55 hover:text-ink"
            }`}
          >
            Work queue <span className="text-ink/35">{needsCount}</span>
          </Link>
          <Link
            href={href({ view: "all", stage: "all" })}
            className={`rounded-lg px-3.5 py-2 text-sm ${
              view === "all" && !stageFilter
                ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-black/5"
                : "font-medium text-ink/55 hover:text-ink"
            }`}
          >
            All orders{" "}
            <span className="text-ink/35">{allForStats.length}</span>
          </Link>
        </div>

        {/* Stage chips — one row, business order */}
        <div className="flex flex-wrap items-center gap-1 border-b border-black/[0.06] px-2 py-2">
          <Link
            href={href({ stage: "all" })}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-xs font-semibold ${
              !stageFilter
                ? "bg-pine/10 text-pine"
                : "text-ink/45 hover:text-ink"
            }`}
          >
            All steps
          </Link>
          {ACTION_STAGES.map((stage) => {
            const meta = ORDER_QUEUE_STAGE_META[stage];
            const count = stageCounts[stage];
            const active = stageFilter === stage;
            return (
              <Link
                key={stage}
                href={href({ view: "needs", stage })}
                className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-xs font-semibold ${
                  active
                    ? "bg-amber-50 text-amber-950"
                    : count > 0
                      ? "text-ink/70 hover:text-ink"
                      : "text-ink/30 hover:text-ink/50"
                }`}
              >
                {meta.title.replace(/^\d+ · /, "")}
                <span className="ml-1 tabular-nums text-ink/30">{count}</span>
              </Link>
            );
          })}
          {view === "all" ? (
            <>
              <span
                className="mx-1 hidden h-5 w-px bg-black/10 sm:block"
                aria-hidden
              />
              <Link
                href={href({ view: "all", stage: "done" })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  stageFilter === "done"
                    ? "bg-pine/10 text-pine"
                    : "text-ink/45 hover:text-ink"
                }`}
              >
                Done{" "}
                <span className="text-ink/30">{stageCounts.done}</span>
              </Link>
              <Link
                href={href({ view: "all", stage: "cancelled" })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  stageFilter === "cancelled"
                    ? "bg-pine/10 text-pine"
                    : "text-ink/45 hover:text-ink"
                }`}
              >
                Cancelled{" "}
                <span className="text-ink/30">{stageCounts.cancelled}</span>
              </Link>
            </>
          ) : null}
        </div>

        <form method="get" className="flex flex-wrap gap-2 border-b border-black/[0.06] p-3">
          {view !== "needs" ? (
            <input type="hidden" name="view" value={view} />
          ) : null}
          {stageFilter ? (
            <input type="hidden" name="stage" value={stageFilter} />
          ) : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, address, bill id…"
            className="min-w-[200px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
          />
          <button
            type="submit"
            className="rounded-lg border border-black/10 bg-[#fafbfc] px-3 py-2 text-sm font-semibold"
          >
            Search
          </button>
        </form>

        {withStage.length === 0 ? (
          <AdminEmpty
            title={
              view === "needs" && !q.trim() && !stageFilter
                ? "Nothing waiting"
                : "No orders here"
            }
            body={
              view === "needs" && !q.trim() && !stageFilter
                ? "Payment, confirm, supplier, ship, and collect are clear."
                : "Try another step, or record an offline sale."
            }
            action={
              view === "needs" ? (
                <AdminBtn
                  href={href({ view: "all", stage: "all" })}
                  variant="secondary"
                  size="sm"
                >
                  View all orders
                </AdminBtn>
              ) : (
                <AdminBtn href="/admin/sales" size="sm">
                  Offline sale
                </AdminBtn>
              )
            }
          />
        ) : view === "needs" && !stageFilter ? (
          <div className="divide-y divide-black/[0.06]">
            {grouped.map(({ stage, meta, rows }) => (
              <section key={stage}>
                <div className="flex items-baseline justify-between gap-3 bg-[#f7f9f6] px-4 py-2.5 sm:px-5">
                  <div>
                    <h2 className="text-sm font-bold text-ink">{meta.title}</h2>
                    <p className="text-xs text-ink/45">{meta.hint}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-ink/50 ring-1 ring-black/5">
                    {rows.length}
                  </span>
                </div>
                <ul className="divide-y divide-black/[0.04]">
                  {rows.map(({ order, stage: rowStage, due }) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      stage={rowStage}
                      due={due}
                      now={now}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {(stageFilter &&
            (stageFilter === "done" || stageFilter === "cancelled")
              ? archiveRows
              : withStage
            ).map(({ order, stage, due }) => (
              <OrderRow
                key={order.id}
                order={order}
                stage={stage}
                due={due}
                now={now}
                showStage={!stageFilter}
              />
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function OrderRow({
  order,
  stage,
  due,
  now,
  showStage = false,
}: {
  order: {
    id: string;
    customerName: string;
    phone: string;
    channel: string;
    status: string;
    total: number;
    amountPaid: number;
    paymentStatus: string;
    paymentMethod: string;
    checkoutMethod: string;
    supplierStockReceived: boolean;
    createdAt: Date;
    items: {
      name: string;
      quantity: number;
      digitalQty: number;
    }[];
  };
  stage: OrderQueueStage;
  due: number;
  now: Date;
  showStage?: boolean;
}) {
  const meta = ORDER_QUEUE_STAGE_META[stage];
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const preview = order.items
    .slice(0, 2)
    .map((i) => `${i.name}×${i.quantity}`)
    .join(", ");
  const more =
    order.items.length > 2 ? ` +${order.items.length - 2} more` : "";
  const tel = order.phone.replace(/\s+/g, "");
  const wa = order.phone.trim()
    ? customerWhatsAppHref(order.phone, orderContactMessage(order))
    : null;
  const needsPay = awaitsPaymentBeforeFulfill(order);
  const checkoutMethod = orderCheckoutMethod(order);
  const primaryHref = `/admin/orders/${order.id}`;

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={primaryHref}
            className="font-semibold text-ink hover:text-pine hover:underline"
          >
            {order.customerName}
          </Link>
          {showStage ? (
            <span className="rounded-md bg-pine/10 px-1.5 py-0.5 text-[10px] font-semibold text-pine">
              {meta.title.replace(/^\d+ · /, "")}
            </span>
          ) : (
            <AdminStatusBadge status={order.status} />
          )}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              order.channel === "offline"
                ? "bg-brass/20 text-pine"
                : "bg-leaf/15 text-pine"
            }`}
          >
            {order.channel === "offline" ? "Offline" : "Online"}
          </span>
          {order.channel === "online" ? (
            <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-ink/55">
              {checkoutIntentBadge(checkoutMethod)}
            </span>
          ) : null}
          {due > 0 ? (
            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
              Due {formatNprFromInt(due)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-ink/45">
          #{order.id.slice(0, 8)} · {formatOrderWhen(order.createdAt, now)} ·{" "}
          {itemCount} item{itemCount === 1 ? "" : "s"}
          {order.phone ? ` · ${order.phone}` : ""}
        </p>
        {preview ? (
          <p className="mt-0.5 truncate text-xs text-ink/40">
            {preview}
            {more}
          </p>
        ) : null}
        <p className="mt-1 text-sm">
          <span className="font-semibold tabular-nums text-ink">
            {formatNprFromInt(order.total)}
          </span>
          <span className="text-ink/40">
            {" "}
            ·{" "}
            {order.channel === "online"
              ? checkoutPaymentLabel(checkoutMethod)
              : paymentMethodLabel(order.paymentMethod)}{" "}
            · {paymentStatusLabel(order.paymentStatus)}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {tel ? (
          <a
            href={`tel:${tel}`}
            className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-[#f7f8f9]"
          >
            Call
          </a>
        ) : null}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-[#f7f8f9]"
          >
            WA
          </a>
        ) : null}

        {stage === "confirm_pay" ||
        stage === "collect" ||
        stage === "supplier" ? (
          <AdminBtn href={primaryHref} size="sm">
            {meta.cta}
          </AdminBtn>
        ) : stage === "confirm" ||
          stage === "ship" ||
          stage === "complete" ? (
          order.channel === "offline" ? null : (
            <OrderFulfillButtons
              orderId={order.id}
              status={order.status}
              compact
              paymentBlocked={needsPay}
            />
          )
        ) : null}

        <AdminBtn href={primaryHref} variant="plain" size="sm">
          Open
        </AdminBtn>
      </div>
    </li>
  );
}
