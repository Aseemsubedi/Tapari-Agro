import { ProductTile } from "@/components/product-tile";
import type { Product } from "@/lib/types";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-ink/45">
        No products yet. Add them from the admin panel.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-7">
      {products.map((product) => (
        <ProductTile key={product.id} product={product} />
      ))}
    </div>
  );
}
