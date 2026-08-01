import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import type { Product } from "@/lib/types";

const PREVIEW_COUNT = 6;

export function HomeShop({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <section id="shop" className="px-4 py-14 text-center sm:px-8">
        <p className="text-sm text-ink/45">Products are being prepared.</p>
      </section>
    );
  }

  const preview = products.slice(0, PREVIEW_COUNT);
  const hasMore = products.length > PREVIEW_COUNT;

  return (
    <section id="shop" className="scroll-mt-24 border-b border-pine/8">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
        <header className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brass">
              From the hills
            </p>
            <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-leaf sm:text-4xl md:text-5xl">
              Local Product
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex min-h-10 items-center border border-pine/15 px-4 text-[12px] font-semibold tracking-wide text-pine transition hover:border-brass hover:bg-brass/10 sm:min-h-11 sm:px-5 sm:text-[13px]"
          >
            See more
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-7">
          {preview.map((product, index) => (
            <div key={product.id} className="min-w-0">
              <ProductTile product={product} priority={index < 4} />
            </div>
          ))}
        </div>

        {hasMore ? (
          <div className="mt-10 flex justify-center">
            <Link
              href="/shop"
              className="inline-flex min-h-11 items-center bg-pine px-8 text-[13px] font-bold tracking-wide text-chalk transition hover:bg-leaf"
            >
              See more in shop
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
