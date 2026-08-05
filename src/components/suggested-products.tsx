import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import type { Product } from "@/lib/types";

export function SuggestedProducts({
  products,
  title = "Suggested products",
  excludeIds = [],
}: {
  products: Product[];
  title?: string;
  excludeIds?: string[];
}) {
  const exclude = new Set(excludeIds);
  const seen = new Set<string>();
  const list: Product[] = [];

  for (const product of products) {
    const key = product.slug || product.id;
    if (exclude.has(product.id) || seen.has(key)) continue;
    seen.add(key);
    list.push(product);
  }

  if (list.length === 0) return null;

  return (
    <section className="border-t border-pine/8 bg-[#f6f7f9]">
      <div className="mx-auto w-full max-w-5xl py-10 sm:px-8 sm:py-12">
        <div className="mb-6 flex items-end justify-between gap-3 px-4 sm:px-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brass">
              For you
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {title}
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-[13px] font-bold text-leaf underline-offset-4 hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 lg:gap-5 [&::-webkit-scrollbar]:hidden">
          {list.map((product, index) => (
            <div
              key={product.id}
              className="w-[42vw] max-w-[11.5rem] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
            >
              <ProductTile product={product} priority={index < 4} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
