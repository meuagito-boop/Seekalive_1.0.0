# Plano — Testes, CI e higiene

**Status:** aguardando aprovação do proprietário.  
**Escopo nesta etapa:** diagnóstico somente leitura e registro do plano. Nenhum código, teste, workflow, banco ou dependência foi alterado.

Este arquivo guarda juntos o prompt original e o plano correspondente, conforme a regra de planejamento do projeto.

## Prompt original do proprietário

> OBJETIVO: verificação reproduzível e independente do Replit.  
> REGRAS: plano primeiro e espere meu OK; sem push/migrate/DDL, produção ou segredos; não mude regra aprovada (pare e pergunte); relatório final: mudou / evidência / não verificado.
>
> 1. Testes rodando contra um Postgres descartável (service container no CI), não em schemas temporários do banco de desenvolvimento. Mantenha as guardas atuais.
> 2. Um `pnpm test` que roda TUDO: exclusão de conta, baselines, seekDiscovery, API isolada e E2E de auth. Liste quais suítes hoje ficam fora dele.
> 3. Novos testes de concorrência: tentativas de OTP em paralelo, limite de 2 sessões, follow/aceitar/bloquear cruzados, avaliação única, publicar com mídia.
> 4. CI (GitHub Actions ou equivalente): typecheck, build, testes, pnpm audit --prod e teste rotas×contrato. Falha bloqueia merge.
> 5. Higiene: alinhar Node (.replit e engines); corrigir o preinstall (checar o gerenciador ANTES de apagar lockfiles); nomes de schema do test:baselines no padrão seekalive*test*<32hex>; lint/format mínimo; relatório de cobertura.
> 6. Relatório com contagem REAL por suíte (passou/falhou/duração). Nada de "passou" sem log anexado.
>
> ACEITE: CI verde em branch limpa; instruções para rodar tudo do zero em até 10 comandos.

## Instrução complementar recebida

O proprietário informou que algumas proibições do prompt podem não refletir trabalho já realizado e pediu que esses fatos sejam documentados, em vez de desfazer atividades anteriores. Também pediu que uma sequência de prompts seja executada após aprovação.

**Como isso será aplicado:** registrar como histórico os testes e DDL já executados em schemas temporários do banco de desenvolvimento; não reverter nem apagar evidências anteriores. Para esta nova implementação, os testes de integração e replay de baselines usarão somente um Postgres descartável, isolado do banco de desenvolvimento e de produção. A DDL necessária ficará restrita ao container efêmero. Nenhuma execução será iniciada antes da aprovação deste plano.

## Diagnóstico atual — evidências de leitura

1. A branch de trabalho estava limpa (`git status --short` sem alterações) no momento do diagnóstico.
2. Não foram encontrados workflows de CI em `.github/workflows`, GitLab CI ou CircleCI dentro do projeto.
3. A raiz declara `engines.node >=22.18.0` e `packageManager: pnpm@10.26.1`; `.replit` seleciona `nodejs-20`. Há incompatibilidade real de runtime.
4. O `preinstall` atual remove `package-lock.json` e `yarn.lock` antes de verificar se o gerenciador é pnpm. Uma instalação por outro gerenciador pode apagar lockfiles antes de ser recusada.
5. O `pnpm test` atual executa `test:social`, `test:backend`, testes de fronteira e testes de aplicação selecionados. Não chama todos os grupos existentes.
6. O replay de baselines gera nomes no formato `seekalive_test_<32hex>_<track>`; o proprietário pediu exatamente `seekalive_test_<32hex>`. Cada schema por domínio deverá receber seu próprio sufixo aleatório de 32 caracteres, sem anexar o nome do domínio ao identificador.
7. Os testes isolados atualmente exigem opt-in, `NODE_ENV=test`, banco esperado, schema com nome validado e ausência de `REPLIT_DEPLOYMENT`; o fixture e `push-isolated.mjs` também fixam o destino de migração em `replit`. A conexão suporta destino `external`, mas o fixture ainda não o usa. A adaptação para Postgres efêmero precisa preservar as guardas e adicionar uma autorização específica e restrita para o banco de teste, sem abrir caminho para banco de desenvolvimento ou produção.
8. O prompt proíbe DDL, mas o replay de baselines e a inicialização dos testes HTTP dependem dela. Pela instrução complementar do proprietário, a restrição será documentada como conflito do prompt e a DDL só será executada no Postgres descartável; não no banco de desenvolvimento ou em produção.
9. Há evidência existente de concorrência que deve ser reutilizada, não duplicada:
   - Reviews já testa dois POSTs simultâneos para uma avaliação do mesmo autor e exige um sucesso e um conflito HTTP 409.
   - Social já testa corrida entre follow e block e corrida entre aceitar pedido e bloquear; verifica que a relação final não sobrevive ao bloqueio.
   - Auth já cobre consumo concorrente de alguns desafios e testa a política de duas sessões em nível de aplicação, mas não comprova a disputa entre tentativas de OTP erradas nem a limitação de sessões em concorrência contra Postgres.
   - Não foi encontrado teste comprovando publicação HTTP com uma mídia real staged anexada sob concorrência; o teste existente rejeita uma URL `blob:` local.
10. O runner disponível é `node:test`/`tsx`; o frontend possui 16 arquivos de testes unitários, cinco suítes E2E de Auth e Playwright instalado. Prettier já é dependência da raiz; não foi encontrado script de lint.

### Suítes atualmente fora de `pnpm test`

Estas são as suítes identificadas no diagnóstico e que precisam ser incorporadas ao comando completo ou justificadamente classificadas:

- **Exclusão de conta:** `pnpm test:account-deletion` — schema, ciclo de vida e integração HTTP.
- **Baselines:** `pnpm --filter @workspace/db run test:baselines`.
- **API isolada:** `pnpm --filter @workspace/scripts run test:api-isolated-http`, incluindo API geral, exclusão, Reviews, Auth, Profiles/Onboarding, Social, Feed, Mídia e Health.
- **Frontend unitário — 16 arquivos:** `accountSettings`, `authSessionState`, `content`, `contracts`, `httpClient`, `messages`, `notifications`, `onboarding`, `profileApiMapping`, `profileEdit`, `profilePresentation`, `registrationForm`, `relationshipActions`, `remoteFeedState`, `seekDiscovery` e `tabKeyboard`.
- **E2E de Auth — cinco arquivos:** `authFlows`, `authRegistration`, `authLoginSessions`, `authPasswordReset` e `authCredentialChanges`.

Alguns fluxos podem se sobrepor aos testes atuais da raiz. A implementação deverá criar um inventário de comandos e arquivos para executar cada teste necessário sem duplicar desnecessariamente a mesma suíte.

## Plano de execução proposto

### Etapa 1 — Baseline reproduzível e inventário final

**Objetivo:** classificar os testes existentes em unitários, contratos, API isolada, migrações/baselines e E2E; identificar duplicações e pré-requisitos sem executar escrita no banco atual.

- Mapear cada comando e arquivo de teste para uma suíte nomeada.
- Reutilizar como evidência os testes de concorrência de Reviews e os dois cenários de Social já existentes.
- Separar o que já está coberto do que ainda precisa ser acrescentado: OTP incorreto em paralelo, limite de duas sessões sob concorrência e publicação com mídia real sob concorrência.
- Revisar a concorrência de Social existente para confirmar os interleavings; adicionar apenas combinações ainda não exercitadas.
- Registrar variáveis necessárias por suíte sem ler ou imprimir valores de segredos.

**Gate 1:** matriz de suítes e lacunas revisada; nenhuma alteração de regra de produto; nenhum teste de banco executado contra o banco de desenvolvimento.

### Etapa 2 — Postgres descartável e preservação das guardas

**Objetivo:** executar testes de banco e HTTP somente contra um serviço PostgreSQL efêmero.

- Criar no CI um service container PostgreSQL com banco exclusivo de teste e credenciais descartáveis, sem conexão ao banco Replit.
- Adaptar o harness, os fixtures, o replay de baselines e o push isolado para usar a conexão `external` do serviço de teste.
- Preservar as proteções atuais: `NODE_ENV=test`, opt-in explícito para DDL, schema validado, comparação do catálogo `public`, limpeza ao final, rejeição de `REPLIT_DEPLOYMENT` e comparação exata com o banco esperado.
- Para aceitar o serviço efêmero, exigir um marcador dedicado de teste e permitir somente o alvo de teste local/CI; não ampliar a permissão para qualquer URL externa.
- Confirmar antes de cada suite qual banco está conectado. Se o nome não for o esperado, falhar antes de qualquer DDL.
- Alterar `test:baselines` para nomes `seekalive_test_<32hex>` independentes por schema/domínio.
- Não desfazer execuções antigas no banco de desenvolvimento. As evidências históricas permanecem documentadas; testes novos não escreverão nele.

**Gate 2:** testes de segurança da guarda comprovam recusa de banco inesperado, runtime publicado, opt-in ausente e nomes inválidos; a suite demonstra limpeza do serviço descartável. Nenhuma escrita ocorre no banco Replit ou em produção.

### Etapa 3 — Fechar os testes de concorrência solicitados

**Objetivo:** provar as invariantes críticas com o Postgres descartável e a API/serviços reais.

- **OTP paralelo:** submeter tentativas inválidas concorrentes ao mesmo desafio e comprovar que a contagem de tentativas, cooldown e bloqueio não são perdidos por corrida. Preservar os limites e os tempos já aprovados.
- **Duas sessões:** criar sessões em concorrência e verificar que não mais de duas permanecem ativas e que a sessão mais antiga é revogada, sem impor expiração por inatividade.
- **Follow/aceitar/bloquear:** validar as corridas cruzadas; após bloqueio, não pode permanecer follow nem pedido incompatível. Usar os testes existentes como base e preencher apenas a lacuna comprovada.
- **Avaliação única:** manter o teste HTTP simultâneo já existente (um `201`, outro `409`) e garantir que a suíte completa o execute no CI.
- **Publicar com mídia:** anexar uma mídia real staged ao post; concorrer tentativas de publicação/reuso do mesmo ativo e provar atomicidade, propriedade e ausência de mídia órfã ou anexada duas vezes.

**Gate 3:** cada invariável tem teste executado contra o Postgres efêmero, estado final consultado e falhas concorrentes classificadas explicitamente. Nenhuma alteração de regra é feita para fazer o teste passar.

### Etapa 4 — `pnpm test` completo e relatório de execução

**Objetivo:** ter um único comando que execute os testes existentes e novos.

- Substituir a cadeia extensa atual por um orquestrador pequeno e explícito que execute todas as suítes inventariadas, em ordem segura para o banco.
- Incluir no `pnpm test`: testes atuais, exclusão de conta, baselines, todos os testes unitários de frontend (incluindo `seekDiscovery`), API isolada e as cinco suítes E2E de Auth.
- Não duplicar Reviews/Social se já rodarem no comando-base; registrar a composição exata no script e na documentação.
- O orquestrador deve continuar a coletar resultados de todas as suítes mesmo se uma falhar e retornar código de saída diferente de zero quando houver qualquer falha.
- Produzir por suíte: quantidade aprovada, falha, ignorada e duração; guardar stdout/stderr TAP bruto e resumo JSON/Markdown como artefatos locais/CI, sem comitar logs gerados.
- Não chamar serviços reais de e-mail; manter o coletor de e-mail em memória nos testes.

**Gate 4:** executar `pnpm test` em checkout limpo, com Postgres descartável, obter relatório por suíte e anexar os logs brutos. Não aceitar números agregados sem o log correspondente.

### Etapa 5 — CI, higiene e bloqueio de merge

**Objetivo:** validar a mesma cadeia em cada pull request.

- Criar workflow GitHub Actions em runner limpo, com Node alinhado a `engines`/`.replit`, pnpm pelo `packageManager` e serviço PostgreSQL descartável.
- Executar typecheck, build, `pnpm test`, `pnpm audit --prod` e teste rotas×contrato; qualquer falha torna o job não aprovado.
- Corrigir a ordem do `preinstall`: validar o user-agent/gerenciador antes de qualquer remoção de lockfile. Testar que npm/yarn são recusados sem apagar arquivos e que pnpm segue o fluxo esperado.
- Alinhar `.replit` ao Node 22 compatível com `>=22.18.0`, usando a configuração documentada do Replit e a mesma major/minor no CI. A documentação oficial admite `nodejs-22` em `.replit` e recomenda considerar `replit.nix` para controlar o runtime: [Replit App Configuration](https://docs.replit.com/features/project-setup/configuration).
- Adicionar `format:check` usando o Prettier já instalado; verificar a necessidade de lint dedicado antes de introduzir nova dependência. Se ESLint for necessário, avaliar compatibilidade/licença e escopo antes de adicioná-lo.
- Gerar relatório de cobertura sem inventar limiar percentual. Validar se a cobertura nativa `node:test`/V8 contabiliza corretamente os módulos TypeScript via `tsx`; se não, propor a ferramenta mínima e seu custo antes de adicionar dependência.
- Fazer upload dos logs TAP por suíte, resumo de cobertura e relatório de auditoria como artefatos do CI; não registrar credenciais nem URLs de banco.
- Configurar a execução do workflow em pull requests. A exigência de status check para bloquear merge depende também das regras de proteção/ruleset do repositório GitHub e não é garantida apenas por um arquivo YAML.

**Gate 5:** workflow configurado, testes locais equivalentes aprovados e instrução clara para tornar o status obrigatório no repositório. A execução remota e a configuração de branch protection serão marcadas como não verificadas enquanto não houver execução no GitHub e permissão para alterar as regras do repositório.

### Etapa 6 — Instruções limpas e relatório final

- Documentar pré-requisitos e no máximo dez comandos desde um checkout limpo, incluindo instalação congelada, início/conexão ao Postgres descartável e execução de `pnpm test`.
- Documentar o comando único e o conjunto de suítes que ele compõe.
- Entregar o relatório nos campos exigidos: **mudou / evidência / não verificado**, com contagem real por suíte, duração e logs associados.
- Declarar separadamente se o workflow foi apenas criado/validado localmente ou se realmente executou em branch remota limpa.

**Gate 6:** instruções reproduzíveis em até dez comandos, relatório por suíte conferível e lista de limitações externas sem declarar verde um CI que não foi executado.

## Critérios de aceite

- `pnpm test` executa todos os grupos listados, retorna falha quando qualquer suíte falha e gera contagem/duração/log por suíte.
- Baselines, API isolada e E2E que escrevem dados usam exclusivamente o Postgres descartável.
- As guardas anteriores continuam fail-closed; novas permissões são explícitas, restritas ao ambiente de teste e não aceitam produção nem o banco Replit.
- Testes de concorrência comprovam OTP, limite de sessões e publicação com mídia; testes de avaliação única existentes continuam executando.
- CI executa typecheck, build, testes, `pnpm audit --prod` e rotas×contrato; falha sinaliza check não aprovado.
- Node está alinhado em `.replit`, `engines` e CI; `preinstall` não remove lockfiles antes de validar o gerenciador.
- A regra de nomes dos schemas de baselines é exatamente `seekalive_test_<32hex>`.
- Formatação e cobertura são verificáveis; nenhuma porcentagem mínima é criada sem decisão do proprietário.
- Nenhuma regra aprovada de produto é alterada.
- O relatório diferencia execução local de CI remoto. “CI verde em branch limpa” só será declarado após evidência do workflow remoto e do status obrigatório no repositório.

## Pendências externas/limites conhecidos

| Item                                 | Estado                                              | Motivo                                                                                   | Próxima ação                                                                                   | Critério de encerramento                                                                     |
| ------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Branch protection que bloqueia merge | Não configurado/verificado                          | Requer regra de proteção ou ruleset no GitHub; não é imposto pelo workflow YAML sozinho. | O proprietário habilita o status check obrigatório após o workflow existir.                    | Um PR de teste bloqueia o merge quando o job falha e fica verde quando todos os jobs passam. |
| CI verde em branch remota limpa      | Não verificável sem execução remota                 | O diagnóstico não encontrou workflow atual e não foi feita publicação/push nesta etapa.  | Executar o workflow numa branch remota depois da aprovação e quando houver acesso/autorização. | Log do GitHub Actions em checkout limpo com todos os jobs verdes e artefatos disponíveis.    |
| Cobertura e limiar                   | Relatório ainda inexistente; nenhum limiar aprovado | É necessário verificar a qualidade do mapeamento de fontes TS pelo runner atual.         | Medir cobertura real e apresentar os números antes de propor limiar.                           | Relatório reproduzível por suíte; limiar só após decisão explícita.                          |

## Decisão solicitada

Este plano está **aguardando aprovação**. Nenhuma implementação, execução de DDL, instalação, alteração de workflow ou push começou. Depois do seu OK, a execução seguirá os gates acima; qualquer regra conflitante ou risco que exija uma decisão de produto será apresentado antes de alterar o comportamento.
