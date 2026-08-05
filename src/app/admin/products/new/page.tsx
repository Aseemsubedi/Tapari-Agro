import Link from "next/link";
import { ProductForm } from "@/components/product-form";
import { getCategoryNames, getUnitNames } from "@/lib/categories";
import { prisma } from "@/lib/db";

export default async function NewProductPage() {
  const [categories, units, vendors] = await Promise.all([
    getCategoryNames(),
    getUnitNames(),
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        href="/admin/products"
        className="inline-flex text-sm font-medium text-ink/50 hover:text-ink"
      >
        ← Products
      </Link>
      <p className="text-sm text-ink/55">
        Choose Owned (you hold stock) or Digital (supplier holds it). Hybrid
        uses both.
      </p>
      <ProductForm categories={categories} units={units} vendors={vendors} />
    </div>
  );
}
