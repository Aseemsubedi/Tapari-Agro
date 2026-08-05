import {
  updateDigitalAvailableAction,
  updateStockAction,
  writeOffStockAction,
} from "@/app/actions";
import { AdminSubmit } from "@/components/admin-ui";
import { sellableQty } from "@/lib/inventory-mode";
import { formatNprFromInt } from "@/lib/products";

/** Write-off, recount, digital — only on product detail (not inventory list rows). */
export function ProductStockAdjust({
  product,
  digitalLots = [],
}: {
  product: {
    id: string;
    name: string;
    stock: number;
    digitalAvailable: number;
    inventoryMode: string;
    costPrice: number;
  };
  digitalLots?: {
    id: string;
    remainingQty: number;
    unitCost: number;
    billNo: string;
    vendor: { id: string; name: string } | null;
  }[];
}) {
  const sellable = sellableQty(product);
  const showDigital =
    product.inventoryMode === "digital" ||
    product.inventoryMode === "hybrid" ||
    product.digitalAvailable > 0 ||
    digitalLots.length > 0;
  const showOwned =
    product.inventoryMode === "owned" ||
    product.inventoryMode === "hybrid" ||
    product.stock > 0;
  const redirectTo = `/admin/products/${product.id}#adjust-stock`;

  return (
    <section
      id="adjust-stock"
      className="scroll-mt-20 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(16,36,24,0.04)] sm:p-6"
    >
      <div className="mb-4 border-b border-black/[0.06] pb-3">
        <h2 className="text-base font-semibold text-ink">Adjust stock</h2>
        <p className="mt-0.5 text-sm text-ink/45">
          Sellable {sellable}
          {showOwned ? ` · owned ${product.stock}` : ""}
          {showDigital ? ` · digital ${product.digitalAvailable}` : ""}
          {product.costPrice > 0
            ? ` · cost ${formatNprFromInt(product.costPrice)}`
            : ""}
          . Owned sells first, then digital by supplier batch. Restock with a
          purchase bill — recount only after a physical count.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {showDigital ? (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">
              Digital available
            </p>
            {digitalLots.length > 0 ? (
              <ul className="mb-3 space-y-1 text-sm text-ink/70">
                {digitalLots.map((lot) => (
                  <li key={lot.id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {lot.vendor?.name ?? "Unknown supplier"}
                      {lot.billNo ? (
                        <span className="text-ink/35"> · {lot.billNo}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-ink">
                      {lot.remainingQty}
                      <span className="font-normal text-ink/35">
                        {" "}
                        @ {formatNprFromInt(lot.unitCost)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              action={updateDigitalAvailableAction}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <label className="block min-w-[7rem] flex-1 text-xs text-ink/50">
                Total digital units
                <input
                  type="number"
                  name="digitalAvailable"
                  min={0}
                  defaultValue={product.digitalAvailable}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:border-pine"
                />
              </label>
              <AdminSubmit size="sm">Save digital</AdminSubmit>
            </form>
          </div>
        ) : null}

        {showOwned ? (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">
              Write off owned
            </p>
            <form
              action={writeOffStockAction}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <label className="block w-24 text-xs text-ink/50">
                Qty
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  max={product.stock}
                  defaultValue={1}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:border-pine"
                />
              </label>
              <label className="block min-w-[10rem] flex-1 text-xs text-ink/50">
                Reason
                <input
                  type="text"
                  name="reason"
                  placeholder="Damage / spoilage"
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-pine"
                />
              </label>
              <AdminSubmit size="sm" variant="danger">
                Write off
              </AdminSubmit>
            </form>
          </div>
        ) : null}
      </div>

      {showOwned ? (
        <details className="mt-5 border-t border-black/[0.06] pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink/50">
            Recount (set on-hand)
          </summary>
          <p className="mt-2 text-xs text-ink/40">
            Only after a physical count. This overwrites owned stock and
            reconciles lots.
          </p>
          <form
            action={updateStockAction}
            className="mt-3 flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label className="block w-28 text-xs text-ink/50">
              On-hand qty
              <input
                type="number"
                name="stock"
                min={0}
                defaultValue={product.stock}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:border-pine"
              />
            </label>
            <AdminSubmit size="sm" variant="secondary">
              Set on-hand
            </AdminSubmit>
          </form>
        </details>
      ) : null}

      <p className="mt-4">
        <a
          href={`/admin/purchases?view=new&productId=${product.id}`}
          className="text-sm font-semibold text-pine hover:underline"
        >
          Restock — new purchase bill →
        </a>
      </p>
    </section>
  );
}
