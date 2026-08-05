import Image from "next/image";
import Link from "next/link";

const heroPromo = {
  href: "/shop",
  title: "Stock up on daily essentials",
  subtitle:
    "Get farm-fresh spices, grains, honey & oils — packed to order across Nepal.",
  image:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&h=800&q=80",
};

const miniPromos = [
  {
    href: "/shop?category=Spices",
    title: "Hill spices & timur",
    subtitle: "Cardamom, berries & kitchen heat",
    cta: "Order now",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&h=700&q=80",
    wash: "from-[#145c2a] via-[#145c2a]/88 to-transparent",
    text: "text-chalk",
    muted: "text-chalk/80",
    button: "bg-white text-pine",
  },
  {
    href: "/shop?category=Honey",
    title: "Mountain honey",
    subtitle: "Raw, unheated & packed to order",
    cta: "Order now",
    image:
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=900&h=700&q=80",
    wash: "from-[#d6c52f] via-[#d6c52f]/90 to-transparent",
    text: "text-pine",
    muted: "text-pine/75",
    button: "bg-pine text-chalk",
  },
  {
    href: "/shop?category=Grains",
    title: "Grains from the terraces",
    subtitle: "Red rice, buckwheat & more",
    cta: "Order now",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&h=700&q=80",
    wash: "from-[#e5f1e6] via-[#e5f1e6]/92 to-transparent",
    text: "text-ink",
    muted: "text-ink/55",
    button: "bg-pine text-chalk",
  },
] as const;

export function HomePromos() {
  return (
    <section
      aria-label="Featured offers"
      className="border-b border-pine/8 bg-[#f6f7f9]"
    >
      <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-8 sm:space-y-4 sm:px-8 sm:py-10">
        <Link
          href={heroPromo.href}
          className="group relative block min-h-[11.5rem] overflow-hidden rounded-2xl sm:min-h-[14rem] md:min-h-[15.5rem]"
        >
          <Image
            src={heroPromo.image}
            alt=""
            fill
            className="object-cover object-[70%_center] transition duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 1024px) 100vw, 1024px"
            quality={85}
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-pine via-pine/85 to-pine/15 sm:via-pine/75 sm:to-transparent"
            aria-hidden
          />
          <div className="relative z-10 flex h-full min-h-[11.5rem] max-w-md flex-col justify-center px-5 py-6 sm:min-h-[14rem] sm:px-8 sm:py-8 md:min-h-[15.5rem] md:max-w-lg">
            <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-chalk sm:text-3xl md:text-4xl">
              {heroPromo.title}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-chalk/80 sm:text-[15px]">
              {heroPromo.subtitle}
            </p>
          </div>
        </Link>

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {miniPromos.map((promo) => (
            <Link
              key={promo.href}
              href={promo.href}
              className="group relative block min-h-[10.5rem] overflow-hidden rounded-2xl sm:min-h-[12rem]"
            >
              <Image
                src={promo.image}
                alt=""
                fill
                className="object-cover object-[75%_center] transition duration-500 group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 100vw, 33vw"
                quality={80}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-r ${promo.wash}`}
                aria-hidden
              />
              <div
                className={`relative z-10 flex h-full min-h-[10.5rem] max-w-[65%] flex-col justify-center px-4 py-4 sm:min-h-[12rem] sm:px-5 ${promo.text}`}
              >
                <h3 className="font-display text-lg font-extrabold leading-snug tracking-tight sm:text-xl">
                  {promo.title}
                </h3>
                <p className={`mt-1.5 text-[12px] leading-snug sm:text-[13px] ${promo.muted}`}>
                  {promo.subtitle}
                </p>
                <span
                  className={`mt-4 inline-flex min-h-11 w-fit items-center rounded-lg px-4 py-2.5 text-[12px] font-extrabold tracking-wide ${promo.button}`}
                >
                  {promo.cta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
