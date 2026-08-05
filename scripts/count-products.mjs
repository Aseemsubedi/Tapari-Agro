import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
