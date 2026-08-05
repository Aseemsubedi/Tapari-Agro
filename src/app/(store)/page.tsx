import { EasyOrderHelp } from "@/components/easy-order-help";
import { HomePromos } from "@/components/home-promos";
import { JsonLd } from "@/components/json-ld";
import { KishanPromise } from "@/components/kishan-promise";
import { HomeShop } from "@/components/home-shop";
import { getHomeShopSections } from "@/lib/catalog";
import { buildPageMetadata, faqJsonLd, siteSeo } from "@/lib/seo";
import { shopConfig } from "@/lib/shop";

export const metadata = buildPageMetadata({
  description: siteSeo.defaultDescription,
  path: "/",
  keywords: [
    ...siteSeo.keywords,
    "buy organic spices Kathmandu",
    "organic mustard oil Nepal",
    "farm fresh staples delivery",
  ],
});

export default async function HomePage() {
  const sections = await getHomeShopSections();

  return (
    <>
      <JsonLd
        data={faqJsonLd([
          {
            question: "How do I order from Tapari Agro?",
            answer:
              "Browse the shop and add items to your cart, or call / WhatsApp us and we will take your order by phone. We pack to order and deliver in Kathmandu Valley.",
          },
          {
            question: "Can I order by phone or WhatsApp?",
            answer: `Yes. Call ${shopConfig.phoneDisplay} or message us on WhatsApp. Tell us what you need — we confirm, pack, and send.`,
          },
          {
            question: "Where do Tapari Agro products come from?",
            answer:
              "Our organic spices, grains, honey and oils come from hill farmers in Parbat, Myagdi and Mustang, Nepal — sourced direct from kishan.",
          },
          {
            question: "Do you offer cash on delivery?",
            answer:
              "Yes. At checkout you can choose Cash on delivery, QR payment, or Bank deposit. We confirm every order by phone before packing.",
          },
        ])}
      />
      <HomePromos />
      <EasyOrderHelp />
      <HomeShop sections={sections} />
      <KishanPromise />
    </>
  );
}
