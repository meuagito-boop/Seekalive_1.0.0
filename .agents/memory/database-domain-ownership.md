---
name: Ownership lógico dos dados por domínio
description: Regra vigente para schemas e propriedade dos dados no desenvolvimento.
---

## Regra

Cada domínio possui schema lógico, modelos e responsabilidade próprios. Na fase atual, os schemas podem residir na mesma instância PostgreSQL de desenvolvimento; não provisionar bancos físicos independentes nem escolher provedor como parte da organização atual.

Com o PostgreSQL compartilhado, FKs e transações entre schemas podem ser usadas quando preservam uma invariável existente. Ownership continua delimitado no código: cada domínio é o único responsável por alterar sua fonte oficial, e consumidores usam contratos/composição explícitos.

Confiança e Segurança de Conteúdo é um domínio lógico separado por atravessar recursos de Contas, Feed, Mensagens e Seek e por exigir acesso restrito a denúncias, evidências e decisões. O domínio de origem continua sendo dono do conteúdo e da execução de ações. Shop está fora do escopo atual; não criar seu modelo ativo.

**Why:** O usuário autorizou usar o PostgreSQL gerenciado pelo Replit durante o desenvolvimento, sem torná-lo a decisão de hospedagem de produção. A separação atual é por domínio lógico/track; provisionar bancos físicos independentes por domínio fica fora desta etapa. Shop também foi explicitamente retirado do escopo atual.

**How to apply:** Ao alterar schemas, migrations ou fluxos, manter ownership no código e tracks SQL separados por domínio na instância PostgreSQL de desenvolvimento do Replit; selecionar explicitamente alvo e track. Não tocar em produção, provisionar banco físico por domínio, criar tabelas/rotas Shop ou implementar Trust/Safety sem escopo aprovado.

## Armazenamento de mídia no desenvolvimento

**Regra:** fotos e vídeos de teste usam armazenamento local somente no ambiente de desenvolvimento. Isso não define armazenamento de produção nem autoriza selecionar um provedor externo.

**Why:** Em 30/10/2026, o usuário escolheu armazenamento local para testar fotos e vídeos e deixou integrações/provedores para depois.

**How to apply:** manter o adaptador local limitado a desenvolvimento, fora do Git e do deploy; não habilitar upload em produção nem escolher um provedor permanente sem decisão posterior.

## Reconciliação do histórico de migrations

Cada domínio ativo mantém seu próprio track SQL, journal e ledger em `drizzle`: `accounts`, `security`, `profiles`, `seek`, `feed` e `media`. Seek mantém o track, mas ainda não tem tabelas de negócio ativas; Shop permanece fora do escopo atual. O pacote exige um track explícito para gerar/aplicar migrations; a aplicação inicial em banco vazio segue Accounts antes dos domínios com FK para Accounts. A sequência histórica combinada `0000`–`0006` é somente registro e não é executável pelo fluxo do pacote.

**Why:** O histórico combinado misturava objetos físicos de `0000`–`0004` e `0006` com partes de Feed ausentes, e não representa a execução independente por domínio. Tracks isolados evitam que uma linha global de migration faça o Drizzle pular lacunas ou reaplicar DDL.

**How to apply:** Antes de cada aplicação, confirmar ambiente e track, revisar SQL e dependências, validar o journal e consultar o ledger correspondente. Nunca usar o histórico combinado, executar `push` no banco principal ou inserir ledger para SQL não aplicado. Para bancos vazios, usar somente a sequência de tracks ativos documentada; produção continua fora da fase atual.

## Expressões PostgreSQL em migrations

Em `CHECK` constraints e predicados de índices parciais, usar expressões SQL estáticas com colunas não qualificadas; não interpolar objetos `table.column` do Drizzle nesses contextos.

**Why:** O interpolador produziu referências com schema/tabela/coluna que passam pelo typecheck e pelo `drizzle-kit check`, mas o PostgreSQL rejeita ao executar DDL de bootstrap.

**How to apply:** Reproduzir sempre os SQLs baseline em schemas descartáveis antes de registrá-los como bootstrap válido; se o SQL já foi registrado no ledger de desenvolvimento, manter hash/timestamp coerentes após ajustar apenas o texto do baseline e confirmar que não houve alteração de DDL de negócio.

## Runner isolado de banco no desenvolvimento

Em alguns trabalhos do workspace, o shell comum não herda `DATABASE_URL` runtime-managed, enquanto `CodeExecution.shellExec` consegue executar o runner usando essa variável sem mostrá-la. Descobrir o nome do banco com consulta somente leitura, passar apenas esse nome em `SEEKALIVE_EXPECTED_DATABASE` e manter o opt-in e `NODE_ENV=test`; nunca imprimir/copiar a URL.

**Why:** O teste integrado depende de um pool PostgreSQL real e valida que schema temporário foi removido e que `public` não mudou. A diferença entre ambientes de shell pode parecer falta de banco, embora o banco de desenvolvimento esteja acessível pela execução segura.

**How to apply:** Para testes que exigem isolamento real, prefira o runner de integração com schema aleatório e as proteções existentes; se o shell comum não tiver a conexão, use a execução com o contexto de desenvolvimento disponível sem expor credenciais. Confirme a limpeza do schema ao fim e reporte falha se não puder comprová-la.
