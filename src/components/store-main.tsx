"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function StoreMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onCheckout =
    pathname.startsWith("/cart") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/offline");

  return (
    <main
      className={`flex-1 min-w-0 ${
        onCheckout
          ? ""
          : "pb-16 sm:pb-8"
      }`}
    >
      {children}
    </main>
  );
}
