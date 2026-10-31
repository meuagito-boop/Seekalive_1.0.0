# 09 — E-mail e processamento assíncrono

## Escopo e método

Auditoria estática do caminho de envio de códigos/avisos e workers existentes. Segredos não foram lidos; não foi feita chamada HTTP ao Resend, envio de mensagem, nem execução de job.

## Achados

### 09-001 — O backend chama diretamente a API oficial do Resend

**Afirmação da doc:** N/A — verificação do provedor efetivamente usado no código.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a credencial é usada server-side; nenhum valor foi consultado ou registrado.

**Evidência:** `auth/infrastructure/emailDelivery.ts:36–41` lê apenas os nomes `RESEND_API_KEY`, `RESEND_ENABLED`, `RESEND_FROM_EMAIL`; `:62–76` envia `POST https://api.resend.com/emails` com bearer auth. Não foi encontrada chamada ao serviço de e-mail da Replit nesse transporte.

**Trecho:** `fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: \`Bearer ${resendApiKey}\` ... } })`.

### 09-002 — A entrega está fechada fora do ambiente de desenvolvimento

**Afirmação da doc:** A integração deve permanecer preparada, sem ativar envio real fora do desenvolvimento.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — configuração efetiva do processo não foi inspecionada.

**Evidência:** `emailDelivery.ts:37–41,58–60,87–92` exige `NODE_ENV=development`, `RESEND_ENABLED=true`, chave e remetente. Sem uma condição satisfeita, falha fechado.

**Trecho:** `if (!isDevelopment || !resendEnabled || !resendApiKey || !resendFrom) throw new EmailDeliveryUnavailableError();`.

### 09-003 — A chamada ao provedor tem timeout e não inclui o corpo da falha na resposta da aplicação

**Afirmação da doc:** N/A — verificação de timeout e exposição de erro.  
**Veredito:** CONFIRMADO  
**Risco:** Baixo — a operação síncrona pode falhar por indisponibilidade, mas tem limite de espera.

**Evidência:** `emailDelivery.ts:75–84` usa timeout de dez segundos e converte respostas não-2xx em erro que contém o status HTTP, não o corpo do provedor.

**Trecho:** `signal: AbortSignal.timeout(10_000)`; a falha gera `Resend email request failed with status ${response.status}.`.

### 09-004 — O envio não tem fila, outbox nem retry automático

**Afirmação da doc:** N/A — avaliação de entrega eventual.  
**Veredito:** PARCIAL  
**Risco:** Médio — queda do processo ou falha do provedor depende de nova solicitação e do fluxo chamador.

**Evidência:** `emailDelivery.ts:52–85` aguarda `fetch` diretamente. A busca estática por outbox/fila no domínio Auth não encontrou worker que persista e reenvie mensagens.

**Trecho:** `await fetch(...)`; o método retorna ou lança após a resposta sem publicar evento durável.

### 09-005 — Um adaptador atende códigos de cadastro, sessão e alterações de conta

**Afirmação da doc:** N/A — inventário dos usos do e-mail transacional.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — alterações no adaptador afetam múltiplos fluxos de Auth.

**Evidência:** `emailDelivery.ts:89–179` define métodos para verificação, reset/alteração de senha, dispositivo novo, troca de e-mail e exclusão/restauração. `auth/composition/*` os injeta nos fluxos. O adaptador falso é habilitado somente com `NODE_ENV=test` (`:19–34`).

### 09-006 — Valores interpolados nos templates HTML são escapados

**Afirmação da doc:** N/A — verificação de injeção HTML nos templates de e-mail.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — reduz XSS/injeção no corpo de HTML para os campos tratados.

**Evidência:** `emailDelivery.ts:43–50,92–99,109–116,154–162` escapa caracteres HTML e aplica o escape aos nomes e valores mascarados antes de interpolá-los.

**Trecho:** codifica `&`, `<`, `>`, `"`, `'` para entidades HTML.

### 09-007 — Envio real e configuração ativa não foram verificados

**Afirmação da doc:** N/A — limite de leitura-only do prompt.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — a implementação no código não prova que o provedor ou remetente esteja operacional.

**Evidência:** nenhuma chamada HTTP ao Resend ou mensagem foi feita; nenhum valor de variável de ambiente foi lido. O prompt proíbe acesso a segredos e efeitos externos.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 1 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |
