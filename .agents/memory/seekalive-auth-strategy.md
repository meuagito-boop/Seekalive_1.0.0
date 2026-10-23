---
name: Estratégia de autenticação Seekalive
description: Decisão do produto sobre manter login/cadastro demonstrativos e usar autenticação própria na API na fase de backend.
---

A autenticação será própria pela API, não Clerk/OIDC. Até o início do backend, login, cadastro, verificação e recuperação permanecem fluxos demonstrativos no frontend. O requisito existente de login por nome de usuário ou e-mail deve ser preservado.

**Why:** o produto está priorizando concluir e revisar o frontend antes de iniciar backend ou banco de dados.

**How to apply:** não integrar provedor de autenticação nem tratar `localStorage` como identidade. Ao começar o backend, revisar os rascunhos OIDC no OpenAPI/SQL e definir credenciais seguras, sessão, CSRF, e-mail de verificação e recuperação antes de implementar.
