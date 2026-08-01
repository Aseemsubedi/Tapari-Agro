import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Bag",
};

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-28 pt-28 sm:px-8 sm:pb-28 sm:pt-32">
      <header className="mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-leaf">
          Your bag
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Review & order
        </h1>
      </header>
      <CartView />
    </div>
  );
}
