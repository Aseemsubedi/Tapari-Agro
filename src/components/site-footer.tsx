"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M8.5 4.5h2.2l1 3.2-1.6 1.1a12 12 0 0 0 5.1 5.1l1.1-1.6 3.2 1v2.2a2 2 0 0 1-2.1 2A14.5 14.5 0 0 1 4.5 6.6a2 2 0 0 1 2-2.1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const onCheckout =
    pathname.startsWith("/cart") || pathname.startsWith("/order");

  return (
    <footer className="relative mt-auto bg-pine text-chalk">
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full overflow-hidden text-chalk/[0.04] sm:h-36"
        viewBox="0 0 1200 140"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M0 140V80L160 35l140 50 180-55 160 45 200-40 180 35 180-30V140H0Z"
        />
      </svg>

      <div className="relative mx-auto w-full max-w-5xl px-4 pt-14 sm:px-8 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-5">
            <BrandLogo size="footer" />
            <p className="mt-4 text-sm leading-relaxed text-chalk/75">
              टपरी एग्रो – स्वस्थ नेपाल, समृद्ध किसान।
            </p>
            <p className="mt-2 text-sm leading-relaxed text-chalk/65">
              Fresh organic staples from Parbat (Jaljala), Myagdi &amp; Mustang —
              direct kishan to home.
            </p>
            <p className="mt-4 text-xs tracking-wide text-brass/85">
              {shopConfig.deliveryNote}
            </p>
          </div>

          <div className="min-w-0 lg:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
              Explore
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-chalk/75">
              <li>
                <Link href="/shop" className="transition hover:text-brass">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition hover:text-brass">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-brass">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/cart" className="transition hover:text-brass">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0 lg:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
              Categories
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-chalk/75">
              {(
                [
                  ["Spices", "/shop?category=Spices"],
                  ["Honey", "/shop?category=Honey"],
                  ["Grains", "/shop?category=Grains"],
                  ["Oils", "/shop?category=Oils"],
                ] as const
              ).map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition hover:text-brass">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 lg:col-span-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
              Order help
            </p>
            <p className="mt-4 text-sm leading-relaxed text-chalk/70">
              अर्डर गर्न अप्ठ्यारो छ? हामीलाई फोन गर्नुहोस्।
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href={callLink()}
                className="inline-flex min-h-10 items-center justify-center gap-2 bg-brass px-4 text-[12px] font-bold tracking-wide text-pine transition hover:bg-chalk sm:justify-start"
              >
                <PhoneIcon className="h-4 w-4" />
                फोन {shopConfig.phoneDisplay}
              </a>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center border border-chalk/25 px-4 text-[12px] font-semibold tracking-wide text-chalk transition hover:border-brass hover:text-brass sm:justify-start"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-chalk/10 pt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <Image
              src="/images/geep-logo.png"
              alt="GEEP — वृद्धिमुखी उद्यमशीलता र रोजगारी प्रवर्द्धन कार्यक्रम"
              width={72}
              height={72}
              className="h-14 w-14 rounded-full object-cover ring-1 ring-chalk/15 sm:h-16 sm:w-16"
              unoptimized
            />
            <Image
              src="/images/dftqc-logo.png"
              alt="Department of Food Technology and Quality Control (DFTQC)"
              width={72}
              height={72}
              className="h-14 w-14 rounded-full object-cover ring-1 ring-chalk/15 sm:h-16 sm:w-16"
              unoptimized
            />
          </div>
          <p className="text-center text-sm font-semibold tracking-wide text-brass sm:text-right">
            DFTQC certified food
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-chalk/10 py-6 text-xs text-chalk/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Tapari Agro. All rights reserved.</p>
          <p className="tracking-wide">Parbat · Myagdi · Mustang</p>
        </div>
      </div>

      {/* Blinkit-style closing tagline */}
      <div
        className={`relative border-t border-black/[0.04] bg-[#f3f4f6] ${
          onCheckout ? "pb-8" : "pb-20 sm:pb-12"
        }`}
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-12">
          <p className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-[#c5cad1] sm:text-[2.75rem] md:text-[3.25rem]">
            Nepal Local
            <br />
            Store{" "}
            <span className="inline-block text-[#f07167]" aria-hidden>
              ♥
            </span>
          </p>
          <div className="mt-8 flex flex-col gap-2 border-t border-black/[0.06] pt-6 text-sm text-ink/45 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Website Developed By —{" "}
              <span className="font-medium text-ink/60">Aseem Subedi</span>
            </p>
            <a
              href="tel:9806195800"
              className="inline-flex items-center gap-2 transition hover:text-pine"
            >
              <PhoneIcon className="h-4 w-4 shrink-0" />
              <span>9806195800</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
