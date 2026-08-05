import Image from "next/image";
import Link from "next/link";
import { setProductPublishedAction } from "@/app/actions";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminSubmit,
} from "@/components/admin-ui";
import { getCategoryNames, marginPercent } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";
import { sellableQty } from "@/lib/inventory-mode";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory-queue";

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    visibility?: string;
    channel?: string;
    sort?: string;
    stock?: string;
  }>;
};

type SortKey = "updated" | "name" | "stock" | "margin" | "price";

function parseSort(raw: string | undefined): SortKey {
  if (
    raw === "name" ||
    raw === "stock" ||
    raw === "margin" ||
    raw === "price" ||
    raw === "updated"
  ) {
    return raw;
  }
  return "updated";
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const {
    q = "",
    category = "all",
    visibility = "all",
    channel = "all",
    sort: sortParam,
    stock: stockParam = "all",
  } = await searchParams;
  const sort = parseSort(sortParam);
  const categoryNames = await getCategoryNames();

  const products = await prisma.product.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { slug: { contains: q } },
                { category: { contains: q } },
                {
                  purchases: {
                    some: {
                      vendor: { name: { contains: q } },
                    },
                  },
                },
              ],
            }
          : {},
        category !== "all" ? { category } : {},
        visibility === "published"
          ? { published: true }
          : visibility === "hidden"
            ? { published: false }
            : {},
        channel === "online"
          ? { sellOnline: true }
          : channel === "offline"
            ? { sellOffline: true }
            : {},
        stockParam === "low" ? { stock: { lte: 5 } } : {},
        stockParam === "out" ? { stock: { lte: 0 } } : {},
      ],
    },
    orderBy:
      sort === "name"
        ? { name: "asc" }
        : sort === "stock"
          ? { stock: "asc" }
          : sort === "price"
            ? { price: "desc" }
            : { updatedAt: "desc" },
    take: 200,
  });

  const enriched = products.map((product) => {
    const pct = marginPercent(product.price, product.costPrice ?? 0);
    return { product, pct };
  });

  if (sort === "margin") {
    enriched.sort((a, b) => b.pct - a.pct);
  }

  const [totalCount, activeCount, onlineCount, lowStockCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { published: true } }),
      prisma.product.count({ where: { sellOnline: true, published: true } }),
      prisma.product.count({
        where: { published: true, stock: { lte: 5 } },
      }),
    ]);

  function href(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const values = {
      q,
      category,
      visibility,
      channel,
      sort,
      stock: stockParam,
      ...next,
    };
    if (values.q?.trim()) params.set("q", values.q.trim());
    if (values.category && values.category !== "all")
      params.set("category", values.category);
    if (values.visibility && values.visibility !== "all")
      params.set("visibility", values.visibility);
    if (values.channel && values.channel !== "all")
      params.set("channel", values.channel);
    if (values.sort && values.sort !== "updated")
      params.set("sort", values.sort);
    if (values.stock && values.stock !== "all")
      params.set("stock", values.stock);
    const s = params.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">
            Products
          </h2>
          <p className="mt-0.5 text-sm text-ink/50">
            Catalog, stock, margin ·{" "}
            <Link
              href="/admin/home-sections"
              className="font-semibold text-pine hover:underline"
            >
              Home sections
            </Link>
            {" · "}
            <Link
              href="/admin/profits?view=products"
              className="font-semibold text-pine hover:underline"
            >
              Analysis
            </Link>
          </p>
        </div>
        <AdminBtn href="/admin/products/new">Add product</AdminBtn>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={href({ visibility: "all", stock: "all" })}
          className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)] transition hover:border-pine/20"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">
            Products
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {totalCount}
          </p>
        </Link>
        <Link
          href={href({ visibility: "published", stock: "all" })}
          className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)] transition hover:border-pine/20"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">
            Active
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {activeCount}
          </p>
        </Link>
        <Link
          href={href({ channel: "online", visibility: "published" })}
          className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)] transition hover:border-pine/20"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">
            Online store
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-pine">
            {onlineCount}
          </p>
        </Link>
        <Link
          href={href({ stock: "low", visibility: "all" })}
          className={`rounded-2xl border px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)] transition ${
            lowStockCount > 0
              ? "border-amber-200 bg-amber-50/70 hover:border-amber-300"
              : "border-black/[0.06] bg-white hover:border-pine/20"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">
            Low stock
          </p>
          <p
            className={`mt-1 font-display text-2xl font-bold ${
              lowStockCount > 0 ? "text-amber-900" : "text-ink"
            }`}
          >
            {lowStockCount}
          </p>
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { value: "all", label: "All stock" },
          { value: "low", label: "Low (≤5)" },
          { value: "out", label: "Out of stock" },
        ].map((tab) => {
          const active = stockParam === tab.value;
          return (
            <Link
              key={tab.value}
              href={href({ stock: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-pine text-white"
                  : "border border-black/10 bg-white text-ink/60 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        <span className="mx-1 hidden h-6 w-px bg-black/10 sm:inline" />
        {[
          { value: "updated", label: "Recent" },
          { value: "name", label: "Name" },
          { value: "stock", label: "Stock" },
          { value: "margin", label: "Margin" },
          { value: "price", label: "Price" },
        ].map((tab) => {
          const active = sort === tab.value;
          return (
            <Link
              key={tab.value}
              href={href({ sort: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-pine/10 text-pine"
                  : "text-ink/45 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <AdminCard flush>
        <form
          method="get"
          className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] bg-[#fafbfc] p-3"
        >
          {sort !== "updated" ? (
            <input type="hidden" name="sort" value={sort} />
          ) : null}
          {stockParam !== "all" ? (
            <input type="hidden" name="stock" value={stockParam} />
          ) : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title, handle, category, vendor…"
            className="min-w-[180px] flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
          />
          <select
            name="category"
            defaultValue={category}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categoryNames.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            name="visibility"
            defaultValue={visibility}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All status</option>
            <option value="published">Active</option>
            <option value="hidden">Draft</option>
          </select>
          <select
            name="channel"
            defaultValue={channel}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All channels</option>
            <option value="online">Online store</option>
            <option value="offline">Offline shop</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold hover:bg-white"
          >
            Filter
          </button>
        </form>

        <p className="border-b border-black/[0.06] px-4 py-2 text-xs text-ink/45">
          Showing {enriched.length}
          {q ||
          category !== "all" ||
          visibility !== "all" ||
          channel !== "all" ||
          stockParam !== "all"
            ? " matching"
            : ""}
        </p>

        {enriched.length === 0 ? (
          <AdminEmpty
            title="No products found"
            body="Add a staple or clear filters to see your catalog."
            action={
              <AdminBtn href="/admin/products/new" size="sm">
                Add product
              </AdminBtn>
            }
          />
        ) : (
          <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium">Mode</th>
                  <th className="px-4 py-2.5 font-medium text-right">Sellable</th>
                  <th className="px-4 py-2.5 font-medium text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cost</th>
                  <th className="px-4 py-2.5 font-medium text-right">Margin</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {enriched.map(({ product, pct }) => {
                  const sellable = sellableQty(product);

                  return (
                    <tr key={product.id} className="hover:bg-[#f7f8f9]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#eee] ring-1 ring-black/[0.04]">
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="44px"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[9px] font-bold text-ink/25">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink hover:underline">
                              {product.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-ink/45">
                              {product.category || "Uncategorized"} ·{" "}
                              {product.unit}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {product.sellOnline ? (
                                <span className="rounded-full bg-leaf/15 px-1.5 py-0.5 text-[10px] font-semibold text-pine">
                                  Online
                                </span>
                              ) : null}
                              {product.sellOffline ? (
                                <span className="rounded-full bg-brass/25 px-1.5 py-0.5 text-[10px] font-semibold text-pine">
                                  Offline
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink/50">
                        {product.inventoryMode === "digital"
                          ? "Digital"
                          : product.inventoryMode === "hybrid"
                            ? "Hybrid"
                            : "Owned"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          sellable <= 0
                            ? "text-red-600"
                            : sellable <= LOW_STOCK_THRESHOLD
                              ? "text-amber-800"
                              : "text-ink"
                        }`}
                      >
                        {sellable}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatNprFromInt(product.price)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink/55">
                        {formatNprFromInt(product.costPrice ?? 0)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          pct >= 30
                            ? "text-emerald-700"
                            : pct < 10
                              ? "text-amber-800"
                              : "text-ink"
                        }`}
                      >
                        {pct}%
                      </td>
                      <td className="px-4 py-3">
                        {product.published ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-pine hover:bg-pine/8"
                          >
                            Edit
                          </Link>
                          {product.sellOnline ? (
                            <Link
                              href={`/shop/${product.slug}`}
                              target="_blank"
                              className="rounded-lg px-2 py-1 text-xs font-medium text-ink/50 hover:bg-black/[0.04] hover:text-ink"
                            >
                              View
                            </Link>
                          ) : null}
                          <form action={setProductPublishedAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <input
                              type="hidden"
                              name="published"
                              value={product.published ? "false" : "true"}
                            />
                            <AdminSubmit size="sm" variant="secondary">
                              {product.published ? "Hide" : "Publish"}
                            </AdminSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
