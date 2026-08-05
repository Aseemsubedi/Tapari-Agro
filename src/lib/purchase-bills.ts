import {
  lineAmountPaid,
  lineDue,
  lineSpend,
  settlementLabel,
} from "@/lib/purchase-payment";

/** Minimal fields needed to roll purchase lines into a bill. */
export type PurchaseBillSeed = {
  id: string;
  batchId: string;
  billNo: string;
  vendorId: string | null;
  note?: string;
  createdAt: Date;
  quantity: number;
  unitCost: number;
  amountPaid: number;
  paid: boolean;
  payMethod: string;
  chequeNo: string;
  chequeDate: Date | null;
  expiresAt?: Date | null;
  stockKind?: string;
  product?: {
    id: string;
    name: string;
    unit: string;
    imageUrl: string;
  };
  vendor: { id: string; name: string } | null;
};

export type PurchaseBillLine = PurchaseBillSeed & {
  note: string;
  expiresAt: Date | null;
  product: {
    id: string;
    name: string;
    unit: string;
    imageUrl: string;
  };
};

export type PurchaseBill = {
  key: string;
  batchId: string;
  billNo: string;
  vendorId: string | null;
  vendorName: string | null;
  note: string;
  createdAt: Date;
  lines: PurchaseBillLine[];
  total: number;
  amountPaid: number;
  due: number;
  payMethod: string;
  chequeNo: string;
  chequeDate: Date | null;
  status: ReturnType<typeof settlementLabel>;
};

function normalizeLine(row: PurchaseBillSeed): PurchaseBillLine {
  return {
    ...row,
    note: row.note ?? "",
    expiresAt: row.expiresAt ?? null,
    product: row.product ?? {
      id: "",
      name: "",
      unit: "",
      imageUrl: "",
    },
  };
}

/** Group stock purchase lines into supplier bills (by batchId). */
export function groupPurchaseBills(purchases: PurchaseBillSeed[]): PurchaseBill[] {
  const groups = new Map<string, PurchaseBill>();

  for (const raw of purchases) {
    const row = normalizeLine(raw);
    const key = row.batchId || `line:${row.id}`;
    const spend = lineSpend(row);
    const paidAmt = lineAmountPaid(row);
    const due = lineDue(row);
    const existing = groups.get(key);
    if (existing) {
      existing.lines.push(row);
      existing.total += spend;
      existing.amountPaid += paidAmt;
      existing.due += due;
    } else {
      groups.set(key, {
        key,
        batchId: row.batchId,
        billNo: row.billNo,
        vendorId: row.vendorId,
        vendorName: row.vendor?.name ?? null,
        note: row.note,
        createdAt: row.createdAt,
        lines: [row],
        total: spend,
        amountPaid: paidAmt,
        due,
        payMethod: row.payMethod,
        chequeNo: row.chequeNo,
        chequeDate: row.chequeDate,
        status: "Pending",
      });
    }
  }

  const bills = [...groups.values()];
  for (const bill of bills) {
    const digital = bill.lines.every(
      (l) => (l.stockKind ?? "owned") === "digital",
    );
    bill.status = settlementLabel(bill.amountPaid, bill.total, { digital });
  }
  bills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return bills;
}
