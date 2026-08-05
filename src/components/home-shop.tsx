import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import type { HomeShopSection } from "@/lib/catalog";

export function HomeShop({ sections }: { sections: HomeShopSection[] }) {
  if (sections.length === 0) {
    return (
      <section id="shop" className="px-4 py-14 text-center sm:px-8">
        <p className="text-sm text-ink/45">Products are being prepared.</p>
      </section>
    );
  }

  return (
    <div id="shop" className="scroll-mt-[var(--store-header-h,6.5rem)]">
      {sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          className="border-b border-pine/8 bg-white"
          aria-labelledby={`home-section-${section.id}`}
        >
          <div className="mx-auto w-full max-w-5xl py-10 sm:px-8 sm:py-12">
            <header className="mb-6 flex items-end justify-between gap-4 px-4 sm:mb-8 sm:px-0">
              <div>
                {section.eyebrow ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brass">
                    {section.eyebrow}
                  </p>
                ) : null}
                <h2
                  id={`home-section-${section.id}`}
                  className={`font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl ${
                    section.eyebrow ? "mt-1.5" : ""
                  }`}
                >
                  {section.title}
                </h2>
              </div>
              <Link
                href="/shop"
                className="shrink-0 text-[13px] font-semibold text-leaf underline-offset-4 hover:underline"
              >
                See all
              </Link>
            </header>

            {/* Mobile: horizontal snap scroll · sm+: grid */}
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 lg:gap-5 [&::-webkit-scrollbar]:hidden">
              {section.products.map((product, index) => (
                <div
                  key={product.id}
                  className="w-[42vw] max-w-[11.5rem] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                >
                  <ProductTile
                    product={product}
                    priority={sectionIndex === 0 && index < 4}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
