# R2-07 — SQL gerado, paginação e planos de execução

**Status:** SQL capturado dos métodos Drizzle reais com driver PostgreSQL falso; `EXPLAIN (FORMAT JSON)` executado no banco de desenvolvimento pelo pool runtime, sem `ANALYZE`. Nenhuma consulta de aplicação foi enviada ao banco durante a captura; nenhum dado de aplicação foi lido.

## Método de captura

O script `experimentos/capture-social-query-sql.mjs` importa os repositórios reais, intercepta `pg.Pool.query` antes de executar as funções e devolve conjunto vazio. Isso captura o SQL produzido pelo Drizzle sem executar os SELECTs funcionais. Para cada SQL capturado, envia ao banco de desenvolvimento apenas `EXPLAIN (FORMAT JSON) <SELECT>` com parâmetros sintéticos e sem `ANALYZE`. Os valores de bind não são reproduzidos.

## SQL exato capturado

### Feed — Para você

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."created_at" < $1 or ("feed"."posts"."created_at" = $2 and "feed"."posts"."id" < $3)) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $4
```

### Feed — Seguindo

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."author_id" in ($1) and ("feed"."posts"."created_at" < $2 or ("feed"."posts"."created_at" = $3 and "feed"."posts"."id" < $4))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $5
```

### Feed — Artigos

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."format" = $1 and ("feed"."posts"."created_at" < $2 or ("feed"."posts"."created_at" = $3 and "feed"."posts"."id" < $4))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $5
```

### Feed — Vídeos

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."format" = $1 and "feed"."posts"."media" @> '[{"type":"video"}]'::jsonb and ("feed"."posts"."created_at" < $2 or ("feed"."posts"."created_at" = $3 and "feed"."posts"."id" < $4))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $5
```

### Feed — Busca textual e prefixo de hashtag

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ((position(lower($1) in lower("feed"."posts"."content")) > 0 or position(lower($2) in lower(coalesce("feed"."posts"."article_title", ''))) > 0 or position(lower($3) in lower(coalesce("feed"."posts"."article_body", ''))) > 0 or exists (
                    select 1
                    from "feed"."post_tags"
                    where "feed"."post_tags"."post_id" = "feed"."posts"."id"
                      and "feed"."post_tags"."normalized_tag" like $4 escape E'\\'
                  )) and ("feed"."posts"."created_at" < $5 or ("feed"."posts"."created_at" = $6 and "feed"."posts"."id" < $7))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $8
```

### Perfil — posts do autor

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."author_id" = $1 and "feed"."posts"."format" = $2 and ("feed"."posts"."created_at" < $3 or ("feed"."posts"."created_at" = $4 and "feed"."posts"."id" < $5))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $6
```

### Comentários de um post

```sql
select "id", "post_id", "author_id", "client_mutation_id", "reply_to_comment_id", "content", "created_at" from "feed"."post_comments" where ("feed"."post_comments"."post_id" = $1 and ("feed"."post_comments"."created_at" > $2 or ("feed"."post_comments"."created_at" = $3 and "feed"."post_comments"."id" > $4))) order by "feed"."post_comments"."created_at" asc, "feed"."post_comments"."id" asc limit $5
```

### Perfil — dados de apresentação

```sql
select "account_id", "first_name", "last_name", "display_name", "bio", "location_label", "website_url", "is_private" from "profiles"."account_profiles" where "profiles"."account_profiles"."account_id" = $1 limit $2
```

### Busca social de contas verificadas — página 1

```sql
select "accounts"."accounts"."id" from "accounts"."accounts" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" inner join "profiles"."account_profiles" on "profiles"."account_profiles"."account_id" = "accounts"."accounts"."id" where ("accounts"."accounts"."status" = $1 and "accounts"."account_emails"."verified_at" is not null and ("accounts"."accounts"."username" ilike $2 or "profiles"."account_profiles"."display_name" ilike $3)) order by "accounts"."accounts"."username" asc, "accounts"."accounts"."id" asc limit $4
```

### Busca social — página seguinte

```sql
select "accounts"."accounts"."id" from "accounts"."accounts" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" inner join "profiles"."account_profiles" on "profiles"."account_profiles"."account_id" = "accounts"."accounts"."id" where ("accounts"."accounts"."status" = $1 and "accounts"."account_emails"."verified_at" is not null and ("accounts"."accounts"."username" ilike $2 or "profiles"."account_profiles"."display_name" ilike $3)) order by "accounts"."accounts"."username" asc, "accounts"."accounts"."id" asc limit $4 offset $5
```

### Seguidores — página seguinte

```sql
select "profiles"."account_follows"."follower_id" from "profiles"."account_follows" inner join "accounts"."accounts" on "accounts"."accounts"."id" = "profiles"."account_follows"."follower_id" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" where ("profiles"."account_follows"."followed_id" = $1 and "accounts"."accounts"."status" = $2 and "accounts"."account_emails"."verified_at" is not null) order by "profiles"."account_follows"."created_at" desc limit $3 offset $4
```

### Seguindo — página seguinte

```sql
select "profiles"."account_follows"."followed_id" from "profiles"."account_follows" inner join "accounts"."accounts" on "accounts"."accounts"."id" = "profiles"."account_follows"."followed_id" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" where ("profiles"."account_follows"."follower_id" = $1 and "accounts"."accounts"."status" = $2 and "accounts"."account_emails"."verified_at" is not null) order by "profiles"."account_follows"."created_at" desc limit $3 offset $4
```

### Círculo — página seguinte

```sql
select "profiles"."account_follows"."followed_id" from "profiles"."account_follows" inner join "accounts"."accounts" on "accounts"."accounts"."id" = "profiles"."account_follows"."followed_id" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" where ("profiles"."account_follows"."follower_id" = $1 and "accounts"."accounts"."status" = $2 and "accounts"."account_emails"."verified_at" is not null and exists (
        select 1 from "profiles"."account_follows" reciprocal
        where reciprocal.follower_id = "profiles"."account_follows"."followed_id"
          and reciprocal.followed_id = "profiles"."account_follows"."follower_id"
      )) order by "profiles"."account_follows"."created_at" desc limit $3 offset $4
```

## EXPLAIN sem ANALYZE

| Consulta | Plano observado no banco de desenvolvimento | Interpretação limitada |
|---|---|---|
| Feed Para você | `Seq Scan` em `feed.posts` + `Sort` + `Limit` | Não há índice escolhido para a ordenação global nesta estimativa. O planner estimou tabela pequena; não é benchmark de escala. |
| Feed Seguindo | `Index Scan` em `feed_posts_author_created_id` | Índice atende ao recorte por autor/cursor. |
| Feed Artigos | `Seq Scan` + `Sort` | Sem índice específico escolhido para formato global nesta estimativa. |
| Feed Vídeos | `Seq Scan` + `Sort` | O filtro JSONB de vídeo não usou índice no plano observado. |
| Feed com hashtag | bitmap em posts e `feed_post_tags_normalized_prefix_idx` | O prefixo de hashtag usou índice; o texto em caption/título/corpo usa `position(lower(...))`, sem índice textual observado. |
| Posts do perfil | `Index Scan` em `feed_posts_author_created_id` | Índice atende autor e ordenação/cursor. |
| Comentários | `Index Scan` em `feed_post_comments_post_created_id` | Índice atende post e cursor de comentários. |
| Busca social de contas | `Seq Scan` em `accounts`; nested loops e PKs para as outras tabelas | Busca `ILIKE '%termo%'` não selecionou índice de texto/trigrama. |
| Seguidores/seguindo/Círculo | `Seq Scan` em `accounts`, nested loops e índices de chave nas relações | Estimativa pequena; não comprova capacidade em volume. |
| Apresentação de perfil | `Index Scan` em `account_profiles_pkey` | Busca por account ID usa PK. |

Os planos foram produzidos sem `ANALYZE`; não executam a consulta nem medem latência real. As estimativas refletem estatísticas e volume do banco de desenvolvimento observado e não servem como projeção de produção.

## Paginação e filtragem observadas

- Feed global e lista de posts no perfil usam cursor keyset em `(created_at, id)`, ordenação estável e consulta em lotes. A aplicação filtra visibilidade após carregar cada lote; o feed global pode examinar até 1.000 posts por solicitação e a lista do perfil até 500 (`listGlobalFeed.ts:16-17,63-80,86-127`; `listProfilePosts.ts:12-13,36-50,57-87`). A filtragem pós-query é necessária para os predicados atuais e pode produzir página curta quando muitos posts são invisíveis.
- Comentários usam keyset ascendente em `(created_at, id)` e só chegam ao repositório depois de `readPost` autorizar o post (`listPostComments.ts:25-32`; `postCommentRepository.ts:94-116`).
- Seguidores, seguindo e Círculo usam cursor codificado que representa `offset`, `LIMIT + 1`, e `OFFSET`; a ordenação SQL usa apenas `created_at DESC`, sem desempate por ID (`routeSupport.ts:33-63`; `socialAccountListRepository.ts:32-61,79-97`).
- As listas convertem IDs para account views depois de paginar IDs. `accountViewsByIds` remove relações bloqueadas e omite identidades sem resumo (`profileViews.ts:80-120`; `getAccountSocialSummariesByIds.ts:44-48`). Os endpoints de seguidores/seguindo calculam `nextCursor` com a quantidade **já filtrada** (`followerListRoutes.ts:48-49`; `followingListRoutes.ts:48-49`; `routeSupport.ts:52-63`).
- Consequência verificável da composição: se uma das `limit + 1` linhas selecionadas for removida no mapeamento posterior por bloqueio ou mudança concorrente de identidade, a resposta pode ficar com `limit` ou menos itens; o `pageResult` pode então retornar `nextCursor: null`, embora existam relações além do offset. A consulta também não tem desempate único em `created_at`. Trata-se de risco real de paginação incompleta/instável, não de vazamento de conteúdo.
- A busca social também filtra IDs via account views; seu cursor, contudo, é calculado a partir da página bruta de IDs, não do total final de views (`relationshipListQueries.ts:40-71`).
- O cursor global é Base64URL de JSON, sem assinatura; valida versão, aba, viewer, termo, data e formato do ID (`globalFeedCursor.ts:10-24,27-63`). A data/ID da posição podem ser alterados por quem chama a API; isso permite saltar/duplicar trechos da timeline, mas cada resultado continua passando por `canReadPost` (`listGlobalFeed.ts:93-114`), portanto a alteração não amplia a autorização de leitura.
- O feed “Seguindo” busca todos os IDs de contas seguidas numa consulta sem `LIMIT`/paginação; só depois a busca de posts tem limite de varredura de 1.000 (`socialAccountListRepository.ts:64-76`; `listGlobalFeed.ts:16-17,39-42,63-80`). Um grafo de seguimento muito grande cresce em memória e em parâmetros SQL mesmo que a página final seja pequena.
- `stats.posts` é calculado por `count(*)` de todos os registros do autor, sem predicado de audiência; o resultado alimenta o contador de publicações do perfil remoto (`postRepository.ts:88-99`; `getAccountSocialSummariesByIds.ts:22-24,57-62`; `Profile.tsx:339-343`). Assim, o total pode incluir posts `circles`/`private` que aquele viewer não consegue listar.
- Contagens de likes, comentários e reposts agregam todas as linhas para os posts autorizados, sem excluir autores bloqueados; no endpoint de comentários, views de autores bloqueados são omitidas (`postInteractionSummaryRepository.ts:22-49`; `listPostComments.ts:35-55`; `getAccountSocialSummariesByIds.ts:44-48`). O bloqueio remove follows e pedidos, não estas interações (`blockMutationRepository.ts:19-29`). O efeito é apenas agregado: os IDs/identidades dessas interações não são enviados na contagem do post.

## Achados novos

### R2-07-001 — Paginação de relações pode truncar/instabilizar resultados

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/social/infrastructure/socialAccountListRepository.ts:32-61,79-97` usa `OFFSET` e ordena somente por `created_at`; `modules/social/application/relationshipListQueries.ts:40-71` mapeia e filtra IDs após a consulta.
- **Risco:** Médio — alterações concorrentes, empates de timestamp ou linhas omitidas no mapeamento podem truncar ou reordenar páginas sem revelar conteúdo.

### R2-07-002 — Busca social por substring faz varredura de contas

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/social/infrastructure/socialAccountListRepository.ts:12-29` usa `ILIKE '%termo%'`; `EXPLAIN` sem `ANALYZE` selecionou varredura de `accounts` (`R2-07`, linhas 100-110).
- **Risco:** Médio — o custo cresce com o número de contas; o plano atual não demonstra desempenho em volume.

### R2-07-003 — Feeds globais e filtros de vídeo não têm índice escolhido no plano observado

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** planos `EXPLAIN` de Feed Para você/Artigos/Vídeos mostram `Seq Scan`/`Sort`; o predicado JSONB não escolheu índice (`R2-07`, linhas 100-113).
- **Risco:** Médio — com volume maior, cada página pode exigir varredura/ordenação ampla; o resultado atual é só estimativa de desenvolvimento, sem benchmark.

### R2-07-004 — Feed Seguindo materializa todas as contas seguidas sem paginação

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/social/infrastructure/socialAccountListRepository.ts:64-76` retorna todos os IDs sem limite; `modules/feed/application/listGlobalFeed.ts:39-42,63-80` materializa a lista antes de limitar cada busca de posts.
- **Risco:** Médio — uma conta com rede de seguimento muito grande pode elevar memória, tamanho do filtro SQL e latência para obter uma página pequena.

### R2-07-005 — Contador público de publicações inclui audiências não visíveis ao visitante

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/feed/infrastructure/postRepository.ts:88-99` conta todos os posts do autor, sem filtrar `audience`; `modules/social/application/getAccountSocialSummariesByIds.ts:22-24,57-62` expõe esse total em `stats.posts`, usado no perfil remoto (`Aplicativo/front/src/modules/profile/screens/Profile.tsx:339-343`).
- **Risco:** Baixo — o total revela quantas publicações restritas existem, embora o conteúdo continue protegido por `canReadPost`.

### R2-07-006 — Totais de interação incluem registros de autores bloqueados

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/feed/infrastructure/postInteractionSummaryRepository.ts:22-49` agrega likes, comentários e reposts sem filtro de bloqueio; `modules/social/infrastructure/blockMutationRepository.ts:19-29` remove follows/pedidos, não estas interações. `listPostComments.ts:35-55` omite autores bloqueados da lista, mas o total continua incluindo suas linhas.
- **Risco:** Baixo — uma pessoa pode ver totais que não correspondem às interações individualmente visíveis, mas os IDs dos autores bloqueados não são retornados pelo agregado.

### R2-07-007 — Posição do cursor global não tem assinatura

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/feed/application/globalFeedCursor.ts:10-24,27-59` codifica JSON em Base64URL e valida o escopo, mas não assina `createdAt`/`id`; `listGlobalFeed.ts:93-114` reaplica autorização em cada resultado.
- **Risco:** Baixo — o cliente pode saltar ou repetir trechos da timeline; a evidência não indica bypass de privacidade porque cada post é novamente filtrado.

## Ações derivadas (não executadas nesta auditoria)

1. Corrigir paginação de relações com chave de desempate e continuar a leitura até haver `limit + 1` itens visíveis.
2. Definir e medir índice/consulta de busca social e timeline com volume representativo.
3. Paginar ou limitar a lista de seguidos usada pelo feed; não tratar esse limite como limite de autorização.
4. Definir se o contador público de posts deve contar somente posts visíveis ao viewer.
5. Definir se agregados de interação devem ignorar contas bloqueadas, mantendo o mesmo contrato na lista de comentários.
6. Assinar o cursor ou documentar explicitamente que ele é só posição não confiável, mantendo sempre a autorização por post.

## R2-07 — Fechamento

- **Consultas capturadas:** 15 variantes/posições de página.
- **Planos EXPLAIN:** 15, sem `ANALYZE`.
- **Dados de aplicação:** nenhum lido.
- **Achados novos:** 7 (0 críticos, 0 altos, 4 médios, 3 baixos).
- **Integridade da captura:** SQL produzido pelos métodos Drizzle reais; chamadas dos métodos interceptadas por `pg.Pool` falso; somente os comandos `EXPLAIN` foram enviados ao pool de desenvolvimento.
