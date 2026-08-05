import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nearestExpiryByProduct } from "@/lib/inventory";
import {
  EXPIRY_ALERT_DAYS,
  productInInventoryQueue,
} from "@/lib/inventory-queue";
import { groupPurchaseBills } from "@/lib/purchase-bills";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Tapari Agro Admin",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname =
    headerList.get("x-admin-pathname") ??
    headerList.get("next-url") ??
    "";
  const isLogin =
    pathname === "/admin/login" || pathname.endsWith("/admin/login");

  if (!isLogin && !(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  let pendingOrders = 0;
  let lowStock = 0;
  let openDues = 0;

  if (!isLogin) {
    try {
      const now = Date.now();
      const soon = new Date(now + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000);
      const [needsAction, products, expiryLots, creditOrders, unpaidPurchases] =
        await Promise.all([
          prisma.order.count({
            where: { status: { in: ["pending", "confirmed", "shipped"] } },
          }),
          prisma.product.findMany({
            where: { published: true },
            select: {
              id: true,
              stock: true,
              digitalAvailable: true,
              inventoryMode: true,
              published: true,
              sellOnline: true,
              sellOffline: true,
            },
          }),
          prisma.stockPurchase.findMany({
            where: {
              remainingQty: { gt: 0 },
              expiresAt: { not: null, lte: soon },
            },
            select: {
              productId: true,
              expiresAt: true,
              remainingQty: true,
              product: { select: { id: true } },
            },
            take: 500,
          }),
          prisma.order.count({
            where: {
              status: { not: "cancelled" },
              paymentStatus: { in: ["unpaid", "partial"] },
            },
          }),
          prisma.stockPurchase.findMany({
            where: { paid: false },
            select: {
              id: true,
              batchId: true,
              billNo: true,
              vendorId: true,
              quantity: true,
              unitCost: true,
              amountPaid: true,
              paid: true,
              payMethod: true,
              chequeNo: true,
              chequeDate: true,
              createdAt: true,
              vendor: { select: { id: true, name: true } },
            },
          }),
        ]);

      const expiryMap = nearestExpiryByProduct(
        expiryLots.map((l) => ({
          ...l,
          id: l.productId,
          batchId: "",
          vendorId: null,
          quantity: l.remainingQty,
          unitCost: 0,
          amountPaid: 0,
          paid: true,
          payMethod: "",
          chequeNo: "",
          chequeDate: null,
          billNo: "",
          createdAt: new Date(),
          product: {
            id: l.product.id,
            name: "",
            unit: "",
            stock: 0,
            imageUrl: "",
          },
          vendor: null,
        })),
        now,
      );

      const queueCount = products.filter((p) =>
        productInInventoryQueue(
          {
            ...p,
            nearestExpiry: expiryMap.get(p.id) ?? null,
          },
          now,
        ),
      ).length;

      pendingOrders = needsAction;
      lowStock = queueCount;
      const unpaidBills = groupPurchaseBills(unpaidPurchases).filter(
        (b) => b.due > 0,
      );
      openDues = creditOrders + unpaidBills.length;
    } catch {
      pendingOrders = 0;
      lowStock = 0;
      openDues = 0;
    }
  }

  return (
    <AdminShell
      pendingOrders={pendingOrders}
      lowStock={lowStock}
      openDues={openDues}
    >
      {children}
    </AdminShell>
  );
}
