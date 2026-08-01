import type { Metadata } from "next";
import Link from "next/link";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Tapari Agro — call or WhatsApp to order fresh organic staples from Parbat, Myagdi and Mustang.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-28 pt-16 sm:px-8 sm:pt-20">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-leaf">
        Contact us
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        We are here to help
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/65 sm:text-lg">
        Order online, or call / WhatsApp if you prefer. If the website feels
        difficult, phone us — we will send your goods.
      </p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/55">
        सामान माग्न वेबसाइटबाट अप्ठ्यारो छ भने हामीलाई फोन गर्नुहोस्! हामी
        पठाइदिन्छौं तपाईंको सामान।
      </p>

      <div className="craft-rule my-12 max-w-xs" />

      <div className="grid gap-6 sm:grid-cols-2">
        <a
          href={callLink()}
          className="group border border-pine/10 bg-chalk px-6 py-8 transition hover:border-brass"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brass">
            Phone
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink group-hover:text-pine">
            {shopConfig.phoneDisplay}
          </p>
          <p className="mt-2 text-sm text-ink/55">Tap to call · best for quick orders</p>
        </a>

        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="group border border-pine/10 bg-chalk px-6 py-8 transition hover:border-brass"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brass">
            WhatsApp
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink group-hover:text-pine">
            Message us
          </p>
          <p className="mt-2 text-sm text-ink/55">
            Send your list — we confirm and arrange delivery
          </p>
        </a>
      </div>

      <section className="mt-12 border border-pine/10 bg-mist/40 px-6 py-8 sm:px-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Delivery & ordering
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/65">
          <li>{shopConfig.deliveryNote}</li>
          <li>Cash on delivery or bank transfer</li>
          <li>We confirm every order by phone before packing</li>
          <li>
            Sourced from Parbat (Jaljala), Myagdi & Mustang — direct kishan to
            home
          </li>
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <a
          href={callLink()}
          className="inline-flex min-h-12 items-center bg-pine px-7 text-sm font-semibold tracking-wide text-chalk transition hover:bg-pine/90"
        >
          Call {shopConfig.phoneDisplay}
        </a>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center border border-pine/15 px-7 text-sm font-medium tracking-wide text-pine transition hover:border-brass"
        >
          WhatsApp
        </a>
        <Link
          href="/shop"
          className="inline-flex min-h-12 items-center px-2 text-sm font-medium text-ink/55 hover:text-pine"
        >
          Browse shop →
        </Link>
      </div>
    </div>
  );
}
