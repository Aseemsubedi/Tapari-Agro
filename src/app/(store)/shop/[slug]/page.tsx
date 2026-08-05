import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { JsonLd } from "@/components/json-ld";
import { LocalProductAvailabilityNotice } from "@/components/local-product-availability-notice";
import { ProtectedProductImage } from "@/components/protected-product-image";
import { SuggestedProducts } from "@/components/suggested-products";
import { formatRate } from "@/lib/format";
import { getProductBySlug, getProducts } from "@/lib/catalog";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  productJsonLd,
  siteSeo,
} from "@/lib/seo";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return buildPageMetadata({
      title: "Product not found",
      description: siteSeo.defaultDescription,
      path: `/shop/${slug}`,
      noIndex: true,
    });
  }

  const category = product.categories[0]?.name;
  const rate = formatRate(product.price, product.unit);
  const blurb =
    product.shortDescription?.trim() ||
    product.description?.trim().slice(0, 140) ||
    `Buy ${product.name} from Tapari Agro.`;
  const description = `${blurb} ${rate.full}${
    category ? ` · ${category}` : ""
  }. Organic from Nepal hills — order online or WhatsApp.`;

  return buildPageMetadata({
    title: product.name,
    description: description.slice(0, 160),
    path: `/shop/${product.slug}`,
    image: product.images[0]?.src,
    keywords: [
      product.name,
      category ?? "organic grocery",
      "Tapari Agro",
      "organic Nepal",
      "buy online Kathmandu",
    ].filter(Boolean) as string[],
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const allProducts = await getProducts();
  const image = product.images[0];
  const category = product.categories[0]?.name;
  const rate = formatRate(product.price, product.unit);
  const wa = whatsappLink(
    `Hello — I'd like to order: ${product.name} (${rate.full})`,
  );

  return (
    <div className="bg-white">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name: product.name, path: `/shop/${product.slug}` },
          ]),
          productJsonLd(product),
        ]}
      />
      <div className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-8 sm:pt-12">
        <Link
          href="/shop"
          className="text-[13px] font-medium tracking-wide text-ink/40 transition hover:text-ink"
        >
          ← Back to shop
        </Link>

        <div className="mt-6 grid gap-8 pb-12 sm:mt-8 sm:gap-10 lg:grid-cols-2 lg:items-start lg:gap-14 lg:pb-16">
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden bg-mist ring-1 ring-pine/10 sm:max-w-md lg:mx-0 lg:max-w-none">
            {image ? (
              <ProtectedProductImage
                src={image.src}
                alt={image.alt}
                fill
                priority
                watermark="lg"
                className="object-cover object-center"
                sizes="(max-width: 1024px) 80vw, 480px"
                quality={90}
              />
            ) : null}
          </div>

          <div className="lg:pt-3">
            {category ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-leaf">
                {category}
              </p>
            ) : null}
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-lg font-bold tracking-wide text-pine sm:text-xl">
                {rate.prefix}
              </span>
              <span className="text-4xl font-extrabold leading-none tracking-tight text-pine tabular-nums sm:text-5xl">
                {rate.amount}
              </span>
              {rate.unitLabel ? (
                <span className="text-base font-semibold tracking-wide text-ink/50 sm:text-lg">
                  {rate.unitLabel}
                </span>
              ) : null}
            </p>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/60">
              {product.shortDescription}
            </p>
            <div className="mt-8">
              <AddToCartButton product={product} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center border border-pine/15 px-4 text-[12px] font-semibold tracking-wide text-pine transition hover:border-brass hover:bg-brass/10"
              >
                WhatsApp
              </a>
              <a
                href={callLink()}
                className="inline-flex min-h-10 items-center border border-pine/15 px-4 text-[12px] font-medium tracking-wide text-ink/55 transition hover:border-brass hover:text-pine"
              >
                फोन {shopConfig.phoneDisplay}
              </a>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-ink/40">
              Packed to order · phone confirm · COD available
            </p>
            <LocalProductAvailabilityNotice className="mt-4 max-w-md" />
            <div className="craft-rule my-8 max-w-[10rem]" />
            <p className="max-w-md whitespace-pre-line text-sm leading-relaxed text-ink/60">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      <SuggestedProducts
        products={allProducts}
        excludeIds={[product.id]}
        title="Suggested products"
      />
    </div>
  );
}
