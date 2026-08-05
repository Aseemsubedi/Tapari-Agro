import { prisma } from "@/lib/db";

export type CustomerAddresses = {
  address1: string;
  address2: string;
};

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Stable admin key for grouping orders by customer (digits-only phone). */
export function customerLedgerKey(phone: string, name: string) {
  const digits = normalizePhone(phone);
  if (digits) return `p:${digits}`;
  return `n:${name.trim().toLowerCase() || "walk-in"}`;
}

export function normalizeAddress(address: string) {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Skip empty / pickup placeholders — only real shipping addresses. */
export function isSavableAddress(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return false;
  const n = normalizeAddress(trimmed);
  return (
    n !== "offline shop" &&
    n !== "offline shop / pickup" &&
    n !== "pickup" &&
    n !== "shop pickup"
  );
}

export function customerAddressesList(row: CustomerAddresses) {
  return [row.address1, row.address2].filter((a) => a.trim());
}

/**
 * Keep at most 2 addresses. New / reused address becomes address1 (most recent).
 */
export function mergeCustomerAddresses(
  existing: CustomerAddresses,
  nextRaw: string,
): CustomerAddresses {
  const next = nextRaw.trim().replace(/\s+/g, " ");
  if (!isSavableAddress(next)) {
    return {
      address1: existing.address1,
      address2: existing.address2,
    };
  }

  const nextKey = normalizeAddress(next);
  const a1 = existing.address1.trim();
  const a2 = existing.address2.trim();

  if (a1 && normalizeAddress(a1) === nextKey) {
    return { address1: next, address2: a2 };
  }
  if (a2 && normalizeAddress(a2) === nextKey) {
    return { address1: next, address2: a1 };
  }
  if (!a1) {
    return { address1: next, address2: a2 };
  }
  if (!a2) {
    return { address1: next, address2: a1 };
  }
  // Both slots full — drop oldest (address2), keep previous address1 as #2
  return { address1: next, address2: a1 };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Create or update customer and remember delivery address (max 2). */
export async function upsertCustomerFromSale(
  tx: Tx,
  input: {
    name: string;
    phone: string;
    address: string;
  },
) {
  const name = input.name.trim() || "Walk-in customer";
  const phone = input.phone.trim();
  const phoneKey = normalizePhone(phone);
  const isWalkIn = name.toLowerCase() === "walk-in customer";

  // Anonymous walk-in (no phone): skip profile — cash/pickup only
  if (!phoneKey && isWalkIn) return null;

  // Named customer without phone still gets a profile (credit uses phone though)
  let existing = phoneKey
    ? await tx.customer.findFirst({ where: { phoneKey } })
    : await tx.customer.findFirst({
        where: {
          phoneKey: "",
          name: { equals: name },
        },
      });

  const merged = mergeCustomerAddresses(
    {
      address1: existing?.address1 ?? "",
      address2: existing?.address2 ?? "",
    },
    input.address,
  );

  if (existing) {
    return tx.customer.update({
      where: { id: existing.id },
      data: {
        name: isWalkIn ? existing.name : name,
        phone: phone || existing.phone,
        phoneKey: phoneKey || existing.phoneKey,
        address1: merged.address1,
        address2: merged.address2,
      },
    });
  }

  return tx.customer.create({
    data: {
      name,
      phone,
      phoneKey,
      address1: merged.address1,
      address2: merged.address2,
    },
  });
}

export async function findCustomerByKey(key: string) {
  if (key.startsWith("p:")) {
    const phoneKey = key.slice(2);
    if (!phoneKey) return null;
    return prisma.customer.findFirst({ where: { phoneKey } });
  }
  if (key.startsWith("n:")) {
    const name = key.slice(2);
    if (!name) return null;
    return prisma.customer.findFirst({
      where: { phoneKey: "", name: { equals: name } },
    });
  }
  const phoneKey = normalizePhone(key);
  if (!phoneKey) return null;
  return prisma.customer.findFirst({ where: { phoneKey } });
}
