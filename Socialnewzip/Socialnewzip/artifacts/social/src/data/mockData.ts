export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  location?: string;
  website?: string;
  joinedAt: string;
  accountType: "personal" | "commercial";
  commercialProfile?: CommercialProfile;
  isPrivate?: boolean;
  isVerified?: boolean;
  stats: {
    posts: number;
    followers: number;
    following: number;
    circles: number;
  };
  isFollowing?: boolean;
  isInCircle?: boolean;
  circleStatus?: "pending" | "accepted" | null;
  isBlocked?: boolean;
  isMuted?: boolean;
}

export interface CommercialProfile {
  categoryKey: string;
  category: string;
  address: string;
  distanceKm?: number;
  isOpen?: boolean;
  openingHours?: string;
  phone?: string;
  priceLevel?: 1 | 2 | 3 | 4;
  photos?: string[];
  amenities?: string[];
  tags: string[];
}

export interface SeekReview {
  id: string;
  businessAccountId: string;
  reviewerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
  businessReply?: {
    content: string;
    createdAt: string;
  };
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  createdAt: string;
  likes: number;
  comments: number;
  reposts: number;
  shares: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  audience: "public" | "circles" | "private";
  type: "text" | "video";
  communityId?: string;
  parentPostId?: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  postsCount: number;
  category: string;
  iconUrl?: string;
  bannerUrl?: string;
  isJoined?: boolean;
  isPrivate?: boolean;
  ownerId: string;
  moderatorIds: string[];
  rules: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "follow" | "circle_request" | "circle_accepted" | "like" | "comment" | "repost" | "mention" | "community_invite";
  actorId: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

export const mockUsers: User[] = [
  {
    id: "u1",
    username: "alex_dev",
    displayName: "Alex Rivera",
    bio: "Building the future of web. Coffee enthusiast. Full-stack engineer at Vercel.",
    avatarUrl: "https://i.pravatar.cc/150?img=11",
    coverUrl: "https://picsum.photos/800/200?random=1",
    location: "San Francisco, CA",
    website: "https://alex.dev",
    joinedAt: "2023-01-15T00:00:00Z",
    accountType: "personal",
    isVerified: true,
    stats: { posts: 142, followers: 12050, following: 340, circles: 24 },
    isFollowing: true,
  },
  {
    id: "u2",
    username: "sarah_designs",
    displayName: "Sarah Chen",
    bio: "Product designer pushing pixels. UI/UX nerd. Architecture & Art lover.",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    coverUrl: "https://picsum.photos/800/200?random=2",
    location: "New York, NY",
    joinedAt: "2023-03-22T00:00:00Z",
    accountType: "personal",
    isVerified: true,
    stats: { posts: 89, followers: 34002, following: 210, circles: 18 },
    isInCircle: true,
    circleStatus: "accepted",
  },
  {
    id: "u3",
    username: "marco_foto",
    displayName: "Marco Silva",
    bio: "Photographer. Capturing light and stories. Based in Lisboa.",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
    coverUrl: "https://picsum.photos/800/200?random=3",
    location: "Lisboa, Portugal",
    website: "https://marcosilva.photo",
    joinedAt: "2023-05-10T00:00:00Z",
    accountType: "personal",
    stats: { posts: 312, followers: 8420, following: 180, circles: 9 },
    isFollowing: false,
  },
  {
    id: "u4",
    username: "julia_code",
    displayName: "Julia Martins",
    bio: "Software engineer. Open source contributor. She/her. Coffee before code.",
    avatarUrl: "https://i.pravatar.cc/150?img=47",
    coverUrl: "https://picsum.photos/800/200?random=4",
    location: "São Paulo, BR",
    joinedAt: "2023-07-01T00:00:00Z",
    accountType: "personal",
    stats: { posts: 56, followers: 2100, following: 500, circles: 7 },
    circleStatus: "pending",
  },
  {
    id: "u5",
    username: "lucas_beats",
    displayName: "Lucas Oliveira",
    bio: "Music producer. Electronic soul. Releasing beats since 2019.",
    avatarUrl: "https://i.pravatar.cc/150?img=52",
    coverUrl: "https://picsum.photos/800/200?random=5",
    location: "Rio de Janeiro, BR",
    joinedAt: "2023-09-14T00:00:00Z",
    accountType: "personal",
    stats: { posts: 204, followers: 15300, following: 290, circles: 31 },
    isFollowing: true,
  },
  {
    id: "u6",
    username: "ana_writes",
    displayName: "Ana Pereira",
    bio: "Journalist & storyteller. Words that matter. Views my own.",
    avatarUrl: "https://i.pravatar.cc/150?img=9",
    coverUrl: "https://picsum.photos/800/200?random=6",
    location: "Porto, Portugal",
    website: "https://anapereira.com",
    joinedAt: "2022-11-30T00:00:00Z",
    accountType: "personal",
    isVerified: true,
    stats: { posts: 890, followers: 52000, following: 430, circles: 45 },
  },
  {
    id: "u7",
    username: "pedro_tech",
    displayName: "Pedro Costa",
    bio: "AI researcher. Building intelligent systems. PhD candidate.",
    avatarUrl: "https://i.pravatar.cc/150?img=60",
    coverUrl: "https://picsum.photos/800/200?random=7",
    location: "Campinas, BR",
    joinedAt: "2023-02-18T00:00:00Z",
    accountType: "personal",
    stats: { posts: 78, followers: 4300, following: 220, circles: 12 },
  },
  {
    id: "u8",
    username: "ines_art",
    displayName: "Inês Carvalho",
    bio: "Digital artist & illustrator. Creating worlds one pixel at a time.",
    avatarUrl: "https://i.pravatar.cc/150?img=16",
    coverUrl: "https://picsum.photos/800/200?random=8",
    location: "Braga, Portugal",
    website: "https://inescarvalho.art",
    joinedAt: "2023-04-05T00:00:00Z",
    accountType: "personal",
    stats: { posts: 445, followers: 22800, following: 310, circles: 28 },
    isInCircle: true,
    circleStatus: "accepted",
  },
  {
    id: "biz1",
    username: "saopaulogrill",
    displayName: "São Paulo Grill",
    bio: "Cortes na brasa, almoço e jantar em um ambiente acolhedor.",
    avatarUrl: "https://picsum.photos/seed/grill-logo/150/150",
    coverUrl: "https://picsum.photos/seed/grill1/800/400",
    location: "Pinheiros, São Paulo",
    joinedAt: "2025-01-10T00:00:00Z",
    accountType: "commercial",
    commercialProfile: {
      categoryKey: "restaurantes",
      category: "Restaurante",
      address: "Rua dos Pinheiros, 120",
      distanceKm: 0.3,
      isOpen: true,
      openingHours: "Seg–Dom · 11h30–23h",
      priceLevel: 3,
      photos: [
        "https://picsum.photos/seed/grill1/1000/640",
        "https://picsum.photos/seed/grill-dining/800/560",
        "https://picsum.photos/seed/grill-food/800/560",
      ],
      amenities: ["Aceita reservas", "Área externa", "Acessível"],
      tags: ["Carnes", "Almoço", "Jantar"],
    },
    stats: { posts: 18, followers: 4200, following: 120, circles: 0 },
    isVerified: true,
  },
  {
    id: "biz2",
    username: "bardoze",
    displayName: "Bar do Zé",
    bio: "Drinks, petiscos e música ao vivo no coração do bairro.",
    avatarUrl: "https://picsum.photos/seed/bar-logo/150/150",
    coverUrl: "https://picsum.photos/seed/barz2/800/400",
    location: "Vila Madalena, São Paulo",
    joinedAt: "2025-02-02T00:00:00Z",
    accountType: "commercial",
    commercialProfile: {
      categoryKey: "bares",
      category: "Bar",
      address: "Rua Harmonia, 45",
      distanceKm: 0.5,
      isOpen: true,
      openingHours: "Ter–Dom · 16h–01h",
      priceLevel: 2,
      photos: [
        "https://picsum.photos/seed/barz2/1000/640",
        "https://picsum.photos/seed/bar-interior/800/560",
        "https://picsum.photos/seed/bar-cocktail/800/560",
      ],
      amenities: ["Música ao vivo", "Área externa", "Aceita cartões"],
      tags: ["Drinks", "Petiscos", "Ao vivo"],
    },
    stats: { posts: 31, followers: 6900, following: 80, circles: 0 },
    isVerified: true,
  },
  {
    id: "biz3",
    username: "cafecentralsp",
    displayName: "Café Central",
    bio: "Café especial, brunch e um espaço tranquilo para trabalhar.",
    avatarUrl: "https://picsum.photos/seed/cafe-logo/150/150",
    coverUrl: "https://picsum.photos/seed/cafe3/800/400",
    location: "Consolação, São Paulo",
    joinedAt: "2025-02-14T00:00:00Z",
    accountType: "commercial",
    commercialProfile: {
      categoryKey: "cafes",
      category: "Café",
      address: "Rua Augusta, 210",
      distanceKm: 0.2,
      isOpen: false,
      openingHours: "Seg–Sáb · 08h–18h",
      priceLevel: 2,
      photos: [
        "https://picsum.photos/seed/cafe3/1000/640",
        "https://picsum.photos/seed/cafe-interior/800/560",
        "https://picsum.photos/seed/cafe-brunch/800/560",
      ],
      amenities: ["Wi-Fi", "Tomadas", "Opções vegetarianas"],
      tags: ["Café especial", "Brunch", "Wi-Fi"],
    },
    stats: { posts: 46, followers: 8200, following: 90, circles: 0 },
    isVerified: true,
  },
  {
    id: "biz4",
    username: "powerfitsp",
    displayName: "Academia Power Fit",
    bio: "Treinos, musculação e aulas coletivas para todos os níveis.",
    avatarUrl: "https://picsum.photos/seed/gym-logo/150/150",
    coverUrl: "https://picsum.photos/seed/gym4/800/400",
    location: "Pinheiros, São Paulo",
    joinedAt: "2025-03-01T00:00:00Z",
    accountType: "commercial",
    commercialProfile: {
      categoryKey: "saude",
      category: "Saúde e beleza",
      address: "Av. Faria Lima, 800",
      distanceKm: 0.8,
      isOpen: true,
      openingHours: "Seg–Sex · 06h–22h · Sáb–Dom · 08h–14h",
      priceLevel: 2,
      photos: [
        "https://picsum.photos/seed/gym4/1000/640",
        "https://picsum.photos/seed/gym-studio/800/560",
        "https://picsum.photos/seed/gym-class/800/560",
      ],
      amenities: ["Vestiários", "Aulas coletivas", "Estacionamento"],
      tags: ["Musculação", "Pilates", "CrossFit"],
    },
    stats: { posts: 27, followers: 3100, following: 65, circles: 0 },
    isVerified: true,
  },
  {
    id: "biz5",
    username: "barbeariakings",
    displayName: "Barbearia Kings",
    bio: "Corte e barba com hora marcada ou atendimento por ordem de chegada.",
    avatarUrl: "https://picsum.photos/seed/barber-logo/150/150",
    coverUrl: "https://picsum.photos/seed/barber5/800/400",
    location: "Jardins, São Paulo",
    joinedAt: "2025-03-12T00:00:00Z",
    accountType: "commercial",
    commercialProfile: {
      categoryKey: "saude",
      category: "Saúde e beleza",
      address: "Alameda Santos, 510",
      distanceKm: 1.2,
      isOpen: true,
      openingHours: "Seg–Sáb · 09h–20h",
      priceLevel: 2,
      photos: [
        "https://picsum.photos/seed/barber5/1000/640",
        "https://picsum.photos/seed/barber-shop/800/560",
        "https://picsum.photos/seed/barber-chair/800/560",
      ],
      amenities: ["Agendamento", "Acessível", "Aceita cartões"],
      tags: ["Corte", "Barba", "Agendamento"],
    },
    stats: { posts: 22, followers: 5400, following: 48, circles: 0 },
    isVerified: true,
  },
  {
    id: "biz6",
    username: "livrariacultura",
    displayName: "Livraria Cultura",
    bio: "Livros, papelaria e um café para aproveitar sem pressa.",
    avatarUrl: "https://picsum.photos/seed/book-logo/150/150",
    coverUrl: "https://picsum.photos/seed/book6/800/400",
    location: "Paulista, São Paulo",
    joinedAt: "2025-03-28T00:00:00Z",
    accountType: "commercial",
    commercialProfile: {
      categoryKey: "compras",
      category: "Compras",
      address: "Av. Paulista, 1500",
      distanceKm: 1.5,
      isOpen: true,
      openingHours: "Seg–Sáb · 10h–22h · Dom · 12h–18h",
      priceLevel: 1,
      photos: [
        "https://picsum.photos/seed/book6/1000/640",
        "https://picsum.photos/seed/bookstore/800/560",
        "https://picsum.photos/seed/book-cafe/800/560",
      ],
      amenities: ["Acessível", "Espaço infantil", "Café"],
      tags: ["Livros", "Papelaria", "Café"],
    },
    stats: { posts: 15, followers: 7700, following: 110, circles: 0 },
    isVerified: true,
  },
];

export const mockSeekReviews: SeekReview[] = [
  {
    id: "review-biz1-u1",
    businessAccountId: "biz1",
    reviewerId: "u1",
    rating: 5,
    comment: "Carne muito bem preparada e atendimento atencioso. Voltaria para jantar.",
    createdAt: "2026-10-10T18:20:00.000Z",
    businessReply: {
      content: "Obrigado por compartilhar sua experiência, Alex! Esperamos receber você novamente.",
      createdAt: "2026-10-11T14:00:00.000Z",
    },
  },
  {
    id: "review-biz1-u2",
    businessAccountId: "biz1",
    reviewerId: "u2",
    rating: 4,
    comment: "Bom almoço e porções generosas. O salão estava movimentado no horário de pico.",
    createdAt: "2026-10-08T16:10:00.000Z",
  },
  {
    id: "review-biz2-u3",
    businessAccountId: "biz2",
    reviewerId: "u3",
    rating: 5,
    comment: "Drinks bem feitos e música ao vivo em um volume agradável.",
    createdAt: "2026-10-12T22:40:00.000Z",
  },
  {
    id: "review-biz2-u4",
    businessAccountId: "biz2",
    reviewerId: "u4",
    rating: 4,
    comment: "Ótimo lugar para encontrar amigos. Os petiscos chegaram rápido.",
    createdAt: "2026-10-07T20:15:00.000Z",
  },
  {
    id: "review-biz3-u5",
    businessAccountId: "biz3",
    reviewerId: "u5",
    rating: 5,
    comment: "Café excelente e espaço tranquilo para trabalhar durante a manhã.",
    createdAt: "2026-10-13T13:05:00.000Z",
  },
  {
    id: "review-biz3-u6",
    businessAccountId: "biz3",
    reviewerId: "u6",
    rating: 5,
    comment: "Brunch delicioso, equipe gentil e boas opções de café especial.",
    createdAt: "2026-10-06T12:30:00.000Z",
  },
  {
    id: "review-biz4-u7",
    businessAccountId: "biz4",
    reviewerId: "u7",
    rating: 4,
    comment: "Equipamentos bem cuidados e boas aulas coletivas no fim do dia.",
    createdAt: "2026-10-09T19:20:00.000Z",
  },
  {
    id: "review-biz4-u8",
    businessAccountId: "biz4",
    reviewerId: "u8",
    rating: 5,
    comment: "Instrutores atenciosos e espaço organizado. Gostei bastante da aula de Pilates.",
    createdAt: "2026-10-05T10:00:00.000Z",
  },
  {
    id: "review-biz5-u1",
    businessAccountId: "biz5",
    reviewerId: "u1",
    rating: 5,
    comment: "Corte caprichado e pontualidade no horário marcado.",
    createdAt: "2026-10-14T17:30:00.000Z",
  },
  {
    id: "review-biz5-u3",
    businessAccountId: "biz5",
    reviewerId: "u3",
    rating: 5,
    comment: "Ambiente agradável e ótimo acabamento na barba.",
    createdAt: "2026-10-04T15:45:00.000Z",
  },
  {
    id: "review-biz6-u2",
    businessAccountId: "biz6",
    reviewerId: "u2",
    rating: 4,
    comment: "Boa variedade de livros e um café gostoso para fazer uma pausa.",
    createdAt: "2026-10-11T14:25:00.000Z",
  },
  {
    id: "review-biz6-u6",
    businessAccountId: "biz6",
    reviewerId: "u6",
    rating: 5,
    comment: "Encontrei o livro que procurava e fui muito bem atendida.",
    createdAt: "2026-10-03T11:50:00.000Z",
  },
];

export const mockPosts: Post[] = [
  {
    id: "p1",
    authorId: "u1",
    content: "Just shipped a massive update to our design system! The new dark mode feels incredible. Can't wait to see what everyone builds with it. The attention to detail took months but it was worth every late night.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    likes: 842,
    comments: 45,
    reposts: 120,
    shares: 32,
    audience: "public",
    type: "text",
  },
  {
    id: "p2",
    authorId: "u2",
    content: "Exploring some new layouts for the dashboard project. The grid system is evolving nicely. What do you think — more whitespace or denser information?",
    mediaUrls: ["https://picsum.photos/600/400?random=10"],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    likes: 1280,
    comments: 94,
    reposts: 56,
    shares: 18,
    audience: "public",
    type: "text",
    isLiked: true,
  },
  {
    id: "p3",
    authorId: "u3",
    content: "Golden hour in Lisboa never gets old. Shot this at Miradouro da Graça with a 50mm. Sometimes the best camera is the one you have with you.",
    mediaUrls: ["https://picsum.photos/600/400?random=20"],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    likes: 2340,
    comments: 88,
    reposts: 210,
    shares: 67,
    audience: "public",
    type: "text",
    isLiked: false,
  },
  {
    id: "p4",
    authorId: "u4",
    content: "Just merged my first PR to a major open source project after 3 attempts and months of learning. Persistence pays off. To everyone just starting out: keep going.",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    likes: 5600,
    comments: 230,
    reposts: 890,
    shares: 145,
    audience: "public",
    type: "text",
    isReposted: true,
  },
  {
    id: "p5",
    authorId: "u5",
    content: "New track dropping Friday. Been working on this one for 6 months. Electronic but organic. It has a heartbeat.",
    mediaUrls: ["https://picsum.photos/600/300?random=30"],
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    likes: 3400,
    comments: 156,
    reposts: 430,
    shares: 210,
    audience: "public",
    type: "text",
  },
  {
    id: "p6",
    authorId: "u6",
    content: "Breaking: The intersection of AI and journalism is not about replacing reporters — it's about giving them superpowers to find stories hidden in data that would take a team of humans years to surface. Long read coming tomorrow.",
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    likes: 7800,
    comments: 420,
    reposts: 1200,
    shares: 890,
    audience: "public",
    type: "text",
    isLiked: true,
  },
  {
    id: "p7",
    authorId: "u7",
    content: "Fascinating result from our latest experiment: LLMs show emergent reasoning capabilities at specific parameter thresholds. The implications for how we think about intelligence are profound. Full paper link in bio.",
    createdAt: new Date(Date.now() - 28800000).toISOString(),
    likes: 4200,
    comments: 340,
    reposts: 780,
    shares: 320,
    audience: "public",
    type: "text",
  },
  {
    id: "p8",
    authorId: "u8",
    content: "Finished this illustration after 40 hours. A universe inside a teardrop. Sometimes I don't know where the idea ends and the art begins.",
    mediaUrls: ["https://picsum.photos/600/600?random=40"],
    createdAt: new Date(Date.now() - 36000000).toISOString(),
    likes: 8900,
    comments: 560,
    reposts: 1400,
    shares: 430,
    audience: "public",
    type: "text",
    isLiked: false,
  },
  {
    id: "p9",
    authorId: "u1",
    content: "Hot take: The best code is the code you delete. Spent the morning removing 2000 lines and the app is faster, simpler, and more maintainable. Reduction is a skill.",
    createdAt: new Date(Date.now() - 48000000).toISOString(),
    likes: 3100,
    comments: 120,
    reposts: 560,
    shares: 88,
    audience: "public",
    type: "text",
  },
  {
    id: "p10",
    authorId: "u2",
    content: "Design principle I keep coming back to: every element on screen should either guide attention or carry meaning. If it does neither, remove it. Ruthless editing creates beautiful products.",
    createdAt: new Date(Date.now() - 54000000).toISOString(),
    likes: 6700,
    comments: 280,
    reposts: 1100,
    shares: 340,
    audience: "public",
    type: "text",
    isReposted: true,
  },
];

export const mockCommunities: Community[] = [
  {
    id: "c1",
    name: "Design Matters",
    slug: "design-matters",
    description: "A community for designers, design thinkers, and anyone who cares about beautiful, functional interfaces. Share work, get feedback, discuss trends.",
    memberCount: 24500,
    postsCount: 8900,
    category: "Design",
    iconUrl: "https://i.pravatar.cc/150?img=20",
    bannerUrl: "https://picsum.photos/800/300?random=51",
    isJoined: true,
    ownerId: "u2",
    moderatorIds: ["u8"],
    rules: ["Be respectful", "Share original work", "No self-promotion spam"],
    createdAt: "2022-06-01T00:00:00Z",
  },
  {
    id: "c2",
    name: "Open Source Hub",
    slug: "open-source-hub",
    description: "Discuss, contribute to, and celebrate open source software. All languages and frameworks welcome. Share projects and PRs.",
    memberCount: 18200,
    postsCount: 5600,
    category: "Technology",
    iconUrl: "https://i.pravatar.cc/150?img=25",
    bannerUrl: "https://picsum.photos/800/300?random=52",
    ownerId: "u1",
    moderatorIds: ["u4", "u7"],
    rules: ["Follow OSS etiquette", "No FUD", "Credit original authors"],
    createdAt: "2022-08-15T00:00:00Z",
  },
  {
    id: "c3",
    name: "Photography Club",
    slug: "photography-club",
    description: "Share your shots, techniques, and stories. From mobile photography to professional equipment. All skill levels welcome.",
    memberCount: 31000,
    postsCount: 12400,
    category: "Photography",
    iconUrl: "https://i.pravatar.cc/150?img=30",
    bannerUrl: "https://picsum.photos/800/300?random=53",
    isJoined: true,
    ownerId: "u3",
    moderatorIds: [],
    rules: ["Original photos only", "Credit your gear", "Constructive feedback only"],
    createdAt: "2022-04-20T00:00:00Z",
  },
  {
    id: "c4",
    name: "Electronic Music Lab",
    slug: "electronic-music-lab",
    description: "Producers, DJs, and music lovers. Share tracks, get feedback, discuss production techniques and gear.",
    memberCount: 9800,
    postsCount: 3200,
    category: "Music",
    iconUrl: "https://i.pravatar.cc/150?img=35",
    bannerUrl: "https://picsum.photos/800/300?random=54",
    ownerId: "u5",
    moderatorIds: [],
    rules: ["Original content preferred", "Be constructive", "No piracy links"],
    createdAt: "2023-01-10T00:00:00Z",
  },
  {
    id: "c5",
    name: "AI & Machine Learning",
    slug: "ai-ml",
    description: "The frontier of AI research, applications, and ethics. Papers, discussions, demos, and debates.",
    memberCount: 42000,
    postsCount: 18900,
    category: "Science",
    iconUrl: "https://i.pravatar.cc/150?img=40",
    bannerUrl: "https://picsum.photos/800/300?random=55",
    isJoined: false,
    ownerId: "u7",
    moderatorIds: ["u1"],
    rules: ["Cite your sources", "No hype without substance", "Welcome to beginners"],
    createdAt: "2022-03-05T00:00:00Z",
  },
  {
    id: "c6",
    name: "Writers Room",
    slug: "writers-room",
    description: "For writers, journalists, bloggers, and storytellers. Share drafts, writing prompts, and craft discussions.",
    memberCount: 15600,
    postsCount: 6700,
    category: "Writing",
    iconUrl: "https://i.pravatar.cc/150?img=45",
    bannerUrl: "https://picsum.photos/800/300?random=56",
    ownerId: "u6",
    moderatorIds: [],
    rules: ["Respect all genres", "Feedback should be constructive", "No plagiarism"],
    createdAt: "2022-09-22T00:00:00Z",
  },
];

export const mockNotifications: Notification[] = [
  { id: "n1", type: "like", actorId: "u2", entityId: "p1", isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "n2", type: "circle_request", actorId: "u4", isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "n3", type: "follow", actorId: "u3", isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "n4", type: "comment", actorId: "u5", entityId: "p1", isRead: false, createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: "n5", type: "repost", actorId: "u6", entityId: "p9", isRead: true, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: "n6", type: "circle_accepted", actorId: "u2", isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "n7", type: "mention", actorId: "u7", entityId: "p7", isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "n8", type: "community_invite", actorId: "u2", entityId: "c1", isRead: true, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: "n9", type: "like", actorId: "u8", entityId: "p4", isRead: true, createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: "n10", type: "follow", actorId: "u1", isRead: true, createdAt: new Date(Date.now() - 432000000).toISOString() },
];

export const mockMessages: Message[] = [
  { id: "m1", conversationId: "conv1", senderId: "u2", content: "Hey! Loved your last post about dark mode. Mind if I ask about your color system?", isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "m2", conversationId: "conv1", senderId: "me", content: "Of course! It's all built on HSL variables. Makes theming so much easier.", isRead: true, createdAt: new Date(Date.now() - 7100000).toISOString() },
  { id: "m3", conversationId: "conv1", senderId: "u2", content: "That makes total sense. Do you have a public repo?", isRead: true, createdAt: new Date(Date.now() - 7000000).toISOString() },
  { id: "m4", conversationId: "conv1", senderId: "me", content: "Yeah, I'll send you the link. Working on cleaning up the docs first.", isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "m5", conversationId: "conv2", senderId: "u5", content: "Bro, you need to hear this new track. It's different. Real different.", isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "m6", conversationId: "conv2", senderId: "me", content: "Send it! I've been waiting for new music from you", isRead: true, createdAt: new Date(Date.now() - 5400000).toISOString() },
  { id: "m7", conversationId: "conv3", senderId: "u1", content: "Want to collaborate on something? I've been thinking about a design x code project.", isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv1",
    participantIds: ["me", "u2"],
    lastMessage: mockMessages[3],
    unreadCount: 1,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "conv2",
    participantIds: ["me", "u5"],
    lastMessage: mockMessages[4],
    unreadCount: 1,
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: "conv3",
    participantIds: ["me", "u1"],
    lastMessage: mockMessages[6],
    unreadCount: 0,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const interests = [
  "Tecnologia", "Design", "Música", "Arte", "Games", "Esportes",
  "Ciência", "Viagens", "Gastronomia", "Política", "Moda", "Finanças",
  "Cinema", "Saúde", "Educação", "Fotografia", "Animais", "Humor",
  "Literatura", "Startups", "Sustentabilidade", "Cultura"
];

export const currentUser: User = {
  id: "me",
  username: "orbit_user",
  displayName: "Orbit User",
  bio: "Exploring the universe of ideas. Building something new every day.",
  avatarUrl: "https://i.pravatar.cc/150?img=68",
  coverUrl: "https://picsum.photos/800/200?random=100",
  location: "Internet",
  website: "https://orbit.social",
  joinedAt: new Date().toISOString(),
  accountType: "personal",
  stats: { posts: 12, followers: 142, following: 38, circles: 5 },
};

export function getUserById(id: string): User | undefined {
  if (id === "me") return currentUser;
  return mockUsers.find(u => u.id === id);
}

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
