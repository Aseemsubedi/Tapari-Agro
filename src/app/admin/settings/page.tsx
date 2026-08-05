import Link from "next/link";
import {
  AdminBtn,
  AdminCard,
  AdminCardHeader,
} from "@/components/admin-ui";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

export default function AdminSettingsPage() {
  const rows = [
    { label: "Shop name", value: shopConfig.name },
    { label: "Tagline", value: shopConfig.tagline },
    { label: "Phone", value: shopConfig.phoneDisplay },
    { label: "WhatsApp", value: shopConfig.whatsapp },
    { label: "Delivery note", value: shopConfig.deliveryNote },
    { label: "Story video", value: shopConfig.storyVideo },
  ];

  const pages = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Our Story", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Cart", href: "/cart" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-ink/55">
        Phone and WhatsApp on the storefront come from{" "}
        <code className="rounded bg-white px-1 text-pine">.env</code>. Restart
        after changes.
      </p>

      <AdminCard flush>
        <AdminCardHeader title="Store details" />
        <dl className="divide-y divide-black/[0.06]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 px-4 py-3.5 sm:grid-cols-[140px_1fr] sm:px-5"
            >
              <dt className="text-xs font-medium text-ink/45">{row.label}</dt>
              <dd className="break-all text-sm text-ink">{row.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </AdminCard>

      <AdminCard>
        <h2 className="text-sm font-semibold text-ink">Reach your customers</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={callLink()}
            className="rounded-lg bg-pine px-3.5 py-2 text-sm font-semibold text-white"
          >
            Call shop line
          </a>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold"
          >
            Shop WhatsApp
          </a>
        </div>
      </AdminCard>

      <AdminCard flush>
        <AdminCardHeader title="Storefront pages" />
        <ul className="divide-y divide-black/[0.06]">
          {pages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                target="_blank"
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[#f7f8f9] sm:px-5"
              >
                <span className="font-medium text-ink">{page.label}</span>
                <span className="text-xs text-pine">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard>
        <h2 className="text-sm font-semibold text-ink">Who does what</h2>
        <p className="mt-1 text-sm text-ink/50">
          When a second person helps, keep jobs simple (no separate logins yet):
        </p>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <li>
            <span className="font-semibold">Counter</span> — Sell: Orders +
            Offline sale
          </li>
          <li>
            <span className="font-semibold">Owner</span> — Money, Stock, and Shop
            (products / homepage)
          </li>
        </ul>
      </AdminCard>

      <AdminCard>
        <h2 className="text-sm font-semibold text-ink">Environment keys</h2>
        <ul className="mt-3 space-y-1 font-mono text-xs text-ink/55">
          <li>NEXT_PUBLIC_PHONE</li>
          <li>NEXT_PUBLIC_WHATSAPP</li>
          <li>NEXT_PUBLIC_STORY_VIDEO</li>
          <li>ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_SESSION_SECRET</li>
        </ul>
      </AdminCard>

      <div className="flex flex-wrap gap-2">
        <AdminBtn href="/admin/products">Products</AdminBtn>
        <AdminBtn href="/admin/orders" variant="secondary">
          Orders
        </AdminBtn>
      </div>
    </div>
  );
}
