import type { Prisma } from "@prisma/client";
import { orderPaymentDue } from "@/lib/orders";
import { formatNprFromInt } from "@/lib/products";
import { shopConfig } from "@/lib/shop";

type Tx = Prisma.TransactionClient | typeof import("@/lib/db").prisma;

export type CreditAgeBucket = "0-7" | "8-15" | "16-30" | "31+";

export function creditAgeBucket(createdAt: Date, now = new Date()): CreditAgeBucket {
  const days = Math.floor(
    (now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days <= 7) return "0-7";
  if (days <= 15) return "8-15";
  if (days <= 30) return "16-30";
  return "31+";
}

export function creditAgeDays(createdAt: Date, now = new Date()) {
  return Math.max(
    0,
    Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

export function creditAgeBucketLabel(bucket: CreditAgeBucket) {
  switch (bucket) {
    case "0-7":
      return "0–7 days";
    case "8-15":
      return "8–15 days";
    case "16-30":
      return "16–30 days";
    case "31+":
      return "31+ days overdue";
  }
}

export type CreditAgingRow = {
  orderId: string;
  customerName: string;
  phone: string;
  total: number;
  paid: number;
  due: number;
  createdAt: Date;
  days: number;
  bucket: CreditAgeBucket;
  channel: string;
  customerKey: string;
};

export function buildCreditAging(
  orders: {
    id: string;
    customerName: string;
    phone: string;
    total: number;
    amountPaid: number;
    paymentStatus: string;
    status: string;
    createdAt: Date;
    channel: string;
  }[],
  customerKeyFn: (phone: string, name: string) => string,
  now = new Date(),
): CreditAgingRow[] {
  const rows: CreditAgingRow[] = [];
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const due = orderPaymentDue(order);
    if (due <= 0) continue;
    const paid =
      order.paymentStatus === "paid"
        ? order.total
        : Math.max(0, order.amountPaid);
    rows.push({
      orderId: order.id,
      customerName: order.customerName,
      phone: order.phone,
      total: order.total,
      paid,
      due,
      createdAt: order.createdAt,
      days: creditAgeDays(order.createdAt, now),
      bucket: creditAgeBucket(order.createdAt, now),
      channel: order.channel,
      customerKey: customerKeyFn(order.phone, order.customerName),
    });
  }
  rows.sort((a, b) => b.days - a.days || b.due - a.due);
  return rows;
}

export function creditRemindMessage(row: CreditAgingRow) {
  return [
    `*${shopConfig.name} — Credit reminder*`,
    `Namaste ${row.customerName},`,
    "",
    `Bill #${row.orderId.slice(0, 8)} from ${row.createdAt.toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })} (${row.days} day${row.days === 1 ? "" : "s"} ago)`,
    `Total: ${formatNprFromInt(row.total)}`,
    `Paid: ${formatNprFromInt(row.paid)}`,
    `*Remaining due: ${formatNprFromInt(row.due)}*`,
    "",
    `Please settle when convenient. Call/WhatsApp ${shopConfig.phoneDisplay}.`,
    `— ${shopConfig.name}`,
  ].join("\n");
}

export async function recordPaymentEvent(
  db: Tx,
  input: {
    direction: "collect" | "pay";
    amount: number;
    previousPaid: number;
    balanceAfter: number;
    method?: string;
    note?: string;
    chequeNo?: string;
    chequeDate?: Date | null;
    partyName?: string;
    partyPhone?: string;
    orderId?: string;
    batchId?: string;
    refLabel?: string;
  },
) {
  return db.paymentEvent.create({
    data: {
      direction: input.direction,
      amount: Math.max(0, Math.round(input.amount)),
      previousPaid: Math.max(0, Math.round(input.previousPaid)),
      balanceAfter: Math.max(0, Math.round(input.balanceAfter)),
      method: input.method ?? "",
      note: input.note ?? "",
      chequeNo: input.chequeNo ?? "",
      chequeDate: input.chequeDate ?? null,
      partyName: input.partyName ?? "",
      partyPhone: input.partyPhone ?? "",
      orderId: input.orderId ?? "",
      batchId: input.batchId ?? "",
      refLabel: input.refLabel ?? "",
    },
  });
}

/** Record delta when bill paid amount changes. Skips no-op. */
export async function recordPaidDelta(
  db: Tx,
  input: {
    direction: "collect" | "pay";
    previousPaid: number;
    nextPaid: number;
    method?: string;
    note?: string;
    chequeNo?: string;
    chequeDate?: Date | null;
    partyName?: string;
    partyPhone?: string;
    orderId?: string;
    batchId?: string;
    refLabel?: string;
  },
) {
  const previousPaid = Math.max(0, input.previousPaid);
  const nextPaid = Math.max(0, input.nextPaid);
  if (previousPaid === nextPaid) return null;

  const increased = nextPaid > previousPaid;
  const amount = Math.abs(nextPaid - previousPaid);
  const method =
    nextPaid === 0
      ? "clear"
      : input.method || (input.direction === "collect" ? "cash" : "cash");
  const note =
    nextPaid === 0
      ? input.note || "Payment cleared"
      : !increased
        ? input.note || "Payment reduced"
        : input.note || "";

  return recordPaymentEvent(db, {
    direction: input.direction,
    amount: increased ? amount : 0,
    previousPaid,
    balanceAfter: nextPaid,
    method,
    note: increased ? note : note || `Adjusted −${amount}`,
    chequeNo: input.chequeNo,
    chequeDate: input.chequeDate,
    partyName: input.partyName,
    partyPhone: input.partyPhone,
    orderId: input.orderId,
    batchId: input.batchId,
    refLabel: input.refLabel,
  });
}
