export type ProductImage = {
  id: number;
  src: string;
  alt: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: string;
  unit: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  description: string;
  shortDescription: string;
  images: ProductImage[];
  stockStatus: "instock" | "outofstock" | "onbackorder";
  categories: { id: number; name: string; slug: string }[];
};

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  quantity: number;
  price: string;
  image?: string;
  slug: string;
};

export type Cart = {
  items: CartItem[];
  totalItems: number;
  totalPrice: string;
};
