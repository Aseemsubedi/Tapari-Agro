export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  image: string;
  date: string;
  category: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "direct-from-kishan",
    title: "Why direct from kishan matters",
    excerpt:
      "When produce travels from hill farms to your kitchen without a long middle chain, freshness and fair pay stay intact.",
    body: [
      "Tapari Agro works with farmers from Parbat (Jaljala), Myagdi, and Mustang. Cutting out unnecessary middlemen means better quality for you and a fairer share for the kishan.",
      "Every order is packed with care — hygienic handling, sealed packaging, and delivery arranged after we confirm by phone.",
      "This is not factory-finished stock. It is hill harvest, chosen for freshness and honesty.",
    ],
    image:
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80",
    date: "2026-07-12",
    category: "Farm story",
  },
  {
    slug: "organic-spices-nepal",
    title: "Organic spices from the hills",
    excerpt:
      "Timur, cardamom, and sun-dried spices carry the aroma of mid-hill farms when they are handled with care.",
    body: [
      "Nepali spices are prized for aroma and heat. We source whole pods and berries so flavour stays locked in until you cook.",
      "Store spices in a cool, dry place. Toast lightly before grinding for the brightest taste.",
      "Ask us if you need help choosing the right spice for dal, pickle, or chai.",
    ],
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=80",
    date: "2026-06-28",
    category: "Kitchen tips",
  },
  {
    slug: "honey-from-highlands",
    title: "Raw honey from highland apiaries",
    excerpt:
      "Unheated, unfiltered mountain honey keeps its floral character — a pantry staple for tea and everyday wellness.",
    body: [
      "Our mountain honey comes from apiaries above the valley heat. It is packed raw so enzymes and aroma are not stripped away.",
      "A spoon in warm water or drizzle on roti is enough. No need to cook it hard.",
      "If crystallisation appears, that is natural — gently warm the jar in water, never boil.",
    ],
    image:
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=1200&q=80",
    date: "2026-06-10",
    category: "Products",
  },
];

export function getBlogPosts(): BlogPost[] {
  return blogPosts;
}

export function getBlogBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
