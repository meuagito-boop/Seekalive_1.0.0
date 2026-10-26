# Árvore e catálogo da raiz

## Raiz do projeto

`Seekalive/Projeto` é a raiz do workspace pnpm do Aplicativo. A configuração do workspace inclui `Aplicativo/*`, `shared/*`, `infra/*`, `artifacts/*` e `scripts/*`. Gestor e Painel são citados como projetos irmãos fora desta raiz; não foram auditados nem alterados.

```text
Seekalive/Projeto/
├── Aplicativo/
│   ├── back/                 API Express
│   └── front/                aplicativo React/Vite
├── artifacts/
│   └── mockup-sandbox/       ferramenta isolada de preview de componentes
├── attached_assets/          imagens e prompts anexados ao projeto
├── auditoria/                auditoria técnica, catálogo e plano de ação
├── docs/                     documentação de produto/arquitetura e backend
├── generated-artifacts/      resultados de previews e capturas
├── infra/
│   └── database/             schemas e migrações Drizzle
├── reports/                  auditorias e validações anteriores
├── scripts/                  verificações de segurança, DB e runtime
├── shared/
│   ├── api-client-react/     cliente React Query gerado
│   ├── api-spec/             OpenAPI e configuração Orval
│   └── contracts/            contratos Zod e tipos compartilhados
├── tests/                    espaço de testes na raiz
├── .agents/                  memória e imagens de revisão de documentos
├── .canvas/                  asset do canvas
└── configuração e manifests da raiz
```

## Pacotes e arquivos de configuração da raiz

| Elemento | Função | Ligações principais |
|---|---|---|
| `package.json` | Scripts raiz para testes, build e typecheck; restringe o gerenciador de pacotes e define os requisitos do workspace. | Executa scripts nos pacotes pnpm; encaminha validações a `scripts`, API, front e sandbox. |
| `pnpm-workspace.yaml` | Declara os workspaces e catálogo de dependências/versionamento compartilhado. | Descobre os manifests dos pacotes listados acima. |
| `pnpm-lock.yaml` | Resolução travada das dependências do workspace. | É gerado/atualizado pelo pnpm e consumido na instalação; não é código de aplicação. |
| `.npmrc` | Comportamento do pnpm/npm no workspace, incluindo política de peers. | Afeta instalação de dependências; não define lógica do app. |
| `.gitignore` | Exclui arquivos de controle local/build/dependências da versão rastreada. | Afeta Git, não o runtime. |
| `.replitignore` | Exclui conteúdo do ambiente Replit, inclusive artefatos gerados configurados. | Afeta sincronização/implantação Replit. |
| `.replit` e `replit.nix` | Configuração do ambiente e runtime. O `.replit` lista `nodejs-20`; o runtime observado nesta auditoria foi Node `22.23.4`. | Ambiente de execução; a diferença de versão precisa ser reconciliada. |
| `tsconfig.json` e `tsconfig.base.json` | Configuração TypeScript compartilhada e referências de pacote. | Usados por typecheck e compiladores do workspace. |
| `README.md` | Visão geral e instruções da raiz. | Aponta para Aplicativo, backend e documentação. Inclui referência a Gestor/Painel fora desta pasta. |
| `replit.md` | Instruções/contexto do projeto para o ambiente colaborativo. | Orienta execução e decisões do workspace; não é contrato do produto. |
| `reports/` | Resultados datados de auditorias, validações e análises anteriores. | São evidência histórica; confrontar com código atual antes de tratá-los como estado atual. |
| `docs/` | Documentação fonte e gerada de API, arquitetura, integração e decisões. | Relaciona-se a OpenAPI, schemas, rotas e front. |
| `generated-artifacts/` | Capturas e materiais de validação gerados. | Resultados de preview; não são entrada de runtime. |
| `attached_assets/` | Prompts e imagens anexados à conversa/projeto. | Referências para decisões e implementação; não são importações automáticas da aplicação. |
| `.agents/` | Memória de trabalho e páginas rasterizadas de documentos revisados anteriormente. | Conteúdo auxiliar do agente; páginas PNG referem-se a PDFs de origem que não foram encontrados nesta raiz do projeto. |
| `.canvas/` | Asset visual mantido pelo canvas. | Não foi detectado importador em código do aplicativo. |
| `tests/` | Diretório de testes de nível raiz. | Contém um arquivo; os testes ativos principais ficam nos pacotes e scripts. |

## Fronteiras dos aplicativos

- **Aplicativo:** é o produto em escopo e contém os pacotes `@workspace/social` e `@workspace/api-server`. A tela e a API estão em pacotes diferentes, porém no mesmo workspace.
- **Gestor e Painel:** aparecem como caminhos de projetos irmãos nas instruções/ADRs; não existem como diretórios dentro de `Seekalive/Projeto` no inventário analisado. A ordem da tarefa excluiu qualquer edição neles.
- **Mockup sandbox:** é ferramenta de desenvolvimento para preview de UI, com pacote/servidor independentes; não é um módulo de domínio de produção nem um quarto aplicativo de produto.
- **shared:** contém a fonte OpenAPI, o cliente gerado e os contratos compartilhados. O código gerado tem fonte declarada e não deve receber correções manuais que sejam perdidas na próxima geração.
- **infra/database:** contém modelos Drizzle, configuração, migrações e journal; não é um banco externo ativo por si só.
- **infra/cache, infra/storage, infra/queues e infra/deployment:** possuem documentos/estrutura de preparação; não significam que Redis, object storage, filas ou plataforma de produção estejam conectados.

## Arquivos fora do catálogo funcional

O [catálogo integral](06-catalogo-integral-de-arquivos.md) discrimina inclusive lockfile, source maps, bundles, imagens, zip, documentos históricos, páginas rasterizadas e arquivos auxiliares. Eles foram mantidos no inventário: a instrução era ignorar somente conteúdo instalado de dependências. Não foi feita limpeza ou exclusão.

## Árvore integral de diretórios

A árvore abaixo é a linha de base do levantamento inicial. Ela registra todas as pastas encontradas naquele momento; seus totais não devem ser interpretados como contagem atual após a reorganização iniciada em `Aplicativo/back/src/modules/accounts`. O [delta do catálogo](06-catalogo-integral-de-arquivos.md) registra as mudanças estruturais realizadas até aqui. O inventário atual completo será refeito ao concluir a etapa de organização do frontend e backend.

### Estrutura atual da primeira pasta reorganizada

```text
Aplicativo/back/src/modules/accounts/ (8 arquivos)
├── application/      (3 arquivos: composição de leituras, projeção e contrato de lock)
├── domain/           (3 arquivos: dados de leitura, privacidade e política de identidade)
└── infrastructure/  (2 arquivos: consultas de conta e lock SQL de @)
```

No levantamento inicial, `accounts` tinha três arquivos, todos em `application/`. Após a primeira unidade estrutural (`accounts`), o total intermediário era **1.010 arquivos**, excluindo `node_modules` e `.pnpm`.

Após a unidade estrutural de `auth`, o estado observado passou a **1.024 arquivos**. O módulo `auth` possui 50 arquivos TypeScript: 33 em `application/`, 16 em `presentation/` e um adaptador em `infrastructure/`. As operações de apresentação agora delegam persistência a casos de uso de aplicação. O novo inicializador de perfil comercial está em `profiles/application`, mantendo a propriedade do dado em Profiles.

Abaixo, a árvore completa da linha de base inicial, incluindo as pastas vazias. O número após cada pasta representa os arquivos regulares naquela data; conteúdo instalado de `node_modules` e `.pnpm` foi excluído. Os nomes de arquivo estão no [catálogo integral](06-catalogo-integral-de-arquivos.md).

```text
Seekalive/Projeto/
├── .agents/ (39 arquivos)
│   ├── memory/ (9 arquivos)
│   └── outputs/ (30 arquivos)
│       └── pdf-review/ (30 arquivos)
├── .canvas/ (1 arquivos)
│   └── assets/ (1 arquivos)
├── .config/ (0 arquivos)
│   └── npm/ (0 arquivos)
│       └── node_global/ (0 arquivos)
│           └── lib/ (0 arquivos)
├── Aplicativo/ (505 arquivos)
│   ├── back/ (128 arquivos)
│   │   ├── .replit-artifact/ (1 arquivos)
│   │   ├── dist/ (2 arquivos)
│   │   ├── src/ (116 arquivos)
│   │   │   ├── common/ (2 arquivos)
│   │   │   ├── modules/ (102 arquivos)
│   │   │   │   ├── accounts/ (3 arquivos)
│   │   │   │   │   └── application/ (3 arquivos)
│   │   │   │   ├── auth/ (38 arquivos)
│   │   │   │   │   ├── application/ (21 arquivos)
│   │   │   │   │   │   ├── accountSecurity/ (3 arquivos)
│   │   │   │   │   │   ├── challenges/ (3 arquivos)
│   │   │   │   │   │   ├── emailChange/ (3 arquivos)
│   │   │   │   │   │   ├── login/ (2 arquivos)
│   │   │   │   │   │   ├── passwordChange/ (2 arquivos)
│   │   │   │   │   │   └── registration/ (4 arquivos)
│   │   │   │   │   ├── infrastructure/ (1 arquivos)
│   │   │   │   │   └── presentation/ (16 arquivos)
│   │   │   │   ├── feed/ (13 arquivos)
│   │   │   │   │   ├── application/ (7 arquivos)
│   │   │   │   │   └── presentation/ (6 arquivos)
│   │   │   │   ├── health/ (3 arquivos)
│   │   │   │   │   └── presentation/ (3 arquivos)
│   │   │   │   ├── onboarding/ (2 arquivos)
│   │   │   │   │   ├── application/ (1 arquivos)
│   │   │   │   │   └── presentation/ (1 arquivos)
│   │   │   │   ├── profiles/ (14 arquivos)
│   │   │   │   │   ├── application/ (8 arquivos)
│   │   │   │   │   └── presentation/ (6 arquivos)
│   │   │   │   └── social/ (28 arquivos)
│   │   │   │       ├── application/ (13 arquivos)
│   │   │   │       └── presentation/ (15 arquivos)
│   │   │   └── security/ (10 arquivos)
│   │   └── test/ (5 arquivos)
│   └── front/ (376 arquivos)
│       ├── .replit-artifact/ (1 arquivos)
│       ├── dist/ (113 arquivos)
│       │   └── public/ (113 arquivos)
│       │       ├── assets/ (97 arquivos)
│       │       ├── data/ (1 arquivos)
│       │       └── demo-seek/ (9 arquivos)
│       ├── public/ (15 arquivos)
│       │   ├── data/ (1 arquivos)
│       │   └── demo-seek/ (9 arquivos)
│       ├── src/ (234 arquivos)
│       │   ├── components/ (65 arquivos)
│       │   │   ├── brand/ (1 arquivos)
│       │   │   ├── content/ (7 arquivos)
│       │   │   └── ui/ (57 arquivos)
│       │   ├── data/ (5 arquivos)
│       │   │   └── demo/ (1 arquivos)
│       │   ├── design/ (4 arquivos)
│       │   ├── hooks/ (4 arquivos)
│       │   ├── lib/ (5 arquivos)
│       │   ├── modules/ (147 arquivos)
│       │   │   ├── app/ (23 arquivos)
│       │   │   │   ├── api/ (2 arquivos)
│       │   │   │   ├── components/ (1 arquivos)
│       │   │   │   ├── content/ (3 arquivos)
│       │   │   │   ├── hooks/ (1 arquivos)
│       │   │   │   ├── layouts/ (5 arquivos)
│       │   │   │   ├── persistence/ (2 arquivos)
│       │   │   │   ├── routes/ (2 arquivos)
│       │   │   │   ├── screens/ (3 arquivos)
│       │   │   │   └── state/ (4 arquivos)
│       │   │   ├── auth/ (13 arquivos)
│       │   │   │   ├── screens/ (4 arquivos)
│       │   │   │   ├── services/ (7 arquivos)
│       │   │   │   └── state/ (1 arquivos)
│       │   │   ├── messages/ (8 arquivos)
│       │   │   │   ├── application/ (3 arquivos)
│       │   │   │   ├── screens/ (2 arquivos)
│       │   │   │   ├── state/ (1 arquivos)
│       │   │   │   └── types/ (2 arquivos)
│       │   │   ├── notifications/ (5 arquivos)
│       │   │   │   ├── application/ (2 arquivos)
│       │   │   │   ├── screens/ (1 arquivos)
│       │   │   │   ├── state/ (1 arquivos)
│       │   │   │   └── types/ (1 arquivos)
│       │   │   ├── onboarding/ (3 arquivos)
│       │   │   │   ├── screens/ (2 arquivos)
│       │   │   │   └── services/ (1 arquivos)
│       │   │   ├── profile/ (19 arquivos)
│       │   │   │   ├── commercial-profile/ (6 arquivos)
│       │   │   │   │   ├── components/ (2 arquivos)
│       │   │   │   │   ├── types/ (2 arquivos)
│       │   │   │   │   └── utils/ (2 arquivos)
│       │   │   │   ├── components/ (4 arquivos)
│       │   │   │   ├── data/ (1 arquivos)
│       │   │   │   ├── hooks/ (1 arquivos)
│       │   │   │   ├── personal-profile/ (1 arquivos)
│       │   │   │   │   └── utils/ (1 arquivos)
│       │   │   │   ├── screens/ (2 arquivos)
│       │   │   │   ├── types/ (2 arquivos)
│       │   │   │   └── utils/ (2 arquivos)
│       │   │   ├── seek/ (19 arquivos)
│       │   │   │   ├── application/ (1 arquivos)
│       │   │   │   ├── components/ (7 arquivos)
│       │   │   │   ├── data/ (2 arquivos)
│       │   │   │   ├── hooks/ (1 arquivos)
│       │   │   │   ├── screens/ (2 arquivos)
│       │   │   │   ├── services/ (1 arquivos)
│       │   │   │   ├── state/ (1 arquivos)
│       │   │   │   ├── types/ (2 arquivos)
│       │   │   │   └── utils/ (2 arquivos)
│       │   │   ├── settings/ (14 arquivos)
│       │   │   │   ├── components/ (2 arquivos)
│       │   │   │   │   └── account/ (2 arquivos)
│       │   │   │   ├── data/ (4 arquivos)
│       │   │   │   └── screens/ (8 arquivos)
│       │   │   ├── shop/ (5 arquivos)
│       │   │   │   ├── data/ (1 arquivos)
│       │   │   │   ├── hooks/ (1 arquivos)
│       │   │   │   ├── screens/ (2 arquivos)
│       │   │   │   └── types/ (1 arquivos)
│       │   │   └── social/ (38 arquivos)
│       │   │       ├── application/ (6 arquivos)
│       │   │       ├── components/ (6 arquivos)
│       │   │       │   ├── layout/ (1 arquivos)
│       │   │       │   └── post/ (2 arquivos)
│       │   │       ├── data/ (1 arquivos)
│       │   │       ├── domain/ (1 arquivos)
│       │   │       ├── hooks/ (1 arquivos)
│       │   │       ├── screens/ (11 arquivos)
│       │   │       ├── services/ (6 arquivos)
│       │   │       ├── state/ (2 arquivos)
│       │   │       └── types/ (4 arquivos)
│       │   └── server/ (1 arquivos)
│       └── tests/ (7 arquivos)
├── artifacts/ (72 arquivos)
│   └── mockup-sandbox/ (72 arquivos)
│       ├── .replit-artifact/ (1 arquivos)
│       ├── dist/ (3 arquivos)
│       │   └── assets/ (2 arquivos)
│       └── src/ (61 arquivos)
│           ├── .generated/ (1 arquivos)
│           ├── components/ (54 arquivos)
│           │   ├── mockups/ (0 arquivos)
│           │   └── ui/ (54 arquivos)
│           ├── hooks/ (2 arquivos)
│           └── lib/ (1 arquivos)
├── attached_assets/ (7 arquivos)
├── auditoria/ (8 arquivos)
├── docs/ (19 arquivos)
│   ├── api/ (15 arquivos)
│   │   └── backend/ (15 arquivos)
│   ├── architecture/ (2 arquivos)
│   ├── decisions/ (1 arquivos)
│   └── modules/ (1 arquivos)
├── generated-artifacts/ (11 arquivos)
│   ├── seek-audit/ (3 arquivos)
│   └── social-audit/ (8 arquivos)
├── infra/ (57 arquivos)
│   ├── cache/ (1 arquivos)
│   ├── database/ (53 arquivos)
│   │   ├── dist/ (24 arquivos)
│   │   │   └── schema/ (20 arquivos)
│   │   ├── migrations/ (13 arquivos)
│   │   │   └── meta/ (7 arquivos)
│   │   └── src/ (11 arquivos)
│   │       └── schema/ (9 arquivos)
│   ├── deployment/ (1 arquivos)
│   ├── queues/ (1 arquivos)
│   └── storage/ (1 arquivos)
├── reports/ (5 arquivos)
├── scripts/ (12 arquivos)
│   └── src/ (4 arquivos)
├── shared/ (256 arquivos)
│   ├── api-client-react/ (15 arquivos)
│   │   ├── dist/ (8 arquivos)
│   │   │   └── generated/ (4 arquivos)
│   │   └── src/ (4 arquivos)
│   │       └── generated/ (2 arquivos)
│   ├── api-spec/ (4 arquivos)
│   └── contracts/ (237 arquivos)
│       ├── dist/ (156 arquivos)
│       │   ├── feed/ (6 arquivos)
│       │   └── generated/ (138 arquivos)
│       │       └── types/ (136 arquivos)
│       └── src/ (78 arquivos)
│           ├── feed/ (3 arquivos)
│           └── generated/ (69 arquivos)
│               └── types/ (68 arquivos)
└── tests/ (1 arquivos)
```
