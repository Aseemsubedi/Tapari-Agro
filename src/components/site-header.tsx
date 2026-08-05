"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CartToast } from "@/components/cart-toast";
import { useCart } from "@/components/cart-provider";
import { SiteSearch } from "@/components/site-search";
import { loadGuestProfile } from "@/lib/guest-profile";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="2.25"
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
      strokeWidth="2"
    >
      <path
        d="M8.5 4.5h2.2l1 3.2-1.6 1.1a12 12 0 0 0 5.1 5.1l1.1-1.6 3.2 1v2.2a2 2 0 0 1-2.1 2A14.5 14.5 0 0 1 4.5 6.6a2 2 0 0 1 2-2.1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeliveryPromise({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/contact"
      className={`group min-w-0 text-left transition hover:opacity-90 ${className}`}
      aria-label={`${shopConfig.deliveryHeadline} — ${shopConfig.deliveryArea}`}
    >
      <p className="truncate font-display text-[13px] font-extrabold leading-tight tracking-tight text-ink sm:text-base md:text-[17px]">
        {shopConfig.deliveryHeadline}
      </p>
      <p className="mt-0 flex min-w-0 items-center gap-0.5 text-[10px] font-medium leading-tight text-ink/55 sm:mt-0.5 sm:text-[13px]">
        <span className="truncate">{shopConfig.deliveryArea}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-ink/40 transition group-hover:text-pine sm:h-3.5 sm:w-3.5" />
      </p>
    </Link>
  );
}

export function SiteHeader() {
  const { cart, bump } = useCart();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const shopActive = pathname.startsWith("/shop");
  const aboutActive = pathname.startsWith("/about");
  const contactActive = pathname.startsWith("/contact");
  const myActive = pathname.startsWith("/my");
  const bagActive = pathname.startsWith("/cart");
  const hasItems = cart.totalItems > 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sync = () => {
      const p = loadGuestProfile();
      setHasSavedProfile(
        Boolean(p?.remember && (p.phone.trim() || p.customerName.trim())),
      );
    };
    sync();
    window.addEventListener("tapari-profile-saved", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("tapari-profile-saved", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setHeight = () => {
      document.documentElement.style.setProperty(
        "--store-header-h",
        `${el.offsetHeight}px`,
      );
    };
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 z-50 border-b border-pine/10 text-ink transition-shadow duration-300 ${
          scrolled
            ? "bg-chalk/95 shadow-[0_8px_30px_rgba(16,36,24,0.07)] backdrop-blur-md"
            : "bg-chalk/98 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:h-[4.75rem] sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
            <BrandLogo size="header" />
            <div className="hidden h-9 w-px bg-pine/10 sm:block" aria-hidden />
            <DeliveryPromise className="hidden max-w-[11.5rem] sm:block md:max-w-[14rem]" />
          </div>

          <div className="mx-auto hidden min-w-0 flex-1 md:block">
            <SiteSearch />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="md:hidden">
              <SiteSearch compact />
            </div>
            <a
              href={callLink()}
              className="inline-flex h-11 w-11 items-center justify-center text-pine transition hover:bg-mist sm:hidden"
              aria-label={`Call ${shopConfig.phoneDisplay}`}
            >
              <PhoneIcon className="h-5 w-5" />
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-11 items-center px-2 text-sm font-bold text-ink/70 transition hover:text-pine lg:inline-flex"
            >
              WhatsApp
            </a>
            <Link
              href="/cart"
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl transition sm:min-w-[7.5rem] sm:gap-2.5 sm:px-4 ${
                bagActive
                  ? "bg-brass text-pine"
                  : hasItems
                    ? "bg-leaf text-chalk hover:bg-pine"
                    : "bg-pine text-chalk hover:bg-leaf"
              } ${bump ? "animate-cart-bump" : ""}`}
              aria-label={
                hasItems ? `Cart, ${cart.totalItems} items` : "Cart"
              }
            >
              <BagIcon className="h-5 w-5" />
              <span className="hidden text-sm font-extrabold uppercase tracking-[0.08em] sm:inline">
                {hasItems ? `${cart.totalItems} items` : "Cart"}
              </span>
              <span
                suppressHydrationWarning
                className={`absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums leading-none ring-2 ring-chalk sm:hidden ${
                  hasItems ? "bg-brass text-pine" : "bg-mist text-ink/50"
                } ${bump ? "animate-cart-badge" : ""}`}
              >
                {cart.totalItems}
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-pine/8 px-3 py-1 sm:hidden">
          <DeliveryPromise className="min-w-0 flex-1" />
        </div>

        <nav className="-mx-px flex items-center gap-0 overflow-x-auto border-t border-pine/8 px-1.5 py-0.5 [scrollbar-width:none] sm:gap-1 sm:px-6 sm:py-2 lg:mx-auto lg:max-w-6xl lg:px-8 [&::-webkit-scrollbar]:hidden">
          {(
            [
              { href: "/shop", label: "Shop", short: "Shop", active: shopActive },
              {
                href: "/about",
                label: "Our Story",
                short: "Story",
                active: aboutActive,
              },
              {
                href: "/contact",
                label: "Contact",
                short: "Contact",
                active: contactActive,
              },
              ...(hasSavedProfile
                ? [
                    {
                      href: "/my",
                      label: "My Tapari",
                      short: "My",
                      active: myActive,
                    } as const,
                  ]
                : []),
            ] as const
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-10 shrink-0 items-center px-2.5 font-display text-[13px] font-extrabold tracking-tight transition sm:min-h-11 sm:px-3.5 sm:text-lg ${
                item.active ? "text-pine" : "text-ink/70 hover:text-pine"
              }`}
            >
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>
      </header>
      <CartToast />
    </>
  );
}
