import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerLedgerShare } from "@/components/customer-ledger-share";
import { prisma } from "@/lib/db";
import {
  buildCustomerLedger,
  customerLedgerMessage,
} from "@/lib/customer-ledger";
import { normalizePhone } from "@/lib/customers";
import { formatNprFromInt } from "@/lib/products";
import { shopConfig } from "@/lib/shop";

type Props = {
  params: Promise<{ key: string }>;
};

function matchesCustomer(
  order: { phone: string; customerName: string },
  key: string,
) {
  const digits = normalizePhone(order.phone);
  if (key.startsWith("p:")) {
    return digits === key.slice(2);
  }
  if (key.startsWith("n:")) {
    return (
      !digits &&
      order.customerName.trim().toLowerCase() === key.slice(2)
    );
  }
  return digits === normalizePhone(key);
}

export default async function CustomerInvoicePage({ params }: Props) {
  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        select: { name: true, quantity: true, price: true },
      },
    },
  });

  const customerOrders = orders.filter((o) => matchesCustomer(o, key));
  if (customerOrders.length === 0) notFound();

  const name = customerOrders[0]!.customerName;
  const phone =
    customerOrders.find((o) => o.phone)?.phone ?? customerOrders[0]!.phone;

  const ledger = buildCustomerLedger(customerOrders);
  const message = customerLedgerMessage({
    customerName: name,
    phone,
    spent: ledger.spent,
    paid: ledger.paid,
    due: ledger.due,
    dueLines: ledger.dueLines,
  });
  const asOf = new Date().toLocaleDateString("en-NP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const customerHref = `/admin/customers/${encodeURIComponent(key)}`;
  const invoiceHref = `/admin/customers/${encodeURIComponent(key)}/invoice`;

  return (
    <div className="mx-auto max-w-2xl space-y-4 print:max-w-none print:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={customerHref}
          className="text-sm font-medium text-ink/50 hover:text-ink"
        >
          ← Customer
        </Link>
        <CustomerLedgerShare
          phone={phone}
          message={message}
          invoiceHref={invoiceHref}
          canPrintHere
        />
      </div>

      <article className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pine">
              {shopConfig.name}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Credit statement
            </h1>
            <p className="mt-1 text-sm text-ink/50">{asOf}</p>
          </div>
          <div className="text-right text-sm text-ink/60">
            <p>{shopConfig.phoneDisplay}</p>
            <p className="text-xs text-ink/40">{shopConfig.deliveryNote}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
              Bill to
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">{name}</p>
            <p className="text-sm text-ink/55">{phone || "—"}</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
              Remaining due
            </p>
            <p className="font-display text-3xl font-bold tabular-nums text-amber-950">
              {formatNprFromInt(ledger.due)}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/70">
              {ledger.openBills} open bill
              {ledger.openBills === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3 border-y border-black/[0.06] py-4 text-center sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Billed
            </p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatNprFromInt(ledger.spent)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Paid
            </p>
            <p className="mt-1 font-semibold tabular-nums text-emerald-700">
              {formatNprFromInt(ledger.paid)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">
              Balance
            </p>
            <p className="mt-1 font-semibold tabular-nums text-amber-900">
              {formatNprFromInt(ledger.due)}
            </p>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Ledger</h2>
          {ledger.dueLines.length === 0 ? (
            <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              No remaining dues. Thank you.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[0.08] text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                    <th className="py-2 pr-2 font-semibold">Bill</th>
                    <th className="py-2 pr-2 font-semibold">Date</th>
                    <th className="py-2 pr-2 text-right font-semibold">Total</th>
                    <th className="py-2 pr-2 text-right font-semibold">Paid</th>
                    <th className="py-2 text-right font-semibold">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.dueLines.map((row) => (
                    <tr
                      key={row.orderId}
                      className="border-b border-black/[0.05] align-top"
                    >
                      <td className="py-2.5 pr-2">
                        <p className="font-semibold text-ink">{row.ref}</p>
                        <p className="text-[11px] text-ink/45">{row.itemsLabel}</p>
                      </td>
                      <td className="py-2.5 pr-2 text-ink/60">{row.dateLabel}</td>
                      <td className="py-2.5 pr-2 text-right tabular-nums">
                        {formatNprFromInt(row.bill)}
                      </td>
                      <td className="py-2.5 pr-2 text-right tabular-nums text-emerald-700">
                        {formatNprFromInt(row.paid)}
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-amber-900">
                        {formatNprFromInt(row.due)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink/20">
                    <td colSpan={4} className="py-3 text-right font-semibold">
                      Remaining due
                    </td>
                    <td className="py-3 text-right font-display text-xl font-bold tabular-nums text-amber-950">
                      {formatNprFromInt(ledger.due)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-black/[0.06] pt-4 text-xs text-ink/45">
          <p>
            Please settle the remaining balance when convenient. Contact{" "}
            {shopConfig.name} at {shopConfig.phoneDisplay}.
          </p>
        </footer>
      </article>

      <style>{`
        @media print {
          body { background: white !important; }
          header, nav, aside, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
