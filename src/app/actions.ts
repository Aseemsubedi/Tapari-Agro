"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  isAdminAuthenticated,
  verifyAdminCredentials,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/products";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminCredentials(email, password)) {
    return { error: "Invalid email or password" };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function saveProductAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number.parseInt(String(formData.get("price") ?? "0"), 10);
  const unit = String(formData.get("unit") ?? "").trim() || "1 pack";
  const stock = Number.parseInt(String(formData.get("stock") ?? "0"), 10);
  const category = String(formData.get("category") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const published = formData.get("published") === "on";

  if (!name || Number.isNaN(price) || price < 0) {
    throw new Error("Name and a valid price are required");
  }

  const slug = slugify(slugInput || name);
  const data = {
    name,
    slug,
    description,
    price,
    unit,
    stock: Number.isNaN(stock) ? 0 : stock,
    category,
    imageUrl,
    published,
  };

  if (id) {
    await prisma.product.update({ where: { id }, data });
  } else {
    await prisma.product.create({ data });
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
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

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending");
  if (!id) return;

  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function placeOrderAction(formData: FormData): Promise<
  { error: string; orderId?: undefined } | { orderId: string; error?: undefined }
> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");

  let items: { productId: string; quantity: number }[] = [];
  try {
    items = JSON.parse(itemsRaw) as { productId: string; quantity: number }[];
  } catch {
    return { error: "Invalid cart data" };
  }

  if (!customerName || !phone || !address || items.length === 0) {
    return { error: "Name, phone, address, and cart items are required" };
  }

  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, published: true },
  });

  if (products.length !== items.length) {
    return { error: "One or more products are unavailable" };
  }

  const lineItems = items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)!;
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    };
  });

  const total = lineItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const order = await prisma.order.create({
    data: {
      customerName,
      phone,
      address,
      notes,
      total,
      status: "pending",
      items: { create: lineItems },
    },
  });

  for (const item of lineItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  revalidatePath("/admin/orders");
  return { orderId: order.id };
}
