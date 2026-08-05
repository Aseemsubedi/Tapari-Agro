"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { addItem, isPending } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stockStatus === "outofstock";

  function handleClick() {
    if (outOfStock) return;
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={outOfStock || isPending}
        className="min-h-11 w-full bg-pine px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-chalk transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[12rem]"
      >
        {outOfStock ? "Sold out" : added ? "Added ✓" : "Add to cart"}
      </button>
      {added ? (
        <Link
          href="/cart"
          className="inline-flex min-h-10 items-center justify-center border border-pine/15 px-4 text-[12px] font-semibold tracking-wide text-pine transition hover:border-brass hover:bg-brass/10 sm:justify-start"
        >
          View cart
        </Link>
      ) : null}
    </div>
  );
}
