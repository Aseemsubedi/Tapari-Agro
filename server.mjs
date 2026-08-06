#!/usr/bin/env node
/**
 * Hostinger Entry file: server.mjs
 * Also safe as `npm start`.
 *
 * Never block forever before `next start` — nginx returns 504 if Node
 * does not listen within the gateway timeout.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootDatabase } from "./scripts/boot-db.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);

try {
  bootDatabase();
} catch (err) {
  // Still start Next — instrumentation / prepareDatabase can recover.
  console.error("[start] Database boot warning (continuing):", err);
}

function bin(name) {
  const local = path.join(root, "node_modules", ".bin", name);
  return fs.existsSync(local) ? local : name;
}

const port = String(process.env.PORT || "3000");
console.log(`[start] next start -H 0.0.0.0 -p ${port}`);
const result = spawnSync(bin("next"), ["start", "-H", "0.0.0.0", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
