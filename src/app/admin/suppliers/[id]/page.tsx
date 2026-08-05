import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminBtn,
  AdminCard,
  AdminCardHeader,
  AdminEmpty,
} from "@/components/admin-ui";
import { PurchaseBillCard } from "@/components/purchase-bill-card";
import { prisma } from "@/lib/db";
import { groupPurchaseBills } from "@/lib/purchase-bills";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSupplierDetailPage({ params }: Props) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  const purchases = await prisma.stockPurchase.findMany({
    where: { vendorId: id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { id: true, name: true, unit: true, imageUrl: true },
      },
      vendor: { select: { id: true, name: true } },
    },
  });

  const bills = groupPurchaseBills(purchases);
  const spend = bills.reduce((s, b) => s + b.total, 0);
  const paid = bills.reduce((s, b) => s + b.amountPaid, 0);
  const due = bills.reduce((s, b) => s + b.due, 0);
  const dueBills = bills.filter((b) => b.due > 0);
  const redirectTo = `/admin/suppliers/${id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/admin/suppliers?view=due"
        className="inline-flex text-sm font-medium text-ink/50 hover:text-ink"
      >
        ← Suppliers
      </Link>

      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink/45">Supplier</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
              {vendor.name}
            </h2>
            <p className="mt-1 text-sm text-ink/55">
              {vendor.phone || "No phone"}
              {vendor.address ? ` · ${vendor.address}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {vendor.phone ? (
              <a
                href={`tel:${vendor.phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center rounded-lg bg-pine px-3.5 py-2 text-sm font-semibold text-white"
              >
                Call
              </a>
            ) : null}
            <AdminBtn
              href={`/admin/purchases?view=new`}
              variant="secondary"
              size="sm"
            >
              New purchase
            </AdminBtn>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Bills
            </p>
            <p className="font-display text-lg font-bold">{bills.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Spend
            </p>
            <p className="font-display text-lg font-bold tabular-nums">
              {formatNprFromInt(spend)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Paid
            </p>
            <p className="font-display text-lg font-bold tabular-nums text-emerald-700">
              {formatNprFromInt(paid)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Due
            </p>
            <p
              className={`font-display text-lg font-bold tabular-nums ${
                due > 0 ? "text-amber-800" : "text-ink"
              }`}
            >
              {formatNprFromInt(due)}
            </p>
          </div>
        </div>
      </AdminCard>

      {due > 0 ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">{formatNprFromInt(due)} due</span>
          {" across "}
          {dueBills.length} bill{dueBills.length === 1 ? "" : "s"} — settle
          Settle below or open{" "}
          <Link
            href="/admin/payments?view=pay"
            className="font-semibold underline-offset-2 hover:underline"
          >
            Money → Pay purchases
          </Link>
          .
        </p>
      ) : null}

      <AdminCard flush>
        <AdminCardHeader
          title="Purchase history"
          action={
            <AdminBtn href="/admin/purchases?view=new" size="sm" variant="secondary">
              New bill
            </AdminBtn>
          }
        />
        {bills.length === 0 ? (
          <AdminEmpty
            title="No purchases yet"
            body="Record a purchase bill for this supplier."
            action={
              <AdminBtn href="/admin/purchases?view=new" size="sm">
                New purchase
              </AdminBtn>
            }
          />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {bills.map((bill) => (
              <PurchaseBillCard
                key={bill.key}
                bill={bill}
                redirectTo={redirectTo}
                showVendor={false}
              />
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
