import type { Product } from "@/lib/types";

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function tokensOf(query: string) {
  return query
    .toLowerCase()
    .trim()
    .split(/[\s,/+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Fields customers type against when searching the shop. */
export function productSearchText(product: Product) {
  return [
    product.name,
    product.slug.replace(/-/g, " "),
    product.unit,
    product.shortDescription,
    stripHtml(product.description),
    ...product.categories.map((c) => c.name),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Score a product against a query. Higher is better.
 * Returns 0 when it should not appear in results.
 */
export function scoreProduct(product: Product, query: string): number {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return 0;

  const name = product.name.toLowerCase();
  const slug = product.slug.toLowerCase().replace(/-/g, " ");
  const category = (product.categories[0]?.name ?? "").toLowerCase();
  const haystack = productSearchText(product);

  // Every token must appear somewhere (AND) so short typos don't empty the grid.
  for (const token of tokens) {
    if (!haystack.includes(token)) return 0;
  }

  let score = 10;
  const joined = tokens.join(" ");

  if (name === joined) score += 200;
  else if (name.startsWith(joined)) score += 120;
  else if (name.includes(joined)) score += 80;

  for (const token of tokens) {
    if (name.startsWith(token)) score += 40;
    else if (name.includes(token)) score += 24;
    if (slug.includes(token)) score += 12;
    if (category.includes(token)) score += 18;
  }

  if (product.stockStatus === "instock") score += 5;

  return score;
}

export function filterProductsByQuery(
  products: Product[],
  query: string,
): Product[] {
  const q = query.trim();
  if (!q) return products;

  return products
    .map((product) => ({ product, score: scoreProduct(product, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map((row) => row.product);
}

export type SearchHit = {
  id: string;
  name: string;
  slug: string;
  price: string;
  unit: string;
  image: string | null;
  category: string;
  inStock: boolean;
};

export function toSearchHit(product: Product): SearchHit {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    unit: product.unit,
    image: product.images[0]?.src ?? null,
    category: product.categories[0]?.name ?? "",
    inStock: product.stockStatus === "instock",
  };
}
