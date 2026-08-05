import Image from "next/image";
import Link from "next/link";

export function KishanPromise() {
  return (
    <section
      aria-labelledby="kishan-promise-heading"
      className="relative overflow-hidden border-y border-pine/10 bg-mist"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.2]" aria-hidden>
        <Image
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=75"
          alt=""
          fill
          className="object-cover object-[center_35%] animate-village-slow"
          sizes="100vw"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-mist/95 via-mist/88 to-sage/40"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-14">
          <div className="mx-auto lg:mx-0">
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full bg-leaf/15 blur-xl"
                aria-hidden
              />
              <div className="relative rounded-full bg-gradient-to-b from-brass/50 to-leaf/40 p-[3px] shadow-[0_18px_50px_rgba(20,92,42,0.22)]">
                <div className="rounded-full bg-white p-1.5">
                  <div className="relative h-40 w-40 overflow-hidden rounded-full bg-white sm:h-48 sm:w-48">
                    <Image
                      src="/images/kishan-promise.jpg"
                      alt="From the Management — टपरी एग्रो"
                      fill
                      className="object-contain object-center p-1"
                      sizes="(max-width: 640px) 160px, 192px"
                      priority
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-leaf">
              From the management
            </p>
            <h2
              id="kishan-promise-heading"
              className="mt-3 font-display text-2xl font-bold leading-snug tracking-tight text-pine sm:text-3xl md:text-[2rem]"
            >
              किसानसँग सीधा सम्बन्ध – बिचौलिया छैन, मिलावट छैन।
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-ink/65 sm:text-lg lg:mx-0">
              शुद्ध अर्गानिक खाना, न्यायोचित मूल्य, र किसानको पैसा किसानकै घर।
            </p>
            <p className="mt-6 font-display text-xl font-bold tracking-tight text-leaf sm:text-2xl">
              टपरी एग्रो – स्वस्थ नेपाल, समृद्ध किसान।
            </p>
            <Link
              href="/about"
              className="mt-7 inline-flex min-h-10 items-center border border-pine/15 bg-white/80 px-5 text-[12px] font-semibold tracking-wide text-pine transition hover:border-brass hover:bg-brass/10"
            >
              Our Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
