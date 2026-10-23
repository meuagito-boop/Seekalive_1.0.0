---
name: Dados de demonstração Seekalive
description: Regra de exibição de fixtures em preview versus produção.
---

Dados fictícios de exemplo são permitidos no preview/desenvolvimento e não devem aparecer como registros no build de produção; telas sem API usam estados vazios. O usuário autorizou uma demonstração autenticada apenas na interface de desenvolvimento: perfil fictício em memória, sem conta de servidor nem sessão real. A demonstração não pode liberar nenhuma conta real sem e-mail confirmado. Não apagar nem atribuir automaticamente dados de chaves globais antigas, pois sua conta proprietária é desconhecida.

**Why:** o usuário quer conseguir explorar as telas internas no preview, sem alterar produção nem criar conta real. Contas reais continuam sujeitas à verificação obrigatória de e-mail.

**How to apply:** condicionar botão e faixa da demonstração a `import.meta.env.DEV`, não chamar API de autenticação/onboarding ao entrar no modo, e conferir que textos e registros fictícios conhecidos não aparecem no bundle de produção. Não remover nem migrar dados legados de propriedade ambígua sem autorização.
