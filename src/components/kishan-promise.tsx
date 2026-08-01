import Image from "next/image";
import Link from "next/link";

const staples = [
  {
    name: "Spices",
    src: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&q=75",
  },
  {
    name: "Honey",
    src: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&q=75",
  },
  {
    name: "Grains",
    src: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=75",
  },
  {
    name: "Oils",
    src: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=75",
  },
];

export function KishanPromise() {
  return (
    <section
      aria-labelledby="kishan-promise-heading"
      className="relative overflow-hidden border-y border-pine/10 bg-mist"
    >
      {/* Soft hills — light, not dark */}
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
          {/* Portrait */}
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

          {/* Message */}
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
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-ink/65 sm:text-lg lg:mx-0 mx-auto">
              शुद्ध अर्गानिक खाना, न्यायोचित मूल्य, र किसानको पैसा किसानकै घर।
            </p>
            <p className="mt-6 font-display text-xl font-bold tracking-tight text-leaf sm:text-2xl">
              टपरी एग्रो – स्वस्थ नेपाल, समृद्ध किसान।
            </p>
            <Link
              href="/about"
              className="mt-7 inline-flex min-h-10 items-center border border-pine/15 bg-white/80 px-5 text-[12px] font-semibold tracking-wide text-pine transition hover:border-brass hover:bg-brass/10"
            >
              Our story
            </Link>
          </div>
        </div>

        {/* Organic staples — slow dance row */}
        <ul className="mx-auto mt-12 flex max-w-md items-end justify-between gap-3 sm:mt-14 sm:max-w-lg">
          {staples.map((item, i) => (
            <li
              key={item.name}
              className={`flex flex-col items-center gap-2 ${
                i % 2 === 0 ? "animate-orb-a" : "animate-orb-b"
              }`}
              style={{ animationDelay: `${i * 0.35}s` }}
            >
              <span className="relative block h-14 w-14 overflow-hidden rounded-full bg-white shadow-[0_8px_24px_rgba(20,92,42,0.14)] ring-[3px] ring-white sm:h-16 sm:w-16">
                <Image
                  src={item.src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-pine/70 sm:text-[11px]">
                {item.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
