import type { Metadata } from "next";
import { shopConfig } from "@/lib/shop";

/** Canonical site origin — set NEXT_PUBLIC_SITE_URL in production */
export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "https://tapariagro.com.np";
  const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProto.replace(/\/$/, "");
}

export const siteSeo = {
  name: shopConfig.name,
  legalName: "Tapari Agro",
  tagline: shopConfig.tagline,
  locale: "en_NP",
  defaultTitle:
    "Tapari Agro — Organic Spices, Grains & Honey from Nepal Hills",
  defaultDescription:
    "Buy fresh organic kitchen staples from Parbat, Myagdi & Mustang. Direct from kishan to home — Kathmandu Valley delivery. Order online or call / WhatsApp.",
  keywords: [
    "Tapari Agro",
    "organic spices Nepal",
    "organic honey Nepal",
    "hill rice Nepal",
    "Parbat Myagdi Mustang",
    "Kathmandu organic grocery",
    "timur cardamom mustard oil",
    "order by WhatsApp Nepal",
    "टपरी एग्रो",
  ],
  ogImage: "/images/tapari-logo-badge.jpg",
  logo: "/images/tapari-logo-mark.jpg",
} as const;

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
  keywords,
}: {
  title?: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
}): Metadata {
  const url = absoluteUrl(path);
  const pageTitle = title ? `${title} · ${siteSeo.name}` : siteSeo.defaultTitle;
  const ogImages = image
    ? [
        {
          url: absoluteUrl(image),
          width: 1200,
          height: 630,
          alt: title || siteSeo.name,
        },
      ]
    : undefined;

  return {
    title,
    description,
    keywords: keywords ?? [...siteSeo.keywords],
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: siteSeo.locale,
      url,
      siteName: siteSeo.name,
      title: pageTitle,
      description,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      ...(image ? { images: [absoluteUrl(image)] } : {}),
    },
  };
}

/** FAQ schema — helps rich results for order/help queries */
export function faqJsonLd(
  faqs: { question: string; answer: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function organizationJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness", "Store"],
    "@id": `${url}/#organization`,
    name: siteSeo.legalName,
    alternateName: ["टपरी एग्रो", "Tapari Agro Nepal"],
    url,
    logo: absoluteUrl(siteSeo.logo),
    image: absoluteUrl(siteSeo.ogImage),
    description: siteSeo.defaultDescription,
    telephone: `+977${shopConfig.phoneTel.replace(/^977/, "")}`,
    areaServed: [
      { "@type": "AdministrativeArea", name: "Kathmandu Valley" },
      { "@type": "Country", name: "Nepal" },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "NP",
      addressRegion: "Bagmati",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: `+977${shopConfig.phoneTel.replace(/^977/, "")}`,
        availableLanguage: ["English", "Nepali"],
        areaServed: "NP",
      },
      {
        "@type": "ContactPoint",
        contactType: "sales",
        url: `https://wa.me/${shopConfig.whatsapp}`,
        availableLanguage: ["English", "Nepali"],
      },
    ],
    sameAs: [],
    priceRange: "Rs",
    currenciesAccepted: "NPR",
    paymentAccepted: "Cash on delivery, QR payment, Bank deposit",
    knowsAbout: [
      "Organic spices",
      "Mountain honey",
      "Hill grains",
      "Cold-pressed oils",
      "Parbat",
      "Myagdi",
      "Mustang",
    ],
  };
}

export function websiteJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: siteSeo.name,
    description: siteSeo.defaultDescription,
    publisher: { "@id": `${url}/#organization` },
    inLanguage: "en-NP",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd(post: {
  title: string;
  slug: string;
  excerpt: string;
  body: string[];
  image: string;
  date: string;
  category: string;
}) {
  const url = absoluteUrl(`/blogs/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: [post.image.startsWith("http") ? post.image : absoluteUrl(post.image)],
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: siteSeo.name,
    },
    publisher: {
      "@type": "Organization",
      name: siteSeo.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteSeo.logo),
      },
    },
    mainEntityOfPage: url,
    articleSection: post.category,
    articleBody: post.body.join("\n\n"),
    inLanguage: "en-NP",
  };
}

export function productJsonLd(product: {
  name: string;
  slug: string;
  description: string;
  price: string;
  unit: string;
  stockStatus: string;
  images: { src: string; alt: string }[];
  categories: { name: string }[];
}) {
  const url = absoluteUrl(`/shop/${product.slug}`);
  const image = product.images[0]?.src
    ? product.images[0].src.startsWith("http")
      ? product.images[0].src
      : absoluteUrl(product.images[0].src)
    : absoluteUrl(siteSeo.ogImage);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    sku: product.slug,
    url,
    image: [image],
    brand: {
      "@type": "Brand",
      name: siteSeo.name,
    },
    category: product.categories[0]?.name,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NPR",
      price: product.price,
      availability:
        product.stockStatus === "instock"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: siteSeo.name,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "NP",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 2,
            unitCode: "DAY",
          },
        },
      },
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Unit",
        value: product.unit,
      },
    ],
  };
}
