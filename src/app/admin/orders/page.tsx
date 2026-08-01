import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Orders</h1>
      <div className="mt-8 overflow-x-auto border border-pine/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-pine/10 text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-pine/5">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    {order.customerName}
                  </Link>
                  <div className="text-xs text-ink/45">{order.phone}</div>
                </td>
                <td className="px-4 py-3">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </td>
                <td className="px-4 py-3">{formatNprFromInt(order.total)}</td>
                <td className="px-4 py-3 capitalize">{order.status}</td>
                <td className="px-4 py-3 text-ink/55">
                  {order.createdAt.toLocaleString("en-NP")}
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-ink/50">
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
