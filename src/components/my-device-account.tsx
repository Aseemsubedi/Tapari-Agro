"use client";

import { useEffect, useState } from "react";
import {
  clearGuestDeviceData,
  customerDisplayCode,
  loadGuestOrders,
  loadGuestProfile,
  type GuestOrderSummary,
  type GuestProfile,
} from "@/lib/guest-profile";
import { formatNpr } from "@/lib/format";
import { InstallAppCard } from "@/components/install-app-card";
import Link from "next/link";

export function MyDeviceAccount() {
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [orders, setOrders] = useState<GuestOrderSummary[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadGuestProfile());
    setOrders(loadGuestOrders());
    setReady(true);
  }, []);

  function handleForget() {
    clearGuestDeviceData();
    setProfile(null);
    setOrders([]);
  }

  if (!ready) {
    return (
      <p className="text-sm text-ink/45">Loading saved details…</p>
    );
  }

  const code =
    profile?.customerCode ||
    (profile?.customerId ? customerDisplayCode(profile.customerId) : null) ||
    orders.find((o) => o.customerCode)?.customerCode ||
    null;

  if (!profile && orders.length === 0) {
    return (
      <div className="border border-dashed border-pine/15 bg-white px-6 py-12 text-center">
        <p className="font-display text-2xl font-extrabold text-ink">
          Nothing saved on this device yet
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink/50">
          Place your first order — we&apos;ll save your delivery address on this
          device and create a Tapari ID. No password needed.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex min-h-11 items-center bg-pine px-6 text-sm font-extrabold uppercase tracking-wide text-chalk"
        >
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InstallAppCard />

      <section className="border border-pine/10 bg-white px-5 py-5 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-leaf">
          On this device
        </p>
        {code ? (
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
            {code}
          </p>
        ) : (
          <p className="mt-2 font-display text-2xl font-extrabold text-ink">
            Saved for next checkout
          </p>
        )}
        <p className="mt-2 text-sm text-ink/50">
          No signup or password. Details stay on this phone/browser only.
        </p>

        {profile ? (
          <dl className="mt-5 space-y-2 border-t border-pine/10 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/45">Name</dt>
              <dd className="font-semibold text-ink">{profile.customerName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/45">Mobile</dt>
              <dd className="font-semibold tabular-nums text-ink">
                {profile.phone || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/45">District</dt>
              <dd className="font-semibold text-ink">{profile.district || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/45">Area</dt>
              <dd className="max-w-[60%] text-right font-semibold text-ink">
                {profile.area || "—"}
              </dd>
            </div>
            {profile.addresses && profile.addresses.length > 0 ? (
              <div className="pt-2">
                <dt className="text-ink/45">Saved addresses</dt>
                <dd className="mt-1.5 space-y-1.5">
                  {profile.addresses.map((line) => (
                    <p
                      key={line}
                      className="rounded-lg border border-pine/10 bg-mist/40 px-3 py-2 text-[13px] font-medium text-ink"
                    >
                      {line}
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/cart"
            className="inline-flex min-h-10 items-center bg-brass px-4 text-[12px] font-extrabold uppercase tracking-wide text-pine"
          >
            Checkout with saved details
          </Link>
          <button
            type="button"
            onClick={handleForget}
            className="inline-flex min-h-10 items-center border border-pine/15 px-4 text-[12px] font-bold text-ink/55 transition hover:border-pine hover:text-pine"
          >
            Forget this device
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-extrabold text-ink">
          Orders on this device
        </h2>
        <p className="mt-1 text-sm text-ink/45">
          Recent orders saved locally after checkout.
        </p>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-ink/45">No orders saved yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-pine/10 border border-pine/10 bg-white">
            {orders.map((order) => (
              <li key={order.orderId}>
                <Link
                  href={`/order/${order.orderId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-mist/50"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{order.ref}</p>
                    <p className="mt-0.5 text-[12px] text-ink/45">
                      {new Date(order.createdAt).toLocaleDateString("en-NP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold tabular-nums text-pine">
                    {formatNpr(order.total)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
