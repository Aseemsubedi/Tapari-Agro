"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartToast() {
  const { notice, cart, clearNotice } = useCart();

  if (!notice) return null;

  return (
    <div
      key={notice.id}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ top: "calc(var(--store-header-h, 6.5rem) + 0.5rem)" }}
    >
      <div className="pointer-events-auto animate-cart-toast flex max-w-md items-center gap-3 border border-pine/15 bg-pine px-4 py-3 text-chalk shadow-[0_12px_40px_rgba(16,36,24,0.25)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-brass text-sm font-extrabold text-pine">
          +{notice.quantity}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brass">
            Added to cart
          </p>
          <p className="truncate text-sm font-semibold leading-snug">
            {notice.name}
          </p>
        </div>
        <Link
          href="/cart"
          onClick={clearNotice}
          className="shrink-0 bg-brass px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-pine transition hover:bg-chalk"
        >
          View ({cart.totalItems})
        </Link>
      </div>
    </div>
  );
}
