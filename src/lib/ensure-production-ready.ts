import { prepareDatabase } from "@/lib/db";

const globalBoot = globalThis as unknown as {
  __tapariBootDone?: boolean;
};

/**
 * Hostinger Next preset often runs bare `next start`.
 * Migrate + seed in THIS process so the SQLite file matches Prisma queries.
 */
export async function ensureProductionReady() {
  if (globalBoot.__tapariBootDone) return;
  console.log("[boot] prepareDatabase via instrumentation");
  await prepareDatabase();
  globalBoot.__tapariBootDone = true;
}
