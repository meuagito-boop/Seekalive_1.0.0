# Arquitetura

## Direção atual

- O Seekalive é organizado como um monólito modular no backend do Aplicativo.
- `Aplicativo/front` e `Aplicativo/back` são partes do mesmo produto e usam contratos compartilhados.
- `Gestor` e `Painel` ficam separados do Aplicativo para permitir evolução independente; por enquanto são apenas scaffolds.
- `shared/` contém contratos e clientes reutilizáveis; `infra/` concentra infraestrutura técnica compartilhada.
- Recursos futuros devem ser adicionados ao módulo de produto correspondente, sem criar serviços separados antes de existir uma necessidade operacional.

## Limites importantes

- Não duplicar contas sociais: a conta pessoal ou comercial pertence ao Aplicativo; os demais aplicativos devem consumir identidades e permissões definidas por ele.
- Não presumir que pastas reservadas já sejam aplicações implantáveis.
- Não conectar infraestrutura externa ou produção nesta etapa sem uma decisão explícita.

## Banco de dados

- O banco PostgreSQL atual é único e pertence ao desenvolvimento.
- `database-domains.md` propõe a propriedade dos dados por domínio; é arquitetura de destino, não configuração ativa nem autorização para criar/migrar bancos.

Veja também `../decisions/ADR-001-project-structure.md`.
