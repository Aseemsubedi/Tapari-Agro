"use client";

import { useEffect, useState } from "react";
import {
  customerDisplayCode,
  loadGuestProfile,
  rememberGuestOrder,
} from "@/lib/guest-profile";

type Props = {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  total: number;
  createdAt: string;
  customerId: string | null;
};

/** Sync order + address + Tapari ID onto this device after checkout (no login). */
export function GuestOrderSync({
  orderId,
  customerName,
  phone,
  address,
  total,
  createdAt,
  customerId,
}: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [savedAddress, setSavedAddress] = useState(false);

  useEffect(() => {
    const display = customerId ? customerDisplayCode(customerId) : undefined;
    // Best-effort split: "Area, District" from checkout
    const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
    const area = parts.length > 1 ? parts.slice(0, -1).join(", ") : parts[0] || "";
    const district = parts.length > 1 ? parts[parts.length - 1] : "";

    rememberGuestOrder({
      orderId,
      ref: `#${orderId.slice(0, 8)}`,
      customerName,
      phone,
      district,
      area,
      address,
      total,
      createdAt,
      customerId: customerId ?? undefined,
      customerCode: display,
    });
    const profile = loadGuestProfile();
    setCode(
      display ||
        profile?.customerCode ||
        (profile?.customerId ? customerDisplayCode(profile.customerId) : null),
    );
    setSavedAddress(Boolean(address.trim()));
  }, [orderId, customerName, phone, address, total, createdAt, customerId]);

  if (!code && !savedAddress) return null;

  return (
    <p className="mt-3 rounded-lg border border-pine/10 bg-mist/50 px-3 py-2 text-[12px] leading-relaxed text-ink/60">
      {code ? (
        <>
          Your Tapari ID{" "}
          <span className="font-bold text-pine">{code}</span>
          {savedAddress ? " and delivery address" : ""} are saved on this
          device —{" "}
        </>
      ) : (
        <>Delivery address saved on this device — </>
      )}
      <a href="/my" className="font-semibold text-pine underline-offset-2 hover:underline">
        view saved details
      </a>
      . No password needed.
    </p>
  );
}
