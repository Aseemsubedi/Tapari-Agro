import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { formatRate } from "@/lib/format";
import { getProductBySlug, getProducts } from "@/lib/catalog";
import { ProductTile } from "@/components/product-tile";
import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const image = product.images[0];
  const category = product.categories[0]?.name;
  const rate = formatRate(product.price, product.unit);
  const wa = whatsappLink(
    `Hello — I'd like to order: ${product.name} (${rate.amount} ${rate.unitLabel})`,
  );

  const related = (await getProducts())
    .filter((p) => p.id !== product.id)
    .filter((p) =>
      category ? p.categories[0]?.name === category : true,
    )
    .slice(0, 4);

  const relatedFallback =
    related.length > 0
      ? related
      : (await getProducts())
          .filter((p) => p.id !== product.id)
          .slice(0, 4);

  return (
    <div className="pb-28">
      <div className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-8 sm:pt-12">
        <Link
          href="/shop"
          className="text-[13px] font-medium tracking-wide text-ink/40 transition hover:text-ink"
        >
          ← Back to shop
        </Link>

        <div className="mt-6 grid gap-8 sm:mt-8 sm:gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden bg-mist ring-1 ring-pine/10 sm:max-w-md lg:mx-0 lg:max-w-none">
            {image ? (
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 1024px) 80vw, 480px"
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
              <span className="font-display text-4xl font-extrabold leading-none tracking-tight text-pine tabular-nums sm:text-5xl">
                {rate.amount}
              </span>
              <span className="text-base font-semibold tracking-wide text-ink/55 sm:text-lg">
                {rate.unitLabel}
              </span>
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
            <div className="craft-rule my-8 max-w-[10rem]" />
            <p className="max-w-md whitespace-pre-line text-sm leading-relaxed text-ink/60">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {relatedFallback.length > 0 ? (
        <section className="mx-auto mt-16 w-full max-w-5xl border-t border-pine/8 px-4 pt-12 sm:mt-20 sm:px-8 sm:pt-14">
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-pine">
            More staples
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
            {relatedFallback.map((item) => (
              <ProductTile key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
