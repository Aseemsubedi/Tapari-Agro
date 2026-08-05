/** NPR helpers for purchase bill / lot payments (incl. partial). */

export function lineSpend(lot: { quantity: number; unitCost: number }) {
  return lot.quantity * lot.unitCost;
}

/** Remaining due on a lot. Fully paid lines are always 0. */
export function lineDue(lot: {
  quantity: number;
  unitCost: number;
  amountPaid: number;
  paid: boolean;
  stockKind?: string | null;
}) {
  if (lot.stockKind === "digital") return 0;
  if (lot.paid) return 0;
  return Math.max(0, lineSpend(lot) - Math.max(0, lot.amountPaid));
}

/** Effective amount paid (legacy rows: paid=true with amountPaid 0 → treat as full). */
export function lineAmountPaid(lot: {
  quantity: number;
  unitCost: number;
  amountPaid: number;
  paid: boolean;
  stockKind?: string | null;
}) {
  // Digital reservation records payout rate only — no money moved yet.
  if (lot.stockKind === "digital") return 0;
  const spend = lineSpend(lot);
  if (lot.paid) return spend;
  return Math.min(spend, Math.max(0, lot.amountPaid));
}

/** Split a bill-level payment across line totals (handles rounding). */
export function allocateBillPayment(
  lineTotals: number[],
  amountPaid: number,
): number[] {
  const billTotal = lineTotals.reduce((sum, t) => sum + t, 0);
  if (billTotal <= 0 || lineTotals.length === 0) {
    return lineTotals.map(() => 0);
  }
  const capped = Math.max(0, Math.min(amountPaid, billTotal));
  const allocated = lineTotals.map((t) =>
    Math.floor((t * capped) / billTotal),
  );
  let remainder = capped - allocated.reduce((sum, a) => sum + a, 0);
  const order = lineTotals
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t - a.t)
    .map((x) => x.i);
  for (const i of order) {
    if (remainder <= 0) break;
    allocated[i]! += 1;
    remainder -= 1;
  }
  return allocated;
}

export function paymentLabel(paidAmount: number, billTotal: number) {
  if (billTotal <= 0 || paidAmount >= billTotal) return "Paid" as const;
  if (paidAmount <= 0) return "Unpaid" as const;
  return "Partial" as const;
}

/** Supplier bill settlement: Settled | Pending | Partial | Reserved */
export function settlementLabel(
  paidAmount: number,
  billTotal: number,
  opts?: { digital?: boolean },
) {
  if (opts?.digital) return "Reserved" as const;
  if (billTotal <= 0 || paidAmount >= billTotal) return "Settled" as const;
  if (paidAmount <= 0) return "Pending" as const;
  return "Partial" as const;
}

export type PurchasePayMethod = "cash" | "bank" | "cheque";

export function isPurchasePayMethod(value: string): value is PurchasePayMethod {
  return value === "cash" || value === "bank" || value === "cheque";
}

export function payMethodLabel(method: string) {
  if (method === "cash") return "Cash";
  if (method === "bank") return "Bank";
  if (method === "cheque") return "Cheque";
  return "";
}

/** Short display: Cash · Bank · Cheque #123 (12 Jul 2026) */
export function formatPurchasePay(
  method: string,
  chequeNo = "",
  chequeDate: Date | null = null,
) {
  const label = payMethodLabel(method);
  if (!label) return "";
  if (method !== "cheque") return label;
  const parts = [label];
  if (chequeNo.trim()) parts.push(`#${chequeNo.trim()}`);
  if (chequeDate) {
    parts.push(
      chequeDate.toLocaleDateString("en-NP", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    );
  }
  return parts.join(" · ");
}

export function parseChequeDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
