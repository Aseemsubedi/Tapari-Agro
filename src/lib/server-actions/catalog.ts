"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  setDigitalRemainingTotal,
  syncDigitalAvailable,
} from "@/lib/digital-lots";
import { isInventoryMode } from "@/lib/inventory-mode";
import { syncProductVendorsFromPurchases } from "@/lib/product-vendors";
import { slugify } from "@/lib/products";
import { reconcileLotsToStock } from "@/lib/stock-lots";
import { requireAdmin, revalidateStore } from "@/lib/admin-action-helpers";

export async function saveProductAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number.parseInt(String(formData.get("price") ?? "0"), 10);
  const costPrice = Number.parseInt(String(formData.get("costPrice") ?? "0"), 10);
  const stock = Number.parseInt(String(formData.get("stock") ?? "0"), 10);
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const published = formData.get("published") === "on";
  const sellOnline = formData.get("sellOnline") === "on";
  const sellOffline = formData.get("sellOffline") === "on";
  const inventoryModeRaw = String(formData.get("inventoryMode") ?? "owned").trim();
  const inventoryMode = isInventoryMode(inventoryModeRaw)
    ? inventoryModeRaw
    : "owned";
  const digitalAvailable = Number.parseInt(
    String(formData.get("digitalAvailable") ?? "0"),
    10,
  );
  const sellerUnitCost = Number.parseInt(
    String(formData.get("sellerUnitCost") ?? "0"),
    10,
  );
  const sellerVendorIdRaw = String(formData.get("sellerVendorId") ?? "").trim();
  const sellerVendorId =
    inventoryMode === "owned"
      ? null
      : sellerVendorIdRaw || null;

  const newCategory = String(formData.get("newCategory") ?? "").trim();
  const newUnit = String(formData.get("newUnit") ?? "").trim();
  let category =
    newCategory || String(formData.get("category") ?? "").trim();
  let unit =
    newUnit || String(formData.get("unit") ?? "").trim() || "1 pack";

  if (!name || Number.isNaN(price) || price < 0) {
    throw new Error("Name and a valid selling price are required");
  }

  if (newCategory) {
    const existing = await prisma.category.findUnique({
      where: { name: newCategory },
    });
    if (!existing) {
      const count = await prisma.category.count();
      await prisma.category.create({
        data: {
          name: newCategory,
          slug: slugify(newCategory),
          sortOrder: count,
        },
      });
    }
    category = newCategory;
  }

  if (newUnit) {
    const existing = await prisma.unit.findUnique({
      where: { name: newUnit },
    });
    if (!existing) {
      const count = await prisma.unit.count();
      await prisma.unit.create({
        data: { name: newUnit, sortOrder: count },
      });
    }
    unit = newUnit;
  }

  const slug = slugify(slugInput || name);

  const data = {
    name,
    slug,
    description,
    price,
    costPrice: Number.isNaN(costPrice) ? 0 : Math.max(0, costPrice),
    unit,
    stock: Number.isNaN(stock) ? 0 : Math.max(0, stock),
    category,
    imageUrl,
    published,
    sellOnline,
    sellOffline,
    inventoryMode,
    digitalAvailable: Number.isNaN(digitalAvailable)
      ? 0
      : Math.max(0, digitalAvailable),
    sellerUnitCost: Number.isNaN(sellerUnitCost)
      ? 0
      : Math.max(0, sellerUnitCost),
    sellerVendorId,
  };

  if (
    (inventoryMode === "digital" || inventoryMode === "hybrid") &&
    !sellerVendorId
  ) {
    throw new Error("Digital / hybrid products need a primary seller.");
  }

  let productId = id;
  const digitalTarget = data.digitalAvailable;
  if (id) {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });
      if (inventoryMode !== "digital") {
        await reconcileLotsToStock(tx, id, data.stock);
      }
      await setDigitalRemainingTotal(tx, id, digitalTarget);
      await syncDigitalAvailable(tx, id);
    });
  } else {
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data });
      await setDigitalRemainingTotal(tx, product.id, digitalTarget);
      await syncDigitalAvailable(tx, product.id);
      return product;
    });
    productId = created.id;
  }

  // Vendors are linked only from purchase records — never from this form
  await syncProductVendorsFromPurchases([productId]);

  revalidateStore();
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.product.update({
    where: { id },
    data: { published: false },
  });

  revalidateStore();
  redirect("/admin/products");
}

export async function setProductPublishedAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const published = String(formData.get("published") ?? "") === "true";
  if (!id) return;

  await prisma.product.update({
    where: { id },
    data: { published },
  });

  revalidateStore();
}


export async function createHomeSectionAction(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const eyebrow = String(formData.get("eyebrow") ?? "").trim();
  if (!title) {
    throw new Error("Section title is required");
  }

  const max = await prisma.homeSection.aggregate({
    _max: { sortOrder: true },
  });
  await prisma.homeSection.create({
    data: {
      title,
      eyebrow,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      published: true,
    },
  });

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function updateHomeSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eyebrow = String(formData.get("eyebrow") ?? "").trim();
  const published = formData.get("published") === "on";
  if (!id || !title) return;

  await prisma.homeSection.update({
    where: { id },
    data: { title, eyebrow, published },
  });

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function toggleHomeSectionPublishedAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const section = await prisma.homeSection.findUnique({ where: { id } });
  if (!section) return;
  await prisma.homeSection.update({
    where: { id },
    data: { published: !section.published },
  });
  revalidateStore();
  redirect("/admin/home-sections");
}

export async function deleteHomeSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.homeSection.delete({ where: { id } });
  revalidateStore();
  redirect("/admin/home-sections");
}

/** Move all products from source into target, then delete source. */
export async function mergeHomeSectionsAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") ?? "").trim();
  const targetId = String(formData.get("targetId") ?? "").trim();
  if (!sourceId || !targetId || sourceId === targetId) {
    redirect("/admin/home-sections");
  }

  const [source, target] = await Promise.all([
    prisma.homeSection.findUnique({
      where: { id: sourceId },
      include: { products: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.homeSection.findUnique({
      where: { id: targetId },
      include: { products: true },
    }),
  ]);
  if (!source || !target) {
    redirect("/admin/home-sections");
  }

  const existing = new Set(target.products.map((p) => p.productId));
  const maxSort = target.products.reduce(
    (m, p) => Math.max(m, p.sortOrder),
    -1,
  );
  let nextSort = maxSort + 1;

  await prisma.$transaction(async (tx) => {
    for (const row of source.products) {
      if (existing.has(row.productId)) continue;
      await tx.homeSectionProduct.create({
        data: {
          sectionId: targetId,
          productId: row.productId,
          sortOrder: nextSort++,
        },
      });
    }
    await tx.homeSection.delete({ where: { id: sourceId } });
  });

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function duplicateHomeSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const section = await prisma.homeSection.findUnique({
    where: { id },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });
  if (!section) return;

  const max = await prisma.homeSection.aggregate({
    _max: { sortOrder: true },
  });

  await prisma.$transaction(async (tx) => {
    const copy = await tx.homeSection.create({
      data: {
        title: `${section.title} (copy)`,
        eyebrow: section.eyebrow,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        published: false,
      },
    });
    if (section.products.length > 0) {
      await tx.homeSectionProduct.createMany({
        data: section.products.map((p, i) => ({
          sectionId: copy.id,
          productId: p.productId,
          sortOrder: i,
        })),
      });
    }
  });

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function clearHomeSectionProductsAction(formData: FormData) {
  await requireAdmin();
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!sectionId) return;
  await prisma.homeSectionProduct.deleteMany({ where: { sectionId } });
  revalidateStore();
  redirect("/admin/home-sections");
}

export async function moveHomeSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const sections = await prisma.homeSection.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const index = sections.findIndex((s) => s.id === id);
  if (index < 0) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sections.length) return;

  const next = [...sections];
  const tmp = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = tmp;

  await prisma.$transaction(
    next.map((s, i) =>
      prisma.homeSection.update({
        where: { id: s.id },
        data: { sortOrder: i },
      }),
    ),
  );

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function addProductToSectionAction(formData: FormData) {
  await requireAdmin();
  const sectionId = String(formData.get("sectionId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const productIdsRaw = String(formData.get("productIds") ?? "").trim();

  const ids = productIdsRaw
    ? productIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : productId
      ? [productId]
      : [];

  if (!sectionId || ids.length === 0) {
    redirect("/admin/home-sections");
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      published: true,
      sellOnline: true,
    },
    select: { id: true },
  });
  const validIds = products.map((p) => p.id);
  if (validIds.length === 0) {
    redirect("/admin/home-sections");
  }

  const existing = await prisma.homeSectionProduct.findMany({
    where: { sectionId, productId: { in: validIds } },
    select: { productId: true },
  });
  const already = new Set(existing.map((e) => e.productId));
  const toAdd = validIds.filter((id) => !already.has(id));

  if (toAdd.length > 0) {
    const max = await prisma.homeSectionProduct.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    let sort = (max._max.sortOrder ?? -1) + 1;
    await prisma.homeSectionProduct.createMany({
      data: toAdd.map((pid) => ({
        sectionId,
        productId: pid,
        sortOrder: sort++,
      })),
    });
  }

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function removeProductFromSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.homeSectionProduct.delete({ where: { id } });
  revalidateStore();
  redirect("/admin/home-sections");
}

/** Move a product row from its section into another (or copy). */
export async function relocateSectionProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const targetSectionId = String(formData.get("targetSectionId") ?? "").trim();
  const mode = String(formData.get("mode") ?? "move").trim();
  if (!id || !targetSectionId) {
    redirect("/admin/home-sections");
  }

  const row = await prisma.homeSectionProduct.findUnique({ where: { id } });
  if (!row || row.sectionId === targetSectionId) {
    redirect("/admin/home-sections");
  }

  const clash = await prisma.homeSectionProduct.findUnique({
    where: {
      sectionId_productId: {
        sectionId: targetSectionId,
        productId: row.productId,
      },
    },
  });

  const max = await prisma.homeSectionProduct.aggregate({
    where: { sectionId: targetSectionId },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  await prisma.$transaction(async (tx) => {
    if (!clash) {
      await tx.homeSectionProduct.create({
        data: {
          sectionId: targetSectionId,
          productId: row.productId,
          sortOrder,
        },
      });
    }
    if (mode !== "copy") {
      await tx.homeSectionProduct.delete({ where: { id } });
    }
  });

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function moveSectionProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const row = await prisma.homeSectionProduct.findUnique({ where: { id } });
  if (!row) return;

  const items = await prisma.homeSectionProduct.findMany({
    where: { sectionId: row.sectionId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const index = items.findIndex((p) => p.id === id);
  if (index < 0) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length) return;

  const next = [...items];
  const tmp = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = tmp;

  await prisma.$transaction(
    next.map((p, i) =>
      prisma.homeSectionProduct.update({
        where: { id: p.id },
        data: { sortOrder: i },
      }),
    ),
  );

  revalidateStore();
  redirect("/admin/home-sections");
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file" };
  }

  if (file.size > 4 * 1024 * 1024) {
    return { error: "Image must be under 4 MB" };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { error: "Use JPG, PNG, WebP, or GIF" };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${filename}` };
}

