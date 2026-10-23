import type { SeekReview, User } from "./mockData";

/** Fictional profiles for frontend preview only; photography is illustrative, not of these businesses. */
export function demoSeekImage(kind: "cafe" | "food" | "beauty" | "market" | "services" | "events" | "cleaning" | "fitness") {
  return `${import.meta.env?.BASE_URL ?? "/"}demo-seek/${kind}.jpg`;
}

const sp = { cityId: "3550308", cityName: "São Paulo", cityState: "SP" };
const santos = { cityId: "3548500", cityName: "Santos", cityState: "SP" };

function demoAccount(id: string, name: string, category: string, categoryKey: string,
  image: Parameters<typeof demoSeekImage>[0], description: string, city = sp): User {
  return {
    id, username: id, displayName: name, accountType: "commercial",
    bio: `Perfil de demonstração. ${description}`,
    avatarUrl: demoSeekImage(image), coverUrl: demoSeekImage(image),
    location: `${city.cityName}, ${city.cityState}`,
    joinedAt: "2026-01-01T12:00:00Z",
    stats: { posts: 0, followers: 0, following: 0, circles: 0 },
    commercialProfile: {
      ...city, category, categoryKey, discoveryKind: categoryKey === "servicos" ? "provider" : "place",
      address: `Endereço ilustrativo · ${city.cityName}`,
      photos: [demoSeekImage(image)], tags: description.toLocaleLowerCase("pt-BR").split(/[,.]/).map(tag => tag.trim()).filter(Boolean),
      openingHours: "Seg–Sáb · 09h–18h", isOpen: true, priceLevel: 2,
      serviceAreas: [`${city.cityName}, ${city.cityState}`],
      serviceOptions: categoryKey === "servicos" ? { appointments: true } : { dineIn: true, takeout: true },
    },
  };
}

export const demoSeekAccounts: User[] = [
  demoAccount("demo_marcos_reformas", "Marcos Reformas", "Pedreiro e reformas", "servicos", "services", "Pedreiro, alvenaria, pintura, pequenos reparos"),
  demoAccount("demo_luz_eletrica", "Luz Certa Elétrica", "Eletricista", "servicos", "services", "Eletricista, instalação elétrica, manutenção residencial"),
  demoAccount("demo_ana_organiza", "Ana Organiza", "Diarista e organização", "servicos", "cleaning", "Diarista, limpeza, organização de ambientes"),
  demoAccount("demo_orla_reparos", "Orla Reparos", "Encanador e manutenção", "servicos", "services", "Encanador, hidráulica, reparos", santos),
  demoAccount("demo_mercado_vila", "Mercado da Vila", "Mercados e lojas", "compras", "market", "Produtos locais, feira, artesanato"),
  demoAccount("demo_cafe_orla", "Café da Orla", "Cafés", "cafes", "cafe", "Café especial, brunch, encontros", santos),
];

const businessImages: Record<string, Parameters<typeof demoSeekImage>[0]> = {
  biz1: "food", biz2: "events", biz3: "cafe", biz4: "fitness", biz5: "beauty", biz6: "market",
};

/** Keep existing identities and links; only improve their explicitly mocked preview media. */
export function withDemoSeekMedia(user: User): User {
  const image = businessImages[user.id];
  if (!image || !user.commercialProfile) return user;
  const cover = demoSeekImage(image);
  return {
    ...user, coverUrl: cover, avatarUrl: cover,
    commercialProfile: { ...user.commercialProfile, ...sp, photos: [cover] },
  };
}

export const demoSeekReviews: SeekReview[] = demoSeekAccounts.flatMap((account, index) =>
  [5, index % 2 ? 4 : 5].map((rating, number) => ({
    id: `demo_seek_review_${index}_${number}`, businessAccountId: account.id,
    reviewerId: number ? "u2" : "u1", rating: rating as 4 | 5,
    comment: number ? "Avaliação de exemplo para testar os filtros e o perfil." : "Comentário fictício para visualizar como a avaliação fica no aplicativo.",
    createdAt: "2026-10-20T15:00:00Z",
  })));
