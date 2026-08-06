import { Prisma, PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Bump when Product / related models gain fields the cached client must pick up. */
const SCHEMA_REV = 36;
const MIGRATION_NAME = "20260803080000_baseline_current";
export const DB_BOOT_VERSION = "2026-08-06-schema-bootstrap-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaRev?: number;
  __tapariReady?: Promise<void>;
};

function bin(name: string) {
  const local = path.join(process.cwd(), "node_modules", ".bin", name);
  const prismaJs = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  if (name === "prisma" && fs.existsSync(prismaJs)) {
    return { cmd: process.execPath, argsPrefix: [prismaJs] as string[] };
  }
  if (fs.existsSync(local)) {
    return { cmd: local, argsPrefix: [] as string[] };
  }
  return { cmd: name, argsPrefix: [] as string[] };
}

/**
 * Prisma resolves relative `file:./…` URLs against the `prisma/` folder.
 * Always use an absolute file path under DATA_DIR.
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
  process.env.DATABASE_URL = absolute;
  return absolute;
}

function createClient() {
  const url = ensureDatabaseUrl();
  return new PrismaClient({
    datasources: { db: { url } },
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
    "essential" in Prisma.ProductScalarFieldEnum &&
    "OrderItemDigitalLot" in Prisma.ModelName;

  if (!moduleOk) return false;
  if (!client) return true;
  return (
    clientKnowsField(client, "StockPurchase", "stockKind") &&
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

async function productTableExists(client: PrismaClient): Promise<boolean> {
  try {
    const rows = await client.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Product'
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

/** Apply baseline migration SQL without relying on the prisma CLI. */
async function applyBaselineSql(client: PrismaClient) {
  const migrationFile = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    MIGRATION_NAME,
    "migration.sql",
  );
  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Missing migration file: ${migrationFile}`);
  }
  const sql = fs.readFileSync(migrationFile, "utf8");
  const statements = splitSqlStatements(sql);
  console.log(`[db] Applying ${statements.length} SQL statements in-process…`);
  for (const statement of statements) {
    await client.$executeRawUnsafe(statement);
  }

  // Mark migration applied so future CLI migrate deploy is a no-op.
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
  const existing = await client.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*) as c FROM "_prisma_migrations" WHERE "migration_name" = ${MIGRATION_NAME}
  `;
  if (!existing[0] || Number(existing[0].c) === 0) {
    const id = `bootstrap-${Date.now()}`;
    await client.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
       VALUES ('${id}','bootstrap',CURRENT_TIMESTAMP,'${MIGRATION_NAME}',NULL,NULL,CURRENT_TIMESTAMP,1)`,
    );
  }
}

function tryCliMigrate(url: string) {
  const root = process.cwd();
  const prisma = bin("prisma");
  console.log(`[db] CLI migrate deploy DATABASE_URL=${url}`);
  execFileSync(prisma.cmd, [...prisma.argsPrefix, "migrate", "deploy"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}

async function seedIfEmpty(client: PrismaClient) {
  const count = await client.product.count();
  if (count > 0) {
    console.log(`[db] Catalog has ${count} products`);
    return count;
  }
  console.log("[db] Empty catalog — seeding…");
  const tsx = bin("tsx");
  execFileSync(tsx.cmd, [...tsx.argsPrefix, "prisma/seed.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: ensureDatabaseUrl() },
  });
  return client.product.count();
}

/** Migrate (+ seed). Prefer in-process SQL so Hostinger works without CLI. */
export async function prepareDatabase() {
  if (!globalForPrisma.__tapariReady) {
    globalForPrisma.__tapariReady = (async () => {
      const url = ensureDatabaseUrl();
      console.log(`[db] prepare DATABASE_URL=${url} boot=${DB_BOOT_VERSION}`);

      // Best-effort CLI first (keeps migration history tidy when available).
      try {
        tryCliMigrate(url);
      } catch (err) {
        console.warn("[db] CLI migrate failed — will apply SQL in-process:", err);
      }

      let client = getClient();
      if (!(await productTableExists(client))) {
        console.warn("[db] Product table missing — applying baseline SQL");
        await applyBaselineSql(client);
        // Refresh client after DDL
        await client.$disconnect().catch(() => undefined);
        globalForPrisma.prisma = undefined;
        client = getClient();
      }

      if (!(await productTableExists(client))) {
        throw new Error("Product table still missing after schema bootstrap");
      }

      await seedIfEmpty(client);
    })();
  }
  await globalForPrisma.__tapariReady;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
