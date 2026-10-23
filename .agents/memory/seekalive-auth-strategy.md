---
name: Estratégia de autenticação Seekalive
description: Regra do produto para autenticação própria e bloqueio de contas sem e-mail confirmado.
---

Autenticação própria pela API, sem Clerk/OIDC. O login aceita nome de usuário ou e-mail. Conta real sem e-mail confirmado não pode entrar nem acessar recursos. Cadastro permanece pendente e sem sessão até a confirmação; somente então a API pode emitir a primeira sessão. A exceção autorizada é a demonstração fictícia apenas no preview de desenvolvimento, sem conta ou sessão real.

**Why:** o usuário definiu a verificação de e-mail como requisito de segurança para contas reais e depois autorizou um modo separado para visualizar o frontend durante o desenvolvimento.

**How to apply:** aplicar a regra no servidor em todas as rotas protegidas; o modo fictício deve ser somente frontend, não persistir sessão e estar ausente em produção. Se o envio de e-mail estiver indisponível, falhar explicitamente em vez de criar conta real acessível sem confirmação.
