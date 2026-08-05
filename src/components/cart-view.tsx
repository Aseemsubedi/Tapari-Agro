"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { placeOrderAction } from "@/app/actions";
import { useCart } from "@/components/cart-provider";
import { LocalProductAvailabilityNotice } from "@/components/local-product-availability-notice";
import { ProtectedProductImage } from "@/components/protected-product-image";
import { formatNpr, formatRate } from "@/lib/format";
import {
  customerDisplayCode,
  loadGuestProfile,
  rememberGuestOrder,
  saveGuestProfile,
} from "@/lib/guest-profile";
import { nepalDistrictsByProvince } from "@/lib/nepal-districts";
import {
  CHECKOUT_PAYMENT_OPTIONS,
  type CheckoutPaymentMethod,
} from "@/lib/orders";
import {
  callLink,
  shopBankDetailsConfigured,
  shopConfig,
  whatsappLink,
} from "@/lib/shop";

const fieldClass =
  "mt-1 min-h-11 w-full border border-pine/12 bg-white px-3 text-[15px] text-ink outline-none transition placeholder:text-ink/30 focus:border-pine";

export function CartView() {
  const router = useRouter();
  const formId = useId();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("cash");
  const [pending, startTransition] = useTransition();
  const bankReady = shopBankDetailsConfigured();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const profile = loadGuestProfile();
    if (profile?.remember) {
      setCustomerName(profile.customerName);
      setPhone(profile.phone);
      setDistrict(profile.district);
      setArea(profile.area);
      if (profile.customerCode) setSavedCode(profile.customerCode);
      if (profile.addresses?.length) setSavedAddresses(profile.addresses);
    }
    setProfileReady(true);
  }, []);

  function applySavedAddress(line: string) {
    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      setArea(parts.slice(0, -1).join(", "));
      setDistrict(parts[parts.length - 1] ?? "");
    } else if (parts.length === 1) {
      setArea(parts[0]);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg border border-dashed border-pine/15 bg-white px-6 py-16 text-center sm:px-10">
        <p className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Cart is empty
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink/50">
          Add staples from the shop. We pack to order and confirm by phone.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/shop"
            className="inline-flex min-h-12 items-center justify-center bg-pine px-8 text-sm font-extrabold uppercase tracking-wide text-chalk transition hover:bg-leaf"
          >
            Go to shop
          </Link>
          <a
            href={callLink()}
            className="inline-flex min-h-12 items-center justify-center border-2 border-pine/15 px-6 text-sm font-bold text-pine transition hover:border-pine"
          >
            फोन {shopConfig.phoneDisplay}
          </a>
        </div>
        <p className="mt-6 text-xs text-ink/40">
          <Link href="/my" className="font-semibold text-pine underline-offset-2 hover:underline">
            Saved details &amp; orders on this device
          </Link>
        </p>
      </div>
    );
  }

  const totalLabel = formatNpr(cart.totalPrice);
  const waMessage = [
    "Hello Tapari Agro — I'd like to order:",
    ...cart.items.map((item) => {
      const unit = item.unit?.trim() || "pack";
      const line = Number.parseFloat(item.price) * item.quantity;
      return `• ${item.name} (${unit}) × ${item.quantity} — ${formatNpr(line)}`;
    }),
    `Total: ${totalLabel}`,
    `Payment: ${CHECKOUT_PAYMENT_OPTIONS.find((o) => o.id === paymentMethod)?.label ?? paymentMethod}`,
    "",
    "Please confirm delivery. Thank you!",
  ].join("\n");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "items",
      JSON.stringify(
        cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      ),
    );
    formData.set("paymentMethod", paymentMethod);

    setError(null);
    startTransition(async () => {
      try {
        const result = await placeOrderAction(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (result?.orderId) {
          const code = result.customerId
            ? customerDisplayCode(result.customerId)
            : undefined;
          const delivery = [area, district].filter(Boolean).join(", ");
          // First order saves delivery address on this device (and updates later orders).
          saveGuestProfile({
            remember: true,
            customerName,
            phone,
            district,
            area,
            customerId: result.customerId ?? undefined,
            customerCode: code,
          });
          rememberGuestOrder({
            orderId: result.orderId,
            ref: `#${result.orderId.slice(0, 8)}`,
            customerName,
            phone,
            district,
            area,
            address: delivery,
            total: Number.parseFloat(cart.totalPrice) || 0,
            createdAt: new Date().toISOString(),
            customerId: result.customerId ?? undefined,
            customerCode: code,
          });
          clearCart();
          router.push(`/order/${result.orderId}`);
        }
      } catch {
        setError("Could not place order. Please try again.");
      }
    });
  }

  return (
    <div className="pb-28 lg:pb-0">
      <div className="mb-6 border border-brass/30 bg-brass/15 px-4 py-3 sm:px-5">
        <p className="text-center text-sm font-bold leading-snug text-pine sm:text-left sm:text-base">
          अर्डर गर्न अप्ठ्यारो छ? फोन गर्नुहोस्{" "}
          <a href={callLink()} className="underline underline-offset-2">
            {shopConfig.phoneDisplay}
          </a>{" "}
          — हामी सहयोग गर्छौं।
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12">
        <section aria-labelledby="cart-items-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2
                id="cart-items-heading"
                className="font-display text-xl font-extrabold tracking-tight text-ink"
              >
                Your items
              </h2>
              <p className="mt-0.5 text-[13px] text-ink/45">
                {cart.totalItems}{" "}
                {cart.totalItems === 1 ? "item" : "items"} in cart
              </p>
            </div>
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex min-h-11 items-center px-2 text-[12px] font-semibold text-ink/40 underline-offset-4 hover:text-pine hover:underline"
            >
              Clear all
            </button>
          </div>

          <ul className="divide-y divide-pine/10 border border-pine/10 bg-white">
            {cart.items.map((item) => {
              const lineTotal = Number.parseFloat(item.price) * item.quantity;
              const rate = formatRate(item.price, item.unit ?? "1 pack");
              const unit = item.unit?.trim() || "1 pack";

              return (
                <li key={item.key} className="flex gap-3 p-4 sm:gap-5 sm:p-5">
                  <Link
                    href={`/shop/${item.slug}`}
                    className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden bg-mist sm:h-28 sm:w-28"
                  >
                    {item.image ? (
                      <ProtectedProductImage
                        src={item.image}
                        alt={item.name}
                        fill
                        watermark="sm"
                        className="object-cover object-center"
                        sizes="112px"
                        quality={85}
                      />
                    ) : null}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/shop/${item.slug}`}
                          className="line-clamp-2 text-[15px] font-bold leading-snug text-ink hover:text-pine sm:text-base"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-[12px] font-medium text-ink/45">
                          {unit}
                        </p>
                        <p className="mt-0.5 text-[12px] tabular-nums text-ink/55">
                          {rate.prefix} {rate.amount} each
                        </p>
                      </div>
                      <p className="shrink-0 text-right leading-none">
                        <span className="text-[11px] font-bold text-ink">
                          Rs
                        </span>{" "}
                        <span className="text-xl font-extrabold tabular-nums text-ink">
                          {formatNpr(lineTotal).replace(/^Rs\s*/, "")}
                        </span>
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <div className="inline-flex h-11 items-center bg-pine text-chalk">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="flex h-11 w-11 items-center justify-center text-lg font-bold leading-none hover:bg-white/10"
                          onClick={() =>
                            updateQuantity(item.key, item.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-extrabold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="flex h-11 w-11 items-center justify-center text-lg font-bold leading-none hover:bg-white/10"
                          onClick={() =>
                            updateQuantity(item.key, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="inline-flex min-h-11 items-center px-2 text-[12px] font-semibold text-ink/40 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href="/shop"
            className="mt-5 inline-flex text-[13px] font-bold text-leaf underline-offset-4 hover:underline"
          >
            ← Continue shopping
          </Link>
        </section>

        <aside className="border border-pine/10 bg-white lg:sticky lg:top-24">
          <div className="border-b border-pine/10 bg-mist/60 px-5 py-4 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-leaf">
              Checkout
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-ink/55">Total</span>
              <p className="leading-none">
                <span className="text-sm font-bold text-pine">Rs</span>{" "}
                <span className="text-4xl font-extrabold tabular-nums tracking-tight text-pine">
                  {totalLabel.replace(/^Rs\s*/, "")}
                </span>
              </p>
            </div>
          </div>

          <form
            id={formId}
            onSubmit={handleSubmit}
            className="space-y-3 px-5 py-5 sm:px-6"
          >
            <p className="text-sm font-extrabold text-ink">Checkout</p>
            {profileReady && savedCode ? (
              <p className="text-[11px] text-ink/45">
                Welcome back · Tapari ID{" "}
                <span className="font-bold text-pine">{savedCode}</span>
                {" · "}
                <Link href="/my" className="underline-offset-2 hover:underline">
                  My saved orders
                </Link>
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-ink/55" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="customerName"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-ink/55" htmlFor="phone">
                  Mobile
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  required
                  autoComplete="tel"
                  placeholder="98xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  className="text-[11px] font-bold text-ink/55"
                  htmlFor="district"
                >
                  District
                </label>
                <select
                  id="district"
                  name="district"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    Select district
                  </option>
                  {nepalDistrictsByProvince.map((group) => (
                    <optgroup key={group.province} label={group.province}>
                      {group.districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-ink/55" htmlFor="area">
                  Area / tole
                </label>
                <input
                  id="area"
                  name="area"
                  required
                  autoComplete="street-address"
                  placeholder="Tole, landmark, ward…"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={fieldClass}
                />
              </div>
              {profileReady && savedAddresses.length > 0 ? (
                <div className="sm:col-span-2 space-y-1.5">
                  <p className="text-[11px] font-bold text-ink/55">
                    Saved addresses
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {savedAddresses.map((line) => (
                      <button
                        key={line}
                        type="button"
                        onClick={() => applySavedAddress(line)}
                        className="rounded-lg border border-pine/12 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-ink transition hover:border-pine hover:bg-mist/50"
                      >
                        {line}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <p className="rounded-lg border border-pine/10 bg-mist/40 px-3 py-2.5 text-[12px] leading-snug text-ink/55">
              Your <span className="font-bold text-ink">delivery address</span> is
              saved on this device when you place your first order — no password.
              Next checkout will autofill it.
            </p>

            <fieldset className="space-y-2 border-t border-pine/10 pt-4">
              <legend className="text-[11px] font-bold text-ink/55">
                Payment
              </legend>
              <input type="hidden" name="paymentMethod" value={paymentMethod} />
              <div className="space-y-2" role="radiogroup" aria-label="Payment">
                {CHECKOUT_PAYMENT_OPTIONS.map((opt) => {
                  const selected = paymentMethod === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer gap-3 border px-3 py-3 transition ${
                        selected
                          ? "border-pine bg-mist/50"
                          : "border-pine/12 bg-white hover:border-pine/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethodChoice"
                        value={opt.id}
                        checked={selected}
                        onChange={() => setPaymentMethod(opt.id)}
                        className="mt-1 accent-pine"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-ink">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-ink/45">
                          {opt.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {paymentMethod === "bank_qr" ? (
                <div className="border border-pine/10 bg-mist/40 px-3 py-3 text-[12px] leading-relaxed text-ink/60">
                  {shopConfig.qrImage ? (
                    <div className="mb-3 overflow-hidden rounded-xl border border-black/5 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shopConfig.qrImage}
                        alt="Fonepay QR — Tapari Agro Private Limited"
                        className="mx-auto h-auto w-full max-w-[220px] object-contain"
                      />
                    </div>
                  ) : null}
                  {bankReady ? (
                    <p>
                      Scan the Fonepay QR above to pay{" "}
                      <span className="font-semibold text-ink">
                        {shopConfig.bankAccountName || shopConfig.name}
                      </span>
                      . Keep the payment screenshot — we confirm on call.
                    </p>
                  ) : (
                    <p>
                      Place the order, then we&apos;ll send the QR on WhatsApp
                      or share it when we call to confirm.
                    </p>
                  )}
                </div>
              ) : null}

              {paymentMethod === "bank" ? (
                <div className="border border-pine/10 bg-mist/40 px-3 py-3 text-[12px] leading-relaxed text-ink/60">
                  {bankReady ? (
                    <dl className="space-y-1">
                      {shopConfig.bankName ? (
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-ink/45">Bank</dt>
                          <dd className="text-right font-semibold break-words text-ink">
                            {shopConfig.bankName}
                          </dd>
                        </div>
                      ) : null}
                      {shopConfig.bankAccountName ? (
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-ink/45">Account name</dt>
                          <dd className="text-right font-semibold break-words text-ink">
                            {shopConfig.bankAccountName}
                          </dd>
                        </div>
                      ) : null}
                      {shopConfig.bankAccountNumber ? (
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-ink/45">Account no.</dt>
                          <dd className="text-right font-semibold tabular-nums break-all text-ink">
                            {shopConfig.bankAccountNumber}
                          </dd>
                        </div>
                      ) : null}
                      <p className="pt-1 text-ink/50">
                        Use your name as the transfer remark. We confirm before
                        packing.
                      </p>
                    </dl>
                  ) : (
                    <p>
                      Place the order — we&apos;ll share bank account details
                      when we call to confirm.
                    </p>
                  )}
                </div>
              ) : null}
            </fieldset>

            {error ? (
              <p className="bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <LocalProductAvailabilityNotice />

            <button
              type="submit"
              disabled={pending}
              className="hidden min-h-12 w-full bg-brass text-sm font-extrabold uppercase tracking-[0.1em] text-pine transition hover:bg-brass/90 disabled:opacity-60 lg:block"
            >
              {pending ? "Placing…" : "Place order"}
            </button>

            <a
              href={whatsappLink(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-11 w-full items-center justify-center border border-pine/15 text-[13px] font-bold text-pine transition hover:border-pine lg:flex"
            >
              WhatsApp instead
            </a>

            <p className="text-[11px] leading-relaxed text-ink/40">
              {paymentMethod === "cash"
                ? `We call to confirm, then pack · pay on delivery · ${shopConfig.deliveryNote}`
                : `Pay first — we pack after payment is confirmed · ${shopConfig.deliveryNote}`}
            </p>
          </form>
        </aside>
      </div>

      {/* Mobile sticky checkout */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pine/10 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">
              Total
            </p>
            <p className="truncate text-lg font-extrabold tabular-nums text-pine">
              {totalLabel}
            </p>
          </div>
          <a
            href={whatsappLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 shrink-0 items-center border-2 border-pine/15 px-3 text-[11px] font-bold text-pine"
          >
            WA
          </a>
          <button
            type="submit"
            form={formId}
            disabled={pending}
            className="inline-flex h-12 shrink-0 items-center bg-brass px-5 text-[12px] font-extrabold uppercase tracking-wide text-pine disabled:opacity-60"
          >
            {pending ? "…" : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
