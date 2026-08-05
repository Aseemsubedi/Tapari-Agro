import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  isPurchasePayMethod,
  parseChequeDate,
} from "@/lib/purchase-payment";

export type PurchaseActionState = {
  error?: string;
  ok?: boolean;
};

export type OfflineSaleState = {
  error?: string;
  orderId?: string;
};

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export function revalidateStore() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/purchases");
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/profits");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/home-sections");
}

export function readPurchasePayFields(formData: FormData, billPaid: number) {
  if (billPaid <= 0) {
    return { payMethod: "", chequeNo: "", chequeDate: null as Date | null };
  }
  const payMethodRaw = String(formData.get("payMethod") ?? "cash").trim();
  if (!isPurchasePayMethod(payMethodRaw)) {
    throw new Error("Choose Cash, Bank, or Cheque.");
  }
  const chequeNo = String(formData.get("chequeNo") ?? "").trim();
  const chequeDate = parseChequeDate(
    String(formData.get("chequeDate") ?? ""),
  );
  if (payMethodRaw === "cheque") {
    if (!chequeNo) throw new Error("Enter the cheque number.");
    if (!chequeDate) throw new Error("Enter the cheque date.");
  }
  return {
    payMethod: payMethodRaw,
    chequeNo: payMethodRaw === "cheque" ? chequeNo : "",
    chequeDate: payMethodRaw === "cheque" ? chequeDate : null,
  };
}

export function safeAdminRedirect(raw: string, fallback: string) {
  const value = raw.trim();
  if (value.startsWith("/admin/") && !value.startsWith("//")) return value;
  return fallback;
}
