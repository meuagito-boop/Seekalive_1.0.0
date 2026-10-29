# Política de nomes de usuário reservados — Seekalive

## Objetivo

Impedir que contas criadas pelo fluxo público reivindiquem nomes que representem
a plataforma Seekalive ou aparentem ser uma conta oficial. A regra é aplicada no
contrato compartilhado pelo front-end e pela API; a validação do servidor
continua sendo obrigatória e não depende da validação visual do navegador.

## Formato aceito para `@`

- Entre 3 e 20 caracteres.
- Letras ASCII, sem acentos (`a`–`z`); maiúsculas digitadas são normalizadas
  para minúsculas.
- Números (`0`–`9`), hífen (`-`) e sublinhado (`_`) são permitidos.
- Espaços, pontos, acentos, outros símbolos e caracteres Unicode visualmente
  semelhantes são rejeitados.
- A disponibilidade e a reserva não diferenciam maiúsculas de minúsculas.

## Regra de reserva

O identificador `seekalive` e variações que preservem essa sequência são
reservados. A regra bloqueia a sequência em qualquer posição do nome, com
qualquer combinação de maiúsculas/minúsculas, hífens, sublinhados, números
inseridos e repetição de letras. Também considera substituições numéricas
comuns: `5` por `s`, `3` por `e`, `4` por `a` e `1` por `i` ou `l`.

Exemplos bloqueados (a lista é ilustrativa; a regra algorítmica cobre as
combinações descritas acima):

- `seekalive`, `SeekAlive`
- `seek-alive`, `seek_alive`, `s-e-e-k-a-l-i-v-e`
- `official_seekalive`, `seekalive_support`, `meu-seekalive_2026`
- `s33k4l1v3`, `s5eekalive`, `seekal1ve`
- Formas com letras repetidas, como `seeekk_alive`

A lista não tenta materializar cada string: o alfabeto permite um número
combinatório de combinações. A validação usa um padrão determinístico sobre o
alfabeto permitido, evitando depender de uma lista parcial que poderia ser
contornada. Isso cobre variantes de escrita e formatação especificadas nesta
política; não afirma detectar todo erro ortográfico arbitrário ou toda
referência sem relação textual com a marca.

## Aplicação e exceção do sistema

- Cadastro público e alteração de `@` rejeitam nomes reservados.
- A consulta de disponibilidade informa esses nomes como indisponíveis sem
  consultar registros de contas.
- A busca de perfil público continua aceitando o formato do identificador,
  inclusive para que um perfil oficial reservado possa ser localizado.
- Uma conta oficial somente poderá receber um desses nomes por um fluxo interno
  privilegiado, nunca por um campo controlado pelo cliente. Não foi criado um
  fluxo administrativo para provisionar contas oficiais nesta etapa.

## Persistência e impacto

Esta regra não altera tabelas nem exige migration: o formato do nome continua
armazenado no campo existente. A regra vale em runtime para novos cadastros e
alterações. Contas já existentes com nomes reservados não são renomeadas
automaticamente; uma análise dessas contas deve preceder qualquer intervenção.

## Verificação

Os testes cobrem o formato permitido, os caracteres rejeitados, as colocações
de separadores entre todas as letras de `seekalive`, exemplos com substituições
numéricas, indisponibilidade no endpoint e a preservação da busca pública de
perfis oficiais.

## Verificação executada

- `pnpm --filter @workspace/api-spec run codegen` — passou.
- `pnpm run test` — passou.
- `pnpm run build` — passou, incluindo typecheck e build do backend e frontend.
- `git diff --check` — passou.
- Preview `/register` aberto em 402 × 874; a tela renderizou e o navegador não
  registrou erros. O formulário não foi submetido com conta real.
- Nenhuma migration ou alteração de banco foi feita.
