import { CartSuggestions } from "@/components/cart-suggestions";
import { CartView } from "@/components/cart-view";
import { getProducts } from "@/lib/catalog";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Cart",
  description: "Review your Tapari Agro cart and place an order.",
  path: "/cart",
  noIndex: true,
});

export default async function CartPage() {
  const products = await getProducts();

  return (
    <div className="bg-[#f6f7f9]">
      <header className="border-b border-pine/8 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 sm:py-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-leaf">
            Your cart
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Review & order
          </h1>
          <p className="mt-2 max-w-lg text-sm text-ink/50">
            Confirm items and delivery — or WhatsApp the order if that is easier.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 sm:py-10">
        <CartView />
      </div>

      <CartSuggestions products={products} />
    </div>
  );
}
