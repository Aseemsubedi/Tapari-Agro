import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center bg-chalk px-6 py-16 text-center">
      <p className="font-display text-2xl font-extrabold text-pine">Tapari Agro</p>
      <h1 className="mt-3 font-display text-xl font-bold text-ink">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink/55">
        Check your connection, then try again. Saved cart items stay on this
        device.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex min-h-11 items-center bg-pine px-6 text-sm font-extrabold uppercase tracking-wide text-chalk"
      >
        Retry
      </a>
    </main>
  );
}
