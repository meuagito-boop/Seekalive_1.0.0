# 05 — Banco de dados, migrations e integridade

## Método e limites

Inspecionei apenas arquivos de schema/migration e metadados do banco **de desenvolvimento**. As consultas foram executadas por `executeSql` no ambiente `development`; não houve leitura de linhas de negócio, contagem de registros, DDL, aplicação de migration, `push` ou teste de baseline.

### Consultas de catálogo executadas

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

**Saída resumida:** tabelas de aplicação listadas em `accounts`, `security`, `profiles`, `feed` e `media`, além das tabelas de histórico em `drizzle`. Não apareceu `profiles.business_profile_reviews`; tampouco apareceram tabelas de aplicação para `seek`, `messages`, `notifications`, `search`, `location`, `shop` ou `trust_safety`.

Também foram executadas consultas somente a `information_schema.columns`, `information_schema.table_constraints`, `pg_constraint` e `pg_indexes` para colunas, restrições e índices. A consulta de colunas não incluiu valores de contas. A consulta de restrições identificou FKs e checks; a de índices identificou unicidade e índices de consulta.

## Achados

### 05-001 — A separação lógica atual corresponde aos domínios construídos e à referência

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** a referência `attached_assets/SeekAlive_Arquitetura_Banco_Dados_por_Dominio_1793363320056.md:112–122` agrupa “Perfis e relações” e separa Contas de Segurança; `:213–223` permite uma infraestrutura PostgreSQL compartilhada durante o desenvolvimento. A tabela de catálogo confirmou esquemas de aplicação de Contas, Segurança, Perfis e Relações, Feed e Mídias. O esquema `seek` não tem tabela de aplicação no catálogo; isso é compatível com o escopo ainda não construído, não uma falha por si só.

**Conclusão:** há separação lógica; não há dez bancos físicos independentes. Isso corresponde à decisão registrada para o estágio de desenvolvimento.

### 05-002 — A migration de reviews existe, mas a tabela não está no banco de desenvolvimento

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `infra/database/src/schema/profiles/businessProfileReviews.ts` define a tabela e `infra/database/migrations/profiles/0003_misty_rhodey.sql` a cria. A consulta de catálogo acima não retornou `profiles.business_profile_reviews`. A documentação de API `docs/api/backend/endpoints.md:86–89` já identifica as rotas de reviews como dependentes do banco.

**Conclusão:** a estrutura está preparada em código/migration, mas a persistência não está presente no banco observado. Não determinei o estado do ledger de migrations, pois o prompt restringe a auditoria a metadados e não exige a leitura de conteúdo de ledger.

### 05-003 — As FKs entre domínios dependem da mesma instância PostgreSQL

**Veredito:** PARCIAL  
**Prioridade:** Alta, para futura separação física

**Evidência:** a consulta de constraints retornou FKs de `security`, `profiles`, `feed` e `media` para `accounts.accounts`, além de `media.assets.post_id` para `feed.posts`. A referência arquitetural `:207–211` registra que bancos físicos independentes não manterão essas FKs cruzadas e que a integridade deverá migrar para interfaces, validações e processos.

**Impacto:** adequado enquanto os domínios compartilham o banco de desenvolvimento, mas a exclusão em cascata e a integridade hoje garantidas pelo PostgreSQL não serão transportáveis diretamente para bancos físicos separados. Isso exige um fluxo coordenado por domínio antes da separação física; não foi implementado neste escopo.

### 05-004 — O teste de baseline não valida a cadeia completa das migrations ativas

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `infra/database/scripts/test-migration-baselines.mjs:128–140` lê apenas `0000_baseline.sql` de cada trilha; `:167–190` aplica especificamente as migrations Profiles `0001` e `0002` para a transferência histórica. O pacote oferece `test:baselines`, enquanto `migrationTrackConfig.ts:4–30` define as trilhas de geração/aplicação.

**Conclusão:** o teste protege uma transição histórica de baseline; não demonstra replay integral das migrations atuais, inclusive Profiles `0003` nem Feed `0003`. Não executei o teste conforme o escopo.

### 05-005 — Há migrations antigas na raiz sem trilha ativa apontada pela configuração atual

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `find infra/database/migrations -type f -name '*.sql'` listou arquivos `0000`–`0006` diretamente na raiz e trilhas separadas em subpastas. `migrationTrackConfig.ts:4–30` define somente `accounts`, `security`, `profiles`, `feed` e `media`, e grava migrations em `./migrations/${name}` (`:49–60`). Não localizei referência desses sete arquivos raiz na configuração de trilhas ou nos scripts atuais.

**Impacto:** o estado de legado/arquivo histórico não está explicitado por um manifesto encontrado. Não os removi: falta comprovação de que sejam descartáveis e o escopo proíbe limpeza fora do dossiê.

### 05-006 — Seek não tem trilha ativa, mas ainda aparece em configurações de schema e no teste de transferência

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `migrationTrackConfig.ts:4–30` não define trilha ativa para Seek. `infra/database/package.json:12–24` limita geração, verificação e migração aos cinco domínios ativos. `drizzle.push.config.ts:7–14` ainda inclui o glob `src/schema/seek/*.ts`, mas `find infra/database/src/schema -maxdepth 2 -type f -name '*.ts'` não encontrou arquivos de schema Seek. `test-migration-baselines.mjs:23–31,128–140` ainda lê o baseline histórico Seek para testar a transferência do perfil comercial.

**Conclusão:** a ausência de tabelas Seek é coerente com o módulo não construído e com Profiles como proprietário atual do perfil comercial. O glob vazio em `push` é uma diferença de configuração; seu efeito não foi testado, pois executar `push` está proibido.

### 05-007 — A constraint de idade adiciona limite superior não aprovado

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** a consulta de catálogo retornou `accounts_age_adult_range: CHECK (age >= 18 AND age <= 120)`. A consulta de colunas retornou `accounts.age` como `smallint NOT NULL`. A regra definida pelo usuário é idade mínima de 18 anos; não foi encontrada aprovação de idade máxima de 120.

**Conclusão:** o mínimo está protegido no banco; o limite máximo é uma validação adicional não documentada como decisão aprovada. O banco armazena idade calculada, não a data de nascimento.

### 05-008 — Constraints de exclusão validam consistência de estado, não a duração exata de 7 e 90 dias

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** a definição retornada para `accounts_deletion_schedule_consistent` exige datas presentes conforme o status, `deletion_scheduled_for > deletion_requested_at` e `deletion_retention_until > deletion_scheduled_for`. Ela não codifica, por si só, exatamente sete dias e noventa dias.

**Conclusão:** a constraint impede combinações temporais incoerentes, mas as durações exatas precisam ser asseguradas pela lógica de aplicação e pelos processos de expurgo; a auditoria específica desses fluxos fica no bloco 13.

### 05-009 — Restrições e índices protegem invariantes centrais do cadastro, relações, feed e mídia

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** as consultas de catálogo confirmaram:

- unicidade do e-mail normalizado e do nome de usuário ativo;
- PKs/uniqueness para pares de seguir, solicitação, bloqueio, curtida, bookmark e repost;
- proibição de auto-seguimento, auto-bloqueio e autoavaliação;
- checks de audiência/formato/conteúdo em publicações e range de nota 1–5 na migration de reviews;
- allowlist de MIME e tamanho de mídia entre 1 byte e 100 MiB, além de estados staged/attached coerentes;
- índices de expiração de sessões, desafios de autenticação e mídias staged.

**Limite:** isto confirma a presença estrutural dos objetos no catálogo; não comprova comportamento concorrente nem cobertura de testes.

### 05-010 — Tabelas de domínios futuros não foram confundidas com erros da implementação atual

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** a lista de tabelas do banco não mostrou tabelas de aplicação para Mensagens, Notificações, Pesquisa, Localização, Seek, Shop ou Confiança e Segurança. A arquitetura de referência enumera esses domínios como parte da evolução (`:31–40, 100–175`) e declara que a lista é planejada, não comprovação de implementação (`:263–280`).

**Conclusão:** esses domínios permanecem trabalho futuro. A ausência atual não foi contabilizada como defeito do que está efetivamente construído.

### 05-011 — Privilégios efetivos do usuário de runtime do backend não estão confirmados

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta

**Evidência:** consultas realizadas pela ferramenta do banco mostram apenas o contexto de acesso da própria ferramenta; não foi comprovado que ele seja idêntico ao usuário de conexão usado pelo processo da API. Nenhum valor de conexão foi lido.

**Impacto:** não é possível afirmar que a API usa o princípio do menor privilégio ou que seu papel não tem permissão indevida de DDL. A verificação exige identificar o papel efetivo do processo sem expor credenciais.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 7 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** Feed, publicações, visibilidade, comentários, interações, tags e paginação.
