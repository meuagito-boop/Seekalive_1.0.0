---
name: Estratégia de autenticação Seekalive
description: Regra do produto para autenticação própria e bloqueio de contas sem e-mail confirmado.
---

Autenticação própria pela API, sem Clerk/OIDC. O login aceita nome de usuário ou e-mail. Conta sem e-mail confirmado não pode entrar nem acessar recursos. Cadastro permanece pendente e sem sessão até a confirmação; somente então a API pode emitir a primeira sessão.

**Why:** o usuário definiu explicitamente que conta com e-mail não validado não acessa o aplicativo, como requisito de segurança.

**How to apply:** não tratar `localStorage` como autenticação e aplicar a regra no servidor em todas as rotas protegidas. Não oferecer modo demonstrativo que contorne a verificação. Se o envio de e-mail estiver indisponível, falhar explicitamente em vez de criar conta acessível sem confirmação.
