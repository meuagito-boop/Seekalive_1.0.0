import type { Post } from "./mockData";

const base = {
  createdAt: "2026-10-22T11:00:00Z",
  audience: "public" as const,
  type: "text" as const,
  likes: 0, comments: 0, reposts: 0, shares: 0,
  isLiked: false, isReposted: false,
};
// Explicit fixtures that demonstrate integration without implying real reviews/purchases.
export const demoIntegrationPosts: Post[] = [
  {
    ...base, id: "demo-article-seek", authorId: "u1", format: "article",
    content: "Uma pausa no bairro e uma conversa sobre cafés. #cafes",
    article: {
      title: "Como escolher um café para a sua próxima pausa",
      body: "Um café pode ser um ponto de encontro ou um lugar para ler com calma.\n\nAntes de escolher, costumo conferir os horários e as opções de atendimento no perfil do lugar. As experiências compartilhadas por outras pessoas também ajudam a decidir.\n\nEsta é uma publicação de demonstração: o lugar abaixo é uma referência separada. O texto é meu, e as informações do estabelecimento continuam no perfil original.",
    },
    reference: { type: "seek_entity", id: "biz3" }, hashtags: ["cafes"],
  },
  {
    ...base, id: "demo-shop-reference", authorId: "u2", format: "text",
    content: "Comparando opções para a próxima caminhada. Este item vem do catálogo de demonstração do Shop. #descobertas",
    reference: { type: "shop_item", id: "p1" }, hashtags: ["descobertas"],
  },
];
