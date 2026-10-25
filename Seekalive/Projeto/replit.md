# Seekalive

Aplicativo social e de descoberta local com perfis pessoais e comerciais conectados.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080; `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate versioned SQL from the Drizzle schema without connecting to a database
- Development uses the Replit-managed PostgreSQL database through `DATABASE_URL`. The post-merge script synchronizes only the development schema with Drizzle.
- PostgreSQL schemas separate domain ownership inside each environment: all 12 approved domain schemas are prepared in development; `accounts`, `security`, `profiles`, and `seek` currently contain tables, while the other eight remain empty until their backend slices are implemented.
- Replit keeps development and production databases separate. Production schema changes must go through Replit Publish; never run development push or direct DDL against production.
- Do not expose or replace `DATABASE_URL`. An external PostgreSQL selector remains inactive and must not be enabled without a new explicit decision.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
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
