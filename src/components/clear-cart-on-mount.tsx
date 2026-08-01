"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

export function ClearCartOnMount() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, []);

  return null;
}
