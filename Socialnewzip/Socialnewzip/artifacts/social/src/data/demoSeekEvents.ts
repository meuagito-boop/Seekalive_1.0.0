import type { SeekEvent } from "@/types/content";

// Sample events, not live listings or ticket availability.
export const demoSeekEvents: SeekEvent[] = [
  { id: "e1", name: "Show de Jazz ao Vivo", categoryKey: "bares", date: "Sáb, 21 Jun · 21h", venue: "Bar do Zé", interested: 142, img: "https://picsum.photos/seed/jazz1/400/220", price: "R$ 30", organizerId: "biz2" },
  { id: "e2", name: "Festival Gastronômico", categoryKey: "restaurantes", date: "Dom, 22 Jun · 11h", venue: "Praça Central", interested: 380, img: "https://picsum.photos/seed/gastro2/400/220", price: "Gratuito" },
  { id: "e3", name: "Feira de Artesanato", categoryKey: "compras", date: "Sáb, 21 Jun · 9h", venue: "Parque Municipal", interested: 215, img: "https://picsum.photos/seed/fair3/400/220", price: "Gratuito" },
  { id: "e4", name: "Noite de Karaokê", categoryKey: "lazer", date: "Sex, 20 Jun · 20h", venue: "Pub Irlanda", interested: 89, img: "https://picsum.photos/seed/karaoke4/400/220", price: "R$ 15" },
];
export const demoNearbyEvents = demoSeekEvents.slice(0, 3);
