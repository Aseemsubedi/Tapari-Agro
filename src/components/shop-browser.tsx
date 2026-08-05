"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProductTile } from "@/components/product-tile";
import { filterProductsByQuery } from "@/lib/product-search";
import type { Product } from "@/lib/types";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

function dedupeProducts(products: Product[]) {
  const seen = new Set<string>();
  const unique: Product[] = [];
  for (const product of products) {
    const key = product.slug || product.id;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(product);
  }
  return unique;
}

export function ShopBrowser({
  products,
  initialCategory = "All",
  initialQuery = "",
}: {
  products: Product[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const catalog = useMemo(() => dedupeProducts(products), [products]);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const product of catalog) {
      const name = product.categories[0]?.name;
      if (name) set.add(name);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [catalog]);

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(
    categories.includes(initialCategory) ? initialCategory : "All",
  );

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setCategory(categories.includes(initialCategory) ? initialCategory : "All");
  }, [initialCategory, categories]);

  useEffect(() => {
    if (initialQuery.trim()) {
      inputRef.current?.focus();
    }
  }, [initialQuery]);

  const syncUrl = useCallback(
    (next: { category: string; query: string }) => {
      const params = new URLSearchParams();
      const q = next.query.trim();
      if (q) params.set("q", q);
      if (next.category !== "All") params.set("category", next.category);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  function updateQuery(value: string) {
    setQuery(value);
    syncUrl({ category, query: value });
  }

  function updateCategory(value: string) {
    setCategory(value);
    syncUrl({ category: value, query });
  }

  function clearAll() {
    setQuery("");
    setCategory("All");
    syncUrl({ category: "All", query: "" });
  }

  const filtered = useMemo(() => {
    const byQuery = filterProductsByQuery(catalog, query);
    if (category === "All") return byQuery;
    return byQuery.filter((product) => product.categories[0]?.name === category);
  }, [catalog, category, query]);

  const hasActive = query.trim() !== "" || category !== "All";
  const qLabel = query.trim();

  return (
    <div>
      <div className="mb-6 space-y-4">
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-pine/45" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Search spices, honey, rice, oil…"
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-14 w-full border-2 border-pine/15 bg-white py-3.5 pl-12 pr-4 text-base font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-pine"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((entry) => {
            const active = entry === category;
            return (
              <button
                key={entry}
                type="button"
                aria-pressed={active}
                onClick={() => updateCategory(entry)}
                className={`min-h-11 px-3.5 text-[12px] font-bold tracking-wide transition sm:text-[13px] ${
                  active
                    ? "bg-pine text-chalk"
                    : "border border-pine/12 bg-white text-ink/55 hover:border-pine hover:text-pine"
                }`}
              >
                {entry}
              </button>
            );
          })}
          {hasActive ? (
            <button
              type="button"
              onClick={clearAll}
              className="min-h-11 px-3 text-[12px] font-semibold text-ink/40 underline-offset-4 hover:text-pine hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <p className="mb-5 text-[13px] tabular-nums text-ink/50">
        {filtered.length} {filtered.length === 1 ? "product" : "products"}
        {qLabel ? (
          <>
            {" "}
            for <span className="font-semibold text-ink">“{qLabel}”</span>
          </>
        ) : null}
        {category !== "All" ? (
          <>
            {" "}
            in <span className="font-semibold text-ink">{category}</span>
          </>
        ) : null}
      </p>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-pine/15 bg-white py-16 text-center">
          <p className="font-display text-xl font-bold text-ink/45">
            No products found
          </p>
          <p className="mt-2 text-sm text-ink/40">
            Try another search or clear the category.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-5 text-[13px] font-bold text-leaf underline-offset-4 hover:underline"
          >
            Show all products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
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
