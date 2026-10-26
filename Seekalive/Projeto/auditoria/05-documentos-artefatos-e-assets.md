# Documentos, relatórios, artefatos e assets

Este arquivo descreve grupos de material não executável e indica como eles se ligam ao produto. O [catálogo integral](06-catalogo-integral-de-arquivos.md) tem uma linha para cada arquivo, inclusive imagens, bundles, source maps, zip e anexos.

## `docs/`

### Documentação de API (`docs/api/backend/`)

| Arquivo | Papel |
|---|---|
| `README.md` | Entrada da documentação de backend, escopo atual/futuro e instruções para ler o conjunto. Contém afirmações que conflitam com outros documentos/código sobre recuperação de senha e estado de tabelas. |
| `analysis-of-reference-documents.md` | Registro de análise de documentos de escopo/referência usados no planejamento do backend. |
| `architecture-and-security.md` | Decisões, arquitetura de referência, autenticação, autorização e segurança; combina comportamento atual com recomendações futuras. |
| `data-dictionary.md` | Dicionário relacional; é marcado como proposta/contrato e possui contagem de tabela incompleta em relação ao schema fonte atual. |
| `endpoints.md` | Catálogo gerado de 138 operações candidatas e status; não é lista automaticamente descoberta no Express. |
| `external-services-and-operations.md` | Provedores, operação, configuração, implantação e dependências externas; declara o que está apenas preparado. |
| `frontend-integration.md` | Matriz histórica de rotas da UI, integração atual e integração necessária; alguns estados/caminhos ficaram obsoletos. |
| `frontend-readiness-audit.md` | Auditoria base de 22/10, atualizada parcialmente em 25/10; contém contagens e observações históricas explicitadas pelo próprio documento. |
| `generate-contracts.mjs` | Fonte do catálogo OpenAPI de documentação e `endpoints.md`; define operações e estados no próprio gerador. |
| `openapi.json` | Resultado gerado para o catálogo candidato. Separado do OpenAPI integrado a Orval. |
| `render-docs.mjs` | Compila nove arquivos Markdown em `index.html`. |
| `index.html` | Snapshot HTML independente compilado dos Markdown; não é a fonte dos capítulos. |
| `schema-core.sql` | SQL de referência/proposta para modelo futuro; documentos dizem explicitamente que não foi executado como migration. |
| `implementation-and-tests.md` | Plano por fases, estado declarado e critérios de teste; alguns trechos são cortes datados/históricos. |
| `Seekalive-backend-documentation.zip` | Pacote exportado com documentação, OpenAPI, SQL, migrations e catálogo IBGE. Precisa ser regenerado após mudanças nos itens empacotados. |

### Arquitetura, decisões e módulos (`docs/`)

- `architecture/README.md`: decisões gerais de monólito modular e fronteiras de aplicações. Diz que Gestor/Painel são scaffolds/diretórios fora do aplicativo.
- `architecture/database-domains.md`: ownership lógico de doze domínios/schemas; arquitetura aprovada no documento não significa que cada domínio ou tabela já esteja implementado.
- `decisions/ADR-001-project-structure.md`: ADR aceito sobre raiz, Aplicativo, Gestor/Painel e workspace compartilhado.
- `modules/README.md`: resumo curto dos módulos existentes e dos futuros.

## `reports/`

- `auditoria-aplicativo-e-plano-de-acao-2026-10-23.md`: relatório longo datado (1.024 linhas) com cronologia de alterações, auditorias e plano. Preserva contexto de cortes anteriores; deve ser comparado com o código do dia antes de usar como fonte atual.
- `validacao-pacote-A01-2026-10-23.md`: resultado de validação de pacote A01, datado; os números de testes refletem aquela execução, não esta.
- `auditoria-social-seek.html`: relatório visual/funcional dos módulos Social e Seek.
- `seek-evolution.html`: registro de evolução de Seek, implementação e limitações.
- `seekalive-integracao.html`: relatório de integração Social/Seek/Shop, rotas e mocks.

Os relatórios não foram apagados nem sobrescritos, conforme escopo desta tarefa. Eles são documentos históricos a preservar, mas não devem ser tratados como contratos atuais sem revisão.

## `attached_assets/` e instruções recebidas

Dentro de `Seekalive/Projeto/attached_assets` havia sete arquivos: três imagens e quatro prompts textuais referentes a ajustes visuais anteriores. Eles são materiais de referência, não código carregado pelo frontend. O prompt de engenheiro full-stack usado como orientação para esta tarefa está anexado fora da raiz `Seekalive/Projeto` e, portanto, foi lido para condução, mas não aparece como item da árvore auditada.

## `.agents/`

- `.agents/memory/` contém nove arquivos de memória/decisão de trabalho. São orientação para futuras atividades, não configuração do produto nem fonte de verdade para contratos/API. Parte menciona direções históricas, nomenclatura ou caminhos; confrontar com o código atual antes de aplicar uma regra antiga.
- `.agents/outputs/pdf-review/` contém 30 PNGs exportados como páginas de revisão de dois PDFs de escopo/arquitetura anexados anteriormente. Os PDFs originais não foram encontrados dentro de `Seekalive/Projeto` nesta busca; as páginas raster permanecem como evidência visual, mas não substituem os documentos pesquisáveis de origem.

## `generated-artifacts/`

Contém 11 arquivos de capturas/resultados de validação visual do app (desktop/mobile e telas sociais). São saídas de preview, não fixtures operacionais. A configuração `.gitignore` e `.replitignore` exclui esta pasta dos fluxos normais de Git/preview Replit; não foram removidos.

## `artifacts/mockup-sandbox/`

Aplicação auxiliar independente de preview de componentes, com seu próprio `package.json`, Vite, arquivos de configuração e `src/`. É usada para prototipagem de componentes e variantes. Sua presença não significa que seja parte da navegação/runtime principal do produto. Seu pacote foi compilado com sucesso nesta validação.

## Builds e mapas de origem

O inventário inclui `dist/` dos pacotes e arquivos `.map`, mesmo quando o Git os ignora. Eles são resultados reproduzíveis a partir do fonte/manifests e configurações de build. Source maps podem incorporar referências e, dependendo da configuração, conteúdo fonte; sua publicação em ambiente real deve ser uma decisão deliberada. A auditoria não apagou builds nem alterou flags de sourcemap.

Arquivos `.tsbuildinfo` são estado incremental do TypeScript; bundles `.js`/`.css`/`.html` são saídas do Vite/esbuild; `.map` mapeia saídas para fontes; imagens e SVGs são assets. O inventário informa o caminho/base correspondente quando detectável.

## Materiais de infraestrutura ainda sem provedor ativo

Os READMEs de `infra/cache`, `infra/queues`, `infra/storage` e `infra/deployment` descrevem preparação/decisões, não uma conexão ativa de serviço. Em particular, o armazenamento persistente de mídia ainda não está conectado ao frontend/API. Não foi iniciada configuração de provedores externos, credenciais ou produção.
