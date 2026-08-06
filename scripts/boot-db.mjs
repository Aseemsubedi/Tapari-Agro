#!/usr/bin/env node
/**
 * Shared DB boot for Hostinger (server.mjs entry).
 * Keep this fast and non-fatal — hung migrate/seed causes nginx 504.
 * Schema + seed also run in-process via instrumentation / prepareDatabase.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATE_TIMEOUT_MS = 20_000;

function bin(name) {
  const local = path.join(root, "node_modules", ".bin", name);
  return fs.existsSync(local) ? local : name;
}

function runOptional(cmd, args, timeoutMs) {
  console.log(`[boot] $ ${cmd} ${args.join(" ")}`);
  try {
    execFileSync(cmd, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      timeout: timeoutMs,
    });
    return true;
  } catch (err) {
    console.warn(`[boot] optional step failed (continuing):`, err?.message || err);
    return false;
  }
}

export function bootDatabase() {
  process.chdir(root);
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, "data"));
  const dbPath = path.join(dataDir, "prod.db");
  const uploadsDir = path.join(dataDir, "uploads");
  const publicUploads = path.join(root, "public", "uploads");
  const secretFile = path.join(dataDir, ".admin-session-secret");

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(publicUploads, { recursive: true });

  process.env.DATA_DIR = dataDir;
  // Absolute path required — file:./data/prod.db lands under prisma/ with Prisma.
  process.env.DATABASE_URL = `file:${dbPath}`;

  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 16) {
    let secret = "";
    try {
      if (fs.existsSync(secretFile)) secret = fs.readFileSync(secretFile, "utf8").trim();
    } catch {
      /* ignore */
    }
    if (!secret || secret.length < 16) {
      secret = randomBytes(32).toString("hex");
      fs.writeFileSync(secretFile, secret, { mode: 0o600 });
      console.warn("[boot] Wrote ADMIN_SESSION_SECRET to data/.admin-session-secret");
    }
    process.env.ADMIN_SESSION_SECRET = secret;
  }

  if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = "admin@tapariagro.com";
  if (!process.env.ADMIN_PASSWORD) {
    process.env.ADMIN_PASSWORD = "changeme";
    console.warn("[boot] ADMIN_PASSWORD unset — temporary changeme");
  }

  console.log(`[boot] DATA_DIR=${dataDir}`);
  console.log(`[boot] DATABASE_URL=${process.env.DATABASE_URL}`);

  // Best-effort only. In-process prepareDatabase handles schema + seed if this fails.
  runOptional(bin("prisma"), ["migrate", "deploy"], MIGRATE_TIMEOUT_MS);
  console.log("[boot] DB path ready — Next will finish migrate/seed in-process if needed");
}

const isDirect =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  try {
    bootDatabase();
  } catch (err) {
    console.error("[boot] Failed:", err);
    process.exit(1);
  }
}
