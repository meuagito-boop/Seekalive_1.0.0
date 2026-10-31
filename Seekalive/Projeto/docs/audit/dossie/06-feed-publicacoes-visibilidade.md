# 06 — Feed, publicações, visibilidade, interações e tags

## Escopo

Confronto do backend Feed e dos contratos usados pelo cliente: páginas “Para você”, “Seguindo”, “Artigos” e “Vídeos”; visibilidade por público; criação/remoção; cursor; busca e hashtags. Nenhum conteúdo de conta foi consultado.

## Achados

### 06-001 — As quatro abas têm filtros explícitos no endpoint

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `feed/presentation/globalFeedRoutes.ts:8–23,31–91` aceita `for-you`, `following`, `articles` e `videos`, limita a página a 50 itens e exige autenticação para `following`. `feed/application/listGlobalFeed.ts:39–48,72–79` restringe seguindo aos IDs acompanhados, artigos ao formato `article` e vídeos a mídia com vídeo. O cliente envia os mesmos valores (`front/src/modules/social/services/restContracts.ts:72–94`).

**Trecho:** `feedTabs = new Set(["for-you", "following", "articles", "videos"])`; para vídeos, `videoOnly: input.tab === "videos"`.

### 06-002 — “Para você” é cronológico global, não um feed personalizado

**Veredito:** CONFIRMADO  
**Prioridade:** Alta antes de declarar o algoritmo concluído

**Evidência:** em `listGlobalFeed.ts:39–48`, a lista de contas seguidas só é buscada para a aba `following`; para `for-you` o filtro de autores permanece nulo. `feed/infrastructure/postRepository.ts:183–186` ordena por `created_at DESC, id DESC`.

**Trecho:** `const followingIds = input.tab === "following" ? await listFollowingIds(...) : null;` e `.orderBy(desc(feedPosts.createdAt), desc(feedPosts.id))`.

**Conclusão:** existe um feed público cronológico com filtros de acesso. Não há geração de candidatos, score, sinais de interesse ou ranking de recomendação. Isso é compatível com uma implementação em etapas, mas não entrega um algoritmo “Para você”.

### 06-003 — Restrições de privado, Círculo e bloqueio são aplicadas antes da resposta

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `feed/application/listGlobalFeed.ts:86–113` carrega autores e chama `canReadPost` antes de adicionar conteúdo. `feed/application/postVisibility.ts:14–37` nega autores bloqueados; exige seguimento aceito para perfis privados e exige `inCircle` para publicações do Círculo.

**Trecho:** `if (isInFollowingFeed && canReadPost(post, input.viewerId, author)) { items.push({ record: post, author }); }`.

### 06-004 — A paginação usa ordenação composta e cursor vinculado à aba e ao usuário

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `feed/infrastructure/postRepository.ts:172–186` aplica keyset por `(createdAt,id)` e ordena pelas mesmas colunas. `feed/application/globalFeedCursor.ts:10–24,27–59` serializa cursor com versão, aba, viewer, busca, data e ID; a leitura valida escopo e formato.

**Trecho:** cursor contém `{ version, tab, viewerId, searchTerm, createdAt, id }`; o parser rejeita cursor com aba ou viewer divergente.

**Limite:** o cursor é Base64URL, não assinado. A validação de escopo existe, e a visibilidade permanece no servidor; não foi demonstrado teste de tentativas de cursor adulterado nem de inserções concorrentes entre páginas.

### 06-005 — O limite de dez hashtags distintas e normalização sem acentos/caixa estão implementados

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `shared/contracts/src/feed/hashtags.ts:1–16` define o máximo de dez, remove diacríticos e normaliza para minúsculas. `:19–42` deduplica por valor normalizado. `feed/domain/postTags.ts:15–22` rejeita publicações acima do limite; `createPost.ts:13–21` chama a validação antes de persistir. `postRepository.ts:152–168` aplica busca por prefixo no índice de tags.

**Trecho:** `MAX_HASHTAGS_PER_POST = 10`; `value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")`.

**Exemplo:** hashtags equivalentes a `#café` e `#cafe` contam como uma tag distinta; uma busca por prefixo normalizado `cafe` pode incluir `cafeteira`. A busca por texto livre usa `lower()` e não a mesma remoção de acentos.

### 06-006 — Busca textual usa substring sem índice de texto correspondente identificado

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `feed/infrastructure/postRepository.ts:152–168` usa `position(lower(term) in lower(content/title/body))`; os índices catalogados no bloco 05 incluem índice de prefixo para tags, mas não índice de texto para conteúdo, título ou corpo. `EXPLAIN (COSTS TRUE, FORMAT TEXT)` de uma forma representativa da busca textual retornou `Seq Scan on posts`, seguido de `Sort`; não foi usado `ANALYZE`.

**Trecho:** `position(lower(${input.searchTerm}) in lower(${feedPosts.content})) > 0`.

**Consulta e saída resumida:** `EXPLAIN (COSTS TRUE, FORMAT TEXT) SELECT id, author_id, created_at FROM feed.posts WHERE position(lower($1::text) in lower(content)) > 0 ORDER BY created_at DESC, id DESC LIMIT 51`, parâmetro fictício `cafe`: `Seq Scan on posts` com filtro `POSITION(...) > 0`; depois `Sort` por `created_at DESC, id DESC`. O plano estimou 23 linhas; isso é estimativa do planner, não contagem de registros.

**Impacto:** a forma representativa da busca textual exige varredura de posts e ordenação. Os filtros completos de visibilidade, formato, tags e cursor podem alterar o plano; o custo com volume futuro não é inferido deste catálogo pequeno.

### 06-007 — Publicações e artigos têm limites e formatos verificados também no banco

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `front/src/modules/social/application/contentValidation.ts:13–25,39–57` valida texto até 280, título até 160, artigo até 50.000 e até oito mídias. `feed/infrastructure/postRepository.ts:50–69` persiste publicação, tags e referência na mesma transação. O catálogo do bloco 05 mostrou checks de formato, audiência e conteúdo em `feed.posts`.

**Trecho:** `content: z.string().max(280)`; `title: ...max(160)`; `body: ...max(50000)`; `mediaUrls: ...max(8)`.

### 06-008 — Repost é persistido como interação e contagem, mas não como item próprio do feed

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** o roteador liga `createPostRepostRoutes` e `setFeedPostRepost` (`feed/composition/router.ts:94–95, 119–133`). Porém, `listFeedPostsForTimeline` (`postRepository.ts:132–186`) seleciona linhas de `feed.posts` e não une eventos de `feed.post_reposts`; o resultado não carrega autor/data da republicação como item de timeline.

**Trecho:** `listFeedPostsForTimeline` executa `.select().from(feedPosts)`; não há seleção de `feedPostReposts` nesse leitor.

**Impacto:** curtir/repostar e mostrar a contagem têm suporte; exibir uma republicação como conteúdo redistribuído no feed não foi demonstrado.

### 06-009 — O feed não tem estado de moderação explícito para ocultar publicações

**Veredito:** PARCIAL  
**Prioridade:** Alta antes de abrir a plataforma ao público

**Evidência:** a estrutura de publicação contém formato, audiência e conteúdo, sem coluna de status de moderação (`infra/database/src/schema/feed/posts.ts` e catálogo de colunas do bloco 05). O leitor filtra visibilidade por audiência, autor e bloqueio (`postVisibility.ts:14–37`), mas não por estado de denúncia/revisão.

**Trecho (catálogo do bloco 05):** as colunas de `feed.posts` não incluem estado de moderação; a consulta de `information_schema.columns` foi somente metadado.

**Limite:** Trust & Safety é um domínio ainda não construído. Não trato essa ausência como falha de uma funcionalidade que o projeto declarou adiar; ela impede, contudo, declarar o fluxo público de moderação concluído.

### 06-010 — O índice de autor e o índice de prefixo de hashtag aparecem nos planos representativos

**Afirmação da doc:** N/A — execução segura de `EXPLAIN` sem `ANALYZE`, usando parâmetros fictícios.

**Veredito:** CONFIRMADO
**Risco:** Informativo — o planner usa índices em formas simplificadas, mas os planos ainda incluem ordenação.

**Evidência:** `postRepository.ts:172–186` pagina por autor/data/ID e `:160–165` usa prefixo normalizado de tag. Consultas `EXPLAIN (COSTS TRUE, FORMAT TEXT)` usaram identificadores fictícios e não leram linhas da tabela.

**Consultas e saída resumida:**

- Timeline por `author_id = ANY($1::uuid[])`, cursor de primeiro lote e `LIMIT 51`: `Index Only Scan using feed_posts_author_created_id`, seguido de `Sort` por `created_at DESC, id DESC`.
- `EXISTS` sobre `feed.post_tags` com `normalized_tag LIKE $1::varchar`, parâmetro `cafe%`: `Bitmap Index Scan using feed_post_tags_normalized_prefix_idx`, `Bitmap Heap Scan`, lookup por `posts_pkey` e `Sort`.

**Limite:** são formas representativas e os custos/linhas são estimativas. Não equivalem à consulta completa do caso de uso com todos os predicados e relações de visibilidade.

### 06-011 — Os demais planos de consultas principais não foram cobertos por EXPLAIN

**Afirmação da doc:** O plano deve ser confrontado para feed global/seguindo, busca, timeline, relações e avaliações.

**Veredito:** NÃO VERIFICADO
**Risco:** Médio — a evidência de indexação é parcial e não cobre o conjunto de formas reais de consulta.

**Evidência:** foram executados apenas planos representativos da busca textual, timeline por autor e prefixo de hashtag. Não foi gerado plano para o feed completo com visibilidade, seguidores/seguindo, listagens de relações ou avaliações. O bloco 05 registrou a ausência de `profiles.business_profile_reviews` no snapshot original; essa tabela foi criada posteriormente pela migration `profiles/0003` no desenvolvimento. A falta de plano para o fluxo de avaliações continua válida.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 7 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** transações e concorrência entre operações que escrevem em mais de um registro.
