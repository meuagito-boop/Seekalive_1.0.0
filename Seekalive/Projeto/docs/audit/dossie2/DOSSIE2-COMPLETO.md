# Dossiê Seekalive — Rodada 2 (completo)

Consolidação integral da rodada. Os relatórios individuais permanecem como fonte detalhada e editável. Este documento não substitui os limites declarados no índice.

## Documento: 00-indice.md

# Dossiê Seekalive — Rodada 2

## Estado geral

**Concluída dentro dos limites do prompt.** É uma auditoria do ambiente de desenvolvimento; não representa validação de produção. Nenhum código/configuração/lockfile/migration foi alterado. Nenhuma escrita em banco, chamada HTTP mutável, envio de e-mail, execução de worker ou acesso à produção ocorreu.

Foram registrados **42 itens**: **34 CONFIRMADOS, 5 PARCIAIS, 2 NÃO VERIFICADOS, 1 NÃO EXECUTADO e 0 CONTRADITOS**. Severidades: **2 altos, 13 médios, 20 baixos e 7 informativos**.

## Status dos blocos

| Bloco | Status | Achados | Resultado resumido |
|---|---|---:|---|
| [R2-01 — Testes e typecheck](R2-01-testes-typecheck.md) | Concluído; suites bloqueadas pelo pré-voo | 3 | Typecheck, check do banco e audit passaram; nenhuma suite iniciou. |
| [R2-02 — Tokens, CSRF e sessões](R2-02-tokens-csrf-sessoes.md) | Concluído por análise estática | 5 | Geração/armazenamento de tokens, tentativas, CSRF, cookies e revogações inventariados. |
| [R2-03 — Enumeração e abuso](R2-03-enumeracao-limites-erros.md) | Concluído por análise estática | 6 | Matriz de estados/status, e-mail e rate limits documentada; sem chamadas HTTP. |
| [R2-04 — Privacidade](R2-04-privacidade-matriz.md) | Concluído por código/caminhos de leitura | 1 | Matriz de visibilidade e superfícies de leitura/escrita comparadas. |
| [R2-05 — HTTP, proxy e entrada](R2-05-http-proxy-inputs.md) | Concluído; edge não testado | 3 | 22/22 cenários sintéticos de IP passaram; headers e cache inventariados. |
| [R2-06 — Banco e migrations](R2-06-papel-banco-migrations.md) | Concluído; igualdade semântica não verificada | 5 | Papel, ledgers e catálogo somente leitura; sem DDL. |
| [R2-07 — SQL e paginação](R2-07-sql-paginacao-planos.md) | Concluído; somente captura e EXPLAIN | 7 | 15 variantes de consultas avaliadas sem `ANALYZE` e sem ler dados de aplicação. |
| [R2-08 — Workers e operação](R2-08-workers-transacoes-saude.md) | Concluído; jobs/e-mail/queda do banco não executados | 7 | Sequências de envio, transações, worker, readiness e shutdown descritos. |
| [R2-09 — Frontend e bundle](R2-09-frontend-storage-clients-build.md) | Concluído; sem browser/E2E | 3 | Build passou; storage/clientes/artefato examinados. |
| [R2-10 — Dependências e Argon2id](R2-10-dependencias-argon2-memoria.md) | Concluído; medição no container de desenvolvimento | 2 | Audit passou; Argon2id medido em 1/2/4/8 processos. |
| [R2-99 — Síntese e pendências](R2-99-sintese.md) | Concluído | — | Matriz geral, top 10, não verificados, comandos para validação humana e sequência recomendada. |

## Contagem por veredito

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 34 |
| PARCIAL | 5 |
| NÃO VERIFICADO | 2 |
| NÃO EXECUTADO | 1 |
| CONTRADITO | 0 |

## Resultado das validações

| Verificação | Resultado |
|---|---|
| `pnpm run typecheck` | **PASSOU** — exit 0. |
| `pnpm --filter @workspace/db run check` | **PASSOU** — cinco trilhas; Seek não está incluída. |
| `pnpm audit --prod` | **PASSOU** — exit 0, nenhuma vulnerabilidade conhecida reportada naquela execução. |
| Build de produção do frontend | **PASSOU** — 2.696 módulos e 96 chunks JS; dois avisos Rollup sobre anotações `@__PURE__` do Zod. |
| Matriz sintética de IP | **PASSOU** — 22/22 casos, sem rede ou servidor. |
| Benchmark Argon2id | **PASSOU** — concorrências 1, 2, 4 e 8; nenhum limite de 1 GiB atingido. |
| Captura SQL + `EXPLAIN` | **EXECUTADO** — 15 variantes; sem `ANALYZE`, sem executar consulta de aplicação ou ler linhas de dados. |
| Suítes unitárias, integração, DB e E2E | **NÃO EXECUTADAS** — faltam guardas obrigatórias de schema isolado; ver R2-01. |
| Browser, HTTP, e-mail real, worker e recuperação de DB | **NÃO EXECUTADOS** — browser requer prova de schema isolado; não houve necessidade de GET ao servidor; e-mail real, worker e falha de banco não foram provocados por exigirem efeitos externos/estado. |

## Arquivos

- `R2-01-testes-typecheck.md` a `R2-10-dependencias-argon2-memoria.md`: um relatório por bloco.
- `R2-99-sintese.md`: síntese exigida pelo roteiro.
- `experimentos/`: scripts descartáveis permitidos pelo prompt, sem acesso externo e limitados a dados sintéticos ou leituras autorizadas.
- `DOSSIE2-COMPLETO.md`: conteúdo integral reunido em um único arquivo.

## Limitação importante

“Concluído” significa que a análise permitida foi registrada. Não significa que testes bloqueados foram aprovados nem que correções de produto foram implementadas. Os relatórios indicam os itens que precisam de validação humana ou etapa posterior aprovada.

---

## Documento: R2-99-sintese.md

# R2-99 — Síntese da auditoria dirigida

## Escopo e limites

Rodada estática e controlada sobre código, configuração versionada, resultados de comandos autorizados e metadados do banco de desenvolvimento. Não houve alteração de produto, instalação/remoção de dependências, execução de migrations/DDL, escrita em banco, envio de e-mail, chamada HTTP mutável, teste contra produção ou reinício de workflow. Nenhuma linha de dados de aplicação foi consultada.

O pré-voo obrigatório não liberou suítes: faltam guardas de isolamento. Por isso, verificações estáticas e sintéticas não são apresentadas como testes de integração ou prova de comportamento real em deployment.

## Resultado consolidado

- **42 achados/limitações identificados:** 34 CONFIRMADOS, 5 PARCIAIS, 2 NÃO VERIFICADOS e 1 NÃO EXECUTADO; nenhum CONTRADITO.
- **Risco:** 2 altos, 13 médios, 20 baixos e 7 informativos.
- **Verificações executadas:** typecheck, checagem Drizzle das cinco trilhas configuradas, `pnpm audit --prod`, build de produção do frontend, matriz sintética de IP (22/22) e benchmark sintético Argon2id nas concorrências 1/2/4/8.
- **Não executado:** toda suíte unitária/integrada/E2E sujeita ao pré-voo; teste em navegador; requisições HTTP; queda/recuperação do banco; worker; entrega real de e-mail e cenário real de proxy.
- **Ambiente:** conclusões de banco referem-se somente ao desenvolvimento. Deployment de produção, edge, credenciais, região e banco de produção não foram acessados nem inferidos.

## Relação com a rodada 1

Esta rodada adiciona evidência nova, sem repetir as conclusões antigas como se fossem testes atuais:

- `R2-03-001` e `R2-03-003` ampliam `03-010`.
- `R2-04-001` amplia `04-001` e `A2-003`.
- `R2-05-002` amplia `11-005`.
- `R2-09-001` amplia `12-008`.
- Os demais itens dos blocos R2-01 a R2-10 estão marcados como novos nos relatórios correspondentes.

## Matriz de lacunas e vereditos

| Lacuna/achado | Veredito | Referência |
|---|---|---|
| Suítes sem guardas completas para isolamento | NÃO EXECUTADO | [R2-01-001](R2-01-testes-typecheck.md#r2-01-001-suítes-não-liberadas-pelo-pré-voo) |
| Baseline de migration usa nome de schema fora do protocolo | CONFIRMADO | [R2-01-002](R2-01-testes-typecheck.md#r2-01-002-baseline-de-migration-usa-nomenclatura-de-schema-fora-do-protocolo) |
| Teste Seek discovery fora do comando padrão | CONFIRMADO | [R2-01-003](R2-01-testes-typecheck.md#r2-01-003-seekdiscoverytest-fora-do-comando-padrão) |
| Expiração de cookie de dispositivo contradiz revogação manual | CONFIRMADO | [R2-02-001](R2-02-tokens-csrf-sessoes.md#r2-02-001-cookie-persistente-do-dispositivo-expira-antes-de-revogação-manual) |
| Limites de tentativas variam entre desafios | CONFIRMADO | [R2-02-002](R2-02-tokens-csrf-sessoes.md#r2-02-002-limites-de-tentativas-variam-entre-finalidades) |
| Sessão possui expiração absoluta, sem rolling | CONFIRMADO | [R2-02-003](R2-02-tokens-csrf-sessoes.md#r2-02-003-sessão-tem-expiração-absoluta-não-renovação-deslizante) |
| GET de CSRF substitui o token da sessão | CONFIRMADO | [R2-02-004](R2-02-tokens-csrf-sessoes.md#r2-02-004-emissão-csrf-por-get-substitui-o-token-salvo-na-sessão) |
| Troca de e-mail mantém sessões/dispositivos | CONFIRMADO | [R2-02-005](R2-02-tokens-csrf-sessoes.md#r2-02-005-troca-de-e-mail-mantém-sessões-e-dispositivos-existentes) |
| Rate limit depende da memória de um processo | CONFIRMADO | [R2-03-001](R2-03-enumeracao-limites-erros.md#r2-03-001-rate-limit-depende-da-memória-de-um-processo) |
| Reset não comunica falha de entrega | CONFIRMADO | [R2-03-002](R2-03-enumeracao-limites-erros.md#r2-03-002-solicitação-de-reset-não-comunica-falha-de-entrega-ao-solicitante) |
| Limite por destinatário não demonstrado | PARCIAL | [R2-03-003](R2-03-enumeracao-limites-erros.md#r2-03-003-limite-por-destinatário-não-demonstrado) |
| Bloqueio após três códigos sem fluxo de desbloqueio no backend | CONFIRMADO | [R2-03-004](R2-03-enumeracao-limites-erros.md#r2-03-004-bloqueio-de-conta-não-tem-desbloqueio-suportado-no-backend) |
| Registro não verificado pode reter @ sem prazo demonstrado | PARCIAL | [R2-03-005](R2-03-enumeracao-limites-erros.md#r2-03-005-cadastro-não-verificado-pode-reter-o-sem-prazo-demonstrado) |
| Tempo de cadastro pode distinguir estado do e-mail | CONFIRMADO | [R2-03-006](R2-03-enumeracao-limites-erros.md#r2-03-006-cadastro-mantém-códigos-genéricos-mas-o-tempo-pode-distinguir-estado-do-e-mail) |
| Rótulo “Somente você” diverge da leitura aprovada em perfil privado | CONFIRMADO | [R2-04-001](R2-04-privacidade-matriz.md#r2-04-001-rótulo-somente-você-não-corresponde-à-audiência-private-em-perfil-privado) |
| Leituras personalizadas sem política explícita de cache | CONFIRMADO | [R2-05-001](R2-05-http-proxy-inputs.md#r2-05-001-leituras-personalizadas-não-definem-política-explícita-de-cache) |
| Atribuição de IP depende da cadeia/proxy de deployment | PARCIAL | [R2-05-002](R2-05-http-proxy-inputs.md#r2-05-002-a-atribuição-de-ip-depende-da-cadeia-encaminhada-e-da-borda-ainda-não-especificada) |
| Headers globais de endurecimento não estão definidos no app | PARCIAL | [R2-05-003](R2-05-http-proxy-inputs.md#r2-05-003-headers-globais-de-endurecimento-não-estão-definidos-no-app) |
| Papel de runtime observado tem privilégios administrativos totais | CONFIRMADO | [R2-06-001](R2-06-papel-banco-migrations.md#r2-06-001-credencial-de-runtime-tem-privilégios-administrativos-totais) |
| Snapshot Accounts não registra remoção executada por Profiles | CONFIRMADO | [R2-06-002](R2-06-papel-banco-migrations.md#r2-06-002-snapshot-de-accounts-não-registra-a-remoção-executada-pela-trilha-profiles) |
| Migration local da tabela de avaliações comerciais está pendente | CONFIRMADO | [R2-06-003](R2-06-papel-banco-migrations.md#r2-06-003-tabela-de-avaliações-comerciais-está-prevista-mas-migration-local-não-foi-aplicada) |
| Ledger Seek marca aplicação, mas a tabela está ausente | CONFIRMADO | [R2-06-004](R2-06-papel-banco-migrations.md#r2-06-004-ledger-seek-afirma-aplicação-mas-a-tabela-esperada-não-existe) |
| Igualdade semântica das constraints não foi comprovada | NÃO VERIFICADO | [R2-06-005](R2-06-papel-banco-migrations.md#r2-06-005-igualdade-semântica-integral-das-constraints-não-foi-verificada) |
| Paginação de relações pode truncar/instabilizar resultados | CONFIRMADO | [R2-07-001](R2-07-sql-paginacao-planos.md#r2-07-001-paginação-de-relações-pode-truncarinstabilizar-resultados) |
| Busca social por substring varre contas | CONFIRMADO | [R2-07-002](R2-07-sql-paginacao-planos.md#r2-07-002-busca-social-por-substring-faz-varredura-de-contas) |
| Planos observados não escolhem índice para feeds globais/filtros de vídeo | CONFIRMADO | [R2-07-003](R2-07-sql-paginacao-planos.md#r2-07-003-feeds-globais-e-filtros-de-vídeo-não-têm-índice-escolhido-no-plano-observado) |
| Feed Seguindo materializa todas as contas seguidas | CONFIRMADO | [R2-07-004](R2-07-sql-paginacao-planos.md#r2-07-004-feed-seguindo-materializa-todas-as-contas-seguidas-sem-paginação) |
| Contador de publicações inclui audiências não visíveis | CONFIRMADO | [R2-07-005](R2-07-sql-paginacao-planos.md#r2-07-005-contador-público-de-publicações-inclui-audiências-não-visíveis-ao-visitante) |
| Totais de interação contam registros de autores bloqueados | CONFIRMADO | [R2-07-006](R2-07-sql-paginacao-planos.md#r2-07-006-totais-de-interação-incluem-registros-de-autores-bloqueados) |
| Cursor do feed global não possui assinatura | CONFIRMADO | [R2-07-007](R2-07-sql-paginacao-planos.md#r2-07-007-posição-do-cursor-global-não-tem-assinatura) |
| Worker pode permanecer desativado após falha inicial | CONFIRMADO | [R2-08-001](R2-08-workers-transacoes-saude.md#r2-08-001-worker-de-exclusão-pode-permanecer-desativado-após-falha-inicial) |
| Provider ausente impede expurgo fora do desenvolvimento com mídia | CONFIRMADO | [R2-08-002](R2-08-workers-transacoes-saude.md#r2-08-002-provider-de-mídia-não-configurado-impede-o-expurgo-fora-de-desenvolvimento) |
| Falha de um expurgo bloqueia próximos registros vencidos | CONFIRMADO | [R2-08-003](R2-08-workers-transacoes-saude.md#r2-08-003-um-expurgo-que-falha-bloqueia-os-demais-registros-vencidos) |
| Assets temporários podem não ser limpos após expiração | CONFIRMADO | [R2-08-004](R2-08-workers-transacoes-saude.md#r2-08-004-assets-temporários-podem-permanecer-após-expirar-sem-novos-uploads) |
| Shutdown não espera o worker em execução | CONFIRMADO | [R2-08-005](R2-08-workers-transacoes-saude.md#r2-08-005-shutdown-não-confirma-o-término-do-job-em-andamento) |
| Challenge de verificação pode continuar válido após falha de envio | CONFIRMADO | [R2-08-006](R2-08-workers-transacoes-saude.md#r2-08-006-falha-de-envio-de-verificação-não-invalida-o-challenge-persistido) |
| Recuperação do pool após queda do banco não foi exercitada | NÃO VERIFICADO | [R2-08-007](R2-08-workers-transacoes-saude.md#r2-08-007-recuperação-do-pool-após-queda-do-banco-não-foi-exercitada) |
| Dados de preview no browser não são compartilhados nem fonte segura | CONFIRMADO | [R2-09-001](R2-09-frontend-storage-clients-build.md#r2-09-001-dados-de-preview-persistidos-no-navegador-não-são-fonte-segura-ou-compartilhada) |
| Clientes de Social tratam erros de forma diferente | CONFIRMADO | [R2-09-002](R2-09-frontend-storage-clients-build.md#r2-09-002-tratamento-de-erros-diverge-entre-os-clientes-de-social) |
| Scan textual não prova ausência de todo caminho de preview no bundle | PARCIAL | [R2-09-003](R2-09-frontend-storage-clients-build.md#r2-09-003-marcadores-de-preview-permanecem-no-bundle-apesar-da-ausência-de-fixtures-conhecidas) |
| Dependências CORS sem importação identificada no backend | CONFIRMADO | [R2-10-001](R2-10-dependencias-argon2-memoria.md#r2-10-001-dependências-cors-aparentam-estar-sem-uso) |
| `preinstall` remove lockfiles de outros gerenciadores | CONFIRMADO | [R2-10-002](R2-10-dependencias-argon2-memoria.md#r2-10-002-preinstall-apaga-lockfiles-de-outros-package-managers) |

## Dez riscos confirmados de maior impacto

Os riscos abaixo foram confirmados por código ou metadados da rodada. “Confirmado” não significa que o cenário foi provocado em produção.

| Ordem | Achado | Risco | Impacto observado/condição |
|---:|---|---|---|
| 1 | R2-06-001 | Alto | A credencial do backend no banco de desenvolvimento tem poderes administrativos e contorna RLS. |
| 2 | R2-08-001 | Alto | Uma falha de inicialização pode deixar a purga de exclusões sem execução e sem sinal no readiness. |
| 3 | R2-03-004 | Médio | Após três códigos incorretos, não foi encontrado fluxo de desbloqueio no backend; a recuperação depende de suporte manual fora do fluxo. |
| 4 | R2-06-002 | Médio | A trilha Profiles altera campos de Accounts sem snapshot/migration correspondente na trilha Accounts. |
| 5 | R2-06-003 | Médio | O banco de desenvolvimento não contém a tabela de avaliações prevista no quarto SQL local de Profiles. |
| 6 | R2-06-004 | Médio | Ledger Seek e catálogo divergem; a trilha ainda não é validada pelo `check`. |
| 7 | R2-08-002 | Médio | Fora do desenvolvimento, a exclusão com mídia falha se não houver provider de armazenamento compatível. |
| 8 | R2-08-003 | Médio | Um registro de expurgo com falha repetida impede avançar os demais registros vencidos no lote. |
| 9 | R2-07-004 | Médio | Feed Seguindo carrega todas as contas seguidas antes da paginação dos posts. |
| 10 | R2-04-001 | Médio | A UI diz “Somente você”, embora seguidores aprovados de perfil privado também leiam a audiência `private`. |

## Itens não verificados e próximos testes seguros

1. **R2-06-005 — igualdade semântica de constraints:** a comparação fez presença/nome e estrutura de colunas; falta comparar expressão SQL, predicados, ações `ON DELETE` e demais opções por catálogo, em modo somente leitura e no banco de desenvolvimento.
2. **R2-08-007 — recuperação do pool:** falta provocar queda e retorno do banco em ambiente de teste isolado, sem dados reais, e observar resposta da API, health/readiness, worker e necessidade de restart.
3. **R2-05-002 — IP real do bucket:** só a composição local foi exercitada. O header e o peer observados atrás da borda do deployment escolhido dependem de teste remoto autorizado descrito abaixo.
4. **R2-05-003 — headers finais:** falta captura HTTP no deployment de teste para descobrir o que a borda acrescenta; a auditoria não conclui que o resultado final esteja sem headers.
5. **R2-09-003 — fixtures no artefato:** o build passou e não foram encontrados marcadores de fixture conhecidos; falta uma inspeção comportamental isolada que prove que todos os caminhos de preview não estão acessíveis no build final.
6. **R2-01-001 — suites:** não executar até fornecer as guardas seguras ausentes e repetir o pré-voo. Depois, rodar uma suite por vez, guardar saída sem dados privados e confirmar zero schema temporário antes/depois. Não completar guardas com valores inferidos.

## Pendências humanas exigidas pelo roteiro

### Teste do bucket de IP em deployment de teste

Não executar em produção. Preencher `TEST_BASE_URL` com a URL de um deployment **de teste**, sem credenciais. Usar o mesmo servidor/instância se o balanceamento permitir; se não for possível, o resultado é inconclusivo. O endpoint é somente GET de disponibilidade e o limite encontrado no código é 30/min por IP.

Na rede A, dentro de uma janela de 60 segundos:

```sh
export TEST_BASE_URL='https://<host-do-deployment-de-teste>'
for i in $(seq 1 31); do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    --get --data-urlencode 'username=r2auditcheck' \
    "$TEST_BASE_URL/api/v1/accounts/availability"
done
```

Resultado esperado: solicitações 1–30 devem passar pelo limite normal (`200` para username válido); a 31ª deve retornar `429` se todas atingirem o mesmo processo/bucket antes do reset.

Imediatamente, pela rede B (IP público diferente), executar:

```sh
curl -sS -D - -o /dev/null -w 'status=%{http_code}\n' \
  --get --data-urlencode 'username=r2auditcheck' \
  "$TEST_BASE_URL/api/v1/accounts/availability"
```

Resultado esperado: `200` com bucket por IP cliente; `429` com `Retry-After` se a borda fizer as duas redes compartilhar o bucket. Anotar somente status, `Retry-After`, hora aproximada e se as redes eram diferentes; não salvar corpo, cookies ou credenciais. Repetir o teste se a aplicação estiver em múltiplas instâncias sem afinidade.

### Consolidação de infraestrutura antes de qualquer produção

1. No console do provedor de hospedagem escolhido, registrar o tipo de deployment, domínio e topologia/headers que chegam à aplicação. Não alterar deployment durante esta auditoria.
2. No console do provedor de banco, verificar e documentar a retenção de backup/PITR disponível e habilitada no ambiente de desenvolvimento; não alterar o plano nem consultar dados.
3. Escolher a região do banco de produção somente após definir o provedor e a estratégia de residência de dados; a região ainda não foi criada nem validada.
4. Depois de escolher hospedagem e banco de produção, cadastrar os nomes/valores necessários pelo fluxo seguro de secrets e verificar apenas presença/nome. Nunca registrar valores no relatório.

## Sequência técnica recomendada após aprovação do relatório

1. Preparar guardas de teste isolado sem escrever em schemas reais; revisar o caso especial de `test:baselines`.
2. Executar as suites liberadas uma por vez e corrigir as regressões demonstradas; repetir typecheck e teste da suite afetada.
3. Resolver a credencial administrativa de runtime e registrar migrations/snapshots de cada domínio sem aplicar alterações destrutivas neste ciclo.
4. Validar limites, desbloqueio, privacidade e paginação com testes dirigidos.
5. Só depois abrir etapas de implementação de worker, armazenamento, cache, cabeçalhos, proxy e integrações; cada etapa requer plano/aprovação própria. Nenhuma dessas correções foi feita nesta rodada.

---

## Documento: R2-01-testes-typecheck.md

# R2-01 — Scripts, testes, typecheck e trilhas de migration

**Status:** revisão estática concluída; typecheck e checagens locais executados; suítes de teste não executadas por bloqueio obrigatório de isolamento.  
**Limite:** nenhum teste, migration, `push`, seed ou escrita em schema real foi executado. Nenhuma falha de teste é inferida como aprovação.

## Inventário de comandos

| Área | Comandos relevantes identificados | Papel e cobertura observada |
|---|---|---|
| Raiz | `typecheck`, `typecheck:libs`, `test`, `test:social`, `test:account-deletion`, `build` | `typecheck` compila libs e executa typecheck dos pacotes de Aplicativo, shared, infra, scripts e artifacts. `test` agrega testes sociais, backend e testes Node; não inclui explicitamente `seekDiscovery.test.ts`, `test:baselines` nem os E2E do frontend. |
| `scripts` | `test:security-boundaries`, `test:api-runtime`, `test:db-connection`, `test:db-domain-registry`, `test:api-isolated-db`, `test:accounts-deletion-schema`, `test:accounts-deletion-policy`, `test:feed-global`, `test:media-storage`, `test:profiles-reviews`, `test:backend` | Testes de limites de segurança, runtime, registro de domínios, integração API isolada e políticas dos domínios. `test:backend` agrega subconjuntos; comandos de teste DB precisam de isolamento demonstrável. |
| Backend | `typecheck`, `build`; arquivos Node de exclusão no alvo `test:account-deletion` | A suíte de exclusão é composta por teste de schema, lifecycle e API isolada. O backend não possui comando genérico próprio de teste que cubra todo o domínio Auth. |
| Frontend | `typecheck`, `build`, `serve`, `test:e2e:auth`, `test:e2e:auth:registration:integration`, `test:e2e:auth:sessions:integration`, `test:e2e:auth:reset:integration`, `test:e2e:auth:credential-changes:integration` | `auth` mocka API; quatro variantes `integration` iniciam uma API de teste ligada a schema isolado. Os testes E2E não fazem parte de `pnpm test` na raiz. |
| Banco | `check`, `test:baselines`, `generate:*`, `migrate:*`, `push:*` | `check` valida os journals de Accounts, Security, Profiles, Feed e Media. `test:baselines` cria schemas temporários; `generate`, `migrate` e `push` são mudanças ou geração de estado e não foram executados. |
| Teste fora do agregador | `Aplicativo/front/tests/seekDiscovery.test.ts` | Teste unitário de descoberta, com `fetch`/session storage simulados; não há script package dedicado que o inclua no `pnpm test` da raiz. |

## Pré-voo obrigatório de isolamento

| Requisito | Evidência | Resultado |
|---|---|---|
| Schema aleatório `seekalive_test_<32 hex>` criado e usado | `scripts/test-support/isolatedDatabaseFixture.mjs:30-36,111-220` gera o nome com UUID aleatório, cria o schema isolado, executa o alvo de migration de teste, valida o isolamento e tenta remover o schema criado. | **Comprovado** para fixture de integração. |
| `NODE_ENV=test`, `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_DB_SCHEMA`, `SEEKALIVE_DB_MIGRATION_TARGET`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS` | `isolatedDatabaseFixture.mjs:43-70,118-122` aplica as guardas e configura o schema/target antes do teste. | **Guardas implementadas; variáveis necessárias não estão todas presentes no shell atual.** |
| Recusa de produção (`REPLIT_DEPLOYMENT`) | `isolatedDatabaseFixture.mjs:43-53`; `infra/database/scripts/test-migration-baselines.mjs:8-21` | **Comprovado** no código de fixture. O marcador de deployment não está presente neste shell; nenhum valor de conexão foi mostrado. |
| Adaptador de e-mail falso, sem envio Resend | `Aplicativo/back/src/modules/auth/infrastructure/emailDelivery.ts:19-34` permite injeção apenas em `NODE_ENV=test`; testes de API isolada configuram esse adaptador antes de importar a aplicação. `authRegistrationBrowserServer.mjs` usa adaptador de teste; o fixture remove credenciais Resend do processo filho. | **Comprovado para os testes de fluxo Auth que realmente enviam e-mail.** Testes sem envio não importam/callam a entrega real. |
| Schema `seekalive_test_%` antes dos testes | Consulta de catálogo de desenvolvimento, filtrada apenas por `information_schema.schemata` | **Nenhum schema encontrado.** |
| Schema `seekalive_test_%` após os testes | Não houve execução de testes; nova consulta de catálogo após este registro | **Nenhum schema criado por esta auditoria; nenhum cleanup foi tentado.** |

Variáveis de ambiente consultadas foram reportadas somente como presentes/ausentes: `DATABASE_URL` está presente; `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS`, `SEEKALIVE_DB_SCHEMA` e `SEEKALIVE_DB_MIGRATION_TARGET` estão ausentes. O segredo Resend está presente, mas não foi lido nem exposto. Não preenchi guardas faltantes com valores inferidos.

### Suítes e estado de execução

| Comando/suíte | Resultado | Motivo específico |
|---|---|---|
| `pnpm test` | **NÃO EXECUTADO** | O pré-voo não está satisfeito: faltam a identidade de banco esperada e o opt-in obrigatório; o agregado combina suites diferentes e `test:social` escreve em `os.tmpdir()` se `TMPDIR` não for redirecionado para a pasta permitida. |
| `pnpm test:account-deletion` | **NÃO EXECUTADO** | Suíte de integração com schema de teste; guardas ausentes. |
| `test:accounts-deletion-policy` | **NÃO EXECUTADO** | O arquivo observado é puro e sem acesso ao banco, mas não executei nenhuma suíte antes de concluir o pré-voo global exigido pelo prompt. |
| `test:accounts-deletion-schema` e `test:accounts-deletion-api-isolated` | **NÃO EXECUTADOS** | Criam/consomem schema de teste; guardas ausentes. |
| `test:baselines` | **NÃO EXECUTADO** | Requer banco/opt-in. Além disso, cria nomes `seekalive_test_<32 hex>_<track>`, diferentes do padrão exato exigido pelo roteiro, e não usa a mesma variável de schema da fixture; precisa de revisão antes de ser considerado conforme ao protocolo de isolamento. |
| `test:e2e:auth` | **NÃO EXECUTADO** | API mockada, mas exige E2E/browser; o roteiro exige prova de isolamento e não autoriza iniciar/reiniciar workflow. |
| `test:e2e:auth:*:integration` (4 suites) | **NÃO EXECUTADAS** | API filha usa fixture isolada, mas as guardas necessárias não foram disponibilizadas. |
| `seekDiscovery.test.ts` | **NÃO EXECUTADO** | Fora do agregado padrão; o pré-voo global não foi liberado. |
| Demais suites de domínio do pacote `scripts` | **NÃO EXECUTADAS** | Nenhuma suíte foi iniciada antes de satisfazer o protocolo global do prompt. |

Não foram coletados contadores de testes, duração ou primeira falha para suites não executadas; registrá-los seria inventar resultados.

## Verificações executadas sem executar testes

| Comando | Resultado | Duração medida |
|---|---:|---:|
| `pnpm run typecheck` | exit 0; pacotes de scripts, sandbox, backend e frontend concluíram | 17,609 ms |
| `pnpm --filter @workspace/db run check` | exit 0; cinco tracks reportaram `Everything's fine` | 6,009 ms |
| `pnpm audit --prod` | exit 0; nenhuma vulnerabilidade conhecida reportada pelo audit da execução | 827 ms |

O `check` atual cobre cinco tracks e não inclui Seek. Isso não prova que a trilha Seek esteja aplicada ou sem drift.

## Comparação com afirmações documentais anteriores

- `docs/api/backend/README.md:5` registra uma rodada anterior com suíte geral, exclusão, baselines, typecheck, build e geração/verificações concluídas. Nesta rodada, apenas o typecheck e `db check` foram reproduzidos; nenhuma suíte, replay, geração ou build foi executado aqui. A afirmação histórica não é reutilizada como evidência da rodada atual.
- `docs/architecture/database-migration-tracks.md:53-55` registra resultados e limitações de uma execução anterior. A consulta atual dos ledgers e hashes dos SQLs é evidência nova e está registrada em R2-06; o replay atual continua não executado.

## Achados

### R2-01-001 — Suítes não liberadas pelo pré-voo

- **Rodada 1:** novo
- **Veredito:** NÃO EXECUTADO
- **Evidência:** faltam as guardas de ambiente listadas em `scripts/test-support/isolatedDatabaseFixture.mjs:43-70`; por isso nenhuma suíte de teste foi iniciada.
- **Risco:** Informativo — sem resultados atuais de unit/integration/E2E, esta rodada não pode declarar o backend validado por testes.

### R2-01-002 — Baseline de migration usa nomenclatura de schema fora do protocolo

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `infra/database/scripts/test-migration-baselines.mjs:132-206` compõe nomes por trilha; a fixture comum usa `seekalive_test_<32 hex>` em `scripts/test-support/isolatedDatabaseFixture.mjs:30-36`.
- **Risco:** Baixo — a suíte de baseline não prova o contrato de isolamento exigido e não foi executada.

### R2-01-003 — `seekDiscovery.test.ts` fora do comando padrão

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `Aplicativo/front/tests/seekDiscovery.test.ts` existe, mas não há script correspondente no manifest do frontend nem inclusão no agregado padrão `pnpm test`.
- **Risco:** Baixo — regressões de descoberta podem ficar fora da validação padrão.

## Ações fora do escopo desta auditoria

1. Disponibilizar as guardas de teste pelo fluxo seguro e refazer o pré-voo antes de qualquer suíte que possa escrever.
2. Uniformizar o nome/guarda do schema temporário em `test:baselines`.
3. Incluir `seekDiscovery.test.ts` em um comando de teste explícito e na validação padrão.

## Resumo R2-01

- **Achados novos:** 3 (0 críticos, 0 altos, 0 médios, 2 baixos, 1 informativo/não executado).
- **Testes:** 0 executados; todas as suites estão identificadas e marcadas como não executadas.
- **Validações não-testes:** typecheck, `drizzle-kit check` e `pnpm audit --prod` passaram.
- **Schemas temporários:** zero antes; zero depois; sem limpeza manual.

---

## Documento: R2-02-tokens-csrf-sessoes.md

# R2-02 — Tokens, hashing, CSRF, cookies e ciclo de sessão

**Status:** análise estática concluída. Não foram enviados requests mutáveis e nenhuma suíte foi executada; o pré-voo global de testes permanece bloqueado (R2-01-001).

## 1. Geração e armazenamento de segredos de autenticação

| Artefato | Geração/armazenamento observado | Evidência |
|---|---|---|
| Token de sessão | 32 bytes via `crypto.randomBytes`, codificados base64url; banco recebe SHA-256 do token bruto. O valor bruto é enviado no cookie `__Host-seekalive_session`. | `Aplicativo/back/src/modules/auth/application/sessionMaterial.ts:6-18`; `Aplicativo/back/src/security/tokenHashing.ts:4-6`; `sessionCookies.ts:16-25`. |
| Token de dispositivo confiável | 32 bytes aleatórios; banco armazena hash SHA-256; o token bruto fica no cookie `__Host-seekalive_device`. | `emailVerification/confirmEmailVerification.ts:44-47,86-90`; `deviceVerificationRoutes.ts:42-55`; `tokenHashing.ts:4-6`. |
| Códigos OTP | Seis dígitos gerados por `crypto.randomInt(0, 1_000_000)`, com distribuição uniforme; não se observou geração por `Math.random`. O registro persistido é HMAC-SHA-256, separado por finalidade, conta e challenge. | `challenges/deviceLogin.ts:18-30`; `emailVerification/sendVerificationCode.ts:23-27`; `tokenHashing.ts:8-69`. |
| Comparação de hash | `timingSafeEqual` após comparar comprimentos; os hashes de código e token têm comprimento fixo. | `tokenHashing.ts:72-79`. |
| Segredo de assinatura | `SESSION_SECRET` precisa ter pelo menos 32 bytes; o módulo falha ao inicializar se estiver abaixo disso. O mesmo segredo é usado para HMAC dos códigos OTP e do CSRF pré-autenticação. O valor não foi lido. | `sessionConfig.ts:6-10`; `tokenHashing.ts:2-69`; `security/csrf.ts:4-10`. |
| Senha | Argon2id, `memoryCost=65.536 KiB`, `timeCost=3`, `parallelism=1`; hash dummy de placeholder usado como baseline de custo. | `application/passwordHashing.ts:1-15`. A avaliação de latência/concor­rência está em R2-10. |

Não foi encontrado armazenamento de token de sessão ou código OTP em texto puro nas partes inspecionadas. A conclusão é limitada ao código-fonte analisado; não houve inspeção de dados de usuários.

## 2. Matriz de challenge, tentativas e concorrência

| Fluxo | Prazo e máximo de tentativas | Concorrência e consumo | Resultado |
|---|---|---|---|
| Confirmação de e-mail | 10 minutos; 5 tentativas (`emailVerification/policy.ts:1-2`). | `FOR UPDATE` e incremento de tentativa na transação (`emailVerificationRepository.ts:76-120`). | Código inválido não ativa conta; verificação, ativação, dispositivo e sessão são transacionais (`confirmEmailVerification.ts:48-103`). |
| Login em instalação desconhecida | 10 minutos; 3 erros; reenvio após 30 s e, após o segundo erro, 90 s (`challenges/deviceLogin.ts:6-9`). | Titular e challenge são bloqueados com `FOR UPDATE`; contador é atualizado na transação (`deviceVerificationRepository.ts:38-60,80-101,130-181`). | No terceiro erro bloqueia a conta, revoga sessões/dispositivos e challenges de login; resposta 423 com suporte (`confirmDeviceLogin.ts:59-103`; `deviceVerificationRoutes.ts:56-62,82-92`). |
| Reset de senha | 10 minutos; 5 tentativas (`challenges/passwordReset.ts:5-21`; `confirmPasswordReset.ts:11`). | Titular usa `FOR UPDATE`; consumo é um `UPDATE` condicional a challenge não consumido/não expirado/abaixo do limite; tentativas são incrementadas em operação condicional (`passwordResetConfirmationRepository.ts:82-125`). | Senha, revogação de sessões/dispositivos e consumo de challenges relacionados ocorrem na mesma transação (`passwordResetConfirmationRepository.ts:127-180`). |
| Atualização obrigatória de senha | 10 minutos; 5 tentativas (`challenges/passwordUpdate.ts:5-14`). | Challenge bloqueado por `FOR UPDATE`; contador sobe por operação SQL na transação e material de senha é limpo nos estados de erro/consumo (`passwordUpdateConfirmationRepository.ts:52-115`). | Sucesso revoga sessões, dispositivos e challenges relacionados (`passwordUpdateConfirmationRepository.ts:147-189`). |
| Troca autenticada de senha | 10 minutos; 5 tentativas (`accountSecurity/policy.ts:1-5`). | Titular/challenge bloqueados na transação; tentativa é persistida sob lock (`passwordChangeConfirmationRepository.ts:18-78`). | Troca, revogação de sessões/dispositivos e consumo de challenges relacionados são transacionais (`passwordChangeConfirmationRepository.ts:124-169`). |
| Troca de e-mail — endereço atual e novo | 10 minutos; 5 tentativas por challenge; envio limitado por cooldown de 60 s (`accountSecurity/policy.ts:1-5`). | Challenge bloqueado; contagem persistida dentro da transação; esgotamento limpa o e-mail pendente (`emailChangeRepository.ts:119-196`; `confirmCurrentEmailChange.ts:55-104`; `confirmNewEmailChange.ts:46-96`). | O e-mail atual permanece até confirmação do novo; a alteração consome challenges relacionados e incrementa versão da conta. O aviso ao e-mail antigo ocorre após o commit (`confirmNewEmailChange.ts:88-130`). |
| Exclusão/restauração | 10 minutos; 3 tentativas (`requestAccountDeletionCode.ts:8-40`; `confirmAccountDeletion.ts:4`). | Conta/challenge bloqueados e tentativas serializadas na transação (`accountDeletionRepository.ts:97-174`). | Agendamento altera estado e revoga sessões; restauração usa challenge separado (`accountDeletionRepository.ts:177-218`; `confirmAccountRestoration.ts:1-24`). |

### Observação de política

O limite de três tentativas com bloqueio total da conta se aplica ao código de login em dispositivo desconhecido; outros OTPs têm seus próprios limites de challenge (por exemplo, 5 para verificação de e-mail e reset). Não encontrei, na revisão estática, uma regra única que bloqueie a conta após três erros em todos os tipos de challenge; não tratei isso como bug, pois a decisão do titular vinculou o bloqueio ao login novo.

## 3. CSRF e métodos de escrita

`requireCsrf` exige token de sessão ou token pré-autenticação HMAC. O token de sessão é validado contra o hash armazenado na sessão; antes da autenticação, um nonce em cookie `HttpOnly` é combinado com HMAC. Com `Origin` presente, compara esquema/host à origem esperada e recusa `Origin: null`; sem `Origin`, ainda exige token CSRF. Não há fallback de validação por `Referer`. Comparações são em tempo constante (`security/csrf.ts:9-60`).

O inventário AST dos routers de apresentação encontrou **51 rotas de escrita: 51 com `requireCsrf`, 0 sem**. Prefixo geral: `/api`; módulos em `modules/index.ts:13-19`. Abaixo, os caminhos locais são relativos ao prefixo do respectivo módulo.

| Módulo | Métodos e caminhos | CSRF |
|---|---|---|
| Auth (`/api/v1/auth`) | `POST /register`; `/login`; `/verification`; `/verification/confirm`; `/device-verification/confirm`; `/device-verification/resend`; `/password/reset/request`; `/password/reset/confirm`; `/password/update`; `/password/update/confirm`; `/account/password/change/request`; `/account/password/change/confirm`; `/account/email/change/request`; `/account/email/change/confirm-current`; `/account/email/change/confirm-new`; `/account/deletion/code`; `/account/deletion/confirm`; `/account/deletion/restore/code`; `/account/deletion/restore/confirm`; `/logout`; `DELETE /sessions/others`; `/sessions/:sessionId`; `/devices/others`; `/devices/:deviceId` | Sim em todas |
| Onboarding (`/api/v1/onboarding`) | `POST /interests` | Sim |
| Profiles (`/api/v1`) | `PATCH /accounts/me`; `PUT /accounts/me/privacy`; `POST /profiles/:username/reviews`; `DELETE /profiles/:username/reviews/me`; `PUT /profiles/:username/reviews/:reviewId/reply` | Sim em todas |
| Social (`/api/v1/social`) | `PUT /accounts/:accountId/follow`; `DELETE /accounts/:accountId/follow`; `POST /follow-requests/:accountId/accept`; `/follow-requests/:accountId/decline`; `PUT /blocks/:accountId`; `DELETE /blocks/:accountId` | Sim em todas |
| Feed (`/api/v1/social`) | `POST /articles`; `/posts`; `/posts/:postId/comments`; `/posts/:postId/repost`; `DELETE /posts/:postId`; `/posts/:postId/repost`; `/comments/:commentId`; `PUT` e `DELETE /posts/:postId/like`; `PUT` e `DELETE /posts/:postId/bookmark`; `PUT` e `DELETE /comments/:commentId/like` | Sim em todas |
| Media (`/api/v1/social`) | `POST /media`; `DELETE /media/:assetId` | Sim |

`GET /api/v1/auth/csrf` é uma rota de emissão/renovação do token, sem `requireCsrf`; não é um endpoint de mutação de domínio. Porém, para sessão ativa ele grava um novo hash CSRF na sessão em cada leitura (`csrfRoutes.ts:9-16`; `application/sessions/csrfSession.ts:11-16`). Requests concorrentes de token podem invalidar um token recém-retornado por outro request. Nenhum request mutável foi enviado nesta auditoria.

## 4. Cookies, autenticação e revogação

- **Sessão:** `__Host-seekalive_session`; `HttpOnly`, `Secure=true` incondicionalmente, `SameSite=Lax`, `Path=/`, sem `Domain`; `maxAge` é `SESSION_TTL_SECONDS` (padrão 7 dias, máximo 30 dias). Prefixo `__Host-` exige HTTPS (`sessionConfig.ts:1-3,12-16`; `sessionCookies.ts:9-20`).
- **Pré-autenticação:** `__Host-seekalive_pre_auth`; `HttpOnly`, `Secure=true`, `SameSite=Lax`, `Path=/`, sem `Domain`, `maxAge=15 min` (`sessionConfig.ts:2`; `preAuthCookies.ts:4-15`).
- **Dispositivo confiável:** `__Host-seekalive_device`; mesmos atributos e `maxAge=400 dias` (`sessionConfig.ts:3-4`; `sessionCookies.ts:27-31`).
- **CSRF:** não há cookie legível por JS nem cookie chamado CSRF. O token CSRF da sessão é devolvido no corpo de `GET /csrf` e seu hash é salvo na sessão; no pré-auth o token é HMAC de nonce guardado no cookie HttpOnly (`csrfRoutes.ts:9-27`; `csrf.ts:9-16,44-60`).
- A limpeza de sessão/dispositivo usa os atributos de definição (`sessionCookies.ts:16-36`). O cookie pré-auth é apagado diretamente em logout/login/confirmação; os trechos examinados repetem `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e sem `Domain` (`sessionRoutes.ts:184-199`; `emailVerificationRoutes.ts:86-108`; `deviceVerificationRoutes.ts:105-112`).
- Autenticação bem-sucedida cria material aleatório novo e apaga o cookie pré-auth, o que reduz risco de fixação de sessão (`sessionMaterial.ts:6-18`; `emailVerificationRoutes.ts:101-110`; `deviceVerificationRoutes.ts:105-115`; `loginRoutes.ts:156-168`).
- O limite simultâneo de sessões é aplicado serializando criação por conta, bloqueando as sessões ativas e revogando as mais antigas antes de inserir a nova (`sessionCreationRepository.ts:21-78`; regra de ordenação em `sessionPolicy.ts`). A tela/rotas permitem listar, revogar outras e revogar uma sessão individual; a sessão atual sai por logout (`sessionRoutes.ts:44-180`).
- Logout revoga o token da sessão e apaga sessão + pré-auth; mantém o cookie de dispositivo confiável (`sessionRoutes.ts:184-199`). Reset e troca de senha revogam todas as sessões/dispositivos na mesma transação da atualização da credencial (`passwordResetConfirmationRepository.ts:127-171`; `passwordChangeConfirmationRepository.ts:124-169`; `passwordUpdateConfirmationRepository.ts:147-169`).
- Troca de e-mail atualiza o e-mail confirmado, incrementa a versão da conta e consome challenges relacionados, mas não chama operações de revogação de sessão/dispositivo (`confirmNewEmailChange.ts:88-103`). `loadActiveSession` não valida versão da conta; sessões e dispositivos existentes continuam válidos (`security/activeSession.ts:13-53`). Essa política não está especificada no contrato de produto.
- A sessão tem validade absoluta configurável, padrão de 7 dias e teto de 30 dias; `loadActiveSession` valida expiração, mas não estende `expiresAt` ao uso (`sessionConfig.ts:12-16`; `activeSession.ts:39-44`). Isso é expiração absoluta, não um timer de inatividade.

## Achados

### R2-02-001 — Cookie persistente do dispositivo expira antes de revogação manual

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `security/sessionConfig.ts:3-4` define 400 dias e `security/sessionCookies.ts:27-31` aplica esse `maxAge`.
- **Risco:** Baixo — a instalação deixa de ser reconhecida após 400 dias mesmo sem revogação manual, divergindo da regra “até revogar”.

### R2-02-002 — Limites de tentativas variam entre finalidades

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** os limites variam por finalidade: 3 para login em dispositivo (`challenges/deviceLogin.ts:6-9`), 5 para e-mail/reset/update/troca e 3 para exclusão/restauração (tabela deste bloco).
- **Risco:** Informativo — não foi demonstrado bypass; UI e suporte precisam distinguir challenge encerrado de bloqueio da conta.

### R2-02-003 — Sessão tem expiração absoluta, não renovação deslizante

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `security/activeSession.ts:39-44` só valida `expiresAt`; não renova. `sessionConfig.ts:12-16` usa padrão de 7 dias e máximo de 30.
- **Risco:** Baixo — sessão usada continuamente ainda expira; o produto definiu ausência de limite por inatividade, mas não uma validade absoluta máxima.

### R2-02-004 — Emissão CSRF por GET substitui o token salvo na sessão

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/auth/presentation/csrfRoutes.ts:9-16` chama a rotação no `GET /csrf`; `application/sessions/csrfSession.ts:11-16` gera outro token e persiste outro hash.
- **Risco:** Baixo — duas abas ou requests concorrentes podem invalidar um token CSRF recém-retornado e fazer uma escrita legítima falhar.

### R2-02-005 — Troca de e-mail mantém sessões e dispositivos existentes

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `application/emailChange/confirmNewEmailChange.ts:88-103` atualiza e-mail/versão e consome challenges sem revogar sessões; `security/activeSession.ts:13-53` não valida a versão da conta.
- **Risco:** Informativo — uma sessão previamente ativa continua autenticada após a troca; a regra do produto não definiu revogação nessa operação.

## Resumo R2-02

- **Achados novos:** 5 (0 críticos, 0 altos, 0 médios, 3 baixos, 2 informativos).
- **Validação:** estática, com caminhos e linhas citados; sem prova dinâmica por teste nesta rodada.
- **Ponto positivo verificado:** tokens de alta entropia não são armazenados em texto puro, hashes de OTP são HMAC, e as operações críticas examinadas usam transação/lock de challenge.

---

## Documento: R2-03-enumeracao-limites-erros.md

# R2-03 — Enumeração, limites de envio, desafios pendentes e erros de Auth

**Status:** análise estática concluída; sem requests HTTP mutáveis e sem testes dinâmicos.

## Matriz de respostas e estados observados

As respostas abaixo foram derivadas das rotas e serviços versionados; não foram provocadas via HTTP nesta rodada. As rotas Auth passam pelo middleware `Cache-Control: no-store`; respostas da API incluem `X-Request-Id`; respostas `429` incluem `Retry-After`. O middleware global e seus formatos estão detalhados em R2-05.

| Fluxo / estado de entrada | Status e corpo observados no código | Cabeçalhos/enumeração |
|---|---|---|
| `POST /api/v1/auth/register`: payload inválido ou idade fora da regra | `400 VALIDATION_ERROR`; nenhum registro novo por idade inválida (`registrationRoutes.ts:24-26,108-116`). | `X-Request-Id`; Auth `no-store`. |
| Cadastro: @ já usado ou reservado | `409 USERNAME_UNAVAILABLE` (`registrationRoutes.ts:49-63,119-125,149-161`). | O @ é público; resposta diferencia sua disponibilidade, conforme requisito de unicidade social. |
| Cadastro: e-mail já existente, ativo ou pendente | `202 verification_required` com mensagem genérica; para e-mail pendente pode reenviar código; para ativo não retorna conflito (`registrationRoutes.ts:65-93,163-171`). | Mesmo código/corpo; há diferença de tempo porque o caso pendente aguarda o envio do e-mail e o ativo não (`registrationRoutes.ts:67-91`). |
| Cadastro: novo e-mail/@ e entrega não configurada | `503 EMAIL_DELIVERY_UNAVAILABLE`; declara que nenhuma conta foi criada (`registrationRoutes.ts:39-47`). | `X-Request-Id`; Auth `no-store`. |
| Cadastro: conta criada, envio falha | `503 EMAIL_DELIVERY_UNAVAILABLE`; a conta permanece `pending_verification` (`registrationRoutes.ts:95-147`). | Mesmo status do caso de provedor indisponível, mas estado no banco já foi criado. |
| Login: identificador inexistente ou senha incorreta | `401 INVALID_CREDENTIALS`, mesma chave/mensagem (`authenticateLogin.ts:69-75`; `loginRoutes.ts:40-47`). | Hash Argon2 dummy executado para conta inexistente; reduz diferença de custo, não prova igualdade de tempo. |
| Login: e-mail pendente/não verificado com senha correta | `403 EMAIL_NOT_VERIFIED`; nenhuma sessão criada (`authenticateLogin.ts:76-80`; `loginRoutes.ts:49-56`). | Estado é revelado somente após fornecer a senha válida. |
| Login: conta bloqueada, indisponível ou em exclusão | Bloqueada: `423 SECURITY_LOCKED` com suporte; status indisponível: `403 ACCOUNT_UNAVAILABLE`; em exclusão: `202 account_deletion_pending` com prazo e e-mail mascarado (`authenticateLogin.ts:82-88,112-121`; `loginRoutes.ts:58-81`). | O estado de exclusão é revelado após validar senha; Auth `no-store`. |
| Login: instalação desconhecida com credenciais válidas | `202 device_verification_required`, challenge, e-mail mascarado, expiração e próximo reenvio; falha de entrega/configuração `503 EMAIL_DELIVERY_UNAVAILABLE` (`loginRoutes.ts:110-152`). | Não expõe e-mail completo. |
| `POST /password/reset/request`: conta inexistente, inativa, não verificada ou bloqueada | `202 reset_requested` genérico; não cria challenge para estados inelegíveis (`requestPasswordReset.ts:13-23`; `passwordResetRoutes.ts:40-50`). | Atraso mínimo 200 ms; não existe prova de tempo constante entre todos os estados. |
| `GET /api/v1/accounts/availability`: username válido/inválido | Válido: `200 {available, normalizedUsername}`; inválido: `400 VALIDATION_ERROR`; limite: `429 RATE_LIMITED` (`accountAvailabilityRoutes.ts:11-29`). | Limite 30/min por chave de IP; revela apenas disponibilidade do @, não verifica e-mail. |
| Reenvio de confirmação de e-mail | `202 verification_required` e texto genérico se não há conta pendente ou se solicitação foi aceita; falha de entrega/configuração `503 EMAIL_DELIVERY_UNAVAILABLE` (`emailVerificationRoutes.ts:18-57`). | 3 solicitações/15 min por IP. |
| Restauração no prazo de exclusão | Requer identificador + senha válidos; após confirmação envia código e retorna `202 verification_code_sent`, e-mail mascarado e expiração. Senha inválida/conta que não está em exclusão: `401 INVALID_CREDENTIALS`; prazo encerrado: `409 ACCOUNT_UNAVAILABLE`; entrega: `503 EMAIL_DELIVERY_UNAVAILABLE` (`accountDeletionRoutes.ts:175-231`). | E-mail completo não é retornado. Confirmação de código inválido/expirado: `400 INVALID_VERIFICATION_CODE`; a senha é validada novamente (`accountDeletionRoutes.ts:235-280`). |

O contrato central de erros tem status HTTP e objeto `{ error: { code, key, message, requestId, ... } }`; validação mapeia somente caminho/campo e mensagem, sem stack trace no helper (`common/apiErrors.ts:7-35`). A forma final de erros inesperados depende do middleware global, analisado em R2-05.

## Limites e fluxo de e-mail

| Operação | Limite por IP na rota |
|---|---:|
| Cadastro | 5 / 15 min |
| Login | 10 / 15 min |
| Reenvio/confirmar e-mail | 3 / 15 min para reenvio; 10 / 15 min para confirmação |
| Reset de senha | 5 / 15 min para solicitação; 10 / 15 min para confirmação |
| Atualização obrigatória de senha | 5 / 15 min para iniciar; 10 / 15 min para confirmar |
| Login por dispositivo | 10 / 15 min para confirmar; 5 / 15 min para reenviar |

Evidência: `createAuthRateLimit` nas rotas citadas acima, além de restauração, exclusão, troca de credencial e disponibilidade. Os cooldowns de dispositivo são 30 s/90 s. Troca de e-mail/senha tem cooldown de 60 s e até 5 envios/hora por conta; reset tem cooldown de 60 s por challenge (`accountSecurity/policy.ts:1-5`; `challenges/passwordReset.ts:5-21`).

- `rateLimit.ts:5-33` guarda contadores em `Map` no processo atual, com chave por nome da operação + IP. Não há política uniforme de cota por destinatário para todos os envios nem armazenamento distribuído. Troca de e-mail/senha, reset e novo dispositivo possuem controles persistidos específicos; estes não substituem quota global contra abuso em todos os fluxos.
- Cadastro exige entrega configurada antes de criar a conta; depois da criação, se o provedor falhar, mantém a conta `pending_verification`, retorna `503` e informa que o código não foi enviado (`registrationRoutes.ts:39-47,95-147`). O usuário pode solicitar novo código pelo fluxo de reenvio.
- Reenvio de verificação persiste o hash do novo challenge e expira os anteriores antes do envio (`sendVerificationCode.ts:23-35`). Se o envio falha, o cliente recebe `503`; o challenge anterior já foi invalidado. A próxima tentativa substitui o challenge.
- Solicitação de reset dispara o envio sem aguardar sua conclusão (`requestPasswordReset.ts:25-44`); se falhar, tenta invalidar challenge e registra evento. A rota já respondeu/continuará a resposta genérica. A resposta não informa que o e-mail falhou, decisão que protege enumeração, mas pode deixar o usuário aguardando um código que não chegou.
- A troca de e-mail envia código ao novo endereço após a transação; em falha, invalida o challenge novo (`confirmCurrentEmailChange.ts:118-135`). O aviso ao e-mail anterior é posterior à mudança e uma falha é registrada sem reverter a operação (`confirmNewEmailChange.ts:116-130`).
- Bloqueio por terceiro erro de código de dispositivo limpa cookies de sessão e dispositivo e responde `423 SECURITY_LOCKED` com suporte, sem retornar valor OTP ou e-mail integral (`deviceVerificationRoutes.ts:56-62,82-92`).
- A nova tentativa substitui o challenge ativo da mesma finalidade; os fluxos mantêm no máximo um challenge vigente por finalidade, mas finalidades diferentes são independentes. O número exato depende do tipo de conta/challenge e não há limite global de challenges ativos por conta. Troca de e-mail usa etapas distintas para endereço atual e novo.
- Conta de cadastro não verificada é criada com estado `pending_verification` (`modules/accounts/infrastructure/accountRegistrationRepository.ts:59`). Não foi encontrado prazo de expiração/limpeza automática desse estado; enquanto a linha existir, username segue indisponível. O titular do mesmo e-mail pendente consegue solicitar reenvio no fluxo de verificação, em vez de criar uma segunda conta.
- `securityLockedAt` é preenchido no terceiro código errado no repositório do desafio de dispositivo (`deviceVerificationRepository.ts:130-151`). A busca por atribuições no backend encontrou esse ponto e não encontrou limpeza `securityLockedAt = null`, rota ou job de desbloqueio. A resposta atual orienta suporte, mas não há fluxo de desbloqueio implementado no backend. Não foi encontrado envio automático de e-mail de aviso no momento do bloqueio.

## Achados

### R2-03-001 — Rate limit depende da memória de um processo

- **Rodada 1:** amplia 03-010
- **Veredito:** CONFIRMADO
- **Evidência:** `security/rateLimit.ts:5-27` mantém contadores em `Map` no processo, sem store compartilhado.
- **Risco:** Baixo — em múltiplas instâncias, reinícios e balanceamento tornam cada quota por IP independente e reiniciam contadores.

### R2-03-002 — Solicitação de reset não comunica falha de entrega ao solicitante

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `requestPasswordReset.ts:25-44` envia sem aguardar e trata erro por log/invalidação; `passwordResetRoutes.ts:40-50` retorna resposta genérica.
- **Risco:** Baixo — indisponibilidade de e-mail pode deixar o usuário aguardando um código que nunca chegará, sem estado de entrega na resposta/UI.

### R2-03-003 — Limite por destinatário não demonstrado

- **Rodada 1:** amplia 03-010
- **Veredito:** PARCIAL
- **Evidência:** `rateLimit.ts:13-20` limita por operação+IP; `accountSecurity/policy.ts:1-5` e os desafios de reset/dispositivo têm controles persistidos específicos, mas não existe quota comum para todos os destinatários/fluxos.
- **Risco:** Baixo — rotação de IP ainda permite abuso de envios em fluxos sem quota de destino; projeto permanece em desenvolvimento.

### R2-03-004 — Bloqueio de conta não tem desbloqueio suportado no backend

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `deviceVerificationRepository.ts:147-151` preenche `securityLockedAt`; busca no backend não localizou limpeza, rota ou job de desbloqueio; as rotas retornam suporte (`loginRoutes.ts:77-81`).
- **Risco:** Médio — depois de três códigos incorretos, o titular não pode recuperar acesso pelo aplicativo e depende de procedimento manual ainda não implementado.

### R2-03-005 — Cadastro não verificado pode reter o @ sem prazo demonstrado

- **Rodada 1:** novo
- **Veredito:** PARCIAL
- **Evidência:** criação define `pending_verification` (`modules/accounts/infrastructure/accountRegistrationRepository.ts:59`) e essa conta é tratada por reenvio (`registrationRoutes.ts:65-91`); não foi encontrado expurgo/expiração desse estado na busca do backend.
- **Risco:** Baixo — cadastro abandonado pode manter username indisponível indefinidamente; a conclusão sobre ausência de um job externo é limitada ao repositório auditado.

### R2-03-006 — Cadastro mantém códigos genéricos, mas o tempo pode distinguir estado do e-mail

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** conta pendente aguarda envio (`registrationRoutes.ts:67-86`), enquanto e-mail de conta ativa retorna a mesma resposta sem envio (`:87-92`); no reset existe apenas piso de 200 ms (`passwordResetRoutes.ts:21-50`).
- **Risco:** Baixo — com limitação por IP, medição repetida ainda pode sugerir se um e-mail tem cadastro pendente; o código/corpo iguais não garantem tempo constante.

## Resumo R2-03

- **Achados novos:** 6 (0 críticos, 0 altos, 1 médio, 5 baixos).
- **Pontos positivos verificados:** login compara hash dummy; reset e reenvio usam respostas genéricas por e-mail; fluxo de novo dispositivo não envia OTP antes da autenticação por senha; lockout informa suporte sem expor o código.
- **Limite da conclusão:** status/corpos foram confirmados no código, não por requests, porque o roteiro proíbe operações HTTP mutáveis nesta rodada.

---

## Documento: R2-04-privacidade-matriz.md

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

---

## Documento: R2-05-http-proxy-inputs.md

# R2-05 — HTTP, proxy, IP de rate limit e entrada externa

**Status:** leitura estática concluída; matriz sintética das funções de IP executada sem rede, servidor HTTP ou banco. Nenhuma alteração no comportamento do aplicativo.

## Fronteira HTTP e proxy

| Ponto | Evidência e resultado |
|---|---|
| Express `trust proxy` | Desativado (`Aplicativo/back/src/app.ts:12`). `request.ip` não aceita automaticamente `X-Forwarded-For`; o servidor confia no peer TCP direto. |
| IP reconhecido como cliente | `getTrustedClientIp` só aceita `x-seekalive-client-ip` quando o peer direto é loopback e o valor é um IP válido (`security/trustedClientIp.ts:7-23`). Header apresentado por peer externo é ignorado. |
| Proxy de desenvolvimento | O proxy `/api` do Vite remove `x-forwarded-for` e qualquer header `x-seekalive-client-ip` recebido; depois acrescenta o header interno a partir do valor calculado (`front/vite.config.ts:67-81`). A API alvo é loopback. |
| Cálculo do header interno | `extractForwardedClientIp` percorre a cadeia de `X-Forwarded-For` da direita para a esquerda e seleciona o primeiro IP válido (`front/src/server/forwarded-client-ip.ts:3-13`). Não há lista/cadastro de proxies confiáveis nem limite de saltos nessa função. |
| Rate limit | A chave usa IP interno validado ou, na ausência dele, `request.ip` (`back/src/security/rateLimit.ts:13-16`). Se o proxy de desenvolvimento não fornecer o header interno, todos os clientes que chegam pelo mesmo peer podem cair no mesmo bucket. A limitação em memória por processo já consta em R2-03-001; aqui registra-se apenas o efeito de topologia. |
| Produção | O proxy examinado está na configuração `server` do Vite, isto é, no fluxo de servidor de desenvolvimento. A configuração `preview` só define porta/host e não cria o encaminhamento `/api` (`vite.config.ts:62-104`). Não há nesta etapa evidência de proxy/reverse proxy de produção; nenhum comportamento de produção foi inferido ou testado. |
| Same-origin/CORS | Clientes web usam caminhos relativos `/api`. O aplicativo não registra middleware CORS. O desenvolvimento funciona pelo proxy do Vite; uma futura hospedagem precisa encaminhar `/api` na mesma origem ou definir explicitamente a política entre origens. |
| CSRF e cabeçalhos encaminhados | A API compara `Origin` com protocolo/host derivados de `X-Forwarded-Proto` e `X-Forwarded-Host` quando presentes (`security/csrf.ts:23-32`), embora Express mantenha `trust proxy=false`. O Vite de desenvolvimento sobrescreve os encaminhados a partir de `Origin`/`Host` (`vite.config.ts:82-91`). A fronteira equivalente na hospedagem futura ainda não está especificada. O token HMAC de CSRF continua obrigatório para mutações. |

### Resultado da matriz sintética de IP

Foi executado `node docs/audit/dossie2/experimentos/trusted-ip-matrix.mjs`, que transpila em memória as funções TypeScript existentes e as exercita com objetos de requisição/endereço sintéticos. Não fez chamada HTTP ou acesso a dados.

**22/22 casos sintéticos passaram:** os nove casos de função isolada e mais treze composições API/proxy:

1. Header interno válido vindo de peer loopback é aceito.
2. Apenas `X-Forwarded-For` chegando diretamente ao resolvedor da API é ignorado.
3. Peer não-loopback não pode escolher o IP por `x-seekalive-client-ip`.
4. Header interno inválido é rejeitado.
5. Ausência do header interno retorna `null`.
6. Endereço encaminhado único é aceito pela função Vite.
7. Em cadeia de endereços, a função atual seleciona o **último** IP válido.
8. Valores inválidos são ignorados.
9. Header ausente retorna `null`.

| Peer TCP da API | Header interno | `X-Forwarded-For` | Bucket esperado/observado |
|---|---|---|---|
| Loopback | Ausente | 1 salto | `127.0.0.1`; XFF direto é ignorado |
| Loopback | Ausente | 2 saltos | `127.0.0.1`; XFF direto é ignorado |
| Loopback | Ausente | 3 saltos | `127.0.0.1`; XFF direto é ignorado |
| Loopback | `203.0.113.77` | 1 salto | `203.0.113.77` |
| Loopback | `203.0.113.77` | 2 saltos | `203.0.113.77` |
| Loopback | `203.0.113.77` | 3 saltos | `203.0.113.77` |
| Externo `192.0.2.20` | Forjado `203.0.113.77` | 1 salto | `192.0.2.20`; header interno externo é ignorado |
| Externo `192.0.2.20` | Forjado `203.0.113.77` | 2 saltos | `192.0.2.20`; header interno externo é ignorado |
| Externo `192.0.2.20` | Forjado `203.0.113.77` | 3 saltos | `192.0.2.20`; header interno externo é ignorado |
| Loopback após proxy Vite | O Vite calcula pelo XFF | 1 salto | `203.0.113.42` |
| Loopback após proxy Vite | O Vite calcula pelo XFF | 2 saltos | `198.51.100.24` (salto mais próximo) |
| Loopback após proxy Vite | O Vite calcula pelo XFF | 3 saltos | `192.0.2.10` (salto mais próximo) |
| Loopback após proxy Vite | XFF forjado de um endereço, se chegar intacto | 1 salto | O endereço forjado `198.51.100.99` é aceito como candidato |

No caso de XFF forjado, o script comprova o que ocorre **se** esse header chegar intacto ao Vite. Não prova que a borda real o aceite: o ambiente/proxy de hospedagem não foi exercitado.

O teste prova as funções com entradas sintéticas; **não** prova quais cabeçalhos o edge/proxy do ambiente real envia, nem a cadeia de proxies usada na implantação.

## Limites de corpo, erros e observabilidade

- JSON padrão tem limite explícito de 32 KiB; escrita de artigo, 256 KiB (`app.ts:41-47`). `express.urlencoded({ extended: true })` não define limite explícito no código e fica sujeito ao padrão do parser.
- Cada requisição recebe UUID em `X-Request-Id`; serialização do log mantém método, caminho sem query e status, sem serializar corpo, cookies ou headers (`app.ts:14-39`).
- Erros seguem `{ error: { code, key, message, requestId, ... } }` (`common/apiErrors.ts:7-22`). Parsing inválido mapeia a 400; corpo excessivo, 413; exceções não reconhecidas retornam mensagem genérica 500 e logam apenas nome/código (`app.ts:56-78`).
- A resposta 404 global é genérica (`app.ts:52-54`), compatível com a política de ocultar recursos bloqueados.
- A aplicação não registra configuração global de Helmet/CSP/HSTS/`X-Content-Type-Options`/`Referrer-Policy` nem desativa explicitamente `X-Powered-By` no `app.ts`. A rota de mídia adiciona `nosniff`; não se conclui que a borda externa não acrescente outros headers. Exigir inventário de headers na fronteira de hospedagem antes de qualquer lançamento.

### Inventário de cabeçalhos e cache observado

| Resposta/superfície | Cabeçalhos definidos pelo código |
|---|---|
| Todas as requisições | `X-Request-Id` (`app.ts:14-39`). |
| Sessão/cookies de autenticação | `Set-Cookie`/`clearCookie` com as opções documentadas em R2-02; não há cookie CSRF separado (`security/sessionCookies.ts:17-35`; `preAuthCookies.ts:12-20`). |
| Rate limit | `Retry-After` (`security/rateLimit.ts:24-30`). |
| Auth e rotas de exclusão | `Cache-Control: no-store` (`modules/auth/presentation/routes.ts:16-20`; `accountDeletionRoutes.ts:21-25`). |
| Token CSRF | `Cache-Control: no-store` (`security/csrf.ts:36-40`). |
| Mídia publicada | `Content-Type`, `Content-Length`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Accept-Ranges`, `Cache-Control: private, no-store` e `Content-Range` quando aplicável (`modules/media/presentation/mediaRoutes.ts:195-211`). |
| JSON de erro e JSON normal | O código usa `response.json`; não define política Cache-Control global. Express define os cabeçalhos de representação/transferência. |
| `X-Powered-By` | Não há `app.disable("x-powered-by")` no app; a configuração de código não o remove. Não foi feita captura HTTP para comprovar a resposta final. |

### Rotas GET com sessão, conta e perfil

Os caminhos abaixo são relativos aos routers indicados; a política `no-store` é explícita somente onde marcada. Não foi feita captura HTTP.

| Router e rota | Conteúdo | `Cache-Control` | Evidência |
|---|---|---|---|
| Auth `GET /csrf` | Token CSRF | `no-store` explícito | `auth/presentation/csrfRoutes.ts:9`; `security/csrf.ts:36-40` |
| Auth `GET /session` | Estado da sessão e conta autenticada | `no-store` herdado do router | `auth/presentation/sessionRoutes.ts:20-23`; `auth/presentation/routes.ts:16-20` |
| Auth `GET /sessions` | Sessões ativas | `no-store` herdado do router | `auth/presentation/sessionRoutes.ts:44-47`; `auth/presentation/routes.ts:16-20` |
| Auth `GET /devices` | Dispositivos confiáveis | `no-store` herdado do router | `auth/presentation/trustedDeviceRoutes.ts:16-20`; `auth/presentation/routes.ts:16-20` |
| Profiles `GET /accounts/me` | Perfil próprio | Nenhum explícito encontrado | `profiles/presentation/ownerProfileRoutes.ts:16-20` |
| Profiles `GET /accounts/me/privacy` | Configuração de privacidade | Nenhum explícito encontrado | `profiles/presentation/privacyRoutes.ts:13-17` |
| Profiles `GET /profiles/:username` | Perfil público | Nenhum explícito encontrado | `profiles/presentation/publicProfileRoutes.ts:16-20` |
| Profiles `GET /accounts/:accountId` | Perfil por UUID | Nenhum explícito encontrado | `profiles/presentation/publicProfileRoutes.ts:48-52` |
| Feed/Social `GET` feed, posts, comentários, busca e relações | Conteúdo e indicadores dependentes do viewer | Nenhum global explícito encontrado | `feed/presentation/globalFeedRoutes.ts:31-35`; sem política global em `app.ts:1-78` |

O feed e perfis incluem campos dependentes do viewer (`isLiked`, `isBookmarked`, relação, conteúdo privado aprovado). A ausência da diretiva é a evidência do achado 001, não prova de armazenamento indevido por um browser/proxy concreto.

## Validação e superfícies de URL

- Username é aparado e normalizado para minúsculas, restringido a 3–20 caracteres ASCII (`a-z`, `0-9`, `-`, `_`) (`shared/contracts/src/username.ts:6-15`). A regra de nomes reservados é aplicada na schema de cadastro/claim (`:17-24`).
- Hashtags são extraídas em formato delimitado, normalizadas sem diacríticos e deduplicadas; o limite é dez (`shared/contracts/src/feed/hashtags.ts:1-41`). Busca SQL usa parâmetros Drizzle; `_` é escapado no prefixo para não atuar como wildcard (`postRepository.ts:152-168`).
- Website é validado como URL HTTP/HTTPS, máximo 2.048 caracteres (`shared/contracts/src/social.ts:23-33`). A tela abre link externo com `target="_blank"` e `rel="noopener noreferrer"`; mapa recebe endereço codificado via `encodeURIComponent` (`CommercialProfileInformation.tsx:120-149,167-175`).
- Não foi localizado redirect controlado por usuário nem `fetch` server-side para URL fornecida por usuário nos módulos examinados; a chamada externa encontrada no backend aponta para endpoint fixo do provedor de e-mail. Isso limita a superfície SSRF observada nesta rodada, sem substituir uma revisão futura de novas integrações.

## Achados novos

### R2-05-001 — Leituras personalizadas não definem política explícita de cache

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** apenas Auth/CSRF/exclusão/mídia definem diretivas Cache-Control (`auth/presentation/routes.ts:16-20`; `security/csrf.ts:36-40`; `media/presentation/mediaRoutes.ts:203-209`); GET de feed responde sem header explícito (`feed/presentation/globalFeedRoutes.ts:84-92`).
- **Risco:** Baixo — respostas personalizadas não declaram a política pretendida; armazenamento/reuso indevido não foi demonstrado e permanece como condição futura a validar.

### R2-05-002 — A atribuição de IP depende da cadeia encaminhada e da borda ainda não especificada

- **Rodada 1:** amplia 11-005
- **Veredito:** PARCIAL
- **Evidência:** `front/src/server/forwarded-client-ip.ts:3-13` escolhe o último IP válido; `back/src/security/trustedClientIp.ts:7-23` aceita header interno só de loopback. A matriz sintética mostra que XFF forjado em um salto seria aceito se chegasse intacto ao Vite; a borda real não foi testada.
- **Risco:** Médio — XFF sem reescrita confiável pode permitir atribuição controlada pelo cliente; múltiplos saltos podem atribuir o IP de um proxy e compartilhar buckets.

### R2-05-003 — Headers globais de endurecimento não estão definidos no app

- **Rodada 1:** novo
- **Veredito:** PARCIAL
- **Evidência:** `back/src/app.ts:1-78` não instala política global de segurança de headers nem desativa `X-Powered-By`; `nosniff` é definido em `modules/media/presentation/mediaRoutes.ts:203-206`. A resposta final de uma hospedagem externa não foi capturada.
- **Risco:** Baixo — se não houver uma borda que aplique as políticas, faltará uma linha de base global; não se conclui que uma futura borda não o fará.

## Ações derivadas (não executadas nesta auditoria)

1. Definir política explícita de cache para respostas personalizadas e validá-la com captura HTTP antes da implantação.
2. Definir e testar a cadeia de proxies confiáveis e a limpeza de `X-Forwarded-For` na hospedagem escolhida.
3. Decidir se os headers globais pertencem ao app ou à borda e comprovar a resposta final nesse ambiente.

## R2-05 — Fechamento

- **Achados novos:** 3 (1 médio, 2 baixos; 2 exigem validação na hospedagem/deployment escolhido).
- **Matriz sintética:** 22/22 aprovada (9 testes unitários de função + 13 decisões compostas).
- **HTTP real:** não executado nesta seção; apenas tráfego não mutável seria permitido pelo roteiro, mas não era necessário para validar as funções puras.
- **Produção:** não testada nem presumida.

---

## Documento: R2-06-papel-banco-migrations.md

# R2-06 — Papel efetivo do banco e estado dos ledgers

**Status:** consulta de catálogo somente-leitura concluída pelo pool exportado do mesmo módulo de conexão usado pelo backend. Nenhuma linha de dados de aplicação foi lida; nenhuma migration, DDL ou escrita foi executada.

## Alvo e método

- `infra/database/src/index.ts` instancia o pool de runtime com `resolveDatabaseConnectionUrl(process.env, "runtime")`.
- Na execução observada, `SEEKALIVE_DATABASE_TARGET` não estava definido; o resolvedor aplica o padrão `replit` e usa `DATABASE_URL`. O alvo não era `external`; `REPLIT_DEPLOYMENT` estava ausente e a execução foi explicitamente marcada como desenvolvimento.
- A consulta foi executada pelo `pool` desse módulo, não por uma conexão alternativa montada para a auditoria.
- `experimentos/database-role-probe.mjs` transpila o módulo em memória e executa somente consultas a `pg_roles`, `pg_namespace` e `pg_tables`. A saída contém apenas flags e contagens agregadas; não imprime nome do banco, usuário, schema, tabela, URL ou credenciais.
- Escopo de leitura da consulta: flags do role atual; ownership/`CREATE` de schemas não sistêmicos; contagem e privilégios agregados de tabelas não sistêmicas. Nenhum `SELECT` em tabelas de domínio.

## Resultado do papel de runtime

| Capacidade | Resultado observado |
|---|---:|
| É superusuário | Sim |
| Pode criar banco | Sim |
| Pode criar roles | Sim |
| Pode ignorar Row-Level Security | Sim |
| Pode conectar | Sim |
| Schemas não sistêmicos observados | 14 |
| Possui ao menos um schema não sistêmico | Sim |
| Pode criar em ao menos um schema não sistêmico | Sim |
| Pode remover ao menos um schema (ownership/superuser) | Sim |
| Tabelas não sistêmicas observadas | 28 |
| Tabelas não sistêmicas cujo owner é o role atual | 28 |
| Privilégio agregado em todas essas tabelas | `SELECT`, `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` |
| Pode executar `TRUNCATE` em ao menos uma tabela | Sim |
| Outra role de login sem privilégios administrativos | 0 |

### R2-06-001 — Credencial de runtime tem privilégios administrativos totais

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `node docs/audit/dossie2/experimentos/database-role-probe.mjs` no pool runtime de desenvolvimento retornou `superuser=true`, `createdb=true`, `createrole=true`, `bypassrls=true`, ownership de 28 tabelas não sistêmicas e ausência de outra role de login não administrativa (detalhes agregados neste relatório, linhas 17-30).
- **Risco:** Alto — se o processo de API for comprometido no ambiente observado, sua credencial permite administrar estruturas e contornar RLS; isso descreve somente o banco de desenvolvimento atual.

## Estado dos ledgers de migration

Foram lidas exclusivamente as colunas `id`, `hash` e `created_at` das tabelas de ledger indicadas pelo roteiro. Os hashes retornados foram comparados localmente com os arquivos SQL; os valores brutos não são reproduzidos neste relatório.

| Trilha | Registros no ledger | Comparação com os arquivos SQL locais |
|---|---:|---|
| Accounts | 2 | Os dois registros correspondem aos dois SQLs locais aplicados. |
| Security | 1 | Corresponde ao baseline local. |
| Profiles | 3 | Os três primeiros SQLs locais correspondem. Há um quarto SQL local sem registro correspondente no ledger; ele não foi aplicado. |
| Feed | 4 | Os quatro SQLs locais correspondem. |
| Media | 1 | Corresponde ao baseline local. |
| Seek | 1 | Corresponde ao baseline local; não há fonte de backend Seek a validar funcionalmente nesta etapa. |

O ledger legado `drizzle.__drizzle_migrations` não existe. Os sete SQLs/snapshots da trilha combinada antiga permanecem em `infra/database/migrations/` na raiz, mas o config atual gera/migra somente `accounts`, `security`, `profiles`, `feed` e `media`; o diretório histórico não aparece como destino ativo.

## Comparação de snapshots com o catálogo de desenvolvimento

O probe comparou os snapshots mais recentes por domínio, tabelas/colunas presentes, tipo, comprimento varchar, nulabilidade, default e existência por nome de índices, FKs, checks e constraints únicas. Não leu linhas de aplicação nem executou DDL.

| Comparação | Resultado |
|---|---|
| Tabelas esperadas nos seis snapshots de domínio | 24 |
| Tabelas de aplicação no catálogo (excluindo `drizzle` e schemas do sistema) | 22 |
| Tabelas inesperadas | 0 |
| Tabelas ausentes | `profiles.business_profile_reviews`, `seek.business_profiles` |
| Colunas divergentes em tabelas existentes | Oito colunas de apresentação removidas de `accounts.accounts`; explicação abaixo |
| Tipo/comprimento/null/default das demais colunas existentes | Correspondem aos snapshots |
| Índices/FKs/checks ausentes em tabelas existentes | Nenhum; os nomes ausentes pertencem às duas tabelas ausentes |
| Hashes locais das migrations aplicadas | Correspondem em ordem aos registros aplicados em cada trilha |

**Accounts/Profiles:** `profiles/0002_charming_alice.sql` copia os campos de apresentação de `accounts.accounts` para `profiles.account_profiles` e depois remove oito campos de Accounts. A tabela real de Accounts corresponde ao schema-fonte atual (`infra/database/src/schema/accounts/schema.ts`), mas `accounts/meta/0001_snapshot.json` e o SQL de baseline ainda descrevem os oito campos antigos. Não há migration posterior na trilha Accounts que registre essa mudança; a alteração foi feita pela migration de Profiles. Assim, `drizzle-kit check` passa a cadeia de snapshots sem identificar essa divergência entre o snapshot Accounts e o estado após executar todas as trilhas.

**Profiles:** há quatro SQLs locais e três registros aplicados com hash correspondente. `profiles/0003_misty_rhodey.sql` está pendente; por isso a tabela de avaliações comerciais, seus três índices, duas FKs e quatro checks não existem no banco de desenvolvimento.

**Seek:** há uma migration e um ledger `seek_migrations` com hash correspondente, mas `seek.business_profiles` está ausente no catálogo. Ao mesmo tempo, `migrationTrackConfig.ts:4-30` não inclui Seek entre as trilhas aceitas e `infra/database/Aplicativo/db check` não verifica Seek. O ledger marca a migration como aplicada enquanto o objeto criado por ela falta; não foi possível determinar somente com esta leitura se a tabela foi removida manualmente, restaurada de estado incompleto ou se o ledger foi criado fora do fluxo atual.

**Limite de comparação:** a verificação compara existência/nome dos índices e constraints e estrutura de colunas, não igualdade semântica integral das expressões SQL de cada índice/check/FK. Não foi usada ferramenta de diff que execute DDL; essa igualdade semântica fica não verificada.

### R2-06-002 — Snapshot de Accounts não registra a remoção executada pela trilha Profiles

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** a migration `profiles/0002_charming_alice.sql:17-52` copia e remove campos de `accounts.accounts`; o schema atual Accounts omite esses campos, mas `accounts/meta/0001_snapshot.json` ainda os lista. A trilha Accounts tem apenas duas migrations, sem registro próprio da mudança.
- **Risco:** Médio — reexecução/geração futura da trilha Accounts pode propor alteração já aplicada por Profiles e faz `drizzle-kit check` passar sem refletir o estado combinado do banco.

### R2-06-003 — Tabela de avaliações comerciais está prevista, mas migration local não foi aplicada

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** 3 hashes aplicados em Profiles correspondem aos 3 primeiros SQLs; o quarto arquivo local `profiles/0003_misty_rhodey.sql` não tem entrada no ledger e a tabela/índices/FKs/checks não constam no catálogo.
- **Risco:** Médio — chamadas de API que dependam da persistência de avaliações não podem funcionar corretamente contra o banco de desenvolvimento atual.

### R2-06-004 — Ledger Seek afirma aplicação, mas a tabela esperada não existe

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `seek_migrations` possui um registro cujo hash corresponde a `seek/0000_baseline.sql`; o catálogo não contém `seek.business_profiles`. A trilha Seek também não consta em `migrationTrackConfig.ts`.
- **Risco:** Médio — a trilha ainda não está ativa no `check` e o ledger diverge do catálogo; qualquer integração Seek futura que dependa da tabela pode falhar ao iniciar.

### R2-06-005 — Igualdade semântica integral das constraints não foi verificada

- **Rodada 1:** novo
- **Veredito:** NÃO VERIFICADO
- **Evidência:** o método registrado neste relatório (`R2-06-papel-banco-migrations.md:55-57,76`) comparou presença/nome de índices, FKs, checks e constraints únicas, não igualdade de expressão SQL, predicados, ações `ON DELETE` ou demais opções semânticas.
- **Risco:** Informativo — nenhuma divergência semântica foi confirmada, mas a validação feita não permite declarar equivalência integral do catálogo com todos os snapshots.

## Ações fora do escopo desta auditoria

1. Separar uma credencial de runtime de desenvolvimento com privilégios mínimos da identidade de migrations.
2. Alinhar ownership e snapshots Accounts/Profiles sem repetir remoções destrutivas.
3. Aplicar/reconciliar a migration Profiles pendente por fluxo próprio autorizado; isso não foi feito nesta rodada.
4. Recuperar a consistência de Seek e adicionar a trilha ao `check` somente na etapa de domínio aprovada.
5. Comparar definições semânticas de índices/constraints/FKs em uma validação read-only dedicada antes de declarar equivalência.

`drizzle-kit check` passou para cinco trilhas; a configuração/comando de check não inclui Seek. Esse limite e a ausência de suíte funcional Seek já estão apontados em R2-01 e R1-14-006; não se reapresentam como achados independentes aqui.

## Proteções e limites

- Nenhuma migration foi aplicada; o SQL de Profiles sem ledger permanece pendente.
- Nenhum teste que crie schema foi executado.
- O script aborta se `REPLIT_DEPLOYMENT` estiver presente, se `NODE_ENV` não for `development` ou se o alvo de runtime estiver explicitamente configurado como `external`.
- O script não imprime URL, nome de role/banco/schema/tabela, nem lê dados de contas.
- A alta capacidade do role é uma propriedade observada da credencial de desenvolvimento atual, não autorização para operar catálogo. Nenhuma alteração foi feita.

## R2-06 — Fechamento

- **Achados novos:** 5 (1 alto, 3 médios, 1 informativo/não verificado).
- **Ledgers comparados:** seis trilhas, somente metadados de ledger e hashes locais.
- **Migrations/DDL/escritas:** nenhuma.
- **Dados de usuário:** nenhum lido.

---

## Documento: R2-07-sql-paginacao-planos.md

# R2-07 — SQL gerado, paginação e planos de execução

**Status:** SQL capturado dos métodos Drizzle reais com driver PostgreSQL falso; `EXPLAIN (FORMAT JSON)` executado no banco de desenvolvimento pelo pool runtime, sem `ANALYZE`. Nenhuma consulta de aplicação foi enviada ao banco durante a captura; nenhum dado de aplicação foi lido.

## Método de captura

O script `experimentos/capture-social-query-sql.mjs` importa os repositórios reais, intercepta `pg.Pool.query` antes de executar as funções e devolve conjunto vazio. Isso captura o SQL produzido pelo Drizzle sem executar os SELECTs funcionais. Para cada SQL capturado, envia ao banco de desenvolvimento apenas `EXPLAIN (FORMAT JSON) <SELECT>` com parâmetros sintéticos e sem `ANALYZE`. Os valores de bind não são reproduzidos.

## SQL exato capturado

### Feed — Para você

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."created_at" < $1 or ("feed"."posts"."created_at" = $2 and "feed"."posts"."id" < $3)) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $4
```

### Feed — Seguindo

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."author_id" in ($1) and ("feed"."posts"."created_at" < $2 or ("feed"."posts"."created_at" = $3 and "feed"."posts"."id" < $4))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $5
```

### Feed — Artigos

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."format" = $1 and ("feed"."posts"."created_at" < $2 or ("feed"."posts"."created_at" = $3 and "feed"."posts"."id" < $4))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $5
```

### Feed — Vídeos

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."format" = $1 and "feed"."posts"."media" @> '[{"type":"video"}]'::jsonb and ("feed"."posts"."created_at" < $2 or ("feed"."posts"."created_at" = $3 and "feed"."posts"."id" < $4))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $5
```

### Feed — Busca textual e prefixo de hashtag

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ((position(lower($1) in lower("feed"."posts"."content")) > 0 or position(lower($2) in lower(coalesce("feed"."posts"."article_title", ''))) > 0 or position(lower($3) in lower(coalesce("feed"."posts"."article_body", ''))) > 0 or exists (
                    select 1
                    from "feed"."post_tags"
                    where "feed"."post_tags"."post_id" = "feed"."posts"."id"
                      and "feed"."post_tags"."normalized_tag" like $4 escape E'\\'
                  )) and ("feed"."posts"."created_at" < $5 or ("feed"."posts"."created_at" = $6 and "feed"."posts"."id" < $7))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $8
```

### Perfil — posts do autor

```sql
select "id", "author_id", "content", "audience", "format", "media", "article_title", "article_body", "created_at", "updated_at", "version" from "feed"."posts" where ("feed"."posts"."author_id" = $1 and "feed"."posts"."format" = $2 and ("feed"."posts"."created_at" < $3 or ("feed"."posts"."created_at" = $4 and "feed"."posts"."id" < $5))) order by "feed"."posts"."created_at" desc, "feed"."posts"."id" desc limit $6
```

### Comentários de um post

```sql
select "id", "post_id", "author_id", "client_mutation_id", "reply_to_comment_id", "content", "created_at" from "feed"."post_comments" where ("feed"."post_comments"."post_id" = $1 and ("feed"."post_comments"."created_at" > $2 or ("feed"."post_comments"."created_at" = $3 and "feed"."post_comments"."id" > $4))) order by "feed"."post_comments"."created_at" asc, "feed"."post_comments"."id" asc limit $5
```

### Perfil — dados de apresentação

```sql
select "account_id", "first_name", "last_name", "display_name", "bio", "location_label", "website_url", "is_private" from "profiles"."account_profiles" where "profiles"."account_profiles"."account_id" = $1 limit $2
```

### Busca social de contas verificadas — página 1

```sql
select "accounts"."accounts"."id" from "accounts"."accounts" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" inner join "profiles"."account_profiles" on "profiles"."account_profiles"."account_id" = "accounts"."accounts"."id" where ("accounts"."accounts"."status" = $1 and "accounts"."account_emails"."verified_at" is not null and ("accounts"."accounts"."username" ilike $2 or "profiles"."account_profiles"."display_name" ilike $3)) order by "accounts"."accounts"."username" asc, "accounts"."accounts"."id" asc limit $4
```

### Busca social — página seguinte

```sql
select "accounts"."accounts"."id" from "accounts"."accounts" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" inner join "profiles"."account_profiles" on "profiles"."account_profiles"."account_id" = "accounts"."accounts"."id" where ("accounts"."accounts"."status" = $1 and "accounts"."account_emails"."verified_at" is not null and ("accounts"."accounts"."username" ilike $2 or "profiles"."account_profiles"."display_name" ilike $3)) order by "accounts"."accounts"."username" asc, "accounts"."accounts"."id" asc limit $4 offset $5
```

### Seguidores — página seguinte

```sql
select "profiles"."account_follows"."follower_id" from "profiles"."account_follows" inner join "accounts"."accounts" on "accounts"."accounts"."id" = "profiles"."account_follows"."follower_id" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" where ("profiles"."account_follows"."followed_id" = $1 and "accounts"."accounts"."status" = $2 and "accounts"."account_emails"."verified_at" is not null) order by "profiles"."account_follows"."created_at" desc limit $3 offset $4
```

### Seguindo — página seguinte

```sql
select "profiles"."account_follows"."followed_id" from "profiles"."account_follows" inner join "accounts"."accounts" on "accounts"."accounts"."id" = "profiles"."account_follows"."followed_id" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" where ("profiles"."account_follows"."follower_id" = $1 and "accounts"."accounts"."status" = $2 and "accounts"."account_emails"."verified_at" is not null) order by "profiles"."account_follows"."created_at" desc limit $3 offset $4
```

### Círculo — página seguinte

```sql
select "profiles"."account_follows"."followed_id" from "profiles"."account_follows" inner join "accounts"."accounts" on "accounts"."accounts"."id" = "profiles"."account_follows"."followed_id" inner join "accounts"."account_emails" on "accounts"."account_emails"."account_id" = "accounts"."accounts"."id" where ("profiles"."account_follows"."follower_id" = $1 and "accounts"."accounts"."status" = $2 and "accounts"."account_emails"."verified_at" is not null and exists (
        select 1 from "profiles"."account_follows" reciprocal
        where reciprocal.follower_id = "profiles"."account_follows"."followed_id"
          and reciprocal.followed_id = "profiles"."account_follows"."follower_id"
      )) order by "profiles"."account_follows"."created_at" desc limit $3 offset $4
```

## EXPLAIN sem ANALYZE

| Consulta | Plano observado no banco de desenvolvimento | Interpretação limitada |
|---|---|---|
| Feed Para você | `Seq Scan` em `feed.posts` + `Sort` + `Limit` | Não há índice escolhido para a ordenação global nesta estimativa. O planner estimou tabela pequena; não é benchmark de escala. |
| Feed Seguindo | `Index Scan` em `feed_posts_author_created_id` | Índice atende ao recorte por autor/cursor. |
| Feed Artigos | `Seq Scan` + `Sort` | Sem índice específico escolhido para formato global nesta estimativa. |
| Feed Vídeos | `Seq Scan` + `Sort` | O filtro JSONB de vídeo não usou índice no plano observado. |
| Feed com hashtag | bitmap em posts e `feed_post_tags_normalized_prefix_idx` | O prefixo de hashtag usou índice; o texto em caption/título/corpo usa `position(lower(...))`, sem índice textual observado. |
| Posts do perfil | `Index Scan` em `feed_posts_author_created_id` | Índice atende autor e ordenação/cursor. |
| Comentários | `Index Scan` em `feed_post_comments_post_created_id` | Índice atende post e cursor de comentários. |
| Busca social de contas | `Seq Scan` em `accounts`; nested loops e PKs para as outras tabelas | Busca `ILIKE '%termo%'` não selecionou índice de texto/trigrama. |
| Seguidores/seguindo/Círculo | `Seq Scan` em `accounts`, nested loops e índices de chave nas relações | Estimativa pequena; não comprova capacidade em volume. |
| Apresentação de perfil | `Index Scan` em `account_profiles_pkey` | Busca por account ID usa PK. |

Os planos foram produzidos sem `ANALYZE`; não executam a consulta nem medem latência real. As estimativas refletem estatísticas e volume do banco de desenvolvimento observado e não servem como projeção de produção.

## Paginação e filtragem observadas

- Feed global e lista de posts no perfil usam cursor keyset em `(created_at, id)`, ordenação estável e consulta em lotes. A aplicação filtra visibilidade após carregar cada lote; o feed global pode examinar até 1.000 posts por solicitação e a lista do perfil até 500 (`listGlobalFeed.ts:16-17,63-80,86-127`; `listProfilePosts.ts:12-13,36-50,57-87`). A filtragem pós-query é necessária para os predicados atuais e pode produzir página curta quando muitos posts são invisíveis.
- Comentários usam keyset ascendente em `(created_at, id)` e só chegam ao repositório depois de `readPost` autorizar o post (`listPostComments.ts:25-32`; `postCommentRepository.ts:94-116`).
- Seguidores, seguindo e Círculo usam cursor codificado que representa `offset`, `LIMIT + 1`, e `OFFSET`; a ordenação SQL usa apenas `created_at DESC`, sem desempate por ID (`routeSupport.ts:33-63`; `socialAccountListRepository.ts:32-61,79-97`).
- As listas convertem IDs para account views depois de paginar IDs. `accountViewsByIds` remove relações bloqueadas e omite identidades sem resumo (`profileViews.ts:80-120`; `getAccountSocialSummariesByIds.ts:44-48`). Os endpoints de seguidores/seguindo calculam `nextCursor` com a quantidade **já filtrada** (`followerListRoutes.ts:48-49`; `followingListRoutes.ts:48-49`; `routeSupport.ts:52-63`).
- Consequência verificável da composição: se uma das `limit + 1` linhas selecionadas for removida no mapeamento posterior por bloqueio ou mudança concorrente de identidade, a resposta pode ficar com `limit` ou menos itens; o `pageResult` pode então retornar `nextCursor: null`, embora existam relações além do offset. A consulta também não tem desempate único em `created_at`. Trata-se de risco real de paginação incompleta/instável, não de vazamento de conteúdo.
- A busca social também filtra IDs via account views; seu cursor, contudo, é calculado a partir da página bruta de IDs, não do total final de views (`relationshipListQueries.ts:40-71`).
- O cursor global é Base64URL de JSON, sem assinatura; valida versão, aba, viewer, termo, data e formato do ID (`globalFeedCursor.ts:10-24,27-63`). A data/ID da posição podem ser alterados por quem chama a API; isso permite saltar/duplicar trechos da timeline, mas cada resultado continua passando por `canReadPost` (`listGlobalFeed.ts:93-114`), portanto a alteração não amplia a autorização de leitura.
- O feed “Seguindo” busca todos os IDs de contas seguidas numa consulta sem `LIMIT`/paginação; só depois a busca de posts tem limite de varredura de 1.000 (`socialAccountListRepository.ts:64-76`; `listGlobalFeed.ts:16-17,39-42,63-80`). Um grafo de seguimento muito grande cresce em memória e em parâmetros SQL mesmo que a página final seja pequena.
- `stats.posts` é calculado por `count(*)` de todos os registros do autor, sem predicado de audiência; o resultado alimenta o contador de publicações do perfil remoto (`postRepository.ts:88-99`; `getAccountSocialSummariesByIds.ts:22-24,57-62`; `Profile.tsx:339-343`). Assim, o total pode incluir posts `circles`/`private` que aquele viewer não consegue listar.
- Contagens de likes, comentários e reposts agregam todas as linhas para os posts autorizados, sem excluir autores bloqueados; no endpoint de comentários, views de autores bloqueados são omitidas (`postInteractionSummaryRepository.ts:22-49`; `listPostComments.ts:35-55`; `getAccountSocialSummariesByIds.ts:44-48`). O bloqueio remove follows e pedidos, não estas interações (`blockMutationRepository.ts:19-29`). O efeito é apenas agregado: os IDs/identidades dessas interações não são enviados na contagem do post.

## Achados novos

### R2-07-001 — Paginação de relações pode truncar/instabilizar resultados

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/social/infrastructure/socialAccountListRepository.ts:32-61,79-97` usa `OFFSET` e ordena somente por `created_at`; `modules/social/application/relationshipListQueries.ts:40-71` mapeia e filtra IDs após a consulta.
- **Risco:** Médio — alterações concorrentes, empates de timestamp ou linhas omitidas no mapeamento podem truncar ou reordenar páginas sem revelar conteúdo.

### R2-07-002 — Busca social por substring faz varredura de contas

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/social/infrastructure/socialAccountListRepository.ts:12-29` usa `ILIKE '%termo%'`; `EXPLAIN` sem `ANALYZE` selecionou varredura de `accounts` (`R2-07`, linhas 100-110).
- **Risco:** Médio — o custo cresce com o número de contas; o plano atual não demonstra desempenho em volume.

### R2-07-003 — Feeds globais e filtros de vídeo não têm índice escolhido no plano observado

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** planos `EXPLAIN` de Feed Para você/Artigos/Vídeos mostram `Seq Scan`/`Sort`; o predicado JSONB não escolheu índice (`R2-07`, linhas 100-113).
- **Risco:** Médio — com volume maior, cada página pode exigir varredura/ordenação ampla; o resultado atual é só estimativa de desenvolvimento, sem benchmark.

### R2-07-004 — Feed Seguindo materializa todas as contas seguidas sem paginação

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/social/infrastructure/socialAccountListRepository.ts:64-76` retorna todos os IDs sem limite; `modules/feed/application/listGlobalFeed.ts:39-42,63-80` materializa a lista antes de limitar cada busca de posts.
- **Risco:** Médio — uma conta com rede de seguimento muito grande pode elevar memória, tamanho do filtro SQL e latência para obter uma página pequena.

### R2-07-005 — Contador público de publicações inclui audiências não visíveis ao visitante

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/feed/infrastructure/postRepository.ts:88-99` conta todos os posts do autor, sem filtrar `audience`; `modules/social/application/getAccountSocialSummariesByIds.ts:22-24,57-62` expõe esse total em `stats.posts`, usado no perfil remoto (`Aplicativo/front/src/modules/profile/screens/Profile.tsx:339-343`).
- **Risco:** Baixo — o total revela quantas publicações restritas existem, embora o conteúdo continue protegido por `canReadPost`.

### R2-07-006 — Totais de interação incluem registros de autores bloqueados

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/feed/infrastructure/postInteractionSummaryRepository.ts:22-49` agrega likes, comentários e reposts sem filtro de bloqueio; `modules/social/infrastructure/blockMutationRepository.ts:19-29` remove follows/pedidos, não estas interações. `listPostComments.ts:35-55` omite autores bloqueados da lista, mas o total continua incluindo suas linhas.
- **Risco:** Baixo — uma pessoa pode ver totais que não correspondem às interações individualmente visíveis, mas os IDs dos autores bloqueados não são retornados pelo agregado.

### R2-07-007 — Posição do cursor global não tem assinatura

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/feed/application/globalFeedCursor.ts:10-24,27-59` codifica JSON em Base64URL e valida o escopo, mas não assina `createdAt`/`id`; `listGlobalFeed.ts:93-114` reaplica autorização em cada resultado.
- **Risco:** Baixo — o cliente pode saltar ou repetir trechos da timeline; a evidência não indica bypass de privacidade porque cada post é novamente filtrado.

## Ações derivadas (não executadas nesta auditoria)

1. Corrigir paginação de relações com chave de desempate e continuar a leitura até haver `limit + 1` itens visíveis.
2. Definir e medir índice/consulta de busca social e timeline com volume representativo.
3. Paginar ou limitar a lista de seguidos usada pelo feed; não tratar esse limite como limite de autorização.
4. Definir se o contador público de posts deve contar somente posts visíveis ao viewer.
5. Definir se agregados de interação devem ignorar contas bloqueadas, mantendo o mesmo contrato na lista de comentários.
6. Assinar o cursor ou documentar explicitamente que ele é só posição não confiável, mantendo sempre a autorização por post.

## R2-07 — Fechamento

- **Consultas capturadas:** 15 variantes/posições de página.
- **Planos EXPLAIN:** 15, sem `ANALYZE`.
- **Dados de aplicação:** nenhum lido.
- **Achados novos:** 7 (0 críticos, 0 altos, 4 médios, 3 baixos).
- **Integridade da captura:** SQL produzido pelos métodos Drizzle reais; chamadas dos métodos interceptadas por `pg.Pool` falso; somente os comandos `EXPLAIN` foram enviados ao pool de desenvolvimento.

---

## Documento: R2-08-workers-transacoes-saude.md

# R2-08 — Workers, transações, entregas e saúde do serviço

**Status:** análise estática concluída. Nenhum job foi disparado manualmente; nenhuma transação de domínio ou escrita foi executada nesta seção.

## Jobs e retries

| Rotina | Disparo e proteção | Falha/retry observado |
|---|---|---|
| Finalização de exclusão de conta | Worker em processo, iniciado após o servidor escutar; primeira rodada imediata, depois a cada 60 s; não sobrepõe duas execuções na mesma instância (`auth/infrastructure/accountDeletionWorker.ts:5-41`). |
| Concorrência entre instâncias | Cada ação de exclusão/expurgo seleciona um registro com `FOR UPDATE SKIP LOCKED`, dentro de transação (`accountDeletionRetentionRepository.ts:9-26`; `accountDeletionPurgeRepository.ts:8-20`). |
| Lote | Processa sequencialmente até 50 ações por execução (`accountDeletionFinalizerRepository.ts:4-24`). |
| Erro do job | A execução é capturada no worker e registrada; não há backoff/retry agendado específico. O próximo tick ocorre 60 s depois (`accountDeletionWorker.ts:21-35,38-40`). Uma falha antes de completar o lote encerra a execução inteira. |
| Mídia temporária expirada | A lista de até 100 assets expirados é consultada durante uma nova operação de upload; a limpeza não tem worker próprio (`media/application/uploadMedia.ts:31-44`; `media/infrastructure/mediaAssetRepository.ts:133-155`). |
| E-mail Auth | Chamada direta ao endpoint fixo do provedor, timeout de 10 s, sem fila durável/retry/outbox (`auth/infrastructure/emailDelivery.ts:52-85`). Resend fica habilitado apenas em desenvolvimento quando explicitamente habilitado. A falha de recuperação de senha já está registrada em R2-03-002; aqui não se duplica esse achado. |

### R2-08-001 — Worker de exclusão pode permanecer desativado após falha inicial

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/auth/infrastructure/accountDeletionWorker.ts:7-14` retorna no-op se o schema não estiver pronto; falha de startup é apenas registrada (`index.ts:41-55`); `/readyz` verifica só `SELECT 1` (`health/infrastructure/databaseReadiness.ts:3-6`).
- **Risco:** Alto — exclusões vencidas podem parar sem sinal no readiness e não retomam quando a dependência fica disponível, até reiniciar o processo.

### R2-08-002 — Provider de mídia não configurado impede o expurgo fora de desenvolvimento

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/media/composition/accountMediaPurge.ts:9-24` lança se existirem assets fora de `NODE_ENV=development` sem provider; o purger é chamado no expurgo de conta (`modules/auth/infrastructure/accountDeletionPurgeRepository.ts:8-38`).
- **Risco:** Médio — fora do modo de desenvolvimento, a exclusão pode falhar quando há mídia associada; esse caminho futuro não foi exercitado.

### R2-08-003 — Um expurgo que falha bloqueia os demais registros vencidos

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `accountDeletionFinalizerRepository.ts:10-21` propaga falha do primeiro retido vencido; `accountDeletionWorker.ts:21-35` captura fora do loop e só tenta de novo no próximo tick.
- **Risco:** Médio — o mesmo registro pode falhar repetidamente e impedir expurgos seguintes e novos avanços para retenção.

### R2-08-004 — Assets temporários podem permanecer após expirar sem novos uploads

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `media/application/uploadMedia.ts:31-44` chama a limpeza; `media/infrastructure/mediaAssetRepository.ts:133-155` limita o lote; nenhum worker de mídia foi encontrado na árvore.
- **Risco:** Baixo — sem novos uploads, assets temporários expirados podem continuar ocupando o armazenamento local.

## Transação de expurgo e efeito externo

`purgeOneExpiredAccountRetention` seleciona/locka a conta, remove arquivos de mídia e só então apaga a conta no banco, tudo no callback de uma transação SQL. Arquivos locais são removidos com `rm(..., { force: true })`, operação idempotente (`localMediaFileStore.ts:133-135`).

O banco e o filesystem não compartilham uma transação atômica. Se arquivos forem removidos e o `DELETE` do banco falhar, o rollback mantém a conta/metadata mas os arquivos podem já ter sido apagados. A remoção idempotente ajuda em retry, mas não restaura arquivos. A operação externa dentro da transação também prolonga locks. Isto exige desenho de recuperação antes de se substituir o armazenamento local; não foi reproduzido com arquivos reais.

## E-mail e erros de entrega

- Resend é chamado diretamente com `fetch` e abort após 10 s; não há retry de rede nem outbox (`emailDelivery.ts:52-85`).
- Em desenvolvimento, a configuração depende de `RESEND_ENABLED=true`, chave e remetente válido. Fora de desenvolvimento, a implementação informa não configurado (`:36-41,58-60,87-92`).
- Fluxos de cadastro, device, troca de e-mail/senha e exclusão têm respostas de entrega explícitas em suas rotas; recuperação de senha tem resposta genérica por proteção contra enumeração e a falha é tratada conforme R2-03-002.
- Nenhuma entrega real foi executada nesta rodada.

### Sequência entre persistência de challenge e chamada de e-mail

| Fluxo | Estado escrito antes do envio | Resposta HTTP quando falha | Estado final e detalhe |
|---|---|---|---|
| Verificação de cadastro/reenviar verificação | `replaceChallenge` grava hash e expiração (`emailVerification/sendVerificationCode.ts:23-35`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`emailVerificationRoutes.ts:42-50`). | O registro continua pendente; a operação não invalida o challenge (`requestEmailVerification.ts:25-34`). |
| Login em dispositivo novo | Challenge e token pendente são criados (`login/startDeviceVerification.ts:30-36`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`loginRoutes.ts:114-138`). | Tenta invalidar o challenge; se a invalidação também falhar, o erro propaga e o estado precisa ser verificado. |
| Reenvio de código de dispositivo | Hash, expiração e cooldown são gravados em transação (`deviceVerification/resendDeviceLoginCode.ts:71-90`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`deviceVerificationRoutes.ts:163-172`). | Tenta invalidar o challenge; a invalidação também pode falhar (`:92-113`). |
| Recuperação de senha | Challenge criado antes de iniciar a entrega em background (`passwordReset/requestPasswordReset.ts:22-27`). | `202` genérico, sem revelar existência da conta (R2-03-002). | A rota não aguarda a entrega; falha é registrada e invalidação tentada; falha de invalidação é registrada (`:27-43`). |
| Atualização de senha | Challenge com hash da senha pendente é persistido (`passwordUpdate/requestPasswordUpdate.ts:65-74`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`passwordUpdateRoutes.ts:98-104`). | Tenta invalidar; senha atual só muda após confirmação. |
| Troca de senha | Challenge persistido antes do envio (`passwordChange/requestPasswordChange.ts:89-113`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`accountPasswordChangeRoutes.ts:88-94`). | Tenta invalidar; senha atual só muda após confirmação. |
| Troca de e-mail — código no endereço atual | Challenge do endereço novo persistido antes do envio ao endereço atual (`emailChange/startEmailChange.ts:90-113`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`accountEmailChangeRoutes.ts:91-100`). | Tenta invalidar; e-mail atual permanece. |
| Troca de e-mail — código no novo endereço | Código atual é consumido e um novo challenge gravado (`emailChange/confirmCurrentEmailChange.ts:86-110`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`accountEmailChangeRoutes.ts:158-164`). | Tenta invalidar o challenge novo; e-mail atual permanece e a troca deve ser reiniciada. |
| Aviso ao endereço de e-mail antigo | Transação atualiza o e-mail e consome challenges antes do envio (`emailChange/confirmNewEmailChange.ts:81-103`). | `200`, com `securityNoticeSent: false` se falhar (`confirmNewEmailChange` em `accountEmailChangeRoutes.ts:233-237`). | A troca não é revertida. |
| Pedido/restauração de exclusão | Challenge escrito antes do envio (`accountDeletion/requestAccountDeletionCode.ts:36-56`; `requestAccountRestorationCode.ts:35-51`). | `503 EMAIL_DELIVERY_UNAVAILABLE` (`accountDeletionRoutes.ts:77-86,212-221`). | Tenta invalidar; a mudança de estado só ocorre depois de confirmar o código. |

Como a persistência SQL e a entrega HTTP ao provedor não compartilham transação, não há garantia atômica de “challenge válido exatamente quando o e-mail chega”. Uma falha/timeout pode ocorrer após o provedor aceitar a mensagem; resultados assíncronos e invalidações são explícitos por fluxo acima. Não há broker/outbox persistente.

## Health, readiness e shutdown

- `/healthz` é liveness: responde `ok` sem consultar DB (`health/presentation/livenessRoutes.ts:6-9`).
- `/readyz` consulta o banco com `SELECT 1` e timeout de 1,5 s; falha retorna 503 genérico (`health/infrastructure/databaseReadiness.ts:3-6`; `health/presentation/readinessRoutes.ts:6-12`).
- O shutdown recebe `SIGTERM`/`SIGINT`, para o timer, fecha o HTTP server e o pool; há timeout forçado de 10 s (`index.ts:58-112`).
- `stopAccountDeletionWorker` apenas limpa o intervalo, não espera a execução do job em andamento. O fechamento do pool é iniciado no callback de `server.close`; não há etapa explícita de drain do worker (`accountDeletionWorker.ts:16-41`; `index.ts:58-108`).

### Queda do banco durante uma requisição

O pool é criado em `infra/database/src/index.ts:8`; o middleware de erro do app transforma erros de request não tratados em resposta genérica 500 (`Aplicativo/back/src/app.ts:56-78`). A busca de código não encontrou listener `pool.on("error")`, `unhandledRejection` ou `uncaughtException`; não foi simulada indisponibilidade nem retomada de conexão. Assim, reconexão automática, recuperação de operações em andamento e efeito de falha no processo ficam **NÃO VERIFICADOS**; não se assume retry ou reconexão.

### R2-08-005 — Shutdown não confirma o término do job em andamento

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `accountDeletionWorker.ts:16-41` não expõe uma promise de drain; `index.ts:58-108` limpa timer e fecha o pool sem aguardar o worker, com timeout forçado de 10 s.
- **Risco:** Baixo — um job pode ser interrompido durante shutdown; efeitos já feitos no filesystem não são revertidos pela transação SQL.

### R2-08-006 — Falha de envio de verificação não invalida o challenge persistido

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `emailVerification/sendVerificationCode.ts:25-35` persiste o hash antes de enviar; `requestEmailVerification.ts:25-34` converte qualquer falha em `delivery_failed` sem chamar invalidação.
- **Risco:** Baixo — o cliente recebe falha embora o código possa ainda estar válido ou ter sido entregue; novo reenvio substitui o challenge e a conta continua pendente.

### R2-08-007 — Recuperação do pool após queda do banco não foi exercitada

- **Rodada 1:** novo
- **Veredito:** NÃO VERIFICADO
- **Evidência:** `infra/database/src/index.ts:8` cria o pool; `Aplicativo/back/src/app.ts:56-78` tem middleware de erro da requisição. A busca `rg -n 'pool\\.on\\(|process\\.on\\(|unhandledRejection|uncaughtException' Aplicativo/back/src infra/database/src` não encontrou handler de evento do pool nem handlers globais de falha; nenhuma queda do banco foi simulada.
- **Risco:** Informativo — sem exercício de falha transitória não é possível afirmar se o processo mantém serviço, recupera consultas ou exige reinício.

## Ações fora do escopo desta auditoria

1. Tornar explícitos no readiness o estado do worker e o resultado de sua inicialização.
2. Isolar falhas por registro no lote de exclusão e definir retry/quarentena auditável.
3. Adicionar um processo idempotente de limpeza de mídia temporária.
4. Definir storage externo e recuperação para operações entre SQL e filesystem.
5. Escolher uma política de entrega durável e estados observáveis para desafios de e-mail.
6. Aguardar ou cancelar com segurança o worker durante shutdown.

## R2-08 — Fechamento

- **Achados novos:** 7 (1 alto, 2 médios, 3 baixos, 1 informativo).
- **Jobs encontrados:** finalizador de exclusão de contas; não foi encontrado worker de mídia temporária, outbox, broker ou fila durável.
- **Transações:** operações de retenção/expurgo e algumas ações de Auth usam transação/lock; expurgo de arquivo é efeito externo não atômico.
- **Saúde:** liveness/readiness existem; readiness cobre conexão SQL, não capacidade do worker.
- **Execução dinâmica de jobs/e-mail:** não realizada.

---

## Documento: R2-09-frontend-storage-clients-build.md

# R2-09 — Armazenamento frontend, clientes HTTP e bundle

**Status:** revisão estática concluída; build de produção executado com sucesso. Nenhum workflow foi reiniciado e nenhum teste E2E/browser foi executado.

## Armazenamento no navegador

### Chaves identificadas

| Armazenamento | Chave/base | Uso |
|---|---|---|
| `localStorage` | `seekalive-social-accounts` | Contas locais de demonstração/preview (`accountStorage.ts:3,18-36`). |
| `localStorage` | `seekalive-active-account` | Conta local ativa usada pela camada de preview (`accountStorage.ts:4,39-60`). |
| `localStorage` | `seekalive-social-reviews` | Avaliações comerciais locais (`businessProfileReviewStorage.ts:3,27-50`). |
| `localStorage` | `seekalive-follow-requests` | Pedidos locais de seguir (`followRequestStorage.ts:3,14-31`). |
| `localStorage` | `seekalive-social-account-activity` | IDs de curtidas, comentários curtidos, salvos, reposts e itens lidos; indexado por conta (`accountActivityStorage.ts:4,73-96`). |
| `localStorage` | `seekalive-settings-appearance:<account>` | Preferência de aparência/tamanho de fonte (`appearancePreferences.ts:3,11-15`). |
| `localStorage` | `seekalive-settings-notifications:<account>` | Preferências de notificação (`notificationPreferences.ts:3,24-28`). |
| `localStorage` | `seekalive-settings-privacy:<account>` | Preferências locais de privacidade/mensagens/recibos (`privacyPreferences.ts:3,17-21`). |
| `localStorage` | `seekalive-blocked-users:account:<id>` | IDs de bloqueios no estado de navegador (`SocialApplicationContext.tsx:90`; `browserAccountStorage.ts:3-5,12-40`). |
| `localStorage` | `seekalive-saved-shop-items:account:<id>` | IDs de itens Shop salvos no navegador (`useSavedShopItems.ts:5-14`). |
| `localStorage` | `seekalive-saved-businesses:account:<id>` | Negócios salvos no Seek, também usado no perfil comercial (`useSeekDiscovery.ts:12-13,41-43`). |
| `sessionStorage` | `seekalive-seek-filters:account:<id>` | Filtros da descoberta na aba atual (`useSeekDiscovery.ts:12,22-24,119-122`). |
| `sessionStorage` | `seekalive-seek-saved-events:account:<id>` | IDs de eventos salvos na sessão atual (`useSeekDiscovery.ts:14,43-44`). |
| `sessionStorage` | `seekalive-seek-recent-cities:account:<id>` | Até cinco cidades selecionadas; coordenadas são explicitamente omitidas (`seekLocationService.ts:9,78-96`). |
| `sessionStorage` | `seekalive-seek-scroll` | Posição de rolagem da tela (`useSeekDiscovery.ts:15,97-105`). |
| `sessionStorage` | `seekalive-seek-demo-preview` | Preferência de exibição de exemplos, usada apenas quando `import.meta.env.DEV` (`useSeekDiscovery.ts:16,47-49,124-127`). |
| Cookie legível por JS | `sidebar_state` | Estado visual aberto/fechado da barra lateral; 7 dias, `Path=/`, sem atributos explícitos `HttpOnly`, `Secure`, `SameSite` ou `Domain` (`components/ui/sidebar.tsx:28-29,85-87`). |

Não foi localizado token de sessão, token bearer nem senha em `localStorage`/`sessionStorage`. A autenticação do backend usa cookies `HttpOnly` descritos em R2-02; o token CSRF é obtido por requisição e mantido em memória pelo cliente. A interface `User` permite campo opcional `email`, mas o mapeador de conta do servidor não o copia (`profile/types/user.ts:3-25`; `socialGraphApi.ts:95-117`). Como `accountStorage.ts` serializa o objeto recebido integralmente, a ausência de e-mail só é garantida para objetos que não o contenham; o armazenamento continua sendo estado local de preview, não armazenamento seguro de conta.

### R2-09-001 — Dados de preview persistidos no navegador não são fonte segura ou compartilhada

- **Rodada 1:** amplia 12-008
- **Veredito:** CONFIRMADO
- **Evidência:** as chaves e as operações de leitura/escrita acima usam `localStorage`/`sessionStorage`; `accountStorage.ts:29-36` salva o objeto `User` inteiro. `User` pode conter e-mail (`types/user.ts:9`), embora o mapper server-side omita esse campo.
- **Risco:** Baixo — os dados de preview são modificáveis por qualquer script same-origin e não sincronizam entre dispositivos; não substituem persistência nem controle de autorização do backend.

## Links, conteúdo e mídia

- Os três links externos encontrados que usam `target="_blank"` também usam `rel="noopener noreferrer"` (`CommercialProfilePage.tsx:414-418,600-604`; `CommercialProfileInformation.tsx:168-172`).
- Não foi encontrado `dangerouslySetInnerHTML`, `innerHTML`, `marked` ou `react-markdown` no frontend. Conteúdo de publicação/artigo é renderizado como texto React nos componentes auditados; não foi identificado parser de HTML/Markdown.
- O website comercial é validado como HTTP/HTTPS no contrato (`R2-05`, `shared/contracts/src/social.ts:23-33`). O mapa é montado com endereço codificado e usa link externo protegido (`CommercialProfileInformation.tsx:167-175`; `CommercialProfilePage.tsx:414-418`).
- URLs de mídia publicadas são resolvidas por rota da API e validadas no backend contra post legível, conforme R2-04; o build não altera esse contrato.

## Clientes HTTP: Orval, `socialHttp` e `httpClient`

O frontend usa o cliente React gerado pelo Orval em `@workspace/api-client-react` para relações sociais, envolvido por `socialGraphApi.ts`. Esse wrapper injeta `credentials: "include"` e obtém CSRF antes de operações de escrita (`socialGraphApi.ts:73-93`). O transport Orval `customFetch` isolado não adiciona CSRF nem define `credentials`; ele preserva `status`, `headers` e corpo em `ApiError` (`shared/api-client-react/src/custom-fetch.ts:325-370`). Os demais fluxos REST de feed usam o cliente manual `socialHttp.ts`; Auth e outros serviços usam `httpClient.ts`.

| Comportamento | `httpClient.ts` | Orval via `socialGraphApi.ts` | `socialHttp.ts` |
|---|---|---|---|
| Cookies | `credentials: "include"` em GET/POST/PUT/DELETE. | Wrapper define `include` para leituras e escritas. | Define `include` em todas as requisições. |
| CSRF | Busca token e o envia em POST/PUT/DELETE (`httpClient.ts:75-139`). | Wrapper busca token para escrita (`socialGraphApi.ts:83-92`); geração Orval direta não oferece isso por si só. | Busca token em todos os métodos não seguros (`socialHttp.ts:48-63`). `init.headers` é mesclado depois do token. |
| Erros HTTP | `ApiRequestError` preserva status, código, chave, detalhes, e-mail de suporte, retry-after e dados de challenge (`httpClient.ts:9-23,35-55`). Nenhum status aciona retry automático. | `ApiError` original contém status/body/headers, mas o wrapper normaliza para status, código e chave (`socialGraphApi.ts:39-70`). Nenhum retry automático. | Mapeia mensagens específicas para 401/403/404/409/422; os outros status (incluindo 412/413/429) recebem mensagem genérica e só preservam o status em `ContentServiceError` (`socialHttp.ts:67-78`). |
| Cache de GET | `cache: "no-store"` (`httpClient.ts:75-81,142-151`). | Configuração de cache não é aplicada pelo wrapper; depende de `fetch`/cabeçalhos HTTP do servidor. | Não define `cache: "no-store"` (`socialHttp.ts:48-63`). |
| Validação de resposta | Validador de contrato opcional por status (`httpClient.ts:57-70`). | Schemas gerados para algumas rotas; `socialGraphApi` transforma DTOs em modelos UI. | Validação local com Zod para posts/comentários (`socialHttp.ts:8-46,88-102`). |

### R2-09-002 — Tratamento de erros diverge entre os clientes de Social

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `socialHttp.ts:67-78` mapeia apenas 401/403/404/409/422 e transforma 412/413/429 em mensagem genérica; `httpClient.ts:43-55` mantém os campos estruturados; `socialGraphApi.ts:55-70` descarta detalhes e retry-after ao normalizar.
- **Risco:** Médio — mensagens, recuperação de sessão, validação condicional e espera após rate limit podem variar entre operações equivalentes.

## Build de produção

- Condições do roteiro atendidas: `Aplicativo/front/dist/public` está ignorado por `.gitignore:4`; workflows configurados usam comandos `dev`, não servem esse diretório. O build ficou restrito ao output ignorado.
- Primeira tentativa, sem configurar variáveis exigidas pelo `vite.config.ts`, terminou em exit 1 antes de compilar (`PORT` obrigatório).
- Reexecução: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/social run build` — **exit 0**, Vite compilou 2.696 módulos em 19,41 s; script de verificação informou **96 chunks JS sem cinco literais de fixtures conhecidos**.
- O build emitiu dois avisos do Rollup sobre posição de anotações `@__PURE__` dentro de Zod. Não foram alterados comentários nem dependências.
- Busca adicional nos chunks: nenhum `import.meta.env.DEV` residual; nenhum nome `previewFixtures` ou `developmentSeekEvents`; o identificador `developmentExampleAccountIds` ainda aparece no chunk do Seek e textos genéricos “dados de demonstração” em três chunks. Os literais de fixtures que o verificador do projeto conhece não foram encontrados; os identificadores/textos residuais não provam que registros de demonstração estejam no bundle, mas impedem afirmar que todo marcador relacionado a preview foi removido.

### R2-09-003 — Marcadores de preview permanecem no bundle apesar da ausência de fixtures conhecidas

- **Rodada 1:** novo
- **Veredito:** PARCIAL
- **Evidência:** build de produção passou; `import.meta.env.DEV` e marcadores literais de fixtures conhecidos não foram encontrados; a busca encontrou o símbolo `developmentExampleAccountIds` e mensagens genéricas de demonstração em chunks minificados.
- **Risco:** Informativo — não há evidência de dados demonstrativos reais no resultado, mas a inspeção textual não comprova que todos os caminhos de preview foram removidos do artefato.

## Verificação dinâmica de dois clientes

**NÃO EXECUTADO:** a comparação com dois clientes/browser autenticados exigiria servidor ativo e/ou autenticação; o pré-voo obrigatório global não liberou essas suítes (R2-01-001). A paridade acima foi analisada estaticamente.

## Resumo R2-09

- **Achados novos:** 3 (1 médio, 1 baixo, 1 informativo).
- **Build:** passou após fornecer `PORT` e `BASE_PATH`; output ignorado pelo Git.
- **E2E/paridade de dois clientes:** não executada.
- **Tokens/senhas em storage JS:** não localizados; dados de preview e preferências ficam em armazenamento local do navegador.

---

## Documento: R2-10-dependencias-argon2-memoria.md

# R2-10 — Dependências, política de instalação e Argon2id

**Status:** `pnpm audit --prod` já foi executado em R2-01; análise estática de dependências/política e experimento de memória sem banco/rede concluídos.

## Audit de produção

`pnpm audit --prod` terminou com exit 0 e não reportou vulnerabilidades conhecidas nessa execução (R2-01, 827 ms). Esse comando limita a conclusão às dependências de produção consultadas naquela execução; não é certificação de segurança nem auditoria de dependências de desenvolvimento.

## Dependências sem importação identificada

| Pacote declarado | Local declarado | Evidência de uso |
|---|---|---|
| `cors` | `Aplicativo/back/package.json:17` | Nenhum import `cors` foi localizado em `Aplicativo/back/src`; o backend não registra middleware CORS (`app.ts`, ver R2-05). |
| `@types/cors` | `Aplicativo/back/package.json:28` | Nenhum uso de tipo do pacote localizado. |

O scan estático identificou esses dois candidatos consistentes a dependência não usada. Não foi instalado ou executado um analisador adicional; portanto não declaro que todos os manifests do monorepo foram provados sem dependências não usadas.

### R2-10-001 — Dependências CORS aparentam estar sem uso

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** declaradas no manifest do backend; busca de import nos fontes retornou apenas as declarações do package manifest.
- **Risco:** Baixo — dependência e tipos extras aumentam a superfície de manutenção, sem evidência de middleware CORS ativo.

## Política de instalação/build scripts

- `pnpm-workspace.yaml:28-35` exige `minimumReleaseAge: 1440` minutos e exclui `@replit/*` e `stripe-replit-sync`.
- `pnpm-workspace.yaml:72-78` permite scripts de build de `@swc/core`, `argon2`, `esbuild`, `msw` e `unrs-resolver`.
- A raiz usa `preinstall` que apaga `package-lock.json` e `yarn.lock` antes de verificar se o user-agent é pnpm (`package.json:13`). Não foi executado `install` nesta rodada.

### R2-10-002 — `preinstall` apaga lockfiles de outros package managers

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** comando `preinstall` explícito no `package.json:13`.
- **Risco:** Informativo — instalar por outro gerenciador remove os lockfiles correspondentes antes de falhar; os arquivos pnpm continuam fora dessa remoção.

## Ações fora do escopo desta auditoria

1. Confirmar se `cors`/`@types/cors` são necessários em ferramentas ou configuração antes de qualquer remoção.
2. Revisar a ordem do `preinstall` para não apagar lockfiles antes de rejeitar outro gerenciador.
3. Repetir o benchmark Argon2id com limites e concorrência representativos quando houver runtime de produção definido; os valores atuais descrevem somente o container de desenvolvimento.

## Experimento Argon2id

Parâmetros copiados do código de produção `Aplicativo/back/src/modules/auth/application/passwordHashing.ts:3-13`: Argon2id, memória 65.536 KiB, 3 iterações, paralelismo 1. O script `experimentos/argon2-memory-benchmark.mjs` usa somente strings sintéticas, não acessa banco/rede, cria processos isolados para cada concorrência e mata o processo se RSS amostrado ultrapassar 1 GiB.

| Concorrência | Hashes | Tempo total | Média/hash | Mediana/hash | Máximo/hash | RSS máximo do processo |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 8 | 1.205 ms | 151 ms | 147 ms | 191 ms | 126,5 MiB |
| 2 | 8 | 742 ms | 167 ms | 162 ms | 216 ms | 190,3 MiB |
| 4 | 8 | 413 ms | 185 ms | 191 ms | 208 ms | 318,6 MiB |
| 8 | 8 | 424 ms | 284 ms | 336 ms | 416 ms | 318,6 MiB |

| Memória do container | Resultado |
|---|---:|
| Limite cgroup | 8.192 MiB |
| Baseline amostrado | 1.715 MiB |
| Pico amostrado durante os quatro ensaios | 1.991 MiB |
| Delta amostrado sobre baseline | 276 MiB |
| Limite RSS por processo | 1.024 MiB |
| Interrompido pelo limite? | Não |

O pico do container é amostrado a cada 20 ms e pode deixar de capturar picos mais curtos. `maxRSS` do processo vem de `resourceUsage` e não ultrapassou o limite. O uso de memória não cresceu linearmente entre concorrência 4 e 8 nesta medição; não se extrapola essa medição para produção.

A primeira invocação do script de benchmark abortou antes de executar hashes por incompatibilidade de tipo no cálculo da guarda BigInt. O script de auditoria foi corrigido e a execução completa acima foi repetida; nenhuma lógica do produto ou dependência foi alterada.

## R2-10 — Fechamento

- **Achados novos:** 2 (1 baixo, 1 informativo).
- **Audit de dependências de produção:** sem vulnerabilidade conhecida reportada na execução; detalhes em R2-01.
- **Inventário de dependências não usadas:** dois candidatos verificados no backend; cobertura não exaustiva do monorepo.
- **Argon2id:** 1/2/4/8 executados; máximo de RSS medido 318,6 MiB, sem atingir 1 GiB.
- **Instalação:** nenhum pacote instalado/removido; nenhum lockfile alterado.
