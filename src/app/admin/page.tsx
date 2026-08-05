import Link from "next/link";
import {
  AdminBtn,
  AdminCard,
  AdminCardHeader,
  AdminEmpty,
  AdminLink,
  AdminStat,
} from "@/components/admin-ui";
import { OrderFulfillButtons } from "@/components/order-fulfill-buttons";
import { customerLedgerKey } from "@/lib/customers";
import { prisma } from "@/lib/db";
import { expiryBucket } from "@/lib/inventory";
import { sellableQty } from "@/lib/inventory-mode";
import {
  EXPIRY_ALERT_DAYS,
  LOW_STOCK_THRESHOLD,
} from "@/lib/inventory-queue";
import { buildOpsActions, summarizeTodaySales } from "@/lib/ops-dashboard";
import { orderPaymentDue, awaitsPaymentBeforeFulfill, checkoutIntentBadge, orderCheckoutMethod } from "@/lib/orders";
import { buildCreditAging } from "@/lib/payment-ledger";
import { formatNprFromInt } from "@/lib/products";
import { groupPurchaseBills } from "@/lib/purchase-bills";
import { lineDue } from "@/lib/purchase-payment";

export default async function AdminHomePage() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const now = Date.now();
  const soon = new Date(now + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000);

  const [
    pendingCount,
    confirmedCount,
    todayOrders,
    waitingOrders,
    publishedProducts,
    creditOrders,
    purchaseLots,
    expiringLotsRaw,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "confirmed" } }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay },
        status: { not: "cancelled" },
      },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { status: { in: ["pending", "confirmed", "shipped"] } },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 8,
      include: { items: true },
    }),
    prisma.product.findMany({
      where: { published: true },
      select: {
        stock: true,
        digitalAvailable: true,
        inventoryMode: true,
        sellOnline: true,
        sellOffline: true,
      },
    }),
    prisma.order.findMany({
      where: {
        status: { not: "cancelled" },
        paymentStatus: { in: ["unpaid", "partial"] },
      },
      select: {
        id: true,
        customerName: true,
        phone: true,
        total: true,
        amountPaid: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
        channel: true,
      },
    }),
    prisma.stockPurchase.findMany({
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
      take: 800,
    }),
    prisma.stockPurchase.findMany({
      where: {
        expiresAt: { not: null, lte: soon },
        remainingQty: { gt: 0 },
      },
      select: { expiresAt: true, remainingQty: true },
      take: 500,
    }),
  ]);

  let outOfStockCount = 0;
  let lowStockCount = 0;
  for (const p of publishedProducts) {
    const sellable = sellableQty(p);
    const selling = p.sellOnline || p.sellOffline;
    if (selling && sellable === 0) outOfStockCount += 1;
    else if (sellable > 0 && sellable <= LOW_STOCK_THRESHOLD) lowStockCount += 1;
  }

  const today = summarizeTodaySales(todayOrders);
  const creditDue = creditOrders.reduce(
    (sum, o) => sum + orderPaymentDue(o),
    0,
  );
  const aging = buildCreditAging(creditOrders, customerLedgerKey);
  const overdue31 = aging.filter((r) => r.bucket === "31+");
  const creditOverdue31 = overdue31.reduce((s, r) => s + r.due, 0);

  const unpaidBills = groupPurchaseBills(
    purchaseLots.filter((l) => lineDue(l) > 0),
  ).filter((b) => b.due > 0);
  const supplierDue = unpaidBills.reduce((s, b) => s + b.due, 0);

  let expired = 0;
  let expiringSoon = 0;
  for (const lot of expiringLotsRaw) {
    if (!lot.expiresAt) continue;
    const bucket = expiryBucket(lot.expiresAt, now);
    if (bucket === "expired") expired += 1;
    else if (bucket !== "ok") expiringSoon += 1;
  }

  const stockAlerts = outOfStockCount + lowStockCount + expired + expiringSoon;

  const opsActions = buildOpsActions({
    pendingOrders: pendingCount,
    confirmedOrders: confirmedCount,
    creditDue,
    creditOverdue31,
    creditOverdue31Count: overdue31.length,
    supplierDue,
    supplierDueCount: unpaidBills.length,
    outOfStock: outOfStockCount,
    lowStock: lowStockCount,
    expiringSoon,
    expired,
  });

  const toneClass = (tone: "urgent" | "warn" | "ok") =>
    tone === "urgent"
      ? "border-l-red-500"
      : tone === "warn"
        ? "border-l-amber-500"
        : "border-l-leaf";

  // Prefer pending first in the waiting list
  const sortedWaiting = [...waitingOrders].sort((a, b) => {
    const rank = (s: string) =>
      s === "pending" ? 0 : s === "confirmed" ? 1 : s === "shipped" ? 2 : 3;
    const d = rank(a.status) - rank(b.status);
    if (d !== 0) return d;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <div className="space-y-5">
      {opsActions.length > 0 ? (
        <AdminCard flush>
          <AdminCardHeader title="Do this next" />
          <ul className="divide-y divide-black/[0.06]">
            {opsActions.map((action) => (
              <li
                key={action.id}
                className={`flex flex-wrap items-center justify-between gap-3 border-l-4 px-4 py-3.5 sm:px-5 ${toneClass(action.tone)}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{action.title}</p>
                  <p className="text-xs text-ink/45">{action.body}</p>
                </div>
                <AdminBtn
                  href={action.href}
                  size="sm"
                  variant={action.tone === "urgent" ? "primary" : "secondary"}
                >
                  Open
                </AdminBtn>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : (
        <AdminCard>
          <p className="text-sm font-semibold text-ink">All clear for now</p>
          <p className="mt-1 text-sm text-ink/50">
            No pending orders, overdue credit, stockouts, or expiry flags.
          </p>
          <div className="mt-4">
            <AdminBtn href="/admin/sales" size="sm">
              Offline sale
            </AdminBtn>
          </div>
        </AdminCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Sales today"
          value={formatNprFromInt(today.sales)}
          hint={`${today.bills} bill${today.bills === 1 ? "" : "s"}`}
          href="/admin/orders"
        />
        <AdminStat
          label="To collect"
          value={formatNprFromInt(creditDue)}
          hint={`${creditOrders.length} open bill${creditOrders.length === 1 ? "" : "s"}`}
          href="/admin/payments?view=collect"
          tone={creditDue > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="Supplier due"
          value={formatNprFromInt(supplierDue)}
          hint={`${unpaidBills.length} unpaid bill${unpaidBills.length === 1 ? "" : "s"}`}
          href="/admin/payments?view=pay"
          tone={supplierDue > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="Stock alerts"
          value={String(stockAlerts)}
          hint={`${outOfStockCount + lowStockCount} stock · ${expired + expiringSoon} expiry`}
          href="/admin/inventory?filter=low"
          tone={stockAlerts > 0 ? "warn" : "ok"}
        />
      </div>

      <AdminCard flush>
        <AdminCardHeader
          title="Orders waiting"
          action={
            <AdminLink href="/admin/orders?view=needs">All needs action</AdminLink>
          }
        />
        {sortedWaiting.length === 0 ? (
          <AdminEmpty
            title="Nothing to fulfill"
            body="New online checkouts and packs in progress show here."
            action={
              <AdminBtn href="/admin/sales" variant="secondary" size="sm">
                Offline sale
              </AdminBtn>
            }
          />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {sortedWaiting.map((order) => {
              const needsPay = awaitsPaymentBeforeFulfill(order);
              return (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
              >
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold text-ink hover:underline">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-ink/45">
                    {needsPay
                      ? checkoutIntentBadge(orderCheckoutMethod(order))
                      : order.status}{" "}
                    · {order.phone} ·{" "}
                    {order.items.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
                    {formatNprFromInt(order.total)}
                    {orderPaymentDue(order) > 0
                      ? ` · due ${formatNprFromInt(orderPaymentDue(order))}`
                      : ""}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  {order.phone ? (
                    <a
                      href={`tel:${order.phone.replace(/\s+/g, "")}`}
                      className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold"
                    >
                      Call
                    </a>
                  ) : null}
                  <OrderFulfillButtons
                    orderId={order.id}
                    status={order.status}
                    compact
                    paymentBlocked={needsPay}
                  />
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
