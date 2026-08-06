import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hostinger / uptime check — confirms DB is reachable after boot. */
export async function GET() {
  try {
    const { ensureDatabaseUrl, prisma } = await import("@/lib/db");
    const databaseUrl = ensureDatabaseUrl();
    const products = await prisma.product.count();
    return NextResponse.json({
      ok: true,
      products,
      nodeEnv: process.env.NODE_ENV ?? null,
      hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      dataDir: process.env.DATA_DIR ?? null,
      hasDatabaseUrl: Boolean(databaseUrl),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
