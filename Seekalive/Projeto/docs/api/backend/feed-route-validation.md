# Auditoria das 11 operações do Feed

**Data da revisão:** 2026-10-31
**Ambiente:** desenvolvimento. Não acessa produção nem executa migrations, `push`, DDL ou escritas. A suíte exercita `GET /readyz`, cujo health check executa `SELECT 1`; nenhum dado de negócio é consultado.
**Escopo:** operações Feed explicitamente destacadas no Plano 1; análise individual do handler, contrato, dependências e evidência de teste.

## Critério de status

- **Montada:** método e caminho constam no grafo Express e no contrato OpenAPI.
- **Lógica de aplicação testada:** existe teste unitário da lógica de aplicação e ele foi executado nesta rodada.
- **HTTP/persistência validados:** exige executar a operação no servidor com autenticação, CSRF e persistência real; não foi declarado quando essa evidência não foi executada.

`Montada` não significa que uma operação foi exercitada ponta a ponta. Nenhuma das 11 operações recebe aqui o status “funcionalmente validada” apenas por aparecer no roteador.

## Matriz operação por operação

| Método e endpoint | Handler / camada de aplicação | Evidência disponível | Resultado desta revisão |
|---|---|---|---|
| `GET /v1/social/feed` | `presentation/globalFeedRoutes.ts` → `application/listGlobalFeed.ts` | `feed-global-listing.test.mjs` cobre visibilidade, feed Following, busca normalizada, cursor e aba de vídeos. O teste HTTP correspondente existe em `api-isolated-db.test.mjs`. | **Montada; lógica de aplicação testada.** A execução HTTP com sessão e persistência não foi feita nesta revisão. |
| `GET /v1/social/posts/{postId}/comments` | `presentation/postCommentRoutes.ts` → leitura de publicação e `application/listPostComments.ts` | `feed-interactions-application.test.mjs` cobre visibilidade, paginação e enriquecimento da página. O teste runtime sem sessão retorna `401`. | **Montada; lógica de aplicação e rejeição sem sessão testadas.** Sucesso autenticado e persistência não verificados nesta revisão. |
| `POST /v1/social/posts/{postId}/comments` | `presentation/postCommentRoutes.ts` → `application/createPostComment.ts` | `feed-interactions-application.test.mjs` cobre autorização do post/resposta, texto, chave de idempotência e DTO. O teste runtime sem CSRF retorna `403`; o E2E existente cobre replay conflitante, mas não foi executado. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |
| `DELETE /v1/social/comments/{commentId}` | `presentation/commentDeleteRoutes.ts` → `application/deletePostComment.ts` | `feed-interactions-application.test.mjs` cobre a delegação de ID e titular. O teste runtime sem CSRF retorna `403`; o E2E existente cobre cascata, mas não foi executado. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Autorização HTTP e persistência não verificadas nesta revisão. |
| `PUT /v1/social/posts/{postId}/like` | `presentation/postLikeRoutes.ts` → `application/setPostLike.ts` | `feed-interactions-application.test.mjs` cobre leitura autorizada antes da mutação, ativação e retorno da publicação atualizada. O teste runtime sem CSRF retorna `403`. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |
| `DELETE /v1/social/posts/{postId}/like` | `presentation/postLikeRoutes.ts` → `application/setPostLike.ts` | `feed-interactions-application.test.mjs` cobre a solicitação de remoção (`liked=false`) e a releitura. O teste runtime sem CSRF retorna `403`. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |
| `POST /v1/social/posts/{postId}/repost` | `presentation/postRepostRoutes.ts` → `application/setPostRepost.ts` | `feed-interactions-application.test.mjs` cobre leitura autorizada antes da mutação, criação e retorno da publicação atualizada. O teste runtime sem CSRF retorna `403`. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |
| `DELETE /v1/social/posts/{postId}/repost` | `presentation/postRepostRoutes.ts` → `application/setPostRepost.ts` | `feed-interactions-application.test.mjs` cobre a solicitação de remoção (`reposted=false`) e a releitura. O teste runtime sem CSRF retorna `403`. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |
| `PUT /v1/social/comments/{commentId}/like` | `presentation/commentLikeRoutes.ts` → `application/setCommentLike.ts` | `feed-interactions-application.test.mjs` cobre autorização pela leitura do post pai, ativação e retorno do estado atualizado. O teste runtime sem CSRF retorna `403`. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |
| `DELETE /v1/social/comments/{commentId}/like` | `presentation/commentLikeRoutes.ts` → `application/setCommentLike.ts` | `feed-interactions-application.test.mjs` cobre remoção (`liked=false`) e retorno do estado atualizado. O teste runtime sem CSRF retorna `403`. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |
| `DELETE /v1/social/posts/{postId}` | `presentation/postDeleteRoutes.ts` → `application/deletePost.ts` | `feed-application-injection.test.mjs` cobre a delegação de exclusão na aplicação. O cenário HTTP existente cobre remoção do post, comentários e autorização do titular; não foi executado. O teste runtime sem CSRF retorna `403`. | **Montada; lógica de aplicação e rejeição sem CSRF testadas.** Sucesso HTTP autenticado e persistência não verificados nesta revisão. |

## Segurança observada no código

- As nove operações de escrita registram autenticação obrigatória, CSRF e limite de taxa; os detalhes de contrato e middleware por rota estão em `routes.generated.md`.
- A listagem de comentários exige sessão e verifica a leitura da publicação antes de retornar seus comentários.
- A rota de criação de comentário valida o corpo, não aceita autoria escolhida pelo cliente, normaliza o texto e encaminha chave de idempotência e vínculo de resposta à aplicação.
- Exclusões validam o identificador, derivam o titular da sessão e retornam `404` quando a operação de domínio não encontra recurso que o titular possa excluir.
- A extração das rotas e o teste de paridade verificam o registro e a correspondência do CSRF declarado. A análise de código não substitui teste HTTP autenticado nem prova comportamento da persistência.

## Estado do teste HTTP autenticado

O cenário de integração que cobre estas operações está em `Aplicativo/back/test/api-isolated-db.test.mjs`. Seu fixture executa `drizzle-kit push` e `DROP SCHEMA ... CASCADE` para preparar e remover schema.

Após autorização expressa para DDL somente no banco de desenvolvimento, tentei executar `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 pnpm --filter @workspace/scripts run test:api-isolated-db`. O teste parou na validação inicial, antes de conectar ao banco, porque o processo de shell não recebeu `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE`. A presença de `DATABASE_URL` como variável gerenciada foi confirmada sem acessar seu valor, mas essa variável não está disponível ao processo de teste. Nenhum schema foi criado, nenhum `db push` ou `DROP SCHEMA` foi executado e nenhuma escrita ocorreu.

O bloqueio atual é de ambiente de execução, não de autorização. Não foi substituído por um teste com banco falso nem por uma afirmação de aprovação.

## Conclusão

As 11 operações estão **montadas** e sem divergência de método/caminho em relação ao OpenAPI. Nesta rodada, a lógica de aplicação das 11 operações (listagem, comentários, curtidas, reposts e exclusão) e as rejeições sem sessão/CSRF foram testadas. DDL para teste de desenvolvimento foi autorizada, mas a suíte integrada não passou da validação de ambiente porque a conexão gerenciada não foi injetada no processo. Portanto, não há evidência suficiente para afirmar os caminhos HTTP de sucesso, autorização de titular integrada ao banco e persistência ponta a ponta.
