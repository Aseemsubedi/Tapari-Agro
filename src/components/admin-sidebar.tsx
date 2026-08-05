"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logoutAction } from "@/lib/server-actions/auth";
import { BrandMark } from "@/components/brand-logo";

type NavIconName =
  | "home"
  | "orders"
  | "products"
  | "customers"
  | "inventory"
  | "categories"
  | "units"
  | "purchase"
  | "sections"
  | "sale"
  | "profit"
  | "payments"
  | "settings"
  | "store";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  match: "exact" | "prefix";
  badge?: number;
};

function NavIcon({
  name,
  className = "h-[18px] w-[18px]",
}: {
  name: NavIconName;
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M7 4h10l1 4H6l1-4Z" />
          <path d="M6 8h12v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8Z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "sale":
      return (
        <svg {...common}>
          <path d="M4 7h16v12H4V7Z" />
          <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
          <path d="M9 12h6M12 12v5" />
        </svg>
      );
    case "profit":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15v-3M12 15V8M16 15v-6" />
        </svg>
      );
    case "payments":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </svg>
      );
    case "products":
      return (
        <svg {...common}>
          <path d="M12 3 4.5 7.5v9L12 21l7.5-4.5v-9L12 3Z" />
          <path d="M12 12 4.5 7.5M12 12l7.5-4.5M12 12v9" />
        </svg>
      );
    case "customers":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15.5 19c.4-1.8 1.8-3 3.5-3 .6 0 1.1.1 1.6.3" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...common}>
          <path d="M4 7h16v12H4V7Z" />
          <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
          <path d="M4 12h16" />
        </svg>
      );
    case "categories":
      return (
        <svg {...common}>
          <path d="M4 6h7v7H4V6Z" />
          <path d="M13 6h7v4h-7V6Z" />
          <path d="M13 12h7v6h-7v-6Z" />
          <path d="M4 15h7v3H4v-3Z" />
        </svg>
      );
    case "units":
      return (
        <svg {...common}>
          <path d="M7 4h10v4H7V4Z" />
          <path d="M9 8v12M15 8v12M6 20h12" />
        </svg>
      );
    case "purchase":
      return (
        <svg {...common}>
          <path d="M6 7h12l-1 11H7L6 7Z" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M9 11h6" />
        </svg>
      );
    case "sections":
      return (
        <svg {...common}>
          <path d="M4 5h16v4H4V5Z" />
          <path d="M4 11h16v4H4v-4Z" />
          <path d="M4 17h10v2H4v-2Z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.5M17.5 16l1.6 1.5M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.5M17.5 8l1.6-1.5" />
        </svg>
      );
    case "store":
      return (
        <svg {...common}>
          <path d="M14 5h5v5M10 14 19 5M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
        </svg>
      );
  }
}

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  nested = false,
}: {
  item: NavItem;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-lg text-[13px] transition ${
        nested ? "py-1.5 pl-9 pr-2.5" : "px-2.5 py-2"
      } ${
        active
          ? "bg-pine/10 font-semibold text-pine"
          : "font-medium text-ink/65 hover:bg-black/[0.04] hover:text-ink"
      }`}
    >
      <NavIcon name={item.icon} />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="min-w-5 rounded-full bg-brass px-1.5 py-0.5 text-center text-[10px] font-bold text-pine">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarNav({
  pendingOrders,
  lowStock,
  openDues,
  onClose,
}: {
  pendingOrders: number;
  lowStock: number;
  openDues: number;
  onClose?: () => void;
}) {
  const today: NavItem[] = [
    { href: "/admin", label: "Home", icon: "home", match: "exact" },
  ];

  const sell: NavItem[] = [
    {
      href: "/admin/orders",
      label: "Orders",
      icon: "orders",
      match: "prefix",
      badge: pendingOrders > 0 ? pendingOrders : undefined,
    },
    {
      href: "/admin/sales",
      label: "Offline sale",
      icon: "sale",
      match: "prefix",
    },
  ];

  const money: NavItem[] = [
    {
      href: "/admin/payments",
      label: "Money",
      icon: "payments",
      match: "prefix",
      badge: openDues > 0 ? openDues : undefined,
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: "customers",
      match: "prefix",
    },
    {
      href: "/admin/profits",
      label: "Analysis",
      icon: "profit",
      match: "prefix",
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: "profit",
      match: "prefix",
    },
  ];

  const stock: NavItem[] = [
    {
      href: "/admin/inventory",
      label: "Inventory",
      icon: "inventory",
      match: "prefix",
      badge: lowStock > 0 ? lowStock : undefined,
    },
    {
      href: "/admin/purchases",
      label: "Purchases",
      icon: "purchase",
      match: "prefix",
    },
    {
      href: "/admin/suppliers",
      label: "Suppliers",
      icon: "customers",
      match: "prefix",
    },
  ];

  const shop: NavItem[] = [
    {
      href: "/admin/products",
      label: "Products",
      icon: "products",
      match: "prefix",
    },
    {
      href: "/admin/home-sections",
      label: "Home sections",
      icon: "sections",
      match: "prefix",
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: "settings",
      match: "prefix",
    },
  ];

  const sections: { label: string; items: NavItem[] }[] = [
    { label: "Today", items: today },
    { label: "Sell", items: sell },
    { label: "Money", items: money },
    { label: "Stock", items: stock },
    { label: "Shop", items: shop },
  ];

  return (
    <div className="flex h-full flex-col bg-[#f6f7f4]">
      <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-4">
        <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1">
          <BrandMark className="h-9 w-9 !rounded-xl !ring-1 !ring-pine/15" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold tracking-tight text-pine">
              Tapari Agro
            </p>
            <p className="truncate text-[11px] text-ink/45">Admin</p>
          </div>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink/50 transition hover:bg-black/[0.05] hover:text-ink lg:hidden"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/35">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-black/[0.06] p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink/60 transition hover:bg-black/[0.04] hover:text-ink"
        >
          <NavIcon name="store" />
          View online store
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink/45 transition hover:bg-black/[0.04] hover:text-ink"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminSidebar({
  pendingOrders = 0,
  lowStock = 0,
  openDues = 0,
  open,
  onClose,
}: {
  pendingOrders?: number;
  lowStock?: number;
  openDues?: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-black/[0.06] lg:block">
        <SidebarNav
          pendingOrders={pendingOrders}
          lowStock={lowStock}
          openDues={openDues}
        />
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={`absolute inset-0 bg-ink/40 transition ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal={open}
          aria-label="Admin menu"
          className={`absolute inset-y-0 left-0 w-[min(300px,88vw)] border-r border-black/[0.06] shadow-2xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarNav
            pendingOrders={pendingOrders}
            lowStock={lowStock}
            openDues={openDues}
            onClose={onClose}
          />
        </aside>
      </div>
    </>
  );
}

export function pageTitle(pathname: string) {
  if (pathname.startsWith("/admin/orders")) return "Orders";
  if (pathname.startsWith("/admin/sales")) return "Offline sale";
  if (pathname.startsWith("/admin/payments")) return "Money";
  if (pathname.startsWith("/admin/profits")) return "Analysis";
  if (pathname.startsWith("/admin/reports")) return "Reports";
  if (pathname.startsWith("/admin/products/new")) return "Add product";
  if (pathname.startsWith("/admin/products/")) return "Edit product";
  if (pathname.startsWith("/admin/products")) return "Products";
  if (pathname.startsWith("/admin/home-sections")) return "Home sections";
  if (pathname.startsWith("/admin/purchases")) return "Purchases";
  if (pathname.startsWith("/admin/suppliers/")) return "Supplier";
  if (pathname.startsWith("/admin/suppliers")) return "Suppliers";
  if (pathname.startsWith("/admin/inventory")) return "Inventory";
  if (pathname.startsWith("/admin/customers/")) return "Customer";
  if (pathname.startsWith("/admin/customers")) return "Customers";
  if (pathname.startsWith("/admin/settings")) return "Settings";
  return "Today";
}

export function pageSubtitle(pathname: string) {
  if (pathname.startsWith("/admin/orders"))
    return "Confirm, pack, and ship — collect on the bill if needed";
  if (pathname.startsWith("/admin/sales"))
    return "Counter sales — Cash, Bank QR, or Credit";
  if (pathname.startsWith("/admin/payments"))
    return "Collect dues · pay purchase bills · settle sellers";
  if (pathname.startsWith("/admin/profits"))
    return "Sales, cost, and profit by bill or product";
  if (pathname.startsWith("/admin/reports"))
    return "Date, cost, supplier, stock, write-offs, cashbook";
  if (pathname.startsWith("/admin/products/new"))
    return "Add a staple to your Tapari Agro shop";
  if (pathname.startsWith("/admin/products/"))
    return "Price, channels, owned or digital stock, and supplier";
  if (pathname.startsWith("/admin/products"))
    return "Catalog for your Tapari Agro shop";
  if (pathname.startsWith("/admin/home-sections"))
    return "Homepage product grids on the storefront";
  if (pathname.startsWith("/admin/purchases"))
    return "Record supplier bills — stock updates on save";
  if (pathname.startsWith("/admin/suppliers/"))
    return "Vendor bills — settle from Money when paying";
  if (pathname.startsWith("/admin/suppliers"))
    return "Vendors you buy from";
  if (pathname.startsWith("/admin/inventory"))
    return "Queue exceptions first — restock via Purchases";
  if (pathname.startsWith("/admin/customers/"))
    return "Bills, credit dues, and contact";
  if (pathname.startsWith("/admin/customers"))
    return "Who buys from you — and who still owes";
  if (pathname.startsWith("/admin/settings"))
    return "Shop phone, WhatsApp, and who does which job";
  return "What to do now — then Sell, Money, or Stock";
}

export function AdminTopBar({
  onMenu,
  pendingOrders = 0,
}: {
  onMenu: () => void;
  pendingOrders?: number;
}) {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const subtitle = pageSubtitle(pathname);
  const showAdd =
    pathname.startsWith("/admin/products") &&
    !pathname.startsWith("/admin/products/new");

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#eef0eb]/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/8 bg-white text-ink lg:hidden"
          aria-label="Open menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {title}
          </h1>
          <p className="hidden truncate text-xs text-ink/45 sm:block">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {pendingOrders > 0 ? (
            <Link
              href="/admin/orders?view=needs"
              className="hidden items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 sm:inline-flex"
            >
              {pendingOrders} to fulfill
            </Link>
          ) : null}
          {showAdd ? (
            <Link
              href="/admin/products/new"
              className="hidden rounded-xl bg-pine px-3.5 py-2 text-xs font-bold text-white shadow-sm sm:inline-flex"
            >
              Add product
            </Link>
          ) : null}
          <Link
            href="/"
            target="_blank"
            className="rounded-xl border border-black/8 bg-white px-3 py-2 text-xs font-bold text-ink/70 hover:text-ink"
          >
            Store
          </Link>
        </div>
      </div>
    </header>
  );
}
