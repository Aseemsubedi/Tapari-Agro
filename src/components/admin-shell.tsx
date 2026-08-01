"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <div className="min-h-full bg-[#f3f6f4] px-5">{children}</div>;
  }

  return (
    <div className="min-h-full bg-[#f3f6f4]">
      <AdminNav pathname={pathname} />
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">{children}</div>
    </div>
  );
}
