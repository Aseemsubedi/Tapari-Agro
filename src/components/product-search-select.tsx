"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ProductSearchOption = {
  id: string;
  name: string;
  category?: string;
  detail?: string;
};

export function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = "Search or choose a product…",
  id,
  inputClassName,
  excludeIds = [],
}: {
  products: ProductSearchOption[];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  id?: string;
  inputClassName?: string;
  /** Hide these products (already on the bill). Current value stays visible. */
  excludeIds?: string[];
}) {
  const selected = products.find((p) => p.id === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected?.name, value]);

  const available = useMemo(() => {
    const blocked = new Set(excludeIds.filter((id) => id && id !== value));
    return products.filter((p) => !blocked.has(p.id));
  }, [products, excludeIds, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.detail ?? "").toLowerCase().includes(q),
    );
  }, [available, query]);

  function updateMenuPos() {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = Math.max(120, window.innerHeight - rect.bottom - 12);
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 200),
      maxHeight: Math.min(224, spaceBelow),
    });
  }

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
    const onScroll = () => updateMenuPos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function pick(product: ProductSearchOption) {
    onChange(product.id);
    setQuery(product.name);
    setOpen(false);
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange("");
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            if (value && selected) setQuery(selected.name);
            else if (!value) setQuery("");
          }, 150);
        }}
        className={
          inputClassName ??
          "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
        }
      />

      {open && menuPos ? (
        <ul
          className="fixed z-[80] overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg"
          role="listbox"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            maxHeight: menuPos.maxHeight,
          }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink/40">No matches</li>
          ) : (
            filtered.map((p) => (
              <li key={p.id} role="option" aria-selected={p.id === value}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-pine/8 ${
                    p.id === value
                      ? "bg-pine/10 font-semibold text-pine"
                      : "text-ink"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                >
                  <span>{p.name}</span>
                  {p.category || p.detail ? (
                    <span className="text-[11px] text-ink/40">
                      {[p.category, p.detail].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
