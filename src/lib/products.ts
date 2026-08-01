import type { Product as DbProduct } from "@prisma/client";
import type { Product } from "@/lib/types";

export function toStoreProduct(product: DbProduct): Product {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: String(product.price),
    unit: product.unit || "1 pack",
    regularPrice: String(product.price),
    salePrice: "",
    onSale: false,
    description: product.description,
    shortDescription: product.description.slice(0, 140),
    images: product.imageUrl
      ? [{ id: 1, src: product.imageUrl, alt: product.name }]
      : [],
    stockStatus: product.stock > 0 ? "instock" : "outofstock",
    categories: product.category
      ? [{ id: 1, name: product.category, slug: product.category.toLowerCase() }]
      : [],
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatNprFromInt(amount: number): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount);
}
