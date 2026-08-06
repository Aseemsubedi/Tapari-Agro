import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
fs.mkdirSync(dataDir, { recursive: true });
// Always absolute — Prisma resolves file:./ relative to prisma/
const url = `file:${path.join(dataDir, "prod.db")}`;
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

const seedCategories = [
  "Spices",
  "Honey",
  "Grains",
  "Oils",
  "Tea",
  "Pulses",
  "Dried foods",
  "Other",
];

const seedUnits = [
  "50 g",
  "100 g",
  "200 g",
  "250 g",
  "500 g",
  "1 kg",
  "2 kg",
  "1 L",
  "500 ml",
  "250 ml",
  "1 pack",
  "1 piece",
  "12 pcs",
];

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  price: number;
  costPrice: number;
  unit: string;
  imageUrl: string;
  category: string;
  stock: number;
  inventoryMode: "owned" | "digital";
  digitalAvailable?: number;
  sellerUnitCost?: number;
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=800&q=85`;

/** Owned warehouse stock (12+) */
const ownedProducts: SeedProduct[] = [
  {
    name: "Himalayan Black Cardamom",
    slug: "himalayan-black-cardamom",
    description:
      "Sun-dried black cardamom from mid-hill farms. Smoky, resinous aroma for dals, meats, and chai. Packed in sealed pouches to keep the pods whole.",
    price: 850,
    costPrice: 520,
    unit: "100 g",
    imageUrl: img("photo-1596040033229-a9821ebd058d"),
    category: "Spices",
    stock: 40,
    inventoryMode: "owned",
  },
  {
    name: "Organic Mountain Honey",
    slug: "organic-mountain-honey",
    description:
      "Raw multifloral honey from apiaries above 1,800m. Unheated and unfiltered, with a floral finish.",
    price: 1200,
    costPrice: 750,
    unit: "500 g",
    imageUrl: img("photo-1587049352846-4a222e784d38"),
    category: "Honey",
    stock: 28,
    inventoryMode: "owned",
  },
  {
    name: "Stone-Ground Buckwheat Flour",
    slug: "stone-ground-buckwheat-flour",
    description:
      "Local buckwheat milled on stone for soft dhido and pancakes. Nutty flavour, high in fibre.",
    price: 450,
    costPrice: 280,
    unit: "1 kg",
    imageUrl: img("photo-1574323347407-f5e1ad6d020b"),
    category: "Grains",
    stock: 55,
    inventoryMode: "owned",
  },
  {
    name: "Sun-Dried Timur Berries",
    slug: "sun-dried-timur-berries",
    description:
      "Nepali Sichuan pepper (timur) with citrus heat and a lingering tingle. Toast lightly before grinding.",
    price: 650,
    costPrice: 400,
    unit: "50 g",
    imageUrl: img("photo-1509358271058-acd22cc93898"),
    category: "Spices",
    stock: 35,
    inventoryMode: "owned",
  },
  {
    name: "Cold-Pressed Mustard Oil",
    slug: "cold-pressed-mustard-oil",
    description:
      "Traditional ghani-pressed mustard oil for cooking and pickling. Strong aroma, golden colour.",
    price: 780,
    costPrice: 490,
    unit: "1 L",
    imageUrl: img("photo-1474979266404-7eaacbcd87c5"),
    category: "Oils",
    stock: 30,
    inventoryMode: "owned",
  },
  {
    name: "Red Rice from the Hills",
    slug: "red-rice-from-the-hills",
    description:
      "Heirloom red rice grown on terraced slopes. Earthy aroma and firm grain — rinse once before cooking.",
    price: 520,
    costPrice: 320,
    unit: "1 kg",
    imageUrl: img("photo-1586201375761-83865001e31c"),
    category: "Grains",
    stock: 50,
    inventoryMode: "owned",
  },
  {
    name: "Jumla Marcy Rice",
    slug: "jumla-marcy-rice",
    description:
      "High-altitude aromatic rice from Jumla. Soft texture, gentle fragrance — ideal for everyday bhat.",
    price: 480,
    costPrice: 300,
    unit: "1 kg",
    imageUrl: img("photo-1536304993881-ff69d0c23f6d"),
    category: "Grains",
    stock: 42,
    inventoryMode: "owned",
  },
  {
    name: "Hand-Rolled Ginger Tea",
    slug: "hand-rolled-ginger-tea",
    description:
      "Sun-dried ginger slices blended with local tea leaf. Warm, spicy cup for cold mornings.",
    price: 390,
    costPrice: 220,
    unit: "100 g",
    imageUrl: img("photo-1564890369478-c89ca6d9cde9"),
    category: "Tea",
    stock: 48,
    inventoryMode: "owned",
  },
  {
    name: "Orthodox Leaf Tea — Ilam",
    slug: "orthodox-leaf-tea-ilam",
    description:
      "Whole-leaf orthodox tea from Ilam gardens. Bright liquor, floral finish — brew 3 minutes.",
    price: 720,
    costPrice: 450,
    unit: "250 g",
    imageUrl: img("photo-1576092768241-dec231879fc3"),
    category: "Tea",
    stock: 36,
    inventoryMode: "owned",
  },
  {
    name: "Yellow Split Lentils (Mung)",
    slug: "yellow-split-lentils-mung",
    description:
      "Cleaned split mung dal for quick soups and khichadi. Soft cook, mild flavour.",
    price: 280,
    costPrice: 175,
    unit: "1 kg",
    imageUrl: img("photo-1586201375761-83865001e31c"),
    category: "Pulses",
    stock: 70,
    inventoryMode: "owned",
  },
  {
    name: "Black Mass Lentils",
    slug: "black-mass-lentils",
    description:
      "Whole black mass (urad) from hill farms. Rich gravy dal — soak 30 minutes before cooking.",
    price: 320,
    costPrice: 200,
    unit: "1 kg",
    imageUrl: img("photo-1516684669134-de6f7c473a2a"),
    category: "Pulses",
    stock: 45,
    inventoryMode: "owned",
  },
  {
    name: "Roasted Soybean Flour",
    slug: "roasted-soybean-flour",
    description:
      "Lightly roasted soybean (bhatmas) flour for porridge and ladoo. Nutty, protein-rich.",
    price: 360,
    costPrice: 210,
    unit: "500 g",
    imageUrl: img("photo-1606313564200-e75d5e30476c"),
    category: "Grains",
    stock: 38,
    inventoryMode: "owned",
  },
];

/** Digital / supplier-held stock (10) — packed to order from kishan lots */
const digitalProducts: SeedProduct[] = [
  {
    name: "Parbat Timur Pickle Masala",
    slug: "parbat-timur-pickle-masala",
    description:
      "House blend of timur, chilli, and mustard for achar. Supplier-packed to order — fresh grind each week.",
    price: 420,
    costPrice: 0,
    sellerUnitCost: 260,
    unit: "100 g",
    imageUrl: img("photo-1596040033229-a9821ebd058d"),
    category: "Spices",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 40,
  },
  {
    name: "Wild Bee Honey — Myagdi",
    slug: "wild-bee-honey-myagdi",
    description:
      "Dark forest honey from Myagdi cliffs. Thick pour, caramel notes. Held with the beekeeper until you order.",
    price: 1650,
    costPrice: 0,
    sellerUnitCost: 1100,
    unit: "500 g",
    imageUrl: img("photo-1558642452-9d2a7deb7f62"),
    category: "Honey",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 18,
  },
  {
    name: "Mustang Apple Chips",
    slug: "mustang-apple-chips",
    description:
      "Sun-dried apple slices from Mustang orchards. No sugar added — crisp, lightly tart snack.",
    price: 550,
    costPrice: 0,
    sellerUnitCost: 340,
    unit: "200 g",
    imageUrl: img("photo-1560806887-1e4cd0b6cbd6"),
    category: "Dried foods",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 32,
  },
  {
    name: "Hand-Churned Ghee",
    slug: "hand-churned-ghee",
    description:
      "Village ghee from grass-fed milk. Golden, nutty aroma for dal and roti. Supplier lot — pack on confirm.",
    price: 1400,
    costPrice: 0,
    sellerUnitCost: 980,
    unit: "500 g",
    imageUrl: img("photo-1628088062850-9d4e3f4b8f3a"),
    category: "Oils",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 22,
  },
  {
    name: "Dried Jimbu Herb",
    slug: "dried-jimbu-herb",
    description:
      "Himalayan jimbu (allium) for tempering dal and achar. Fragile aroma — we pack just before dispatch.",
    price: 380,
    costPrice: 0,
    sellerUnitCost: 230,
    unit: "50 g",
    imageUrl: img("photo-1512621776951-a57141f2eefd"),
    category: "Spices",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 55,
  },
  {
    name: "Stone-Milled Corn Flour",
    slug: "stone-milled-corn-flour",
    description:
      "Fresh yellow corn (makai) flour for roti and porridge. Milled in small batches by the miller.",
    price: 290,
    costPrice: 0,
    sellerUnitCost: 180,
    unit: "1 kg",
    imageUrl: img("photo-1606851092258-1d0c2b3c8e0f"),
    category: "Grains",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 60,
  },
  {
    name: "Large Cardamom Pods — Ilam",
    slug: "large-cardamom-pods-ilam",
    description:
      "Premium large cardamom from Ilam. Whole pods, deep brown — for biryani and meat curries.",
    price: 980,
    costPrice: 0,
    sellerUnitCost: 620,
    unit: "100 g",
    imageUrl: img("photo-1596040033229-a9821ebd058d"),
    category: "Spices",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 28,
  },
  {
    name: "Nettle Leaf Powder",
    slug: "nettle-leaf-powder",
    description:
      "Shade-dried sisnu (nettle) powder for soup and saag. Mineral-rich — stir into hot water or curry.",
    price: 340,
    costPrice: 0,
    sellerUnitCost: 200,
    unit: "100 g",
    imageUrl: img("photo-1540420773420-3366772f4999"),
    category: "Dried foods",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 35,
  },
  {
    name: "Cold-Pressed Walnut Oil",
    slug: "cold-pressed-walnut-oil",
    description:
      "Delicate walnut oil from hill orchards. Finish salads and roti — do not deep fry. Limited lot.",
    price: 1850,
    costPrice: 0,
    sellerUnitCost: 1280,
    unit: "250 ml",
    imageUrl: img("photo-1474979266404-7eaacbcd87c5"),
    category: "Oils",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 14,
  },
  {
    name: "Fermented Gundruk Mix",
    slug: "fermented-gundruk-mix",
    description:
      "Sun-dried fermented leafy greens (gundruk) ready for soup. Tangy, savoury — classic hill comfort.",
    price: 310,
    costPrice: 0,
    sellerUnitCost: 185,
    unit: "200 g",
    imageUrl: img("photo-1512621776951-a57141f2eefd"),
    category: "Dried foods",
    stock: 0,
    inventoryMode: "digital",
    digitalAvailable: 44,
  },
];

const seedProducts = [...ownedProducts, ...digitalProducts];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedCatalog(client: PrismaClient = prisma) {
  console.log(
    `Seeding ${seedProducts.length} products (${ownedProducts.length} owned · ${digitalProducts.length} digital)…`,
  );

  for (let i = 0; i < seedCategories.length; i++) {
    const name = seedCategories[i]!;
    await client.category.upsert({
      where: { name },
      update: { sortOrder: i },
      create: { name, slug: slugify(name), sortOrder: i },
    });
  }

  for (let i = 0; i < seedUnits.length; i++) {
    const name = seedUnits[i]!;
    await client.unit.upsert({
      where: { name },
      update: { sortOrder: i },
      create: { name, sortOrder: i },
    });
  }

  const vendor = await client.vendor.upsert({
    where: { name: "Hill Kishan Collective" },
    update: {
      phone: "9857620569",
      address: "Parbat · Myagdi · Mustang supply network",
      note: "Primary digital / packed-to-order supplier for seed catalog",
    },
    create: {
      name: "Hill Kishan Collective",
      phone: "9857620569",
      address: "Parbat · Myagdi · Mustang supply network",
      note: "Primary digital / packed-to-order supplier for seed catalog",
    },
  });

  for (const product of seedProducts) {
    const isDigital = product.inventoryMode === "digital";
    const data = {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      costPrice: isDigital ? 0 : product.costPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      category: product.category,
      stock: isDigital ? 0 : product.stock,
      inventoryMode: product.inventoryMode,
      digitalAvailable: isDigital ? product.digitalAvailable ?? 0 : 0,
      sellerUnitCost: isDigital ? product.sellerUnitCost ?? 0 : 0,
      sellerVendorId: isDigital ? vendor.id : null,
      published: true,
      sellOnline: true,
      sellOffline: true,
    };

    const row = await client.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: data,
    });

    await client.productVendor.upsert({
      where: {
        productId_vendorId: { productId: row.id, vendorId: vendor.id },
      },
      update: {},
      create: { productId: row.id, vendorId: vendor.id },
    });

    if (isDigital) {
      const qty = product.digitalAvailable ?? 0;
      const unitCost = product.sellerUnitCost ?? 0;
      const existing = await client.stockPurchase.findFirst({
        where: {
          productId: row.id,
          vendorId: vendor.id,
          stockKind: "digital",
          billNo: `SEED-DIGITAL-${product.slug}`,
        },
      });

      if (existing) {
        await client.stockPurchase.update({
          where: { id: existing.id },
          data: {
            quantity: qty,
            remainingQty: qty,
            unitCost,
            paid: true,
            amountPaid: qty * unitCost,
            payMethod: "cash",
          },
        });
      } else {
        await client.stockPurchase.create({
          data: {
            batchId: `seed-digital-${Date.now()}`,
            productId: row.id,
            vendorId: vendor.id,
            billNo: `SEED-DIGITAL-${product.slug}`,
            quantity: qty,
            remainingQty: qty,
            stockKind: "digital",
            unitCost,
            amountPaid: qty * unitCost,
            paid: true,
            payMethod: "cash",
            note: "Seed digital lot — supplier-held",
          },
        });
      }

      // Keep product.digitalAvailable / mode in sync with lots
      const lots = await client.stockPurchase.findMany({
        where: {
          productId: row.id,
          stockKind: "digital",
          remainingQty: { gt: 0 },
        },
      });
      const digitalAvailable = lots.reduce((s, l) => s + l.remainingQty, 0);
      await client.product.update({
        where: { id: row.id },
        data: {
          digitalAvailable,
          inventoryMode: digitalAvailable > 0 ? "digital" : "owned",
          sellerVendorId: vendor.id,
          sellerUnitCost: unitCost,
          stock: 0,
        },
      });
    }
  }

  // Ensure a published Local Product home section lists a mix
  let section = await client.homeSection.findFirst({
    where: { title: "Local Product" },
  });
  if (!section) {
    section = await client.homeSection.create({
      data: {
        title: "Local Product",
        eyebrow: "From the hills",
        sortOrder: 0,
        published: true,
      },
    });
  }

  const featured = await client.product.findMany({
    where: {
      slug: {
        in: [
          "sun-dried-timur-berries",
          "stone-ground-buckwheat-flour",
          "organic-mountain-honey",
          "red-rice-from-the-hills",
          "wild-bee-honey-myagdi",
          "mustang-apple-chips",
          "dried-jimbu-herb",
          "hand-churned-ghee",
        ],
      },
    },
    select: { id: true, slug: true },
  });

  for (let i = 0; i < featured.length; i++) {
    const p = featured[i]!;
    await client.homeSectionProduct.upsert({
      where: {
        sectionId_productId: { sectionId: section.id, productId: p.id },
      },
      update: { sortOrder: i },
      create: {
        sectionId: section.id,
        productId: p.id,
        sortOrder: i,
      },
    });
  }

  const owned = await client.product.count({
    where: { inventoryMode: "owned" },
  });
  const digital = await client.product.count({
    where: { inventoryMode: "digital" },
  });
  const hybrid = await client.product.count({
    where: { inventoryMode: "hybrid" },
  });
  console.log(
    `Done. Catalog: ${owned + digital + hybrid} products (owned=${owned}, digital=${digital}, hybrid=${hybrid}).`,
  );
}

export { seedCatalog };

async function main() {
  await seedCatalog(prisma);
}

// Only auto-run when executed as a script (not when imported by Next).
const invoked =
  typeof process.argv[1] === "string" &&
  /seed\.(ts|js|mjs|cjs)$/.test(process.argv[1].replace(/\\/g, "/"));

if (invoked) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
