/** Browser-only guest profile — no signup; phone is the soft identity. */

export const GUEST_PROFILE_KEY = "tapari-agro-guest-profile";
export const GUEST_ORDERS_KEY = "tapari-agro-guest-orders";

export type GuestProfile = {
  remember: boolean;
  customerName: string;
  phone: string;
  district: string;
  area: string;
  /** Up to 2 recent full delivery lines (area, district) */
  addresses?: string[];
  /** Server Customer.id when known */
  customerId?: string;
  /** Short display code e.g. TA-A1B2C3 */
  customerCode?: string;
  updatedAt: string;
};

export type GuestOrderSummary = {
  orderId: string;
  ref: string;
  customerName: string;
  phone: string;
  district?: string;
  area?: string;
  address?: string;
  total: number;
  createdAt: string;
  customerId?: string;
  customerCode?: string;
};

function normalizeAddressLine(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Keep newest address first, max 2 unique lines. */
export function mergeSavedAddresses(
  existing: string[] | undefined,
  nextRaw: string,
): string[] {
  const next = nextRaw.trim().replace(/\s+/g, " ");
  if (!next) return (existing ?? []).slice(0, 2);
  const key = normalizeAddressLine(next);
  const rest = (existing ?? []).filter(
    (a) => normalizeAddressLine(a) !== key,
  );
  return [next, ...rest].slice(0, 2);
}

export function formatDeliveryLine(district: string, area: string) {
  return [area.trim(), district.trim()].filter(Boolean).join(", ");
}

export function customerDisplayCode(customerId: string) {
  const tail = customerId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return tail ? `TA-${tail}` : "";
}

export function loadGuestProfile(): GuestProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestProfile;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      remember: parsed.remember !== false,
      customerName: String(parsed.customerName ?? ""),
      phone: String(parsed.phone ?? ""),
      district: String(parsed.district ?? ""),
      area: String(parsed.area ?? ""),
      addresses: Array.isArray(parsed.addresses)
        ? parsed.addresses.map(String).filter(Boolean).slice(0, 2)
        : undefined,
      customerId: parsed.customerId ? String(parsed.customerId) : undefined,
      customerCode: parsed.customerCode
        ? String(parsed.customerCode)
        : parsed.customerId
          ? customerDisplayCode(parsed.customerId)
          : undefined,
      updatedAt: String(parsed.updatedAt ?? ""),
    };
  } catch {
    return null;
  }
}

export function saveGuestProfile(
  profile: Omit<GuestProfile, "updatedAt"> & { updatedAt?: string },
) {
  if (typeof window === "undefined") return;
  if (!profile.remember) {
    window.localStorage.removeItem(GUEST_PROFILE_KEY);
    return;
  }
  const delivery = formatDeliveryLine(profile.district, profile.area);
  const addresses = mergeSavedAddresses(
    profile.addresses,
    delivery || "",
  );

  const next: GuestProfile = {
    remember: true,
    customerName: profile.customerName.trim(),
    phone: profile.phone.trim(),
    district: profile.district.trim(),
    area: profile.area.trim(),
    addresses:
      addresses.length > 0
        ? addresses
        : profile.addresses?.length
          ? profile.addresses
          : undefined,
    customerId: profile.customerId,
    customerCode:
      profile.customerCode ||
      (profile.customerId ? customerDisplayCode(profile.customerId) : undefined),
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
  window.localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new Event("tapari-profile-saved"));
  } catch {
    /* ignore */
  }
}

export function clearGuestProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_PROFILE_KEY);
}

export function clearGuestDeviceData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_PROFILE_KEY);
  window.localStorage.removeItem(GUEST_ORDERS_KEY);
}

export function loadGuestOrders(): GuestOrderSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestOrderSummary[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((o) => o && typeof o.orderId === "string");
  } catch {
    return [];
  }
}

/**
 * After checkout: always keep the order on-device, and save/update delivery
 * address on first (and later) orders — no signup required.
 */
export function rememberGuestOrder(order: GuestOrderSummary) {
  if (typeof window === "undefined") return;
  const existing = loadGuestOrders().filter((o) => o.orderId !== order.orderId);
  const next = [order, ...existing].slice(0, 20);
  window.localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(next));

  const profile = loadGuestProfile();
  const district = (order.district || profile?.district || "").trim();
  const area = (order.area || profile?.area || "").trim();
  const addressLine =
    (order.address || "").trim() || formatDeliveryLine(district, area);

  // First order (or any order with a delivery line): create/update saved profile.
  if (!addressLine && !order.customerName && !order.phone) return;

  saveGuestProfile({
    remember: true,
    customerName: order.customerName || profile?.customerName || "",
    phone: order.phone || profile?.phone || "",
    district,
    area,
    addresses: mergeSavedAddresses(profile?.addresses, addressLine),
    customerId: order.customerId || profile?.customerId,
    customerCode:
      order.customerCode ||
      profile?.customerCode ||
      (order.customerId ? customerDisplayCode(order.customerId) : undefined),
  });
}
