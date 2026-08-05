"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { Product } from "@prisma/client";
import {
  saveProductAction,
  uploadProductImageAction,
} from "@/app/actions";
import { AdminCard, AdminSubmit } from "@/components/admin-ui";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/15";

function slugifyPreview(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-ink/45">{hint}</p> : null}
      </div>
      {children}
    </AdminCard>
  );
}

export function ProductForm({
  product,
  categories,
  units,
  vendors = [],
}: {
  product?: Product;
  categories: string[];
  units: string[];
  vendors?: { id: string; name: string }[];
}) {
  const [title, setTitle] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [cost, setCost] = useState(product?.costPrice ?? 0);
  const [selling, setSelling] = useState(product?.price ?? 0);
  const [inventoryMode, setInventoryMode] = useState(
    product?.inventoryMode ?? "owned",
  );
  const [addingCategory, setAddingCategory] = useState(categories.length === 0);
  const [addingUnit, setAddingUnit] = useState(units.length === 0);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    product?.category || categories[0] || "",
  );
  const [selectedUnit, setSelectedUnit] = useState(
    product?.unit || units[0] || "1 pack",
  );

  const sellerCost = product?.sellerUnitCost ?? 0;
  const digitalMargin =
    inventoryMode === "digital"
      ? selling - sellerCost
      : inventoryMode === "hybrid"
        ? selling - Math.round(((cost || 0) + (sellerCost || 0)) / 2)
        : selling - cost;
  const margin = inventoryMode === "owned" ? selling - cost : digitalMargin;
  const marginPct = selling > 0 ? Math.round((margin / selling) * 100) : 0;
  const autoSlug = useMemo(() => slugifyPreview(title), [title]);
  const handleValue = slugTouched ? slug : autoSlug;

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugifyPreview(value));
  }

  function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploadError(null);
    const data = new FormData();
    data.set("file", file);
    startUpload(async () => {
      const result = await uploadProductImageAction(data);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      if (result.url) setImageUrl(result.url);
    });
  }

  const categoryOptions = [...categories];
  if (product?.category && !categoryOptions.includes(product.category)) {
    categoryOptions.unshift(product.category);
  }

  const unitOptions = [...units];
  if (product?.unit && !unitOptions.includes(product.unit)) {
    unitOptions.unshift(product.unit);
  }

  return (
    <form action={saveProductAction} className="space-y-4 pb-24">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="slug" value={handleValue} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* ——— Main column ——— */}
        <div className="space-y-4">
          <Section title="Title" hint="Name customers see on the shop and search.">
            <div>
              <label className="text-xs font-medium text-ink/55" htmlFor="name">
                Product title
              </label>
              <input
                id="name"
                name="name"
                required
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Organic Mountain Honey"
                className={`${fieldClass} text-base font-medium`}
              />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-ink/55" htmlFor="slugEdit">
                  URL handle
                </label>
                {slugTouched ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugTouched(false);
                      setSlug(autoSlug);
                    }}
                    className="text-[11px] font-semibold text-pine hover:underline"
                  >
                    Reset to title
                  </button>
                ) : null}
              </div>
              <div className="mt-1.5 flex overflow-hidden rounded-lg border border-black/10 bg-[#fafbfc] focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/15">
                <span className="flex items-center border-r border-black/8 px-3 text-xs text-ink/40">
                  /shop/
                </span>
                <input
                  id="slugEdit"
                  value={handleValue}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugifyPreview(e.target.value));
                  }}
                  placeholder="auto-from-title"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink/40">
                SEO-friendly link · leave auto unless you need a custom URL
              </p>
            </div>
          </Section>

          <Section
            title="Media"
            hint="Square photos work best in the shop grid."
          >
            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-dashed border-black/15 bg-[#f7f8f9]">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
                    <span className="text-2xl text-ink/25">◎</span>
                    <span className="text-[11px] font-medium text-ink/40">
                      No image
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-[#f7f8f9]">
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => onFileChange(e.target.files)}
                  />
                </label>
                <div>
                  <label
                    className="text-xs font-medium text-ink/55"
                    htmlFor="imageUrlVisible"
                  >
                    Or paste image URL
                  </label>
                  <input
                    id="imageUrlVisible"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://…"
                    className={fieldClass}
                  />
                </div>
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="self-start text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove image
                  </button>
                ) : null}
                {uploadError ? (
                  <p className="text-xs text-red-600">{uploadError}</p>
                ) : null}
              </div>
            </div>
          </Section>

          <Section title="Description" hint="Shown on the product page.">
            <textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={product?.description}
              placeholder="Where it comes from, taste, how it’s packed…"
              className={fieldClass}
            />
          </Section>

          <Section title="Pricing" hint="Cost stays admin-only; selling price is public.">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  className="text-xs font-medium text-ink/55"
                  htmlFor="costPrice"
                >
                  Avg cost (NPR)
                </label>
                <input
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value) || 0)}
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] text-ink/40">
                  Weighted average from purchase records
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-ink/55" htmlFor="price">
                  Selling price (NPR)
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  required
                  value={selling}
                  onChange={(e) => setSelling(Number(e.target.value) || 0)}
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] text-ink/40">
                  One price on shop for all vendors
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink/55">Margin</p>
                <div
                  className={`mt-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                    margin > 0
                      ? "border-leaf/30 bg-leaf/10 text-pine"
                      : margin < 0
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-black/10 bg-[#fafbfc] text-ink"
                  }`}
                >
                  {margin >= 0 ? "+" : ""}
                  {margin.toLocaleString("en-NP")}{" "}
                  <span className="font-normal opacity-70">({marginPct}%)</span>
                </div>
                <p className="mt-1 text-[11px] text-ink/40">Profit / unit</p>
              </div>
            </div>
          </Section>

          <Section
            title="Inventory"
            hint="How this product is stocked for sales."
          >
            <div className="mb-4 rounded-xl border border-black/[0.06] bg-[#fafbfc] px-3 py-2.5 text-xs text-ink/55">
              <p>
                <span className="font-semibold text-ink">Owned</span> — you buy
                and hold (Purchases).{" "}
                <span className="font-semibold text-ink">Digital</span> — a
                supplier holds it; you sell and pay them later.{" "}
                <span className="font-semibold text-ink">Hybrid</span> — use your
                stock first, then theirs.
              </p>
            </div>
            <div>
              <label
                className="text-xs font-medium text-ink/55"
                htmlFor="inventoryMode"
              >
                Inventory mode
              </label>
              <select
                id="inventoryMode"
                name="inventoryMode"
                value={inventoryMode}
                onChange={(e) => setInventoryMode(e.target.value)}
                className={fieldClass}
              >
                <option value="owned">Owned — buy & hold</option>
                <option value="digital">Digital — supplier stock</option>
                <option value="hybrid">
                  Hybrid — owned first, then digital
                </option>
              </select>
            </div>

            {inventoryMode !== "digital" ? (
              <div className="mt-4">
                <label className="text-xs font-medium text-ink/55" htmlFor="stock">
                  Owned stock on hand
                </label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min={0}
                  defaultValue={product?.stock ?? 0}
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] text-ink/40">
                  Prefer updating via{" "}
                  <Link
                    href="/admin/purchases"
                    className="font-semibold text-pine hover:underline"
                  >
                    Purchases
                  </Link>{" "}
                  for real restocks.
                </p>
              </div>
            ) : (
              <input type="hidden" name="stock" value={product?.stock ?? 0} />
            )}

            {inventoryMode !== "owned" ? (
              <div className="mt-4 space-y-4 rounded-xl border border-pine/20 bg-pine/[0.04] p-4">
                <p className="text-xs font-semibold text-pine">
                  Digital inventory setup
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      className="text-xs font-medium text-ink/55"
                      htmlFor="sellerVendorId"
                    >
                      Supplier who holds this stock
                    </label>
                    <select
                      id="sellerVendorId"
                      name="sellerVendorId"
                      required={inventoryMode !== "owned"}
                      defaultValue={product?.sellerVendorId ?? ""}
                      className={fieldClass}
                    >
                      <option value="">Select supplier…</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    {vendors.length === 0 ? (
                      <p className="mt-1 text-[11px] text-amber-800">
                        Add a supplier under{" "}
                        <Link
                          href="/admin/suppliers"
                          className="font-semibold underline"
                        >
                          Suppliers
                        </Link>{" "}
                        first.
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-ink/40">
                        Orders that use digital qty will show this supplier in
                        admin.
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className="text-xs font-medium text-ink/55"
                      htmlFor="digitalAvailable"
                    >
                      Digital available (units)
                    </label>
                    <input
                      id="digitalAvailable"
                      name="digitalAvailable"
                      type="number"
                      min={0}
                      defaultValue={product?.digitalAvailable ?? 0}
                      className={fieldClass}
                    />
                    <p className="mt-1 text-[11px] text-ink/40">
                      How many they can still fulfill. Also editable in{" "}
                      <Link
                        href="/admin/inventory?view=digital"
                        className="font-semibold text-pine hover:underline"
                      >
                        Inventory → Digital
                      </Link>
                      .
                    </p>
                  </div>
                  <div>
                    <label
                      className="text-xs font-medium text-ink/55"
                      htmlFor="sellerUnitCost"
                    >
                      What you pay seller / unit (NPR)
                    </label>
                    <input
                      id="sellerUnitCost"
                      name="sellerUnitCost"
                      type="number"
                      min={0}
                      defaultValue={product?.sellerUnitCost ?? 0}
                      className={fieldClass}
                    />
                    <p className="mt-1 text-[11px] text-ink/40">
                      Used for margin and Money → Pay sellers
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <input type="hidden" name="digitalAvailable" value={0} />
                <input type="hidden" name="sellerUnitCost" value={0} />
                <input type="hidden" name="sellerVendorId" value="" />
              </>
            )}
          </Section>
        </div>

        {/* ——— Sidebar ——— */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <Section title="Status">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.06] bg-[#fafbfc] p-3 transition hover:border-pine/20">
              <input
                type="checkbox"
                name="published"
                defaultChecked={product?.published ?? true}
                className="mt-0.5 size-4 accent-pine"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Active product
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink/45">
                  Uncheck to keep as draft — hidden from shops.
                </span>
              </span>
            </label>

            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                Sales channels
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.06] bg-[#fafbfc] p-3 transition hover:border-pine/20">
                <input
                  type="checkbox"
                  name="sellOnline"
                  defaultChecked={product?.sellOnline ?? true}
                  className="mt-0.5 size-4 accent-pine"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Online store
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink/45">
                    Website shop and cart checkout.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.06] bg-[#fafbfc] p-3 transition hover:border-pine/20">
                <input
                  type="checkbox"
                  name="sellOffline"
                  defaultChecked={product?.sellOffline ?? true}
                  className="mt-0.5 size-4 accent-pine"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Offline shop
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink/45">
                    Counter / physical shop sales.
                  </span>
                </span>
              </label>
            </div>
          </Section>

          <Section title="Category & unit">
            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  className="text-xs font-medium text-ink/55"
                  htmlFor={addingCategory ? "newCategory" : "category"}
                >
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAddingCategory((v) => !v);
                    if (addingCategory) setNewCategory("");
                  }}
                  className="text-[11px] font-semibold text-pine hover:underline"
                >
                  {addingCategory ? "Pick existing" : "+ New"}
                </button>
              </div>
              {addingCategory ? (
                <input
                  id="newCategory"
                  name="newCategory"
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Spices"
                  className={fieldClass}
                  autoFocus
                />
              ) : (
                <select
                  id="category"
                  name="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={fieldClass}
                >
                  {categoryOptions.length === 0 ? (
                    <option value="">No categories yet</option>
                  ) : (
                    categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  className="text-xs font-medium text-ink/55"
                  htmlFor={addingUnit ? "newUnit" : "unit"}
                >
                  Unit / pack size
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAddingUnit((v) => !v);
                    if (addingUnit) setNewUnit("");
                  }}
                  className="text-[11px] font-semibold text-pine hover:underline"
                >
                  {addingUnit ? "Pick existing" : "+ New"}
                </button>
              </div>
              {addingUnit ? (
                <input
                  id="newUnit"
                  name="newUnit"
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="e.g. 250 g"
                  className={fieldClass}
                  autoFocus
                />
              ) : (
                <select
                  id="unit"
                  name="unit"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className={fieldClass}
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/[0.06] bg-[#eef0eb]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin/products"
            className="text-sm font-medium text-ink/50 hover:text-ink"
          >
            Discard
          </Link>
          <AdminSubmit className="min-w-[8.5rem]">
            {product ? "Save product" : "Add product"}
          </AdminSubmit>
        </div>
      </div>
    </form>
  );
}
