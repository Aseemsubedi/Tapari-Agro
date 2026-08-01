"use client";

import { useMemo, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProductTile } from "@/components/product-tile";
import type { Product } from "@/lib/types";

type SortKey = "featured" | "price-asc" | "price-desc" | "name-asc";
type PriceKey = "all" | "under-500" | "500-1000" | "over-1000";
type StockKey = "all" | "instock";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A–Z" },
];

const PRICE_OPTIONS: { value: PriceKey; label: string }[] = [
  { value: "all", label: "Any price" },
  { value: "under-500", label: "Under NPR 500" },
  { value: "500-1000", label: "NPR 500–1,000" },
  { value: "over-1000", label: "Over NPR 1,000" },
];

function priceOf(product: Product) {
  return Number.parseFloat(product.price) || 0;
}

function matchesPrice(product: Product, key: PriceKey) {
  if (key === "all") return true;
  const p = priceOf(product);
  if (key === "under-500") return p < 500;
  if (key === "500-1000") return p >= 500 && p <= 1000;
  return p > 1000;
}

function parseSort(value?: string): SortKey {
  if (
    value === "price-asc" ||
    value === "price-desc" ||
    value === "name-asc" ||
    value === "featured"
  ) {
    return value;
  }
  return "featured";
}

function parsePrice(value?: string): PriceKey {
  if (
    value === "under-500" ||
    value === "500-1000" ||
    value === "over-1000" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

function parseStock(value?: string): StockKey {
  return value === "instock" ? "instock" : "all";
}

export function ShopBrowser({
  products,
  initialCategory = "All",
  initialSort = "featured",
  initialPrice = "all",
  initialStock = "all",
}: {
  products: Product[];
  initialCategory?: string;
  initialSort?: string;
  initialPrice?: string;
  initialStock?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) {
      const name = product.categories[0]?.name;
      if (name) set.add(name);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const [category, setCategory] = useState(
    categories.includes(initialCategory) ? initialCategory : "All",
  );
  const [sort, setSort] = useState<SortKey>(parseSort(initialSort));
  const [price, setPrice] = useState<PriceKey>(parsePrice(initialPrice));
  const [stock, setStock] = useState<StockKey>(parseStock(initialStock));
  const [moreOpen, setMoreOpen] = useState(
    parsePrice(initialPrice) !== "all" || parseStock(initialStock) !== "all",
  );

  const syncUrl = useCallback(
    (next: {
      category: string;
      sort: SortKey;
      price: PriceKey;
      stock: StockKey;
    }) => {
      const params = new URLSearchParams();
      if (next.category !== "All") params.set("category", next.category);
      if (next.sort !== "featured") params.set("sort", next.sort);
      if (next.price !== "all") params.set("price", next.price);
      if (next.stock !== "all") params.set("stock", next.stock);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  function updateCategory(value: string) {
    setCategory(value);
    syncUrl({ category: value, sort, price, stock });
  }

  function updateSort(value: SortKey) {
    setSort(value);
    syncUrl({ category, sort: value, price, stock });
  }

  function updatePrice(value: PriceKey) {
    setPrice(value);
    syncUrl({ category, sort, price: value, stock });
  }

  function updateStock(value: StockKey) {
    setStock(value);
    syncUrl({ category, sort, price, stock: value });
  }

  function clearFilters() {
    setCategory("All");
    setSort("featured");
    setPrice("all");
    setStock("all");
    syncUrl({
      category: "All",
      sort: "featured",
      price: "all",
      stock: "all",
    });
  }

  const filtered = useMemo(() => {
    let list = products;

    if (category !== "All") {
      list = list.filter((p) => p.categories[0]?.name === category);
    }
    if (stock === "instock") {
      list = list.filter((p) => p.stockStatus === "instock");
    }
    list = list.filter((p) => matchesPrice(p, price));

    const sorted = [...list];
    if (sort === "price-asc") {
      sorted.sort((a, b) => priceOf(a) - priceOf(b));
    } else if (sort === "price-desc") {
      sorted.sort((a, b) => priceOf(b) - priceOf(a));
    } else if (sort === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [products, category, sort, price, stock]);

  const hasExtraFilters = price !== "all" || stock !== "all";
  const hasAnyFilter =
    category !== "All" || sort !== "featured" || hasExtraFilters;

  const selectClass =
    "min-h-9 w-full border border-pine/12 bg-chalk px-3 text-[12px] font-semibold tracking-wide text-pine outline-none transition hover:border-brass focus:border-brass sm:w-auto sm:min-w-[11rem] sm:text-[13px]";

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:mb-6">
        <nav aria-label="Product categories">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {categories.map((entry) => {
              const active = entry === category;
              return (
                <button
                  key={entry}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateCategory(entry)}
                  className={`min-h-9 shrink-0 px-3.5 text-[12px] font-semibold tracking-wide transition sm:text-[13px] ${
                    active
                      ? "bg-pine text-chalk"
                      : "border border-pine/12 text-ink/55 hover:border-brass hover:text-pine"
                  }`}
                >
                  {entry}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex flex-col gap-3 border border-pine/10 bg-mist/50 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[14rem]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              Sort by
            </span>
            <select
              value={sort}
              onChange={(e) => updateSort(e.target.value as SortKey)}
              className={selectClass}
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[14rem]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              Price
            </span>
            <select
              value={price}
              onChange={(e) => updatePrice(e.target.value as PriceKey)}
              className={selectClass}
              aria-label="Filter by price"
            >
              {PRICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-1 flex-wrap items-end gap-2 sm:justify-end">
            <button
              type="button"
              aria-pressed={stock === "instock"}
              onClick={() =>
                updateStock(stock === "instock" ? "all" : "instock")
              }
              className={`min-h-9 px-3.5 text-[12px] font-semibold tracking-wide transition sm:text-[13px] ${
                stock === "instock"
                  ? "bg-pine text-chalk"
                  : "border border-pine/12 text-ink/55 hover:border-brass hover:text-pine"
              }`}
            >
              In stock
            </button>

            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
              className="min-h-9 border border-pine/12 px-3.5 text-[12px] font-semibold tracking-wide text-pine transition hover:border-brass sm:text-[13px]"
            >
              {moreOpen ? "Fewer options" : "More options"}
            </button>

            {hasAnyFilter ? (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-9 px-3 text-[12px] font-semibold tracking-wide text-ink/45 underline-offset-4 hover:text-pine hover:underline sm:text-[13px]"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {moreOpen ? (
          <div className="border border-pine/10 bg-chalk px-3 py-3 sm:px-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              Price bands
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRICE_OPTIONS.map((opt) => {
                const active = price === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updatePrice(opt.value)}
                    className={`min-h-9 px-3 text-[12px] font-semibold tracking-wide transition ${
                      active
                        ? "bg-brass text-pine"
                        : "border border-pine/12 text-ink/55 hover:border-brass hover:text-pine"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              Availability
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { value: "all" as const, label: "All items" },
                  { value: "instock" as const, label: "In stock only" },
                ] as const
              ).map((opt) => {
                const active = stock === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateStock(opt.value)}
                    className={`min-h-9 px-3 text-[12px] font-semibold tracking-wide transition ${
                      active
                        ? "bg-brass text-pine"
                        : "border border-pine/12 text-ink/55 hover:border-brass hover:text-pine"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-[12px] tabular-nums text-ink/40">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
          {hasExtraFilters || category !== "All" ? " · filtered" : null}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-pine/15 py-16 text-center">
          <p className="font-display text-xl text-ink/45">
            No products match these filters
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 text-[13px] font-semibold text-leaf underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-7">
          {filtered.map((product, index) => (
            <div key={product.id} className="min-w-0">
              <ProductTile product={product} priority={index < 4} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
