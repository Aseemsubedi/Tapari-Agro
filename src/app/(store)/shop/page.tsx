import type { Metadata } from "next";
import { ShopBrowser } from "@/components/shop-browser";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Organic spices, grains, honey and oils from the hills — Tapari Agro.",
};

type Props = {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    price?: string;
    stock?: string;
  }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const { category, sort, price, stock } = await searchParams;
  const products = await getProducts();

  return (
    <div className="pb-28">
      <header className="border-b border-pine/8 bg-mist">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-leaf">
            Organic shop
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-pine sm:text-5xl">
            Shop
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/55">
            Fresh staples from Parbat, Myagdi &amp; Mustang — packed to order,
            priced in NPR.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-8 sm:pt-10">
        <ShopBrowser
          products={products}
          initialCategory={category ?? "All"}
          initialSort={sort}
          initialPrice={price}
          initialStock={stock}
        />
      </div>
    </div>
  );
}
