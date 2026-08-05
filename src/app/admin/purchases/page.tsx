import Link from "next/link";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminStat,
} from "@/components/admin-ui";
import { PurchaseBillCard } from "@/components/purchase-bill-card";
import { PurchaseForm } from "@/components/purchase-form";
import {
  analysisRangeLabel,
  analysisRangeStart,
  parseAnalysisRange,
  type AnalysisRange,
} from "@/lib/analysis";
import { getUnitNames } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";
import { groupPurchaseBills } from "@/lib/purchase-bills";

type Props = {
  searchParams: Promise<{
    view?: string;
    status?: string;
    range?: string;
    q?: string;
    vendor?: string;
    productId?: string;
  }>;
};

export default async function AdminPurchasesPage({ searchParams }: Props) {
  const {
    view: viewParam,
    status: statusParam = "all",
    range: rangeParam,
    q = "",
    vendor: vendorParam = "",
    productId = "",
  } = await searchParams;

  // Purchases default to all time — shop keeps a long bill history.
  const range: AnalysisRange =
    rangeParam === undefined || rangeParam === ""
      ? "all"
      : parseAnalysisRange(rangeParam);
  const since = analysisRangeStart(range);

  const [products, purchases, units, vendors] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        stock: true,
        costPrice: true,
        digitalAvailable: true,
        inventoryMode: true,
        sellerUnitCost: true,
        imageUrl: true,
        published: true,
      },
    }),
    prisma.stockPurchase.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 400,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            unit: true,
            imageUrl: true,
          },
        },
        vendor: {
          select: { id: true, name: true },
        },
      },
    }),
    getUnitNames(),
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, address: true },
    }),
  ]);

  const allBills = groupPurchaseBills(purchases);
  const view =
    viewParam === "new" || viewParam === "history"
      ? viewParam
      : productId.trim()
        ? "new"
        : allBills.length === 0 && range === "all"
          ? "new"
          : "history";

  const status =
    statusParam === "pending" ||
    statusParam === "partial" ||
    statusParam === "settled" ||
    statusParam === "due"
      ? statusParam
      : "all";

  const spendTotal = allBills.reduce((sum, b) => sum + b.total, 0);
  const unpaidTotal = allBills.reduce((sum, b) => sum + b.due, 0);
  const unpaidCount = allBills.filter((b) => b.due > 0).length;

  const needle = q.trim().toLowerCase();
  const bills = allBills.filter((bill) => {
    if (vendorParam && bill.vendorId !== vendorParam) return false;
    if (status === "pending" && bill.status !== "Pending") return false;
    if (status === "partial" && bill.status !== "Partial") return false;
    if (status === "settled" && bill.status !== "Settled") return false;
    if (status === "due" && bill.due <= 0) return false;
    if (!needle) return true;
    const hay = [
      bill.vendorName ?? "",
      bill.billNo,
      bill.note,
      ...bill.lines.map((l) => l.product.name),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  function href(next: {
    view?: string;
    status?: string;
    range?: AnalysisRange;
    q?: string;
    vendor?: string;
  }) {
    const params = new URLSearchParams();
    const v = next.view ?? view;
    const s = next.status ?? status;
    const r = next.range ?? range;
    const query = next.q ?? q;
    const ven = next.vendor ?? vendorParam;
    if (v !== "history") params.set("view", v);
    if (s !== "all") params.set("status", s);
    if (r !== "all") params.set("range", r);
    if (query.trim()) params.set("q", query.trim());
    if (ven) params.set("vendor", ven);
    const str = params.toString();
    return str ? `/admin/purchases?${str}` : "/admin/purchases";
  }

  const redirectTo = href({});
  const ranges: { value: AnalysisRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "90d", label: "90d" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">
            Purchases
          </h2>
          <p className="mt-0.5 text-sm text-ink/50">
            Supplier bills · stock on save · pay dues in Money
          </p>
        </div>
        {view === "history" ? (
          <AdminBtn href={href({ view: "new" })} size="sm">
            New bill
          </AdminBtn>
        ) : (
          <AdminBtn
            href={href({ view: "history" })}
            variant="secondary"
            size="sm"
          >
            Bill history
          </AdminBtn>
        )}
      </div>

      {view === "new" ? (
        <AdminCard>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] pb-2.5">
            <div>
              <h3 className="text-base font-semibold text-ink">New bill</h3>
              <p className="mt-0.5 text-xs text-ink/45">
                Vendor · product lines with batch no · Owned / Digital.
              </p>
            </div>
          </div>
          <PurchaseForm
            products={products}
            units={units}
            vendors={vendors}
            initialProductId={productId.trim()}
          />
        </AdminCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminStat
              label="Bills"
              value={String(allBills.length)}
              hint={analysisRangeLabel(range)}
              href={href({ view: "history", status: "all" })}
            />
            <AdminStat
              label="Spend"
              value={formatNprFromInt(spendTotal)}
              hint={analysisRangeLabel(range)}
              href={href({ view: "history", status: "all" })}
            />
            <AdminStat
              label="Still due"
              value={formatNprFromInt(unpaidTotal)}
              hint={`${unpaidCount} open`}
              href={href({ view: "history", status: "due" })}
              tone={unpaidTotal > 0 ? "warn" : "ok"}
            />
          </div>

          <AdminCard flush>
            <div className="flex flex-wrap items-center gap-1 border-b border-black/[0.06] bg-[#fafbfc] px-2 py-1.5">
              <span className="mr-1 px-1 text-[10px] font-bold uppercase tracking-wide text-ink/35">
                Date
              </span>
              {ranges.map((r) => {
                const active = range === r.value;
                return (
                  <Link
                    key={r.value}
                    href={href({ view: "history", range: r.value })}
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      active
                        ? "bg-white text-pine shadow-sm ring-1 ring-black/5"
                        : "text-ink/45 hover:text-ink"
                    }`}
                  >
                    {r.label}
                  </Link>
                );
              })}
              <span
                className="mx-1 hidden h-4 w-px bg-black/10 sm:block"
                aria-hidden
              />
              <span className="mr-1 hidden px-1 text-[10px] font-bold uppercase tracking-wide text-ink/35 sm:inline">
                Status
              </span>
              {(
                [
                  { value: "all", label: "All" },
                  { value: "due", label: "Due" },
                  { value: "pending", label: "Pending" },
                  { value: "partial", label: "Partial" },
                  { value: "settled", label: "Settled" },
                ] as const
              ).map((tab) => {
                const active = status === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={href({ view: "history", status: tab.value })}
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      active
                        ? "bg-white text-ink shadow-sm ring-1 ring-black/5"
                        : "text-ink/45 hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            <form
              method="get"
              className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-3 py-2"
            >
              {status !== "all" ? (
                <input type="hidden" name="status" value={status} />
              ) : null}
              {range !== "all" ? (
                <input type="hidden" name="range" value={range} />
              ) : null}
              <input
                name="q"
                defaultValue={q}
                placeholder="Vendor, batch no, product…"
                className="min-w-[140px] flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-pine"
              />
              <select
                name="vendor"
                defaultValue={vendorParam}
                className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="">All vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-[#f7f8f9]"
              >
                Search
              </button>
            </form>

            {bills.length === 0 ? (
              <AdminEmpty
                title={
                  allBills.length === 0 ? "No purchases yet" : "No bills match"
                }
                body={
                  allBills.length === 0
                    ? "Record a supplier bill to add stock and track dues."
                    : "Try another date, status, or clear search."
                }
                action={
                  allBills.length === 0 ? (
                    <AdminBtn href={href({ view: "new" })} size="sm">
                      New bill
                    </AdminBtn>
                  ) : (
                    <AdminBtn
                      href={href({
                        view: "history",
                        status: "all",
                        range: "all",
                        q: "",
                        vendor: "",
                      })}
                      size="sm"
                      variant="secondary"
                    >
                      Clear filters
                    </AdminBtn>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {bills.map((bill) => (
                  <PurchaseBillCard
                    key={bill.key}
                    bill={bill}
                    redirectTo={redirectTo}
                  />
                ))}
              </ul>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}
