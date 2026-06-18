# Orbit — Documentação do Frontend

> Documento de referência para implementação do backend. Descreve cada tela, suas funcionalidades, dados exibidos/enviados e comportamentos esperados.

---

## Visão Geral do App

**Orbit** é uma rede social de microblogging dark-mode, responsiva (web e mobile). Os usuários podem publicar posts curtos, seguir pessoas, solicitar amizade via "Círculos", participar de comunidades e conversar via mensagens diretas.

---

## Stack Frontend

- React + Vite (TypeScript)
- Wouter (roteamento)
- Framer Motion (animações)
- React Hook Form + Zod (formulários)
- TanStack Query (estado assíncrono)
- Tailwind CSS (estilo)
- Lucide React (ícones)

---

## Entidades de Dados

### User
```ts
{
  id: string
  username: string          // @handle único
  displayName: string
  email: string
  avatar: string            // URL
  coverImage: string        // URL
  bio: string
  location?: string
  website?: string
  joinedAt: Date
  isPrivate: boolean        // Perfil privado
  isVerified: boolean
  followersCount: number
  followingCount: number
  circlesCount: number
  postsCount: number
  isBlocked?: boolean       // Por/para o usuário atual
  isMuted?: boolean
}
```

### Post
```ts
{
  id: string
  authorId: string
  content: string           // Máx 280 chars
  media?: {
    type: "image" | "video"
    url: string
  }[]
  audience: "public" | "circles" | "private"
  communityId?: string      // Se postado em comunidade
  parentPostId?: string     // Se é uma resposta
  likesCount: number
  commentsCount: number
  repostsCount: number
  sharesCount: number
  isLiked?: boolean         // Pelo usuário atual
  isReposted?: boolean
  createdAt: Date
}
```

### Community
```ts
{
  id: string
  name: string
  slug: string              // URL-friendly
  description: string
  category: string          // Ex: "Tecnologia", "Arte", "Esportes"
  avatar: string            // URL
  coverImage: string        // URL
  ownerId: string
  moderatorIds: string[]
  membersCount: number
  postsCount: number
  isPrivate: boolean
  rules: string[]
  createdAt: Date
  isMember?: boolean        // Usuário atual
  isModerator?: boolean
  isOwner?: boolean
}
```

### Circle (Amizade)
```ts
{
  id: string
  requesterId: string       // Quem enviou
  targetId: string          // Quem recebeu
  status: "pending" | "accepted" | "declined"
  createdAt: Date
  updatedAt: Date
}
```

### Follow
```ts
{
  followerId: string
  followingId: string
  createdAt: Date
}
```

### Notification
```ts
{
  id: string
  recipientId: string
  actorId: string           // Quem gerou a notificação
  type: "follow" | "circle_request" | "circle_accepted" | "like" | "comment" | "repost" | "mention" | "community_invite"
  entityId?: string         // postId, communityId, etc.
  isRead: boolean
  createdAt: Date
}
```

### Message
```ts
{
  id: string
  conversationId: string
  senderId: string
  content: string
  media?: { type: string; url: string }
  reactions?: { emoji: string; userId: string }[]
  isRead: boolean
  createdAt: Date
}
```

### Conversation
```ts
{
  id: string
  participantIds: string[]
  lastMessage?: Message
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}
```

---

## Rotas e Telas

---

### `/` — Splash / Landing

**Descrição:** Tela inicial do app para usuários não autenticados. Apresenta a marca Orbit com animação, tagline e dois CTAs principais.

**Funcionalidades:**
- Botão "Entrar" → redireciona para `/login`
- Botão "Criar conta" → redireciona para `/register`
- Fundo animado (partículas ou gradiente)

**API necessária:** Nenhuma

---

### `/login` — Login

**Descrição:** Tela de autenticação por email e senha.

**Funcionalidades:**
- Campos: email, senha
- Toggle mostrar/ocultar senha
- Botão "Esqueci minha senha" → `/forgot-password`
- Link "Criar conta" → `/register`
- Botões de login social (Google, Apple) — visual only, implementação futura
- Ao autenticar com sucesso: redireciona para `/feed`

**API necessária:**
```
POST /api/auth/login
Body: { email: string, password: string }
Response: { user: User, token: string }
```

---

### `/register` — Criar Conta

**Descrição:** Cadastro de novo usuário.

**Funcionalidades:**
- Campos: nome de exibição, @username (validação de disponibilidade), email, senha, confirmar senha
- Checkbox aceitar termos
- Validação em tempo real de username (disponível/indisponível)
- Ao criar conta: redireciona para `/verify-email`

**API necessária:**
```
POST /api/auth/register
Body: { displayName, username, email, password }
Response: { user: User, token: string }

GET /api/auth/check-username?username=:username
Response: { available: boolean }
```

---

### `/forgot-password` — Esqueci a Senha

**Descrição:** Solicitar link de recuperação de senha por email.

**Funcionalidades:**
- Campo de email
- Botão enviar
- Estado de confirmação (email enviado)
- Link voltar para login

**API necessária:**
```
POST /api/auth/forgot-password
Body: { email: string }
Response: { message: string }
```

---

### `/verify-email` — Verificar Email

**Descrição:** Confirmação de email via código OTP de 6 dígitos.

**Funcionalidades:**
- 6 inputs de dígito único (OTP style)
- Timer de reenvio (60 segundos)
- Botão reenviar código
- Botão confirmar → redireciona para `/onboarding/interests`

**API necessária:**
```
POST /api/auth/verify-email
Body: { code: string }
Response: { verified: boolean }

POST /api/auth/resend-verification
Response: { message: string }
```

---

### `/onboarding/interests` — Selecionar Interesses

**Descrição:** Primeira etapa do onboarding. Usuário seleciona categorias de interesse para personalizar o feed.

**Funcionalidades:**
- Grid de tags de interesse (mín. 3 para continuar)
- Toggle de seleção em cada tag
- Botão "Próximo" habilitado após 3 seleções → `/onboarding/suggestions`

**Categorias sugeridas:** Tecnologia, Música, Arte, Games, Esportes, Ciência, Viagens, Gastronomia, Política, Moda, Finanças, Humor, Cinema, Saúde, Educação, Fotografia, Design, Animais

**API necessária:**
```
PUT /api/users/me/interests
Body: { interests: string[] }
Response: { user: User }
```

---

### `/onboarding/suggestions` — Sugestões de Pessoas

**Descrição:** Segunda etapa do onboarding. Usuário pode seguir pessoas sugeridas baseadas nos interesses.

**Funcionalidades:**
- Grid de cards de usuário sugeridos (avatar, nome, @username, bio snippet, botão Seguir)
- Botão Seguir por card (estado toggle)
- Botão "Pular" → `/feed`
- Botão "Continuar" → `/feed`

**API necessária:**
```
GET /api/users/suggestions?limit=20
Response: User[]

POST /api/follows
Body: { followingId: string }
Response: { follow: Follow }
```

---

### `/feed` — Feed Principal

**Descrição:** Tela principal do app autenticado. Hub central de conteúdo com 3 abas.

**Aba 1: Para Você (General Feed)**
- Posts de todos os usuários públicos, ordenados por relevância/cronologia
- Card de post com: avatar, nome, @handle, timestamp, conteúdo texto, mídia (imagem/vídeo), ações (curtir, comentar, repostar, compartilhar)
- Animação de like ao curtir
- Pull-to-refresh
- Scroll infinito (paginado)

**Aba 2: Seguindo**
- Mesma estrutura de cards, filtrado por usuários que o usuário atual segue
- Empty state se não seguir ninguém (com link para /search)

**Aba 3: Vídeos**
- Full-screen snap-scroll vertical (estilo TikTok)
- Um vídeo por vez, ocupa 100vh
- Overlay com: avatar + nome do autor, conteúdo/legenda, botões de ação (curtir, comentar, repostar) no lado direito
- Controle de volume/mudo
- Auto-play ao entrar no viewport, pause ao sair

**Funcionalidades comuns:**
- FAB (+) para compor novo post → `/compose`
- Clicar no post → `/post/:id`
- Clicar no avatar/nome → `/profile/:username`

**API necessária:**
```
GET /api/feed?tab=for_you|following|videos&cursor=:cursor&limit=20
Response: { posts: Post[], nextCursor: string | null }

POST /api/posts/:id/like
DELETE /api/posts/:id/like
Response: { likesCount: number }

POST /api/posts/:id/repost
DELETE /api/posts/:id/repost
Response: { repostsCount: number }
```

---

### `/search` — Busca e Descoberta

**Descrição:** Tela de busca e descoberta de conteúdo, pessoas e comunidades.

**Estado inicial (sem busca):**
- Trending topics: lista de hashtags com contagem de posts
- "Descobrir pessoas": scroll horizontal de cards de usuário sugeridos com botão Seguir
- "Comunidades em alta": grid de cards de comunidades

**Estado com busca ativa:**
- Tabs de resultado: Posts | Pessoas | Comunidades | Tags
- Posts: feed de posts que contenham o termo
- Pessoas: lista de usuários que correspondam ao @username ou nome
- Comunidades: cards de comunidades
- Tags: hashtags relacionadas com contagem

**API necessária:**
```
GET /api/search?q=:query&type=posts|users|communities|tags&cursor=:cursor
Response: { results: Post[] | User[] | Community[], nextCursor: string | null }

GET /api/trending/topics?limit=10
Response: { tag: string, postsCount: number }[]

GET /api/users/suggestions?limit=10
Response: User[]

GET /api/communities/trending?limit=6
Response: Community[]
```

---

### `/notifications` — Notificações

**Descrição:** Central de notificações do usuário.

**Abas:** All | Menções | Círculos | Reações

**Tipos de notificação exibidos:**
- Novo seguidor: "[User] começou a te seguir"
- Solicitação de círculo: "[User] quer entrar no seu círculo"
- Círculo aceito: "[User] aceitou sua solicitação de círculo"
- Curtida: "[User] curtiu seu post"
- Comentário: "[User] comentou no seu post"
- Repost: "[User] repostou seu post"
- Menção: "[User] te mencionou"
- Convite para comunidade: "[User] te convidou para [Comunidade]"

**Funcionalidades:**
- Marcar como lida ao clicar
- Marcar todas como lidas (botão)
- Badge de não lidas no ícone da nav

**API necessária:**
```
GET /api/notifications?tab=all|mentions|circles|reactions&cursor=:cursor
Response: { notifications: Notification[], unreadCount: number, nextCursor: string | null }

PUT /api/notifications/:id/read
PUT /api/notifications/read-all
Response: { success: boolean }
```

---

### `/messages` — Mensagens Diretas

**Descrição:** Lista de conversas de mensagens diretas.

**Funcionalidades:**
- Campo de busca por nome/username
- Lista de conversas: avatar, nome, preview da última mensagem, timestamp, badge de não lidas
- Botão "Nova mensagem" (abre modal/busca de usuários para iniciar conversa)
- Clicar numa conversa → `/messages/:conversationId`

**API necessária:**
```
GET /api/conversations?cursor=:cursor
Response: { conversations: Conversation[], nextCursor: string | null }

POST /api/conversations
Body: { participantId: string }
Response: { conversation: Conversation }
```

---

### `/messages/:conversationId` — Conversa

**Descrição:** Tela de chat individual.

**Funcionalidades:**
- Header com avatar e nome do participante, botão voltar
- Mensagens em bolhas (enviadas: direita, recebidas: esquerda)
- Timestamps agrupados por dia
- Campo de input fixo no bottom: emoji, anexar mídia, enviar
- Indicador de digitando...
- Reações em mensagens (long press)
- Exibição de mídias inline
- Marcar como lidas ao visualizar

**API necessária:**
```
GET /api/conversations/:id/messages?cursor=:cursor
Response: { messages: Message[], nextCursor: string | null }

POST /api/conversations/:id/messages
Body: { content: string, media?: File }
Response: { message: Message }

POST /api/messages/:id/reactions
Body: { emoji: string }
Response: { message: Message }

WebSocket: /ws/conversations/:id  (para real-time)
```

---

### `/post/:postId` — Detalhe do Post / Thread

**Descrição:** Visualização completa de um post e suas respostas.

**Funcionalidades:**
- Post original com todas as informações e mídia
- Todas as ações (curtir, comentar, repostar, compartilhar)
- Composer de resposta logo abaixo do post original
- Lista de respostas paginada (com suporte a respostas aninhadas)
- Clicar em resposta → abre resposta como thread

**API necessária:**
```
GET /api/posts/:id
Response: { post: Post, author: User }

GET /api/posts/:id/replies?cursor=:cursor
Response: { replies: Post[], nextCursor: string | null }

POST /api/posts
Body: { content: string, parentPostId: string, audience: string, media?: File }
Response: { post: Post }
```

---

### `/compose` — Compor Post

**Descrição:** Tela de criação de novo post.

**Funcionalidades:**
- Textarea com contador de caracteres (0/280)
- Botão anexar imagem (até 4 imagens ou 1 vídeo)
- Seletor de audiência: Público / Só Círculos / Privado
- Preview de mídias com botão remover
- Botão Cancelar e Publicar
- Estado de loading ao publicar

**API necessária:**
```
POST /api/posts
Body: FormData { content, audience, media[]?, communityId? }
Response: { post: Post }
```

---

### `/profile/:username` — Perfil de Usuário

**Descrição:** Página pública de perfil de qualquer usuário.

**Funcionalidades:**
- Capa + avatar sobrepostos (estilo Twitter)
- Nome, @username, bio, localização, website, data de entrada
- Estatísticas: Posts | Seguidores | Seguindo | Círculos (clicáveis)
- Botão Seguir / Seguindo (toggle) para outros usuários
- Botão Círculo (estados: "Adicionar ao Círculo", "Solicitado", "No Círculo")
- Menu 3 pontos: Bloquear, Silenciar, Reportar, Compartilhar perfil
- Para perfis privados: exibir mensagem de perfil privado se não seguindo
- Tabs: Posts | Respostas | Mídia | Curtidas

**API necessária:**
```
GET /api/users/:username
Response: { user: User, isFollowing: boolean, isCircle: boolean, circleStatus: string | null }

POST /api/follows
Body: { followingId: string }
DELETE /api/follows/:followingId

POST /api/circles/request
Body: { targetId: string }

GET /api/users/:username/posts?tab=posts|replies|media|likes&cursor=:cursor
Response: { posts: Post[], nextCursor: string | null }

POST /api/users/:username/block
DELETE /api/users/:username/block
POST /api/users/:username/mute
DELETE /api/users/:username/mute
```

---

### `/profile/edit` — Editar Perfil

**Descrição:** Formulário de edição do perfil do usuário autenticado.

**Funcionalidades:**
- Upload de foto de capa (clique na capa)
- Upload de avatar (clique no avatar)
- Preview em tempo real das imagens
- Campos: nome de exibição, @username, bio (máx 160 chars com contador), localização, website
- Botão Salvar

**API necessária:**
```
PUT /api/users/me
Body: FormData { displayName, username, bio, location, website, avatar?, coverImage? }
Response: { user: User }
```

---

### `/profile/:username/followers` — Seguidores

**Descrição:** Lista de seguidores de um usuário.

**Funcionalidades:**
- Campo de busca por nome/username
- Lista de cards: avatar, nome, @handle, bio snippet, botão Seguir/Seguindo
- Scroll infinito

**API necessária:**
```
GET /api/users/:username/followers?cursor=:cursor&q=:query
Response: { users: User[], nextCursor: string | null }
```

---

### `/profile/:username/following` — Seguindo

**Descrição:** Lista de usuários que o perfil segue.

**Funcionalidades:** Idêntica à tela de seguidores.

**API necessária:**
```
GET /api/users/:username/following?cursor=:cursor&q=:query
Response: { users: User[], nextCursor: string | null }
```

---

### `/profile/:username/circles` — Círculos

**Descrição:** Lista de conexões de Círculo (amizades mútuas) do usuário.

**API necessária:**
```
GET /api/users/:username/circles?cursor=:cursor
Response: { users: User[], nextCursor: string | null }
```

---

### `/circles` — Meus Círculos

**Descrição:** Central de gerenciamento de Círculos (sistema de amizade do Orbit).

**Conceito de Círculo:** Diferente do follow (unilateral), o Círculo é mútuo — ambos precisam aceitar. É equivalente a "amizade".

**Aba 1: Círculos**
- Lista de conexões mútuas aceitas
- Card: avatar, nome, @handle, quantidade de círculos em comum
- Botão "Remover do Círculo"

**Aba 2: Solicitações**
- Solicitações recebidas pendentes
- Card: avatar, nome, @handle, tempo da solicitação
- Botões: Aceitar | Recusar

**Aba 3: Enviadas**
- Solicitações enviadas ainda pendentes
- Botão Cancelar solicitação

**API necessária:**
```
GET /api/circles?tab=circles|requests|sent&cursor=:cursor
Response: { items: Circle[] | User[], nextCursor: string | null }

PUT /api/circles/:id/accept
DELETE /api/circles/:id     (recusar ou cancelar)
```

---

### `/communities` — Comunidades

**Descrição:** Hub de descoberta e gestão de comunidades.

**Aba 1: Descobrir**
- Grid de cards de comunidade: capa/gradiente, ícone, nome, categoria, membros, descrição snippet, botão Entrar
- Filtro por categoria (horizontal scroll de tags)

**Aba 2: Minhas Comunidades**
- Lista das comunidades que o usuário participa
- Badge de papel: Dono, Moderador, Membro
- Ícone para entrar na comunidade

**Botão:** "Criar Comunidade" → `/communities/create`

**API necessária:**
```
GET /api/communities?tab=discover|mine&category=:cat&cursor=:cursor
Response: { communities: Community[], nextCursor: string | null }

POST /api/communities/:id/join
DELETE /api/communities/:id/leave
Response: { community: Community }
```

---

### `/communities/create` — Criar Comunidade

**Descrição:** Formulário de criação de nova comunidade.

**Funcionalidades:**
- Upload de banner e ícone
- Campos: nome, slug/URL (auto-gerado + editável), descrição, categoria, privacidade (Pública / Privada)
- Toggle: "Requer aprovação para entrar" (apenas para privadas)
- Botão Criar

**API necessária:**
```
POST /api/communities
Body: FormData { name, slug, description, category, isPrivate, requiresApproval, avatar?, coverImage? }
Response: { community: Community }
```

---

### `/communities/:communityId` — Página da Comunidade

**Descrição:** Página principal de uma comunidade.

**Header:**
- Banner + ícone + nome + descrição
- Estatísticas: membros, posts
- Botão Entrar / Sair
- Para donos/mods: botão Configurações → `/communities/:id/settings`

**Aba 1: Feed**
- Posts da comunidade, com botão "Postar na Comunidade" (compõe post com communityId)

**Aba 2: Membros**
- Lista de membros com papel: Dono, Moderador, Membro
- Moderadores podem remover membros

**Aba 3: Sobre**
- Descrição completa
- Regras da comunidade
- Categoria
- Data de criação
- Dono

**API necessária:**
```
GET /api/communities/:id
Response: { community: Community, isMember: boolean, role: "owner"|"moderator"|"member"|null }

GET /api/communities/:id/posts?cursor=:cursor
Response: { posts: Post[], nextCursor: string | null }

GET /api/communities/:id/members?cursor=:cursor
Response: { members: { user: User, role: string }[], nextCursor: string | null }

DELETE /api/communities/:id/members/:userId  (mod/owner only)
```

---

### `/communities/:communityId/settings` — Configurações da Comunidade

**Descrição:** Gestão da comunidade. Acessível apenas por donos e moderadores.

**Funcionalidades (Dono):**
- Editar banner, ícone, nome, descrição, categoria
- Toggle privacidade
- Gerenciar moderadores: buscar usuários membros, promover a moderador, remover moderador
- Editar regras da comunidade (lista de regras)
- Transferir propriedade
- Deletar comunidade (confirmação + danger zone)

**Funcionalidades (Moderador):**
- Editar descrição e regras
- Gerenciar membros

**API necessária:**
```
PUT /api/communities/:id
Body: FormData { name?, description?, category?, isPrivate?, rules? }
Response: { community: Community }

POST /api/communities/:id/moderators
Body: { userId: string }
DELETE /api/communities/:id/moderators/:userId

PUT /api/communities/:id/transfer
Body: { newOwnerId: string }

DELETE /api/communities/:id
```

---

### `/settings` — Hub de Configurações

**Descrição:** Página central de configurações com grupos navegáveis.

**Grupos:**
- Conta → `/settings/account`
- Privacidade e Segurança → `/settings/privacy`
- Notificações → `/settings/notifications`
- Aparência → `/settings/appearance`
- Segurança → `/settings/security`
- Usuários Bloqueados → `/settings/blocked`
- Sobre o Orbit (versão, termos, política de privacidade)
- Sair (logout)

---

### `/settings/account` — Configurações de Conta

**Funcionalidades:**
- Alterar email (solicita senha atual)
- Alterar senha (senha atual + nova + confirmar)
- Alterar @username
- Seção "Contas conectadas" (Google, Apple -- visual only)
- Zona de perigo: Desativar conta | Deletar conta permanentemente (com confirmação)

**API necessária:**
```
PUT /api/users/me/email
Body: { email: string, currentPassword: string }

PUT /api/users/me/password
Body: { currentPassword: string, newPassword: string }

PUT /api/users/me/username
Body: { username: string }

POST /api/users/me/deactivate
DELETE /api/users/me
```

---

### `/settings/privacy` — Privacidade e Segurança

**Funcionalidades:**
- Toggle: Perfil Privado (se ativo, apenas seguidores aprovados veem posts)
- Seletor: "Quem pode te enviar solicitações de Círculo" — Todos / Só seguidores / Ninguém
- Seletor: "Quem pode te enviar mensagens" — Todos / Só círculos / Ninguém
- Toggle: Confirmações de leitura (DMs)
- Link rápido para /settings/blocked

**API necessária:**
```
PUT /api/users/me/privacy
Body: {
  isPrivate?: boolean,
  circleRequestsFrom?: "everyone"|"followers"|"nobody",
  messagesFrom?: "everyone"|"circles"|"nobody",
  readReceipts?: boolean
}
Response: { user: User }
```

---

### `/settings/blocked` — Usuários Bloqueados

**Funcionalidades:**
- Lista de usuários bloqueados: avatar, nome, @handle, botão Desbloquear
- Empty state: "Nenhum usuário bloqueado"

**API necessária:**
```
GET /api/users/me/blocked?cursor=:cursor
Response: { users: User[], nextCursor: string | null }

DELETE /api/users/:username/block
Response: { success: boolean }
```

---

### `/settings/notifications` — Preferências de Notificação

**Funcionalidades:**
- Grupos de toggle:
  - Círculos: solicitações, aceites
  - Seguidores: novos seguidores
  - Menções: menções em posts, menções em comentários
  - Reações: curtidas, reposts
  - Comunidades: novos posts, convites
  - Mensagens: novas mensagens
- Seção Notificações por Email (toggle geral + por tipo)
- Seção Notificações Push (toggle geral + por tipo)

**API necessária:**
```
PUT /api/users/me/notification-preferences
Body: {
  circles: boolean,
  followers: boolean,
  mentions: boolean,
  reactions: boolean,
  communities: boolean,
  messages: boolean,
  emailEnabled: boolean,
  pushEnabled: boolean
}
Response: { preferences: NotificationPreferences }
```

---

### `/settings/appearance` — Aparência

**Funcionalidades:**
- Slider de tamanho de fonte (Pequeno / Médio / Grande)
- Seletor de cor de destaque: Azul / Violeta / Rosa / Verde / Laranja
- Nota: o app é sempre dark mode

**API necessária:**
```
PUT /api/users/me/appearance
Body: { fontSize?: "small"|"medium"|"large", accentColor?: string }
Response: { preferences: AppearancePreferences }
```

---

### `/settings/security` — Segurança

**Funcionalidades:**
- Toggle de autenticação de dois fatores (2FA)
- Lista de sessões ativas: ícone do dispositivo, nome do dispositivo, localização aproximada, último acesso, botão "Revogar"
- Botão "Revogar todas as sessões exceto esta"
- Log de atividade de login (últimos 10 logins: device, ip, data)

**API necessária:**
```
GET /api/auth/sessions
Response: { sessions: Session[] }

DELETE /api/auth/sessions/:sessionId
DELETE /api/auth/sessions  (revoke all except current)

PUT /api/auth/2fa
Body: { enabled: boolean }
Response: { twoFaEnabled: boolean, qrCode?: string }

GET /api/auth/login-activity
Response: { activities: LoginActivity[] }
```

---

## Comportamentos Globais

### Autenticação
- Token JWT armazenado em localStorage (ou httpOnly cookie)
- Redirect para `/login` se não autenticado e tenta acessar rota protegida
- Refresh automático do token

### Privacidade
- Perfis privados: posts ocultados para não-seguidores
- Usuários bloqueados: invisíveis no feed e na busca para ambos os lados

### Notificações em Tempo Real
- WebSocket ou SSE para notificações push em tempo real
- Badge contador no ícone da nav atualizado em tempo real

### Navegação
- **Mobile:** Bottom nav bar (5 itens: Home, Search, Notifications, Messages, Profile) + FAB (+) para compor
- **Desktop:** Sidebar esquerda com todos os itens de nav + coluna central + coluna direita com sugestões

### Header Padrão
- Logo Orbit (esquerda)
- Título da tela atual (centro)
- Ações contextuais (direita): sino de notificações, ícone de DM, avatar do usuário

---

## Convenções de API

- Base URL: `/api`
- Autenticação: `Authorization: Bearer <token>` em todas as rotas protegidas
- Paginação: cursor-based (`cursor` param, retorna `nextCursor`)
- Erros: `{ error: string, code?: string }`
- Upload de mídia: `multipart/form-data`
- Timestamps: ISO 8601

---

*Documento gerado para handoff de backend. Versão 1.0 — Orbit Social Network.*
