import Link from "next/link";
import { deleteProductAction } from "@/app/actions";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl text-ink">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-pine px-4 py-2 text-sm font-semibold text-mist"
        >
          Add product
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto border border-pine/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-pine/10 text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-pine/5">
                <td className="px-4 py-3">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-ink/45">{product.category}</div>
                </td>
                <td className="px-4 py-3">{formatNprFromInt(product.price)}</td>
                <td className="px-4 py-3">{product.stock}</td>
                <td className="px-4 py-3">
                  {product.published ? "Published" : "Hidden"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-pine hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <button
                        type="submit"
                        className="text-ink/45 hover:text-red-700"
                      >
                        Hide
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
