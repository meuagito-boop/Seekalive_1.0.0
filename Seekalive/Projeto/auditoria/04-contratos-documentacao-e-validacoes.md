# Contratos, documentação e validações

## Fonte dos contratos compartilhados

O workspace tem três pacotes importantes em `shared/`:

1. `@workspace/api-spec` mantém `shared/api-spec/openapi.yaml`, configuração do Orval e scripts de geração.
2. `@workspace/api-client-react` contém cliente React Query gerado para o front.
3. `@workspace/api-zod` (diretório `shared/contracts`) contém schemas Zod/erros escritos pelo projeto e saídas geradas.

`orval.config.ts` gera o cliente React Query e os contratos/tipos Zod a partir do OpenAPI do workspace. O script `normalize-contract-exports.mjs` normaliza exports gerados com allow-list e validação. Alterações em saída gerada devem ser feitas na fonte e regeneradas, nunca corrigidas apenas no `generated/`.

## Divergência entre os dois OpenAPI

Há dois documentos OpenAPI distintos:

| Arquivo | Tamanho observado | Função |
|---|---:|---|
| `shared/api-spec/openapi.yaml` | 30 operações HTTP no contador estático de verbos | Fonte do contrato integrado ao cliente gerado. |
| `docs/api/backend/openapi.json` | 138 operações candidatas | Saída do gerador de documentação `docs/api/backend/generate-contracts.mjs`, com operações futuras/ativas classificadas no catálogo. |

Essa diferença não é, por si só, bug de geração: o README do backend diz que o OpenAPI de documentação é separado da especificação pública integrada. Porém, são superfícies fáceis de confundir e não há evidência de sincronização automática entre ambas nem extração automática das rotas Express. O gerador de documentação mantém sua própria lista de operações e estados. Uma pessoa que trate os 138 endpoints como APIs ativas pode criar cliente/telas para handlers inexistentes; uma que use somente os 30 do contrato integrado deixa de enxergar proposta futura.

**Regra de leitura:** `shared/api-spec/openapi.yaml` + código das rotas são a referência para operações ligadas ao cliente atual. `docs/api/backend/openapi.json` é catálogo de cobertura planejada, e sua coluna “ATIVA” precisa ser conferida contra o handler, migration e integração da UI.

## Versões de ferramenta conferidas

- Zod direto nos pacotes de aplicação/contratos inspecionados: `4.6.7`.
- Orval em `@workspace/api-spec`: `8.44.0`.
- Node observado no shell: `v22.23.4`; pnpm: `10.26.1`.
- Requisito do pacote raiz: Node `>=22.18.0`.
- `.replit` declara `nodejs-20`, divergente do engine e do Node efetivamente observado. Build/test passaram no Node 22 desta sessão; não foi validado no Node 20.
- O lockfile pode conter outras versões transitivas de Zod trazidas por dependências. Isso não comprova mistura incompatível entre contratos de runtime. O relatório não recomenda upgrade nem patch de Zod/Orval.
- `.npmrc` define `auto-install-peers=false` e `strict-peer-dependencies=false`. Isso muda a sinalização de peers, mas nenhum conflito concreto de peer foi demonstrado nesta auditoria.

## Códigos de erro

`shared/contracts/src/errorCodes.ts` concentra os códigos e chaves textuais de erro. A separação segue o contrato deliberado:

- status HTTP é o status de transporte;
- `API_ERROR_CODES` identifica cada erro funcional com número numérico e chave;
- a família `400` registra status HTTP de cliente, a família `500` registra status HTTP servidor, e a família `300` está reservada para expansão do catálogo HTTP;
- os erros de aplicação usam intervalos `1000`, `1100`, `1200`, `1300`, `1400`, etc. por família (geral, autenticação, conta, social, conteúdo, Seek, Shop e plataforma);
- as listas contêm guardas `Set` para impedir número duplicado entre códigos de aplicação e entre status HTTP;
- `apiErrors.ts` emite HTTP + `{code, key, message, requestId}`, usando o código de domínio numérico no JSON.

Na fonte examinada, os 55 erros de aplicação têm 55 números distintos e os 13 status HTTP têm 13 números distintos. Não há compartilhamento deliberado entre duas chaves dentro de cada catálogo. A checagem de uniqueness também está em tempo de módulo; não localizei uma suíte dedicada a provar a distribuição de todos os códigos. Uma validação específica de contrato seria uma melhoria, especialmente se a lista aumentar.

## Divergências localizadas entre código e documentos

### 1. Recuperação de senha

- O código atual contém schemas de request/confirm, rotas `passwordResetRoutes.ts` e serviço de front `passwordApi.ts`.
- `implementation-and-tests.md` e `architecture-and-security.md` descrevem recuperação como implementada em desenvolvimento.
- `README.md` afirma que recuperação de senha esquecida ainda não está implementada; `frontend-integration.md` também a descreve como demonstrativa e ainda a planeja.
- Conclusão: documentação conflita internamente e com o código. É preciso separar “endpoint/serviço implementado”, “fluxo visual conectado”, “envio real testado” e “E2E completo aprovado” em vez de um único estado “feito/não feito”.

### 2. Páginas de perfil

- `frontend-integration.md` e `README.md` dizem que as telas de perfil não consomem a API.
- `modules/profile/screens/Profile.tsx` chama `loadRemoteProfile(username)` em sessão real e mostra estado de erro/carregamento; `modules/settings/screens/Account.tsx` lê/grava os dados próprios via API.
- A integração continua parcial: a tela pública deriva posts/reviews/conteúdo do estado Social/fixtures, e o perfil comercial não está ligado a um serviço Seek completo. O texto antigo é amplo demais, não totalmente verdadeiro.

### 3. Feed

- Há handlers de publicação/leitura no módulo de Feed e modelo/migration `feed.posts`.
- A documentação reconhece uma primeira fatia de posts/artigos, mas ainda declara `0005` pendente no banco de desenvolvimento.
- O `endpoints.md` apresenta as operações do Feed como candidatas/propostas, enquanto outras partes da documentação afirmam que a fatia textual está implementada.
- No front, publicação e comentário passam por `demoContentAdapter`; o adaptador REST existente não está conectado às ações atuais.
- Conclusão: três estados diferentes precisam ser registrados separadamente: endpoint, migration aplicada e consumo pelo front. Não confundir a presença da rota com persistência real entre sessões.

### 4. Contagem/estado das tabelas

- As tabelas do código Drizzle totalizam 13, se incluída `feed.posts`.
- Sem Feed, as quatro áreas atuais de tabelas totalizam 12.
- O dicionário de dados diz 12 tabelas mas lista 11 e omite `account_username_reservations`.
- Documentos datados afirmam que o DB de desenvolvimento tem 12 tabelas; o estado físico não foi consultado nesta auditoria.

### 5. Inventários do front

- `frontend-readiness-audit.md` mantém explicitamente a contagem-base de 159 arquivos do front na auditoria inicial.
- A árvore atual contém 234 arquivos em `Aplicativo/front/src`; o valor de 159 é histórico e não inventário atual.
- `frontend-integration.md` contém caminhos antigos como componentes sob `components/profile/...`; a implementação atual está organizada sob `modules/profile/...`.

### 6. Outros documentos gerados

- `docs/api/backend/index.html` é compilado por `render-docs.mjs` a partir de nove documentos Markdown fonte; não deve ser editado em lugar deles.
- `docs/api/backend/openapi.json` e `endpoints.md` são gerados por `generate-contracts.mjs`; modificar a saída sem atualizar o gerador será perdido.
- `Seekalive-backend-documentation.zip` é uma cópia empacotada e fica desatualizada quando seus fontes, OpenAPI ou migrations mudam.
- Os documentos são snapshots com datas diferentes. Os relatórios de outubro são evidência do que foi observado no corte indicado, não estado imutável do código atual.

## Validações executadas

| Comando | Resultado e interpretação |
|---|---|
| `pnpm test` | 93 passaram, 0 falharam. Inclui os grupos Social (60), fronteiras de segurança (8), conexão DB (7), runtime API (6), regras de perfil/relação (7) e visibilidade Feed (5). |
| `pnpm run typecheck` | Passou nos pacotes do workspace. |
| `pnpm --filter @workspace/db run check` | Passou na consistência do histórico de migrations Drizzle local. |
| `pnpm run build` | Passou; build de API, front e mockup sandbox concluído. Build API: `dist/index.mjs` 273,6 KB e sourcemap 517,2 KB. Vite principal produziu o bundle e o script examinou 96 chunks JS. |
| Teste de banco isolado | Não executado por falta de `SEEKALIVE_EXPECTED_DATABASE`; guardrail mantido. |
| Git status após build | Nenhuma modificação rastreada; artefatos foram ignorados pela configuração existente. |

Os comandos acima testam o estado compilável e os testes já definidos. Não substituem E2E, exame visual de todas as telas, validação de migrations aplicadas, auditoria independente de segurança ou confirmação de produção.
