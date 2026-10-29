---
name: Bancos de dados por domínio
description: Regra de ownership físico dos bancos e limites para integrações entre domínios.
---

## Regra

Cada domínio terá seu próprio banco de dados físico. Schemas separados dentro de uma instância compartilhada não satisfazem essa arquitetura. Essa decisão não significa dividir o aplicativo modular em serviços independentes.

Não criar FKs nem depender de transações SQL entre bancos de domínios diferentes. As integrações devem usar contratos explícitos e coordenação idempotente, com falhas parciais e reconciliação tratadas antes de assumir atomicidade entre domínios.

O banco compartilhado existente é estado de desenvolvimento/transição, não a arquitetura-alvo. Uma migration deve ser direcionada ao banco do domínio proprietário, não aplicada ao banco compartilhado apenas porque o schema lógico existe ali.

**Why:** Em 29/10/2026, o usuário definiu que cada banco será criado por domínio; a separação física é uma decisão explícita, não uma recomendação técnica a ser substituída silenciosamente por schemas.

**How to apply:** Ao planejar bancos, migrations ou fluxos multi-domínio, conferir se cada alteração atinge o banco proprietário correto e se a integração funciona sem transação compartilhada. Não provisionar, migrar nem alterar produção por inferência. Manter o monólito modular até que o usuário peça outra topologia.
