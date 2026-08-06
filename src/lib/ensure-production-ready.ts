import { execFileSync } from "node:child_process";
import path from "node:path";
import { ensureDatabaseUrl } from "@/lib/db";

const globalBoot = globalThis as unknown as {
  __tapariBootDone?: boolean;
};

/**
 * Hostinger Next preset often runs bare `next start` (skips server.mjs).
 * Set DATABASE_URL on THIS process first — child boot cannot mutate parent env.
 */
export async function ensureProductionReady() {
  if (globalBoot.__tapariBootDone) return;

  const url = ensureDatabaseUrl();
  console.log(`[boot] Parent DATABASE_URL=${url}`);

  const root = process.cwd();
  const script = path.join(root, "scripts", "boot-db.mjs");
  console.log("[boot] Running scripts/boot-db.mjs via instrumentation");
  execFileSync(process.execPath, [script], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
      DATA_DIR: process.env.DATA_DIR,
    },
  });
  globalBoot.__tapariBootDone = true;
}
