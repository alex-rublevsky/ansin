export type VariationSnapshot = {
  id: number;
  weight: number;
  price: number;
};

export type ProductItem = {
  /** String form of the variation's id — globally unique, stable identity for a cart line. */
  id: string;
  productId: string;
  variationId: number;
  variationWeight: number;
  volume: number;
  slug: string;
  image: string;
  name: string;
  price: number;
};

export type CartItem = ProductItem & { qty: number };

export function toCartLine(
  product: {
    id: string | number;
    slug: string;
    name: string;
    image: string;
    volume: number;
  },
  variation: VariationSnapshot,
): ProductItem {
  return {
    id: String(variation.id),
    productId: String(product.id),
    variationId: variation.id,
    variationWeight: variation.weight,
    volume: product.volume,
    slug: product.slug,
    image: product.image,
    name: product.name,
    price: variation.price,
  };
}
