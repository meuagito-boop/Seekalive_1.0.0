# R2-04 — Matriz de visibilidade: perfis, publicações, comentários, avaliações e mídias

**Status:** revisão estática dos predicados e caminhos consumidores concluída. A autorização dinâmica segue não verificada por testes, conforme R2-01-001.

## Predicados centrais observados

- `canViewPrivateProfileContent` deixa passar perfil público; para perfil privado, só titular ou seguidor aprovado (`modules/profiles/domain/profileVisibility.ts:1-9`).
- `canReadPost` primeiro recusa autor ausente ou bloqueio em qualquer direção; titular pode ler seus próprios posts; perfil privado exige seguimento aprovado mesmo para post `public`; `circles` exige mutualidade; audiência `private` exige perfil privado e seguidor aprovado (`modules/feed/application/postVisibility.ts:14-37`).
- O Círculo é computado como seguimento aceito do viewer **e** seguimento recíproco aceito (`modules/social/domain/relationshipView.ts:18-28`).
- Bloqueio é verificado nos perfis por username/ID, avaliações e nas publicações; retorno externo indistinguível de inexistência é `404` (`publicProfile.ts:50-57,95-123`; `businessProfileReviews.ts:127-157`).

## Tabela de verdade

| Perfil do autor | Viewer | Bloqueio entre contas | Conteúdo do perfil | Post `public` | Post `circles` | Post `private` | Avaliações comerciais |
|---|---|---:|---|---:|---:|---:|---:|
| Público | Titular | Não | Completo | Sim | Sim para o próprio titular | Sim para o titular | Se conta comercial |
| Público | Não segue | Não | Campos não privados | Sim | Não | Não | Sim se comercial e acessível |
| Público | Segue, sem reciprocidade | Não | Campos não privados | Sim | Não | Não | Sim se comercial e acessível |
| Público | Seguimento mútuo | Não | Campos não privados | Sim | Sim | Não | Sim se comercial e acessível |
| Privado | Titular | Não | Completo | Sim | Sim | Sim | Se conta comercial |
| Privado | Visitante ou solicitação pendente | Não | Identidade básica; campos privados ocultos | Não | Não | Não | Não |
| Privado | Seguidor aprovado, sem reciprocidade | Não | Campos privados visíveis | Sim | Não | Sim | Sim se comercial |
| Privado | Seguidor aprovado com reciprocidade | Não | Campos privados visíveis | Sim | Sim | Sim | Sim se comercial |
| Público ou privado | Qualquer viewer bloqueado por uma das partes | Sim | Perfil retorna como indisponível | Não | Não | Não | Não |

“Campos privados” nesta tabela refere-se à lógica de conteúdo/visibilidade, não amplia o contrato do DTO: o conjunto exato de campos no DTO público já está registrado na rodada 1 (`04-003`) e não é repetido aqui. A divergência documental sobre a audiência chamada `private` também já está registrada em `04-001`/`A2-003`; esta rodada confirma a implementação atual, sem mudar regra.

## Cobertura de leituras, referências e escritas

| Caminho | Proteção observada |
|---|---|
| Feed “Para você”, “Seguindo”, “Artigos” e “Vídeos” | As quatro abas entram na mesma rota/lister; texto e prefixo de hashtag são filtros SQL, depois cada resultado passa por `canReadPost`. “Seguindo” também exige seguimento aceito (`globalFeedRoutes.ts:8-13,31-93`; `listGlobalFeed.ts:35-53,72-114`). |
| Busca de publicações por texto/hashtag | Usa a mesma lister e filtro `canReadPost`; buscas alteram os predicados SQL, não removem a autorização por audiência (`globalFeedRoutes.ts:38-73`; `listGlobalFeed.ts:35-37,72-114`; SQL exato em R2-07). |
| Lista de posts/artigos no perfil | Resolução do autor + `canReadPost` antes de serializar; paginação/cursor avança por posts visíveis (`listProfilePosts.ts:27-71`). |
| Leitura de post por ID | `readPost` resolve autor/relacionamento e retorna `null` se `canReadPost` falhar (`readPost.ts:14-22`). |
| Comentários | A listagem chama `readPost` antes de consultar comentários; criação também chama `readPost`. Autores bloqueados não geram uma view e seus comentários são omitidos na resposta; a contagem agregada ainda inclui todas as linhas persistidas (R2-07-006) (`listPostComments.ts:25-46`; `router.ts:58-69`; `getAccountSocialSummariesByIds.ts:44-48`; `createPostComment.ts:39-59`; `setCommentLike.ts:23-29`). |
| Likes, reposts e salvos | Cada operação usa `readPost` antes de mutar e ao devolver o resultado (`setPostLike.ts:8-11`; `setPostRepost.ts:8-11`; `setPostBookmark.ts:8-11`). |
| Artigos e preview de referência | Ambos passam por `readPost`; referência não recebe acesso maior que o post original (`readArticle.ts:8-11`; `readPostReferencePreview.ts:17-24`). |
| Mídia publicada | A rota consulta o post por `readPost` e exige que a URL da mídia esteja no post legível; caso contrário retorna `404`. Resposta usa `private, no-store`, `nosniff` e valida range (`mediaRoutes.ts:152-219`). |
| Mídia em estágio temporário | Só o proprietário da conta acessa e apenas antes da expiração (`mediaRoutes.ts:168-172`). |
| Perfil público por username/ID | Passa `viewerId` autenticado ou `null`; bloqueio em qualquer direção torna o recurso indisponível. Para perfil privado, detalhes comerciais só são carregados quando o viewer pode ver conteúdo privado (`publicProfile.ts:50-90,95-123`). |
| Avaliações comerciais | Leitura resolve conta comercial, bloqueio e visibilidade privada antes de consultar a página; criação também exige conta pessoal revisora e perfil de negócio visível (`businessProfileReviews.ts:127-157,220-243,246-294`). |
| Listas de seguidores/seguindo | `resolveRelationshipListTarget` verifica bloqueio e perfil privado; perfil privado só permite lista a seguidor aprovado (`relationshipVisibility.ts:3-14`; `resolveRelationshipListTarget.ts:27-28`). |
| Busca de contas | Busca retorna views por viewer; as relações/bloqueios são resolvidos pela camada Social antes de retornar resumos (`accountSearchRoutes.ts:13-44`; `relationshipListQueries.ts:40-71`). Ela não é uma busca de conteúdo do perfil. |
| Círculo | Estado deriva de mutualidade aceita; o endpoint é lista separada, não equivale a todos os seguidores (`relationshipView.ts:18-28`; rota `circleRoutes.ts:17-30`). |
| Escritas de like, comentário, repost e bookmark | Cada aplicação chama `readPost` antes da mutação, que retorna `null` quando `canReadPost` falha; acesso apenas pelo ID não autoriza escrita (`setPostLike.ts:8-11`; `createPostComment.ts:39-59`; `setPostRepost.ts:8-11`; `setPostBookmark.ts:8-11`; `readPost.ts:14-22`). |
| Escritas de seguir/bloquear | Operações revalidam existência/estado ativo e bloqueio dentro da transação de Social (`followMutationRepository.ts:14-38,82-110`; `blockMutationRepository.ts:12-33`). Seguir um perfil privado cria/usa pedido de aprovação, não libera conteúdo antes de aceito. |
| Escritas em perfil/privacidade | Rotas de owner/privacy são protegidas por autenticação/CSRF; a política de visibilidade é alterada no domínio Profiles, não no Feed (`privacyRoutes.ts:13-24`; `profileViewMapper.ts:6-33`). |

### Rótulos de audiência no cliente

O composer de publicação e o editor de artigo mostram `Público`, `Círculo` e `Privado`; `Privado` é descrito em publicação como “Somente você” (`Aplicativo/front/src/modules/social/screens/Compose.tsx:20-24`; `ArticleEditor.tsx:18-21`). O predicado backend, contudo, permite que seguidor aprovado leia post `private` quando o perfil do autor é privado (`postVisibility.ts:14-37`; linha 22 desta matriz). Portanto o rótulo “Somente você” não descreve o comportamento real para contas privadas.

### Fronteira do Seek

O predicado de privacidade para perfil comercial está no domínio Profiles, mas esta árvore não contém uma API funcional de descoberta Seek que possamos exercitar para provar a exclusão de comerciais privados do resultado. A ausência da API/backend Seek e da cobertura correspondente já está registrada em R1 (`14-006`); não é reapresentada como novo achado. Esta rodada não presume que um endpoint de perfil seja um resultado de busca Seek.

## Achados

### R2-04-001 — Rótulo “Somente você” não corresponde à audiência `private` em perfil privado

- **Rodada 1:** amplia 04-001/A2-003
- **Veredito:** CONFIRMADO
- **Evidência:** `Aplicativo/front/src/modules/social/screens/Compose.tsx:20-24` define `private` como “Somente você”; `Aplicativo/back/src/modules/feed/application/postVisibility.ts:14-37` permite leitura também por seguidor aprovado quando o perfil é privado.
- **Risco:** Médio — a pessoa pode acreditar que uma publicação está visível somente para si, embora seguidores aprovados do perfil privado consigam lê-la.

## Resumo R2-04

- **Achados novos:** 1 (0 críticos, 0 altos, 1 médio, 0 baixos, 0 informativos).
- **R1 referenciado, sem duplicação:** `04-001`, `04-003`, `A2-003`, `14-006`.
- **Verificado em código:** matriz de perfil público/privado, seguimento aprovado, mutualidade do Círculo, bloqueio bidirecional, quatro abas de feed, buscas por texto/hashtag e propagação do gate do post a interações/mídia.
- **Não verificado:** concorrência/teste de autorização para todas as combinações; integração Seek ainda ausente na implementação atual.
