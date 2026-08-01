import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seedProducts = [
  {
    name: "Himalayan Black Cardamom",
    slug: "himalayan-black-cardamom",
    description:
      "Sun-dried black cardamom from mid-hill farms. Smoky, resinous aroma for dals, meats, and chai. Packed in sealed pouches to keep the pods whole.",
    price: 850,
    unit: "100 g",
    imageUrl:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=80",
    category: "Spices",
    stock: 40,
  },
  {
    name: "Organic Mountain Honey",
    slug: "organic-mountain-honey",
    description:
      "Raw multifloral honey from apiaries above 1,800m. Unheated and unfiltered, with a floral finish.",
    price: 1200,
    unit: "500 g",
    imageUrl:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&q=80",
    category: "Honey",
    stock: 25,
  },
  {
    name: "Stone-Ground Buckwheat Flour",
    slug: "stone-ground-buckwheat-flour",
    description:
      "Local buckwheat milled on stone for soft dhido and pancakes. Nutty flavour, high in fibre.",
    price: 450,
    unit: "1 kg",
    imageUrl:
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80",
    category: "Grains",
    stock: 60,
  },
  {
    name: "Sun-Dried Timur Berries",
    slug: "sun-dried-timur-berries",
    description:
      "Nepali Sichuan pepper (timur) with citrus heat and a lingering tingle. Toast lightly before grinding.",
    price: 650,
    unit: "50 g",
    imageUrl:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=80",
    category: "Spices",
    stock: 35,
  },
  {
    name: "Cold-Pressed Mustard Oil",
    slug: "cold-pressed-mustard-oil",
    description:
      "Traditional ghani-pressed mustard oil for cooking and pickling. Strong aroma, golden colour.",
    price: 780,
    unit: "1 L",
    imageUrl:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&q=80",
    category: "Oils",
    stock: 30,
  },
  {
    name: "Red Rice from the Hills",
    slug: "red-rice-from-the-hills",
    description:
      "Heirloom red rice grown on terraced slopes. Earthy aroma and firm grain.",
    price: 520,
    unit: "1 kg",
    imageUrl:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200&q=80",
    category: "Grains",
    stock: 50,
  },
];

async function main() {
  for (const product of seedProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
