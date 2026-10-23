---
name: Aprovação de seguimento em perfis privados
description: Regra de produto para pedidos de seguimento, acesso às publicações privadas e Círculo.
---

Em um perfil privado, cada novo seguidor precisa ser aprovado pelo dono. Pedido pendente não cria seguimento efetivo e não concede acesso. Depois da aprovação, a pessoa pode ver as publicações com audiência pública do perfil, sem que o dono precise segui-la de volta. Publicações destinadas ao Círculo continuam exigindo seguimento efetivo nos dois sentidos. O Círculo é derivado, não tem pedidos ou aprovações próprios.

**Why:** o produto separa a autorização para seguir uma conta privada do acesso de Círculo, que exige reciprocidade.

**How to apply:** aplicar a mesma regra na interface, nos contratos de API e na autorização do servidor; não persistir pedidos como seguimentos aceitos antes da aprovação.
