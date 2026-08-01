import type { Product } from "@prisma/client";
import { saveProductAction } from "@/app/actions";

export function ProductForm({ product }: { product?: Product }) {
  return (
    <form action={saveProductAction} className="mt-8 max-w-xl space-y-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div>
        <label className="text-xs font-medium text-ink/60" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={product?.name}
          className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-ink/60" htmlFor="slug">
          Slug (optional)
        </label>
        <input
          id="slug"
          name="slug"
          defaultValue={product?.slug}
          className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-ink/60" htmlFor="price">
            Price (NPR)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            required
            defaultValue={product?.price ?? 0}
            className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink/60" htmlFor="unit">
            Unit
          </label>
          <input
            id="unit"
            name="unit"
            placeholder="1 kg, 500 g, 1 L…"
            defaultValue={product?.unit ?? "1 pack"}
            className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink/60" htmlFor="stock">
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min={0}
            defaultValue={product?.stock ?? 0}
            className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-ink/60" htmlFor="category">
          Category
        </label>
        <input
          id="category"
          name="category"
          defaultValue={product?.category}
          className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-ink/60" htmlFor="imageUrl">
          Image URL
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          defaultValue={product?.imageUrl}
          placeholder="https://..."
          className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          className="text-xs font-medium text-ink/60"
          htmlFor="description"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={product?.description}
          className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input
          type="checkbox"
          name="published"
          defaultChecked={product?.published ?? true}
        />
        Published on storefront
      </label>

      <button
        type="submit"
        className="bg-pine px-5 py-3 text-sm font-semibold text-mist"
      >
        {product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
