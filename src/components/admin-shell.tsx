"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AdminSidebar, AdminTopBar } from "@/components/admin-sidebar";

export function AdminShell({
  children,
  pendingOrders = 0,
  lowStock = 0,
  openDues = 0,
}: {
  children: React.ReactNode;
  pendingOrders?: number;
  lowStock?: number;
  openDues?: number;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLogin) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-[#e8ebe4]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(20,92,42,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(214,197,47,0.2), transparent)",
          }}
          aria-hidden
        />
        <div className="relative flex min-h-dvh items-center justify-center px-5 py-12">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#eef0eb]">
      <AdminSidebar
        pendingOrders={pendingOrders}
        lowStock={lowStock}
        openDues={openDues}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="lg:pl-[260px]">
        <AdminTopBar
          onMenu={() => setMenuOpen(true)}
          pendingOrders={pendingOrders}
        />
        <main className="mx-auto w-full max-w-5xl px-3 py-4 pb-24 sm:px-6 sm:py-7 sm:pb-28 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
