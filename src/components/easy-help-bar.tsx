"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/shop";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.74.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.91S17.5 2 12.04 2zm5.85 14.04c-.25.7-1.45 1.28-2.01 1.36-.52.07-1.18.1-1.9-.12-.44-.13-.99-.32-1.7-.63-2.99-1.29-4.94-4.3-5.09-4.5-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.6.84 2.06.91 2.21.07.15.12.32.02.52-.1.2-.15.32-.29.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.3.15.47.12.64-.07.18-.2.74-.86.94-1.16.2-.3.39-.25.66-.15.27.1 1.71.81 2 .95.3.15.49.22.56.34.08.13.08.74-.17 1.44z" />
    </svg>
  );
}

/** Floating WhatsApp chat button (bottom-right). */
export function EasyHelpBar() {
  const pathname = usePathname();
  const hideOnCheckout =
    pathname.startsWith("/cart") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/offline");

  if (hideOnCheckout) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] right-4 z-40 sm:bottom-8 sm:right-6">
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-pine text-brass shadow-[0_8px_24px_rgba(20,92,42,0.4)] ring-2 ring-brass/40 transition hover:scale-105 hover:bg-leaf active:scale-95"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </div>
  );
}
