import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";

export default async function AdminHomePage() {
  const [productCount, orderCount, pendingCount, recentOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Overview</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border border-pine/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Products</p>
          <p className="mt-2 font-display text-3xl">{productCount}</p>
        </div>
        <div className="border border-pine/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Orders</p>
          <p className="mt-2 font-display text-3xl">{orderCount}</p>
        </div>
        <div className="border border-pine/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Pending</p>
          <p className="mt-2 font-display text-3xl">{pendingCount}</p>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-xl">Recent orders</h2>
        <Link href="/admin/orders" className="text-sm text-pine hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto border border-pine/10 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-pine/10 text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id} className="border-b border-pine/5">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="hover:underline"
                  >
                    {order.customerName}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatNprFromInt(order.total)}</td>
                <td className="px-4 py-3 capitalize">{order.status}</td>
                <td className="px-4 py-3 text-ink/55">
                  {order.createdAt.toLocaleDateString("en-NP")}
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-ink/50">
                  No orders yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
