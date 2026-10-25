---
name: Política de nome de usuário
description: Regras de retenção do identificador antigo quando o titular troca o @.
---

Quando o titular troca o nome de usuário, o @ anterior deve ficar reservado por 30 dias e depois pode ser liberado para outra conta. A possibilidade de o titular original recuperá-lo durante esse prazo ainda precisa de decisão.

**Why:** o usuário quer reduzir o risco de outra conta assumir imediatamente a identidade associada ao identificador anterior.

**How to apply:** tratar a retenção como regra de servidor que deve valer para cadastro e alterações de username, não como filtro apenas de interface. Confirmar primeiro a regra de recuperação pelo titular original e depois implementar reserva atômica e testes de concorrência.
