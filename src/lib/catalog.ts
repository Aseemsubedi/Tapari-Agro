import { prisma } from "@/lib/db";
import { toStoreProduct } from "@/lib/products";
import type { Product } from "@/lib/types";

export async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map(toStoreProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const product = await prisma.product.findFirst({
    where: { slug, published: true },
  });
  return product ? toStoreProduct(product) : null;
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return products.map(toStoreProduct);
}
