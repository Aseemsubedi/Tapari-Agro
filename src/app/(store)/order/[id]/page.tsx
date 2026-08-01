import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { prisma } from "@/lib/db";
import { formatNprFromInt } from "@/lib/products";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Order received",
};

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-28 sm:px-8 sm:pb-28 sm:pt-32">
      <ClearCartOnMount />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">
        Order received
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink">
        Thank you, {order.customerName}
      </h1>
      <p className="mt-4 text-ink/65">
        We got your order and will confirm by phone soon.
      </p>
      <p className="mt-2 text-sm text-ink/45">Order ID: {order.id}</p>

      <ul className="mt-10 divide-y divide-pine/10 border-y border-pine/10">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-4 text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span className="font-medium text-pine">
              {formatNprFromInt(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between font-display text-2xl">
        <span>Total</span>
        <span>{formatNprFromInt(order.total)}</span>
      </p>

      <Link
        href="/shop"
        className="mt-10 inline-block bg-pine px-6 py-3 text-sm font-semibold text-mist"
      >
        Back to shop
      </Link>
    </div>
  );
}
