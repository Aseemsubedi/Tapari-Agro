import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { BrandLogo } from "@/components/brand-logo";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandLogo size="footer" href="/" />
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-pine/70">
          Store admin
        </p>
      </div>
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_40px_rgba(16,36,24,0.08)] sm:p-7">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Sign in to Tapari Agro
        </h1>
        <p className="mt-1.5 text-sm text-ink/55">
          Manage orders, products, and inventory for your shop.
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
