import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string | null;
  size?: "header" | "footer" | "hero";
  className?: string;
};

const sizes = {
  header: { width: 148, height: 70, className: "h-9 w-auto sm:h-11" },
  footer: { width: 200, height: 94, className: "h-12 w-auto sm:h-14" },
  hero: { width: 280, height: 130, className: "h-16 w-auto sm:h-[4.75rem]" },
} as const;

const LOGO_BADGE = "/images/tapari-logo-badge.jpg";
const LOGO_MARK = "/images/tapari-logo-mark.jpg";

export function BrandLogo({
  href = "/",
  size = "header",
  className = "",
}: BrandLogoProps) {
  const dim = sizes[size];

  const image = (
    <Image
      src={LOGO_BADGE}
      alt="टपरी Agro"
      width={dim.width}
      height={dim.height}
      className={`${dim.className} object-contain ${className}`}
      priority={size === "header" || size === "hero"}
      unoptimized
    />
  );

  if (href == null || href === "") return image;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center"
      aria-label="Tapari Agro home"
    >
      {image}
    </Link>
  );
}

export function BrandMark({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  return (
    <Image
      src={LOGO_MARK}
      alt=""
      width={96}
      height={96}
      className={`rounded-full object-cover ring-2 ring-brass/50 ${className}`}
      unoptimized
    />
  );
}
