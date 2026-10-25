export interface ShopItem {
  id: string;
  name: string;
  store: string;
  price?: string;
  oldPrice?: string | null;
  rating?: number;
  reviews?: number;
  tag: string;
  img: string;
  sellerId?: string;
}

export interface ShopStore {
  id: string;
  name: string;
  category: string;
  img: string;
  followers: string;
}
