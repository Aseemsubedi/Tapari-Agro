export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { ensureProductionReady } = await import("./lib/ensure-production-ready");
    await ensureProductionReady();
  } catch (error) {
    console.error("[instrumentation] Boot failed:", error);
    // Do not swallow — better a clear startup failure than silent 500s.
    throw error;
  }
}
