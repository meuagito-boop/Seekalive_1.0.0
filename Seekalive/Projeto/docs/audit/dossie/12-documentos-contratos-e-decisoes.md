# Apêndice A2 — Documentos, contratos e decisões registradas

> Material suplementar do dossiê, não é o bloco oficial 12. O bloco 12 é [12-frontend-integracao-api.md](12-frontend-integracao-api.md). Este apêndice é incluído uma única vez no consolidado e seus achados contam no total geral.

## Escopo e método

Confronto dos documentos de arquitetura, módulo, API, readiness e auditorias históricas com o código, os catálogos de desenvolvimento já consultados e os blocos anteriores deste dossiê. Nenhum documento legado foi apagado ou reescrito. A comparação das três cópias anexadas foi feita por SHA-256.

## Achados

### A2-001 — O README identifica corretamente a especificação ativa e o catálogo futuro

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Estado atualizado:** `shared/api-spec/openapi.yaml` é o contrato HTTP; `endpoints.md` e `routes.generated.md` são gerados das rotas montadas. O catálogo de planejamento não normativo está em `docs/roadmap/seekalive-operation-catalog.*`.

**Regra vigente:** `shared/api-spec/openapi.yaml` é o contrato HTTP; o catálogo de roadmap não é fonte de rotas ativas.

### A2-002 — A propriedade das avaliações comerciais está contraditória entre documentos

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `docs/api/backend/README.md:26–28` inclui “avaliação” entre as entidades centrais de Seek. Em contraste, `docs/architecture/database-domains.md:43` proíbe Seek de criar ou responder avaliações; `docs/api/backend/implementation-and-tests.md:54–55` atribui a API de avaliações a Profiles. A implementação e rotas encontradas no bloco 04 também estão em Profiles, alinhadas à regra declarada pelo usuário.

**Trecho:** README: `Seek ... Entidades centrais ... avaliação`; arquitetura: `Seek ... Não deve possuir ... criação/resposta de avaliações`; plano: `A API de avaliações pertence a Profiles`.

**Impacto:** a documentação principal do backend pode induzir uma implementação incorreta e deve ser corrigida para que Seek consuma apenas projeção/agregado autorizado do perfil comercial.

### A2-003 — Há duas regras incompatíveis para publicação com audiência privada

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `docs/api/backend/architecture-and-security.md:199` afirma que audiência `private` é somente do titular. `docs/api/backend/data-dictionary.md:15` afirma que, após aprovação, seguidores podem ver publicações `public` e `private` de perfil privado. `feed/application/postVisibility.ts:26–35` implementa a segunda regra: segue aceito no perfil privado libera a publicação com audiência privada; Círculo ainda exige mutualidade.

**Trecho:** `post.audience === "private" && author.isPrivate && author.relationship.following === "accepted"`; a regra textual “audiência privada é somente do titular” diverge disso.

**Impacto:** a regra de negócio já aprovada e o código apontam para seguidores aprovados; a documentação de segurança precisa deixar claro o significado de “audiência privada” versus “perfil privado”, sem alterar a regra durante esta auditoria.

### A2-004 — Os documentos de migrations não refletem a configuração executável atual

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `docs/architecture/database-migration-tracks.md:17–22` lista `seek` como track ativo e `:30–41` descreve baseline/ledger. Já `infra/database/migrationTrackConfig.ts:4–30` permite apenas `accounts`, `security`, `profiles`, `feed` e `media`. Também há contradição interna: `accounts-security-workflows.md:108,114` afirma “Não há track Feed ativo”, enquanto `database-migration-tracks.md:20–23,41` e a configuração executável incluem Feed.

**Trecho:** configuração executável encerra as entradas ativas em `media`; o documento de trilhas inclui `seek`; outro documento diz `Não há track Feed ativo`.

**Impacto:** antes de qualquer aplicação futura, os documentos de migração precisam ser harmonizados com a configuração que efetivamente permite gerar/aplicar cada track. Este dossiê não executou geração ou migration.

### A2-005 — A auditoria histórica de contratos tem contagens obsoletas

**Veredito:** CONTRADITO  
**Prioridade:** Média

**Evidência:** `auditoria/04-contratos-documentacao-e-validacoes.md:19–22` registra 49 operações no OpenAPI ativo e 138 candidatas no catálogo. O confronto atual do bloco 02 encontrou 74 operações no YAML ativo e 146 no catálogo documental, além de 76 operações implementadas no servidor. A própria auditoria antiga descreve um corte anterior; seus números não devem ser reaproveitados como estado atual.

**Trecho:** relatório histórico: `49 operações` e `138 operações candidatas`; bloco 02: `74`, `146` e `76`, respectivamente, com método de contagem e fonte explicitados.

### A2-006 — O mapa de módulos documentado não lista todos os módulos executáveis

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `docs/modules/README.md:5–10` lista Auth, Onboarding, Profiles, Social e Health, mas não Feed nem Media. A árvore e a montagem efetiva do backend incluem esses domínios (bloco 11). O documento reconhece em `:18` que a separação em camadas ainda não é completa.

**Trecho:** lista resumida termina em `health`; o registro executável também monta `feedRouter` e `createMediaRouter`.

**Impacto:** a página pode servir como mapa de módulos de produto, mas não como inventário técnico completo do backend. O dossiê é o inventário verificado para este corte.

### A2-007 — A extração dos campos de apresentação de Accounts para Profiles está declarada como pendente

**Veredito:** CONFIRMADO  
**Prioridade:** Alta

**Evidência:** `docs/architecture/database-domains.md:37` atribui a fonte oficial do perfil a Profiles, mas registra que nomes e bio ainda estão em `accounts.accounts` e que a extração não foi concluída. O bloco 05 confirmou os campos no schema e o bloco 11 identificou o cliente de edição de Profile consumindo o serviço Social.

**Trecho:** `No código atual, nomes/bio pessoais e nome/bio comercial ainda estão em accounts.accounts; a extração não está concluída.`

**Impacto:** o ownership desejado está documentado, mas não está integralmente refletido no armazenamento atual nem na camada cliente. É uma correção estrutural necessária antes de declarar Accounts/Profiles alinhados.

### A2-008 — As afirmações históricas de testes no README não foram reproduzidas nesta auditoria

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Média

**Evidência:** `docs/api/backend/README.md:5` afirma que suíte, testes de exclusão, replay, typecheck e build passaram. `docs/architecture/database-migration-tracks.md:53–55` relata um replay anterior e também diz que replay automatizado e teste integrado não foram executados “nesta etapa”. O prompt desta auditoria proíbe executar testes/builds/escritas; portanto, o dossiê não valida a execução, data, commit ou cobertura dessas afirmações históricas.

**Trecho:** `A suíte geral ... passaram` no README; no documento de migrations, replay relatado na linha 53 e limites de execução na linha 55.

**Impacto:** conservar como afirmações históricas atribuídas às fontes, não como validação executada neste dossiê. O bloco 14 listará a evidência que falta para uma aprovação de release.

### A2-009 — As três cópias anexadas da arquitetura de dados são idênticas

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa — redundância documental

**Evidência:** comando `sha256sum ../../attached_assets/SeekAlive_Arquitetura_Banco_Dados_por_Dominio_*.md` retornou o mesmo hash para os três arquivos anexados: `90f527659516990830aadf9ae1d61ce23fea4df3c8675dbd3be675f50a960184`.

**Trecho da saída:** os três caminhos terminam com o mesmo SHA-256 acima. Nenhum arquivo foi apagado.

### A2-010 — HTML e ZIP da documentação são artefatos de geração cuja sincronização não foi verificada

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Baixa

**Evidência:** `docs/api/backend/README.md:18` instrui regenerar `index.html` e `Seekalive-backend-documentation.zip` após alterações nas fontes. Esta auditoria não executou `render-docs.mjs`, `generate-contracts.mjs` ou empacotamento, conforme o limite de não executar codegen/build. Não foi feita comparação do conteúdo integral do ZIP com as fontes atuais.

**Trecho:** `Regenere ambos depois de alterar as fontes e mantenha o ZIP sincronizado`.

## Contagem deste apêndice A2

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 1 |
| CONTRADITO | 4 |
| NÃO VERIFICADO | 2 |

**Uso no dossiê:** as contradições documentais alimentam a síntese e as ações recomendadas em `99-sintese-lacunas.md`.
