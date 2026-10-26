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
2. O front e a API compilam, todos os testes que fazem parte de `pnpm test` passaram nesta execução, o typecheck passou e o verificador das migrações Drizzle passou. Isso demonstra que esses comandos e seus escopos estão verdes neste ambiente; não demonstra que todas as funcionalidades estejam completas, que o banco esteja migrado ou que o produto esteja pronto para lançamento.
3. A arquitetura apresenta separação real em muitos módulos, mas ainda não cumpre integralmente a separação por domínio pedida: `SocialApplicationContext` e seus tipos expõem operações de cinco domínios, e a composição do reducer de estado da aplicação fica em `modules/app/state`. No back-end há rotas de apresentação que ainda executam transações SQL diretamente.
4. O código-fonte do banco define **13 tabelas em 5 schemas com tabelas**. Os documentos de backend descrevem 12 tabelas ativas e indicam que a migração do Feed ainda não foi aplicada. O banco não foi consultado nesta auditoria; portanto, o estado físico atual do banco não foi confirmado. O código e os documentos deixam uma diferença que precisa ser reconciliada antes de declarar a implantação das migrações.
5. Existem documentos gerados ou históricos que divergem do código atual, incluindo o catálogo de tabelas, o mapa de integração do front, a auditoria de prontidão do front, o status de recuperação de senha e a classificação de algumas operações de Feed.
6. Dependências diretas do workspace usam Zod `4.6.7`; Orval está em `8.44.0`. Não encontrei conflito de versões diretas Zod/Orval nos pacotes inspecionados. Versões transitivas no lockfile não devem ser tratadas como conflito sem demonstrar incompatibilidade.
7. A linha de base da auditoria tinha **1.005 arquivos**: 997 anteriores e oito documentos na pasta de auditoria. Após a primeira correção estrutural em `accounts`, o total observado passou a **1.010 arquivos**; o catálogo identifica a diferença sem apresentar a linha de base como estado atual.

## Método e limites

- Conferi a árvore completa e contei arquivos por diretório, extensão e pacote.
- Inspecionei manifests, configurações de workspace e execução, código-fonte de front e API, schemas/migrações, contratos, testes, documentação, relatórios, builds, mapas de origem e assets.
- Não usei agentes paralelos: a execução sequencial manteve uma única cadeia de evidências e validação entre os arquivos relacionados.
- Para cada arquivo do inventário, registrei categoria, finalidade inferida do caminho/conteúdo e referências diretas detectáveis. “Nenhuma referência detectada” não significa arquivo órfão: entradas, recursos estáticos, arquivos gerados, configuração e código referenciado por convenção podem não ter importador textual.
- O inventário exclui somente árvores de dependências instaladas (`node_modules`, incluindo `.pnpm`). Não havia diretório `.git` em `Seekalive/Projeto`. Diretórios vazios não são linhas do inventário.
- A análise de conexões é estática e delimitada ao conteúdo existente; não prova comportamento de integrações remotas, ambiente publicado, banco físico, contas reais, fluxos autenticados em navegador ou dispositivos de produção.
- A árvore e o catálogo integral registram o estado inicial de 1.005 arquivos. A primeira correção em `accounts` acrescentou sete caminhos e removeu dois, totalizando 1.010. O inventário completo será refeito após a etapa estrutural, para não misturar a linha de base com mudanças ainda em andamento.

## Atualização da primeira unidade estrutural — 26/10/2026

- **Escopo:** somente o domínio backend `accounts` e os importadores diretamente afetados; nenhuma mudança foi feita no frontend, no schema do banco, em migrations, nas regras de conta ou em produção.
- **Correção:** consultas de leitura foram separadas em infraestrutura; a montagem da projeção de conta foi separada do acesso a dados; privacidade e política de @ ficaram em arquivos de domínio; o lock transacional de @ foi separado da regra de cooldown.
- **Verificações:** `pnpm test` passou com 95 testes; `pnpm typecheck` passou no workspace; `pnpm --filter @workspace/api-server build` passou; a API foi reiniciada e iniciou na porta 8080; a captura do preview exibiu a tela inicial sem erros de console da aplicação.
- **Limite:** não foi executado teste de integração com escrita no banco; esta unidade não altera schema nem migrations. Outras pastas do frontend e backend ainda precisam ser revisadas.

## Verificações executadas nesta auditoria

| Verificação | Resultado observado |
|---|---|
| `pnpm test` | Passou: 93 testes, 0 falhas |
| `pnpm run typecheck` | Passou nos pacotes do workspace |
| `pnpm --filter @workspace/db run check` | Passou: Drizzle informou `Everything's fine` |
| `pnpm run build` | Passou; API, front e sandbox foram compilados |
| Banco de dados real/integrado | Não executado: `SEEKALIVE_EXPECTED_DATABASE` não está configurada; não foi feita leitura nem escrita no banco |
| Git status após o build | Sem arquivos rastreados modificados pelo build |

O teste de banco isolado tem uma barreira intencional e exige a confirmação explícita do nome esperado do banco além das variáveis de conexão. Como a confirmação não estava presente, não forcei a execução, não tentei inferir o banco e não fiz migração.

## Achados prioritários

| Prioridade | Achado | Evidência e consequência |
|---|---|---|
| Alta | Um contexto de estado no front agrega Feed/Social, Seek, Mensagens e Notificações | [`SocialApplicationContext.tsx`](../Aplicativo/front/src/modules/app/state/SocialApplicationContext.tsx), [`socialApplicationTypes.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationTypes.ts), [`socialApplicationState.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationState.ts). Reducers e ações estão distribuídos por domínio, mas a API global ainda cruza essas fronteiras. |
| Alta | A camada de apresentação da API ainda contém acesso/transação de banco em mais de uma rota | Confirmado em rotas de verificação de dispositivo, verificação de e-mail, dispositivos confiáveis, atualização/recuperação de senha, busca de contas e círculo. Isso acopla HTTP à persistência e dificulta testar a aplicação sem Express/DB. |
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
