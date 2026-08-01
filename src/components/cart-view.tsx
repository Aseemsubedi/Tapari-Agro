"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrderAction } from "@/app/actions";
import { useCart } from "@/components/cart-provider";
import { formatNpr } from "@/lib/format";
import { whatsappLink } from "@/lib/shop";

export function CartView() {
  const router = useRouter();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (cart.items.length === 0) {
    return (
      <div className="py-10">
        <p className="font-display text-2xl text-ink">Your bag is empty</p>
        <p className="mt-2 text-sm text-ink/50">
          Return to the atelier and choose a few pieces.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex min-h-12 items-center border border-pine/15 px-8 text-sm font-medium tracking-wide text-pine transition hover:border-brass"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  const waMessage = `Hello Tapari Agro — I'd like to order:\n${cart.items
    .map((item) => `• ${item.name} x${item.quantity}`)
    .join("\n")}\nTotal: ${formatNpr(cart.totalPrice)}`;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

    setError(null);
    startTransition(async () => {
      try {
        const result = await placeOrderAction(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (result?.orderId) {
          clearCart();
          router.push(`/order/${result.orderId}`);
        }
      } catch {
        setError("Could not place order. Please try again.");
      }
    });
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-pine/10">
        {cart.items.map((item) => (
          <li key={item.key} className="flex gap-4 py-6 first:pt-0">
            <div className="relative h-28 w-24 shrink-0 overflow-hidden bg-mist">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/shop/${item.slug}`}
                  className="font-display text-lg font-semibold tracking-tight text-ink hover:underline"
                >
                  {item.name}
                </Link>
                <p className="shrink-0 text-sm font-medium tabular-nums text-pine">
                  {formatNpr(Number.parseFloat(item.price) * item.quantity)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center border border-pine/15">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center text-pine"
                    onClick={() =>
                      updateQuantity(item.key, Math.max(1, item.quantity - 1))
                    }
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center text-pine"
                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="text-sm text-ink/40 transition hover:text-ink"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit border-t border-pine/10 pt-6 lg:border-t-0 lg:border-l lg:border-pine/10 lg:pl-8 lg:pt-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-leaf">
          Total
        </p>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
          {formatNpr(cart.totalPrice)}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <p className="text-sm font-medium text-ink">Delivery details</p>
          <div>
            <label className="text-xs text-ink/55" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="customerName"
              required
              autoComplete="name"
              className="mt-1.5 min-h-11 w-full border border-pine/15 bg-chalk px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink/55" htmlFor="phone">
              Mobile number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="98xxxxxxxx"
              className="mt-1.5 min-h-11 w-full border border-pine/15 bg-chalk px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink/55" htmlFor="address">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              required
              rows={3}
              placeholder="Area, landmark, city…"
              className="mt-1.5 w-full border border-pine/15 bg-chalk px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink/55" htmlFor="notes">
              Note (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="mt-1.5 w-full border border-pine/15 bg-chalk px-3 py-2.5 text-sm"
            />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="min-h-12 w-full bg-brass text-sm font-semibold tracking-wide text-pine transition hover:bg-brass/90 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Place order"}
          </button>
          <a
            href={whatsappLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center border border-pine/15 text-sm font-medium text-pine transition hover:border-brass"
          >
            Or WhatsApp this bag
          </a>
          <p className="text-xs leading-relaxed text-ink/45">
            Cash on delivery or bank transfer. We confirm by phone before
            packing.
          </p>
        </form>
      </aside>
    </div>
  );
}
