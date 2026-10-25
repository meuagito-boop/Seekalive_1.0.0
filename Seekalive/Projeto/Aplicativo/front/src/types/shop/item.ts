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
