import { JsonLd } from "@/components/json-ld";
import { ShopBrowser } from "@/components/shop-browser";
import { getProducts } from "@/lib/catalog";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Shop organic spices, grains & honey",
  description:
    "Browse organic spices, hill rice, honey, mustard oil and kitchen staples from Parbat, Myagdi & Mustang. Search and order online — Kathmandu Valley delivery.",
  path: "/shop",
  keywords: [
    "organic shop Nepal",
    "buy spices online Kathmandu",
    "organic honey Nepal",
    "mustard oil Nepal",
    "hill rice Nepal",
    "Tapari Agro shop",
  ],
});

type Props = {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const { category, q } = await searchParams;
  const products = await getProducts();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tapari Agro Shop",
    description:
      "Organic kitchen staples from Parbat, Myagdi and Mustang hills.",
    url: absoluteUrl("/shop"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 40).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/shop/${product.slug}`),
        name: product.name,
      })),
    },
  };

  return (
    <div className="bg-[#f6f7f9]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
          ]),
          itemList,
        ]}
      />
      <h1 className="sr-only">Shop organic staples</h1>
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-8 sm:py-7">
        <ShopBrowser
          products={products}
          initialCategory={category ?? "All"}
          initialQuery={q ?? ""}
        />
      </div>
    </div>
  );
}
