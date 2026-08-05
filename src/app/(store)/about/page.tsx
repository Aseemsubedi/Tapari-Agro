import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  siteSeo,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Our Story",
  description:
    "How Tapari Agro brings organic staples from Parbat, Myagdi and Mustang kishan to Kathmandu kitchens — honest harvest, packed to order.",
  path: "/about",
  keywords: [
    "Tapari Agro story",
    "Parbat Myagdi Mustang farmers",
    "organic Nepal brand",
    "kishan direct grocery",
  ],
});

function Chapter({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-7 sm:px-8 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brass">
        Chapter {n}
      </p>
      <h2 className="mt-1.5 font-display text-xl font-extrabold tracking-tight text-pine sm:mt-3 sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3.5 text-[15px] leading-[1.65] text-ink/70 sm:mt-6 sm:space-y-5 sm:text-lg sm:leading-[1.75]">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Our Story — Tapari Agro",
    url: absoluteUrl("/about"),
    description:
      "How Tapari Agro connects hill farmers in Parbat, Myagdi and Mustang with Kathmandu kitchens.",
    mainEntity: {
      "@type": "Organization",
      name: siteSeo.legalName,
      url: absoluteUrl("/"),
    },
  };

  return (
    <article className="bg-chalk">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Our Story", path: "/about" },
          ]),
          aboutLd,
        ]}
      />
      {/* Opening spread */}
      <header className="relative isolate overflow-hidden bg-pine text-chalk">
        <Image
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1600&q=80"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-40"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-pine/80 via-pine/75 to-pine"
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[40vh] max-w-3xl flex-col justify-end px-4 pb-8 pt-6 sm:min-h-[75vh] sm:px-8 sm:pb-20 sm:pt-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brass">
            Our Story · टपरी एग्रो
          </p>
          <h1 className="mt-2 font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-tight sm:mt-5 sm:text-5xl md:text-6xl">
            A kitchen that still knows the hills
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-chalk/80 sm:mt-6 sm:text-lg">
            This is how Tapari Agro began — not as a middle shop, but as a
            promise between farmer and family table.
          </p>
        </div>
      </header>

      {/* Chapter 1 */}
      <Chapter n="01" title="It starts with a farmer’s hand">
        <p>
          Before a jar of honey or a sack of red rice reaches Kathmandu Valley,
          it is harvested on terraced slopes — in Parbat’s Jaljala, in Myagdi’s
          highlands, in Mustang’s dry wind.
        </p>
        <p>
          For too long, those harvests passed through too many hands. Price rose.
          Trust fell. The farmer’s share shrank before the food even left the
          hill.
        </p>
        <p className="font-semibold text-pine">
          Tapari Agro was built to shorten that road.
        </p>
      </Chapter>

      {/* Portrait interlude */}
      <aside className="border-y border-pine/10 bg-mist">
        <div className="mx-auto grid max-w-4xl items-center gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[auto_1fr] lg:gap-14">
          <div className="mx-auto">
            <div className="relative rounded-full bg-gradient-to-b from-brass/60 to-leaf/40 p-[3px]">
              <div className="rounded-full bg-white p-1.5">
                <div className="relative h-44 w-44 overflow-hidden rounded-full sm:h-52 sm:w-52">
                  <Image
                    src="/images/kishan-promise.jpg"
                    alt="From the Management — Tapari Agro"
                    fill
                    className="object-contain object-center p-1"
                    sizes="208px"
                    unoptimized
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-ink/45">
              From the management
            </p>
          </div>
          <blockquote className="text-center lg:text-left">
            <p className="font-display text-2xl font-extrabold leading-snug tracking-tight text-pine sm:text-3xl">
              किसानसँग सीधा सम्बन्ध – बिचौलिया छैन, मिलावट छैन।
            </p>
            <p className="mt-5 text-base leading-relaxed text-ink/65 sm:text-lg">
              शुद्ध अर्गानिक खाना, न्यायोचित मूल्य, र किसानको पैसा किसानकै घर।
            </p>
            <p className="mt-6 font-display text-xl font-bold text-leaf sm:text-2xl">
              टपरी एग्रो – स्वस्थ नेपाल, समृद्ध किसान।
            </p>
          </blockquote>
        </div>
      </aside>

      {/* Chapter 2 */}
      <Chapter n="02" title="Three hills, one pantry">
        <p>
          We do not chase every product in the market. We walk the same trails
          again and again — places we know by name, families we can call.
        </p>
        <ul className="!mt-8 space-y-6 border-l-2 border-brass/50 pl-5">
          <li>
            <p className="font-display text-xl font-extrabold text-pine">
              Parbat · Jaljala
            </p>
            <p className="mt-1 text-base text-ink/60">
              Where cardamom smoke and terrace grain still set the morning
              rhythm.
            </p>
          </li>
          <li>
            <p className="font-display text-xl font-extrabold text-pine">
              Myagdi · Highlands
            </p>
            <p className="mt-1 text-base text-ink/60">
              Clean fields above the valley heat — staples with a highland bite.
            </p>
          </li>
          <li>
            <p className="font-display text-xl font-extrabold text-pine">
              Mustang · Upper hills
            </p>
            <p className="mt-1 text-base text-ink/60">
              Dry wind, rare flavour — produce that carries the upper hills in
              every spoon.
            </p>
          </li>
        </ul>
      </Chapter>

      {/* Visual beat */}
      <div className="relative mx-auto max-w-5xl px-4 sm:px-8">
        <div className="relative aspect-[21/9] overflow-hidden bg-mist sm:aspect-[2.4/1]">
          <Image
            src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1400&q=80"
            alt="Hill farmland"
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-pine/50 to-transparent"
            aria-hidden
          />
          <p className="absolute bottom-5 left-5 max-w-sm font-display text-lg font-bold text-chalk sm:bottom-8 sm:left-8 sm:text-xl">
            Fresh. Hygienic. Best quality — chosen, not collected.
          </p>
        </div>
      </div>

      {/* Chapter 3 */}
      <Chapter n="03" title="The road to your bag">
        <p>
          When you order, we do not pull a dusty carton from a warehouse shelf.
          We confirm by phone. Then we pack — to order — with the care we would
          give our own kitchen.
        </p>
        <p>
          Valley delivery follows. Cash on delivery is fine. If the website feels
          difficult, call us. We will still send your goods. That is part of the
          story too:{" "}
          <span className="font-semibold text-pine">
            food should be easy to reach.
          </span>
        </p>
        <ol className="!mt-8 grid gap-4 sm:grid-cols-3 sm:!space-y-0">
          {[
            { n: "1", t: "You choose", d: "Shop, call, or WhatsApp your list." },
            { n: "2", t: "We confirm", d: "A real voice checks before packing." },
            { n: "3", t: "Hills arrive", d: "Sealed, fresh, ready for home." },
          ].map((step) => (
            <li key={step.n} className="border border-pine/10 bg-mist/50 px-4 py-5">
              <span className="font-display text-2xl font-extrabold text-brass">
                {step.n}
              </span>
              <p className="mt-2 font-display text-base font-bold text-ink">
                {step.t}
              </p>
              <p className="mt-1 text-sm text-ink/55">{step.d}</p>
            </li>
          ))}
        </ol>
      </Chapter>

      {/* Chapter 4 — trust as story close before CTA */}
      <Chapter n="04" title="Why trust matters on this road">
        <p>
          Between farmer and family, quality is not a slogan — it is the whole
          point. We keep GEEP and DFTQC marks on our shelf because clean food
          should be able to show its papers.
        </p>
        <div className="!mt-8 flex items-center gap-5">
          <Image
            src="/images/geep-logo.png"
            alt="GEEP"
            width={64}
            height={64}
            className="h-14 w-14 rounded-full object-cover ring-1 ring-pine/15"
            unoptimized
          />
          <Image
            src="/images/dftqc-logo.png"
            alt="DFTQC"
            width={64}
            height={64}
            className="h-14 w-14 rounded-full object-cover ring-1 ring-pine/15"
            unoptimized
          />
          <p className="text-sm font-semibold leading-snug text-ink/55">
            DFTQC certified food · quality you can verify
          </p>
        </div>
      </Chapter>

      {/* Closing */}
      <footer className="border-t border-pine/10 bg-pine text-chalk">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brass">
            The next page
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Taste the hills yourself
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-chalk/75">
            Open the shop — or call us. The story only finishes when the food is
            on your table.
          </p>
          <p className="mt-4 text-sm font-medium text-brass/90">
            अर्डर गर्न अप्ठ्यारो छ भने हामीलाई फोन गर्नुहोस्।
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/shop"
              className="inline-flex min-h-12 items-center bg-brass px-8 text-sm font-extrabold uppercase tracking-wide text-pine transition hover:bg-chalk"
            >
              Enter the shop
            </Link>
            <a
              href={callLink()}
              className="inline-flex min-h-12 items-center border-2 border-chalk/25 px-6 text-sm font-bold text-chalk transition hover:border-brass hover:text-brass"
            >
              फोन {shopConfig.phoneDisplay}
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center px-3 text-sm font-semibold text-chalk/70 underline-offset-4 hover:text-brass hover:underline"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </article>
  );
}
