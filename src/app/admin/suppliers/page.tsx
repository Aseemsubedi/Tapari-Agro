import Link from "next/link";
import {
  AdminBtn,
  AdminCard,
  AdminEmpty,
} from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { groupPurchaseBills } from "@/lib/purchase-bills";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  searchParams: Promise<{ q?: string; view?: string }>;
};

type SupplierRow = {
  id: string;
  name: string;
  phone: string;
  address: string;
  bills: number;
  spend: number;
  paid: number;
  due: number;
  pendingBills: number;
  partialBills: number;
  lastAt: Date;
};

export default async function AdminSuppliersPage({ searchParams }: Props) {
  const { q = "", view: viewParam = "all" } = await searchParams;
  const view =
    viewParam === "due" || viewParam === "pending" || viewParam === "partial"
      ? viewParam
      : "all";

  const [vendors, purchases] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, address: true },
    }),
    prisma.stockPurchase.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        batchId: true,
        billNo: true,
        vendorId: true,
        quantity: true,
        unitCost: true,
        amountPaid: true,
        paid: true,
        payMethod: true,
        chequeNo: true,
        chequeDate: true,
        createdAt: true,
        vendor: { select: { id: true, name: true } },
      },
    }),
  ]);

  const purchaseBills = groupPurchaseBills(purchases);

  const map = new Map<string, SupplierRow>();
  for (const v of vendors) {
    map.set(v.id, {
      id: v.id,
      name: v.name,
      phone: v.phone,
      address: v.address,
      bills: 0,
      spend: 0,
      paid: 0,
      due: 0,
      pendingBills: 0,
      partialBills: 0,
      lastAt: new Date(0),
    });
  }

  for (const bill of purchaseBills) {
    if (!bill.vendorId) continue;
    let row = map.get(bill.vendorId);
    if (!row) {
      row = {
        id: bill.vendorId,
        name: bill.vendorName ?? "Unknown supplier",
        phone: "",
        address: "",
        bills: 0,
        spend: 0,
        paid: 0,
        due: 0,
        pendingBills: 0,
        partialBills: 0,
        lastAt: new Date(0),
      };
      map.set(bill.vendorId, row);
    }
    row.bills += 1;
    row.spend += bill.total;
    row.paid += bill.amountPaid;
    row.due += bill.due;
    if (bill.status === "Pending") row.pendingBills += 1;
    if (bill.status === "Partial") row.partialBills += 1;
    if (bill.createdAt > row.lastAt) row.lastAt = bill.createdAt;
  }

  let suppliers = [...map.values()];
  if (view === "due") {
    suppliers = suppliers.filter((s) => s.due > 0);
    suppliers.sort((a, b) => b.due - a.due);
  } else if (view === "pending") {
    suppliers = suppliers.filter((s) => s.pendingBills > 0);
    suppliers.sort((a, b) => b.due - a.due);
  } else if (view === "partial") {
    suppliers = suppliers.filter((s) => s.partialBills > 0);
    suppliers.sort((a, b) => b.due - a.due);
  } else {
    suppliers.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    suppliers = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.phone.replace(/\s+/g, "").includes(needle.replace(/\s+/g, "")) ||
        s.address.toLowerCase().includes(needle),
    );
  }

  const dueSuppliers = [...map.values()].filter((s) => s.due > 0);
  const dueTotal = dueSuppliers.reduce((s, r) => s + r.due, 0);

  function href(next: { view?: string; q?: string }) {
    const params = new URLSearchParams();
    const v = next.view ?? view;
    const query = next.q ?? q;
    if (v !== "all") params.set("view", v);
    if (query.trim()) params.set("q", query.trim());
    const s = params.toString();
    return s ? `/admin/suppliers?${s}` : "/admin/suppliers";
  }

  function statusBadge(s: SupplierRow) {
    if (s.due <= 0 && s.bills > 0) {
      return (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Settled
        </span>
      );
    }
    if (s.pendingBills > 0 && s.partialBills === 0 && s.paid === 0) {
      return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
          Pending
        </span>
      );
    }
    if (s.due > 0) {
      return (
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
          Partial
        </span>
      );
    }
    return (
      <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold text-ink/45">
        No bills
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-ink/55">
          Suppliers / kishan — purchase spend and what still needs to be settled.
        </p>
        <AdminBtn href="/admin/purchases?view=new" size="sm">
          New purchase
        </AdminBtn>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,36,24,0.04)]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
            Suppliers
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-ink">
            {map.size}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800/70">
            Need settlement
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-amber-900">
            {dueSuppliers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800/70">
            Total due
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-amber-900">
            {formatNprFromInt(dueTotal)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {[
          { value: "all", label: "All" },
          { value: "due", label: `Due (${dueSuppliers.length})` },
          {
            value: "pending",
            label: "Pending",
          },
          { value: "partial", label: "Partial" },
        ].map((tab) => {
          const active = view === tab.value;
          return (
            <Link
              key={tab.value}
              href={href({ view: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active ? "bg-pine/10 text-pine" : "text-ink/50 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex gap-2">
        {view !== "all" ? (
          <input type="hidden" name="view" value={view} />
        ) : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, phone, address…"
          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-pine"
        />
        <button
          type="submit"
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold shadow-sm"
        >
          Search
        </button>
      </form>

      <AdminCard flush>
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#fafbfc] text-xs text-ink/45">
              <tr>
                <th className="px-4 py-2.5 font-medium">Supplier</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
                <th className="px-4 py-2.5 font-medium text-right">Bills</th>
                <th className="px-4 py-2.5 font-medium text-right">Spend</th>
                <th className="px-4 py-2.5 font-medium text-right">Paid</th>
                <th className="px-4 py-2.5 font-medium text-right">Due</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-[#f7f8f9]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/suppliers/${s.id}`}
                      className="font-medium text-pine hover:underline"
                    >
                      {s.name}
                    </Link>
                    {s.address ? (
                      <p className="mt-0.5 truncate text-[11px] text-ink/40">
                        {s.address}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {statusBadge(s)}
                      {s.pendingBills > 0 || s.partialBills > 0 ? (
                        <span className="text-[10px] text-ink/40">
                          {s.pendingBills > 0
                            ? `${s.pendingBills} pending`
                            : ""}
                          {s.pendingBills > 0 && s.partialBills > 0
                            ? " · "
                            : ""}
                          {s.partialBills > 0
                            ? `${s.partialBills} partial`
                            : ""}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.bills}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatNprFromInt(s.spend)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {formatNprFromInt(s.paid)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      s.due > 0 ? "text-amber-800" : "text-ink/35"
                    }`}
                  >
                    {s.due > 0 ? formatNprFromInt(s.due) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.phone ? (
                      <a
                        href={`tel:${s.phone.replace(/\s+/g, "")}`}
                        className="text-xs font-semibold text-pine hover:underline"
                      >
                        {s.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-ink/35">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <AdminEmpty
                      title={
                        view === "all"
                          ? "No suppliers yet"
                          : "No matching suppliers"
                      }
                      body="Add a vendor when recording a purchase, or from a product."
                      action={
                        <AdminBtn href="/admin/purchases" size="sm">
                          Record purchase
                        </AdminBtn>
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
