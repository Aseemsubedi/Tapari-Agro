"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LOGO_MARK } from "@/components/brand-logo";
import { loadGuestProfile, saveGuestProfile } from "@/lib/guest-profile";
import { shopConfig } from "@/lib/shop";

const PROFILE_DISMISS_KEY = "tapari-agro-profile-sheet-dismissed";
const PWA_DISMISS_KEY = "tapari-agro-pwa-sheet-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) &&
    /WebKit/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/.test(ua)
  );
}

function dismissedRecently(key: string, days = 14) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return true;
    return Date.now() - at < days * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function dismiss(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Mobile bottom UX:
 * - Profile sheet (name + phone) when none saved — covers help bar
 * - Compact PWA install strip above help bar when eligible
 */
export function MobileOnboardingSheet({
  onProfileOpenChange,
}: {
  onProfileOpenChange?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const [showPwa, setShowPwa] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosTip, setIosTip] = useState(false);

  const hideOnCheckout =
    pathname.startsWith("/cart") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/offline");

  useEffect(() => {
    onProfileOpenChange?.(showProfile);
  }, [showProfile, onProfileOpenChange]);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => {
      dismiss(PWA_DISMISS_KEY);
      setShowPwa(false);
      setInstallEvent(null);
    });
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    if (hideOnCheckout) {
      setShowProfile(false);
      setShowPwa(false);
      return;
    }
    if (window.matchMedia("(min-width: 640px)").matches) {
      setShowProfile(false);
      setShowPwa(false);
      return;
    }

    const profile = loadGuestProfile();
    const hasProfile = Boolean(
      profile?.remember && (profile.phone.trim() || profile.customerName.trim()),
    );

    if (!hasProfile && !dismissedRecently(PROFILE_DISMISS_KEY, 7)) {
      setShowProfile(true);
      setShowPwa(false);
      return;
    }

    setShowProfile(false);

    if (!isStandalone() && !dismissedRecently(PWA_DISMISS_KEY, 14)) {
      setIosTip(isIosSafari());
      setShowPwa(true);
      return;
    }

    setShowPwa(false);
  }, [hideOnCheckout, pathname]);

  function closeProfile() {
    dismiss(PROFILE_DISMISS_KEY);
    setShowProfile(false);
    if (!isStandalone() && !dismissedRecently(PWA_DISMISS_KEY, 14)) {
      setIosTip(isIosSafari());
      setShowPwa(true);
    }
  }

  function saveProfile() {
    const n = name.trim();
    const p = phone.trim();
    if (!n || !p) return;
    saveGuestProfile({
      remember: true,
      customerName: n,
      phone: p,
      district: "",
      area: "",
    });
    dismiss(PROFILE_DISMISS_KEY);
    window.dispatchEvent(new Event("tapari-profile-saved"));
    setShowProfile(false);
    if (!isStandalone() && !dismissedRecently(PWA_DISMISS_KEY, 14)) {
      setIosTip(isIosSafari());
      setShowPwa(true);
    }
  }

  async function installPwa() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    }
    dismiss(PWA_DISMISS_KEY);
    setShowPwa(false);
  }

  function closePwa() {
    dismiss(PWA_DISMISS_KEY);
    setShowPwa(false);
  }

  return (
    <>
      {showProfile ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[46] sm:hidden"
          role="dialog"
          aria-label="Create profile"
        >
          <div className="border-t border-pine/10 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(16,36,24,0.14)]">
            <div className="mx-auto max-w-md">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Image
                    src={LOGO_MARK}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-pine/15"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <p className="font-display text-base font-extrabold tracking-tight text-ink">
                      {shopConfig.name}
                    </p>
                    <p className="text-[12px] text-ink/50">
                      Save details — no password
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeProfile}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-xl text-ink/40"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-pine/15 px-3.5 text-[15px] outline-none focus:border-pine"
                />
                <div className="flex min-h-11 overflow-hidden rounded-xl border border-pine/15">
                  <span className="inline-flex items-center bg-mist px-3 text-sm font-semibold text-ink/55">
                    +977
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="98xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="min-w-0 flex-1 px-3 text-[15px] outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={
                    !name.trim() || phone.replace(/\D/g, "").length < 10
                  }
                  onClick={saveProfile}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl bg-pine text-sm font-extrabold uppercase tracking-wide text-chalk disabled:opacity-40"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={closeProfile}
                  className="w-full py-1.5 text-center text-[12px] font-semibold text-ink/40"
                >
                  Not now — browse shop
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showPwa && !showProfile ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[42] px-3 sm:hidden">
          <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-pine/15 bg-white px-3 py-2.5 shadow-[0_8px_28px_rgba(16,36,24,0.14)]">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
              unoptimized
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold text-ink">
                Install Tapari Agro
              </p>
              <p className="truncate text-[11px] text-ink/45">
                {iosTip
                  ? "Share → Add to Home Screen"
                  : "Add to home — open like an app"}
              </p>
            </div>
            {installEvent ? (
              <button
                type="button"
                onClick={installPwa}
                className="shrink-0 rounded-lg bg-pine px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-chalk"
              >
                Install
              </button>
            ) : (
              <button
                type="button"
                onClick={closePwa}
                className="shrink-0 rounded-lg bg-pine px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-chalk"
              >
                OK
              </button>
            )}
            <button
              type="button"
              onClick={closePwa}
              className="shrink-0 px-1 text-lg leading-none text-ink/35"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
