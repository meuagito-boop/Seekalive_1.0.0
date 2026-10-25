---
name: Política de nome de usuário
description: Regras de retenção do identificador antigo quando o titular troca o @.
---

O @ inicial não pode ser alterado nos primeiros 30 dias da conta. Depois de uma troca, o @ anterior fica indisponível para todas as contas — inclusive para o titular anterior — por 30 dias e depois pode ser liberado. Antes de confirmar a troca, o app deve explicar essa consequência. Ainda falta decidir se cada troca posterior também exige intervalo de 30 dias.

**Why:** o usuário quer impedir que alguém, inclusive o titular anterior, reutilize o @ antes do fim do prazo e exige aviso explícito antes de perder o acesso ao identificador.

**How to apply:** tratar o prazo mínimo e a retenção como regras do servidor, cobrindo cadastro e alterações, não como filtro apenas de interface. Resolver o intervalo entre alterações posteriores e então implementar reserva atômica, aviso de confirmação e testes de concorrência.
