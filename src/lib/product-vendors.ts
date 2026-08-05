import { prisma } from "@/lib/db";

/**
 * Product↔vendor links follow purchase records only (not manual admin picks).
 * Creates missing links; removes links with no purchase history for these products.
 */
export async function syncProductVendorsFromPurchases(
  productIds: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any = prisma,
) {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return;

  const rows = await client.stockPurchase.findMany({
    where: {
      productId: { in: ids },
      vendorId: { not: null },
    },
    select: { productId: true, vendorId: true },
  });

  const wantedByProduct = new Map<string, Set<string>>();
  for (const id of ids) wantedByProduct.set(id, new Set());

  for (const row of rows) {
    if (!row.vendorId) continue;
    wantedByProduct.get(row.productId)?.add(row.vendorId);

    const exists = await client.productVendor.findUnique({
      where: {
        productId_vendorId: {
          productId: row.productId,
          vendorId: row.vendorId,
        },
      },
    });
    if (!exists) {
      await client.productVendor.create({
        data: { productId: row.productId, vendorId: row.vendorId },
      });
    }
  }

  for (const productId of ids) {
    const keep = [...(wantedByProduct.get(productId) ?? [])];
    if (keep.length === 0) {
      await client.productVendor.deleteMany({ where: { productId } });
    } else {
      await client.productVendor.deleteMany({
        where: { productId, vendorId: { notIn: keep } },
      });
    }
  }
}

/** Backfill all products that have purchase vendors. */
export async function syncAllProductVendorsFromPurchases() {
  const rows = await prisma.stockPurchase.findMany({
    where: { vendorId: { not: null } },
    select: { productId: true },
    distinct: ["productId"],
  });
  await syncProductVendorsFromPurchases(rows.map((r) => r.productId));
}
