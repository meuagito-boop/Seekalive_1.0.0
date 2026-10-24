---
name: Banco externo Seekalive
description: Direção do usuário para hospedar PostgreSQL fora da Replit e validar com segurança os ambientes de banco.
---

O usuário decidiu que o backend Seekalive deverá usar um PostgreSQL hospedado fora da Replit. O provedor ainda não foi conectado nem provisionado; Neon é apenas uma opção recomendada, não uma escolha confirmada.

Não sobrescrever `DATABASE_URL`, que é variável runtime gerenciada pela Replit. A conexão externa deve ser configurada como segredo separado, usado somente pelo backend; nunca expor conexão ou credenciais ao frontend ou ao chat.

Não executar DDL ou testes com escrita quando o runtime estiver marcado como produção. O nome do banco, isoladamente, não prova que duas conexões chegam ao mesmo servidor; se não for possível confirmar o alvo, interromper antes de escrever.

**Why:** o usuário pediu explicitamente hospedagem externa e a execução de teste foi bloqueada por um marcador de produção, sem prova suficiente da identidade do servidor.

**How to apply:** ao retomar a configuração, conectar o provedor escolhido, definir o segredo externo pelo fluxo seguro, manter migrações explícitas e confirmar o ambiente/alvo antes de qualquer escrita.
