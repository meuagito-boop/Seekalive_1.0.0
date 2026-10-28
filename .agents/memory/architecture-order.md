---
name: Ordem da reorganização
description: Ordem aprovada para reorganizar a arquitetura existente antes de avançar a etapas de banco e funcionalidades.
---

## Regra

Revisar e corrigir primeiro a estrutura existente do frontend e do backend, por domínio e responsabilidade real de arquivo. Avançar um domínio por vez, em ordem alfabética dentro de cada aplicativo; concluir e validar a pasta atual e apresentar o resultado para revisão antes da próxima. Não iniciar reconciliação/migração de banco, novas capacidades de segurança, mensageria, filas, algoritmo ou outras funcionalidades enquanto essa etapa estrutural não estiver concluída e revisada pelo usuário. Depois, seguir a construção backend por etapas aprovadas, sem inferir a ordem entre frentes posteriores.

Preservar contratos, APIs, regras, permissões e comportamento visual. Criar pastas ou mover código sem corrigir responsabilidades não conclui a etapa. Não alterar Gestor/Painel nem iniciar o Shop fora do escopo explicitamente autorizado.

**Why:** O usuário reafirmou em 28/10/2026 que a prioridade é organizar o que já foi construído e que banco, segurança, mensageria, filas e algoritmo ficam para etapas posteriores. Ele recusou aplicar `feed.posts` agora por estar fora do escopo ativo.

**How to apply:** Manter o Gate 0A como única frente ativa. Terminar o domínio atual, validar imports e ciclos, rodar testes, typecheck e build aplicáveis, registrar o resultado no plano e aguardar a revisão do usuário. Não voltar ao banco nem implementar novas capacidades até essa revisão.

## Composição de estado no frontend

É aceitável manter um provider global no módulo `app` como raiz de composição do estado cliente quando reducers, políticas e ações continuam nos módulos proprietários. Não fragmentar contextos apenas para aparentar separação; avaliar a largura da API e medir rerenderizações antes de propor extração.

**Why:** A separação por domínio exige propriedade real das regras, mas o app ainda precisa compor sessão, navegação e estado compartilhado entre módulos.

**How to apply:** Ao revisar cada domínio, mantenha suas regras no módulo correspondente. Só mova providers/contratos globais quando houver violação concreta de propriedade ou evidência de desempenho, preservando testes e comportamento.
