import type { ShopItem, ShopStore } from "@/modules/shop/types/item";

// Explicit demonstration catalog. No prices or availability are live.
export const demoShopItems: ShopItem[] = [
  { id: "p1", name: "Tênis Runner Pro", store: "SportZone", price: "R$ 299,90", oldPrice: "R$ 399,90", rating: 4.8, reviews: 312, tag: "ofertas", img: "https://picsum.photos/seed/shoe1/300/300" },
  { id: "p2", name: "Fone Bluetooth Ultra", store: "TechMania", price: "R$ 189,00", oldPrice: null, rating: 4.6, reviews: 145, tag: "produtos", img: "https://picsum.photos/seed/fone2/300/300" },
  { id: "p3", name: "Mochila Urbana 30L", store: "Mundo Bags", price: "R$ 149,90", oldPrice: "R$ 220,00", rating: 4.7, reviews: 98, tag: "ofertas", img: "https://picsum.photos/seed/bag3/300/300" },
  { id: "p4", name: "Plano Nutrição Premium", store: "Vida Saudável", price: "R$ 79,90/mês", oldPrice: null, rating: 4.9, reviews: 214, tag: "servicos", img: "https://picsum.photos/seed/nut4/300/300" },
  { id: "p5", name: "Cafeteira Italiana", store: "Casa & Gosto", price: "R$ 129,00", oldPrice: "R$ 180,00", rating: 4.5, reviews: 67, tag: "ofertas", img: "https://picsum.photos/seed/cafe5/300/300" },
  { id: "p6", name: "Corte + Barba Express", store: "Barbearia Kings", price: "R$ 65,00", oldPrice: null, rating: 4.9, reviews: 530, tag: "servicos", img: "https://picsum.photos/seed/barb6/300/300" },
  { id: "p7", name: "Smartwatch Fit X4", store: "TechMania", price: "R$ 349,00", oldPrice: "R$ 499,00", rating: 4.7, reviews: 402, tag: "ofertas", img: "https://picsum.photos/seed/watch7/300/300" },
  { id: "p8", name: "Livro: Hábitos Atômicos", store: "Livraria Cultura", price: "R$ 49,90", oldPrice: null, rating: 4.9, reviews: 1204, tag: "produtos", img: "https://picsum.photos/seed/book8/300/300" },
];
export const demoStores: ShopStore[] = [
  { id: "s1", name: "TechMania", category: "Eletrônicos", img: "https://picsum.photos/seed/store1/48/48", followers: "12 mil" },
  { id: "s2", name: "SportZone", category: "Esportes", img: "https://picsum.photos/seed/store2/48/48", followers: "8,4 mil" },
  { id: "s3", name: "Casa & Gosto", category: "Casa", img: "https://picsum.photos/seed/store3/48/48", followers: "5,1 mil" },
  { id: "s4", name: "Vida Saudável", category: "Saúde", img: "https://picsum.photos/seed/store4/48/48", followers: "9,7 mil" },
];
