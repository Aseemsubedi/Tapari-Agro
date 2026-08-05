"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  setDigitalRemainingTotal,
  syncDigitalAvailable,
} from "@/lib/digital-lots";
import {
  consumeLotById,
  consumeLotsFifo,
  reconcileLotsToStock,
} from "@/lib/stock-lots";
import {
  requireAdmin,
  revalidateStore,
  safeAdminRedirect,
} from "@/lib/admin-action-helpers";

export async function updateStockAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const stock = Number.parseInt(String(formData.get("stock") ?? "0"), 10);
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    "/admin/inventory",
  );
  if (!id || Number.isNaN(stock)) {
    redirect(redirectTo);
    return;
  }

  const next = Math.max(0, stock);
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: { stock: next },
    });
    await reconcileLotsToStock(tx, id, next);
    await syncDigitalAvailable(tx, id);
  });

  revalidateStore();
  revalidatePath("/admin/inventory");
  redirect(redirectTo);
}

/** Set supplier-owned digital availability for a product (adjusts digital lots). */
export async function updateDigitalAvailableAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const qty = Number.parseInt(String(formData.get("digitalAvailable") ?? "0"), 10);
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    "/admin/inventory?view=digital",
  );
  if (!id || Number.isNaN(qty) || qty < 0) {
    redirect(redirectTo);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await setDigitalRemainingTotal(tx, id, qty);
  });

  revalidateStore();
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect(redirectTo);
}

/**
 * Damage / wastage / spoilage — remove qty from stock via FIFO lots.
 * Keeps inventory honest for oils, flour, and honey.
 */
export async function writeOffStockAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const qty = Number.parseInt(String(formData.get("quantity") ?? "0"), 10);
  const reason = String(formData.get("reason") ?? "").trim() || "Write-off";
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    "/admin/inventory",
  );

  if (!id || Number.isNaN(qty) || qty <= 0) {
    redirect(redirectTo);
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new Error("Product not found.");
      if (product.stock < qty) {
        throw new Error(
          `${product.name} only has ${product.stock} on hand — cannot write off ${qty}.`,
        );
      }
      const updated = await tx.product.updateMany({
        where: { id, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (updated.count === 0) {
        throw new Error("Not enough stock to write off.");
      }
      await consumeLotsFifo(tx, id, qty);
      await syncDigitalAvailable(tx, id);
      const loss = qty * (product.costPrice ?? 0);
      await tx.paymentEvent.create({
        data: {
          direction: "writeoff",
          amount: loss,
          method: "adjust",
          note: reason,
          partyName: product.name,
          refLabel: `Write-off ×${qty}`,
        },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not write off stock.";
    redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`,
    );
  }

  revalidateStore();
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  redirect(redirectTo);
}

/** Write off remaining units from one purchase lot (expiry / damage). */
export async function writeOffLotAction(formData: FormData) {
  await requireAdmin();
  const lotId = String(formData.get("lotId") ?? "").trim();
  const qtyRaw = String(formData.get("quantity") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || "Lot write-off";
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    "/admin/inventory?view=expiry",
  );

  if (!lotId) {
    redirect(redirectTo);
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const lot = await tx.stockPurchase.findUnique({
        where: { id: lotId },
        include: { product: { select: { id: true, name: true, stock: true } } },
      });
      if (!lot) throw new Error("Lot not found.");
      const qty = qtyRaw
        ? Number.parseInt(qtyRaw, 10)
        : lot.remainingQty;
      if (Number.isNaN(qty) || qty <= 0) {
        throw new Error("Enter a quantity to write off.");
      }
      if (lot.remainingQty < qty) {
        throw new Error(
          `Lot only has ${lot.remainingQty} left — cannot write off ${qty}.`,
        );
      }

      if (lot.stockKind === "digital") {
        await consumeLotById(tx, lotId, qty);
        await syncDigitalAvailable(tx, lot.productId);
        await tx.paymentEvent.create({
          data: {
            direction: "writeoff",
            amount: qty * lot.unitCost,
            method: "adjust",
            note: reason,
            partyName: lot.product.name,
            batchId: lot.batchId,
            refLabel: `Digital release ×${qty}`,
          },
        });
        return;
      }

      if (lot.product.stock < qty) {
        throw new Error(
          `${lot.product.name} stock is ${lot.product.stock} — refresh and try again.`,
        );
      }
      await consumeLotById(tx, lotId, qty);
      const updated = await tx.product.updateMany({
        where: { id: lot.productId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (updated.count === 0) {
        throw new Error("Not enough product stock to write off.");
      }
      await syncDigitalAvailable(tx, lot.productId);
      await tx.paymentEvent.create({
        data: {
          direction: "writeoff",
          amount: qty * lot.unitCost,
          method: "adjust",
          note: reason,
          partyName: lot.product.name,
          batchId: lot.batchId,
          refLabel: `Lot write-off ×${qty}`,
        },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not write off lot.";
    redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`,
    );
  }

  revalidateStore();
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  redirect(redirectTo);
}

/** Pin / unpin a fast-mover on the Out of stock desk. */
export async function setProductEssentialAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const essential = String(formData.get("essential") ?? "") === "true";
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    "/admin/inventory?view=oos",
  );
  if (!id) {
    redirect(redirectTo);
    return;
  }

  await prisma.product.update({
    where: { id },
    data: { essential },
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect(redirectTo);
}
