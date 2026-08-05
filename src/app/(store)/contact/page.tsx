import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact & order help",
  description:
    "Call or WhatsApp Tapari Agro to order organic spices, honey and staples. Phone 9857620569 — Kathmandu Valley delivery, COD available.",
  path: "/contact",
  keywords: [
    "Tapari Agro phone",
    "order WhatsApp Nepal",
    "organic grocery Kathmandu contact",
    "9857620569",
  ],
});

export default function ContactPage() {
  const waOrder = whatsappLink(
    "Hello Tapari Agro — I'd like help placing an order.",
  );

  const contactLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Tapari Agro",
    url: absoluteUrl("/contact"),
    description:
      "Call or WhatsApp to order organic kitchen staples from Nepal hills.",
    mainEntity: {
      "@type": "Organization",
      name: shopConfig.name,
      telephone: `+977${shopConfig.phoneTel.replace(/^977/, "")}`,
      url: absoluteUrl("/"),
    },
  };

  return (
    <div className="bg-[#f6f7f9]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
          contactLd,
        ]}
      />
      <header className="border-b border-pine/8 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-leaf">
            Contact
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Call us — we will send your order
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/60 sm:text-lg">
            Shop online, or reach us by phone and WhatsApp. If the website feels
            hard, just call — we pack and deliver.
          </p>
        </div>
      </header>

      {/* Nepali help */}
      <section className="border-b border-brass/25 bg-brass/15">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8">
          <p className="animate-help-blink text-center font-display text-lg font-extrabold leading-snug text-pine sm:text-left sm:text-xl md:text-2xl">
            अर्डर गर्न अप्ठ्यारो छ? हामीलाई फोन गर्नुहोस् — हामी सामान
            पठाइदिन्छौं।
          </p>
        </div>
      </section>

      {/* Primary actions */}
      <section className="border-b border-pine/8">
        <div className="mx-auto grid w-full max-w-5xl gap-3 px-4 py-10 sm:grid-cols-2 sm:gap-4 sm:px-8 sm:py-12">
          <a
            href={callLink()}
            className="flex flex-col justify-between bg-pine px-6 py-8 text-chalk transition hover:bg-leaf sm:px-8 sm:py-10"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brass">
                Phone
              </p>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {shopConfig.phoneDisplay}
              </p>
              <p className="mt-3 text-sm text-chalk/70">
                Best for quick orders · tap to call
              </p>
            </div>
            <span className="mt-8 inline-flex w-fit bg-brass px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-pine">
              फोन गर्नुहोस्
            </span>
          </a>

          <a
            href={waOrder}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col justify-between border border-pine/10 bg-white px-6 py-8 transition hover:border-pine sm:px-8 sm:py-10"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brass">
                WhatsApp
              </p>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Message us
              </p>
              <p className="mt-3 text-sm text-ink/55">
                Send your list — we confirm and arrange delivery
              </p>
            </div>
            <span className="mt-8 inline-flex w-fit border-2 border-pine px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-pine">
              Open WhatsApp
            </span>
          </a>
        </div>
      </section>

      {/* Delivery + hours-style info */}
      <section className="border-b border-pine/8 bg-white">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:grid-cols-2 sm:gap-12 sm:px-8 sm:py-14">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-leaf">
              Delivery
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
              How ordering works
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink/60">
              <li>
                <span className="font-bold text-ink">{shopConfig.deliveryNote}</span>
              </li>
              <li>Cash on delivery, QR payment, or bank deposit</li>
              <li>We confirm every order by phone before packing</li>
              <li>
                Sourced from Parbat (Jaljala), Myagdi &amp; Mustang — direct
                kishan to home
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brass">
              Reach
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
              Tapari Agro
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-bold text-ink/45">Phone</dt>
                <dd className="mt-1">
                  <a
                    href={callLink()}
                    className="text-lg font-extrabold text-pine hover:underline"
                  >
                    {shopConfig.phoneDisplay}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink/45">WhatsApp</dt>
                <dd className="mt-1">
                  <a
                    href={waOrder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-pine hover:underline"
                  >
                    Chat on WhatsApp
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink/45">Regions</dt>
                <dd className="mt-1 text-ink/65">
                  Parbat · Myagdi · Mustang
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section>
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 sm:py-14">
          <div className="border border-pine/10 bg-pine px-6 py-10 text-center text-chalk sm:px-10">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Prefer to browse first?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-chalk/75">
              See organic staples in the shop, then call or WhatsApp to finish
              your order.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/shop"
                className="inline-flex min-h-12 items-center bg-brass px-7 text-sm font-extrabold uppercase tracking-wide text-pine transition hover:bg-chalk"
              >
                Go to shop
              </Link>
              <a
                href={callLink()}
                className="inline-flex min-h-12 items-center border-2 border-chalk/30 px-6 text-sm font-bold text-chalk transition hover:border-brass hover:text-brass"
              >
                Call {shopConfig.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
