---
name: Ownership lógico dos dados por domínio
description: Regra vigente para schemas e propriedade dos dados no desenvolvimento.
---

## Regra

Cada domínio possui schema lógico, modelos e responsabilidade próprios. Na fase atual, os schemas podem residir na mesma instância PostgreSQL de desenvolvimento; não provisionar bancos físicos independentes nem escolher provedor como parte da organização atual.

Com o PostgreSQL compartilhado, FKs e transações entre schemas podem ser usadas quando preservam uma invariável existente. Ownership continua delimitado no código: cada domínio é o único responsável por alterar sua fonte oficial, e consumidores usam contratos/composição explícitos.

Confiança e Segurança de Conteúdo é um domínio lógico separado por atravessar recursos de Contas, Feed, Mensagens e Seek e por exigir acesso restrito a denúncias, evidências e decisões. O domínio de origem continua sendo dono do conteúdo e da execução de ações. Shop está fora do escopo atual; não criar seu modelo ativo.

**Why:** O usuário esclareceu que a separação necessária agora é organização por domínio no modelo anexado; bancos físicos não fazem parte desta fase, pois o aplicativo não será hospedado no Replit. Shop também foi explicitamente retirado do escopo atual.

**How to apply:** Ao alterar schemas, migrations ou fluxos, manter ownership no código e schemas lógicos separados na instância de desenvolvimento. Não criar tabelas/rotas Shop, não implementar ainda Trust/Safety, e não inferir topologia física ou aplicar migrations sem aprovação explícita.

## Reconciliação do histórico de migrations

Cada domínio ativo mantém seu próprio track SQL, journal e ledger em `drizzle`: `accounts`, `security`, `profiles` e `seek`. O pacote exige um track explícito para gerar/aplicar migrations; a aplicação inicial em banco vazio segue Accounts antes dos domínios com FK para Accounts. A sequência histórica combinada `0000`–`0006` é somente registro e não é executável pelo fluxo do pacote. Feed não tem track ativo e Shop permanece fora do escopo atual.

**Why:** O histórico combinado misturava objetos físicos de `0000`–`0004` e `0006` com a tabela `feed.posts` de `0005` ausente. Um único timestamp global faria o Drizzle pular uma lacuna ou tentar reaplicar DDL já existente. Os baselines isolados permitem representar o estado atual sem afirmar que Feed foi aplicado.

**How to apply:** Antes de cada aplicação, confirmar ambiente e track, revisar SQL e dependências, validar o journal e consultar o ledger correspondente. Nunca usar o histórico combinado, executar `push` no banco principal ou inserir ledger para SQL não aplicado. Para bancos vazios, usar somente a sequência de tracks ativos documentada; produção continua fora da fase atual.

## Expressões PostgreSQL em migrations

Em `CHECK` constraints e predicados de índices parciais, usar expressões SQL estáticas com colunas não qualificadas; não interpolar objetos `table.column` do Drizzle nesses contextos.

**Why:** O interpolador produziu referências com schema/tabela/coluna que passam pelo typecheck e pelo `drizzle-kit check`, mas o PostgreSQL rejeita ao executar DDL de bootstrap.

**How to apply:** Reproduzir sempre os SQLs baseline em schemas descartáveis antes de registrá-los como bootstrap válido; se o SQL já foi registrado no ledger de desenvolvimento, manter hash/timestamp coerentes após ajustar apenas o texto do baseline e confirmar que não houve alteração de DDL de negócio.
