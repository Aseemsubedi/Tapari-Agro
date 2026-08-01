import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    name: "Spices",
    href: "/shop?category=Spices",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80",
  },
  {
    name: "Honey",
    href: "/shop?category=Honey",
    image:
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80",
  },
  {
    name: "Grains",
    href: "/shop?category=Grains",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  },
  {
    name: "Oils",
    href: "/shop?category=Oils",
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
  },
  {
    name: "Tea",
    href: "/shop?category=Tea",
    image:
      "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&q=80",
  },
  {
    name: "Pulses",
    href: "/shop?category=Pulses",
    image:
      "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=600&q=80",
  },
];

export function CategoryCircles() {
  return (
    <section
      aria-label="Shop by category"
      className="border-b border-pine/8 bg-mist"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 sm:py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <h2 className="mb-6 font-display text-xl font-semibold tracking-tight text-pine sm:mb-7 sm:text-2xl">
            Shop by category
          </h2>

          <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:gap-x-8 sm:gap-y-8 md:max-w-xl">
            {categories.map((cat, i) => (
              <li key={cat.name} className="flex justify-center sm:justify-start">
                <Link
                  href={cat.href}
                  className="group flex flex-col items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine sm:items-start"
                >
                  <span className="relative block h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full bg-mist ring-[3px] ring-white sm:h-28 sm:w-28">
                    <Image
                      src={cat.image}
                      alt=""
                      fill
                      priority={i < 3}
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 88px, 112px"
                    />
                  </span>
                  <span className="w-[5.5rem] text-center text-[12px] font-semibold tracking-wide text-pine sm:w-28 sm:text-[13px]">
                    {cat.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-leaf/15 pt-6 text-center lg:w-52 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 lg:text-left">
          <p className="font-display text-[clamp(2.1rem,6vw,3.25rem)] font-bold uppercase leading-[0.92] tracking-[-0.03em] text-leaf/35">
            Farmer
            <br />
            Market
          </p>
          <p className="mt-2.5 font-display text-[clamp(0.95rem,2.8vw,1.25rem)] font-semibold uppercase tracking-[0.04em] text-leaf/30">
            Organic Products
          </p>
        </div>
      </div>
    </section>
  );
}
