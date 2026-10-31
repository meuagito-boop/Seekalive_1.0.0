# Auditoria das 11 operações do Feed

**Data da revisão:** 2026-10-31
**Ambiente:** desenvolvimento. Não acessa produção nem altera o schema `public`. A suíte integrada executa `db push` e gravação somente em schema temporário aleatório; o fixture confirma fingerprint inalterado de `public` e remove o schema no encerramento.
**Escopo:** operações Feed explicitamente destacadas no Plano 1; análise individual do handler, contrato, dependências e evidência de teste.

## Critério de status

- **Montada:** método e caminho constam no grafo Express e no contrato OpenAPI.
- **Lógica de aplicação testada:** existe teste unitário da lógica de aplicação e ele foi executado nesta rodada.
- **HTTP/persistência validados:** exige executar a operação no servidor com autenticação, CSRF e persistência real; não foi declarado quando essa evidência não foi executada.

`Montada` não significa que uma operação foi exercitada ponta a ponta. Nenhuma das 11 operações recebe aqui o status “funcionalmente validada” apenas por aparecer no roteador.

## Matriz operação por operação

| Método e endpoint | Handler / camada de aplicação | Evidência disponível | Resultado desta revisão |
|---|---|---|---|
| `GET /v1/social/feed` | `presentation/globalFeedRoutes.ts` → `application/listGlobalFeed.ts` | `feed-global-listing.test.mjs` cobre visibilidade, Following, busca normalizada, cursor e artigos/vídeos. `api-isolated-db.test.mjs` exercita HTTP autenticado em abas For You, Following e Articles. | **Montada; lógica de aplicação, HTTP autenticado e leitura persistida validados no schema isolado.** |
| `GET /v1/social/posts/{postId}/comments` | `presentation/postCommentRoutes.ts` → leitura de publicação e `application/listPostComments.ts` | `feed-interactions-application.test.mjs` cobre visibilidade/paginação; integração lista comentários autenticada e valida comentários após remoção. | **Montada; lógica, HTTP autenticado e leitura persistida validados no schema isolado.** |
| `POST /v1/social/posts/{postId}/comments` | `presentation/postCommentRoutes.ts` → `application/createPostComment.ts` | Integração cria comentário e resposta, confirma autoria, texto, replay idempotente e conflito de mesma chave com corpo diferente. | **Montada; HTTP autenticado, persistência, vínculo de resposta e idempotência validados no schema isolado.** |
| `DELETE /v1/social/comments/{commentId}` | `presentation/commentDeleteRoutes.ts` → `application/deletePostComment.ts` | Integração exclui comentário do titular, confirma a lista vazia e a contagem atualizada no post. | **Montada; titularidade, HTTP autenticado, exclusão e efeito persistido validados no schema isolado.** |
| `PUT /v1/social/posts/{postId}/like` | `presentation/postLikeRoutes.ts` → `application/setPostLike.ts` | Integração valida ativação, repetição sem duplicar contagem e estado lido na publicação. | **Montada; HTTP autenticado, persistência e idempotência validados no schema isolado.** |
| `DELETE /v1/social/posts/{postId}/like` | `presentation/postLikeRoutes.ts` → `application/setPostLike.ts` | Integração remove curtida e confirma contagem/estado atualizado. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `POST /v1/social/posts/{postId}/repost` | `presentation/postRepostRoutes.ts` → `application/setPostRepost.ts` | Integração valida criação, repetição sem duplicar contagem e estado lido na publicação. | **Montada; HTTP autenticado, persistência e idempotência validados no schema isolado.** |
| `DELETE /v1/social/posts/{postId}/repost` | `presentation/postRepostRoutes.ts` → `application/setPostRepost.ts` | Integração remove repost e confirma contagem/estado atualizado. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `PUT /v1/social/comments/{commentId}/like` | `presentation/commentLikeRoutes.ts` → `application/setCommentLike.ts` | Integração ativa curtida em comentário e confirma a contagem. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `DELETE /v1/social/comments/{commentId}/like` | `presentation/commentLikeRoutes.ts` → `application/setCommentLike.ts` | Integração remove curtida do comentário e confirma a contagem. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `DELETE /v1/social/posts/{postId}` | `presentation/postDeleteRoutes.ts` → `application/deletePost.ts` | Integração confirma que conta não titular recebe `404`, titular exclui publicação, a linha some e a referência permanece sem FK para o alvo removido. | **Montada; autorização, HTTP autenticado, exclusão e integridade referencial validados no schema isolado.** |

## Segurança observada no código

- As nove operações de escrita registram autenticação obrigatória, CSRF e limite de taxa; os detalhes de contrato e middleware por rota estão em `routes.generated.md`.
- A listagem de comentários exige sessão e verifica a leitura da publicação antes de retornar seus comentários.
- A rota de criação de comentário valida o corpo, não aceita autoria escolhida pelo cliente, normaliza o texto e encaminha chave de idempotência e vínculo de resposta à aplicação.
- Exclusões validam o identificador, derivam o titular da sessão e retornam `404` quando a operação de domínio não encontra recurso que o titular possa excluir.
- A extração das rotas e o teste de paridade verificam o registro e a correspondência do CSRF declarado. A análise de código não substitui teste HTTP autenticado nem prova comportamento da persistência.

## Resultado do teste HTTP autenticado

O cenário de integração que cobre estas operações está em `Aplicativo/back/test/api-isolated-db.test.mjs`. Seu fixture executa `drizzle-kit push` e `DROP SCHEMA ... CASCADE` exclusivamente em schema aleatório no banco de desenvolvimento.

Após autorização expressa para DDL exclusivamente no banco de desenvolvimento, executei `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE=heliumdb pnpm --filter @workspace/scripts run test:api-isolated-db` via `CodeExecution.shellExec`. A primeira rodada revelou tabela esperada ausente no fixture (`business_profile_reviews`); a seguinte encontrou três expectativas de ID de referência obsoletas. Corrigi esses quatro defeitos exclusivamente no suporte/teste, sem alterar as regras ou handlers.

**Resultado final:** 5/5 testes passaram, 0 falhas. O fixture confirmou o fingerprint do schema `public` inalterado, removeu o schema isolado e encerrou o pool. Uma consulta somente leitura posterior confirmou zero schemas `seekalive_test_%` remanescentes no banco `heliumdb`. A tentativa alternativa de sobrescrever o workflow de API gerenciado foi rejeitada; sua configuração permaneceu inalterada.

## Conclusão

As 11 operações estão **montadas** e sem divergência de método/caminho em relação ao OpenAPI. Nesta rodada, além da cobertura unitária e das rejeições sem sessão/CSRF, os caminhos HTTP autenticados e as operações de persistência cobertas foram executados e aprovados na suíte integrada isolada. O resultado é do ambiente de desenvolvimento; não é evidência de comportamento em produção.
