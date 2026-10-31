# R2-99 — Síntese da auditoria dirigida

## Escopo e limites

Rodada estática e controlada sobre código, configuração versionada, resultados de comandos autorizados e metadados do banco de desenvolvimento. Não houve alteração de produto, instalação/remoção de dependências, execução de migrations/DDL, escrita em banco, envio de e-mail, chamada HTTP mutável, teste contra produção ou reinício de workflow. Nenhuma linha de dados de aplicação foi consultada.

### Atualização posterior — Reviews em Profiles — 31/10/2026

Após a auditoria, `profiles/0003_misty_rhodey.sql` foi aplicada ao banco de desenvolvimento `heliumdb` mediante autorização expressa de DDL. O catálogo posterior confirma a tabela de Reviews e o ledger com quatro migrations. A pendência estrutural de R2-06-003 foi resolvida; o fluxo HTTP autenticado de Reviews continua não verificado nesta reconciliação. As verificações e os demais achados abaixo são o retrato da rodada original.

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
| Migration da tabela de avaliações comerciais | RESOLVIDO estruturalmente em desenvolvimento; rotas não verificadas | [R2-06-003](R2-06-papel-banco-migrations.md#r2-06-003-tabela-de-avaliações-comerciais-está-prevista-mas-migration-local-não-foi-aplicada) |
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
| 5 | R2-06-003 | Médio histórico | A tabela faltava no snapshot original; a migration foi aplicada depois em desenvolvimento. Rotas de Reviews não foram verificadas ponta a ponta nessa reconciliação. |
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
