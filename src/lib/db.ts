import { Prisma, PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

/** Bump when Product / related models gain fields the cached client must pick up. */
const SCHEMA_REV = 34;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaRev?: number;
};

/**
 * Hostinger often omits DATABASE_URL from the Next process even when
 * boot-db.mjs set it in a child. Always resolve a usable SQLite path here.
 */
export function ensureDatabaseUrl() {
  const existing = process.env.DATABASE_URL?.trim() || "";
  const needsDefault =
    !existing ||
    existing.includes("dev.db") ||
    (process.env.NODE_ENV === "production" && existing.startsWith("file:./"));

  if (!needsDefault) return existing;

  const dataDir = path.resolve(
    process.env.DATA_DIR || path.join(process.cwd(), "data"),
  );
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
  } catch {
    /* ignore */
  }
  process.env.DATA_DIR = dataDir;
  process.env.DATABASE_URL = `file:${path.join(dataDir, "prod.db")}`;
  return process.env.DATABASE_URL;
}

function createClient() {
  const url = ensureDatabaseUrl();
  // Pass url explicitly — Hostinger often omits DATABASE_URL from Prisma's env reader.
  return new PrismaClient({
    datasources: {
      db: { url },
    },
  });
}

/** True if this PrismaClient instance was built with the given model field. */
function clientKnowsField(
  client: PrismaClient,
  model: string,
  field: string,
): boolean {
  const runtime = client as unknown as {
    _runtimeDataModel?: {
      models?: Record<string, { fields?: { name: string }[] }>;
    };
  };
  const fields = runtime._runtimeDataModel?.models?.[model]?.fields;
  if (!fields) return false;
  return fields.some((f) => f.name === field);
}

function clientIsCurrent(client?: PrismaClient) {
  const moduleOk =
    "sellOnline" in Prisma.ProductScalarFieldEnum &&
    "sellOffline" in Prisma.ProductScalarFieldEnum &&
    "HomeSection" in Prisma.ModelName &&
    "HomeSectionProduct" in Prisma.ModelName &&
    "StockPurchase" in Prisma.ModelName &&
    "remainingQty" in Prisma.StockPurchaseScalarFieldEnum &&
    "stockKind" in Prisma.StockPurchaseScalarFieldEnum &&
    "payMethod" in Prisma.StockPurchaseScalarFieldEnum &&
    "chequeNo" in Prisma.StockPurchaseScalarFieldEnum &&
    "channel" in Prisma.OrderScalarFieldEnum &&
    "paymentMethod" in Prisma.OrderScalarFieldEnum &&
    "deliveryFee" in Prisma.OrderScalarFieldEnum &&
    "paymentNote" in Prisma.OrderScalarFieldEnum &&
    "Customer" in Prisma.ModelName &&
    "address1" in Prisma.CustomerScalarFieldEnum &&
    "Vendor" in Prisma.ModelName &&
    "address" in Prisma.VendorScalarFieldEnum &&
    "amountPaid" in Prisma.StockPurchaseScalarFieldEnum &&
    "ProductVendor" in Prisma.ModelName &&
    "unitCost" in Prisma.OrderItemScalarFieldEnum &&
    "discountAmount" in Prisma.OrderScalarFieldEnum &&
    "PaymentEvent" in Prisma.ModelName &&
    "amountPaid" in Prisma.OrderScalarFieldEnum &&
    "inventoryMode" in Prisma.ProductScalarFieldEnum &&
    "digitalAvailable" in Prisma.ProductScalarFieldEnum &&
    "SellerSettlement" in Prisma.ModelName &&
    "ownedQty" in Prisma.OrderItemScalarFieldEnum &&
    "OrderItemDigitalLot" in Prisma.ModelName &&
    "essential" in Prisma.ProductScalarFieldEnum;

  if (!moduleOk) return false;
  if (!client) return true;
  // Catch Turbopack HMR keeping an old PrismaClient after prisma generate.
  return (
    clientKnowsField(client, "StockPurchase", "stockKind") &&
    clientKnowsField(client, "StockPurchase", "remainingQty") &&
    clientKnowsField(client, "OrderItem", "ownedQty") &&
    clientKnowsField(client, "Product", "essential")
  );
}

function getClient(): PrismaClient {
  ensureDatabaseUrl();
  const existing = globalForPrisma.prisma;
  const revOk = globalForPrisma.prismaSchemaRev === SCHEMA_REV;
  if (existing && revOk && clientIsCurrent(existing)) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }
  const client = createClient();
  // Always cache — production used to recreate a client on every Proxy access.
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaRev = SCHEMA_REV;
  return client;
}

/** Always resolves through getClient so schema bumps refresh a stale singleton. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
