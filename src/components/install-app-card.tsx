"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) &&
    /WebKit/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/.test(ua)
  );
}

/** Manual install control for My Tapari / settings surfaces. */
export function InstallAppCard() {
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosSafari());
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (installed) {
    return (
      <p className="rounded-xl border border-pine/10 bg-mist/50 px-4 py-3 text-sm text-ink/55">
        Running as the Tapari Agro app on this device.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-pine/10 bg-white px-4 py-4">
      <p className="font-display text-lg font-extrabold text-ink">
        Install Tapari Agro
      </p>
      <p className="mt-1 text-sm text-ink/50">
        {ios
          ? "On iPhone: tap Share, then Add to Home Screen."
          : "Add to your home screen for faster ordering."}
      </p>
      {event ? (
        <button
          type="button"
          onClick={async () => {
            await event.prompt();
            await event.userChoice;
            setEvent(null);
          }}
          className="mt-3 inline-flex min-h-11 items-center bg-pine px-5 text-sm font-extrabold uppercase tracking-wide text-chalk"
        >
          Install app
        </button>
      ) : null}
    </div>
  );
}
