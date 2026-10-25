---
name: Política de nome de usuário
description: Regras de retenção do identificador antigo quando o titular troca o @.
---

O nome público e o @ são campos distintos e cada um só pode ser alterado uma vez a cada 30 dias. A primeira alteração de cada campo só é permitida 30 dias após o registro; as seguintes, 30 dias após a última alteração daquele campo. Ao trocar o @, o identificador anterior fica indisponível para todas as contas — inclusive para a conta que o deixou — por 30 dias e depois pode ser reutilizado. Antes de confirmar a troca do @, o app deve explicar essa consequência. A regra vale para contas pessoais e comerciais.

**Why:** em 25 de outubro de 2026, o usuário definiu o nome e o @ como dados distintos, ambos com intervalo de 30 dias, e o @ antigo como reservado por 30 dias após deixar de ser usado.

**How to apply:** aplicar no servidor a janela inicial e o intervalo independente para o nome público e o @, cobrindo alteração pessoal e comercial. Fazer a reserva do @ antigo atomicamente; nenhuma conta, nem a original, pode reutilizá-lo antes do prazo. Mostrar a próxima data permitida e avisar antes da confirmação.
