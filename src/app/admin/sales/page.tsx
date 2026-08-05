import { AdminCard } from "@/components/admin-ui";
import { OfflineSaleForm } from "@/components/offline-sale-form";
import { prisma } from "@/lib/db";
import { sellableQty } from "@/lib/inventory-mode";

export default async function AdminOfflineSalesPage() {
  const [allProducts, customers] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, sellOffline: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        stock: true,
        digitalAvailable: true,
        inventoryMode: true,
        price: true,
      },
    }),
    prisma.customer.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        phone: true,
        address1: true,
        address2: true,
      },
    }),
  ]);

  const products = allProducts.filter((p) => sellableQty(p) > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <p className="text-sm text-ink/55">
        Record a counter sale — Cash, Bank QR, or Credit. Uses owned and/or
        digital availability. Delivery addresses are saved on the customer (up
        to 2).
      </p>

      <AdminCard>
        <div className="mb-1">
          <h2 className="text-base font-semibold text-ink">New offline sale</h2>
          <p className="mt-0.5 text-xs text-ink/45">
            Only products tagged for Offline shop with sellable qty appear here.
          </p>
        </div>
        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 bg-[#fafbfc] px-3 py-6 text-center text-sm text-ink/45">
            No offline products available. Enable Offline shop and add owned
            stock or digital availability.
          </p>
        ) : (
          <OfflineSaleForm products={products} customers={customers} />
        )}
      </AdminCard>
    </div>
  );
}
