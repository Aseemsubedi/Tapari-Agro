import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { getBlogPosts } from "@/lib/blogs";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Farm stories & kitchen tips",
  description:
    "Read Tapari Agro stories — direct-from-kishan farming, organic Nepali spices, and highland honey tips for your kitchen.",
  path: "/blogs",
  keywords: [
    "Tapari Agro blog",
    "organic Nepal farm stories",
    "Nepali spice tips",
    "mountain honey Nepal",
  ],
});

export default function BlogsPage() {
  const posts = getBlogPosts();

  const listLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Tapari Agro Blog",
    url: absoluteUrl("/blogs"),
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absoluteUrl(`/blogs/${post.slug}`),
      datePublished: post.date,
      description: post.excerpt,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-12 sm:px-8 sm:pt-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blogs", path: "/blogs" },
          ]),
          listLd,
        ]}
      />
      <header className="mb-10 max-w-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brass">
          Stories
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Blogs
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/55">
          From the hills to your kitchen — notes on organic staples and kishan
          stories.
        </p>
      </header>

      <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blogs/${post.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                <Image
                  src={post.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-leaf">
                {post.category}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-ink group-hover:text-pine">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                {post.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
