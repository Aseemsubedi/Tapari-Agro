import { prisma } from "@/lib/db";
import { slugify } from "@/lib/products";

/** Defaults used before first seed / if DB empty */
export const FALLBACK_CATEGORIES = [
  "Spices",
  "Honey",
  "Grains",
  "Oils",
  "Tea",
  "Pulses",
  "Other",
] as const;

export const FALLBACK_UNITS = [
  "50 g",
  "100 g",
  "250 g",
  "500 g",
  "1 kg",
  "1 L",
  "500 ml",
  "1 pack",
  "1 piece",
] as const;

/** @deprecated use getCategoryNames — kept for any static imports */
export const PRODUCT_CATEGORIES = FALLBACK_CATEGORIES;
export type ProductCategory = (typeof FALLBACK_CATEGORIES)[number];

export async function getCategories() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function getCategoryNames(): Promise<string[]> {
  const rows = await getCategories();
  if (rows.length === 0) return [...FALLBACK_CATEGORIES];
  return rows.map((r) => r.name);
}

export async function getUnits() {
  return prisma.unit.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function getUnitNames(): Promise<string[]> {
  const rows = await getUnits();
  if (rows.length === 0) return [...FALLBACK_UNITS];
  return rows.map((r) => r.name);
}

export function categorySlug(name: string) {
  return slugify(name);
}

export function marginAmount(selling: number, cost: number) {
  return selling - cost;
}

export function marginPercent(selling: number, cost: number) {
  if (selling <= 0) return 0;
  return Math.round(((selling - cost) / selling) * 100);
}
