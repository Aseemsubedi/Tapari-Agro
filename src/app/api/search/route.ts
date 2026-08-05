import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";
import {
  filterProductsByQuery,
  toSearchHit,
} from "@/lib/product-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") ?? "").trim();
  const limitRaw = Number.parseInt(String(searchParams.get("limit") ?? "8"), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 24)
    : 8;

  if (!q) {
    return NextResponse.json({ q: "", total: 0, results: [] });
  }

  const products = await getProducts();
  const matched = filterProductsByQuery(products, q);
  const results = matched.slice(0, limit).map(toSearchHit);

  return NextResponse.json({
    q,
    total: matched.length,
    results,
  });
}
