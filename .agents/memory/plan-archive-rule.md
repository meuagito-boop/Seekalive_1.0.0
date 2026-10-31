---
name: Arquivamento de planos
description: Guardar o prompt original do usuário e o plano correspondente juntos em Markdown dentro de docs.
---

## Regra

Para cada plano solicitado, salvar o prompt original do usuário e o plano apresentado pelo agente no mesmo arquivo Markdown em `Seekalive/Projeto/docs/planos/`. Registrar claramente se o plano está aprovado, aguardando aprovação ou não aprovado; uma resposta cancelada/dismissed não equivale a autorização para implementar.

**Why:** o usuário pediu rastreabilidade direta entre sua ordem e a proposta de execução, e a aprovação explícita deve permanecer separada da elaboração do plano.

**How to apply:** antes de implementar um plano, arquivar o prompt e o plano juntos, informar o caminho e aguardar aprovação quando solicitada. Não iniciar a implementação com base em uma confirmação cancelada.
