# Catálogo físico do banco de desenvolvimento — 31/10/2026

## Escopo e método

Consulta executada em **31/10/2026**, no ambiente **development**, usando a conexão PostgreSQL de desenvolvimento. O identificador retornado por `current_database()` foi `heliumdb`.

Foi executada a consulta somente leitura [`queries/development-database-catalog.sql`](queries/development-database-catalog.sql). Ela consulta catálogos PostgreSQL para enumerar relações, índices, constraints e ações referenciais. Não consulta linhas de negócio, não executa DDL, `push` ou migrations e não acessa produção.

Este documento é um retrato datado, não uma garantia de estado futuro. Para atualizar o estado, execute novamente a consulta indicada em ambiente de desenvolvimento e registre uma nova data; não substitua a consulta por contagens fixas nos documentos gerais.

## Resumo observado

| Schema | Relações (tabelas) | Índices | Constraints |
|---|---:|---:|---:|
| `accounts` | 4 | 10 | 9 |
| `drizzle` | 6 | 6 | 6 |
| `feed` | 8 | 20 | 32 |
| `media` | 1 | 5 | 7 |
| `profiles` | 5 | 9 | 16 |
| `security` | 4 | 11 | 9 |
| **Total** | **28** | **61** | **79** |

As 28 relações retornadas eram tabelas; a consulta não retornou views, views materializadas, tabelas particionadas ou tabelas externas. O schema `drizzle` contém seis tabelas de journal de migrations: `accounts_migrations`, `feed_migrations`, `media_migrations`, `profiles_migrations`, `security_migrations` e `seek_migrations`. Journals não são tabelas de domínio.

### Tabelas observadas por domínio

- `accounts`: `accounts`, `account_emails`, `account_interests`, `account_username_reservations`.
- `feed`: `posts`, `post_references`, `post_tags`, `post_comments`, `post_likes`, `post_reposts`, `post_bookmarks`, `comment_likes`.
- `media`: `assets`.
- `profiles`: `account_profiles`, `business_profiles`, `account_follows`, `account_follow_requests`, `account_blocks`.
- `security`: `password_credentials`, `auth_challenges`, `sessions`, `trusted_devices`.
- `drizzle`: os seis journals listados acima.

Nenhuma relação de avaliações comerciais apareceu no schema `profiles` neste snapshot. Isso descreve apenas o catálogo físico consultado; não prova o estado de código, contrato, rotas nem testes do fluxo de avaliações. A ausência deverá ser considerada ao avaliar persistência de avaliações e não pode ser encoberta por documentação do modelo lógico.

## Ações `ON DELETE` das chaves estrangeiras

O catálogo retornou **33 FKs**:

| Schema | `CASCADE` | `SET NULL` | Total de FKs |
|---|---:|---:|---:|
| `accounts` | 2 | 1 | 3 |
| `feed` | 14 | 1 | 15 |
| `media` | 2 | 0 | 2 |
| `profiles` | 8 | 0 | 8 |
| `security` | 4 | 1 | 5 |
| **Total** | **30** | **3** | **33** |

Não houve ações `RESTRICT`, `SET DEFAULT` ou `NO ACTION` explícitas em FKs neste resultado. `NO ACTION` é o default exibido pelo PostgreSQL para `ON UPDATE` nas relações retornadas, não uma ação de exclusão observada.

## Limites da evidência

- A consulta comprova metadados do banco de desenvolvimento no momento da execução, não conteúdo de dados, integridade em produção ou prontidão funcional de endpoints.
- Não foram lidas linhas de tabelas de negócio.
- O resultado não autoriza nem substitui uma migration.
- A estrutura lógica multi-domínio permanece em um PostgreSQL de desenvolvimento compartilhado; os schemas lógicos observados não significam bancos físicos separados.
- Os testes HTTP autenticados do Feed continuam sem execução. O fixture de integração disponível cria schema, executa `db push`, grava dados e remove o schema com `DROP SCHEMA ... CASCADE`; essa execução requer autorização específica porque altera o banco de desenvolvimento, ainda que use schema temporário.
