import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

/** Compact call help — after hero */
export function EasyOrderHelp() {
  return (
    <section className="border-b border-brass/25 bg-brass/12">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-5">
        <p className="min-w-0 flex-1 text-center font-display text-lg font-bold leading-snug tracking-tight text-pine sm:text-left sm:text-xl md:text-2xl">
          अर्डर गर्न अप्ठ्यारो छ? हामीलाई फोन गर्नुहोस् — हामी सामान पठाइदिन्छौं।
        </p>
        <div className="flex gap-2">
          <a
            href={callLink()}
            className="inline-flex min-h-10 flex-1 items-center justify-center bg-pine px-4 text-[12px] font-bold tracking-wide text-chalk transition hover:bg-pine/90 sm:flex-none sm:text-[13px]"
          >
            फोन गर्नुहोस् {shopConfig.phoneDisplay}
          </a>
          <a
            href={whatsappLink(
              "Hello Tapari Agro — I need help placing an order.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 flex-1 items-center justify-center border border-pine/20 px-4 text-[12px] font-semibold tracking-wide text-pine transition hover:border-brass hover:bg-brass/10 sm:flex-none"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
