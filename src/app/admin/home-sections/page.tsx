import Image from "next/image";
import Link from "next/link";
import {
  addProductToSectionAction,
  clearHomeSectionProductsAction,
  createHomeSectionAction,
  deleteHomeSectionAction,
  duplicateHomeSectionAction,
  mergeHomeSectionsAction,
  moveHomeSectionAction,
  moveSectionProductAction,
  relocateSectionProductAction,
  removeProductFromSectionAction,
  toggleHomeSectionPublishedAction,
  updateHomeSectionAction,
} from "@/app/actions";
import {
  AdminBtn,
  AdminCard,
  AdminCardHeader,
  AdminEmpty,
  AdminSubmit,
} from "@/components/admin-ui";
import { SectionProductPicker } from "@/components/section-product-picker";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";

const SECTION_PRESETS = [
  { title: "Local Product", eyebrow: "From the hills" },
  { title: "Spices", eyebrow: "Kitchen staples" },
  { title: "Honey & oil", eyebrow: "Pressed & pure" },
  { title: "Seasonal picks", eyebrow: "This week" },
  { title: "Bestsellers", eyebrow: "Most ordered" },
] as const;

/** Ensure at least one starter section exists (migrates old featured pins). */
async function ensureDefaultSections() {
  const count = await prisma.homeSection.count();
  if (count > 0) return;

  const section = await prisma.homeSection.create({
    data: {
      title: "Local Product",
      eyebrow: "From the hills",
      sortOrder: 0,
      published: true,
    },
  });

  const featured = await prisma.product.findMany({
    where: { featuredOnHome: true, published: true, sellOnline: true },
    orderBy: [{ homeSortOrder: "asc" }, { name: "asc" }],
  });

  const products =
    featured.length > 0
      ? featured
      : await prisma.product.findMany({
          where: { published: true, sellOnline: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        });

  if (products.length > 0) {
    await prisma.homeSectionProduct.createMany({
      data: products.map((p, i) => ({
        sectionId: section.id,
        productId: p.id,
        sortOrder: i,
      })),
    });
  }
}

export default async function AdminHomeSectionsPage() {
  await ensureDefaultSections();

  const [sections, catalog] = await Promise.all([
    prisma.homeSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        products: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          include: { product: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { published: true, sellOnline: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        unit: true,
        imageUrl: true,
      },
    }),
  ]);

  const existingTitles = new Set(
    sections.map((s) => s.title.trim().toLowerCase()),
  );
  const unusedPresets = SECTION_PRESETS.filter(
    (p) => !existingTitles.has(p.title.toLowerCase()),
  );

  const publishedCount = sections.filter((s) => s.published).length;
  const productCount = sections.reduce((n, s) => n + s.products.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-ink/55">
          Homepage product grids — create sections, add many products at once,
          reorder, merge, or remove. Only published sections with products show
          on the store.
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Sections
            </p>
            <p className="font-display text-lg font-bold">
              {sections.length}
              <span className="ml-1 text-xs font-medium text-ink/40">
                ({publishedCount} live)
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Placements
            </p>
            <p className="font-display text-lg font-bold">{productCount}</p>
          </div>
          <AdminBtn href="/admin/products" variant="secondary" size="sm">
            Products
          </AdminBtn>
        </div>
      </div>

      <AdminCard>
        <h2 className="text-sm font-semibold text-ink">New section</h2>
        <p className="mt-0.5 text-xs text-ink/45">
          Quick presets or a custom title. You can merge sections later.
        </p>

        {unusedPresets.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {unusedPresets.map((preset) => (
              <form key={preset.title} action={createHomeSectionAction}>
                <input type="hidden" name="title" value={preset.title} />
                <input type="hidden" name="eyebrow" value={preset.eyebrow} />
                <button
                  type="submit"
                  className="rounded-full border border-pine/20 bg-pine/5 px-3 py-1.5 text-[12px] font-semibold text-pine transition hover:bg-pine/10"
                >
                  + {preset.title}
                </button>
              </form>
            ))}
          </div>
        ) : null}

        <form
          action={createHomeSectionAction}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-[140px] flex-1 text-xs font-medium text-ink/55">
            Eyebrow
            <input
              name="eyebrow"
              placeholder="e.g. From the hills"
              className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
            />
          </label>
          <label className="min-w-[180px] flex-[2] text-xs font-medium text-ink/55">
            Title
            <input
              name="title"
              required
              placeholder="e.g. Seasonal picks"
              className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
            />
          </label>
          <AdminSubmit>Create section</AdminSubmit>
        </form>
      </AdminCard>

      {sections.length === 0 ? (
        <AdminEmpty
          title="No sections yet"
          body="Create a section above, then add products to show on the homepage."
        />
      ) : (
        sections.map((section, sectionIndex) => {
          const usedIds = new Set(section.products.map((r) => r.productId));
          const available = catalog.filter((p) => !usedIds.has(p.id));
          const otherSections = sections.filter((s) => s.id !== section.id);
          const emptyLive = section.published && section.products.length === 0;

          return (
            <AdminCard key={section.id} flush>
              <AdminCardHeader
                title={section.title}
                action={
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        section.published
                          ? emptyLive
                            ? "bg-amber-50 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                          : "bg-mist text-ink/50"
                      }`}
                    >
                      {!section.published
                        ? "Hidden"
                        : emptyLive
                          ? "Live · empty"
                          : `${section.products.length} live`}
                    </span>
                    <form action={moveHomeSectionAction}>
                      <input type="hidden" name="id" value={section.id} />
                      <input type="hidden" name="direction" value="up" />
                      <AdminSubmit
                        size="sm"
                        variant="secondary"
                        disabled={sectionIndex === 0}
                      >
                        ↑
                      </AdminSubmit>
                    </form>
                    <form action={moveHomeSectionAction}>
                      <input type="hidden" name="id" value={section.id} />
                      <input type="hidden" name="direction" value="down" />
                      <AdminSubmit
                        size="sm"
                        variant="secondary"
                        disabled={sectionIndex === sections.length - 1}
                      >
                        ↓
                      </AdminSubmit>
                    </form>
                    <form action={toggleHomeSectionPublishedAction}>
                      <input type="hidden" name="id" value={section.id} />
                      <AdminSubmit size="sm" variant="secondary">
                        {section.published ? "Hide" : "Publish"}
                      </AdminSubmit>
                    </form>
                    <form action={duplicateHomeSectionAction}>
                      <input type="hidden" name="id" value={section.id} />
                      <AdminSubmit size="sm" variant="secondary">
                        Duplicate
                      </AdminSubmit>
                    </form>
                    <form action={deleteHomeSectionAction}>
                      <input type="hidden" name="id" value={section.id} />
                      <AdminSubmit size="sm" variant="danger">
                        Delete
                      </AdminSubmit>
                    </form>
                  </div>
                }
              />

              <div className="space-y-4 p-4 sm:p-5">
                {emptyLive ? (
                  <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-900">
                    This section is published but empty — it will not appear on
                    the homepage until you add products.
                  </p>
                ) : null}

                <form
                  action={updateHomeSectionAction}
                  className="flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="id" value={section.id} />
                  <label className="min-w-[120px] flex-1 text-xs font-medium text-ink/55">
                    Eyebrow
                    <input
                      name="eyebrow"
                      defaultValue={section.eyebrow}
                      className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
                    />
                  </label>
                  <label className="min-w-[160px] flex-[2] text-xs font-medium text-ink/55">
                    Title
                    <input
                      name="title"
                      required
                      defaultValue={section.title}
                      className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs font-medium text-ink/70">
                    <input
                      type="checkbox"
                      name="published"
                      defaultChecked={section.published}
                      className="size-4 accent-pine"
                    />
                    Show on homepage
                  </label>
                  <AdminSubmit size="sm" variant="secondary">
                    Save
                  </AdminSubmit>
                </form>

                {otherSections.length > 0 ? (
                  <div className="flex flex-wrap items-end gap-2 rounded-xl border border-black/[0.06] bg-[#fafbfc] p-3">
                    <form
                      action={mergeHomeSectionsAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="sourceId" value={section.id} />
                      <label className="text-xs font-medium text-ink/55">
                        Merge this section into
                        <select
                          name="targetId"
                          required
                          className="mt-1.5 block min-w-[10rem] rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-pine"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Choose section…
                          </option>
                          {otherSections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <AdminSubmit size="sm" variant="secondary">
                        Merge & delete
                      </AdminSubmit>
                    </form>
                    <p className="text-[11px] text-ink/40">
                      Products move to the target (duplicates skipped). This
                      section is removed.
                    </p>
                  </div>
                ) : null}

                {section.products.length === 0 ? (
                  <p className="text-sm text-ink/45">
                    No products in this section yet.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-ink/50">
                        {section.products.length} product
                        {section.products.length === 1 ? "" : "s"}
                      </p>
                      <form action={clearHomeSectionProductsAction}>
                        <input
                          type="hidden"
                          name="sectionId"
                          value={section.id}
                        />
                        <AdminSubmit size="sm" variant="secondary">
                          Remove all
                        </AdminSubmit>
                      </form>
                    </div>
                    <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.06]">
                      {section.products.map((row, index) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#eee]">
                            {row.product.imageUrl ? (
                              <Image
                                src={row.product.imageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="44px"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              <Link
                                href={`/admin/products/${row.product.id}`}
                                className="hover:underline"
                              >
                                {row.product.name}
                              </Link>
                            </p>
                            <p className="text-xs text-ink/45">
                              {formatNprFromInt(row.product.price)} ·{" "}
                              {row.product.unit}
                              {row.product.category
                                ? ` · ${row.product.category}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <form action={moveSectionProductAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="direction" value="up" />
                              <AdminSubmit
                                size="sm"
                                variant="secondary"
                                disabled={index === 0}
                              >
                                ↑
                              </AdminSubmit>
                            </form>
                            <form action={moveSectionProductAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input
                                type="hidden"
                                name="direction"
                                value="down"
                              />
                              <AdminSubmit
                                size="sm"
                                variant="secondary"
                                disabled={
                                  index === section.products.length - 1
                                }
                              >
                                ↓
                              </AdminSubmit>
                            </form>
                            {otherSections.length > 0 ? (
                              <form
                                action={relocateSectionProductAction}
                                className="flex items-center gap-1"
                              >
                                <input type="hidden" name="id" value={row.id} />
                                <input type="hidden" name="mode" value="move" />
                                <select
                                  name="targetSectionId"
                                  required
                                  defaultValue=""
                                  className="max-w-[7.5rem] rounded-md border border-black/10 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-pine"
                                >
                                  <option value="" disabled>
                                    Move to…
                                  </option>
                                  {otherSections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.title}
                                    </option>
                                  ))}
                                </select>
                                <AdminSubmit size="sm" variant="secondary">
                                  Go
                                </AdminSubmit>
                              </form>
                            ) : null}
                            <form action={removeProductFromSectionAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <AdminSubmit size="sm" variant="secondary">
                                Remove
                              </AdminSubmit>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {available.length > 0 ? (
                  <SectionProductPicker
                    sectionId={section.id}
                    products={available.map((p) => ({
                      id: p.id,
                      name: p.name,
                      category: p.category,
                    }))}
                    action={addProductToSectionAction}
                  />
                ) : (
                  <p className="border-t border-black/[0.06] pt-4 text-xs text-ink/40">
                    All online products are already in this section.{" "}
                    <AdminBtn
                      href="/admin/products/new"
                      variant="plain"
                      size="sm"
                    >
                      Add a product
                    </AdminBtn>
                  </p>
                )}
              </div>
            </AdminCard>
          );
        })
      )}
    </div>
  );
}
