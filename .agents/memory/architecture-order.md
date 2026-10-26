---
name: Ordem da reorganização
description: Ordem aprovada para reorganizar a arquitetura existente antes de avançar a etapas de banco e funcionalidades.
---

## Regra

Revisar e corrigir primeiro a estrutura existente do frontend e do backend, por domínio e responsabilidade real de arquivo. Avançar um domínio por vez, em ordem alfabética dentro de cada aplicativo; concluir e validar a pasta atual e apresentar o resultado para revisão antes da próxima. Não iniciar reconciliação/migração de banco nem novas funcionalidades enquanto essa etapa estrutural não estiver concluída.

Preservar contratos, APIs, regras, permissões e comportamento visual. Criar pastas ou mover código sem corrigir responsabilidades não conclui a etapa. Não alterar Gestor/Painel nem iniciar o Shop fora do escopo explicitamente autorizado.

**Why:** O usuário estabeleceu a reorganização front/back como primeiro passo, pediu separação sustentável por domínio e arquivos, e determinou que cada pasta seja concluída antes de seguir.

**How to apply:** Antes de qualquer trabalho no banco ou em novas capacidades, terminar o domínio ativo, validar imports e ciclos, rodar testes, typecheck e build aplicáveis, registrar o resultado no plano e aguardar a revisão do usuário antes de avançar.
