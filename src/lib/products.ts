import type { Product as DbProduct } from "@prisma/client";
import { isInStock } from "@/lib/inventory-mode";
import type { Product } from "@/lib/types";
import { formatNpr } from "@/lib/format";

/** Prefer square crops for Unsplash so shop tiles stay even. */
function normalizeImageUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("unsplash.com")) return url;
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", "800");
    parsed.searchParams.set("h", "800");
    parsed.searchParams.set("q", "85");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function toStoreProduct(product: DbProduct): Product {
  const imageUrl = normalizeImageUrl(product.imageUrl);
  // Never expose inventory mode, digital qty, or supplier fields to the shop.
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
    images: imageUrl
      ? [{ id: 1, src: imageUrl, alt: product.name }]
      : [],
    stockStatus: isInStock(product) ? "instock" : "outofstock",
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
  return formatNpr(amount);
}
