"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { syncDigitalAvailable } from "@/lib/digital-lots";
import { syncProductVendorsFromPurchases } from "@/lib/product-vendors";
import { slugify } from "@/lib/products";
import {
  allocateBillPayment,
  lineAmountPaid,
} from "@/lib/purchase-payment";
import { recordPaidDelta } from "@/lib/payment-ledger";
import {
  type PurchaseActionState,
  readPurchasePayFields,
  requireAdmin,
  revalidateStore,
  safeAdminRedirect,
} from "@/lib/admin-action-helpers";

/** Record buying stock — one bill can include multiple product lines */
export async function purchaseStockAction(
  _prev: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  await requireAdmin();

  const note = String(formData.get("note") ?? "").trim();
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const newVendorName = String(formData.get("newVendorName") ?? "").trim();
  const newVendorPhone = String(formData.get("newVendorPhone") ?? "").trim();
  const newVendorAddress = String(formData.get("newVendorAddress") ?? "").trim();
  const paymentMode = String(formData.get("paymentMode") ?? "paid").trim();
  const amountPaidRaw = String(formData.get("amountPaid") ?? "").trim();
  const linesRaw = String(formData.get("lines") ?? "[]");

  type LineInput = {
    mode?: string;
    stockKind?: string;
    productId?: string;
    newProductName?: string;
    newUnit?: string;
    sellingPrice?: string;
    batchNo?: string;
    billNo?: string;
    quantity?: string;
    unitCost?: string;
    expiresAt?: string;
  };

  let lines: LineInput[] = [];
  try {
    lines = JSON.parse(linesRaw) as LineInput[];
  } catch {
    return { error: "Could not read purchase lines. Try again." };
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Add at least one product line." };
  }

  if (
    paymentMode !== "paid" &&
    paymentMode !== "partial" &&
    paymentMode !== "unpaid"
  ) {
    return { error: "Choose Paid, Partial, or Unpaid." };
  }

  try {
    const batchId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      let resolvedVendorId: string | null = null;
      if (newVendorName) {
        const existingVendor = await tx.vendor.findUnique({
          where: { name: newVendorName },
        });
        if (existingVendor) {
          resolvedVendorId = existingVendor.id;
          const patch: { phone?: string; address?: string } = {};
          if (newVendorPhone && existingVendor.phone !== newVendorPhone) {
            patch.phone = newVendorPhone;
          }
          if (newVendorAddress && existingVendor.address !== newVendorAddress) {
            patch.address = newVendorAddress;
          }
          if (Object.keys(patch).length > 0) {
            await tx.vendor.update({
              where: { id: existingVendor.id },
              data: patch,
            });
          }
        } else {
          const created = await tx.vendor.create({
            data: {
              name: newVendorName,
              phone: newVendorPhone,
              address: newVendorAddress,
            },
          });
          resolvedVendorId = created.id;
        }
      } else if (vendorId) {
        const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) {
          throw new Error("Selected vendor was not found.");
        }
        resolvedVendorId = vendor.id;
      }

      type Prepared = {
        productId: string;
        quantity: number;
        unitCost: number;
        expiresAt: Date | null;
        lineTotal: number;
        stockKind: "owned" | "digital";
        batchNo: string;
      };
      const prepared: Prepared[] = [];

      for (const [index, line] of lines.entries()) {
        const quantity = Number.parseInt(String(line.quantity ?? "0"), 10);
        const unitCost = Number.parseInt(String(line.unitCost ?? "0"), 10);
        const sellingRaw = String(line.sellingPrice ?? "").trim();
        const sellingPrice = sellingRaw
          ? Number.parseInt(sellingRaw, 10)
          : unitCost;
        const productId = String(line.productId ?? "").trim();
        const newProductName = String(line.newProductName ?? "").trim();
        const newUnit = String(line.newUnit ?? "").trim() || "1 pack";
        const batchNo = String(line.batchNo ?? line.billNo ?? "").trim();
        const expiresRaw = String(line.expiresAt ?? "").trim();
        const expiresAt = expiresRaw
          ? new Date(`${expiresRaw}T12:00:00`)
          : null;
        const isNew = line.mode === "new" || Boolean(newProductName);
        const stockKind =
          line.stockKind === "digital" ? "digital" : "owned";

        if (Number.isNaN(quantity) || quantity <= 0) {
          throw new Error(`Line ${index + 1}: enter a quantity greater than 0.`);
        }
        if (Number.isNaN(unitCost) || unitCost < 0) {
          throw new Error(`Line ${index + 1}: enter a valid unit cost.`);
        }
        if (!batchNo) {
          throw new Error(`Line ${index + 1}: enter a batch no.`);
        }
        if (expiresAt && Number.isNaN(expiresAt.getTime())) {
          throw new Error(`Line ${index + 1}: expiry date is invalid.`);
        }
        if (stockKind === "digital" && !resolvedVendorId) {
          throw new Error(
            `Line ${index + 1}: digital stock needs a vendor (seller).`,
          );
        }

        let product =
          !isNew && productId
            ? await tx.product.findUnique({ where: { id: productId } })
            : null;

        if (isNew) {
          if (!newProductName) {
            throw new Error(`Line ${index + 1}: enter a product name.`);
          }

          const byName = await tx.product.findFirst({
            where: { name: newProductName },
          });
          if (byName) {
            product = byName;
          } else {
            const baseSlug = slugify(newProductName);
            let slug = baseSlug || `product-${Date.now()}-${index}`;
            const clash = await tx.product.findUnique({ where: { slug } });
            if (clash) slug = `${slug}-${Date.now().toString(36)}`;

            const unitRow = await tx.unit.findUnique({
              where: { name: newUnit },
            });
            if (!unitRow) {
              const count = await tx.unit.count();
              await tx.unit.create({
                data: { name: newUnit, sortOrder: count },
              });
            }

            product = await tx.product.create({
              data: {
                name: newProductName,
                slug,
                price: Number.isNaN(sellingPrice)
                  ? unitCost
                  : Math.max(0, sellingPrice),
                costPrice: stockKind === "owned" ? unitCost : 0,
                sellerUnitCost: stockKind === "digital" ? unitCost : 0,
                sellerVendorId:
                  stockKind === "digital" ? resolvedVendorId : null,
                inventoryMode: stockKind === "digital" ? "digital" : "owned",
                unit: newUnit,
                stock: 0,
                digitalAvailable: 0,
                published: true,
                sellOnline: true,
                sellOffline: true,
                description: "",
              },
            });
          }
        }

        if (!product) {
          throw new Error(`Line ${index + 1}: select a product.`);
        }

        prepared.push({
          productId: product.id,
          quantity,
          unitCost,
          expiresAt,
          lineTotal: quantity * unitCost,
          stockKind,
          batchNo,
        });
      }

      const productKeys = prepared.map(
        (p) => `${p.stockKind}:${p.productId}`,
      );
      if (new Set(productKeys).size !== productKeys.length) {
        throw new Error(
          "Same product appears twice for the same stock type — combine into one row with higher quantity.",
        );
      }

      const allDigital = prepared.every((p) => p.stockKind === "digital");
      const billTotal = prepared.reduce((sum, p) => sum + p.lineTotal, 0);
      let billPaid = 0;
      if (allDigital) {
        // Digital reservation — no supplier payment on this bill.
        billPaid = 0;
      } else if (paymentMode === "paid") {
        billPaid = billTotal;
      } else if (paymentMode === "unpaid") {
        billPaid = 0;
      } else {
        billPaid = Number.parseInt(amountPaidRaw, 10);
        if (Number.isNaN(billPaid) || billPaid < 0) {
          throw new Error("Enter a valid partial payment amount.");
        }
        if (billPaid === 0) {
          throw new Error("Partial payment must be greater than 0.");
        }
        if (billPaid >= billTotal) {
          billPaid = billTotal;
        }
      }

      const allocated = allocateBillPayment(
        prepared.map((p) => p.lineTotal),
        billPaid,
      );

      const pay = allDigital
        ? { payMethod: "", chequeNo: "", chequeDate: null as Date | null }
        : readPurchasePayFields(formData, billPaid);

      for (const [i, row] of prepared.entries()) {
        const isDigital = row.stockKind === "digital";
        const amountPaid = isDigital ? 0 : (allocated[i] ?? 0);
        // Digital reservations are not supplier dues — payout happens on sale.
        const fullyPaid = isDigital ? true : amountPaid >= row.lineTotal;
        await tx.stockPurchase.create({
          data: {
            batchId,
            productId: row.productId,
            vendorId: resolvedVendorId,
            billNo: row.batchNo,
            quantity: row.quantity,
            remainingQty: row.quantity,
            stockKind: row.stockKind,
            unitCost: row.unitCost,
            amountPaid,
            paid: fullyPaid,
            payMethod: isDigital ? "reservation" : pay.payMethod,
            chequeNo: isDigital ? "" : pay.chequeNo,
            chequeDate: isDigital ? null : pay.chequeDate,
            expiresAt: row.expiresAt,
            note: isDigital
              ? note
                ? `Digital reservation · ${note}`
                : "Digital stock reservation"
              : note,
          },
        });

        if (row.stockKind === "digital") {
          await syncDigitalAvailable(tx, row.productId);
        } else {
          // Re-read stock so concurrent sales are not overwritten.
          const live = await tx.product.findUnique({
            where: { id: row.productId },
            select: { stock: true, costPrice: true },
          });
          if (!live) {
            throw new Error("Product disappeared during purchase save.");
          }
          const prevStock = live.stock;
          const prevCost = live.costPrice ?? 0;
          const nextStock = prevStock + row.quantity;
          const nextCost =
            prevStock > 0
              ? Math.round(
                  (prevCost * prevStock + row.unitCost * row.quantity) /
                    nextStock,
                )
              : row.unitCost;
          await tx.product.update({
            where: { id: row.productId },
            data: {
              stock: { increment: row.quantity },
              costPrice: nextCost,
            },
          });
          await syncDigitalAvailable(tx, row.productId);
        }
      }

      // Link vendors from this purchase only (source of truth = purchase records)
      if (resolvedVendorId) {
        const productIds = [...new Set(prepared.map((p) => p.productId))];
        await syncProductVendorsFromPurchases(productIds, tx);
      }

      if (billPaid > 0) {
        let partyName = newVendorName;
        let partyPhone = newVendorPhone;
        if (resolvedVendorId) {
          const v = await tx.vendor.findUnique({
            where: { id: resolvedVendorId },
            select: { name: true, phone: true },
          });
          partyName = v?.name ?? partyName;
          partyPhone = v?.phone ?? partyPhone;
        }
        await recordPaidDelta(tx, {
          direction: "pay",
          previousPaid: 0,
          nextPaid: billPaid,
          method: pay.payMethod || "cash",
          note,
          chequeNo: pay.chequeNo,
          chequeDate: pay.chequeDate,
          partyName,
          partyPhone,
          batchId,
          refLabel:
            prepared.length === 1 && prepared[0]?.batchNo
              ? `Batch ${prepared[0].batchNo}`
              : `Purchase ${batchId.slice(0, 8)}`,
        });
      }
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save this purchase.";
    return { error: message };
  }

  revalidateStore();
  revalidatePath("/admin/purchases");
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/products");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/inventory");
  redirect("/admin/purchases");
}

export async function setPurchaseBillPaidAction(formData: FormData) {
  await requireAdmin();
  const batchId = String(formData.get("batchId") ?? "").trim();
  if (!batchId) return;

  const mode = String(formData.get("mode") ?? "").trim();
  const amountRaw = String(formData.get("amountPaid") ?? "").trim();
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    "/admin/purchases",
  );

  const lines = await prisma.stockPurchase.findMany({
    where: { batchId },
    select: {
      id: true,
      quantity: true,
      unitCost: true,
      amountPaid: true,
      paid: true,
      billNo: true,
      vendor: { select: { name: true, phone: true } },
    },
  });
  if (lines.length === 0) return;

  const totals = lines.map((l) => l.quantity * l.unitCost);
  const billTotal = totals.reduce((s, t) => s + t, 0);
  const previousPaid = lines.reduce((s, l) => s + lineAmountPaid(l), 0);

  let billPaid = 0;
  if (mode === "full" || formData.get("paid") === "true") {
    billPaid = billTotal;
  } else if (mode === "clear" || formData.get("paid") === "false") {
    billPaid = 0;
  } else {
    billPaid = Number.parseInt(amountRaw, 10);
    if (Number.isNaN(billPaid) || billPaid < 0) {
      redirect(redirectTo);
      return;
    }
    billPaid = Math.min(billPaid, billTotal);
  }

  let pay: {
    payMethod: string;
    chequeNo: string;
    chequeDate: Date | null;
  };
  try {
    pay = readPurchasePayFields(formData, billPaid);
  } catch {
    redirect(redirectTo);
    return;
  }

  const allocated = allocateBillPayment(totals, billPaid);
  const vendorName = lines.find((l) => l.vendor?.name)?.vendor?.name ?? "";
  const vendorPhone = lines.find((l) => l.vendor?.phone)?.vendor?.phone ?? "";
  const billNo = lines.find((l) => l.billNo)?.billNo ?? "";

  await prisma.$transaction(async (tx) => {
    for (const [i, line] of lines.entries()) {
      const amountPaid = allocated[i] ?? 0;
      const lineTotal = totals[i] ?? 0;
      await tx.stockPurchase.update({
        where: { id: line.id },
        data: {
          amountPaid,
          paid: amountPaid >= lineTotal,
          payMethod: pay.payMethod,
          chequeNo: pay.chequeNo,
          chequeDate: pay.chequeDate,
        },
      });
    }
    await recordPaidDelta(tx, {
      direction: "pay",
      previousPaid,
      nextPaid: billPaid,
      method: pay.payMethod || (billPaid === 0 ? "clear" : "cash"),
      note: "",
      chequeNo: pay.chequeNo,
      chequeDate: pay.chequeDate,
      partyName: vendorName,
      partyPhone: vendorPhone,
      batchId,
      refLabel: billNo ? `Batch ${billNo}` : `Purchase ${batchId.slice(0, 8)}`,
    });
  });

  revalidatePath("/admin/purchases");
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/payments");
  if (redirectTo.startsWith("/admin/suppliers") || redirectTo.startsWith("/admin/payments")) {
    revalidatePath(redirectTo);
  }
  redirect(redirectTo);
}

