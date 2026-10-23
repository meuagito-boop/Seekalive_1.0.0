---
name: Estratégia de autenticação Seekalive
description: Decisão do produto sobre manter login/cadastro demonstrativos e usar autenticação própria na API na fase de backend.
---

A autenticação será própria pela API, sem Clerk/OIDC. Até a implementação do backend, login, cadastro, verificação e recuperação permanecem demonstrativos no frontend. O contrato OpenAPI/SQL de autenticação própria foi autorizado como documentação proposta, mas não há endpoints ou banco implementados. O login aceita nome de usuário ou e-mail; conta sem e-mail confirmado não pode entrar nem acessar recursos. Cadastro fica pendente e sem sessão até a confirmação.

**Why:** o usuário definiu a verificação de e-mail como requisito de segurança obrigatório. A preparação documental pode avançar sem criar handlers, migrations ou banco.

**How to apply:** não integrar provedor de autenticação nem tratar `localStorage` como identidade. Só emitir sessão depois de ativar a conta com token de verificação de uso único. Escolher serviço de envio e duração/retenção de sessão antes de handlers. A proposta usa hash Argon2id, cookie de sessão seguro e CSRF.
