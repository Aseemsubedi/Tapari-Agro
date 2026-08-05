import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import {
  AdminBtn,
  AdminCard,
  AdminCardHeader,
  AdminEmpty,
} from "@/components/admin-ui";
import { CustomerLedgerShare } from "@/components/customer-ledger-share";
import { OrderPaymentUpdateForm } from "@/components/order-payment-update-form";
import {
  buildCustomerLedger,
  customerLedgerMessage,
} from "@/lib/customer-ledger";
import { prisma } from "@/lib/db";
import {
  customerAddressesList,
  findCustomerByKey,
  normalizePhone,
} from "@/lib/customers";
import {
  customerWhatsAppHref,
  isCollectMethod,
  orderPaymentDue,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  params: Promise<{ key: string }>;
};

function matchesCustomer(
  order: { phone: string; customerName: string },
  key: string,
) {
  const digits = normalizePhone(order.phone);
  if (key.startsWith("p:")) {
    return digits === key.slice(2);
  }
  if (key.startsWith("n:")) {
    return (
      !digits &&
      order.customerName.trim().toLowerCase() === key.slice(2)
    );
  }
  return digits === normalizePhone(key);
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const customerOrders = orders.filter((o) => matchesCustomer(o, key));
  if (customerOrders.length === 0) notFound();

  const name = customerOrders[0]!.customerName;
  const phone =
    customerOrders.find((o) => o.phone)?.phone ?? customerOrders[0]!.phone;

  const ledger = buildCustomerLedger(customerOrders);
  const { spent, paid, due } = ledger;
  const invoiceHref = `/admin/customers/${encodeURIComponent(key)}/invoice`;
  const ledgerMessage = customerLedgerMessage({
    customerName: name,
    phone,
    spent: ledger.spent,
    paid: ledger.paid,
    due: ledger.due,
    dueLines: ledger.dueLines,
  });

  const creditOrders = customerOrders.filter(
    (o) => o.status !== "cancelled" && orderPaymentDue(o) > 0,
  );

  const savedCustomer = await findCustomerByKey(key);
  const savedAddresses = savedCustomer
    ? customerAddressesList(savedCustomer)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/admin/customers?view=credit"
        className="inline-flex text-sm font-medium text-ink/50 hover:text-ink"
      >
        ← Customers
      </Link>

      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink/45">Customer</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
              {name}
            </h2>
            <p className="mt-1 text-sm text-ink/55">
              {phone || "No phone on file"}
            </p>
            {savedAddresses.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                  Saved addresses ({savedAddresses.length}/2)
                </p>
                {savedAddresses.map((addr, i) => (
                  <p
                    key={`${i}-${addr}`}
                    className="rounded-lg bg-[#fafbfc] px-3 py-2 text-sm text-ink/80 whitespace-pre-wrap"
                  >
                    <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
                      {i + 1}.
                    </span>
                    {addr}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink/40">
                No saved delivery addresses yet — they appear after an offline
                sale with an address.
              </p>
            )}
          </div>
          {phone ? (
            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center rounded-lg bg-pine px-3.5 py-2 text-sm font-semibold text-white"
              >
                Call
              </a>
              <a
                href={customerWhatsAppHref(
                  phone,
                  due > 0
                    ? ledgerMessage
                    : `Namaste ${name}, Tapari Agro here.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-ink"
              >
                WhatsApp
              </a>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Bills
            </p>
            <p className="font-display text-lg font-bold">{customerOrders.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Spent
            </p>
            <p className="font-display text-lg font-bold tabular-nums">
              {formatNprFromInt(spent)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Paid
            </p>
            <p className="font-display text-lg font-bold tabular-nums text-emerald-700">
              {formatNprFromInt(paid)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Remaining due
            </p>
            <p
              className={`font-display text-lg font-bold tabular-nums ${
                due > 0 ? "text-amber-800" : "text-ink"
              }`}
            >
              {formatNprFromInt(due)}
            </p>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
              Statement / invoice
            </p>
            <p
              className={`mt-1 font-display text-3xl font-bold tabular-nums tracking-tight ${
                due > 0 ? "text-amber-950" : "text-emerald-800"
              }`}
            >
              {formatNprFromInt(due)}
            </p>
            <p className="mt-1 text-sm text-ink/50">
              {due > 0
                ? `${ledger.openBills} open bill${ledger.openBills === 1 ? "" : "s"} remaining`
                : "No remaining dues"}
            </p>
          </div>
        </div>
        {ledger.dueLines.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-black/[0.06]">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                  <th className="px-3 py-2 font-semibold">Bill</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 text-right font-semibold">Due</th>
                </tr>
              </thead>
              <tbody>
                {ledger.dueLines.map((row) => (
                  <tr
                    key={row.orderId}
                    className="border-b border-black/[0.04] last:border-0"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/orders/${row.orderId}`}
                        className="font-semibold text-pine hover:underline"
                      >
                        {row.ref}
                      </Link>
                      <p className="text-[11px] text-ink/45 line-clamp-1">
                        {row.itemsLabel}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-ink/55">{row.dateLabel}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-900">
                      {formatNprFromInt(row.due)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50/80">
                  <td colSpan={2} className="px-3 py-2.5 text-right text-sm font-semibold">
                    Total remaining
                  </td>
                  <td className="px-3 py-2.5 text-right font-display text-lg font-bold tabular-nums text-amber-950">
                    {formatNprFromInt(due)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
        <div className="mt-4">
          <CustomerLedgerShare
            phone={phone}
            message={ledgerMessage}
            invoiceHref={invoiceHref}
          />
        </div>
      </AdminCard>

      {creditOrders.length > 0 ? (
        <AdminCard flush>
          <AdminCardHeader
            title="Collect payment"
            action={
              <span className="text-xs font-semibold text-amber-800">
                {formatNprFromInt(due)} due
              </span>
            }
          />
          <ul className="divide-y divide-black/[0.06]">
            {creditOrders.map((order) => {
              const billDue = orderPaymentDue(order);
              return (
                <li key={order.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-pine hover:underline"
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-ink/45">
                        {order.createdAt.toLocaleString("en-NP")} ·{" "}
                        {paymentMethodLabel(
                          order.paymentMethod,
                          order.paymentNote,
                        )}{" "}
                        · {paymentStatusLabel(order.paymentStatus)}
                      </p>
                      <p className="mt-1 text-xs text-ink/55">
                        Bill {formatNprFromInt(order.total)} · Paid{" "}
                        {formatNprFromInt(
                          order.paymentStatus === "paid"
                            ? order.total
                            : order.amountPaid,
                        )}{" "}
                        ·{" "}
                        <span className="font-semibold text-amber-800">
                          Due {formatNprFromInt(billDue)}
                        </span>
                      </p>
                    </div>
                    <OrderPaymentUpdateForm
                      orderId={order.id}
                      amountPaid={order.amountPaid}
                      total={order.total}
                      defaultMethod={
                        isCollectMethod(order.paymentMethod)
                          ? order.paymentMethod
                          : "cash"
                      }
                      defaultNote={order.paymentNote}
                      redirectTo={`/admin/customers/${encodeURIComponent(key)}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      ) : null}

      <AdminCard flush>
        <AdminCardHeader title="All bills" />
        {customerOrders.length === 0 ? (
          <AdminEmpty title="No bills" body="No sales for this customer." />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {customerOrders.map((order) => {
              const billDue = orderPaymentDue(order);
              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-sm sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-pine hover:underline"
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                      <AdminStatusBadge status={order.status} />
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          order.channel === "offline"
                            ? "bg-brass/20 text-pine"
                            : "bg-leaf/15 text-pine"
                        }`}
                      >
                        {order.channel === "offline" ? "Offline" : "Online"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink/45">
                      {order.createdAt.toLocaleString("en-NP")}
                      {order.paymentMethod
                        ? ` · ${paymentMethodLabel(order.paymentMethod, order.paymentNote)}`
                        : ""}
                      {order.items.length
                        ? ` · ${order.items.reduce((s, i) => s + i.quantity, 0)} items`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">
                      {formatNprFromInt(order.total)}
                    </p>
                    {order.status !== "cancelled" && billDue > 0 ? (
                      <p className="text-[11px] font-semibold text-amber-800">
                        Due {formatNprFromInt(billDue)}
                      </p>
                    ) : order.status !== "cancelled" ? (
                      <p className="text-[11px] text-emerald-700">Settled</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      <p className="text-xs text-ink/40">
        <AdminBtn href="/admin/sales" variant="plain" size="sm">
          New offline sale →
        </AdminBtn>
      </p>
    </div>
  );
}
