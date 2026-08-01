import Link from "next/link";
import { notFound } from "next/navigation";
import { updateOrderStatusAction } from "@/app/actions";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/orders" className="text-sm text-ink/55 hover:text-ink">
        ← Orders
      </Link>
      <h1 className="mt-4 font-display text-3xl text-ink">
        {order.customerName}
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        {order.phone} · {order.createdAt.toLocaleString("en-NP")}
      </p>

      <div className="mt-8 space-y-2 text-sm">
        <p>
          <span className="text-ink/50">Address:</span> {order.address}
        </p>
        {order.notes ? (
          <p>
            <span className="text-ink/50">Notes:</span> {order.notes}
          </p>
        ) : null}
      </div>

      <ul className="mt-8 divide-y divide-pine/10 border-y border-pine/10">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between py-3 text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatNprFromInt(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between font-display text-2xl">
        <span>Total</span>
        <span>{formatNprFromInt(order.total)}</span>
      </p>

      <form action={updateOrderStatusAction} className="mt-8 flex gap-3">
        <input type="hidden" name="id" value={order.id} />
        <select
          name="status"
          defaultValue={order.status}
          className="border border-pine/20 bg-white px-3 py-2 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="bg-pine px-4 py-2 text-sm font-semibold text-mist"
        >
          Update status
        </button>
      </form>
    </div>
  );
}
