"use client";

import { SuggestedProducts } from "@/components/suggested-products";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/types";

export function CartSuggestions({ products }: { products: Product[] }) {
  const { cart } = useCart();
  const inCart = cart.items.map((item) => item.productId);

  return (
    <SuggestedProducts
      products={products}
      excludeIds={inCart}
      title="Suggested products"
    />
  );
}
