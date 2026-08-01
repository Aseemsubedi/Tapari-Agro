import { Hero } from "@/components/hero";
import { EasyOrderHelp } from "@/components/easy-order-help";
import { CategoryCircles } from "@/components/category-circles";
import { KishanPromise } from "@/components/kishan-promise";
import { HomeShop } from "@/components/home-shop";
import { HomeBlogs } from "@/components/home-blogs";
import { getProducts } from "@/lib/catalog";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      <Hero />
      <EasyOrderHelp />
      <HomeShop products={products} />
      <KishanPromise />
      <CategoryCircles />
      <HomeBlogs />
    </>
  );
}
