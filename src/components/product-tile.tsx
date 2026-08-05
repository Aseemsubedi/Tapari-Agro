"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { ProtectedProductImage } from "@/components/protected-product-image";
import type { Product } from "@/lib/types";
import { formatRate } from "@/lib/format";

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2l2 1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductTile({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { cart, addItem, updateQuantity, isPending } = useCart();
  const [imgBroken, setImgBroken] = useState(false);
  const image = product.images[0];
  const outOfStock = product.stockStatus === "outofstock";
  const rate = formatRate(product.price, product.unit);
  const unit = product.unit?.trim() || "1 pack";
  const line = cart.items.find((item) => item.productId === product.id);
  const qty = line?.quantity ?? 0;
  const showImage = Boolean(image?.src) && !imgBroken;

  function handleAdd(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock || isPending) return;
    addItem(product, 1);
  }

  function handleDec(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!line || isPending) return;
    updateQuantity(line.key, line.quantity - 1);
  }

  function handleInc(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!line || isPending) return;
    updateQuantity(line.key, line.quantity + 1);
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-pine/10 bg-white shadow-[0_1px_3px_rgba(16,36,24,0.06)] transition hover:border-pine/20 hover:shadow-[0_4px_14px_rgba(16,36,24,0.08)]">
      <Link
        href={`/shop/${product.slug}`}
        className="flex min-w-0 flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-mist">
          {showImage ? (
            <ProtectedProductImage
              src={image!.src}
              alt={image!.alt}
              fill
              priority={priority}
              watermark="md"
              className="object-cover object-center transition duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
              quality={90}
              onError={() => setImgBroken(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-mist to-sage/40 px-3 text-center">
              <span className="line-clamp-3 text-[11px] font-bold leading-snug text-pine/50">
                {product.name}
              </span>
            </div>
          )}
          {outOfStock ? (
            <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-chalk">
              Sold out
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-mist px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink/55">
            <ClockIcon className="h-3 w-3" />
            Packed to order
          </span>

          <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug tracking-tight text-ink sm:min-h-[2.75rem] sm:text-sm">
            {product.name}
          </h3>

          <p className="mt-1 text-[12px] font-medium text-ink/45 sm:text-[13px]">
            {unit}
          </p>

          <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
            <p className="min-w-0 leading-none">
              <span className="text-[13px] font-bold text-ink sm:text-sm">
                {rate.prefix}
              </span>{" "}
              <span className="text-lg font-extrabold tabular-nums tracking-tight text-ink sm:text-2xl">
                {rate.amount}
              </span>
            </p>

            {outOfStock ? (
              <span className="inline-flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-lg border border-pine/15 px-2 text-[12px] font-bold uppercase tracking-wide text-ink/35">
                —
              </span>
            ) : qty > 0 && line ? (
              <div
                className="inline-flex h-11 w-full min-w-[5.75rem] items-center justify-between rounded-lg bg-pine text-chalk sm:w-auto"
                onClick={(e) => e.preventDefault()}
              >
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={isPending}
                  onClick={handleDec}
                  className="flex h-11 w-11 items-center justify-center text-xl font-bold leading-none transition hover:bg-white/10 disabled:opacity-50"
                >
                  −
                </button>
                <span className="min-w-[1.35rem] text-center text-sm font-bold tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={isPending}
                  onClick={handleInc}
                  className="flex h-11 w-11 items-center justify-center text-xl font-bold leading-none transition hover:bg-white/10 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={handleAdd}
                className="inline-flex h-11 w-full min-w-[4.75rem] items-center justify-center rounded-lg border-[1.5px] border-leaf bg-white px-3.5 text-[13px] font-extrabold uppercase tracking-wide text-leaf transition hover:bg-leaf/10 disabled:opacity-50 sm:w-auto sm:text-sm"
              >
                Add
              </button>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
