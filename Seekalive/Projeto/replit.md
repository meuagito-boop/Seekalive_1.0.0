# Seekalive

Aplicativo social e de descoberta local com perfis pessoais e comerciais conectados.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080; `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate:accounts` (or `generate:security`, `generate:profiles`, `generate:seek`) — generate versioned SQL for one domain track without connecting to a database
- `SEEKALIVE_DB_MIGRATION_TRACK=<domain> pnpm --filter @workspace/db run migrate` — apply only the selected track after its baseline and migration review; never run the legacy combined timeline
- `SEEKALIVE_DB_MIGRATION_TARGET=replit pnpm --filter @workspace/db run migrate:baseline` — initialize the active domain tracks sequentially in a new development database; review every generated baseline first
- `pnpm --filter @workspace/db run check` — verify all active domain migration journals
- Development uses the Replit-managed PostgreSQL database through `DATABASE_URL`. The post-merge script validates domain migration journals and does not apply schema changes.
- PostgreSQL schemas separate domain ownership inside each environment: all 12 approved domain schemas are prepared in development; `accounts`, `security`, `profiles`, and `seek` currently contain tables, while the other eight remain empty until their backend slices are implemented.
- Replit keeps development and production databases separate. Production schema changes must go through Replit Publish; never run development migrations or direct DDL against production.
- Database `push` is restricted to isolated test schemas. The historical combined migration chain is retained for audit and is not an executable migration path.
- Do not expose or replace `DATABASE_URL`. The connection code supports selecting an external PostgreSQL target explicitly, but development defaults to Replit-managed PostgreSQL and the external target is not selected by default. Do not enable it or configure an external URL without an explicit decision.

## Stack

- pnpm 10.26.1 workspaces, Node.js 22.23.4, TypeScript 5.9
- App: `Aplicativo/front` (React + Vite) and `Aplicativo/back` (Express 5 API)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build da API: esbuild (bundle ESM)

## Where things live

## Repository map

- `Aplicativo/front` — current public app (Social, Seek and Shop UI)
- `Aplicativo/back` — current API for the public app
- `../Projeto 3/Gestor/front`, `../Projeto 3/Gestor/back` — scaffold for the future commercial operations app
- `../Projeto 2/Painel/front`, `../Projeto 2/Painel/back` — scaffold for the future administration app
- `shared/contracts` — shared API validation contracts
- `shared/api-spec` and `shared/api-client-react` — OpenAPI source and generated client
- `infra/database` — Drizzle/PostgreSQL schema and database access
- `docs` — architecture, module and API documentation

## Architecture decisions

- O backend do Aplicativo permanece um monólito modular até existir uma necessidade concreta de separação em serviços.
- Gestor e Painel são scaffolds sem funcionalidades; definir escopo e permissões antes de implementar.

## Product

O Aplicativo reúne Social, Seek e Shop sob a mesma conta. Contas comerciais são contas do Social e alimentam a descoberta no Seek. As telas de conta e perfil devem refletir o tipo da conta (pessoal ou comercial), sem criar uma identidade separada para o comércio. A idade é coletada apenas no cadastro, armazenada no servidor para validar a regra de 18+ e nunca exibida ou retornada ao cliente depois da criação, inclusive em Configurações.

## User preferences

- Mantenha padrões visuais consistentes entre elementos da mesma função; não reduza abas ou controles sem solicitação.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
