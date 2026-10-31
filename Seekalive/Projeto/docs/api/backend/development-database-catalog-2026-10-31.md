# Catálogo físico do banco de desenvolvimento — 31/10/2026

## Escopo e método

Consulta inicial executada em **31/10/2026**, no ambiente **development**, usando a conexão PostgreSQL de desenvolvimento. O identificador retornado por `current_database()` foi `heliumdb`. Depois, no mesmo dia, uma nova consulta somente leitura foi executada após a aplicação autorizada de `profiles/0003`.

As duas leituras usaram [`queries/development-database-catalog.sql`](queries/development-database-catalog.sql), que consulta catálogos PostgreSQL para enumerar relações, índices, constraints e ações referenciais, sem ler linhas de negócio. A migration foi uma operação separada, limitada ao track Profiles no banco de desenvolvimento; não houve `push` nem acesso à produção.

Este documento é um retrato datado, não uma garantia de estado futuro. Para atualizar o estado, execute novamente a consulta indicada em ambiente de desenvolvimento e registre uma nova data; não substitua a consulta por contagens fixas nos documentos gerais.

## Resumo atual após `profiles/0003`

| Schema | Relações (tabelas) | Índices | Constraints |
|---|---:|---:|---:|
| `accounts` | 4 | 10 | 9 |
| `drizzle` | 6 | 6 | 6 |
| `feed` | 8 | 20 | 32 |
| `media` | 1 | 5 | 7 |
| `profiles` | 6 | 13 | 23 |
| `security` | 4 | 11 | 9 |
| **Total** | **29** | **65** | **86** |

As 29 relações atuais retornadas são tabelas; as consultas não retornaram views, views materializadas, tabelas particionadas ou tabelas externas. O schema `drizzle` contém seis tabelas de journal de migrations: `accounts_migrations`, `feed_migrations`, `media_migrations`, `profiles_migrations`, `security_migrations` e `seek_migrations`. Journals não são tabelas de domínio. O snapshot inicial, antes da migration, continha 28 tabelas, 61 índices e 79 constraints.

### Tabelas observadas por domínio

- `accounts`: `accounts`, `account_emails`, `account_interests`, `account_username_reservations`.
- `feed`: `posts`, `post_references`, `post_tags`, `post_comments`, `post_likes`, `post_reposts`, `post_bookmarks`, `comment_likes`.
- `media`: `assets`.
- `profiles`: `account_profiles`, `business_profiles`, `business_profile_reviews`, `account_follows`, `account_follow_requests`, `account_blocks`.
- `security`: `password_credentials`, `auth_challenges`, `sessions`, `trusted_devices`.
- `drizzle`: os seis journals listados acima.

`profiles.business_profile_reviews` aparece no catálogo posterior à aplicação de `profiles/0003_misty_rhodey.sql`. A migration criou a estrutura; este catálogo não prova que os handlers de Reviews foram exercitados ponta a ponta nem consulta conteúdo da tabela. O ledger Profiles passou a registrar quatro migrations, correspondentes aos SQLs locais `0000`–`0003`.

## Ações `ON DELETE` das chaves estrangeiras

O catálogo atual retornou **35 FKs**:

| Schema | `CASCADE` | `SET NULL` | Total de FKs |
|---|---:|---:|---:|
| `accounts` | 2 | 1 | 3 |
| `feed` | 14 | 1 | 15 |
| `media` | 2 | 0 | 2 |
| `profiles` | 10 | 0 | 10 |
| `security` | 4 | 1 | 5 |
| **Total** | **32** | **3** | **35** |

Não houve ações `RESTRICT`, `SET DEFAULT` ou `NO ACTION` explícitas em FKs neste resultado. `NO ACTION` é o default exibido pelo PostgreSQL para `ON UPDATE` nas relações retornadas, não uma ação de exclusão observada.

## Limites da evidência

- A consulta comprova metadados do banco de desenvolvimento no momento da execução, não conteúdo de dados, integridade em produção ou prontidão funcional de endpoints.
- Não foram lidas linhas de tabelas de negócio.
- O resultado de catálogo não autoriza nem substitui uma migration; a aplicação de `profiles/0003` foi autorizada separadamente e verificada no ledger.
- A estrutura lógica multi-domínio permanece em um PostgreSQL de desenvolvimento compartilhado; os schemas lógicos observados não significam bancos físicos separados.
- A suíte HTTP integrada anterior passou 5/5 em schema temporário autorizado; o replay de migrations também passou em schemas temporários. Isso não substitui testes autenticados ponta a ponta das rotas de Reviews.
