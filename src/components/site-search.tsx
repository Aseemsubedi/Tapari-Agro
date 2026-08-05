"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { formatNpr } from "@/lib/format";
import type { SearchHit } from "@/lib/product-search";
import { ProtectedProductImage } from "@/components/protected-product-image";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="2.25"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="2.25"
    >
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

type SearchResponse = {
  q: string;
  total: number;
  results: SearchHit[];
};

export function SiteSearch({
  compact = false,
}: {
  /** Icon-only trigger that opens a full panel (mobile). */
  compact?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showPanel = open || (!compact && query.trim().length > 0 && (results.length > 0 || loading || query.trim().length >= 1));

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    if (compact) setQuery("");
  }, [compact]);

  const runSearch = useCallback(async (value: string) => {
    const q = value.trim();
    abortRef.current?.abort();
    if (!q) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as SearchResponse;
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setActiveIndex(-1);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResults([]);
      setTotal(0);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 160);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    if (!open && compact) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      close();
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, compact, close]);

  useEffect(() => {
    if (open || (!compact && showPanel)) {
      inputRef.current?.focus();
    }
  }, [open, compact, showPanel]);

  function goToShop(q = query) {
    const trimmed = q.trim();
    const href = trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : "/shop";
    close();
    router.push(href);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      close();
      router.push(`/shop/${results[activeIndex].slug}`);
      return;
    }
    goToShop();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }
  }

  const field = (
    <form onSubmit={onSubmit} className="relative w-full" role="search">
      <label className="relative block">
        <span className="sr-only">Search products</span>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine/50" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!compact) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder='Search "honey"'
          autoComplete="off"
          enterKeyHint="search"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          className="h-11 w-full rounded-xl border border-pine/10 bg-[#f0f2f5] pl-10 pr-10 text-sm font-medium text-ink outline-none transition placeholder:text-ink/40 focus:border-pine/25 focus:bg-white focus:ring-2 focus:ring-pine/10"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setTotal(0);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink/40 hover:text-pine"
            aria-label="Clear search"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      {showPanel && query.trim() ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] max-h-[min(70vh,420px)] overflow-auto rounded-xl border border-pine/12 bg-white shadow-[0_16px_40px_rgba(16,36,24,0.12)]"
        >
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink/45">Searching…</p>
          ) : results.length === 0 ? (
            <div className="px-4 py-4">
              <p className="text-sm font-semibold text-ink">No products found</p>
              <p className="mt-1 text-xs text-ink/45">
                Try another word, or browse the full shop.
              </p>
              <button
                type="button"
                onClick={() => goToShop()}
                className="mt-3 text-xs font-bold text-leaf underline-offset-2 hover:underline"
              >
                Search shop for “{query.trim()}”
              </button>
            </div>
          ) : (
            <ul>
              {results.map((hit, index) => (
                <li key={hit.id} role="option" aria-selected={index === activeIndex}>
                  <Link
                    href={`/shop/${hit.slug}`}
                    onClick={close}
                    className={`flex items-center gap-3 px-3 py-2.5 transition ${
                      index === activeIndex ? "bg-mist" : "hover:bg-mist/70"
                    }`}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden bg-[#eee]">
                      {hit.image ? (
                        <ProtectedProductImage
                          src={hit.image}
                          alt=""
                          fill
                          watermark="sm"
                          className="object-cover"
                          sizes="44px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {hit.name}
                      </p>
                      <p className="truncate text-[11px] text-ink/45">
                        {hit.category || "Staple"}
                        {!hit.inStock ? " · Sold out" : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-pine">
                      {formatNpr(Number(hit.price))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {results.length > 0 ? (
            <button
              type="button"
              onClick={() => goToShop()}
              className="sticky bottom-0 flex w-full items-center justify-between border-t border-pine/10 bg-mist px-4 py-3 text-left text-xs font-bold text-pine hover:bg-mist/80"
            >
              <span>
                See all {total} result{total === 1 ? "" : "s"} in shop
              </span>
              <span aria-hidden>→</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );

  if (compact) {
    return (
      <div ref={panelRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="inline-flex h-12 w-12 items-center justify-center text-pine transition hover:bg-mist"
          aria-label="Search products"
        >
          <SearchIcon className="h-6 w-6" />
        </button>
        {open ? (
          <div
            className="fixed inset-x-0 z-[70] border-b border-pine/10 bg-chalk p-3 shadow-md"
            style={{ top: "var(--store-header-h, 3.5rem)" }}
          >
            <div className="mx-auto flex max-w-5xl items-start gap-2">
              <div className="min-w-0 flex-1">{field}</div>
              <button
                type="button"
                onClick={close}
                className="mt-0.5 h-11 shrink-0 px-3 text-sm font-bold text-ink/55 hover:text-pine"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={panelRef} className="relative w-full max-w-md">
      {field}
    </div>
  );
}
