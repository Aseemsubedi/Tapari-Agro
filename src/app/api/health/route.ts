import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hostinger / uptime check — runs migrate/seed then reports catalog size. */
export async function GET() {
  try {
    const { ensureDatabaseUrl, prepareDatabase, prisma, DB_BOOT_VERSION } =
      await import("@/lib/db");
    const databaseUrl = ensureDatabaseUrl();
    await prepareDatabase();
    const products = await prisma.product.count();
    return NextResponse.json({
      ok: true,
      products,
      boot: DB_BOOT_VERSION,
      nodeEnv: process.env.NODE_ENV ?? null,
      hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      dataDir: process.env.DATA_DIR ?? null,
      databaseUrl: databaseUrl.startsWith("file:")
        ? databaseUrl.replace(/^file:/, "file:…/")
        : "(set)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: "Redeploy latest main from GitHub, then reload this URL",
      },
      { status: 500 },
    );
  }
}
