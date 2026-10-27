---
name: Preservar emails de autenticação
description: Regras obrigatórias ao reorganizar composição e entrega de emails no Auth.
---

Qualquer reorganização da arquitetura de autenticação deve preservar integralmente os emails exigidos pelos fluxos. Mover tipos ou injetar o provedor pela composição não autoriza remover mensagens, chamadas de envio, respostas de falha, indisponibilidade ou invalidação dos desafios.

**Why:** O usuário reiterou explicitamente que a arquitetura não pode simplificar nem retirar a entrega de email exigida pelo produto.

**How to apply:** Antes de concluir uma mudança de camadas, conferir que todos os métodos do provedor continuam conectados e testar envio, indisponibilidade e falha de entrega nos fluxos afetados.
