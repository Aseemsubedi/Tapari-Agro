import Link from "next/link";
import { BrandMark } from "@/components/brand-logo";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNav({ pathname }: { pathname: string }) {
  return (
    <header className="border-b border-pine/10 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-5">
          <Link href="/admin" className="inline-flex items-center gap-2">
            <BrandMark className="h-9 w-9" />
            <span className="font-display text-sm font-semibold text-pine">
              Admin
            </span>
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(link.href))
                    ? "font-semibold text-pine"
                    : "text-ink/60 hover:text-ink"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-ink/55 hover:text-ink">
            View store
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-ink/55 hover:text-ink">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

