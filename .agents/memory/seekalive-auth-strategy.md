---
name: Estratégia de autenticação Seekalive
description: Regra do produto para autenticação própria e bloqueio de contas sem e-mail confirmado.
---

Autenticação própria pela API, sem Clerk/OIDC. O login aceita nome de usuário ou e-mail. Conta real sem e-mail confirmado não pode entrar nem acessar recursos. Cadastro permanece pendente e sem sessão até a confirmação; somente então a API pode emitir a primeira sessão. A exceção autorizada é a demonstração fictícia apenas no preview de desenvolvimento, sem conta ou sessão real. O envio de verificação por Resend está autorizado e confirmado em desenvolvimento; produção permanece desativada até configuração e validação explícitas.

**Why:** o usuário definiu a verificação de e-mail como requisito de segurança para contas reais, autorizou um modo separado de preview e confirmou que recebeu o e-mail enviado pelo Resend no teste.

**How to apply:** aplicar a regra no servidor em todas as rotas protegidas; o modo fictício deve ser somente frontend, não persistir sessão e estar ausente em produção. Usar o Resend em desenvolvimento com a chave apenas em Secrets e manter o envio explicitamente desativado em produção até aprovação e configuração próprias. Se o envio estiver indisponível, falhar explicitamente em vez de criar conta real acessível sem confirmação.
