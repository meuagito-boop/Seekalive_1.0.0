---
name: Identificação do ambiente Replit
description: Marcadores oficiais para diferenciar o Repl de desenvolvimento de um runtime publicado.
---

A documentação oficial do Replit identifica a implantação publicada com `REPLIT_DEPLOYMENT=1`; quando `REPLIT_DEPLOYMENT` não está definido, o projeto está em desenvolvimento. `REPLIT_DEV_DOMAIN` contém o domínio dev. O projeto Seekalive está em desenvolvimento; `REPLIT_ENVIRONMENT=production` apareceu no shell, mas não é o marcador oficial e não deve, sozinho, classificar o projeto como produção.

**Why:** o guard dos testes isolados bloqueou incorretamente uma execução de desenvolvimento ao confiar em `REPLIT_ENVIRONMENT`.

**How to apply:** em testes de escrita e scripts de schema, bloquear `NODE_ENV=production` e/ou `REPLIT_DEPLOYMENT` definido. Confirmar o banco-alvo por `current_database()` e opt-in explícito; não contornar bloqueios com valores de ambiente fabricados.
