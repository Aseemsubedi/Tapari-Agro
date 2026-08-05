#!/usr/bin/env node
/**
 * Production entrypoint for Hostinger / Railway / Render / Docker.
 * - Ensures DATA_DIR exists (SQLite + uploads survive deploys)
 * - Runs prisma migrate deploy
 * - Seeds catalog once when empty
 * - Starts Next.js on process.env.PORT (Hostinger injects this)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbPath = path.join(dataDir, "prod.db");
const uploadsDir = path.join(dataDir, "uploads");
const publicUploads = path.join(root, "public", "uploads");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(publicUploads, { recursive: true });

const existingUrl = process.env.DATABASE_URL || "";
const useVolumeDb =
  Boolean(process.env.DATA_DIR) ||
  process.env.NODE_ENV === "production" ||
  !existingUrl ||
  existingUrl.includes("dev.db") ||
  existingUrl.startsWith("file:./");

if (useVolumeDb) {
  // Absolute SQLite path (keep real spaces — do not percent-encode for Prisma).
  process.env.DATABASE_URL = `file:${dbPath}`;
}

console.log(`[start] cwd=${root}`);
console.log(`[start] DATA_DIR=${dataDir}`);
console.log(`[start] DATABASE_URL=${process.env.DATABASE_URL}`);
console.log(`[start] NODE_ENV=${process.env.NODE_ENV || ""}`);
console.log(`[start] PORT=${process.env.PORT || "3000"}`);

if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 16) {
  console.warn(
    "[start] WARNING: ADMIN_SESSION_SECRET missing or short — set it in Hostinger env (min 16 chars)",
  );
}

run("npx", ["prisma", "migrate", "deploy"]);

const count = spawnSync(
  "npx",
  [
    "tsx",
    "-e",
    `import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const n = await p.product.count();
console.log(n);
await p.$disconnect();`,
  ],
  { cwd: root, encoding: "utf8", env: process.env, shell: process.platform === "win32" },
);

if (count.status !== 0) {
  console.error("[start] Could not count products — migrate/seed may have failed");
  console.error(count.stderr || count.stdout || "");
  process.exit(count.status ?? 1);
}

const productCount = Number.parseInt(String(count.stdout || "").trim().split("\n").pop() || "0", 10);
if (!Number.isFinite(productCount) || productCount === 0) {
  console.log("[start] Empty catalog — running seed…");
  run("npx", ["tsx", "prisma/seed.ts"]);
} else {
  console.log(`[start] Catalog already has ${productCount} products — skip seed`);
}

const port = process.env.PORT || "3000";
console.log(`[start] next start -H 0.0.0.0 -p ${port}`);
// Bind 0.0.0.0 so Hostinger/proxy can reach the process
run("npx", ["next", "start", "-H", "0.0.0.0", "-p", String(port)]);
