---
name: Política de nome de usuário
description: Regras de retenção do identificador antigo quando o titular troca o @.
---

O @ inicial só pode ser alterado 30 dias após o registro da conta; cada alteração seguinte só pode ocorrer 30 dias após a troca anterior. Depois de uma troca, o @ anterior fica indisponível para todas as contas — inclusive para o titular anterior — por 30 dias e depois pode ser liberado. Antes de confirmar, o app deve explicar essa consequência.

**Why:** o usuário quer impedir alterações frequentes e evitar que alguém, inclusive o titular anterior, reutilize o @ antes do fim do prazo. A consequência deve ser conhecida antes da confirmação.

**How to apply:** tratar a janela inicial, o intervalo entre trocas e a retenção como regras do servidor, cobrindo cadastro e alterações, não como filtro apenas de interface. Implementar reserva atômica, aviso de confirmação e testes de concorrência.
