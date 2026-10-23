---
name: Estratégia de autenticação Seekalive
description: Decisão do produto sobre manter login/cadastro demonstrativos e usar autenticação própria na API na fase de backend.
---

A autenticação será própria pela API, sem Clerk/OIDC. Até a implementação do backend, login, cadastro, verificação e recuperação permanecem demonstrativos no frontend. O contrato OpenAPI/SQL de autenticação própria foi autorizado como documentação proposta, mas não há endpoints ou banco implementados. O login deve aceitar nome de usuário ou e-mail.

**Why:** o produto priorizou concluir o frontend antes do backend; a preparação documental pode avançar sem criar handlers, migrations ou banco.

**How to apply:** não integrar provedor de autenticação nem tratar `localStorage` como identidade. Antes dos handlers, ainda aprovar a política de acesso para e-mail não verificado, provedor de e-mail e duração/retenção de sessão. A proposta documentada usa hash Argon2id, cookie de sessão seguro e CSRF.
