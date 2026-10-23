---
name: Bloqueio por conta
description: Política confirmada de bloqueio mútuo e sua implementação local antes do backend.
---

O bloqueio é uma relação iniciada por uma conta contra outra. Enquanto a relação existir, ambas as contas deixam de ver os perfis e conteúdos uma da outra e não podem iniciar novas interações entre si. Só a conta que iniciou a relação pode removê-la. Bloquear não apaga seguimentos aceitos; ao desbloquear, esses seguimentos voltam a valer.

**Why:** o usuário confirmou que a conta bloqueada também deve deixar de ver ou interagir com quem bloqueou. Foi confirmado manter seguimentos existentes em vez de removê-los durante o bloqueio.

**How to apply:** no frontend atual, manter as relações isoladas por conta no navegador e derivar a indisponibilidade para os dois lados. Ao criar o backend, aplicar a mesma regra em leitura, busca, feed, comentários, mensagens, seguir e solicitações; somente o iniciador pode remover seu bloqueio.
