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

Antes de usar o migrador padrão, verificar tanto o schema físico quanto a tabela de histórico no banco; o journal local sozinho não prova quais migrations foram aplicadas. Se não existir ledger ou houver diferença entre o estado físico e a sequência versionada, não executar `migrate` nem registrar migrations ausentes como aplicadas. Primeiro reconciliar a base de forma reproduzível, respeitando os escopos de domínio aprovados.

**Why:** O banco de desenvolvimento estava provisionado parcialmente sem `__drizzle_migrations`, com `feed.posts` ainda ausente. A migration de exclusão autorizada teve de ser aplicada diretamente e não deve mascarar lacunas anteriores nem fazer o migrador padrão reaplicar schemas já existentes.

**How to apply:** Antes de qualquer `drizzle-kit migrate`, consultar objetos e histórico do ambiente alvo, comparar com a sequência versionada e apresentar plano de baseline seguro se divergirem.
