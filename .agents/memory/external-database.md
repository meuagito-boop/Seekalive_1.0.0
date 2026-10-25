---
name: Banco externo Seekalive
description: Direção do usuário para hospedar PostgreSQL fora da Replit e validar com segurança os ambientes de banco.
---

O usuário decidiu que o backend Seekalive deverá usar um PostgreSQL hospedado fora da Replit e escolheu preparar o código agora, adicionando depois a conexão pelo segredo seguro. O provedor ainda não foi conectado nem provisionado; Neon é apenas uma opção recomendada, não uma escolha confirmada.

Em 24/10/2026, o usuário confirmou que Shop e Confiança e Segurança de Conteúdo devem ter bancos lógicos próprios, além dos dez domínios nomeados no prompt de bancos independentes. Shop cobre por ora o catálogo; Confiança e Segurança cobre denúncias e ações de moderação. Isso não aprova pedidos, estoque, pagamentos ou entrega, nem logs gerais de auditoria. Durante desenvolvimento, vários bancos lógicos podem compartilhar uma instância PostgreSQL se o provedor permitir, mas devem ter credenciais e permissões por domínio conforme o projeto.

Não sobrescrever `DATABASE_URL`, que é variável runtime gerenciada pela Replit. A conexão externa usa o segredo separado `SEEKALIVE_EXTERNAL_DATABASE_URL`, selecionado no runtime por `SEEKALIVE_DATABASE_TARGET=external`. Migrações são controladas separadamente por `SEEKALIVE_DB_MIGRATION_TARGET=external`; o pós-merge deve continuar fixo em Replit. Nunca expor conexão ou credenciais ao frontend ou ao chat.

Não executar DDL ou testes com escrita quando o runtime estiver marcado como produção. O nome do banco, isoladamente, não prova que duas conexões chegam ao mesmo servidor; se não for possível confirmar o alvo, interromper antes de escrever.

O schema externo deve ser alterado por SQL versionado, não por sincronização implícita. A geração não conecta ao banco; qualquer aplicação manual exige alvo explícito. O pós-merge de desenvolvimento permanece fixado no banco Replit enquanto a conexão externa não for aprovada e configurada. A migração inicial gerada cobre somente as 11 tabelas atuais de conta/social e destina-se a um banco vazio; não substitui um plano de migração de dados ou delta para banco existente.

**Why:** o usuário pediu explicitamente hospedagem externa, preparação do backend sem conexão imediata e bancos lógicos separados para Shop e Confiança e Segurança. O provedor ainda não foi escolhido/conectado; alvo obrigatório e migrações explícitas evitam gravar schema no banco errado, enquanto o pós-merge em desenvolvimento preserva o preview atual.

**How to apply:** provisionar/conectar somente após escolha do provedor; planejar bancos lógicos separados por domínio com credenciais e migrações próprias; gerar migrações do schema Drizzle, revisar SQL e ambiente, confirmar que o alvo é o banco externo de desenvolvimento, configurar URL via Secrets e só então executar manualmente. Não usar a migração inicial em banco com tabelas/dados sem plano de baseline/delta, e confirmar o ambiente antes de qualquer escrita.
