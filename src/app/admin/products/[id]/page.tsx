import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { prisma } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Edit product</h1>
      <ProductForm product={product} />
    </div>
  );
}
