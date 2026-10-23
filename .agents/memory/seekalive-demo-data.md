---
name: Dados de demonstração Seekalive
description: Regra de exibição de fixtures em preview versus produção.
---

Dados de exemplo usados como registros devem aparecer somente no preview/desenvolvimento. Build de produção não mostra fixtures; telas sem API usam estados vazios. O usuário permite mockups fictícios na apresentação somente como imagens estáticas, sem registro/interação. Até a conclusão do frontend e autorização explícita do usuário, não adicionar backend/banco: dados interativos ficam no navegador, sem sincronização entre dispositivos; preferências e ações pessoais devem ser separadas por conta. Não apagar nem atribuir automaticamente dados de chaves globais antigas, pois sua conta proprietária é desconhecida. Essa separação é de interface, não uma fronteira de segurança.

**Why:** o usuário quer mocks no preview, mas não registros fictícios em produção; verificações também mostraram que guardas de interface, sozinhas, podem deixar literais fictícios no JavaScript quando módulos de fixtures têm cálculos no topo. O usuário determinou que o trabalho siga no frontend antes de backend e banco de dados.

**How to apply:** proteger cada fonte de fixture com a condição de desenvolvimento, tratar módulos exclusivos de mocks como sem efeitos de importação no build, e verificar o bundle final por nomes conhecidos. Manter estados vazios; só exibir exemplos fictícios em produção como imagem estática não interativa. Persistir conteúdo e preferências somente em armazenamento do navegador; separar por conta sem migrar chaves legadas ambíguas; não configurar API/banco nem apagar dados locais até nova autorização.
