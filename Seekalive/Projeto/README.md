# Seekalive

Repositório do produto Seekalive. O diretório `Seekalive/Projeto` concentra o código, a documentação e os pacotes compartilhados.

## Estrutura

- `Aplicativo/` — aplicativo público atual, com interface e API.
- `../Projeto 3/Gestor/` — estrutura reservada ao futuro aplicativo de gestão comercial, ao lado de `Projeto` na raiz de `Seekalive`.
- `../Projeto 2/Painel/` — estrutura reservada ao futuro painel administrativo, ao lado de `Projeto` na raiz de `Seekalive`.
- `shared/` — contratos, especificação OpenAPI e cliente compartilhado.
- `infra/` — banco de dados e infraestrutura comum.
- `docs/` — arquitetura, módulos e documentação da API.
- `scripts/` — automações e verificações do workspace.
- `tests/` — espaço para testes de integração entre aplicativos.
- `artifacts/mockup-sandbox/` — ferramenta de prototipação do Replit; não é um quarto produto.

## Desenvolvimento

Os comandos são executados a partir de `Seekalive/Projeto`:

- `pnpm --filter @workspace/social run dev` — interface do Aplicativo.
- `pnpm --filter @workspace/api-server run dev` — API do Aplicativo.
- `pnpm run typecheck` — verificação de tipos do workspace.
- `pnpm run test:social` — testes atuais de interface e regras sociais.

Gestor e Painel são apenas estruturas iniciais nos diretórios irmãos indicados acima; ainda não possuem funcionalidades implementadas nem workflows de produção.
