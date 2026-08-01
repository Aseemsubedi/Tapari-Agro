import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogBySlug, getBlogPosts } from "@/lib/blogs";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) return { title: "Blog" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-28 pt-12 sm:px-8 sm:pt-16">
      <Link
        href="/blogs"
        className="text-[13px] font-medium text-ink/40 transition hover:text-ink"
      >
        ← Blogs
      </Link>

      <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-leaf">
        {post.category} ·{" "}
        {new Date(post.date).toLocaleDateString("en-NP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
        {post.title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/60">
        {post.excerpt}
      </p>

      <div className="relative mt-8 aspect-[16/10] overflow-hidden bg-mist">
        <Image
          src={post.image}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>

      <div className="mt-10 space-y-5 text-[15px] leading-relaxed text-ink/70 sm:text-base">
        {post.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-12 border-t border-pine/10 pt-8">
        <Link
          href="/shop"
          className="inline-flex min-h-11 items-center bg-pine px-5 text-sm font-semibold tracking-wide text-chalk transition hover:bg-pine/90"
        >
          Shop products
        </Link>
      </div>
    </article>
  );
}
