---
name: Dados de demonstração Seekalive
description: Regra de exibição de fixtures em preview versus produção.
---

Dados de exemplo usados como registros devem aparecer somente no preview/desenvolvimento. Build de produção não mostra fixtures; telas sem API usam estados vazios. O usuário permite mockups fictícios na apresentação somente como imagens estáticas, sem registro/interação. Conteúdo criado no navegador continua local, não compartilhado.

**Why:** o usuário quer mocks no preview, mas não registros fictícios em produção; verificações também mostraram que guardas de interface, sozinhas, podem deixar literais fictícios no JavaScript quando módulos de fixtures têm cálculos no topo.

**How to apply:** proteger cada fonte de fixture com a condição de desenvolvimento, tratar módulos exclusivos de mocks como sem efeitos de importação no build, e verificar o bundle final por nomes conhecidos. Manter estados vazios; só exibir exemplos fictícios em produção como imagem estática não interativa; não apagar dados locais.
