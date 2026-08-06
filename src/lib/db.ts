import { Prisma, PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Bump when Product / related models gain fields the cached client must pick up. */
const SCHEMA_REV = 35;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaRev?: number;
  __tapariMigrated?: boolean;
};

function bin(name: string) {
  const local = path.join(process.cwd(), "node_modules", ".bin", name);
  return fs.existsSync(local) ? local : name;
}

/**
 * Prisma resolves relative `file:./…` URLs against the `prisma/` folder,
 * not cwd — that creates an empty DB with no tables on Hostinger.
 * Always use an absolute file path.
 */
export function ensureDatabaseUrl() {
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

  const absolute = `file:${path.join(dataDir, "prod.db")}`;
  const existing = process.env.DATABASE_URL?.trim() || "";

  // Relative SQLite URLs are unsafe with Prisma — always normalize in production.
  if (
    !existing ||
    existing.includes("dev.db") ||
    existing.startsWith("file:./") ||
    existing.startsWith("file:data/") ||
    process.env.NODE_ENV === "production"
  ) {
    process.env.DATABASE_URL = absolute;
  } else if (existing.startsWith("file:") && !existing.startsWith("file:/")) {
    // file:prod.db or similar relative form
    process.env.DATABASE_URL = absolute;
  }

  return process.env.DATABASE_URL!;
}

/** Create tables if this SQLite file was never migrated. */
export function ensureDatabaseMigrated() {
  if (globalForPrisma.__tapariMigrated) return;
  const url = ensureDatabaseUrl();
  const root = process.cwd();
  console.log(`[db] migrate deploy DATABASE_URL=${url}`);
  try {
    execFileSync(bin("prisma"), ["migrate", "deploy"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
    globalForPrisma.__tapariMigrated = true;
  } catch (err) {
    console.error("[db] migrate deploy failed:", err);
    throw err;
  }
}

async function seedIfEmpty(client: PrismaClient) {
  const count = await client.product.count();
  if (count > 0) {
    console.log(`[db] Catalog has ${count} products`);
    return;
  }
  console.log("[db] Empty catalog — seeding…");
  execFileSync(bin("tsx"), ["prisma/seed.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: ensureDatabaseUrl() },
  });
}

function createClient() {
  const url = ensureDatabaseUrl();
  return new PrismaClient({
    datasources: {
      db: { url },
    },
  });
}

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
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaRev = SCHEMA_REV;
  return client;
}

/** Run migrate (+ seed if empty). Safe to call from instrumentation / health. */
export async function prepareDatabase() {
  ensureDatabaseMigrated();
  const client = getClient();
  try {
    await seedIfEmpty(client);
  } catch (err) {
    // Table might still be missing if migrate failed — surface clearly
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("does not exist")) {
      globalForPrisma.__tapariMigrated = false;
      ensureDatabaseMigrated();
      await seedIfEmpty(getClient());
      return;
    }
    throw err;
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
