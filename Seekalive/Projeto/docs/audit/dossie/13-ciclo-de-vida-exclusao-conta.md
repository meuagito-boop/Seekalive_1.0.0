# 13 — Ciclo de vida, restauração e exclusão da conta

## Escopo e limites

Confronto estático da regra aprovada com os casos de uso, endpoints, worker e FKs declaradas. Não foi solicitada nem executada exclusão de conta, teste de usuário ou leitura de registros de negócio. Nenhum dado de usuário foi consultado.

## Achados

### 13-001 — A regra de sete dias mais noventa dias está codificada

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `accounts/domain/accountDeletionPolicy.ts:1–21` define prazo de graça de sete dias e calcula retenção de noventa dias a partir de `deletionScheduledFor`. O prazo de restauração termina estritamente antes da data agendada (`:24–36`); portanto, o fluxo retém o registro por até 97 dias após a confirmação inicial, salvo atraso do worker.

**Trecho:** `ACCOUNT_DELETION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000`; `deletionScheduledFor.getTime() + ACCOUNT_DELETION_RETENTION_PERIOD_MS`.

### 13-002 — A solicitação desativa a conta e encerra a sessão após confirmação por código

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `auth/presentation/accountDeletionRoutes.ts:55–97` exige sessão ativa e envia código ao e-mail atual; `:122–171` confirma o código, agenda a exclusão e limpa cookies de sessão e pré-autenticação. O endpoint aplica rate limit e CSRF. Não há envio de e-mail de confirmação adicional nessa rota; o envio observado é o do código solicitado.

**Trecho:** em sucesso, `response.clearCookie(SESSION_COOKIE, ...)`, `response.clearCookie(PRE_AUTH_COOKIE, ...)` e `status: "deletion_scheduled"`.

### 13-003 — A restauração exige senha e código e só é aceita antes do prazo

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** a tela de login encaminha `account_deletion_pending` ao painel de restauração (`front/src/modules/auth/application/useLoginSubmission.ts:33–46`). `AccountRestorationPanel.tsx:82` exibe o prazo ao titular. `accountDeletionRoutes.ts:176–231` pede identifier/senha antes de enviar o código e `:235–285` autentica novamente identifier/senha, confirma o código e devolve conflito quando o prazo terminou.

**Trecho:** `loginOperations.authenticate(parsed.data.identifier, parsed.data.password, null)` antes de solicitar e antes de confirmar o código.

### 13-004 — Existe worker para transicionar e purgar contas vencidas

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `auth/infrastructure/accountDeletionWorker.ts:5–14,16–41` executa lote inicial e repetição a cada 60 segundos, loteando até 50 ações pelo finalizador (`auth/composition/accountDeletionFinalization.ts:6–14`). O processo importa e inicia o worker quando o servidor escuta (`Aplicativo/back/src/index.ts:38–48`).

**Trecho:** `const INTERVAL_MS = 60_000`; `const timer = setInterval(() => void run(), INTERVAL_MS)`.

### 13-005 — A retenção reserva o @ por 30 dias e depois mantém a conta retida por mais 90

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `auth/infrastructure/accountDeletionRetentionRepository.ts:36–76` define `reservationExpiresAt` como `deletionRequestedAt + USERNAME_RESERVATION_MS` e registra/atualiza a reserva. `:79–98` define o estado `deletion_retained` e `deletionRetentionUntil` a partir do prazo de exclusão de sete dias.

**Trecho:** `account.deletionRequestedAt.getTime() + USERNAME_RESERVATION_MS`; depois `status: "deletion_retained"`.

### 13-006 — A exclusão final remove registros por cascata nos domínios implementados

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `auth/infrastructure/accountDeletionPurgeRepository.ts:9–37` seleciona somente contas em `deletion_retained` cujo prazo venceu, apaga arquivos de mídia e então executa `DELETE accounts`. Os schemas declaram `ON DELETE CASCADE` para registros de segurança, Profiles/Relações, publicações, comentários, curtidas, reposts, favoritos e ativos (`infra/database/src/schema/security/schema.ts`; `profiles/accountProfiles.ts`, `profiles/businessProfiles.ts`, `profiles/relationships.ts`, `profiles/businessProfileReviews.ts`; `feed/posts.ts`, `postComments.ts`, `postLikes.ts`, `postReposts.ts`, `postBookmarks.ts`; `media/assets.ts`). O catálogo somente foi lido; a cascata não foi exercitada neste dossiê.

**Trecho:** o purge exclui `accounts` depois de `purgeAccountMediaFiles(account.id)`; por exemplo, `feed/posts.ts` declara `.references(() => accounts.id, { onDelete: "cascade" })`.

**Impacto:** as relações implementadas serão removidas conforme as FKs declaradas e as contagens calculadas em leituras seguintes refletirão as linhas removidas. Isso não comprova a execução completa de uma purga real.

### 13-007 — A preservação e anonimização de mensagens ainda não têm implementação

**Veredito:** PARCIAL  
**Prioridade:** Alta para o fechamento do escopo Social

**Evidência:** `Aplicativo/back/src/modules` não contém módulo Messages nem suas tabelas/rotas; o bloco 11 confirmou também que as pastas de frontend Messages e Notifications não fazem chamadas de rede. Assim, não existe mecanismo de exclusão que preserve o conteúdo de conversas e anonimize o remetente conforme a regra aprovada.

**Trecho:** o registro ativo de rotas (`Aplicativo/back/src/modules/index.ts:13–19`) não monta router de mensagens; a busca de rede do bloco 11 não encontrou chamadas nos módulos frontend Messages/Notifications.

**Impacto:** não há mensagens remotas a purgar nesta versão, mas a regra deverá ser implementada no domínio Messages antes que esse recurso seja conectado a dados reais.

### 13-008 — A remoção de arquivos depende do armazenamento local de desenvolvimento

**Veredito:** PARCIAL  
**Prioridade:** Alta antes de usar armazenamento permanente

**Evidência:** `media/composition/accountMediaPurge.ts:14–24,27–30` remove os arquivos via `localMediaFileStore` e lança erro se houver ativos fora de `development`. `accountDeletionPurgeRepository.ts:24–25` invoca a remoção dentro da transação que exclui a conta.

**Trecho:** `if (assets.length > 0 && !isLocalDevelopment()) throw new Error("Account media purge requires the configured storage provider.");`.

**Impacto:** o caminho atual é coerente com o armazenamento local de desenvolvimento. O armazenamento permanente futuro precisará fornecer a operação de purge equivalente; sem ela, a conta vencida não será apagada enquanto tiver ativos. A chamada de filesystem dentro da transação também torna a operação externa não reversível se a transação falhar depois.

### 13-009 — Se o schema não estiver pronto na inicialização, o worker não tenta novamente

**Veredito:** PARCIAL  
**Prioridade:** Média — operação de desenvolvimento

**Evidência:** `accountDeletionWorker.ts:7–14` verifica a disponibilidade do schema uma vez e retorna uma função vazia se a migration ainda não estiver pronta; não agenda nova verificação nesse ramo.

**Trecho:** `if (!(await isAccountDeletionSchemaReady())) { ... return () => undefined; }`.

**Impacto:** aplicar a migration após esse worker ter iniciado não o reativa sozinho; será necessário reiniciar o processo ou adicionar uma política de nova tentativa antes de depender dele nessa situação.

### 13-010 — A purga e as cascatas não foram validadas por execução nesta auditoria

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta antes de declarar o fluxo integralmente aceito

**Evidência:** o prompt limita esta auditoria a leitura e proíbe execução de testes, mutações ou acesso a dados pessoais/de negócio. As referências históricas de testes em outros documentos não foram reproduzidas aqui. O bloco 14 separará validações estáticas, testes históricos e testes ainda necessários.

### 13-011 — O código distribui dados pessoais e sensíveis entre Accounts, Auth, Profiles, Feed e Media

**Afirmação da doc:** N/A — inventário técnico dos campos por schema solicitado pelo prompt.

**Veredito:** PARCIAL
**Risco:** Alto — o dossiê identifica as categorias principais, mas não comprova uma matriz completa de todos os campos, cópias, logs e fluxos de exportação.

**Evidência:**

| Domínio/tabela | Campos/categorias identificados em código |
|---|---|
| `accounts.accounts` | identificador, `username`, `age`, tipo/status da conta (`infra/database/src/schema/accounts/schema.ts:18–22`). |
| `accounts.account_emails` | e-mail normalizado e estado de verificação (`schema.ts:115–130`). |
| `security` | `password_hash`, hashes de tokens/sessões/dispositivos, e-mail pendente (`infra/database/src/schema/security/schema.ts:18,38–40,68,93`). |
| `profiles.account_profiles` | nome, sobrenome, nome de exibição, bio, localidade e site (`infra/database/src/schema/profiles/accountProfiles.ts:9–14`). |
| `profiles.business_profiles` | endereço, cidade, estado e país (`infra/database/src/schema/profiles/businessProfiles.ts:11–15`). |
| `feed` | texto de publicações/artigos, comentário, IDs de autor e referências de mídia (`infra/database/src/schema/feed/posts.ts:18–30`; `postComments.ts:28–36`). |
| `media.assets` | proprietário, chave de armazenamento, tipo, content type, tamanho e estado (`infra/database/src/schema/media/assets.ts:16–31`). |

**Logs:** `app.ts:18–30,62–78` registra método, URL sem query, status e somente nome/código para erro genérico; `common/logger.ts:5–19` redige Authorization/Cookie/Set-Cookie. Os avisos de envio de e-mail usam códigos de erro (`auth/application` e rotas de cadastro, ver bloco 09). O worker também registra `{ err: error }` (`auth/infrastructure/accountDeletionWorker.ts:29–31`); não foi inspecionado conteúdo de logs reais nem demonstrado que todas as mensagens de erro excluam dados pessoais.

**Limite:** não foram lidas linhas de negócio. O inventário é de colunas/código, não de valores armazenados; não cobre snapshots, backups ou serviços externos.

### 13-012 — A data de nascimento não é armazenada, mas a idade calculada continua persistida

**Afirmação da doc:** A pessoa informa a data para o backend validar 18+; idade não deve ser pública nem aparecer após o cadastro.

**Veredito:** PARCIAL
**Risco:** Médio — a data exata não é retida, mas o atributo calculado permanece em `accounts` e a auditoria não demonstra todos os consumidores nem a ausência em toda resposta privada.

**Evidência:** `accounts/domain/accountAgeEligibility.ts:42–70` valida data e retorna idade calculada. `accounts/infrastructure/accountRegistrationRepository.ts:56` persiste `age`; `infra/database/src/schema/accounts/schema.ts:21,69` declara a coluna e check `18 <= age <= 120`. Busca estática de `age`, `dateOfBirth`, `birthDate` e `birth_date` no backend/schema/contracts encontrou apenas o gate, o campo persistido, a constraint e o schema de cadastro; `04-004` confirma ausência no DTO público.

**Trecho:** `age: input.age`; `if (age < 18) ...; if (age > 120) ...; return { kind: "eligible", age };`.

**Limite:** a busca não substitui teste de todas as respostas privadas nem confirma o que a tela autenticada renderiza; nenhuma navegação foi executada.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 6 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** testes existentes, cobertura e validações permitidas sem executar mutações.
