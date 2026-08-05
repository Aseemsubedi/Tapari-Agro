import Link from "next/link";
import { notFound } from "next/navigation";
import { markSupplierStockReceivedAction } from "@/app/actions";
import { AdminSubmit } from "@/components/admin-ui";
import {
  CollectDueForm,
  ConfirmPrepaidPay,
  SetCreditBillForm,
} from "@/components/order-payment-update-form";
import {
  OrderCancelButton,
  OrderFulfillButtons,
  OrderStatusUpdateForm,
} from "@/components/order-fulfill-buttons";
import { OrderReceiptShare } from "@/components/order-receipt-share";
import { prisma } from "@/lib/db";
import { orderReceiptMessage } from "@/lib/order-receipt";
import {
  awaitsPaymentBeforeFulfill,
  canShipDigitalOrder,
  checkoutIntentBadge,
  checkoutPaymentLabel,
  customerWhatsAppHref,
  formatOrderWhen,
  isCollectMethod,
  orderCheckoutMethod,
  orderContactMessage,
  orderNeedsSupplierStock,
  orderPaymentDue,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

function StepCard({
  n,
  title,
  active,
  done,
  children,
}: {
  n: number;
  title: string;
  active?: boolean;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`rounded-2xl px-4 py-4 sm:px-5 ${
        active
          ? "bg-gradient-to-br from-pine/[0.08] via-mist/50 to-brass/10 ring-1 ring-pine/15"
          : done
            ? "bg-[#f7f9f6]"
            : "bg-white/60 ring-1 ring-black/[0.04]"
      }`}
    >
      <div className="flex gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            active
              ? "bg-pine text-white"
              : done
                ? "bg-leaf text-white"
                : "bg-ink/10 text-ink/45"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-ink">{title}</p>
          <div className="mt-2.5">{children}</div>
        </div>
      </div>
    </li>
  );
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  const isOffline = order.channel === "offline";
  const due = orderPaymentDue(order);
  const customerTel = order.phone.replace(/\s+/g, "");
  const receiptUrl = `${getSiteUrl()}/order/${order.id}`;
  const receiptMessage = orderReceiptMessage(order, {
    includeLink: receiptUrl,
  });
  const waHref = order.phone.trim()
    ? customerWhatsAppHref(order.phone, orderContactMessage(order))
    : null;
  const paidAmount =
    order.paymentStatus === "paid"
      ? order.total
      : Math.max(0, order.amountPaid);
  const cancelled = order.status === "cancelled";
  const finished = order.status === "completed" && due <= 0;
  const awaitsPayment = awaitsPaymentBeforeFulfill(order);
  const checkoutMethod = orderCheckoutMethod(order);
  const needsSupplier = orderNeedsSupplierStock(order.items);
  const canShip = canShipDigitalOrder(order);

  const productIds = order.items.map((i) => i.productId);
  const sellerIds = [
    ...new Set(
      order.items
        .map((i) => i.vendorId)
        .filter((vid): vid is string => Boolean(vid)),
    ),
  ];
  const [products, sellers, customers] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, slug: true },
    }),
    sellerIds.length > 0
      ? prisma.vendor.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, name: true, phone: true, address: true },
        })
      : Promise.resolve([]),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      take: 400,
      select: { id: true, name: true, phone: true, address1: true },
    }),
  ]);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));
  const sellerById = Object.fromEntries(sellers.map((s) => [s.id, s]));

  const digitalBySeller = new Map<
    string,
    {
      name: string;
      phone: string;
      address: string;
      lines: { id: string; name: string; digitalQty: number; payout: number }[];
    }
  >();
  for (const item of order.items) {
    if (item.digitalQty <= 0) continue;
    const key = item.vendorId || "_unknown";
    const seller = item.vendorId ? sellerById[item.vendorId] : null;
    const line = {
      id: item.id,
      name: item.name,
      digitalQty: item.digitalQty,
      payout: item.digitalQty * item.sellerUnitCost,
    };
    const existing = digitalBySeller.get(key);
    if (existing) existing.lines.push(line);
    else {
      digitalBySeller.set(key, {
        name: seller?.name ?? "Unknown supplier",
        phone: seller?.phone ?? "",
        address: seller?.address ?? "",
        lines: [line],
      });
    }
  }

  const sellerPayoutTotal = order.items.reduce(
    (s, i) => s + i.digitalQty * i.sellerUnitCost,
    0,
  );

  const showPayStep = awaitsPayment && !cancelled;
  const showConfirmStep =
    !awaitsPayment &&
    !cancelled &&
    !isOffline &&
    order.status === "pending";
  const showSupplierStep =
    !awaitsPayment &&
    !cancelled &&
    needsSupplier &&
    (order.status === "confirmed" ||
      order.status === "shipped" ||
      order.status === "completed");
  const showPackStep =
    !awaitsPayment &&
    !cancelled &&
    !isOffline &&
    order.status === "confirmed";
  const showCompleteStep =
    !cancelled && !isOffline && order.status === "shipped";
  const showCollectDue =
    !awaitsPayment && !cancelled && due > 0 && order.status !== "pending";

  let stepN = 1;

  return (
    <div className="mx-auto max-w-xl animate-rise">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-ink/45 hover:text-ink"
        >
          ← Orders
        </Link>
        <p className="text-xs text-ink/35">
          {isOffline ? "Offline" : "Online"} · {formatOrderWhen(order.createdAt)}
        </p>
      </div>

      {error ? (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <article className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,36,24,0.04)]">
        <header className="relative overflow-hidden border-b border-black/[0.05] bg-gradient-to-br from-mist/80 via-white to-chalk px-5 pb-5 pt-5 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-brass/15 blur-2xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
                {order.customerName}
              </h2>
              {order.phone ? (
                <p className="mt-1.5 text-sm text-ink/55">
                  <a
                    href={`tel:${customerTel}`}
                    className="font-medium text-ink/70 hover:text-pine"
                  >
                    {order.phone}
                  </a>
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-ink/40">No phone</p>
              )}
              {!isOffline ? (
                <p className="mt-2 inline-flex rounded-md bg-pine/10 px-2 py-0.5 text-[11px] font-semibold text-pine">
                  {checkoutIntentBadge(checkoutMethod)}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold tabular-nums tracking-tight text-ink">
                {formatNprFromInt(order.total)}
              </p>
              <p
                className={`mt-0.5 text-sm font-semibold ${
                  due > 0 ? "text-amber-800" : "text-emerald-700"
                }`}
              >
                {due > 0
                  ? `Due ${formatNprFromInt(due)}`
                  : paymentStatusLabel(order.paymentStatus)}
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            {order.phone ? (
              <a
                href={`tel:${customerTel}`}
                className="inline-flex items-center rounded-xl bg-pine px-3.5 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Call customer
              </a>
            ) : null}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl border border-black/10 bg-white/80 px-3.5 py-2 text-sm font-semibold text-ink backdrop-blur hover:bg-white"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        </header>

        {finished ? (
          <section className="border-b border-black/[0.05] bg-emerald-50/50 px-5 py-4 sm:px-6">
            <p className="font-display text-lg font-bold text-emerald-900">
              All clear
            </p>
            <p className="text-sm text-emerald-800/70">
              Order completed and paid.
            </p>
          </section>
        ) : cancelled ? (
          <section className="border-b border-black/[0.05] bg-red-50/80 px-5 py-4 sm:px-6">
            <p className="font-display text-lg font-bold text-red-900">
              Cancelled
            </p>
            <p className="text-sm text-red-800/70">
              Stock restored. Nothing left to do.
            </p>
          </section>
        ) : (
          <section className="border-b border-black/[0.05] px-5 py-5 sm:px-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">
              Run sheet
            </p>
            <ol className="space-y-3">
              {showPayStep ? (
                <StepCard
                  n={stepN++}
                  title={`Confirm ${checkoutPaymentLabel(checkoutMethod).toLowerCase()}`}
                  active
                >
                  <ConfirmPrepaidPay
                    orderId={order.id}
                    total={order.total}
                    checkoutMethod={checkoutMethod}
                    redirectTo={`/admin/orders/${order.id}`}
                  />
                </StepCard>
              ) : null}

              {showConfirmStep ? (
                <StepCard n={stepN++} title="Confirm order" active>
                  <p className="mb-3 text-sm text-ink/55">
                    Payment clear. Call the customer, then confirm to pack.
                  </p>
                  <OrderFulfillButtons
                    orderId={order.id}
                    status={order.status}
                    prominent
                  />
                </StepCard>
              ) : order.status !== "pending" &&
                !cancelled &&
                !isOffline &&
                !awaitsPayment ? (
                <StepCard n={stepN++} title="Confirm order" done>
                  <p className="text-sm text-ink/45">Confirmed</p>
                </StepCard>
              ) : null}

              {showSupplierStep ? (
                <StepCard
                  n={stepN++}
                  title="Collect from supplier"
                  active={
                    order.status === "confirmed" && !order.supplierStockReceived
                  }
                  done={order.supplierStockReceived}
                >
                  <ul className="space-y-3">
                    {[...digitalBySeller.entries()].map(([key, group]) => {
                      const digits = group.phone.replace(/\D/g, "");
                      const payout = group.lines.reduce(
                        (s, l) => s + l.payout,
                        0,
                      );
                      return (
                        <li key={key} className="rounded-xl bg-white/80 px-3 py-3">
                          {key !== "_unknown" ? (
                            <Link
                              href={`/admin/suppliers/${key}`}
                              className="font-semibold text-pine hover:underline"
                            >
                              {group.name}
                            </Link>
                          ) : (
                            <p className="font-semibold text-ink">
                              {group.name}
                            </p>
                          )}
                          {group.phone ? (
                            <p className="mt-1 text-sm text-ink/60">
                              <a
                                href={`tel:${group.phone.replace(/\s+/g, "")}`}
                                className="font-medium hover:text-pine"
                              >
                                {group.phone}
                              </a>
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-ink/35">No phone</p>
                          )}
                          {group.address ? (
                            <p className="mt-1 text-sm leading-snug text-ink/55 whitespace-pre-wrap">
                              {group.address}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-ink/35">
                              No address on file
                            </p>
                          )}
                          <p className="mt-2 text-sm text-ink/55">
                            {group.lines
                              .map((l) => `${l.name} ×${l.digitalQty}`)
                              .join(" · ")}
                          </p>
                          {payout > 0 ? (
                            <p className="mt-1 text-xs text-ink/40">
                              ~{formatNprFromInt(payout)} to pay
                            </p>
                          ) : null}
                          {digits.length >= 7 ? (
                            <div className="mt-2 flex gap-1.5">
                              <a
                                href={`tel:${digits}`}
                                className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold"
                              >
                                Call
                              </a>
                              <a
                                href={customerWhatsAppHref(
                                  group.phone,
                                  `Namaste ${group.name}, Tapari Agro order #${order.id.slice(0, 8)} — please prepare: ${group.lines
                                    .map((l) => `${l.name} ×${l.digitalQty}`)
                                    .join(", ")}.`,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-pine px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                WhatsApp
                              </a>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {!order.supplierStockReceived &&
                  order.status === "confirmed" ? (
                    <form
                      action={markSupplierStockReceivedAction}
                      className="mt-3"
                    >
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="received" value="true" />
                      <input
                        type="hidden"
                        name="redirectTo"
                        value={`/admin/orders/${order.id}`}
                      />
                      <AdminSubmit className="w-full sm:w-auto">
                        Mark stock received
                      </AdminSubmit>
                    </form>
                  ) : order.supplierStockReceived ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-emerald-800">
                        Supplier stock received
                      </p>
                      <form action={markSupplierStockReceivedAction}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="received" value="false" />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={`/admin/orders/${order.id}`}
                        />
                        <AdminSubmit size="sm" variant="secondary">
                          Undo
                        </AdminSubmit>
                      </form>
                    </div>
                  ) : null}
                </StepCard>
              ) : null}

              {showPackStep ? (
                <StepCard
                  n={stepN++}
                  title="Pack & deliver to customer"
                  active={canShip}
                >
                  <div className="mb-3 rounded-xl bg-white/80 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/35">
                      Deliver to
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                      {order.customerName}
                    </p>
                    {order.address ? (
                      <p className="mt-1 text-sm leading-snug text-ink/60 whitespace-pre-wrap">
                        {order.address}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-ink/40">No address</p>
                    )}
                    {order.notes ? (
                      <p className="mt-2 text-sm text-ink/45 italic">
                        “{order.notes}”
                      </p>
                    ) : null}
                  </div>
                  {needsSupplier && !canShip ? (
                    <p className="mb-3 text-sm text-amber-800">
                      Mark supplier stock received above before shipping.
                    </p>
                  ) : (
                    <OrderFulfillButtons
                      orderId={order.id}
                      status={order.status}
                      prominent
                    />
                  )}
                </StepCard>
              ) : null}

              {showCompleteStep ? (
                <StepCard n={stepN++} title="Complete delivery" active>
                  <p className="mb-3 text-sm text-ink/55">
                    Delivered? Mark done
                    {due > 0
                      ? ` · still due ${formatNprFromInt(due)}`
                      : ""}.
                  </p>
                  <OrderFulfillButtons
                    orderId={order.id}
                    status={order.status}
                    prominent
                  />
                </StepCard>
              ) : null}

              {showCollectDue ? (
                <StepCard
                  n={stepN++}
                  title="Collect due"
                  active={due > 0}
                  done={due <= 0}
                >
                  <p className="mb-2 text-sm text-ink/50">
                    Paid{" "}
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      {formatNprFromInt(paidAmount)}
                    </span>
                    {" / "}
                    Due{" "}
                    <span className="font-semibold text-amber-800 tabular-nums">
                      {formatNprFromInt(due)}
                    </span>
                    {order.paymentMethod ? (
                      <>
                        {" · "}
                        {order.paymentMethod === "credit"
                          ? "Credit"
                          : order.paymentMethod === "cash"
                            ? "COD"
                            : paymentMethodLabel(
                                order.paymentMethod,
                                order.paymentNote,
                              )}
                      </>
                    ) : null}
                  </p>
                  {due > 0 ? (
                    <div className="space-y-4">
                      <CollectDueForm
                        orderId={order.id}
                        amountPaid={order.amountPaid}
                        total={order.total}
                        defaultMethod={
                          isCollectMethod(order.paymentMethod)
                            ? order.paymentMethod
                            : "cash"
                        }
                        defaultNote={order.paymentNote}
                        redirectTo={`/admin/orders/${order.id}`}
                      />
                      <details className="text-sm">
                        <summary className="cursor-pointer font-semibold text-ink/50">
                          Or set as credit bill
                        </summary>
                        <div className="mt-2">
                          <SetCreditBillForm
                            orderId={order.id}
                            customers={customers}
                            defaultCustomerName={order.customerName}
                            defaultPhone={order.phone}
                            redirectTo={`/admin/orders/${order.id}`}
                          />
                        </div>
                      </details>
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-800">Paid in full</p>
                  )}
                </StepCard>
              ) : null}
            </ol>
          </section>
        )}

        {/* Pack list */}
        <section className="px-5 py-5 sm:px-6">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">
              Items
            </h3>
            <span className="text-xs text-ink/35">
              {order.items.reduce((s, i) => s + i.quantity, 0)} units
            </span>
          </div>
          <ul className="space-y-3">
            {order.items.map((item) => {
              const product = productById[item.productId];
              const seller = item.vendorId ? sellerById[item.vendorId] : null;
              return (
                <li
                  key={item.id}
                  className="rounded-2xl bg-[#f7f9f6] px-3.5 py-3 sm:px-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {product ? (
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-semibold text-ink hover:text-pine"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink">
                          {item.name}
                        </span>
                      )}
                      <p className="mt-0.5 text-sm text-ink/45">
                        {item.quantity} × {formatNprFromInt(item.price)}
                      </p>
                      {(item.ownedQty > 0 || item.digitalQty > 0) && (
                        <p className="mt-2 text-xs text-ink/50">
                          {item.ownedQty > 0 ? (
                            <span>Your shelf ×{item.ownedQty}</span>
                          ) : null}
                          {item.ownedQty > 0 && item.digitalQty > 0 ? (
                            <span> · </span>
                          ) : null}
                          {item.digitalQty > 0 ? (
                            <span>
                              From{" "}
                              {seller ? (
                                <Link
                                  href={`/admin/suppliers/${item.vendorId}`}
                                  className="font-semibold text-pine hover:underline"
                                >
                                  {seller.name}
                                </Link>
                              ) : (
                                "supplier"
                              )}{" "}
                              ×{item.digitalQty}
                            </span>
                          ) : null}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-ink">
                      {formatNprFromInt(item.price * item.quantity)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {(order.discountAmount ?? 0) > 0 || (order.deliveryFee ?? 0) > 0 ? (
            <div className="mt-3 space-y-0.5 text-xs text-ink/45">
              {(order.discountAmount ?? 0) > 0 ? (
                <p className="text-amber-800">
                  Discount −{formatNprFromInt(order.discountAmount)}
                </p>
              ) : null}
              {(order.deliveryFee ?? 0) > 0 ? (
                <p>Delivery +{formatNprFromInt(order.deliveryFee)}</p>
              ) : null}
            </div>
          ) : null}

          {sellerPayoutTotal > 0 ? (
            <p className="mt-3 text-xs text-ink/40">
              Seller payout ~ {formatNprFromInt(sellerPayoutTotal)}
              {" · "}
              <Link
                href="/admin/payments?view=sellers"
                className="font-semibold text-pine hover:underline"
              >
                Pay sellers
              </Link>
            </p>
          ) : null}
        </section>

        <details className="border-t border-black/[0.05] bg-[#fafbfc]">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-sm text-ink/40 marker:content-none sm:px-6 [&::-webkit-details-marker]:hidden">
            More — share, status, cancel
            {order.phone ? " · customer" : ""}
          </summary>
          <div className="space-y-5 border-t border-black/[0.05] px-5 py-4 sm:px-6">
            {order.phone ? (
              <Link
                href={`/admin/customers?q=${encodeURIComponent(order.phone)}`}
                className="inline-flex text-sm font-semibold text-pine hover:underline"
              >
                Open in customers →
              </Link>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Share</p>
              <OrderReceiptShare
                message={receiptMessage}
                phone={order.phone}
                toCustomer
              />
              <p className="mt-2">
                <a
                  href={`/order/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-pine hover:underline"
                >
                  Statement page →
                </a>
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Jump status</p>
              <OrderStatusUpdateForm
                orderId={order.id}
                status={order.status}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Cancel</p>
              <OrderCancelButton orderId={order.id} status={order.status} />
            </div>
          </div>
        </details>
      </article>
    </div>
  );
}
