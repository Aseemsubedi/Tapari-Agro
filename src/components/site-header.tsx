"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useCart } from "@/components/cart-provider";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

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

export function SiteHeader() {
  const { cart } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const shopActive = pathname.startsWith("/shop");
  const aboutActive = pathname.startsWith("/about");
  const contactActive = pathname.startsWith("/contact");
  const blogsActive = pathname.startsWith("/blogs");
  const bagActive = pathname.startsWith("/cart");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-pine/8 text-ink transition-shadow duration-300 ${
        scrolled
          ? "bg-chalk/95 shadow-[0_8px_30px_rgba(16,36,24,0.07)] backdrop-blur-md"
          : "bg-chalk/98 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-8">
        <div className="flex min-w-0 items-center gap-5 lg:gap-8">
          <BrandLogo size="header" />

          <nav className="hidden items-center gap-1 md:flex">
            {(
              [
                { href: "/shop", label: "Shop", active: shopActive },
                { href: "/blogs", label: "Blogs", active: blogsActive },
                { href: "/about", label: "About", active: aboutActive },
                { href: "/contact", label: "Contact", active: contactActive },
              ] as const
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium tracking-wide transition ${
                  item.active ? "text-pine" : "text-ink/60 hover:text-pine"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href={callLink()}
            className="inline-flex h-9 w-9 items-center justify-center text-pine transition hover:bg-mist sm:hidden"
            aria-label={`Call ${shopConfig.phoneDisplay}`}
          >
            <PhoneIcon className="h-5 w-5" />
          </a>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 items-center border border-pine/12 px-3 text-sm font-medium text-pine transition hover:border-brass hover:bg-brass/10 sm:inline-flex"
          >
            WhatsApp
          </a>
          <Link
            href="/cart"
            className={`relative inline-flex h-9 items-center gap-1.5 px-3 text-sm font-semibold transition ${
              bagActive
                ? "bg-brass text-pine"
                : "bg-pine text-chalk hover:bg-pine/90"
            }`}
            aria-label={
              cart.totalItems > 0 ? `Bag, ${cart.totalItems} items` : "Bag"
            }
          >
            <BagIcon className="h-4 w-4" />
            <span className="tabular-nums">{cart.totalItems}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
