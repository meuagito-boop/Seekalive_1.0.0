# 08 — E-mail transacional e Resend

## Escopo

Auditoria estática da entrega de códigos e avisos de segurança. Segredos não foram lidos; nenhum valor de ambiente foi consultado e nenhum e-mail foi enviado durante esta auditoria.

## Achados

### 08-001 — O backend chama diretamente a API oficial do Resend

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `Aplicativo/back/src/modules/auth/infrastructure/emailDelivery.ts:36–41` lê somente os nomes de configuração `RESEND_API_KEY`, `RESEND_ENABLED` e `RESEND_FROM_EMAIL`. `:62–76` faz `POST` server-side para `https://api.resend.com/emails`, com a chave em `Authorization: Bearer ...`; não há chamada a API de faturamento ou proxy de e-mail da Replit neste caminho. A busca no backend por `resend` localizou esse transporte.

**Trecho:** `fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: \`Bearer ${resendApiKey}\` ... } })`.

**Segurança:** nenhum valor da chave foi lido, reproduzido ou incluído neste dossiê.

### 08-002 — O envio está explicitamente desativado fora do desenvolvimento

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `emailDelivery.ts:37–41,58–60,87–92` exige `NODE_ENV=development`, `RESEND_ENABLED=true`, chave e remetente. O remetente de teste é usado somente em desenvolvimento; fora dele não há remetente padrão e o envio falha fechado.

**Trecho:** `if (!isDevelopment || !resendEnabled || !resendApiKey || !resendFrom) throw new EmailDeliveryUnavailableError();`.

**Limite:** isto descreve a proteção do código. A configuração efetiva do processo não foi consultada nesta auditoria.

### 08-003 — A integração usa timeout e não expõe corpo de erro do provedor

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `emailDelivery.ts:75` define timeout de 10 segundos. Em resposta não-2xx, `:78–84` lança erro com o status e comenta que não registra corpo de resposta nem credenciais.

**Trecho:** `signal: AbortSignal.timeout(10_000)`; falha gera `Resend email request failed with status ${response.status}.`.

### 08-004 — O transporte não tem fila/outbox nem repetição automática

**Veredito:** PARCIAL  
**Prioridade:** Média antes de depender de entrega garantida

**Evidência:** o envio é uma chamada `fetch` síncrona (`emailDelivery.ts:52–85`). A busca estática por fila/outbox no domínio Auth não encontrou um worker ou mecanismo de repetição ligado ao envio.

**Trecho:** `await fetch(...)`; o método retorna ou lança após essa resposta, sem publicar uma mensagem em fila.

**Impacto:** timeout ou indisponibilidade do provedor depende do fluxo de erro e de nova solicitação do usuário; não há entrega eventual garantida pelo código examinado.

### 08-005 — O mesmo adaptador cobre os códigos e avisos de Auth

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `emailDelivery.ts:89–179` contém métodos separados para verificação de e-mail, redefinição/alteração de senha, novo dispositivo, troca de e-mail e exclusão/restauração. `auth/composition/*` injeta `getAuthEmailDelivery` nos respectivos fluxos. O substituto de testes só pode ser configurado quando `NODE_ENV=test` (`:19–34`).

**Trecho:** `setAuthEmailDeliveryForTests` lança erro se `process.env.NODE_ENV !== "test"`.

### 08-006 — Nomes de exibição e valores mascarados são escapados no HTML

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `emailDelivery.ts:43–50` codifica caracteres HTML; os templates HTML usam os valores escapados em nomes de exibição e e-mail mascarado (`:92–99,109–116,154–162`). Os códigos e textos também são enviados como conteúdo de texto simples.

**Trecho:** `replaceAll("&", "&amp;")`, `replaceAll("<", "&lt;")`, `replaceAll("'", "&#39;")`.

### 08-007 — O funcionamento atual do provedor não foi testado nesta auditoria

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Média

**Evidência:** por ser uma auditoria somente leitura, não houve chamada HTTP ao Resend nem envio de mensagem. A presença e validade dos segredos/configuração do processo não foram verificadas; nenhum valor foi acessado.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 1 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** controles transversais de segurança, abuso, rate limits, logs e configuração do processo.
