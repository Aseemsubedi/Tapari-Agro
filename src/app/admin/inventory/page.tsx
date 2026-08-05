import Image from "next/image";
import Link from "next/link";
import { setProductEssentialAction, writeOffLotAction } from "@/app/actions";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminStat,
  AdminSubmit,
} from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import {
  daysUntil,
  expiryBucket,
  expiryTone,
  formatShortDate,
  nearestExpiryByProduct,
  type LotRow,
} from "@/lib/inventory";
import {
  inventoryModeLabel,
  sellableQty,
} from "@/lib/inventory-mode";
import {
  EXPIRY_ALERT_DAYS,
  INVENTORY_QUEUE_REASON_META,
  inventoryQueueCtaHrefForProduct,
  inventoryQueueReasons,
  LOW_STOCK_THRESHOLD,
  productInInventoryQueue,
  type InventoryQueueReason,
} from "@/lib/inventory-queue";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  searchParams: Promise<{
    view?: string;
    filter?: string;
    q?: string;
    page?: string;
    seller?: string;
    error?: string;
  }>;
};

const PAGE_SIZE = 40;

/**
 * Stock desk (1000+ SKUs):
 * Queue = exceptions only · Digital · Expiry · Browse
 * Write-off / recount live on product Adjust — not every row.
 */
export default async function AdminInventoryPage({ searchParams }: Props) {
  const {
    view: viewParam = "queue",
    filter = "all",
    q = "",
    page: pageParam = "1",
    seller = "",
    error = "",
  } = await searchParams;

  const view =
    viewParam === "onhand" || viewParam === "stock"
      ? "queue"
      : viewParam === "suppliers" || viewParam === "vendors"
        ? "browse"
        : viewParam === "expiring"
          ? "expiry"
          : viewParam === "out" || viewParam === "outofstock"
            ? "oos"
            : viewParam === "digital" ||
                viewParam === "queue" ||
                viewParam === "expiry" ||
                viewParam === "browse" ||
                viewParam === "oos"
              ? viewParam
              : "queue";

  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);
  const now = Date.now();
  const needle = q.trim();
  const isOosView = view === "oos";

  const [products, lotsRaw, productTotal, digitalLotRows] = await Promise.all([
    prisma.product.findMany({
      where: needle
        ? {
            OR: [
              { name: { contains: needle } },
              { category: { contains: needle } },
              {
                sellerVendor: { name: { contains: needle } },
              },
            ],
          }
        : undefined,
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        unit: true,
        category: true,
        imageUrl: true,
        stock: true,
        digitalAvailable: true,
        inventoryMode: true,
        costPrice: true,
        published: true,
        sellOnline: true,
        sellOffline: true,
        sellerVendorId: true,
        essential: true,
        sellerVendor: { select: { id: true, name: true } },
      },
    }),
    isOosView
      ? Promise.resolve([])
      : prisma.stockPurchase.findMany({
          where: {
            remainingQty: { gt: 0 },
            NOT: { stockKind: "digital" },
            OR: [
              { expiresAt: { not: null } },
              { vendorId: { not: null } },
            ],
          },
          orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
          take: 800,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                stock: true,
                imageUrl: true,
                price: true,
              },
            },
            vendor: { select: { id: true, name: true, phone: true } },
          },
        }),
    prisma.product.count(),
    isOosView
      ? Promise.resolve([])
      : prisma.stockPurchase.findMany({
          where: {
            stockKind: "digital",
            remainingQty: { gt: 0 },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            productId: true,
            remainingQty: true,
            unitCost: true,
            billNo: true,
            vendorId: true,
            vendor: { select: { id: true, name: true } },
          },
        }),
  ]);

  const digitalByProduct = new Map<
    string,
    {
      vendorId: string | null;
      vendorName: string;
      remainingQty: number;
      billNo: string;
    }[]
  >();
  for (const lot of digitalLotRows) {
    const list = digitalByProduct.get(lot.productId) ?? [];
    list.push({
      vendorId: lot.vendorId,
      vendorName: lot.vendor?.name ?? "Unknown",
      remainingQty: lot.remainingQty,
      billNo: lot.billNo,
    });
    digitalByProduct.set(lot.productId, list);
  }

  const lots = lotsRaw as LotRow[];
  const expiryMap = nearestExpiryByProduct(lots, now);

  const withExpiry = products.map((p) => ({
    ...p,
    nearestExpiry: expiryMap.get(p.id) ?? null,
  }));

  const queueAll = withExpiry
    .map((p) => {
      const reasons = inventoryQueueReasons(p, now);
      const primary = reasons[0] ?? null;
      return { product: p, reasons, primary };
    })
    .filter((r) => r.primary);

  const queueFiltered =
    filter === "all"
      ? queueAll
      : queueAll.filter((r) => r.reasons.includes(filter as InventoryQueueReason));

  const queuePage = queueFiltered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const queuePages = Math.max(1, Math.ceil(queueFiltered.length / PAGE_SIZE));

  const reasonCounts = {
    cannot_sell: queueAll.filter((r) =>
      r.reasons.includes("cannot_sell"),
    ).length,
    low: queueAll.filter((r) => r.reasons.includes("low")).length,
    expired: queueAll.filter((r) => r.reasons.includes("expired")).length,
    expiring: queueAll.filter((r) => r.reasons.includes("expiring")).length,
    digital_short: queueAll.filter((r) =>
      r.reasons.includes("digital_short"),
    ).length,
  };

  const expiringLotsAll = lots
    .filter((l) => l.expiresAt && l.remainingQty > 0)
    .filter((l) => expiryBucket(l.expiresAt!, now) !== "ok")
    .sort(
      (a, b) =>
        (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0),
    );

  const expiringLots =
    filter === "expired"
      ? expiringLotsAll.filter(
          (l) => expiryBucket(l.expiresAt!, now) === "expired",
        )
      : filter === "soon"
        ? expiringLotsAll.filter(
            (l) => expiryBucket(l.expiresAt!, now) !== "expired",
          )
        : expiringLotsAll;

  const expiredCount = expiringLotsAll.filter(
    (l) => expiryBucket(l.expiresAt!, now) === "expired",
  ).length;
  const expiringSoonCount = expiringLotsAll.length - expiredCount;

  const digitalProducts = withExpiry.filter(
    (p) =>
      p.inventoryMode === "digital" ||
      p.inventoryMode === "hybrid" ||
      p.digitalAvailable > 0,
  );
  const digitalFiltered = seller
    ? digitalProducts.filter(
        (p) =>
          p.sellerVendorId === seller ||
          (digitalByProduct.get(p.id) ?? []).some((l) => l.vendorId === seller),
      )
    : digitalProducts;
  const digitalPage = digitalFiltered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const digitalPages = Math.max(
    1,
    Math.ceil(digitalFiltered.length / PAGE_SIZE),
  );
  const digitalAvailableTotal = digitalProducts.reduce(
    (s, p) => s + p.digitalAvailable,
    0,
  );

  const browseFiltered = withExpiry;
  const browsePage = browseFiltered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const browsePages = Math.max(1, Math.ceil(browseFiltered.length / PAGE_SIZE));

  const published = withExpiry.filter((p) => p.published);
  const unitsOnHand = published.reduce((s, p) => s + p.stock, 0);
  const costValue = published.reduce(
    (s, p) => s + (p.costPrice ?? 0) * p.stock,
    0,
  );

  const sellers = [
    ...new Map(
      [
        ...digitalProducts
          .filter((p) => p.sellerVendor)
          .map((p) => [p.sellerVendor!.id, p.sellerVendor!] as const),
        ...digitalLotRows
          .filter((l) => l.vendor)
          .map((l) => [l.vendor!.id, l.vendor!] as const),
      ],
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const sellingProducts = withExpiry.filter(
    (p) =>
      p.published &&
      (p.sellOnline !== false || p.sellOffline !== false),
  );
  const oosAuto = sellingProducts.filter((p) => sellableQty(p) === 0);
  const essentialWatch = withExpiry.filter((p) => p.essential);

  /** One list: out of stock + essential pins (deduped). */
  const oosSorted = [
    ...new Map(
      [...oosAuto, ...essentialWatch].map((p) => [p.id, p] as const),
    ).values(),
  ].sort((a, b) => {
    const sa = sellableQty(a);
    const sb = sellableQty(b);
    if (a.essential !== b.essential) return a.essential ? -1 : 1;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });

  const oosPage = oosSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const oosPages = Math.max(1, Math.ceil(oosSorted.length / PAGE_SIZE));

  /** Search hits to manually pin as essential (not already essential). */
  const essentialAddCandidates =
    view === "oos" && needle
      ? withExpiry
          .filter(
            (p) =>
              !p.essential &&
              (p.name.toLowerCase().includes(needle.toLowerCase()) ||
                p.category.toLowerCase().includes(needle.toLowerCase())),
          )
          .slice(0, 12)
      : [];

  function hrefFor(next: {
    view?: string;
    filter?: string;
    q?: string;
    page?: number;
    seller?: string;
  }) {
    const params = new URLSearchParams();
    const v = next.view ?? view;
    const f = next.filter ?? filter;
    const query = next.q ?? q;
    const p = next.page ?? page;
    const sel = next.seller ?? seller;
    if (v !== "queue") params.set("view", v);
    if (v === "queue" && f !== "all") params.set("filter", f);
    if (v === "expiry" && (f === "expired" || f === "soon"))
      params.set("filter", f);
    if (query.trim()) params.set("q", query.trim());
    if (sel.trim()) params.set("seller", sel.trim());
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/admin/inventory?${s}` : "/admin/inventory";
  }

  const views = [
    { value: "queue", label: "Queue", count: queueAll.length },
    { value: "oos", label: "Out of stock", count: oosSorted.length },
    { value: "digital", label: "Digital", count: digitalProducts.length },
    { value: "expiry", label: "Expiry", count: expiringLotsAll.length },
    { value: "browse", label: "Browse", count: productTotal },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-ink/55">
          Exceptions first — restock via Purchases · adjust write-off / recount
          on the product.
        </p>
        <AdminBtn href="/admin/purchases?view=new" size="sm">
          Record purchase
        </AdminBtn>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStat
          label="Queue"
          value={String(queueAll.length)}
          hint={
            queueAll.length === 0
              ? "All clear"
              : [
                  reasonCounts.cannot_sell
                    ? `${reasonCounts.cannot_sell} out`
                    : null,
                  reasonCounts.low ? `${reasonCounts.low} low` : null,
                  reasonCounts.expired + reasonCounts.expiring
                    ? `${reasonCounts.expired + reasonCounts.expiring} expiry`
                    : null,
                  reasonCounts.digital_short
                    ? `${reasonCounts.digital_short} digital`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
          }
          href={hrefFor({ view: "queue", filter: "all", page: 1 })}
          tone={queueAll.length > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="Out of stock"
          value={String(oosSorted.length)}
          hint={
            essentialWatch.length > 0
              ? `${oosAuto.length} empty · ${essentialWatch.length} essential`
              : "Sellable = 0"
          }
          href={hrefFor({ view: "oos", page: 1 })}
          tone={oosAuto.length > 0 ? "warn" : "ok"}
        />
        <AdminStat
          label="On hand"
          value={String(unitsOnHand)}
          hint={`${formatNprFromInt(costValue)} cost`}
          href={hrefFor({ view: "browse", page: 1 })}
        />
        <AdminStat
          label="Digital available"
          value={String(digitalAvailableTotal)}
          hint={`${digitalProducts.length} digital / hybrid`}
          href={hrefFor({ view: "digital", page: 1 })}
        />
        <AdminStat
          label="Expiry lots"
          value={String(expiringLotsAll.length)}
          hint={`${expiredCount} expired · ${expiringSoonCount} ≤${EXPIRY_ALERT_DAYS}d`}
          href={hrefFor({ view: "expiry", page: 1 })}
          tone={expiredCount > 0 ? "warn" : expiringSoonCount > 0 ? "warn" : "ok"}
        />
      </div>

      <AdminCard flush>
        <div className="flex flex-wrap gap-1 border-b border-black/[0.06] bg-[#fafbfc] px-2 py-2">
          {views.map((tab) => {
            const active = view === tab.value;
            return (
              <Link
                key={tab.value}
                href={hrefFor({
                  view: tab.value,
                  filter: tab.value === "queue" ? "all" : filter,
                  page: 1,
                })}
                className={`rounded-lg px-3.5 py-2 text-sm ${
                  active
                    ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-black/5"
                    : "font-medium text-ink/55 hover:text-ink"
                }`}
              >
                {tab.label}{" "}
                <span className="tabular-nums text-ink/35">{tab.count}</span>
              </Link>
            );
          })}
        </div>

        {view === "queue" ? (
          <div className="flex flex-wrap gap-1 border-b border-black/[0.06] px-2 py-2">
            {(
              [
                ["all", "All", queueAll.length],
                ["cannot_sell", "Cannot sell", reasonCounts.cannot_sell],
                ["low", "Low", reasonCounts.low],
                ["expired", "Expired", reasonCounts.expired],
                ["expiring", "Expiring", reasonCounts.expiring],
                ["digital_short", "Digital short", reasonCounts.digital_short],
              ] as const
            ).map(([value, label, count]) => (
              <Link
                key={value}
                href={hrefFor({ view: "queue", filter: value, page: 1 })}
                className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-xs font-semibold ${
                  filter === value
                    ? "bg-amber-50 text-amber-950"
                    : "text-ink/45 hover:text-ink"
                }`}
              >
                {label}{" "}
                <span className="tabular-nums text-ink/30">{count}</span>
              </Link>
            ))}
          </div>
        ) : null}

        {view === "expiry" ? (
          <div className="flex flex-wrap gap-1 border-b border-black/[0.06] px-2 py-2">
            {(
              [
                ["all", "All", expiringLotsAll.length],
                ["expired", "Expired", expiredCount],
                ["soon", "Soon", expiringSoonCount],
              ] as const
            ).map(([value, label, count]) => (
              <Link
                key={value}
                href={hrefFor({ view: "expiry", filter: value, page: 1 })}
                className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-xs font-semibold ${
                  (value === "all"
                    ? filter !== "expired" && filter !== "soon"
                    : filter === value)
                    ? "bg-amber-50 text-amber-950"
                    : "text-ink/45 hover:text-ink"
                }`}
              >
                {label} <span className="text-ink/30">{count}</span>
              </Link>
            ))}
          </div>
        ) : null}

        {view === "digital" && sellers.length > 0 ? (
          <div className="flex flex-wrap gap-1 border-b border-black/[0.06] px-2 py-2">
            <Link
              href={hrefFor({ view: "digital", seller: "", page: 1 })}
              className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-xs font-semibold ${
                !seller
                  ? "bg-pine/10 text-pine"
                  : "text-ink/45 hover:text-ink"
              }`}
            >
              All sellers
            </Link>
            {sellers.map((s) => (
              <Link
                key={s.id}
                href={hrefFor({ view: "digital", seller: s.id, page: 1 })}
                className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-xs font-semibold ${
                  seller === s.id
                    ? "bg-pine/10 text-pine"
                    : "text-ink/45 hover:text-ink"
                }`}
              >
                {s.name}
              </Link>
            ))}
            <Link
              href="/admin/payments?view=sellers"
              className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-pine hover:underline"
            >
              Pay sellers →
            </Link>
          </div>
        ) : null}

        <form
          method="get"
          className="flex flex-wrap gap-2 border-b border-black/[0.06] p-3"
        >
          {view !== "queue" ? (
            <input type="hidden" name="view" value={view} />
          ) : null}
          {view !== "oos" && filter !== "all" && filter !== "needs" ? (
            <input type="hidden" name="filter" value={filter} />
          ) : null}
          {seller ? <input type="hidden" name="seller" value={seller} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder={
              view === "oos"
                ? "Search out of stock — or find a product to mark essential…"
                : "Search product, category, seller…"
            }
            className="min-w-[200px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
          />
          <button
            type="submit"
            className="rounded-lg border border-black/10 bg-[#fafbfc] px-3 py-2 text-sm font-semibold"
          >
            Search
          </button>
        </form>

        {/* OUT OF STOCK */}
        {view === "oos" ? (
          <>
            {essentialAddCandidates.length > 0 ? (
              <div className="border-b border-black/[0.06] bg-pine/[0.03] px-4 py-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink/40">
                  Mark essential (fast movers)
                </p>
                <ul className="divide-y divide-black/[0.04] rounded-xl border border-black/[0.06] bg-white">
                  {essentialAddCandidates.map((product) => {
                    const sellable = sellableQty(product);
                    return (
                      <li
                        key={product.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {product.name}
                          </p>
                          <p className="text-xs text-ink/45">
                            Sellable {sellable}
                            {product.category ? ` · ${product.category}` : ""}
                          </p>
                        </div>
                        <form action={setProductEssentialAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <input type="hidden" name="essential" value="true" />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value={hrefFor({ view: "oos", page: 1 })}
                          />
                          <AdminSubmit size="sm" variant="secondary">
                            Mark essential
                          </AdminSubmit>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {oosSorted.length === 0 ? (
              <AdminEmpty
                title="Nothing out of stock"
                body="Empty products show here automatically. Search above to mark fast movers as essential."
              />
            ) : (
              <>
                <ul className="divide-y divide-black/[0.06]">
                  {oosPage.map((product) => {
                    const sellable = sellableQty(product);
                    const out = sellable === 0;
                    return (
                      <li
                        key={product.id}
                        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div className="flex min-w-0 flex-1 gap-3">
                          <ProductThumb
                            name={product.name}
                            imageUrl={product.imageUrl}
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/admin/products/${product.id}`}
                                className="font-semibold text-ink hover:text-pine hover:underline"
                              >
                                {product.name}
                              </Link>
                              {product.essential ? (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                                  Essential
                                </span>
                              ) : null}
                              {out ? (
                                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-800">
                                  Out
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-ink/45">
                              {inventoryModeLabel(product.inventoryMode)}
                              {product.category
                                ? ` · ${product.category}`
                                : ""}
                              {" · "}
                              owned {product.stock} · digital{" "}
                              {product.digitalAvailable} · sellable{" "}
                              <span
                                className={`font-semibold tabular-nums ${
                                  out ? "text-red-800" : "text-ink"
                                }`}
                              >
                                {sellable}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <form action={setProductEssentialAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <input
                              type="hidden"
                              name="essential"
                              value={product.essential ? "false" : "true"}
                            />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={hrefFor({ view: "oos", page })}
                            />
                            <AdminSubmit size="sm" variant="secondary">
                              {product.essential
                                ? "Unmark essential"
                                : "Mark essential"}
                            </AdminSubmit>
                          </form>
                          <AdminBtn
                            href={`/admin/purchases?view=new&productId=${product.id}`}
                            size="sm"
                          >
                            Restock
                          </AdminBtn>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Pager
                  page={page}
                  pages={oosPages}
                  href={(p) => hrefFor({ page: p })}
                />
              </>
            )}
          </>
        ) : null}

        {/* QUEUE */}
        {view === "queue" ? (
          queueFiltered.length === 0 ? (
            <AdminEmpty
              title="Nothing in the queue"
              body={`Sellable stock, digital, and expiry within ${EXPIRY_ALERT_DAYS} days look fine.`}
              action={
                <AdminBtn
                  href={hrefFor({ view: "browse" })}
                  variant="secondary"
                  size="sm"
                >
                  Browse catalog
                </AdminBtn>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-black/[0.06]">
                {queuePage.map(({ product, primary, reasons }) => {
                  const reason = primary!;
                  const meta = INVENTORY_QUEUE_REASON_META[reason];
                  const sellable = sellableQty(product);
                  return (
                    <li
                      key={product.id}
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <ProductThumb
                          name={product.name}
                          imageUrl={product.imageUrl}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="font-semibold text-ink hover:text-pine hover:underline"
                            >
                              {product.name}
                            </Link>
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                              {meta.label}
                            </span>
                            <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-ink/50">
                              {inventoryModeLabel(product.inventoryMode)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink/45">
                            {product.unit} · {product.category}
                            {product.sellerVendor
                              ? ` · ${product.sellerVendor.name}`
                              : ""}
                          </p>
                          <p className="mt-1 text-sm text-ink/60">
                            Sellable{" "}
                            <span className="font-semibold tabular-nums text-ink">
                              {sellable}
                            </span>
                            <span className="text-ink/35">
                              {" "}
                              · owned {product.stock}
                              {(product.inventoryMode === "digital" ||
                                product.inventoryMode === "hybrid") &&
                              ` · digital ${product.digitalAvailable}`}
                            </span>
                          </p>
                          {reasons.length > 1 ? (
                            <p className="mt-0.5 text-[11px] text-ink/35">
                              Also:{" "}
                              {reasons
                                .slice(1)
                                .map(
                                  (r) => INVENTORY_QUEUE_REASON_META[r].label,
                                )
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        <AdminBtn
                          href={inventoryQueueCtaHrefForProduct(
                            product.id,
                            reason,
                          )}
                          size="sm"
                        >
                          {meta.cta}
                        </AdminBtn>
                        <AdminBtn
                          href={`/admin/products/${product.id}`}
                          variant="plain"
                          size="sm"
                        >
                          Open
                        </AdminBtn>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pager
                page={page}
                pages={queuePages}
                href={(p) => hrefFor({ page: p })}
              />
            </>
          )
        ) : null}

        {/* DIGITAL */}
        {view === "digital" ? (
          digitalFiltered.length === 0 ? (
            <AdminEmpty
              title="No digital stock"
              body="Products in digital or hybrid mode show here. Set availability on the product."
            />
          ) : (
            <>
              <ul className="divide-y divide-black/[0.06]">
                {digitalPage.map((product) => {
                  const short =
                    product.digitalAvailable <= LOW_STOCK_THRESHOLD;
                  return (
                    <li
                      key={product.id}
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <ProductThumb
                          name={product.name}
                          imageUrl={product.imageUrl}
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="font-semibold text-ink hover:text-pine hover:underline"
                          >
                            {product.name}
                          </Link>
                          <p className="mt-1 text-xs text-ink/45">
                            {inventoryModeLabel(product.inventoryMode)}
                            {product.sellerVendor
                              ? ` · primary ${product.sellerVendor.name}`
                              : ""}
                          </p>
                          <p className="mt-1 text-sm">
                            Digital{" "}
                            <span
                              className={`font-semibold tabular-nums ${
                                short ? "text-amber-900" : "text-ink"
                              }`}
                            >
                              {product.digitalAvailable}
                            </span>
                            <span className="text-ink/35">
                              {" "}
                              · owned {product.stock} · sellable{" "}
                              {sellableQty(product)}
                            </span>
                          </p>
                          {(digitalByProduct.get(product.id) ?? []).length >
                          0 ? (
                            <ul className="mt-1.5 space-y-0.5 text-xs text-ink/55">
                              {(digitalByProduct.get(product.id) ?? []).map(
                                (lot, i) => (
                                  <li key={`${product.id}-${i}`}>
                                    {lot.vendorName}
                                    {lot.billNo ? ` · ${lot.billNo}` : ""}
                                    <span className="tabular-nums text-ink/80">
                                      {" "}
                                      · {lot.remainingQty}
                                    </span>
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                      <AdminBtn
                        href={`/admin/products/${product.id}#adjust-stock`}
                        size="sm"
                      >
                        Update digital
                      </AdminBtn>
                    </li>
                  );
                })}
              </ul>
              <Pager
                page={page}
                pages={digitalPages}
                href={(p) => hrefFor({ page: p })}
              />
            </>
          )
        ) : null}

        {/* EXPIRY */}
        {view === "expiry" ? (
          expiringLots.length === 0 ? (
            <AdminEmpty
              title="No expiry pressure"
              body={`Lots with dates in the next ${EXPIRY_ALERT_DAYS} days (or already expired) show here.`}
            />
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {expiringLots.map((lot) => {
                const bucket = expiryBucket(lot.expiresAt!, now);
                const d = daysUntil(lot.expiresAt!, now);
                return (
                  <li
                    key={lot.id}
                    className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${lot.product.id}`}
                        className="font-semibold text-ink hover:text-pine hover:underline"
                      >
                        {lot.product.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink/45">
                        {lot.remainingQty} left ·{" "}
                        {lot.vendor?.name ?? "No supplier"}
                        {lot.billNo ? ` · bill ${lot.billNo}` : ""}
                      </p>
                      <p className={`mt-1 text-sm ${expiryTone(lot.expiresAt!, now)}`}>
                        {formatShortDate(lot.expiresAt!)}
                        {bucket === "expired"
                          ? " · expired"
                          : ` · ${d} day${d === 1 ? "" : "s"} left`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <form action={writeOffLotAction}>
                        <input type="hidden" name="id" value={lot.id} />
                        <input
                          type="hidden"
                          name="quantity"
                          value={String(lot.remainingQty)}
                        />
                        <input
                          type="hidden"
                          name="reason"
                          value={
                            bucket === "expired"
                              ? "Expired"
                              : "Near expiry write-off"
                          }
                        />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={hrefFor({ view: "expiry" })}
                        />
                        <AdminSubmit
                          size="sm"
                          variant={bucket === "expired" ? "danger" : "secondary"}
                        >
                          Write off {lot.remainingQty}
                        </AdminSubmit>
                      </form>
                      <AdminBtn
                        href={`/admin/products/${lot.product.id}#adjust-stock`}
                        variant="plain"
                        size="sm"
                      >
                        Product
                      </AdminBtn>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}

        {/* BROWSE */}
        {view === "browse" ? (
          browseFiltered.length === 0 ? (
            <AdminEmpty
              title="No products"
              body="Try another search, or add a product."
              action={
                <AdminBtn href="/admin/products/new" size="sm">
                  New product
                </AdminBtn>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-black/[0.06]">
                {browsePage.map((product) => {
                  const inQueue = productInInventoryQueue(product, now);
                  const sellable = sellableQty(product);
                  return (
                    <li
                      key={product.id}
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <ProductThumb
                          name={product.name}
                          imageUrl={product.imageUrl}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="font-semibold text-ink hover:text-pine hover:underline"
                            >
                              {product.name}
                            </Link>
                            {!product.published ? (
                              <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-ink/45">
                                Draft
                              </span>
                            ) : null}
                            {inQueue ? (
                              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                                In queue
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-ink/45">
                            {product.unit} · {product.category} ·{" "}
                            {inventoryModeLabel(product.inventoryMode)}
                          </p>
                          <p className="mt-1 text-sm text-ink/60">
                            Sellable{" "}
                            <span className="font-semibold tabular-nums text-ink">
                              {sellable}
                            </span>
                            <span className="text-ink/35">
                              {" "}
                              · owned {product.stock}
                              {product.digitalAvailable > 0
                                ? ` · digital ${product.digitalAvailable}`
                                : ""}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <AdminBtn
                          href={`/admin/purchases?view=new&productId=${product.id}`}
                          variant="secondary"
                          size="sm"
                        >
                          Restock
                        </AdminBtn>
                        <AdminBtn
                          href={`/admin/products/${product.id}`}
                          variant="plain"
                          size="sm"
                        >
                          Open
                        </AdminBtn>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pager
                page={page}
                pages={browsePages}
                href={(p) => hrefFor({ page: p })}
              />
            </>
          )
        ) : null}
      </AdminCard>
    </div>
  );
}

function ProductThumb({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string;
}) {
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#f0f2f0]">
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="44px" />
      ) : (
        <span className="flex h-full items-center justify-center text-[10px] font-bold text-ink/25">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function Pager({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (p: number) => string;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-3 text-sm sm:px-5">
      <p className="text-ink/45">
        Page {page} of {pages}
      </p>
      <div className="flex gap-1.5">
        {page > 1 ? (
          <AdminBtn href={href(page - 1)} variant="secondary" size="sm">
            Previous
          </AdminBtn>
        ) : null}
        {page < pages ? (
          <AdminBtn href={href(page + 1)} variant="secondary" size="sm">
            Next
          </AdminBtn>
        ) : null}
      </div>
    </div>
  );
}
