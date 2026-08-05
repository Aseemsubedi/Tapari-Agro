import { prisma } from "@/lib/db";
import { toStoreProduct } from "@/lib/products";
import type { Product } from "@/lib/types";

export type HomeShopSection = {
  id: string;
  title: string;
  eyebrow: string;
  products: Product[];
};

export async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { published: true, sellOnline: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map(toStoreProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const product = await prisma.product.findFirst({
    where: { slug, published: true, sellOnline: true },
  });
  return product ? toStoreProduct(product) : null;
}

/** Latest online products (fallback) */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { published: true, sellOnline: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return products.map(toStoreProduct);
}

/** Offline / physical shop catalog */
export async function getOfflineProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { published: true, sellOffline: true },
    orderBy: { name: "asc" },
  });
  return products.map(toStoreProduct);
}

/** Published homepage sections with online products */
export async function getHomeShopSections(): Promise<HomeShopSection[]> {
  const sections = await prisma.homeSection.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      products: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: { product: true },
      },
    },
  });

  return sections
    .map((section) => ({
      id: section.id,
      title: section.title,
      eyebrow: section.eyebrow,
      products: section.products
        .filter(
          (row) =>
            row.product.published &&
            row.product.sellOnline,
        )
        .map((row) => toStoreProduct(row.product)),
    }))
    .filter((section) => section.products.length > 0);
}
