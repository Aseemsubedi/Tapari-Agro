"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { upsertCustomerFromSale } from "@/lib/customers";
import {
  awaitsPaymentBeforeFulfill,
  canShipDigitalOrder,
  isCheckoutPaymentMethod,
  isOrderStatus,
  isPaymentMethod,
  isCollectMethod,
  isPrepaidCheckoutMethod,
  orderCheckoutMethod,
  orderNeedsSupplierStock,
  resolvePaymentStatus,
} from "@/lib/orders";
import { recordPaidDelta } from "@/lib/payment-ledger";
import {
  buildAllocatedLines,
  consumeOwnedAllocation,
  ensureSellerSettlements,
  normalizeLineAllocation,
  releaseDigitalAllocation,
  removeUnpaidSettlementsForOrder,
  reserveDigitalAllocation,
  restoreOwnedAllocation,
} from "@/lib/digital-fulfillment";
import { consumeLotsFifo, restoreLotsLifo } from "@/lib/stock-lots";
import {
  type OfflineSaleState,
  requireAdmin,
  revalidateStore,
  safeAdminRedirect,
} from "@/lib/admin-action-helpers";

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending");
  if (!id || !isOrderStatus(status)) return;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) return;

      const wasCancelled = order.status === "cancelled";
      const willCancel = status === "cancelled";
      const wasPending = order.status === "pending";
      const leavingPending =
        wasPending && status !== "pending" && status !== "cancelled";
      const becomingCompleted =
        status === "completed" && order.status !== "completed";
      const becomingShipped =
        status === "shipped" && order.status !== "shipped";
      const advancingFulfillment =
        !willCancel &&
        status !== order.status &&
        (status === "confirmed" ||
          status === "shipped" ||
          status === "completed");

      const intent = orderCheckoutMethod(order);

      if (
        advancingFulfillment &&
        awaitsPaymentBeforeFulfill({
          channel: order.channel,
          checkoutMethod: order.checkoutMethod,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
        })
      ) {
        throw new Error(
          intent === "bank_qr"
            ? "Confirm QR payment first, then start the order."
            : "Confirm bank payment first, then start the order.",
        );
      }

      if (
        (becomingShipped ||
          (becomingCompleted && order.status !== "shipped")) &&
        !canShipDigitalOrder(order)
      ) {
        throw new Error(
          "Mark supplier stock as received before shipping this order.",
        );
      }

      if (!wasCancelled && willCancel) {
        if (order.inventoryHeld) {
          for (const raw of order.items) {
            const item = normalizeLineAllocation(raw);
            await restoreOwnedAllocation(tx, item, restoreLotsLifo);
            await releaseDigitalAllocation(tx, item);
          }
        }
        await removeUnpaidSettlementsForOrder(tx, order.id);
        await tx.order.update({
          where: { id },
          data: {
            status: "cancelled",
            inventoryHeld: false,
            supplierStockReceived: false,
          },
        });
        return;
      }

      if (wasCancelled && !willCancel) {
        for (const raw of order.items) {
          const item = normalizeLineAllocation(raw);
          if (item.ownedQty > 0) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (!product || product.stock < item.ownedQty) {
              throw new Error(
                `Not enough owned stock to reopen (${item.name} needs ${item.ownedQty})`,
              );
            }
            await consumeOwnedAllocation(tx, item, consumeLotsFifo);
          }
          if (item.digitalQty > 0) {
            await reserveDigitalAllocation(tx, {
              ...item,
              digitalReserved: false,
            });
          }
        }
        await tx.order.update({
          where: { id },
          data: { status, inventoryHeld: true },
        });
        return;
      }

      // Hold stock if not yet held (e.g. prepaid paid, then confirm)
      if (leavingPending && !order.inventoryHeld) {
        for (const raw of order.items) {
          const item = normalizeLineAllocation(raw);
          await consumeOwnedAllocation(tx, item, consumeLotsFifo);
          if (item.digitalQty > 0 && !item.digitalReserved) {
            await reserveDigitalAllocation(tx, item);
          }
        }
        await tx.order.update({
          where: { id },
          data: { inventoryHeld: true },
        });
      } else if (leavingPending) {
        for (const raw of order.items) {
          const item = normalizeLineAllocation(raw);
          if (item.digitalQty > 0 && !item.digitalReserved) {
            await reserveDigitalAllocation(tx, item);
          }
        }
      }

      if (becomingCompleted) {
        for (const raw of order.items) {
          const item = normalizeLineAllocation(raw);
          if (item.digitalQty > 0 && !item.digitalReserved) {
            await reserveDigitalAllocation(tx, item);
          }
        }
        const fresh = await tx.orderItem.findMany({ where: { orderId: id } });
        await ensureSellerSettlements(
          tx,
          id,
          fresh.map(normalizeLineAllocation),
        );
      }

      await tx.order.update({ where: { id }, data: { status } });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update order";
    redirect(`/admin/orders/${id}?error=${encodeURIComponent(message)}`);
  }

  revalidateStore();
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/payments");
  redirect(`/admin/orders/${id}`);
}

export async function markSupplierStockReceivedAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    `/admin/orders/${id}`,
  );
  const received = String(formData.get("received") ?? "true") !== "false";

  await prisma.order.update({
    where: { id },
    data: { supplierStockReceived: received },
  });

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  redirect(redirectTo);
}

export async function setOrderPaymentPaidAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return;

  const mode = String(formData.get("mode") ?? "full").trim();
  const amountRaw = String(formData.get("amountPaid") ?? "").trim();
  const collectRaw = String(formData.get("collectMethod") ?? "").trim();
  const paymentNoteRaw = String(formData.get("paymentNote") ?? "").trim();
  const customerNameRaw = String(formData.get("customerName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    `/admin/orders/${id}`,
  );

  const previousPaid =
    order.paymentStatus === "paid"
      ? order.total
      : Math.max(0, order.amountPaid);

  const errorRedirect = (message: string) => {
    const join = redirectTo.includes("?") ? "&" : "?";
    redirect(`${redirectTo}${join}error=${encodeURIComponent(message)}`);
  };

  const prepaidWaiting = awaitsPaymentBeforeFulfill(order);

  /** Leave bill unpaid as Cash on delivery — blocked while prepaid waiting */
  if (mode === "cod") {
    if (prepaidWaiting) {
      errorRedirect(
        "Confirm QR/bank payment first — or cancel the order. Cannot switch to COD while prepaid is unpaid.",
      );
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          amountPaid: 0,
          paymentStatus: "unpaid",
          paymentMethod: "cash",
          paymentNote: "",
          checkoutMethod: "cash",
        },
      });
      await recordPaidDelta(tx, {
        direction: "collect",
        previousPaid,
        nextPaid: 0,
        method: "clear",
        note: "Cash on delivery",
        partyName: order.customerName,
        partyPhone: order.phone,
        orderId: order.id,
        refLabel: `#${order.id.slice(0, 8)}`,
      });
    });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/profits");
    revalidatePath("/admin/customers");
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/orders/${id}`);
    redirect(redirectTo);
    return;
  }

  /** Leave bill unpaid as Credit — blocked while prepaid waiting */
  if (mode === "credit" || mode === "clear") {
    if (prepaidWaiting) {
      errorRedirect(
        "Confirm QR/bank payment first — or cancel the order. Cannot switch to credit while prepaid is unpaid.",
      );
      return;
    }
    const customerName = customerNameRaw || order.customerName.trim() || "";
    const phone = phoneRaw || order.phone.trim() || "";
    const isAnon =
      !customerName || customerName.toLowerCase() === "walk-in customer";
    const digits = phone.replace(/\D/g, "");

    if (isAnon) {
      errorRedirect(
        "Credit needs a customer — select or enter a name (not Walk-in).",
      );
      return;
    }
    if (digits.length < 7) {
      errorRedirect("Credit needs a phone number to track the due.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          customerName,
          phone,
          amountPaid: 0,
          paymentStatus: "unpaid",
          paymentMethod: "credit",
          paymentNote: "",
        },
      });
      await upsertCustomerFromSale(tx, {
        name: customerName,
        phone,
        address: order.address,
      });
      await recordPaidDelta(tx, {
        direction: "collect",
        previousPaid,
        nextPaid: 0,
        method: "clear",
        note: "Credit",
        partyName: customerName,
        partyPhone: phone,
        orderId: order.id,
        refLabel: `#${order.id.slice(0, 8)}`,
      });
    });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/profits");
    revalidatePath("/admin/customers");
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/orders/${id}`);
    redirect(redirectTo);
    return;
  }

  let amountPaid = 0;
  if (mode === "full" || formData.get("paid") === "true") {
    amountPaid = order.total;
  } else {
    amountPaid = Number.parseInt(amountRaw, 10);
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      redirect(redirectTo);
      return;
    }
    amountPaid = Math.min(amountPaid, order.total);
  }

  const paymentStatus = resolvePaymentStatus(order.total, amountPaid);

  let paymentMethod = "";
  let paymentNote = "";
  if (paymentStatus === "unpaid") {
    errorRedirect("To leave unpaid, choose Cash on delivery or Credit.");
    return;
  } else if (isCollectMethod(collectRaw)) {
    paymentMethod = collectRaw;
    paymentNote =
      collectRaw === "other" || collectRaw === "bank" ? paymentNoteRaw : "";
    if (collectRaw === "other" && !paymentNote) {
      redirect(redirectTo);
      return;
    }
  } else if (paymentStatus === "partial") {
    paymentMethod = "partial";
  } else {
    paymentMethod = orderCheckoutMethod(order);
  }

  const becomingPaid =
    paymentStatus === "paid" && order.paymentStatus !== "paid";
  const shouldHoldInventory =
    becomingPaid &&
    !order.inventoryHeld &&
    isPrepaidCheckoutMethod(orderCheckoutMethod(order));

  try {
    await prisma.$transaction(async (tx) => {
      if (shouldHoldInventory) {
        for (const raw of order.items) {
          const item = normalizeLineAllocation(raw);
          await consumeOwnedAllocation(tx, item, consumeLotsFifo);
          if (item.digitalQty > 0 && !item.digitalReserved) {
            await reserveDigitalAllocation(tx, item);
          }
        }
      }

      await tx.order.update({
        where: { id },
        data: {
          amountPaid,
          paymentStatus,
          paymentMethod,
          paymentNote,
          ...(shouldHoldInventory ? { inventoryHeld: true } : {}),
        },
      });
      await recordPaidDelta(tx, {
        direction: "collect",
        previousPaid,
        nextPaid: amountPaid,
        method: paymentMethod === "credit" ? "clear" : paymentMethod,
        note: paymentNote,
        partyName: order.customerName,
        partyPhone: order.phone,
        orderId: order.id,
        refLabel: `#${order.id.slice(0, 8)}`,
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update payment";
    errorRedirect(message);
    return;
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/profits");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/orders/${id}`);
  redirect(redirectTo);
}

export async function placeOrderAction(formData: FormData): Promise<
  | { error: string; orderId?: undefined; customerId?: undefined }
  | { orderId: string; customerId: string | null; error?: undefined }
> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const address =
    String(formData.get("address") ?? "").trim() ||
    [area, district].filter(Boolean).join(", ");
  const notes = String(formData.get("notes") ?? "").trim();
  const paymentRaw = String(formData.get("paymentMethod") ?? "cash").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");

  if (!isCheckoutPaymentMethod(paymentRaw)) {
    return { error: "Choose Cash on delivery, QR payment, or Bank deposit." };
  }

  let items: { productId: string; quantity: number }[] = [];
  try {
    items = JSON.parse(itemsRaw) as { productId: string; quantity: number }[];
  } catch {
    return { error: "Invalid cart data" };
  }

  if (!customerName || !phone || !district || !area || items.length === 0) {
    return { error: "Name, phone, district, and area are required" };
  }

  for (const item of items) {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity < 1) {
      return { error: "Invalid cart quantities" };
    }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, published: true, sellOnline: true },
      });

      if (products.length !== new Set(productIds).size) {
        throw new Error("One or more products are unavailable");
      }

      const lineItems = buildAllocatedLines(items, products);
      const total = lineItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const prepaid = isPrepaidCheckoutMethod(paymentRaw);

      const created = await tx.order.create({
        data: {
          customerName,
          phone,
          address,
          notes,
          channel: "online",
          checkoutMethod: paymentRaw,
          paymentMethod: paymentRaw,
          paymentStatus: "unpaid",
          amountPaid: 0,
          remarks: "",
          subtotal: total,
          total,
          status: "pending",
          inventoryHeld: !prepaid,
          supplierStockReceived: false,
          items: {
            create: lineItems.map((item) => ({
              ...item,
              digitalReserved: false,
            })),
          },
        },
        include: { items: true },
      });

      const customer = await upsertCustomerFromSale(tx, {
        name: customerName,
        phone,
        address,
      });

      // COD: hold stock now. Prepaid: hold only after payment confirmed.
      if (!prepaid) {
        for (const item of created.items) {
          const line = normalizeLineAllocation(item);
          await consumeOwnedAllocation(tx, line, consumeLotsFifo);
          await reserveDigitalAllocation(tx, line);
        }
      }

      return { created, customerId: customer?.id ?? null };
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/profits");
    revalidatePath("/admin");
    revalidatePath("/admin/customers");
    return { orderId: order.created.id, customerId: order.customerId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not place order";
    return { error: message };
  }
}

/** Counter / offline shop sale */
export async function placeOfflineSaleAction(
  _prev: OfflineSaleState,
  formData: FormData,
): Promise<OfflineSaleState> {
  await requireAdmin();

  const customerName =
    String(formData.get("customerName") ?? "").trim() || "Walk-in customer";
  const phone = String(formData.get("phone") ?? "").trim();
  const deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
  const deliveryFeeRaw = String(formData.get("deliveryFee") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();
  const paymentRaw = String(formData.get("paymentMethod") ?? "cash").trim();
  const amountPaidRaw = String(formData.get("amountPaid") ?? "").trim();
  const discountMode = String(formData.get("discountMode") ?? "amount").trim();
  const discountValueRaw = String(formData.get("discountValue") ?? "").trim();
  const linesRaw = String(formData.get("lines") ?? "[]");

  if (!isPaymentMethod(paymentRaw)) {
    return { error: "Choose Cash, Bank QR, Credit, or Partial." };
  }

  if (paymentRaw === "credit" || paymentRaw === "partial") {
    const isAnon =
      !customerName.trim() ||
      customerName.trim().toLowerCase() === "walk-in customer";
    if (isAnon) {
      return {
        error: "Credit / partial needs a customer name — not Walk-in.",
      };
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      return {
        error: "Credit / partial needs a phone number to track the due.",
      };
    }
  }

  type LineInput = { productId?: string; quantity?: string };
  let lines: LineInput[] = [];
  try {
    lines = JSON.parse(linesRaw) as LineInput[];
  } catch {
    return { error: "Could not read sale lines." };
  }

  const filled = lines.filter((l) => String(l.productId ?? "").trim());
  if (filled.length === 0) {
    return { error: "Add at least one product." };
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const merged: { productId: string; quantity: number }[] = [];
      for (const [index, line] of filled.entries()) {
        const productId = String(line.productId ?? "").trim();
        const quantity = Number.parseInt(String(line.quantity ?? "1"), 10);
        if (!productId || Number.isNaN(quantity) || quantity < 1) {
          throw new Error(`Line ${index + 1}: enter a valid quantity.`);
        }
        const existing = merged.find((i) => i.productId === productId);
        if (existing) {
          existing.quantity += quantity;
          continue;
        }
        merged.push({ productId, quantity });
      }

      const products = await tx.product.findMany({
        where: {
          id: { in: merged.map((m) => m.productId) },
          published: true,
          sellOffline: true,
        },
      });
      if (products.length !== merged.length) {
        throw new Error("One or more products are not available for offline sale.");
      }

      const lineItems = buildAllocatedLines(merged, products);

      const subtotal = lineItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      let discountPercent = 0;
      let discountAmount = 0;
      if (discountValueRaw !== "") {
        const value = Number.parseFloat(discountValueRaw);
        if (Number.isNaN(value) || value < 0) {
          throw new Error("Enter a valid discount.");
        }
        if (discountMode === "percent") {
          if (value > 100) {
            throw new Error("Discount percent cannot exceed 100%.");
          }
          discountPercent = Math.round(value);
          discountAmount = Math.round((subtotal * value) / 100);
        } else {
          discountAmount = Math.round(value);
          if (discountAmount > subtotal) {
            throw new Error("Discount cannot exceed the bill subtotal.");
          }
          discountPercent =
            subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;
        }
      }
      discountAmount = Math.min(discountAmount, subtotal);

      let deliveryFee = 0;
      if (deliveryFeeRaw !== "") {
        deliveryFee = Number.parseInt(deliveryFeeRaw, 10);
        if (Number.isNaN(deliveryFee) || deliveryFee < 0) {
          throw new Error("Enter a valid delivery fee.");
        }
      }

      const total = Math.max(0, subtotal - discountAmount) + deliveryFee;

      let amountPaid = 0;
      if (paymentRaw === "cash" || paymentRaw === "bank_qr") {
        amountPaid = total;
      } else if (paymentRaw === "credit") {
        amountPaid = 0;
      } else {
        amountPaid = Number.parseInt(amountPaidRaw, 10);
        if (Number.isNaN(amountPaid) || amountPaid <= 0) {
          throw new Error("Enter how much was paid (partial).");
        }
        if (amountPaid >= total) {
          throw new Error(
            "Partial amount must be less than the payable total — use Cash or Bank QR.",
          );
        }
      }
      amountPaid = Math.min(Math.max(0, amountPaid), total);
      const paymentStatus = resolvePaymentStatus(total, amountPaid);

      const created = await tx.order.create({
        data: {
          customerName,
          phone,
          address: deliveryAddress || "Offline shop / pickup",
          notes: "",
          channel: "offline",
          checkoutMethod: "cash",
          paymentMethod: paymentRaw,
          paymentStatus,
          amountPaid,
          remarks,
          subtotal,
          discountAmount,
          discountPercent,
          deliveryFee,
          total,
          status: "completed",
          inventoryHeld: true,
          supplierStockReceived: true,
          items: {
            create: lineItems.map((item) => ({
              ...item,
              digitalReserved: false,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of created.items) {
        const line = normalizeLineAllocation(item);
        await consumeOwnedAllocation(tx, line, consumeLotsFifo);
        await reserveDigitalAllocation(tx, line);
      }

      await upsertCustomerFromSale(tx, {
        name: customerName,
        phone,
        address: deliveryAddress || "Offline shop / pickup",
      });

      await ensureSellerSettlements(tx, created.id, created.items);

      if (amountPaid > 0) {
        await recordPaidDelta(tx, {
          direction: "collect",
          previousPaid: 0,
          nextPaid: amountPaid,
          method: paymentRaw,
          note: remarks,
          partyName: customerName,
          partyPhone: phone,
          orderId: created.id,
          refLabel: `#${created.id.slice(0, 8)}`,
        });
      }

      return created;
    });

    revalidateStore();
    revalidatePath("/admin/orders");
    revalidatePath("/admin/sales");
    revalidatePath("/admin/profits");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/customers");
    revalidatePath("/admin/payments");
    return { orderId: order.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save offline sale.";
    return { error: message };
  }
}

/** Pay one or more seller settlements (digital inventory payout). */
export async function paySellerSettlementsAction(formData: FormData) {
  await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const idsRaw = String(formData.get("settlementIds") ?? "").trim();
  const method = String(formData.get("method") ?? "cash").trim() || "cash";
  const note = String(formData.get("note") ?? "").trim();
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
    "/admin/payments?view=sellers",
  );

  const ids = idsRaw
    ? idsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (!vendorId || ids.length === 0) {
    redirect(redirectTo);
    return;
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    redirect(redirectTo);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const rows = await tx.sellerSettlement.findMany({
      where: {
        id: { in: ids },
        vendorId,
        paid: false,
      },
    });
    if (rows.length === 0) {
      throw new Error("Nothing to pay.");
    }
    for (const row of rows) {
      const due = Math.max(0, row.amount - row.amountPaid);
      if (due <= 0) continue;
      await tx.sellerSettlement.update({
        where: { id: row.id },
        data: {
          amountPaid: row.amount,
          paid: true,
        },
      });
      await tx.paymentEvent.create({
        data: {
          direction: "settle",
          amount: due,
          previousPaid: row.amountPaid,
          balanceAfter: row.amount,
          method,
          note,
          partyName: vendor.name,
          partyPhone: vendor.phone,
          orderId: row.orderId,
          batchId: row.id,
          refLabel: `Settle ${row.productName} ×${row.quantity}`,
        },
      });
    }
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/profits");
  redirect(redirectTo);
}
