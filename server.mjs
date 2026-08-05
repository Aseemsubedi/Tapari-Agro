#!/usr/bin/env node
/**
 * Hostinger / production entry file.
 * Point hPanel "Entry file" here: server.mjs
 * (Also used by `npm start`.)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, "data"));
const dbPath = path.join(dataDir, "prod.db");
const uploadsDir = path.join(dataDir, "uploads");
const publicUploads = path.join(root, "public", "uploads");
const secretFile = path.join(dataDir, ".admin-session-secret");

function bin(name) {
  const local = path.join(root, "node_modules", ".bin", name);
  return fs.existsSync(local) ? local : name;
}

function run(cmd, args) {
  console.log(`[start] $ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`[start] Command failed (${result.status}): ${cmd}`);
    process.exit(result.status ?? 1);
  }
}

process.chdir(root);
process.env.NODE_ENV = process.env.NODE_ENV || "production";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(publicUploads, { recursive: true });

// Always use persistent DATA_DIR DB in production (ignore file:./dev.db leftovers).
process.env.DATA_DIR = dataDir;
process.env.DATABASE_URL = `file:${dbPath}`;

// Ensure admin session secret exists (Hostinger often forgets this env var).
if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 16) {
  let secret = "";
  try {
    if (fs.existsSync(secretFile)) {
      secret = fs.readFileSync(secretFile, "utf8").trim();
    }
  } catch {
    /* ignore */
  }
  if (!secret || secret.length < 16) {
    secret = randomBytes(32).toString("hex");
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    console.warn("[start] Generated ADMIN_SESSION_SECRET in data/.admin-session-secret");
    console.warn("[start] Prefer setting ADMIN_SESSION_SECRET in Hostinger env vars.");
  }
  process.env.ADMIN_SESSION_SECRET = secret;
}

if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = "admin@tapariagro.com";
if (!process.env.ADMIN_PASSWORD) {
  process.env.ADMIN_PASSWORD = "changeme";
  console.warn("[start] ADMIN_PASSWORD not set — using temporary 'changeme'. Change it in Hostinger env.");
}

const port = String(process.env.PORT || "3000");

console.log(`[start] root=${root}`);
console.log(`[start] DATA_DIR=${dataDir}`);
console.log(`[start] DATABASE_URL=${process.env.DATABASE_URL}`);
console.log(`[start] PORT=${port}`);
console.log(`[start] SITE=${process.env.NEXT_PUBLIC_SITE_URL || "(unset)"}`);

run(bin("prisma"), ["migrate", "deploy"]);

const count = spawnSync(
  bin("tsx"),
  [
    "-e",
    `import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const n = await p.product.count();
  console.log(n);
} finally {
  await p.$disconnect();
}`,
  ],
  { cwd: root, encoding: "utf8", env: process.env, shell: process.platform === "win32" },
);

if (count.status !== 0) {
  console.error("[start] Product count failed:");
  console.error(count.stderr || count.stdout || "");
  process.exit(count.status ?? 1);
}

const productCount = Number.parseInt(
  String(count.stdout || "").trim().split("\n").filter(Boolean).pop() || "0",
  10,
);

if (!Number.isFinite(productCount) || productCount === 0) {
  console.log("[start] Empty catalog — seeding…");
  run(bin("tsx"), ["prisma/seed.ts"]);
} else {
  console.log(`[start] Catalog has ${productCount} products`);
}

console.log(`[start] next start -H 0.0.0.0 -p ${port}`);
run(bin("next"), ["start", "-H", "0.0.0.0", "-p", port]);
