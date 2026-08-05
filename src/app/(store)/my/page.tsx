import type { Metadata } from "next";
import Link from "next/link";
import { MyDeviceAccount } from "@/components/my-device-account";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Saved on this device",
  description:
    "Your Tapari Agro delivery details and recent orders saved on this phone — no signup required.",
  path: "/my",
  noIndex: true,
});

export default function MyDevicePage() {
  return (
    <div className="bg-white">
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-8 sm:py-14">
        <Link
          href="/shop"
          className="text-[13px] font-medium tracking-wide text-ink/40 transition hover:text-ink"
        >
          ← Back to shop
        </Link>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          My Tapari
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/50">
          Auto-saved when you order with Remember me — no register or password.
        </p>
        <div className="mt-8">
          <MyDeviceAccount />
        </div>
      </div>
    </div>
  );
}
