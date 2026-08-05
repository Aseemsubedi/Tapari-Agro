import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { GuestOrderSync } from "@/components/guest-order-sync";
import { LocalProductAvailabilityNotice } from "@/components/local-product-availability-notice";
import { OrderReceiptShare } from "@/components/order-receipt-share";
import { normalizePhone } from "@/lib/customers";
import { prisma } from "@/lib/db";
import { orderReceiptMessage } from "@/lib/order-receipt";
import {
  checkoutPaymentLabel,
  isPrepaidCheckoutMethod,
  orderCheckoutMethod,
  orderPaymentDue,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";
import { callLink, shopConfig } from "@/lib/shop";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Order statement",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  const phoneKey = normalizePhone(order.phone);
  const customer = phoneKey
    ? await prisma.customer.findFirst({ where: { phoneKey } })
    : null;

  const ref = `#${order.id.slice(0, 8)}`;
  const dateLabel = order.createdAt.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const due = orderPaymentDue(order);
  const paid =
    order.paymentStatus === "paid"
      ? order.total
      : Math.max(0, order.amountPaid);
  const lineSubtotal =
    order.subtotal > 0
      ? order.subtotal
      : order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const receiptUrl = `${getSiteUrl()}/order/${order.id}`;
  const message = orderReceiptMessage(order, { includeLink: receiptUrl });
  const isOnline = order.channel !== "offline";
  const checkoutMethod = orderCheckoutMethod(order);
  const prepaidWaiting =
    isPrepaidCheckoutMethod(checkoutMethod) && order.paymentStatus !== "paid";

  return (
    <div className="bg-[#f6f7f9] pb-10 print:bg-white print:pb-0">
      <ClearCartOnMount />
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-8 sm:py-14 print:px-0 print:py-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-sm font-medium text-ink/50">
            {isOnline ? "Order received" : "Order statement"}
          </p>
          <OrderReceiptShare message={message} canPrintHere />
        </div>

        <article className="rounded-2xl border border-pine/10 bg-white p-6 shadow-[0_1px_3px_rgba(16,36,24,0.05)] sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-pine/10 pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-leaf">
                {shopConfig.name}
              </p>
              <h1 className="mt-2 break-words font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                {isOnline ? `Thank you, ${order.customerName}` : "Order statement"}
              </h1>
              <p className="mt-2 text-sm text-ink/50">
                {ref} · {dateLabel}
              </p>
              {isOnline ? (
                <GuestOrderSync
                  orderId={order.id}
                  customerName={order.customerName}
                  phone={order.phone}
                  address={order.address}
                  total={order.total}
                  createdAt={order.createdAt.toISOString()}
                  customerId={customer?.id ?? null}
                />
              ) : null}
            </div>
            <div className="text-right text-sm text-ink/55">
              <p>{shopConfig.phoneDisplay}</p>
              <p className="text-xs text-ink/40">{shopConfig.deliveryNote}</p>
            </div>
          </header>

          {isOnline ? (
            <p className="mt-5 text-sm leading-relaxed text-ink/60">
              {prepaidWaiting ? (
                <>
                  You chose{" "}
                  <span className="font-semibold text-ink">
                    {checkoutPaymentLabel(checkoutMethod)}
                  </span>
                  . Complete payment, then we&apos;ll call{" "}
                  <span className="font-semibold text-ink">{order.phone}</span>{" "}
                  and start packing after we confirm the money.
                </>
              ) : checkoutMethod === "cash" && order.paymentStatus !== "paid" ? (
                <>
                  You chose{" "}
                  <span className="font-semibold text-ink">cash on delivery</span>
                  . We&apos;ll call{" "}
                  <span className="font-semibold text-ink">{order.phone}</span> to
                  confirm, then pack — pay when your order arrives.
                </>
              ) : (
                <>
                  We got your order and will call{" "}
                  <span className="font-semibold text-ink">{order.phone}</span> to
                  confirm before packing. Save or share this statement below.
                </>
              )}
            </p>
          ) : null}

          {prepaidWaiting &&
          checkoutMethod === "bank_qr" &&
          shopConfig.qrImage ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-pine/10 bg-mist/30 p-4 text-center print:hidden">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40">
                Scan to pay · Fonepay
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shopConfig.qrImage}
                alt="Fonepay QR — Tapari Agro Private Limited"
                className="mx-auto mt-3 h-auto w-full max-w-[240px] rounded-xl bg-white object-contain"
              />
              <p className="mt-3 text-xs leading-relaxed text-ink/55">
                {shopConfig.bankAccountName}. Keep your payment screenshot.
              </p>
            </div>
          ) : null}

          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                Bill to
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {order.customerName}
              </p>
              <p className="text-sm text-ink/55">{order.phone || "—"}</p>
              {order.address ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink/55">
                  {order.address}
                </p>
              ) : null}
            </div>
            <div
              className={`rounded-xl px-4 py-3 sm:text-right ${
                due > 0 ? "bg-amber-50" : "bg-emerald-50"
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  due > 0 ? "text-amber-800/70" : "text-emerald-800/70"
                }`}
              >
                {due > 0 ? "Remaining due" : "Amount"}
              </p>
              <p
                className={`font-display text-3xl font-bold tabular-nums ${
                  due > 0 ? "text-amber-950" : "text-emerald-950"
                }`}
              >
                {formatNprFromInt(due > 0 ? due : order.total)}
              </p>
              {isOnline || order.paymentMethod ? (
                <p
                  className={`mt-0.5 text-xs ${
                    due > 0 ? "text-amber-800/70" : "text-emerald-800/70"
                  }`}
                >
                  {isOnline
                    ? checkoutPaymentLabel(checkoutMethod)
                    : paymentMethodLabel(
                        order.paymentMethod,
                        order.paymentNote,
                      )}{" "}
                  · {paymentStatusLabel(order.paymentStatus)}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-emerald-800/70">
                  Confirm on call
                </p>
              )}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold text-ink">Items</h2>
            <ul className="mt-2 divide-y divide-pine/10 border-y border-pine/10">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 py-3.5 text-sm"
                >
                  <span className="font-medium text-ink">
                    {item.name} × {item.quantity}
                    <span className="mt-0.5 block text-[11px] font-normal text-ink/40">
                      {formatNprFromInt(item.price)} each
                    </span>
                  </span>
                  <span className="font-bold tabular-nums text-pine">
                    {formatNprFromInt(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 text-sm">
              {(order.discountAmount > 0 || order.deliveryFee > 0) && (
                <div className="flex justify-between gap-3 text-ink/55">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatNprFromInt(lineSubtotal)}
                  </dd>
                </div>
              )}
              {order.discountAmount > 0 ? (
                <div className="flex justify-between gap-3 text-ink/55">
                  <dt>
                    Discount
                    {order.discountPercent > 0
                      ? ` (${order.discountPercent}%)`
                      : ""}
                  </dt>
                  <dd className="tabular-nums">
                    −{formatNprFromInt(order.discountAmount)}
                  </dd>
                </div>
              ) : null}
              {order.deliveryFee > 0 ? (
                <div className="flex justify-between gap-3 text-ink/55">
                  <dt>Delivery</dt>
                  <dd className="tabular-nums">
                    {formatNprFromInt(order.deliveryFee)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 border-t border-pine/10 pt-3">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="font-display text-3xl font-extrabold tabular-nums text-pine">
                  {formatNprFromInt(order.total)}
                </dd>
              </div>
              {paid > 0 && due > 0 ? (
                <div className="flex justify-between gap-3 text-emerald-700">
                  <dt>Paid</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatNprFromInt(paid)}
                  </dd>
                </div>
              ) : null}
              {due > 0 ? (
                <div className="flex justify-between gap-3 font-semibold text-amber-900">
                  <dt>Remaining due</dt>
                  <dd className="tabular-nums">{formatNprFromInt(due)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {isOnline ? (
            <LocalProductAvailabilityNotice className="mt-6 print:hidden" />
          ) : null}

          <div className="mt-8 flex flex-col gap-2 print:hidden sm:flex-row">
            <a
              href={callLink()}
              className="inline-flex min-h-12 flex-1 items-center justify-center bg-pine px-5 text-sm font-extrabold uppercase tracking-wide text-chalk transition hover:bg-leaf"
            >
              Call {shopConfig.phoneDisplay}
            </a>
            <Link
              href="/shop"
              className="inline-flex min-h-12 flex-1 items-center justify-center border border-pine/15 bg-white px-5 text-sm font-semibold text-pine transition hover:bg-pine/5"
            >
              Continue shopping
            </Link>
          </div>

          <footer className="mt-8 border-t border-pine/10 pt-4 text-xs text-ink/45">
            <p>
              Keep this statement for your records. Questions? Contact{" "}
              {shopConfig.name} at {shopConfig.phoneDisplay}.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
