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
