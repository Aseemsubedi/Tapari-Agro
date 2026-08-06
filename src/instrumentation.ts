export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { ensureProductionReady } = await import("./lib/ensure-production-ready");
    await ensureProductionReady();
  } catch (error) {
    // Log but do not kill the process — a hard throw here becomes a Hostinger 503.
    console.error("[instrumentation] Boot failed (site may still start):", error);
  }
}
