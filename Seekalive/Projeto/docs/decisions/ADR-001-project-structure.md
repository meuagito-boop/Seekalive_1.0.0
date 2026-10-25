# ADR-001 — Estrutura do projeto e limites dos aplicativos

- **Status:** Aceito
- **Data:** 2026-10-23

## Contexto

O projeto precisa crescer sem misturar o aplicativo público, a gestão comercial e a administração da plataforma. O Aplicativo já contém interface e API; Gestor e Painel ainda são objetivos futuros.

## Decisão

1. Manter `Seekalive/Projeto` como raiz técnica do repositório.
2. Manter `Aplicativo` dentro de `Projeto`; manter o Gestor em `../Projeto 3/Gestor` e o Painel em `../Projeto 2/Painel`, como diretórios irmãos de `Projeto` na raiz de `Seekalive`.
3. Separar cada aplicativo em `front/` e `back/`.
4. Manter contratos em `shared/` e infraestrutura comum em `infra/`.
5. Tratar o backend do Aplicativo como monólito modular enquanto não houver motivo comprovado para separar serviços.
6. Não criar pacotes executáveis, serviços ou dados falsos para Gestor e Painel antes de seu escopo ser definido.

## Consequências

- O Aplicativo existente continua sendo a única aplicação funcional neste momento.
- A API do Aplicativo conserva seus contratos e comportamentos durante a reorganização.
- Gestor e Painel permanecem em diretórios irmãos e precisam de decisões de escopo, autenticação e permissões antes de receber código funcional.
- Workflows e caminhos de publicação devem apontar para `Seekalive/Projeto`.
