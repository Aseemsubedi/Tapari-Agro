import { Prisma, PrismaClient } from "@prisma/client";

/** Bump when Product / related models gain fields the cached client must pick up. */
const SCHEMA_REV = 33;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaRev?: number;
};

function createClient() {
  return new PrismaClient();
}

/** True if this PrismaClient instance was built with the given model field. */
function clientKnowsField(
  client: PrismaClient,
  model: string,
  field: string,
): boolean {
  const runtime = client as unknown as {
    _runtimeDataModel?: {
      models?: Record<string, { fields?: { name: string }[] }>;
    };
  };
  const fields = runtime._runtimeDataModel?.models?.[model]?.fields;
  if (!fields) return false;
  return fields.some((f) => f.name === field);
}

function clientIsCurrent(client?: PrismaClient) {
  const moduleOk =
    "sellOnline" in Prisma.ProductScalarFieldEnum &&
    "sellOffline" in Prisma.ProductScalarFieldEnum &&
    "HomeSection" in Prisma.ModelName &&
    "HomeSectionProduct" in Prisma.ModelName &&
    "StockPurchase" in Prisma.ModelName &&
    "remainingQty" in Prisma.StockPurchaseScalarFieldEnum &&
    "stockKind" in Prisma.StockPurchaseScalarFieldEnum &&
    "payMethod" in Prisma.StockPurchaseScalarFieldEnum &&
    "chequeNo" in Prisma.StockPurchaseScalarFieldEnum &&
    "channel" in Prisma.OrderScalarFieldEnum &&
    "paymentMethod" in Prisma.OrderScalarFieldEnum &&
    "deliveryFee" in Prisma.OrderScalarFieldEnum &&
    "paymentNote" in Prisma.OrderScalarFieldEnum &&
    "Customer" in Prisma.ModelName &&
    "address1" in Prisma.CustomerScalarFieldEnum &&
    "Vendor" in Prisma.ModelName &&
    "address" in Prisma.VendorScalarFieldEnum &&
    "amountPaid" in Prisma.StockPurchaseScalarFieldEnum &&
    "ProductVendor" in Prisma.ModelName &&
    "unitCost" in Prisma.OrderItemScalarFieldEnum &&
    "discountAmount" in Prisma.OrderScalarFieldEnum &&
    "PaymentEvent" in Prisma.ModelName &&
    "amountPaid" in Prisma.OrderScalarFieldEnum &&
    "inventoryMode" in Prisma.ProductScalarFieldEnum &&
    "digitalAvailable" in Prisma.ProductScalarFieldEnum &&
    "SellerSettlement" in Prisma.ModelName &&
    "ownedQty" in Prisma.OrderItemScalarFieldEnum &&
    "OrderItemDigitalLot" in Prisma.ModelName &&
    "essential" in Prisma.ProductScalarFieldEnum;

  if (!moduleOk) return false;
  if (!client) return true;
  // Catch Turbopack HMR keeping an old PrismaClient after prisma generate.
  return (
    clientKnowsField(client, "StockPurchase", "stockKind") &&
    clientKnowsField(client, "StockPurchase", "remainingQty") &&
    clientKnowsField(client, "OrderItem", "ownedQty") &&
    clientKnowsField(client, "Product", "essential")
  );
}

function getClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  const revOk = globalForPrisma.prismaSchemaRev === SCHEMA_REV;
  if (existing && revOk && clientIsCurrent(existing)) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }
  const client = createClient();
  // Always cache — production used to recreate a client on every Proxy access.
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaRev = SCHEMA_REV;
  return client;
}

/** Always resolves through getClient so schema bumps refresh a stale singleton. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
