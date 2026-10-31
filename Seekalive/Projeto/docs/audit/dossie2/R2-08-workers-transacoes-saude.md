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
