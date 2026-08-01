"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/types";
import { formatRate } from "@/lib/format";

export function ProductTile({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { addItem, isPending } = useCart();
  const [added, setAdded] = useState(false);
  const image = product.images[0];
  const outOfStock = product.stockStatus === "outofstock";
  const category = product.categories[0]?.name;
  const rate = formatRate(product.price, product.unit);

  function handleAdd() {
    if (outOfStock) return;
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="group flex h-full flex-col">
      <Link
        href={`/shop/${product.slug}`}
        className="flex min-w-0 flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-mist ring-1 ring-pine/10 transition group-hover:ring-brass/40">
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={priority}
              className="object-cover object-center transition duration-700 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
            />
          ) : null}
          {category ? (
            <span className="absolute left-2 top-2 bg-chalk/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-pine backdrop-blur-sm">
              {category}
            </span>
          ) : null}
          {outOfStock ? (
            <span className="absolute inset-x-0 bottom-0 bg-pine/85 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-chalk">
              Sold out
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="line-clamp-2 font-display text-[0.95rem] font-semibold leading-snug tracking-tight text-ink transition group-hover:text-leaf sm:text-base">
            {product.name}
          </h3>
          <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-display text-2xl font-extrabold leading-none tracking-tight text-pine tabular-nums sm:text-[1.75rem]">
              {rate.amount}
            </span>
            {rate.unitLabel ? (
              <span className="text-[13px] font-semibold tracking-wide text-ink/55 sm:text-sm">
                {rate.unitLabel}
              </span>
            ) : null}
          </p>
        </div>
      </Link>

      <button
        type="button"
        disabled={outOfStock || isPending}
        onClick={handleAdd}
        className="mt-3 min-h-10 w-full bg-pine text-[11px] font-bold uppercase tracking-[0.12em] text-chalk transition hover:bg-leaf active:bg-pine/90 disabled:cursor-not-allowed disabled:bg-pine/30 sm:min-h-11 sm:text-[12px]"
      >
        {outOfStock ? "Sold out" : added ? "Added ✓" : "Add to bag"}
      </button>
    </article>
  );
}
