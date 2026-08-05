#!/usr/bin/env node
/**
 * Production entrypoint for Hostinger / Railway / Render / Docker.
 * - Ensures DATA_DIR exists (SQLite + uploads survive deploys when mounted)
 * - Runs prisma migrate deploy
 * - Seeds catalog once when empty
 * - Starts Next.js
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

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

// Persist uploads on DATA_DIR; keep /uploads URLs working via public symlink.
try {
  if (fs.existsSync(publicUploads)) {
    const stat = fs.lstatSync(publicUploads);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      fs.rmSync(publicUploads, { recursive: true, force: true });
    }
  }
  fs.symlinkSync(uploadsDir, publicUploads, "junction");
} catch (err) {
  console.warn("[start] Could not link public/uploads → DATA_DIR/uploads:", err.message);
  fs.mkdirSync(publicUploads, { recursive: true });
}

if (!process.env.DATABASE_URL) {
  // Prisma file URLs: absolute paths need three slashes after file:
  process.env.DATABASE_URL = `file:${dbPath}`;
}

console.log(`[start] DATA_DIR=${dataDir}`);
console.log(`[start] DATABASE_URL=${process.env.DATABASE_URL}`);

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

const productCount = Number.parseInt(String(count.stdout || "").trim().split("\n").pop() || "0", 10);
if (!Number.isFinite(productCount) || productCount === 0) {
  console.log("[start] Empty catalog — running seed…");
  run("npx", ["tsx", "prisma/seed.ts"]);
} else {
  console.log(`[start] Catalog already has ${productCount} products — skip seed`);
}

const port = process.env.PORT || "3000";
console.log(`[start] next start -p ${port}`);
run("npx", ["next", "start", "-p", port]);
