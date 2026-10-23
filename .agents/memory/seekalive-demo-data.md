---
name: Dados de demonstração Seekalive
description: Regra de exibição de fixtures em preview versus produção.
---

Dados de exemplo usados como registros devem aparecer somente no preview/desenvolvimento. Build de produção não mostra fixtures; telas sem API usam estados vazios. O usuário permite mockups fictícios na apresentação somente como imagens estáticas, sem registro/interação. Conteúdo criado no navegador continua local, não compartilhado.

**Why:** o usuário confirmou que quer ver mocks durante a construção, mas não quer que dados inventados pareçam registros reais em produção.

**How to apply:** proteger cada fonte de fixture com a condição de desenvolvimento, revisar tendências/recomendações/catálogos e manter estados vazios acessíveis quando a API ainda não estiver conectada. Só exibir exemplos fictícios em produção como uma imagem estática não interativa; não apagar dados locais do navegador.
