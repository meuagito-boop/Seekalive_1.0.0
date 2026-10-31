# Apêndice A1 — Fronteiras de domínio e módulos existentes

> Material suplementar do dossiê, não é o bloco oficial 11. O inventário de rate limits está em [11-limites-de-taxa-abuso.md](11-limites-de-taxa-abuso.md). Este apêndice é incluído uma única vez no consolidado e seus achados contam no total geral.

## Escopo e método

Leitura das árvores de módulos, do registro de rotas, das trilhas de migração e dos imports entre fronteiras. A existência de uma pasta não foi considerada prova de funcionalidade; cada conclusão foi confrontada com o código de composição e os pontos de entrada.

## Achados

### A1-001 — O backend registra somente Auth, Onboarding, Profiles, Social, Feed, Media e Health

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `Aplicativo/back/src/modules/index.ts:13–19` monta esses roteadores. O inventário de diretórios de `Aplicativo/back/src/modules` mostra Accounts, Profiles, Social, Feed, Media, Auth, Onboarding, Health e Seek; não há módulos backend Messages, Notifications ou Shop. Accounts contém domínio e repositórios consumidos por Auth, mas não um roteador próprio. Seek não contém arquivos fonte.

**Trecho:**

```ts
router.use("/v1/auth", authRouter);
router.use("/v1/onboarding", onboardingRouter);
router.use("/v1", accountsRouter);
router.use("/v1/social", relationsRouter);
router.use("/v1/social", createMediaRouter(readFeedPost));
router.use("/v1/social", feedRouter);
```

**Impacto:** o estado atual tem uma parte funcional de Auth/Profiles/Social/Feed/Mídia, mas não representa o backend completo da rede social e dos módulos futuros. Messages e Notifications continuam pendentes para fechar o escopo Social; Shop permanece fora do escopo desta etapa.

### A1-002 — O alias `accountsRouter` aponta para o roteador de Profiles

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa

**Evidência:** `Aplicativo/back/src/modules/index.ts:6,16` importa `profiles/composition/router` sob o nome `accountsRouter` e monta o alias em `/v1`.

**Trecho:** `import accountsRouter from "./profiles/composition/router";` seguido de `router.use("/v1", accountsRouter);`.

**Impacto:** o comportamento de roteamento não muda por causa do nome, mas a composição encobre a fronteira que o próprio código já estabeleceu e pode induzir manutenção no domínio errado.

### A1-003 — A inicialização de Profiles acontece dentro da transação de cadastro orquestrada por Auth

**Veredito:** PARCIAL  
**Prioridade:** Média — limitação de futura separação física

**Evidência:** `auth/composition/registration.ts:1–17` injeta a criação da identidade de Accounts e os inicializadores de Profiles no coordenador de cadastro. `auth/infrastructure/registrationAccountCoordinator.ts:45–80` executa identidade, credencial, perfil pessoal e perfil comercial usando o mesmo `runInTransaction`.

**Trecho:**

```ts
return dependencies.runInTransaction(async (transaction) => {
  const account = await dependencies.createPendingAccountIdentity(transaction, ...);
  await dependencies.createInitialPasswordCredential(transaction, account.id, ...);
  await dependencies.initializeAccountProfile(transaction, account.id, ...);
  if (input.accountType === "commercial") {
    await dependencies.initializeCommercialProfile(transaction, account.id, ...);
  }
});
```

**Impacto:** a separação lógica por schema funciona no banco compartilhado de desenvolvimento e preserva a atomicidade do cadastro. A mesma transação não pode abranger bancos físicos independentes; a estratégia de provisionamento futuro precisará de uma coordenação transacional distribuída/recuperável antes de separar fisicamente esses domínios. Não se recomenda alterar agora o fluxo aprovado.

### A1-004 — A escrita de Feed acopla diretamente a infraestrutura de Media

**Veredito:** PARCIAL  
**Prioridade:** Média — fronteira transacional

**Evidência:** `feed/composition/postPersistence.ts:1–14` importa repositórios e armazenamento local diretamente de `media/infrastructure`. `:32–74` usa uma transação para validar ativos staged, persistir o post e anexar os ativos.

**Trecho:** `import { attachStagedMediaAssets, findStagedMediaAssets } from "../../media/infrastructure/mediaAssetRepository";` e `return db.transaction(async (transaction) => { ... attachStagedMediaAssets(transaction, ...) ... });`.

**Impacto:** isso assegura atomicidade no banco compartilhado atual, mas atravessa a camada interna de infraestrutura do domínio Media. Uma extração física de Feed e Media exigirá um contrato de integração e compensação/reconciliação; a transação atual não atravessará duas bases físicas.

### A1-005 — A edição de perfil do frontend consome API pertencente ao cliente Social

**Veredito:** CONTRADITO  
**Prioridade:** Alta — ownership de domínio

**Evidência:** `front/src/modules/profile/hooks/useProfileEditController.ts:5–11` importa `socialGraphApi` do domínio Social. `:81–100` carrega a conta por `socialGraphApi.getMyAccount`; `:205–225` salva alterações com `socialGraphApi.updateMyAccount`. O backend possui roteador e casos de uso próprios em Profiles.

**Trecho:**

```ts
import { myAccountToUser, socialGraphApi } from "@/modules/social/services/socialGraphApi";
...
socialGraphApi.getMyAccount().then(...);
...
const response = await socialGraphApi.updateMyAccount(patch);
```

**Impacto:** relações sociais pertencem a Social, mas edição e apresentação de dados pessoais/comerciais pertencem a Profiles conforme a fronteira definida para o projeto. A tela Profile atualmente depende do serviço de Social para dados de perfil; esta dependência deve ser realocada para adapter/serviço de Profiles antes de declarar essa separação concluída. Não foi alterado nenhum contrato ou comportamento nesta auditoria.

### A1-006 — Perfil e Feed se integram por composição explícita; a dependência precisa continuar unilateral

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `feed/composition/router.ts:2–3` importa o leitor público de Profiles e a consulta de seguindo de Social no ponto de composição do Feed. A tela Profile consome publicações através do estado de aplicação Social (`app/state/SocialApplicationContext.tsx:243–255`). Isso confirma a direção observada nesses pontos, sem afirmar ausência de outras dependências não citadas.

**Trecho:** `import { accountViewsByIds } from "../../profiles/composition/publicApi";` e `import { listFeedFollowingAccountIds } from "../../social/composition/feedIntegration";`.

**Impacto:** a composição reúne dados necessários ao Feed sem declarar que Feed seja dono do perfil ou das relações. Manter esse acesso nos pontos de composição/contratos evita dependência de repositórios internos entre domínios.

### A1-007 — A pasta e o schema de Seek existem, mas não há execução de backend nem trilha de migração

**Veredito:** PARCIAL  
**Prioridade:** Prevista para após o fechamento do núcleo Social

**Evidência:** `Aplicativo/back/src/modules/seek` não contém arquivos, o roteador de Seek não aparece em `modules/index.ts:13–19` e `infra/database/src/schema/seek` existe. `infra/database/migrationTrackConfig.ts:4–30` registra somente `accounts`, `security`, `profiles`, `feed` e `media`, sem `seek`.

**Trecho:** as trilhas ativas terminam em `media: { schema: "media", source: "./src/schema/media/*.ts", ledgerTable: "media_migrations" }`; não há entrada `seek`.

**Impacto:** a presença de diretório não deve ser comunicada como módulo implementado. É coerente não ligar a descoberta Seek antes de fechar Social, mas o schema vazio e a ausência de trilha precisam ser tratados na etapa Seek, sem antecipar criação de domínio funcional agora.

### A1-008 — Mensagens e notificações têm pastas de frontend, sem módulo ou endpoint backend correspondente

**Veredito:** PARCIAL  
**Prioridade:** Alta para concluir a rede Social

**Evidência:** a árvore frontend contém `modules/messages` e `modules/notifications`. A lista backend não contém esses módulos; `modules/index.ts:13–19` não monta seus roteadores. O comando `rg -n 'fetch\\(|/api/v1|postJson|getJson|apiRequest|restSocialApi' Aplicativo/front/src/modules/messages Aplicativo/front/src/modules/notifications --glob '*.{ts,tsx}'` não encontrou chamadas de rede nesses módulos.

**Trecho:** o registro ativo termina com `router.use("/v1/social", feedRouter);`; nenhum roteador de mensagens/notificações é montado.

**Impacto:** não é possível considerar a rede social integralmente pronta para produção enquanto os fluxos de mensagem e notificação esperados no produto permanecerem somente na interface/estado local. Essa pendência deve ser incluída no plano antes de avançar para outro módulo.

## Contagem deste apêndice A1

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 4 |
| CONTRADITO | 1 |
| NÃO VERIFICADO | 0 |

**Uso no dossiê:** as fronteiras e ausências de módulos também alimentam os riscos priorizados em `99-sintese-lacunas.md`.
