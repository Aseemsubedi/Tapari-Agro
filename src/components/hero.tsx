import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative isolate h-[min(38vh,20rem)] overflow-hidden bg-pine text-chalk sm:h-[min(42vh,24rem)]">
      <Image
        src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=80"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-pine/90 via-pine/65 to-pine/30" />

      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-end px-4 pb-7 sm:px-8 sm:pb-9">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Tapari Agro
        </h1>
        <p className="mt-2 max-w-sm text-sm text-chalk/80">
          Fresh organic staples — direct from kishan to home.
        </p>
        <Link
          href="#shop"
          className="mt-5 inline-flex min-h-11 w-fit items-center bg-brass px-5 text-sm font-semibold text-pine transition hover:bg-chalk"
        >
          Shop products
        </Link>
      </div>
    </section>
  );
}
