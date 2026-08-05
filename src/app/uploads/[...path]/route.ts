import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

function contentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

/** Serve product uploads from DATA_DIR (or public/uploads) in production. */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  if (!parts?.length) {
    return new Response("Not found", { status: 404 });
  }
  if (parts.some((p) => p.includes("..") || p.includes("/") || p.includes("\\"))) {
    return new Response("Bad request", { status: 400 });
  }

  const filename = parts.join("/");
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const candidates = [
    path.join(dataDir, "uploads", filename),
    path.join(process.cwd(), "public", "uploads", filename),
  ];

  const filePath = candidates.find((p) => existsSync(p) && statSync(p).isFile());
  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": contentType(filePath),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
