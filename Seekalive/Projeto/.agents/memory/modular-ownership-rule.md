---
name: Separação modular obrigatória
description: Regra permanente do projeto para organização, propriedade de domínio e avanço entre etapas.
---

Cada lógica deve ficar em arquivo próprio, dentro da pasta do domínio que a possui. Evitar arquivos que misturem fluxos ou façam a lógica de vários domínios; separar perfil pessoal e comercial. A camada de apresentação deve delegar regras de negócio e persistência às camadas próprias. Tipos compartilhados e tokens visuais devem ter origem central clara, sem cópias divergentes.

Não considerar uma etapa concluída nem avançar para outro módulo enquanto a etapa atual tiver pendências de organização, funcionamento ou validação. Em tarefas de arquitetura, não alterar portas, workflows ou funcionalidades fora do escopo pedido.

**Why:** O usuário repetiu que a manutenção depende de responsabilidades explícitas por arquivo e domínio, e que mudanças fora do escopo ou avanço com pendências quebram sua confiança no projeto.

**How to apply:** Antes de editar, conferir as fronteiras de domínio existentes; manter rotas finas e casos de uso/repositórios separados; ao final, relatar pendências reais e distinguir o que foi testado do que não foi.
