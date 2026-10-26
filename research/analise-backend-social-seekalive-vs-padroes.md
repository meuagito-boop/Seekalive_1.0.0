# Avaliação do backend Social do Seekalive frente a redes sociais e padrões públicos

**Data:** 25 de outubro de 2026 (America/Sao_Paulo)  
**Profundidade:** pesquisa profunda; comparação técnica, sem alterações de código  
**Fontes consultadas:** 39 URLs únicas, com evidências em research/sources/  
**Escopo:** domínio Feed implementado e contratos próximos. Não é auditoria de todo Social nem reconstrução de algoritmos proprietários.

## Resumo executivo

O backend atual do Seekalive é uma primeira fatia de publicações, não o backend de uma rede social completa. Já há fundamentos coerentes: Feed possui domínio e schema próprios; a autoria vem da sessão; regras de audiência estão no servidor; a listagem por perfil usa ordenação cronológica e cursor keyset; escritas exigem CSRF; há limites por rota; e mídia é recusada explicitamente em vez de aceitar URLs arbitrárias. Isso é uma base melhor do que simular persistência inexistente.

Há dois defeitos de contrato que devem ser corrigidos antes de ligar o frontend. Primeiro, o OpenAPI limita o cursor de requisição a 32 caracteres, mas o token produzido pelo próprio encoder tem cerca de 215 caracteres e o servidor aceita até 512. A API pode produzir um cursor que contradiz o contrato da próxima chamada. Segundo, um schema manual compartilhado permite mídia, enquanto OpenAPI e rota não permitem; o teste unitário importa esse schema manual, não o schema gerado que a rota realmente usa.

Ainda não existem no servidor comentários, respostas, curtidas, reposts, salvos, edição de posts, feed principal, ranking, denúncias, moderação ou pipeline de mídia. O DTO retorna zeros e falsos para interações ainda inexistentes. O frontend continua local/demonstrativo. A migração Feed foi gerada, mas não aplicada; o teste autenticado de persistência não foi executado. Conclusão: é uma base de desenvolvimento promissora, mas não está pronta para ser conectada como rede social funcional nem para produção. Não alterei o código.

## Contexto e limites

“Rede social” não determina um único modelo técnico. ActivityPub e ActivityStreams padronizam partes da federação, do endereçamento e do vocabulário das atividades; não definem uma UX universal de privacidade, armazenamento SQL, ranking ou moderação. Mastodon e Bluesky são exemplos comparáveis, não regras que o Seekalive deve copiar. [[1]](https://www.w3.org/TR/activitypub/) [[2]](https://www.w3.org/TR/activitystreams-core/) [[3]](https://www.w3.org/TR/activitystreams-vocabulary/) [[4]](https://docs.joinmastodon.org/methods/statuses/) [[5]](https://bsky.network/docs/about-bluesky-content/posts/)

Mantive as decisões já aprovadas: o dono aprova novos seguidores de perfil privado; seguidores aceitos veem posts de audiência pública; Círculo exige seguimento aceito nos dois sentidos; bloqueio oculta conteúdo entre as contas; e audiência privada significa somente o titular. A comparação separa comportamento existente, funcionalidades ainda não construídas e decisões de produto pendentes.

A busca/captura integrada retornou HTTP 402. Fontes públicas primárias foram coletadas por HTTP direto; DuckDuckGo apresentou desafio anti-bot. A captura estática da página do Meta sobre ranking não expôs conteúdo substantivo, então não atribuo sinais ou fórmulas ao Meta. Dois estudos revisados por pares foram obtidos diretamente e são limitados à plataforma, população, tratamento e medida estudados. [[6]](https://transparency.meta.com/features/explaining-ranking/)

## Achados

### 1. Audiência, privacidade e bloqueio

A função de autorização do Feed rejeita autor ausente ou bloqueio em qualquer direção; permite o titular ler seu próprio post; exige follow aceito para ler post público de perfil privado; exige mutualidade para Círculo; e deixa a audiência privada inacessível a qualquer outra conta. Os caminhos atuais de leitura individual e listagem de perfil consultam essa autorização. Isso corresponde às regras aprovadas e é o ponto mais sólido desta fatia. Evidências locais: Aplicativo/back/src/modules/feed/application/postVisibility.ts, readPost.ts e listProfilePosts.ts; os testes cobrem os casos básicos.

Não se deve importar sem análise o significado de visibilidade de outra rede. No Mastodon, “private” significa seguidores e pessoas mencionadas, não “somente o dono”. ActivityPub define endereçamento e filtragem por permissão no servidor, mas deixa escolhas de implantação. Bluesky informa que posts são tecnicamente públicos e que suas preferências regulam distribuição/alcance, não confidencialidade. A regra Seekalive é diferente e deve continuar sendo ACL real no servidor, não somente um rótulo. [[7]](https://docs.joinmastodon.org/entities/Status/) [[1]](https://www.w3.org/TR/activitypub/) [[8]](https://bsky.network/docs/about-bluesky-content/visibility-preferences) [[9]](https://bsky.network/docs/bluesky-api/following)

Ainda não está provado o comportamento de cache ou revogação fora do código de autorização. O Mastodon recomenda que seu cliente remova contas bloqueadas das timelines em cache; negar a próxima consulta não apaga cópias já entregues. OWASP recomenda autorização em cada solicitação e negar por padrão. RFC 9111 define diferenças entre cache privado/compartilhado e no-store, e alerta que no-store isoladamente não garante privacidade. Antes de produção, verificar headers, proxy/CDN e cache do cliente; não presumir que estejam vulneráveis nem que já estejam protegidos. [[10]](https://docs.joinmastodon.org/methods/accounts/#block) [[11]](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) [[12]](https://www.rfc-editor.org/rfc/rfc9111.html)

**Veredito:** regra central está bem representada; caches, revogação concorrente e integração com banco continuam não comprovados. Não encontrei evidência de bypass, mas os testes unitários não bastam para declarar autorização pronta para produção.

### 2. Ciclo de publicação, interações e contagens

O schema Feed tem posts/artigos, autor, audiência, conteúdo, data, versão, checks e índices cronológicos. A API cria, lê e exclui conteúdo próprio. Não há rota de edição, comentário/resposta, curtida, repost, compartilhamento ou favorito, nem tabelas para relações ator-post. A coluna version existe, mas não há fluxo de edição/concorrência usando-a. A remoção atual é DELETE físico. Evidências locais: infra/database/src/schema/feed.ts; Aplicativo/back/src/modules/feed/application/createPost.ts, deletePost.ts e postView.ts.

O DTO exige likes, comments, reposts, shares, isLiked e isReposted e sempre preenche zero/falso. Isso significa “não implementado”, não “nenhuma interação ocorreu”. Se a tela consumir o DTO, poderá mostrar dados falsos ou estado de botão incorreto. Antes da integração, implementar e consultar essas interações ou não apresentá-las como valores reais.

ActivityStreams oferece vocabulário para Like, Undo, Delete e Tombstone; não prescreve a estrutura SQL do Seekalive. HTTP define POST como não idempotente por padrão; uma repetição após timeout pode criar duplicata se não existir mecanismo para detectar/reproduzir a primeira operação. OWASP orienta segurança REST. Bluesky modela curtida e repost como registros ligados a um post; Mastodon expõe ações separadas para favorito/repost e desfazimento. São implementações específicas, não norma universal. [[3]](https://www.w3.org/TR/activitystreams-vocabulary/) [[2]](https://www.w3.org/TR/activitystreams-core/) [[13]](https://www.rfc-editor.org/rfc/rfc9110.html) [[14]](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) [[15]](https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/packages/api/lexicons/app/bsky/feed/like.json) [[16]](https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/packages/api/lexicons/app/bsky/feed/repost.json) [[4]](https://docs.joinmastodon.org/methods/statuses/) [[5]](https://bsky.network/docs/about-bluesky-content/posts/)

A exclusão física não é automaticamente errada para a primeira tabela, mas precisa de decisão quando houver respostas, reposts, mídia, notificações, referências e moderação. ActivityStreams inclui Tombstone como vocabulário possível, mas não determina a retenção do Seekalive. A arquitetura do projeto propõe estado removido e invalidação de dependências; isso ainda é proposta, não regra aprovada nem código implementado. [[3]](https://www.w3.org/TR/activitystreams-vocabulary/) [[17]](https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/lexicons/com/atproto/repo/deleteRecord.json) [[13]](https://www.rfc-editor.org/rfc/rfc9110.html)

**Veredito:** criação textual é uma base. Para fechar o ciclo da publicação, faltam interações persistidas, edição, idempotência, semântica de exclusão e valores verdadeiros de contagem.

### 3. Timeline, feed principal, ranking e cursor

A rota atual lista publicações de um autor, por data e UUID decrescentes. É timeline de perfil. Não encontrei endpoint que agregue contas seguidas para formar o feed principal ou uma etapa de ranking. As abas “Para você”, “Seguindo”, “Artigos” e “Vídeos” na interface não significam que esses modos estejam prontos no servidor.

A paginação keyset por data/UUID é um bom começo para timeline cronológica. O servidor verifica permissão antes de incluir cada item e limita página e registros examinados. Não há snapshot entre páginas: novos posts, remoções ou mudanças de relação podem alterar o conjunto durante a navegação. Revalidar ACL em cada requisição protege melhor do que tratar cursor como autorização. Mastodon e Bluesky documentam suas próprias timelines/paginação; AIP-158 recomenda tokens URL-safe e opacos que não concedam autorização, sem impor assinatura nem limite numérico universal. [[18]](https://docs.joinmastodon.org/methods/timelines/) [[19]](https://docs.joinmastodon.org/api/guidelines/#pagination) [[20]](https://bsky.network/docs/bluesky-api/viewing-feeds) [[21]](https://bsky.network/docs/bluesky-api/custom-feeds) [[22]](https://atproto.com/guides/custom-feed-tutorial) [[23]](https://google.aip.dev/158) [[24]](https://ojs.aaai.org/index.php/ICWSM/article/view/14424)

**Defeito de contrato prioritário:** PageCursor no OpenAPI tem maxLength 32. O encoder inclui versão, UUID da conta, formato, timestamp e UUID do post; um exemplo com os tamanhos reais gera 215 caracteres, e o parser aceita até 512. O schema de resposta permite qualquer string, mas a próxima requisição, pelo OpenAPI, não aceita o valor emitido pelo servidor. Ferramentas que validam o contrato podem rejeitar a paginação. OpenAPI 3.1 utiliza as regras de validação do JSON Schema; maxLength é limite de caracteres. AIP-158 também desaconselha JSON transparente apenas codificado em Base64; isso é uma questão de opacidade/encapsulamento, não prova de falha de autorização, pois o código revalida autor/formato e ACL. [[25]](https://spec.openapis.org/oas/v3.1.1.html#schema-object) [[26]](https://json-schema.org/draft/2020-12/json-schema-validation#name-maxlength) [[23]](https://google.aip.dev/158)

Não há uma fórmula universal de “Para você”. Um experimento randomizado de sete semanas no X encontrou efeitos específicos sobre engajamento e alguns resultados políticos/seguidos em uma direção, sem efeito significativo em várias outras medidas; a troca inversa não produziu resultados simétricos. Uma auditoria de 2025 em tweets políticos encontrou divergência entre ranking de engajamento e preferências declaradas, com trade-offs em alternativas. Um paper de 2013 testou um ranker específico; é evidência histórica, não receita atual. Nada disso define o que o Seekalive deve otimizar. [[27]](https://doi.org/10.1038/s41586-026-10098-2) [[28]](https://doi.org/10.1093/pnasnexus/pgaf062) [[24]](https://ojs.aaai.org/index.php/ICWSM/article/view/14424)

**Veredito:** não implementar ranking por suposição. Antes de “Para você”, definir objetivo, sinais permitidos, controles do usuário e métricas. Não foi possível verificar fórmulas proprietárias do Meta nesta coleta. [[6]](https://transparency.meta.com/features/explaining-ranking/) [[21]](https://bsky.network/docs/bluesky-api/custom-feeds) [[18]](https://docs.joinmastodon.org/methods/timelines/)

### 4. Mídia e fonte de contrato

A rota rejeita formato de mídia, listas de URLs e tipos com erro explícito; nenhum arquivo é armazenado. Esse bloqueio é honesto enquanto armazenamento não foi aprovado. Porém, shared/contracts/src/feed/post.ts exporta schema manual que permite format media e mediaUrls/mediaTypes. OpenAPI e rota são somente texto/artigo, e a rota usa schema gerado de @workspace/api-zod. O teste unitário importa o schema manual de shared/contracts, não o schema usado pela rota. Isso não prova que a rota aceite mídia — ela recusa —, mas cria divergência e o teste não valida o contrato ativo.

OWASP recomenda allowlist, não confiar no Content-Type do cliente, validar conteúdo/assinatura, limitar tamanho, gerar nomes no servidor e guardar fora da raiz pública ou em armazenamento separado; API4 aborda consumo de recursos. Documentação de X descreve upload em fases e consulta de processamento; Bluesky descreve blob vinculado a registro e limites; Instagram tem fluxo e restrições próprios. Uma URL pré-assinada S3 é uma capacidade temporária que pode seguir válida até expirar. São exemplos de engenharia, não valores que devemos copiar. [[29]](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) [[30]](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/) [[31]](https://docs.x.com/x-api/media/quickstart/media-upload-chunked) [[32]](https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/com/atproto/repo/uploadBlob.json) [[33]](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/content-publishing) [[34]](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media) [[35]](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

Antes de ativar mídia, será necessário modelar ativo pendente/pronto/falho, titularidade, validação real, limites, processamento/quarentena, anexação por ID do servidor, ACL em cada leitura e limpeza segura de originais/derivados. Mudança de audiência ou bloqueio deve restringir os arquivos junto com o JSON do post.

**Veredito:** manter mídia desativada é correto nesta fatia. Unificar schema e testes antes de conectar a tela; pipeline só após decisão do provedor e regras.

### 5. Confiança, segurança e abuso

Rotas declaram limites por minuto e escritas exigem sessão/CSRF; a documentação do projeto informa que limites são locais ao processo. Não está demonstrado que o limite seja distribuído entre réplicas, persistente ou acompanhado por métricas e alertas. OWASP API1 destaca autorização por objeto para cada ID recebido; API4 cobre consumo de recursos, tamanho e frequência. Limites atuais são início, não prova de proteção operacional completa. [[36]](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) [[30]](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/) [[14]](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

Não encontrei na pasta Feed rotas/tabelas de denúncia, atribuição, decisão, restrição, motivo, auditoria ou recurso. Isso não prova ausência em outros domínios. Bluesky descreve rótulos/ações de moderação; Mastodon expõe fila administrativa de denúncias com atribuição e resolução; Meta descreve relatórios de enforcement. São evidências do que essas plataformas documentam, não prova de eficácia nem obrigação de replicar seus modelos. [[37]](https://atproto.com/guides/moderation) [[38]](https://docs.joinmastodon.org/methods/admin/reports/) [[39]](https://transparency.meta.com/reports/community-standards-enforcement/)

O usuário já decidiu que Trust & Safety terá ownership lógico próprio e que o Painel será usado para gestão/moderação, sem autorização para alterá-lo agora. Recomendo manter a separação: bloqueio é escolha bilateral de usuários; denúncia/moderação é decisão do serviço com permissão e auditoria próprias. O backend Feed atual não implementa esse ciclo.

**Veredito:** ACL e rate limit parcial existem; denúncia, revisão, enforcement, auditoria e proteção distribuída ainda pertencem ao plano Social antes da produção.

### 6. Persistência e evidência de funcionamento

A migração Feed foi gerada e não aplicada. O alvo explícito de desenvolvimento exigido pelo guardrail não estava disponível, então o teste autenticado de banco isolado não foi executado. Healthcheck e build não provam que gravação, ACL com dados persistidos, paginação e cascatas funcionam no banco. Testes unitários da função de visibilidade não substituem teste HTTP com schema aplicado.

A separação de ownership é positiva: Feed grava no schema lógico próprio e usa projeção de Conta/Social, em vez de consultar diretamente tabelas do grafo. Há índices cronológicos por autor e audiência. Não há benchmark, plano de consulta sob volume, análise de cache ou teste de carga; o limite de 500 linhas por leitura dá um teto de trabalho, mas não comprova latência para produção. A migração deve ser aplicada somente depois de confirmar o alvo de desenvolvimento, e o teste isolado precisa verificar que schema principal permaneceu intacto.

**Veredito:** há código preparado para desenvolvimento; persistência Feed não foi validada em banco real. Não declarar produção pronta.

## Rastreabilidade das observações locais

| Observação | Evidência no repositório |
|---|---|
| Modelo de posts/artigos, checks e índices | [schema/feed.ts, linhas 18–49](../Seekalive/Projeto/infra/database/src/schema/feed.ts#L18-L49) |
| Autorização de audiência e bloqueio | [postVisibility.ts, linhas 14–28](../Seekalive/Projeto/Aplicativo/back/src/modules/feed/application/postVisibility.ts#L14-L28) |
| Listagem cronológica, autorização e limite de scan | [listProfilePosts.ts, linhas 9–10 e 14–82](../Seekalive/Projeto/Aplicativo/back/src/modules/feed/application/listProfilePosts.ts#L9-L82) |
| Cursor base64url, scope e limite do parser | [postCursor.ts, linhas 8–50](../Seekalive/Projeto/Aplicativo/back/src/modules/feed/application/postCursor.ts#L8-L50) |
| Contagens/estados fixos em zero/falso | [postView.ts, linhas 5–26](../Seekalive/Projeto/Aplicativo/back/src/modules/feed/application/postView.ts#L5-L26) |
| Sessão, CSRF, rejeição de mídia, validação e DELETE | [postWriteRoutes.ts, linhas 16–75](../Seekalive/Projeto/Aplicativo/back/src/modules/feed/presentation/postWriteRoutes.ts#L16-L75) |
| Contrato compartilhado manual permite mídia | [feed/post.ts, linhas 6–20](../Seekalive/Projeto/shared/contracts/src/feed/post.ts#L6-L20) |
| Teste importa o schema manual e não exercita o schema da rota | [feed-visibility.test.mjs, linhas 5–9 e 57–70](../Seekalive/Projeto/Aplicativo/back/test/feed-visibility.test.mjs#L5-L70) |
| Cursor de entrada OpenAPI limitado a 32 caracteres; Post exige contadores | [openapi.yaml, linhas 794–800 e 1380–1415](../Seekalive/Projeto/shared/api-spec/openapi.yaml#L794-L800) |
| Migração pendente, rate limit local, mídia recusada e preview sem API | [architecture-and-security.md, linhas 192–201](../Seekalive/Projeto/docs/api/backend/architecture-and-security.md#L192-L201) |

## Comparação direta

| Área | Seekalive hoje | Padrão/referência consultada | Avaliação |
|---|---|---|---|
| Audiência | Público, Círculo mútuo, privado titular; bloqueio bilateral | W3C, OWASP, RFC de cache e APIs Mastodon/Bluesky | Aderente às regras aprovadas; caches e revogação não comprovados |
| Publicação | Texto/artigo; criar, ler, excluir | ActivityStreams, RFC HTTP, APIs Mastodon/Bluesky | Fase inicial; faltam interações, edição e exclusão completa |
| Perfil | Timeline cronológica por autor | Timelines/feeds documentados por Mastodon/Bluesky | Correta como timeline, não é feed principal |
| Ranking | Não existe no backend | Estudos recentes mostram efeitos contextuais e trade-offs | Não inventar fórmula; falta decisão de produto |
| Cursor | Keyset por autor/data/UUID | AIP-158 + OpenAPI/JSON Schema | Bom princípio, defeito 32 vs 215/512; token legível |
| Interações | Contadores/estados sempre zero/falso | ActivityStreams e modelos de plataformas | Não mostrar como estado real |
| Mídia | Rejeitada, sem armazenamento | OWASP, X, Bluesky, Instagram, AWS | Bloqueio transparente; schema manual divergente |
| Confiança | ACL, CSRF e limites locais por rota | OWASP, APIs de moderação | Parcial; moderação e operação distribuída faltam |
| Banco | Schema/migração gerados, migração não aplicada | Testes isolados previstos | Persistência não validada |

## Plano recomendado em ordem

| Prioridade | Ação | Critério de pronto |
|---|---|---|
| **P0 — contrato** | Corrigir cursor 32 vs 512 com schema por endpoint ou limite compartilhado confirmado; nunca truncar. Se opacidade for requisito, redesenhar com token opaco versionado. | Cursor emitido pelo servidor passa pela próxima requisição, cliente gerado e teste OpenAPI/rota. |
| **P0 — contrato** | Unificar schema manual e OpenAPI para texto/artigo e fazer testes usarem o schema de runtime da rota. | Mídia é rejeitada igual no contrato, handler e teste. |
| **P0 — sem dado fictício** | Não expor zeros/falsos como contagens reais; implementar interações ou retirar/alterar campos antes de ligar UI. | Contagens refletem estado persistido e botões têm estado verdadeiro. |
| **P1 — persistência** | Confirmar banco de desenvolvimento, aplicar migração e executar integração autenticada em schema isolado. | Criação, leitura por audiência, cursor, bloqueio e exclusão testados sem tocar produção. |
| **P1 — ciclo de post** | Decidir edição/exclusão; implementar comentários, curtidas, reposts e salvos com unicidade, autorização, transações e idempotência. | Retries não duplicam; relações/contagens seguem consistentes sob concorrência e exclusão. Não inferir retenção sem decisão. |
| **P1 — feed principal** | Definir objetivo, sinais, controles e métricas antes de “Para você”; separar Following cronológico de ranking futuro. | Contrato e política de feed aprovados pelo produto, com testes de ACL e critérios de qualidade. |
| **P1 — confiança** | Construir denúncia/revisão/enforcement/auditoria no domínio próprio; Painel só quando autorizado; revisar limites multi-instância. | Toda decisão tem ator, motivo, estado/histórico e autorização separada. |
| **P2 — mídia e frontend** | Após provedor aprovado, criar pipeline seguro; ligar as telas à API só com contratos e persistência validados. | Testes de upload/leitura/revogação/exclusão e erros explícitos; demo local nunca confundida com resposta real. |

## Limitações

O relatório cobre Feed e integrações próximas, não toda a aplicação Social, CDN/cache global, banco aplicado, moderação global ou segurança operacional. Não houve E2E contra banco, teste de carga ou benchmark. Algumas páginas de plataforma não expuseram conteúdo completo em captura estática; elas são marcadas como limitadas e não sustentam afirmações específicas. Estudos de ranking são sobre contextos próprios, não sobre usuários Seekalive. Não foram tomadas decisões de produto nem alterado código.

## Conclusão

A fatia construída não está errada como começo, mas seria incorreto tratá-la como backend Social completo ou pronto para produção. A autorização por audiência e a recusa de mídia sem armazenamento são boas escolhas iniciais. Antes de ligar a interface, corrija os contratos de cursor e schema; não mostre zeros como contagens reais; valide a migração em desenvolvimento; e continue no Social com interações, feed principal e Trust & Safety, mantendo ranking e exclusão sujeitos às decisões explícitas do produto.

## Fontes

1. [ActivityPub](https://www.w3.org/TR/activitypub/) — 2018-01-23, Tier 1. Evidência: research/sources/social-graph-01-w3c-activitypub-audience.html.
7. [Status entity — Mastodon documentation](https://docs.joinmastodon.org/entities/Status/) — Updated 2026-05-22, Tier 3. Evidência: research/sources/social-graph-02-mastodon-status-visibility.html.
10. [Block account — Mastodon accounts API](https://docs.joinmastodon.org/methods/accounts/#block) — Updated 2026-10-20, Tier 3. Evidência: research/sources/social-graph-03-mastodon-account-block.html.
9. [Following, muting, and blocking — Bluesky Protocol Services](https://bsky.network/docs/bluesky-api/following) — data não informada, Tier 3. Evidência: research/sources/social-graph-07-bluesky-following-docs.html.
8. [Visibility preferences — Bluesky Protocol Services](https://bsky.network/docs/about-bluesky-content/visibility-preferences) — data não informada, Tier 3. Evidência: research/sources/social-graph-08-bluesky-content-visibility.html.
11. [Authorization Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — data não informada, Tier 1. Evidência: research/sources/social-graph-06-owasp-authorization-cheat-sheet.html.
12. [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) — 2022-06, Tier 1. Evidência: research/sources/social-graph-09-rfc9111-caching.html.
3. [Activity Streams 2.0 Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/) — 2017-05-23, Tier 1. Evidência: research/sources/lifecycle-01-activitystreams-vocabulary.html.
2. [Activity Streams 2.0](https://www.w3.org/TR/activitystreams-core/) — 2017-05-23, Tier 1. Evidência: research/sources/lifecycle-02-activitystreams-core.html.
5. [Posts in-depth — Bluesky Protocol Services](https://bsky.network/docs/about-bluesky-content/posts/) — data não informada, Tier 3. Evidência: research/sources/lifecycle-03-bluesky-posts.html.
4. [Statuses API methods — Mastodon documentation](https://docs.joinmastodon.org/methods/statuses/) — data não informada, Tier 3. Evidência: research/sources/lifecycle-04-mastodon-statuses.html.
13. [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — 2022-06, Tier 1. Evidência: research/sources/lifecycle-05-rfc9110.html.
14. [REST Security Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) — data não informada, Tier 1. Evidência: research/sources/lifecycle-06-owasp-rest-security.html.
15. [AT Protocol app.bsky.feed.like Lexicon](https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/packages/api/lexicons/app/bsky/feed/like.json) — Pinned commit 57c85d5ea03583dae3ae8d1f51106210dcad315b, Tier 3. Evidência: research/sources/lifecycle-07-bluesky-like-lexicon.md.
16. [AT Protocol app.bsky.feed.repost Lexicon](https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/packages/api/lexicons/app/bsky/feed/repost.json) — Pinned commit 57c85d5ea03583dae3ae8d1f51106210dcad315b, Tier 3. Evidência: research/sources/lifecycle-08-bluesky-repost-lexicon.md.
17. [AT Protocol com.atproto.repo.deleteRecord Lexicon](https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/lexicons/com/atproto/repo/deleteRecord.json) — Pinned commit 57c85d5ea03583dae3ae8d1f51106210dcad315b, Tier 3. Evidência: research/sources/lifecycle-09-bluesky-delete-record-lexicon.md.
6. [Our approach to explaining ranking — Meta Transparency Center](https://transparency.meta.com/features/explaining-ranking/) — data não informada, Tier 3. Evidência: research/sources/feed-01-meta-feed-ranking.html. Nota: HTML shell did not expose substantive ranking details; used only to document this evidence limitation.
21. [Custom feeds — Bluesky Protocol Services](https://bsky.network/docs/bluesky-api/custom-feeds) — data não informada, Tier 3. Evidência: research/sources/feed-02-bluesky-custom-feeds.html.
20. [Viewing feeds — Bluesky Protocol Services](https://bsky.network/docs/bluesky-api/viewing-feeds) — data não informada, Tier 3. Evidência: research/sources/feed-03-bluesky-viewing-feeds.html.
18. [Timelines API methods — Mastodon documentation](https://docs.joinmastodon.org/methods/timelines/) — data não informada, Tier 3. Evidência: research/sources/feed-04-mastodon-timelines-api.html.
19. [API guidelines: pagination — Mastodon documentation](https://docs.joinmastodon.org/api/guidelines/#pagination) — data não informada, Tier 3. Evidência: research/sources/feed-05-mastodon-pagination.html.
24. [Leveraging Noisy Lists for Social Feed Ranking](https://ojs.aaai.org/index.php/ICWSM/article/view/14424) — 2013, Tier 1. Evidência: research/sources/feed-06-aaai-noisy-lists-social-feed-ranking.md.
22. [Write a Custom Feed — AT Protocol](https://atproto.com/guides/custom-feed-tutorial) — data não informada, Tier 3. Evidência: research/sources/feed-07-atproto-write-custom-feed.html.
29. [File Upload Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — data não informada, Tier 1. Evidência: research/sources/feed-media-01-owasp-upload.html.
35. [Download and upload objects with presigned URLs — Amazon S3 User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) — data não informada, Tier 3. Evidência: research/sources/feed-media-02-aws-presigned-urls.html.
32. [AT Protocol com.atproto.repo.uploadBlob Lexicon](https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/com/atproto/repo/uploadBlob.json) — data não informada, Tier 3. Evidência: research/sources/feed-media-03-bluesky-upload-blob.md.
33. [Content Publishing — Instagram Platform](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/content-publishing) — data não informada, Tier 3. Evidência: research/sources/feed-media-04-instagram-content-publishing.html.
34. [IG User Media reference — Instagram Platform](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media) — Includes dated 2025 change notices; page date not shown, Tier 3. Evidência: research/sources/feed-media-05-instagram-media-reference.html.
31. [Chunked Media Upload — X Developer Platform](https://docs.x.com/x-api/media/quickstart/media-upload-chunked) — data não informada, Tier 3. Evidência: research/sources/feed-media-06-x-chunked-upload.html.
37. [Moderation — AT Protocol](https://atproto.com/guides/moderation) — data não informada, Tier 3. Evidência: research/sources/trust-safety-01-bluesky-moderation.html.
38. [admin/reports API methods — Mastodon documentation](https://docs.joinmastodon.org/methods/admin/reports/) — Updated 2026-07-09, Tier 3. Evidência: research/sources/trust-safety-02-mastodon-admin-reports.html.
39. [Community Standards Enforcement Report — Meta Transparency Center](https://transparency.meta.com/reports/community-standards-enforcement/) — data não informada, Tier 3. Evidência: research/sources/trust-safety-03-meta-community-standards-enforcement.html. Nota: Only the page description was readable in static capture; no quantitative claims used.
36. [API1:2023 Broken Object Level Authorization — OWASP API Security Top 10](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) — 2023 edition, Tier 1. Evidência: research/sources/trust-safety-04-owasp-api1-bola.html.
30. [API4:2023 Unrestricted Resource Consumption — OWASP API Security Top 10](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/) — 2023 edition, Tier 1. Evidência: research/sources/trust-safety-05-owasp-api4-resource-consumption.html.
27. [The political effects of X’s feed algorithm](https://doi.org/10.1038/s41586-026-10098-2) — 2026-02-18, Tier 1. Evidência: research/sources/gapfill-feed-ranking-01-nature-x-field-experiment.md.
28. [Engagement, user satisfaction, and the amplification of divisive content on social media](https://doi.org/10.1093/pnasnexus/pgaf062) — 2025-03-05, Tier 1. Evidência: research/sources/gapfill-feed-ranking-02-pnas-stated-preferences-audit.md.
23. [AIP-158: Pagination — Google API Improvement Proposals](https://google.aip.dev/158) — data não informada, Tier 3. Evidência: research/sources/gapfill-aip-158-page-tokens.md.
25. [OpenAPI Specification v3.1.1 — Schema Object](https://spec.openapis.org/oas/v3.1.1.html#schema-object) — Versioned specification 3.1.1, Tier 1. Evidência: research/sources/gapfill-openapi-3.1-maxlength.md.
26. [JSON Schema Validation Draft 2020-12: maxLength](https://json-schema.org/draft/2020-12/json-schema-validation#name-maxlength) — 2020-12, Tier 1. Evidência: research/sources/gapfill-openapi-3.1-maxlength.md.
