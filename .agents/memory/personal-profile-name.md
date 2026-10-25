---
name: Nome público do perfil pessoal
description: Regra de visibilidade para nome e sobrenome do cadastro pessoal.
---

No perfil pessoal, o nome e o sobrenome aparecem publicamente como o nome da pessoa, separados do @. No perfil comercial, aparece o nome do estabelecimento ou da empresa, também separado do @. O @ é o identificador social exclusivo da conta, não uma parte do nome.

**Why:** em 25 de outubro de 2026, o usuário esclareceu que nomes iguais são permitidos, enquanto o @ identifica cada conta de forma exclusiva.

**How to apply:** projetar o nome pessoal como `firstName + lastName` ou o nome comercial como `displayName`, sempre mostrando `username` em campo próprio. O nome público e o @ têm controles de alteração independentes, cada um com intervalo de 30 dias; a regra de reserva do @ fica em [username-policy.md](username-policy.md).
