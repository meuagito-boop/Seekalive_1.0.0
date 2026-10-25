import type { SeekEvent } from "@/modules/seek/types/event";
import { demoSeekImage } from "@/data/demoSeekAccounts";

const saturday = new Date();
saturday.setUTCDate(saturday.getUTCDate() + ((6 - saturday.getUTCDay() + 7) % 7));
saturday.setUTCHours(18, 0, 0, 0);
if (saturday.getTime() <= Date.now()) saturday.setUTCDate(saturday.getUTCDate() + 7);
function eventDate(offset: number, hour: number) {
  const date = new Date(saturday);
  date.setUTCDate(date.getUTCDate() + offset);
  date.setUTCHours(hour + 3, 0, 0, 0);
  return {
    startsAt: date.toISOString(),
    date: new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date),
  };
}
const sp = { cityId: "3550308", cityName: "São Paulo", cityState: "SP" };
const santos = { cityId: "3548500", cityName: "Santos", cityState: "SP" };

// Sample events, not live listings or ticket availability.
export const demoSeekEvents: SeekEvent[] = [
  { id: "e1", name: "Show de Jazz ao Vivo", categoryKey: "bares", ...eventDate(0, 21), ...sp, venue: "Bar do Zé · São Paulo", interested: 142, img: demoSeekImage("events"), price: "R$ 30", organizerId: "biz2" },
  { id: "e2", name: "Festival Gastronômico", categoryKey: "restaurantes", ...eventDate(1, 11), ...sp, venue: "Praça Central · São Paulo", interested: 380, img: demoSeekImage("food"), price: "Gratuito", organizerId: "biz1" },
  { id: "e3", name: "Feira de Artesanato", categoryKey: "compras", ...eventDate(0, 9), ...santos, venue: "Praça da Orla · Santos", interested: 215, img: demoSeekImage("market"), price: "Gratuito", organizerId: "demo_mercado_vila" },
  { id: "e4", name: "Noite de Karaokê", categoryKey: "lazer", ...eventDate(0, 20), ...sp, venue: "Bar do Zé · São Paulo", interested: 89, img: demoSeekImage("events"), price: "R$ 15", organizerId: "biz2" },
  { id: "e5", name: "Workshop de Café Especial", categoryKey: "cafes", ...eventDate(1, 10), ...sp, venue: "Café Central · São Paulo", interested: 24, img: demoSeekImage("cafe"), price: "R$ 60", organizerId: "biz3" },
  { id: "e6", name: "Café & Conversas na Orla", categoryKey: "cafes", ...eventDate(1, 16), ...santos, venue: "Café da Orla · Santos", interested: 42, img: demoSeekImage("cafe"), price: "Gratuito", organizerId: "demo_cafe_orla" },
];
export const demoNearbyEvents = demoSeekEvents.slice(0, 3);
