---
name: Bloqueio por conta
description: Política confirmada de bloqueio bilateral e remoção de relações entre contas.
---

Bloquear uma conta remove os seguimentos aceitos e solicitações pendentes entre as duas contas, nos dois sentidos; o Círculo deixa de existir porque é derivado de seguimento mútuo. Perfis, publicações, comentários, avaliações, conversas e interações ficam indisponíveis entre as contas enquanto o bloqueio durar. Mensagens antigas não são apagadas: ficam ocultas e reaparecem após desbloquear. Publicações, comentários e avaliações também não são apagados. Só a conta que iniciou o bloqueio pode removê-lo; desbloquear não restaura follows ou solicitações removidos.

**Why:** o usuário definiu que bloquear rompe os vínculos e faz cada conta desaparecer para a outra, com acesso de volta apenas pelo desbloqueio. Confirmou que conversas antigas devem ser ocultadas e restauradas, não apagadas.

**How to apply:** no frontend atual, guardar a relação no navegador por conta, remover ambos os follows e pedidos no momento do bloqueio, esconder conteúdo e histórico de mensagens nas duas direções, e mostrar um controle de desbloqueio apenas para o iniciador. No backend, fazer alterações relacionadas em transação e validar todos os endpoints.
