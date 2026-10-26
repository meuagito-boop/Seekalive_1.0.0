# Research Notes: Backend Social do Seekalive versus padrões de redes sociais

**Status:** complete
**Depth:** Deep
**Data do relatório:** 2026-10-25 (America/Sao_Paulo)
**Fontes registradas:** 39 URLs únicas e citadas no relatório; evidências e tiers em research/sources.json
**Relatório final:** research/analise-backend-social-seekalive-vs-padroes.md

## Plan

- **Question:** A implementação atual do backend Social/Feed do Seekalive cobre os requisitos funcionais, de segurança e de evolução esperados de uma rede social moderna?
- **Scope:** comparar o código existente de Feed e as regras aprovadas do Seekalive com padrões públicos, documentos técnicos oficiais e estudos verificáveis; sem alterar código e sem presumir que algoritmos proprietários são públicos.
- **Audience:** engenharia de produto; português do Brasil.
- **Deliverable:** relatório com evidências do código, fontes externas citadas, lacunas classificadas por impacto e sequência recomendada dentro do Social.

## Focus Areas

| # | Área | Status | Fontes |
|---|---|---|---|
| 1 | Audiência, grafo social, privacidade e bloqueio | done | 7 |
| 2 | Modelo de publicação, interações, idempotência e exclusão | done | 9 |
| 3 | Feed de perfil versus feed principal, ordenação e paginação | done | 7 + 2 gap-fill |
| 4 | Mídia, processamento, acesso e ciclo de vida | done | 6 |
| 5 | Confiança, segurança, abuso, moderação e escalabilidade | done | 5 |

## Coverage Checklist

- [x] Perfil privado, aprovação, Círculo mútuo e bloqueio confrontados com código e padrões de autorização/caching.
- [x] Criação, leitura, edição, exclusão, interações e contagens comparados: implementação atual é parcial; sem update nem interação persistida.
- [x] Listagem de perfil separada do feed principal; ordenação, paginação, cursor e estabilidade entre páginas avaliados.
- [x] Mídia: rejeição atual é uma barreira explícita, não pipeline completo; divergência de contratos apontada.
- [x] Denúncia/moderação/spam/abuso não aparecem na fatia Feed inspecionada; requisitos de produção identificados sem alterar Painel/Gestor.
- [x] Eventos/notificações e integridade operacional classificados como ainda não implementados/decididos.
- [x] Lacunas separadas em defeitos atuais, funcionalidades ainda não construídas e decisões que exigem confirmação do produto.
- [x] Rastreabilidade local com caminhos e linhas adicionada ao relatório; 39 citações externas renderizadas a partir do registro.

## Findings Log

### Audiência e privacidade

- As regras do Seekalive são específicas do produto e não devem ser copiadas de Mastodon/Bluesky. A aplicação de acesso por leitura está alinhada ao acordado no código; caches, concorrência com revogação e integração de banco permanecem não comprovados. [@w3c-activitypub] [@owasp-authorization] [@rfc9111-caching] [@mastodon-status-visibility] [@bluesky-visibility]

### Publicação e ciclo de vida

- O schema modela posts/artigos; endpoints atuais criam, leem e removem. Interações, edição e contagens reais não existem; hard delete está no código e retenção/tombstone não foi decidida. [@activitystreams-vocabulary] [@rfc9110-semantics] [@owasp-rest-security] [@bluesky-like-lexicon] [@mastodon-status-api]

### Feed, ranking e paginação

- Existe somente listagem cronológica por perfil, não feed principal/ranking. Estudos com X evidenciam efeitos específicos e não universais. Cursor é keyset e valida escopo, mas base64url não é opaco; o OpenAPI limita a 32 caracteres, enquanto exemplo realista do encoder tem 215 e servidor aceita até 512. [@nature-x-algorithm-experiment] [@pnas-user-preference-ranking] [@bluesky-viewing-feeds] [@mastodon-timelines] [@google-aip-158] [@openapi-3-1-1] [@json-schema-maxlength]

### Mídia, segurança e operação

- O endpoint rejeita mídia explicitamente; schema manual compartilhado permite payloads de mídia e os testes unitários importam esse schema manual, não o schema OpenAPI usado pela rota. O pipeline de armazenamento, moderação, entrega e limpeza não existe. [@owasp-file-upload] [@owasp-api4-resource-consumption] [@aws-presigned-urls] [@x-chunked-upload] [@bluesky-upload-blob]

### Confiança e abuso

- Rate limits por rota existem, mas os docs declaram que são locais ao processo; não há rota Feed de denúncia/moderação. Isso não prova ausência em outros domínios. [@owasp-api1-bola] [@owasp-api4-resource-consumption] [@atproto-moderation] [@mastodon-admin-reports] [@meta-community-enforcement]

## Conflicts & Open Questions

- **Defeito de contrato confirmado:** PageCursor no OpenAPI (maxLength: 32) não aceita o token que o próprio encoder produz (exemplo: 215 caracteres); a API permite até 512. AIP-158 recomenda tokens URL-safe e opacos, mas não manda assinar nem define limite numérico. Corrigir antes de integrar cliente.
- **Divergência de schemas:** schema manual CreateTextPost permite mídia/URLs; schema OpenAPI da rota é somente texto e a rota recusa mídia. Teste de contrato atual usa schema manual, não valida handler/schema gerado.
- **Semântica externa não é uniforme:** Mastodon chama “private” de seguidores/menções, enquanto Seekalive já decidiu privado owner-only; conservar regra do Seekalive.
- **Ranking:** estudo randomizado e audit diferem em desenho, janela e resultados; nenhuma fórmula ou sinal proprietário foi reconstruído. Para Você precisa de objetivo, controles e avaliação definidos antes de rankear.
- **Meta:** páginas serviram como shell com pouco conteúdo legível; seus sinais/algoritmos não foram usados como evidência.
- **Busca/captura oficial do ambiente retornou 402;** acesso HTTP direto conseguiu páginas primárias. DDG também acionou challenge. Cada limitação está registrada; snippets de busca não sustentam afirmações substantivas.

## Gaps

- Banco: migração Feed não aplicada, então nenhum teste E2E autenticado contra schema real foi possível sem confirmação segura do destino de desenvolvimento.
- Não foi feito teste de carga, auditoria de cache/CDN, profiling SQL ou análise de toda a aplicação Social; a comparação de código cobre Feed e pontos de integração necessários.
- Não há decisão de produto para ranking, edição/retention de post, denúncia/appeal, limites finais de mídia ou SLA de feed.

## Source Registry

- Stable keys, URLs, datas disponíveis, tiers e evidências capturadas: research/sources.json.
- Todo link numerado no relatório é renderizado a partir desse registro; nenhum algoritmo interno não publicado é atribuído a uma plataforma.
