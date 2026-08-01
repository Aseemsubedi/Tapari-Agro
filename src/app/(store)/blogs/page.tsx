import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getBlogPosts } from "@/lib/blogs";

export const metadata: Metadata = {
  title: "Blogs",
  description:
    "Farm stories, kitchen tips, and organic staples from Tapari Agro.",
};

export default function BlogsPage() {
  const posts = getBlogPosts();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-12 sm:px-8 sm:pt-16">
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
            <Link
              href={`/blogs/${post.slug}`}
              className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                <Image
                  src={post.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-leaf">
                {post.category} ·{" "}
                {new Date(post.date).toLocaleDateString("en-NP", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-pine">
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
