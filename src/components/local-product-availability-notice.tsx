import Link from "next/link";
import { callLink, shopConfig } from "@/lib/shop";

/** Fine-print notice — rare stockout edge case, kept short and clear. */
export function LocalProductAvailabilityNotice({
  className = "",
}: {
  className?: string;
}) {
  return (
    <aside
      className={`border border-pine/8 bg-mist/30 px-3 py-2.5 text-[9px] leading-[1.55] text-ink/50 sm:text-[10px] ${className}`}
    >
      <p className="font-bold uppercase tracking-[0.12em] text-ink/55">
        Local Product Availability Notice
      </p>
      <p className="mt-1.5">
        Locally sourced items are usually in stock. In rare cases (approximately{" "}
        <strong className="font-semibold text-ink/65">1%</strong> of orders), a
        product may sell out before our inventory is updated. If this happens
        after you place your order,{" "}
        <strong className="font-semibold text-ink/65">
          our sales team will contact you during the order confirmation process
        </strong>
        , and a{" "}
        <strong className="font-semibold text-ink/65">
          full refund will be processed within 1 hour
        </strong>{" "}
        for the unavailable item.
      </p>
      <p className="mt-1.5">
        If you would still like the item, we can{" "}
        <strong className="font-semibold text-ink/65">
          add it to your Wishlist
        </strong>
        . Once it becomes available again,{" "}
        <strong className="font-semibold text-ink/65">
          our team will contact you and prioritize your order for dispatch
        </strong>
        .
      </p>
      <p className="mt-1.5">
        When{" "}
        <strong className="font-semibold text-ink/65">
          origin, freshness, or condition
        </strong>{" "}
        matters, we recommend contacting our{" "}
        <strong className="font-semibold text-ink/65">
          Local Product Expert
        </strong>{" "}
        before placing your order for the latest availability.
      </p>
      <p className="mt-1.5 font-semibold text-ink/60">
        Contact:{" "}
        <a
          href={callLink()}
          className="tabular-nums text-pine underline underline-offset-2"
        >
          {shopConfig.phoneDisplay}
        </a>
        {" · "}
        <Link
          href="/contact"
          className="text-pine underline underline-offset-2"
        >
          Message us
        </Link>
      </p>
    </aside>
  );
}
