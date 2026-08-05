import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function AdminCard({
  children,
  className = "",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,36,24,0.04)] ${className}`}
    >
      {flush ? children : <div className="p-4 sm:p-5">{children}</div>}
    </div>
  );
}

export function AdminCardHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black/[0.06] bg-[#fafbfc] px-4 py-3 sm:items-center sm:px-5">
      <h2 className="min-w-0 text-sm font-semibold text-ink">{title}</h2>
      {action ? (
        <div className="flex max-w-full flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

export function AdminBtn({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "plain" | "danger";
  size?: "sm" | "md";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizes =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const variants = {
    primary: "bg-pine text-white hover:bg-leaf shadow-sm",
    secondary:
      "border border-black/10 bg-white text-ink hover:bg-[#f7f8f9] shadow-sm",
    plain: "text-pine hover:underline",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  }[variant];
  const cls = `inline-flex items-center justify-center rounded-lg font-semibold transition ${sizes} ${variants} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}

export function AdminSubmit({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
}) {
  const sizes =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const variants = {
    primary: "bg-pine text-white hover:bg-leaf shadow-sm",
    secondary:
      "border border-black/10 bg-white text-ink hover:bg-[#f7f8f9] shadow-sm",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  }[variant];
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${sizes} ${variants} ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-12 text-center sm:px-6">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-ink/50">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function AdminStat({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "warn" | "ok";
}) {
  const ring =
    tone === "warn"
      ? "ring-1 ring-brass/40"
      : tone === "ok"
        ? "ring-1 ring-leaf/25"
        : "";
  const className = `block rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(16,36,24,0.04)] ${ring} ${
    href ? "transition hover:border-pine/25" : ""
  }`;
  const body = (
    <>
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink/40">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export function AdminLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-xs font-semibold text-pine hover:underline"
    >
      {children}
    </Link>
  );
}
