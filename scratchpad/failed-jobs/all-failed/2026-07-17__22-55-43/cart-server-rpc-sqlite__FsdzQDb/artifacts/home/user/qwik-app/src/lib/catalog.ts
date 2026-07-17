export interface Product {
  id: string;
  name: string;
  price: number;
}

// Fixed product catalog. Safe to share with the client since it contains no
// secrets and no server-only state (unlike the cart contents, which always
// come from the server via server$()).
export const CATALOG: Product[] = [
  { id: "tshirt", name: "Qwik T-Shirt", price: 20.0 },
  { id: "stickers", name: "Sticker Pack", price: 5.0 },
  { id: "mug", name: "Coffee Mug", price: 12.5 },
];

export function getProduct(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}
