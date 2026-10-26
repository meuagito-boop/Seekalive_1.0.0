# Auditoria integral do projeto Seekalive

**Data do levantamento:** 26/10/2026  
**Escopo:** tudo que é arquivo dentro de `Seekalive/Projeto`, exceto conteúdo instalado de dependências (`node_modules` e o conteúdo de `.pnpm`).  
**Resultado inicial:** inventário do estado encontrado e análise das ligações entre arquivos. A partir de 26/10/2026, iniciou-se uma correção estrutural controlada por domínio; as alterações e validações posteriores são registradas abaixo e no delta do catálogo.

## Navegação

- [Árvore e catálogo da raiz](01-arvore-e-catalogo-da-raiz.md)
- [Back-end, banco e domínios](02-backend-e-banco.md)
- [Front-end e módulos de produto](03-frontend.md)
- [Contratos, documentos e validações](04-contratos-documentacao-e-validacoes.md)
- [Documentação, artefatos e materiais de apoio](05-documentos-artefatos-e-assets.md)
- [Catálogo integral de arquivos](06-catalogo-integral-de-arquivos.md)
- [Plano de ação por frentes e gates](plano-de-acao-tecnico.md)

## Conclusões executivas

1. A estrutura é um monorepo pnpm com o aplicativo React/Vite, API Express, banco Drizzle/PostgreSQL, contratos OpenAPI/Zod, cliente React gerado, sandbox de componentes, scripts, documentação e materiais de validação.
2. A auditoria inicial registrou build do front/API, typecheck e testes passando. Na etapa atual, `pnpm test` passou com 96 testes, o typecheck completo do workspace passou e o build da API passou. O teste de integração que escreve em schema temporário não foi executado: as variáveis obrigatórias para identificar o banco de desenvolvimento não estavam configuradas. Esses resultados não provam que todas as funcionalidades estejam completas, que o banco esteja migrado ou que o produto esteja pronto para lançamento.
3. A arquitetura apresenta separação real em muitos módulos, mas ainda não cumpre integralmente a separação por domínio pedida: `SocialApplicationContext` e seus tipos expõem operações de cinco domínios, e a composição do reducer de estado da aplicação fica em `modules/app/state`. No backend, as rotas de Auth agora atuam como adaptadores; ainda há rotas de Profiles e Social com consultas SQL diretas.
4. O código-fonte do banco define **13 tabelas em 5 schemas com tabelas**. Os documentos de backend descrevem 12 tabelas ativas e indicam que a migração do Feed ainda não foi aplicada. O banco não foi consultado nesta auditoria; portanto, o estado físico atual do banco não foi confirmado. O código e os documentos deixam uma diferença que precisa ser reconciliada antes de declarar a implantação das migrações.
5. Existem documentos gerados ou históricos que divergem do código atual, incluindo o catálogo de tabelas, o mapa de integração do front, a auditoria de prontidão do front, o status de recuperação de senha e a classificação de algumas operações de Feed.
6. Dependências diretas do workspace usam Zod `4.6.7`; Orval está em `8.44.0`. Não encontrei conflito de versões diretas Zod/Orval nos pacotes inspecionados. Versões transitivas no lockfile não devem ser tratadas como conflito sem demonstrar incompatibilidade.
7. A linha de base da auditoria tinha **1.005 arquivos**: 997 anteriores e oito documentos na pasta de auditoria. Após a correção de `accounts`, o total intermediário era 1.010; após a unidade estrutural `auth`, o total observado passou a **1.024 arquivos**. O catálogo mantém a linha de base e registra os deltas por etapa.

## Método e limites

- Conferi a árvore completa e contei arquivos por diretório, extensão e pacote.
- Inspecionei manifests, configurações de workspace e execução, código-fonte de front e API, schemas/migrações, contratos, testes, documentação, relatórios, builds, mapas de origem e assets.
- Não usei agentes paralelos: a execução sequencial manteve uma única cadeia de evidências e validação entre os arquivos relacionados.
- Para cada arquivo do inventário, registrei categoria, finalidade inferida do caminho/conteúdo e referências diretas detectáveis. “Nenhuma referência detectada” não significa arquivo órfão: entradas, recursos estáticos, arquivos gerados, configuração e código referenciado por convenção podem não ter importador textual.
- O inventário exclui somente árvores de dependências instaladas (`node_modules`, incluindo `.pnpm`). Não havia diretório `.git` em `Seekalive/Projeto`. Diretórios vazios não são linhas do inventário.
- A análise de conexões é estática e delimitada ao conteúdo existente; não prova comportamento de integrações remotas, ambiente publicado, banco físico, contas reais, fluxos autenticados em navegador ou dispositivos de produção.
- A árvore e o catálogo integral registram o estado inicial de 1.005 arquivos. A correção em `accounts` acrescentou sete caminhos e removeu dois, totalizando 1.010; a unidade `auth` acrescentou 14 caminhos, totalizando 1.024. O inventário integral será refeito após a etapa estrutural, para não misturar a linha de base com mudanças ainda em andamento.

## Atualização da primeira unidade estrutural — 26/10/2026

- **Escopo:** somente o domínio backend `accounts` e os importadores diretamente afetados; nenhuma mudança foi feita no frontend, no schema do banco, em migrations, nas regras de conta ou em produção.
- **Correção:** consultas de leitura foram separadas em infraestrutura; a montagem da projeção de conta foi separada do acesso a dados; privacidade e política de @ ficaram em arquivos de domínio; o lock transacional de @ foi separado da regra de cooldown.
- **Verificações:** `pnpm test` passou com 95 testes; `pnpm typecheck` passou no workspace; `pnpm --filter @workspace/api-server build` passou; a API foi reiniciada e iniciou na porta 8080; a captura do preview exibiu a tela inicial sem erros de console da aplicação.
- **Limite:** não foi executado teste de integração com escrita no banco; esta unidade não altera schema nem migrations. Outras pastas do frontend e backend ainda precisam ser revisadas.

## Atualização da segunda unidade estrutural — backend `auth` — 26/10/2026

- **Escopo:** os 50 arquivos atuais de `Aplicativo/back/src/modules/auth`, seus handlers e operações de aplicação diretamente relacionados, mais a inicialização do perfil comercial no domínio Profiles e um teste de fronteira. Não foram alterados contratos HTTP, schema, migrations, regras de autenticação, integrações, frontend, Gestor, Painel ou dados do banco.
- **Correção:** retirados imports/operações Drizzle dos handlers de cadastro, CSRF, sessões, dispositivos confiáveis, verificação de e-mail, verificação de instalação e atualização/recuperação de senha. Cada fluxo persistente agora é chamado por uma operação própria em `application`; as transações de segurança continuam atômicas. A criação inicial de `commercialProfiles` agora pertence a `profiles/application/initializeCommercialProfile.ts`, executada dentro da mesma transação de criação da conta.
- **Verificações:** `pnpm test` passou com 96 testes, incluindo o novo teste de fronteira de Auth; `pnpm run typecheck` passou no workspace; `pnpm --filter @workspace/api-server build` passou; não foram detectados ciclos de import local no domínio Auth; `git diff --check` passou.
- **Limite:** o teste de integração com schema temporário foi tentado com a barreira explícita, mas o próprio teste parou antes de conexão ou escrita porque `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE` não estavam configuradas. Nenhuma migration, tabela ou schema foi criado/alterado. A reorganização Gate 0A permanece em andamento; Auth não significa que Profiles, Social, Feed ou frontend estejam concluídos.

## Verificações executadas nesta auditoria

| Verificação | Resultado observado |
|---|---|
| `pnpm test` | Passou: 93 testes, 0 falhas |
| `pnpm run typecheck` | Passou nos pacotes do workspace |
| `pnpm --filter @workspace/db run check` | Passou: Drizzle informou `Everything's fine` |
| `pnpm run build` | Passou; API, front e sandbox foram compilados |
| Banco de dados real/integrado | Teste de schema temporário bloqueado antes da conexão por ausência de `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE`; nenhuma leitura/escrita foi feita |
| Git status após o build | Sem arquivos rastreados modificados pelo build |

O teste de banco isolado tem uma barreira intencional e exige a confirmação explícita do nome esperado do banco além das variáveis de conexão. Como a confirmação não estava presente, não forcei a execução, não tentei inferir o banco e não fiz migração.

## Achados prioritários

| Prioridade | Achado | Evidência e consequência |
|---|---|---|
| Alta | Um contexto de estado no front agrega Feed/Social, Seek, Mensagens e Notificações | [`SocialApplicationContext.tsx`](../Aplicativo/front/src/modules/app/state/SocialApplicationContext.tsx), [`socialApplicationTypes.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationTypes.ts), [`socialApplicationState.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationState.ts). Reducers e ações estão distribuídos por domínio, mas a API global ainda cruza essas fronteiras. |
| Alta | Parte da camada de apresentação da API ainda contém acesso direto ao banco | Corrigido nas rotas de Auth nesta unidade. Permanecem rotas de Profiles e Social; a composição de perfil público também está na apresentação. Esses pontos seguem acoplando HTTP à persistência/composição de domínio. |
| Alta | O estado físico do banco não foi comprovado, enquanto código e documentos descrevem estados diferentes | 13 tabelas no schema Drizzle; documentos de backend indicam 12 tabelas e migração do Feed pendente. O banco não foi consultado. |
| Média | Documentação de integração e prontidão contém contagens e caminhos antigos | `frontend-integration.md` e `frontend-readiness-audit.md` usam estrutura/contagens anteriores; não devem servir sozinhos como contrato de implementação atual. |
| Média | Documentação de recuperação de senha e de Feed está parcialmente desatualizada | Há rotas/serviços de redefinição no código; parte da documentação declara a recuperação não implementada. O código tem rotas de posts/artigos, enquanto contratos/documentos de backend tratam itens de Feed como proposta ou dependem da migração ainda pendente. |
| Média | O artefato `.replit` especifica Node 20, mas esta execução usa Node `22.23.4` | O projeto compilou nesta sessão; a diferença de runtime precisa ser resolvida/testada na configuração antes de depender dela em execução reproduzível. |
| Baixa | `.npmrc` desliga instalação automática e validação estrita de peers | Não prova incompatibilidade por si só, mas reduz o sinal de avisos de peers; manter a decisão documentada e revisar avisos após mudanças de dependências. |

## O que esta auditoria não declara

- Não declara a aplicação “perfeita”, pronta para produção, nem todos os módulos concluídos.
- Não declara que as migrações estão aplicadas ao banco.
- Não declara que todas as telas usam API real. O front contém adaptadores e dados de demonstração explicitamente locais, além de módulos ainda sem backend.
- Não declara que cada fluxo foi testado por navegação automatizada ou por uma conta real; os testes executados são os listados acima.
- Não atualiza nem apaga documentos antigos. As divergências foram mantidas e apontadas, pois a tarefa pediu auditoria, não limpeza ou reescrita histórica.

## Próximas ações técnicas recomendadas

1. Reconciliar inventário de tabelas e estado de migrações com uma leitura autorizada do banco de desenvolvimento; registrar separadamente schemas/tabelas esperados, migrations aplicadas e pendências.
2. Atualizar os documentos de backend e front a partir do código e contratos atuais, identificando claramente documento-fonte, artefato gerado e histórico.
3. Definir a fronteira do estado compartilhado do front: preservar a orquestração necessária, mas impedir que o contexto de `app` se torne API de negócio de todos os módulos.
4. Mover operações persistentes das rotas de apresentação para casos de uso/repositorios e testar o comportamento HTTP por meio de contratos estáveis.
5. Testar a compatibilidade com o runtime declarado pelo ambiente Replit e manter lockfile, catálogo de versões e manifests coerentes.
6. Somente depois dessas reconciliações, continuar expansão de módulos ou declarar qualquer etapa concluída para produção.
