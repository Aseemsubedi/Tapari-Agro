import { prepareDatabase } from "@/lib/db";

const globalBoot = globalThis as unknown as {
  __tapariBootDone?: boolean;
};

export async function ensureProductionReady() {
  if (globalBoot.__tapariBootDone) return;
  console.log("[boot] prepareDatabase via instrumentation");
  await prepareDatabase();
  globalBoot.__tapariBootDone = true;
}
