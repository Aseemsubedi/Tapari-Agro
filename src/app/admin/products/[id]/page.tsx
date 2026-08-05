import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { ProductStockAdjust } from "@/components/product-stock-adjust";
import { ProductVendorsPanel } from "@/components/product-vendors-panel";
import { AdminBtn } from "@/components/admin-ui";
import { getCategoryNames, getUnitNames } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { syncProductVendorsFromPurchases } from "@/lib/product-vendors";
import { summarizeProductVendors } from "@/lib/vendor-costs";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  await syncProductVendorsFromPurchases([id]);

  const [product, categories, units, purchases, vendors, openDigitalLots] =
    await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getCategoryNames(),
    getUnitNames(),
    prisma.stockPurchase.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        vendor: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.stockPurchase.findMany({
      where: {
        productId: id,
        stockKind: "digital",
        remainingQty: { gt: 0 },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        remainingQty: true,
        unitCost: true,
        billNo: true,
        vendor: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!product) notFound();

  const purchaseVendors = summarizeProductVendors(purchases);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/products"
          className="inline-flex text-sm font-medium text-ink/50 hover:text-ink"
        >
          ← Products
        </Link>
        <div className="flex gap-2">
          <AdminBtn href="/admin/inventory" variant="plain" size="sm">
            Inventory
          </AdminBtn>
          {product.sellOnline ? (
            <AdminBtn
              href={`/shop/${product.slug}`}
              variant="secondary"
              size="sm"
            >
              View on shop
            </AdminBtn>
          ) : null}
          <AdminBtn
            href={`/admin/purchases?view=new&productId=${product.id}`}
            variant="plain"
            size="sm"
          >
            Restock →
          </AdminBtn>
        </div>
      </div>

      {purchaseVendors.length > 0 ? (
        <p className="rounded-xl border border-pine/15 bg-pine/[0.04] px-3 py-2 text-xs text-ink/60">
          Linked to {purchaseVendors.length} supplier
          {purchaseVendors.length === 1 ? "" : "s"} from purchase records
          {purchaseVendors.map((v) => v.name).length
            ? `: ${purchaseVendors.map((v) => v.name).join(", ")}`
            : ""}
          .
        </p>
      ) : null}

      <ProductStockAdjust product={product} digitalLots={openDigitalLots} />

      <ProductForm
        product={product}
        categories={categories}
        units={units}
        vendors={vendors}
      />

      <ProductVendorsPanel
        avgCost={product.costPrice ?? 0}
        sellPrice={product.price}
        purchases={purchases}
      />
    </div>
  );
}
