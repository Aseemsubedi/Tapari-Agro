import Image from "next/image";
import Link from "next/link";
import { getBlogPosts } from "@/lib/blogs";

export function HomeBlogs() {
  const posts = getBlogPosts().slice(0, 3);

  return (
    <section id="blogs" className="scroll-mt-24 border-t border-pine/8 bg-chalk">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
        <header className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brass">
              Stories
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-leaf sm:text-4xl">
              Blogs
            </h2>
          </div>
          <Link
            href="/blogs"
            className="text-[13px] font-medium text-pine underline-offset-4 hover:underline"
          >
            See all
          </Link>
        </header>

        <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
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
                  {post.category}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink transition group-hover:text-pine">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/55">
                  {post.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
