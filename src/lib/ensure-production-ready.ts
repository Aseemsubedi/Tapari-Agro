import { execFileSync } from "node:child_process";
import path from "node:path";

const globalBoot = globalThis as unknown as {
  __tapariBootDone?: boolean;
};

/**
 * Hostinger Next preset often runs bare `next start` (skips server.mjs).
 * Instrumentation still boots the DB before serving traffic.
 */
export async function ensureProductionReady() {
  if (globalBoot.__tapariBootDone) return;
  const root = process.cwd();
  const script = path.join(root, "scripts", "boot-db.mjs");
  console.log("[boot] Running scripts/boot-db.mjs via instrumentation");
  execFileSync(process.execPath, [script], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  globalBoot.__tapariBootDone = true;
}
