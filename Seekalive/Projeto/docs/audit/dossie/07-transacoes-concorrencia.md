# 07 — Transações e concorrência

## Escopo e limites

Revisão estática dos fluxos críticos: cadastro, relações, sessões, publicação com mídia, avaliação e exclusão/restauração. Não foram iniciadas escritas, migrations ou testes paralelos. O nível de isolamento efetivo do servidor PostgreSQL não foi consultado.

## Achados

### 07-001 — Cadastro depende de uma transação única que cruza Accounts, Auth e Profiles

**Afirmação da doc:** A arquitetura lógica declara domínios separados; nenhum documento autoriza uma transação distribuída entre bancos físicos nesta etapa.  
**Veredito:** PARCIAL  
**Risco:** Alto antes de separar fisicamente os bancos — o fluxo atual depende de compartilhar uma transação PostgreSQL.

**Evidência:** `auth/infrastructure/registrationAccountCoordinator.ts:37–80` cria identidade, credencial e inicializa Profiles dentro de `runInTransaction`, passando a mesma transação a cada operação. O bloco 05 confirmou FKs entre os schemas lógicos na mesma instância; o bloco 03 descreve as dependências.

**Trecho:** `createPendingAccountIdentity(transaction, ...)`, `createInitialPasswordCredential(transaction, ...)` e `initializeAccountProfile(transaction, ...)` são executados no mesmo callback transacional.

### 07-002 — Follow e block serializam contas em ordem canônica de UUID

**Afirmação da doc:** N/A — verificação do protocolo de lock das relações.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a ordenação comum reduz deadlocks entre operações que travam o mesmo par.

**Evidência:** `social/infrastructure/relationshipTransactionSupport.ts:18–43` remove duplicatas, ordena os IDs e adquire `FOR UPDATE` por conta. `followMutationRepository.ts:14–16` e `blockMutationRepository.ts:9–13` executam essa aquisição dentro de `db.transaction`.

**Trecho:** `for (const id of [...new Set([firstId, secondId])].sort()) ... .for("update")`.

### 07-003 — O limite de sessões usa lock por conta e revoga as mais antigas na transação

**Afirmação da doc:** N/A — verificação de concorrência de sessões.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a transação serializa a escolha das sessões antigas, mas a corrida não foi reproduzida.

**Evidência:** `auth/infrastructure/sessionCreationRepository.ts:21–61` bloqueia a linha da conta, consulta sessões ativas ordenadas por `createdAt` e `id`, calcula as que excedem o limite e as revoga antes da inserção. O bloco 03 confirma que a regra de produto é no máximo duas sessões simultâneas.

**Trecho:** `.for("update")` na conta e nas sessões ativas, seguido de `selectOldestSessionIdsToRevoke`.

### 07-004 — Publicação e associação dos ativos staged são transacionais no banco, mas o arquivo existe antes da transação

**Afirmação da doc:** N/A — verificação do fluxo de mídia/publicação.  
**Veredito:** PARCIAL  
**Risco:** Médio — uma falha após upload e antes do vínculo pode deixar mídia staged até a limpeza de expiração.

**Evidência:** `feed/composition/postPersistence.ts:23–74` cria publicação, tags e associa ativos dentro de `db.transaction`. O upload grava o arquivo e o ativo staged antes da publicação (`media/application/uploadMedia.ts`; ver bloco 08). Não há transação única entre filesystem e banco; o bloco 08 documenta limpeza oportunística de uploads expirados.

**Trecho:** a persistência da publicação recebe os IDs staged e executa criação/associação no callback transacional.

### 07-005 — A escrita de avaliações não abre uma transação própria; a ausência física da tabela era do snapshot original

**Afirmação da doc:** `docs/api/backend/endpoints.md:86–89` marca a API de avaliações como implementada em código e banco pendente.  
**Veredito:** PARCIAL  
**Risco:** Alto para a funcionalidade — os handlers não podem completar gravação/leitura se a tabela ausente continuar ausente.

**Atualização posterior (31/10/2026):** a migration `profiles/0003_misty_rhodey.sql` foi aplicada ao banco de desenvolvimento e o catálogo confirma `profiles.business_profile_reviews`; a ausência descrita na auditoria era do snapshot original. A escrita continua não tendo um bloco `db.transaction` explícito, mas este achado não demonstra falha transacional: trata-se de uma única instrução `INSERT`, atomicamente executada pelo PostgreSQL. Fluxos multi-instrução ou o comportamento ponta a ponta não foram testados nesta reconciliação.

**Evidência original:** `profiles/infrastructure/businessProfileReviewRepository.ts:168–180` executa `db.insert(businessProfileReviews).values(...).returning()` diretamente, sem `db.transaction` explícito. A migration da tabela ainda não estava aplicada no snapshot original. A constraint única declarada no schema não substituía a existência física da tabela.

**Trecho:** `const [row] = await db.insert(businessProfileReviews).values(...).returning();`.

### 07-006 — Os fluxos críticos não declaram isolamento nem retry explícito para erros de serialização/deadlock

**Afirmação da doc:** N/A — verificação de isolamento e tratamento de erros de concorrência.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — não há evidência suficiente para afirmar o nível efetivo ou comportamento de retry do ambiente de desenvolvimento.

**Evidência:** busca estática `rg -n 'isolationLevel|SERIALIZABLE|40001|40P01|serialization_failure|deadlock' Aplicativo/back/src infra/database/src --glob '*.ts'` retornou `No matches`. O código chama `db.transaction`, sem parâmetro de isolamento localizado. Não foi consultado `SHOW default_transaction_isolation` nem executada corrida.

**Trecho da saída:** `No matches`.

### 07-007 — A cobertura localizada não demonstra concorrência real dos fluxos com lock

**Afirmação da doc:** N/A — limite das evidências de teste.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — o raciocínio baseado em locks não substitui testes concorrentes no banco.

**Evidência:** existem testes de política e injeção para Social, Feed, Auth e exclusão, mas o inventário não demonstra teste concorrente de cadastro, follow/accept, limite de sessões, confirmações OTP ou criação de avaliação. O prompt proíbe executar testes nesta auditoria; ver bloco 14.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 2 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 2 |
