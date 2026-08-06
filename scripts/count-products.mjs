import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
fs.mkdirSync(dataDir, { recursive: true });
const url = process.env.DATABASE_URL?.trim() || `file:${path.join(dataDir, "prod.db")}`;
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

prisma.product
  .count()
  .then((n) => {
    console.log(n);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
