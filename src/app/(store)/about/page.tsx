import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { OriginStory } from "@/components/origin-story";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Tapari Agro brings fresh, hygienic, best-quality organic staples from Parbat, Myagdi and Mustang — direct from kishan to home.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-28 pt-16 sm:px-8 sm:pt-20">
      <BrandLogo size="footer" href={null} />
      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.22em] text-leaf">
        About us
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        From the hills to your kitchen
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/65 sm:text-lg">
        Tapari Agro is a boutique organic shop. We bring farm produce closer to
        your table — direct from kishan (farmers) to your home.
      </p>

      <div className="craft-rule my-10 max-w-xs" />

      <OriginStory />

      <section className="mt-16 border border-pine/10 bg-mist/40 px-6 py-10 sm:px-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          How we work
        </h2>
        <ul className="mt-6 space-y-4 text-sm leading-relaxed text-ink/65">
          <li>
            <span className="font-medium text-ink">Direct from kishan</span> —
            no long middle chain; hill harvests reach your kitchen.
          </li>
          <li>
            <span className="font-medium text-ink">Packed with care</span> —
            fresh, hygienic handling and packed to order.
          </li>
          <li>
            <span className="font-medium text-ink">Simple ordering</span> — shop
            online, or call us if the website feels difficult. We will send your
            goods.
          </li>
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="inline-flex min-h-11 items-center bg-pine px-6 text-sm font-semibold tracking-wide text-chalk transition hover:bg-pine/90"
        >
          Shop products
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-11 items-center border border-pine/15 px-6 text-sm font-medium tracking-wide text-pine transition hover:border-brass"
        >
          Contact us
        </Link>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center border border-pine/15 px-6 text-sm font-medium tracking-wide text-pine transition hover:border-brass"
        >
          WhatsApp
        </a>
        <a
          href={callLink()}
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-ink/55 hover:text-pine"
        >
          {shopConfig.phoneDisplay}
        </a>
      </div>
    </div>
  );
}
