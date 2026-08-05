"use client";

import { useMemo, useState } from "react";
import { AdminSubmit } from "@/components/admin-ui";

type ProductOption = {
  id: string;
  name: string;
  category: string;
};

export function SectionProductPicker({
  sectionId,
  products,
  action,
}: {
  sectionId: string;
  products: ProductOption[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category.trim()) set.add(p.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filtered) next.add(p.id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedIds = [...selected];

  return (
    <form
      action={action}
      className="space-y-3 border-t border-black/[0.06] pt-4"
    >
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="productIds" value={selectedIds.join(",")} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink/55">Add products</p>
          <p className="text-[11px] text-ink/40">
            Select one or many — or filter by category
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={selectAllFiltered}
            className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink/60 hover:border-pine/25"
          >
            Select shown
          </button>
          {selected.size > 0 ? (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink/60 hover:border-pine/25"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="min-w-[160px] flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-pine"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-pine"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <AdminSubmit size="sm" disabled={selected.size === 0}>
          Add {selected.size > 0 ? selected.size : ""}
        </AdminSubmit>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-xl border border-black/[0.06] bg-[#fafbfc]">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-ink/40">
            No matching products left to add.
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {filtered.map((p) => {
              const on = selected.has(p.id);
              return (
                <li key={p.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition ${
                      on ? "bg-pine/5" : "hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(p.id)}
                      className="size-4 accent-pine"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">
                      {p.name}
                    </span>
                    {p.category ? (
                      <span className="shrink-0 text-[10px] font-medium text-ink/40">
                        {p.category}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </form>
  );
}
