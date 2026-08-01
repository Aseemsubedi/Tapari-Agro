"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { Cart, CartItem, Product } from "@/lib/types";

type CartContextValue = {
  cart: Cart;
  isPending: boolean;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "tapari-agro-cart";

const emptyCart: Cart = {
  items: [],
  totalItems: 0,
  totalPrice: "0",
};

function summarize(items: CartItem[]): Cart {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items
    .reduce(
      (sum, item) => sum + Number.parseFloat(item.price) * item.quantity,
      0,
    )
    .toString();
  return { items, totalItems, totalPrice };
}

function loadCart(): Cart {
  if (typeof window === "undefined") return emptyCart;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCart;
    const parsed = JSON.parse(raw) as Cart;
    return summarize(parsed.items ?? []);
  } catch {
    return emptyCart;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [ready, setReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCart(loadCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  function commit(next: Cart) {
    startTransition(() => {
      setCart(next);
    });
  }

  function addItem(product: Product, quantity = 1) {
    const existing = cart.items.find((item) => item.productId === product.id);
    const items = existing
      ? cart.items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      : [
          ...cart.items,
          {
            key: `local-${product.id}`,
            productId: product.id,
            name: product.name,
            quantity,
            price: product.price,
            image: product.images[0]?.src,
            slug: product.slug,
          },
        ];
    commit(summarize(items));
  }

  function updateQuantity(key: string, quantity: number) {
    const items =
      quantity <= 0
        ? cart.items.filter((item) => item.key !== key)
        : cart.items.map((item) =>
            item.key === key ? { ...item, quantity } : item,
          );
    commit(summarize(items));
  }

  function removeItem(key: string) {
    commit(summarize(cart.items.filter((item) => item.key !== key)));
  }

  function clearCart() {
    commit(emptyCart);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        isPending,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
