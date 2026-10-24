# Auditoria técnica do Aplicativo Seekalive e plano de ação

**Data:** 24/10/2026
**Versão do documento:** 1.6
**Status:** A01 implementado, mas parcialmente validado. A02 começou: fluxo de schema alinhado ao PostgreSQL gerenciado da Replit, endpoints de liveness/readiness, 404 JSON, request ID, encerramento gracioso e testes HTTP básicos adicionados. A suíte isolada de fluxos autenticados foi implementada, mas não executada: a proteção detectou o ambiente marcado como produção e interrompeu o teste antes de conectar ou criar schema. A configuração explícita de confiança em proxy permanece adiada por decisão do usuário.
**Escopo autorizado:** `Aplicativo/front`, `Aplicativo/back`, contratos compartilhados e dependências diretas de banco/documentação para verificar prontidão de integração.  
**Fora do escopo:** `Gestor` e `Painel` — não foram auditados nem alterados.  
**Tipo de revisão:** auditoria estática de engenharia e verificação operacional não destrutiva. Esta versão registra a execução posterior do pacote A01; os achados da auditoria original permanecem datados e contextualizados.

## 1. Parecer executivo

**O Aplicativo está em um estado funcional de desenvolvimento, mas ainda não está pronto para produção nem para conectar todas as telas ao backend.** O projeto compila, a API sobe, o login consulta a API e uma primeira fatia de autenticação, onboarding, perfil básico, privacidade e relações sociais já existe. Isso é progresso real; não equivale a um backend completo.

O envio de e-mail via Resend foi habilitado somente no desenvolvimento e um e-mail de teste foi recebido. Isso não valida o fluxo completo de cadastro/confirmação; em produção, o envio continua desativado. Além disso, o frontend ainda executa muitas ações sociais e de conteúdo no próprio navegador, enquanto as APIs correspondentes não existem ou não são consumidas. Em especial, publicação/mídia, mensagens, avaliações, Seek, notificações e Shop ainda não têm integração completa.

**Decisão de prontidão:** pode-se continuar a implementação incremental no ambiente de desenvolvimento; **não se deve declarar o produto pronto para lançamento ou tratar as telas atuais como persistência real compartilhada**. Antes do lançamento são necessários, no mínimo, cadastro operacional, contratos confiáveis, migrações reproduzíveis, autorização testada no servidor e cobertura automatizada da API.

## 2. Como a auditoria foi conduzida e seus limites

- Oito agentes fizeram revisões independentes e somente de leitura em três passagens: três na auditoria inicial, três para cobrir as lacunas declaradas e dois para revisar os wrappers de interface restantes. As frentes foram interface, backend/segurança e contratos/documentação/integração. O agente principal conferiu diretamente os achados mais importantes e executou verificações não destrutivas.
- Foram examinados os pontos de entrada, serviços, contextos de estado, persistência local, telas de conta/perfil/Social/Seek/Shop/configurações, rotas da API, esquemas Drizzle, contratos compartilhados, scripts e documentação de backend.
- O repositório contém um número significativo de arquivos de UI e componentes genéricos. **Não afirmo que cada byte, implementação interna das dependências de terceiros, bundle ou cada linha de todos os arquivos tenha sido revisado manualmente.** Esta é uma auditoria profunda de código próprio e lógica prioritária, com análise estática, scanners automatizados de dependências/SAST/privacidade e verificações de compilação/teste; não é certificação, pentest nem prova do estado de produção. Os limites e escopo dos scanners estão detalhados na seção 10.9.
- Na auditoria inicial não foram criadas contas, alterados dados, executadas migrações ou conectados provedores. Na atualização A02, a configuração do pós-merge foi ajustada, mas nenhum schema/dado foi escrito: os testes só fazem `SELECT 1` e chamadas HTTP sem mutação.
- Achados estão classificados como **confirmados** quando observáveis no código ou em verificações executadas. Pontos que dependem de uma decisão de produto ou topologia estão explicitamente identificados como **risco/decisão pendente**.

## 3. Verificações executadas nesta auditoria

| Verificação | Resultado | O que demonstra — e o que não demonstra |
|---|---|---|
| `pnpm run typecheck` na raiz do projeto | Aprovado | Os pacotes incluídos no script passam no TypeScript. Não comprova comportamento correto nem cobertura de API. |
| `pnpm run test:social` | **42/42 testes aprovados** | Testa regras locais de conteúdo, descoberta, privacidade e relações no frontend. Não é uma suíte HTTP/backend nem teste de navegador. |
| `pnpm --filter @workspace/api-server run build` | Aprovado | O bundle do servidor é gerado. Não comprova cadastro operacional, banco saudável, segurança ou deploy. |
| `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/social run build` | Aprovado com avisos | Gera o bundle de produção. O JS principal tem 951,26 kB (277,86 kB gzip), excede o aviso de 500 kB e inclui avisos de sourcemap/importação mista. Sem essas variáveis, o Vite config encerra o build com erro. |
| Busca de marcadores demonstrativos no bundle de produção | Marcadores pesquisados não encontrados | Foram pesquisados nomes/valores específicos das fixtures; isso não prova exaustivamente que nenhum dado fictício possa ser empacotado ou renderizado em qualquer caminho. |
| `GET /api/healthz` | `200 {"status":"ok"}` | Liveness HTTP independente do banco. |
| `GET /api/readyz` | `200 {"status":"ready"}` no ambiente de desenvolvimento | Confirma `SELECT 1` no PostgreSQL gerenciado; não altera dados. |
| `GET /api/v1/auth/session`, sem cookie | `200`, sessão não autenticada | Confirma a resposta pública do estado de sessão. |
| `GET /api/v1/accounts/me`, sem cookie | `401 UNAUTHENTICATED` | Confirma que essa rota protegida exige sessão verificada. Não substitui testes de autorização entre duas contas. |
| `pnpm --filter @workspace/scripts run test:backend` | **10/10 testes aprovados** | Cinco testes de limites de segurança e cinco testes HTTP de runtime; não exercitam jornadas autenticadas com escrita. |
| `pnpm --filter @workspace/api-server run typecheck` e `build` | Aprovados | Confirma compilação/typecheck da API, não cobertura dos fluxos comerciais. |
| Script pós-merge | Sintaxe aprovada; guard de produção bloqueia ambiente explicitamente marcado como produção | Configurado, mas não executado neste pacote; portanto nenhum `db push` ocorreu. |
| SIGTERM da API | Smoke test aprovado em porta isolada | O processo drenou/fechou o servidor HTTP e o pool do PostgreSQL; não testa interrupção de uma solicitação longa. |

**Ainda não executado:** E2E de navegador; testes de escrita contra banco descartável para cadastro, confirmação, sessão válida, onboarding e relações entre duas contas; comparação de schema em banco vazio; teste multi-instância/rate limit; qualquer teste contra produção. A análise automatizada de dependências está registrada na seção 10.9. Existem scripts avulsos de auditoria de navegador (`scripts/audit-social-browser.mjs` e `scripts/audit-seek-browser.mjs`), mas não são chamados por um workflow de CI e não exercitam a integração HTTP real do backend. O build frontend só funciona quando `PORT` e `BASE_PATH` são definidos; o aviso de chunk grande e os avisos de sourcemap/importação mista precisam ser tratados ou aceitos explicitamente.

## 4. Estado real por área

| Área | Situação observada |
|---|---|
| Acesso e sessão | Login, consulta de sessão, CSRF, confirmação e logout têm cliente e rotas de API. Resend funciona apenas no desenvolvimento; cadastro/confirmação não foram validados ponta a ponta e produção permanece desativada. Recuperação de senha continua sem implementação real. |
| Cadastro pessoal/comercial | O formulário envia os campos pessoais/comerciais. O backend tem tabelas para conta e perfil comercial, mas a resposta de sessão e o modelo de conta que o frontend hidrata não transportam os dados completos do perfil comercial para as telas. |
| Onboarding | A API contém a operação de salvar interesses. Sugestões e interações com perfis no onboarding ainda incluem dados/estado demonstrativo. |
| Perfil e privacidade | Backend tem leitura/edição básica e preferências de privacidade. As telas correspondentes ainda dependem de dados locais; os formatos apresentados pelo cliente não estão integrados de forma completa aos DTOs da API. |
| Seguidores, solicitações, Círculo e bloqueios | Há endpoints no backend e a regra de Círculo é calculada a partir de seguimentos mútuos. A interface continua operando principalmente sobre estado local, sem sincronização com essas rotas. |
| Publicações e interações | O serviço selecionado é `demoContentAdapter`; posts/comentários são adicionados ao estado local. Likes, reposts, salvamentos e exclusões também são predominantemente locais. As rotas de conteúdo aparecem como propostas, não implementadas. |
| Fotos e vídeos | A seleção usa URLs `blob:` do navegador. Os arquivos não são enviados a um storage nem transformados em IDs persistentes que a API possa anexar a um post. |
| Seek, comerciantes, serviços, avaliações e eventos | A experiência de descoberta e dados de exemplo existem no frontend; não há API ativa de diretório/avaliações/eventos. Conta comercial é requisito de origem do Seek, mas o perfil comercial precisa ser carregado e mantido pela conta para que a descoberta real funcione. |
| Mensagens e notificações | Estado e interações locais/demonstrativos; não há tabelas nem operações de API para mensagens/conversas. A política de bloqueio para mensagens antigas ainda não pode ser garantida no servidor. |
| Shop | Catálogo é demonstrativo no desenvolvimento; não há API ativa do catálogo. Checkout/compra não deve ser considerado funcional. |
| Configurações | Diversos controles gravam preferências no navegador, mas nem todos alteram o comportamento efetivo de notificações, confirmações de leitura ou dados no servidor. |
| Organização do backend | Módulos de rota estão separados por domínio, mas parte da validação, regra de negócio e SQL está concentrada nos handlers. O schema atual declara dez tabelas: conta/e-mail/credencial/perfil comercial/desafio/sessão/interesses, follows/pedidos/bloqueios. |

## 5. Achados priorizados

### P0 — Impede o fluxo real de cadastro

**Cadastro/verificação ainda não têm validação ponta a ponta — confirmado.**
Desde 24/10/2026, Resend está habilitado somente no ambiente de desenvolvimento. Um envio direto de teste foi aceito pela API e o usuário confirmou o recebimento. Ainda não foi testado o fluxo de cadastro pendente, reenvio e confirmação do código com banco de teste. O envio em produção continua desativado.

**Impacto:** a integração do provedor foi comprovada, mas não se pode afirmar que o fluxo completo de conta esteja aprovado nem que o cadastro funcione em produção.
**Ação:** testar cadastro, reenvio, expiração, uso único, tentativas inválidas e emissão de sessão após confirmação em ambiente de desenvolvimento/teste. Não substituir por bypass de verificação.

### P1 — Frontend e backend ainda não representam uma aplicação integrada

**Ações de conteúdo podem parecer concluídas sem persistência remota — confirmado.**  
`Aplicativo/front/src/services/contentService.ts:11-15,55-68` seleciona um adaptador explicitamente local; `SocialContext.tsx:485-496` despacha o post/comentário para estado após esse adapter retornar; `mediaService.ts:50-67` só cria URLs de objeto. O adapter REST usa endpoints que ainda não existem.

**Impacto:** conteúdo não se torna compartilhado entre aparelhos e pode desaparecer ao recarregar; mídia não fica disponível para o servidor.  
**Ação:** conservar uma experiência demonstrativa claramente identificada no desenvolvimento, mas não apresentar a operação como publicação persistida em produção. Integrar somente depois que endpoint, upload e estados de erro estiverem disponíveis.

**Relações sociais e bloqueio ainda não usam as APIs ativas — confirmado.**  
`Aplicativo/front/src/context/SocialContext.tsx:523-599,715-757` atualiza relações/mensagens no estado local; armazenamento local é usado para ações por conta. O backend contém endpoints de follows/pedidos/Círculo/bloqueios, mas as telas não os consomem.

**Impacto:** relações vistas em um navegador não são as relações canônicas da conta; autorização local não protege dados.  
**Ação:** ligar as telas à API antes de considerar seguir, aprovar, remover follow ou bloquear como ações reais. Resolver loading, erro, repetição, conflitos e estados após recarga.

**O bloqueio não é aplicado uniformemente na busca — confirmado.**  
`Aplicativo/front/src/pages/Search.tsx:35,42-50` inclui contas em sugestões/resultados sem filtrar todas as relações bloqueadas; os posts também não descartam explicitamente o autor bloqueado. O contexto projeta o estado de bloqueio em usuários (`SocialContext.tsx:400-405`), mas a busca não aplica o filtro de forma consistente.

**Impacto:** na demonstração local, uma conta bloqueada pode continuar aparecendo em busca, apesar da regra de desaparecimento bilateral.  
**Ação:** filtrar sugestões, resultados de pessoas e publicações; testar busca e perfil após bloquear. A autorização final deve permanecer no servidor.

**Corrida entre bloquear e aprovar/seguir pode recriar uma relação — risco confirmado pelo fluxo concorrente.**  
Em `Aplicativo/back/src/modules/social/presentation/routes.ts:170-216`, a verificação de bloqueio ocorre antes de criar o follow. Em `:279-305`, aprovação lê pedido/bloqueio antes da transação e, dentro dela, insere o follow sem revalidar ambos. O bloqueio grava a relação e apaga follows/pedidos em outra transação (`:386-396`). Uma aprovação que já passou pelas verificações pode inserir o follow depois de o bloqueio ter apagado o pedido.

**Impacto:** em concorrência, um vínculo pode existir após o bloqueio e sobreviver ao desbloqueio, contrariando a regra de não restaurar relações. A corrida foi deduzida pela ordem das operações; não foi reproduzida em execução.  
**Ação:** serializar operações por par de contas e revalidar bloqueio/pedido dentro de transação/lock; adicionar teste concorrente.

**O perfil comercial não está hidratado do backend no estado de usuário — confirmado.**  
O cadastro comercial envia categoria e endereço (`front/src/pages/Register.tsx:129-147`) e o backend declara `business_profiles` (`infra/database/src/schema/auth.ts:62-73`). Porém, `front/src/services/authApi.ts:1-8` modela a conta sem esses dados; `AppContext.tsx:20-46` reconstrói usuário sem criar `commercialProfile` quando não há perfil local. `ProfileEdit.tsx:140-161` só atualiza o `commercialProfile` se ele já existir. O resultado de perfil básico do backend também não inclui o objeto comercial.

**Impacto:** após autenticação real, o frontend pode não ter os dados necessários para exibir/editar o comerciante e alimentá-lo no Seek, apesar dos campos terem sido enviados no registro. Isso não significa que o backend descarte a linha comercial: significa que o fluxo atual não a devolve nem a reidrata no cliente.  
**Ação:** buscar/retornar um DTO consistente de conta + extensão comercial após autenticação e permitir que o editor crie a extensão quando ainda não está hidratada. Validar que conta comercial continue sendo uma única identidade Social.

**OpenAPI/codegen não acompanha as rotas implementadas — confirmado.**  
`shared/api-spec/openapi.yaml:13-36` descreve somente `GET /healthz`; os clientes gerados refletem esse contrato mínimo. `shared/api-spec/orval.config.ts:4-6,24-26,43-55` aponta a saída para diretórios `lib/...`, enquanto os pacotes atuais residem em `shared/...`. A documentação mantém deliberadamente um inventário distinto: `docs/api/backend/endpoints.md` tem 130 operações candidatas, marcadas individualmente como ativas ou propostas; esse total não representa 130 rotas existentes.

**Impacto:** tipos/hooks gerados não representam as rotas reais; regenerar pode gravar em destinos inexistentes e deixar consumidores desatualizados. Há mais de uma fonte documental/gerada para o contrato.  
**Ação:** definir qual especificação alimenta o codegen, manter separado o inventário documental de propostas e corrigir os destinos de geração. Alinhar operações ativas com esquemas/respostas e verificar drift automaticamente.

**Achado do estado inicial (23/10): não havia testes automatizados de API nem fluxo de schema configurado — confirmado no repositório inspecionado.**
Naquele estado, `infra/database/package.json` oferecia `push`/`push-force`, sem histórico versionado; o script pós-merge não estava configurado. A API não tinha suíte HTTP. No A02, o comando forçado foi removido, o pós-merge foi configurado para desenvolvimento e agora há testes HTTP de runtime sem escrita.

**Impacto remanescente:** ainda não foi testado o primeiro schema num banco vazio nem as regras de autorização entre contas por uma suíte autenticada.
**Ação atual:** usar o fluxo nativo Replit — `push` somente no desenvolvimento e Publish para o diff de produção — e completar a suíte em banco isolado. Não houve alteração de schema em produção.

### P1 — Regras confirmadas precisam de cobertura server-side de todos os domínios

**Mensagens não existem no schema nem nas rotas; o bloqueio não pode ocultar/restaurar histórico no servidor — confirmado.**  
Os schemas atuais cobrem autenticação e relações, sem conversas/mensagens (`infra/database/src/schema/auth.ts`, `social.ts`); os módulos registrados não montam módulo de mensagens (`back/src/modules/index.ts`). A regra de produto exige ocultar mensagens antigas enquanto há bloqueio e restaurá-las ao desbloquear, sem apagar.

**Impacto:** o comportamento local de demonstração não pode garantir a regra para contas reais nem para outros dispositivos.  
**Ação:** implementar o domínio de mensagens com autorização por participante e filtros bilaterais de bloqueio; desbloqueio deve tornar o histórico visível novamente sem restaurar follows/pedidos removidos.

**Contadores de conta privada aparecem mesmo quando detalhes do perfil são ocultados — risco/decisão de privacidade pendente.**  
`back/src/modules/profiles/presentation/routes.ts:157-181` oculta bio/local/site para visitantes não aprovados, mas sempre inclui `stats`. O requisito confirmado define aprovação e acesso a publicações, porém não decide explicitamente se contagens devem ser públicas.

**Ação:** decidir e documentar a política antes de ampliar o endpoint. Não classifico isso como violação confirmada sem a regra explícita.

### P2 — Robustez, operação e consistência

1. **Logout pode ocultar falha remota — confirmado.** `front/src/context/AppContext.tsx:95-108` ignora erro de `logoutAccount()` e limpa o estado visual. Se a requisição falhar, a sessão do servidor pode continuar válida. Exibir resultado real do logout e testar a recarga em dispositivo compartilhado.
2. **Edição de identidade/perfil é local — confirmado.** `front/src/pages/settings/Account.tsx:40-57,60-81` mostra salvamento neste navegador. A tela não chama `PATCH /accounts/me`; a sessão do servidor pode sobrescrever campos locais numa nova carga. Conectar a fonte autoritativa ou deixar explícito que é apenas rascunho local.
3. **Editor comercial não inicializa perfil ausente — confirmado.** `front/src/pages/ProfileEdit.tsx:140-161` resulta em `commercialProfile: undefined` quando a extensão não existe. Corrigir junto com a hidratação comercial.
4. **Limitação por IP só vale dentro de um processo — confirmado.** `back/src/security/session.ts:145-169` usa `Map` em memória. Reinício ou múltiplas instâncias não compartilham contadores. É insuficiente como defesa distribuída de produção; confiar no IP também depende de proxy configurado corretamente.
5. **Paginação chamada de cursor é offset codificado — confirmado.** A implementação social decodifica offset e consulta `OFFSET`; inserções entre páginas podem duplicar ou pular itens.
6. **Filtros de bloqueio podem truncar páginas — confirmado.** Followers/following buscam `limit + 1`, depois removem contas bloqueadas e decidem `nextCursor` pelo conjunto filtrado (`back/src/modules/social/presentation/routes.ts:46-51,107-121,137-151`; projeção em `profiles/presentation/routes.ts:271-288`). A página pode indicar fim antes de alcançar os demais resultados. Calcular continuidade a partir das linhas brutas e avançar até preencher a página ou esgotar.
7. **Liveness não é readiness — confirmado.** `back/src/modules/health/presentation/routes.ts:6-9` não testa banco. A resposta `200` observada não prova prontidão do PostgreSQL.
8. **Formato de erro e documentação divergem — confirmado.** `docs/api/backend/endpoints.md:9-11` promete cadastro `201` e `requestId`; o handler de registro responde `202` e o handler global de `back/src/app.ts:41-55` não inclui `requestId`. O cliente de auth também lê `details`, enquanto parte das validações usa outro nome de campo. Alinhar e testar o contrato de erros.
9. **CSRF token rotacionado por leitura pode invalidar outra aba — confirmado.** `/csrf` sobrescreve o único hash da sessão a cada leitura (`back/src/modules/auth/presentation/routes.ts:141-147`; `infra/database/src/schema/auth.ts:93-103`). Duas abas podem manter tokens diferentes e a resposta mais antiga falhar. Retornar token vigente ou suportar concorrência de abas.
10. **Data de cadastro pode ser substituída pela data da sessão — confirmado.** `back/src/security/session.ts:85-87` carrega `sessions.createdAt`; `/auth/session` usa esse valor como `account.joinedAt` (`back/src/modules/auth/presentation/routes.ts:465-473`). O login usa `accounts.createdAt`. Selecionar a data de criação da conta também na consulta da sessão.
11. **Contador de tentativas de confirmação pode ser ultrapassado sob concorrência — risco.** O handler lê/testa/incrementa tentativas em operações separadas (`back/src/modules/auth/presentation/routes.ts:383-403`). Requisições concorrentes podem partir do mesmo contador. Fazer limite atômico e testar concorrência.
12. **CORS/topologia precisam de decisão explícita — risco dependente do deploy.** A API atual funciona atrás do mesmo host/proxy. Se front e API forem publicados em origens diferentes, política de origem/cookies/CSRF terá de ser definida. Não habilitar CORS amplo como correção automática.
13. **Controles de configurações não têm todos os efeitos anunciados — confirmado.** As preferências de categoria são salvas localmente, mas não filtram notificações; a preferência de confirmação de leitura tampouco condiciona a marcação local como lida. Implementar efeitos antes de apresentá-los como controles efetivos.
14. **Notificações são marcadas como lidas por timer — confirmado.** `front/src/pages/Notifications.tsx:40-44` chama `markAllNotificationsRead()` após três segundos, sem exigir visibilidade ou leitura. A página em segundo plano pode limpar indicadores; marcar por item visível ou interação explícita.
15. **Ação de iniciar conversa não funciona — confirmado.** `front/src/pages/Messages.tsx:39-44` tem botão com ícone, mas sem `onClick`, nome acessível ou fluxo de escolha de destinatário. Implementar o fluxo ou desabilitar e informar claramente.
16. **Parte das listas de conexão não está disponível — confirmado.** `front/src/components/profile/ConnectionList.tsx:31-35,55-60` permite a lista local de seguindo do próprio usuário, mas não disponibiliza seguidores nem listas de outros perfis, apesar da navegação pelos contadores. Integrar API ou ajustar a navegação.
17. **Voltar sem histórico pode sair do app — confirmado.** `Circles.tsx`, `ArticleEditor.tsx` e `ArticleReader.tsx` usam `window.history.back()` sem fallback interno em trechos inspecionados. Adicionar destino interno para deep links.
18. **Acessibilidade de ações está incompleta em pontos inspecionados — confirmado.** O botão de nova mensagem não tem nome acessível; `Notifications.tsx:104` usa `div` clicável sem semântica de botão/teclado. Usar controles semânticos e validar foco/leitor de tela.
19. **Agregação de avaliações após bloqueio depende de decisão de produto.** A lista remove avaliações de autores bloqueados, mas a média pode continuar incluindo todos os registros (`components/profile/CommercialProfilePage.tsx:144-152`). Definir se o bloqueio oculta apenas a avaliação ou também sua contribuição para nota/contagem.

## 6. Pontos positivos confirmados

- Autenticação própria já usa hash Argon2id e sessão opaca armazenada como hash; a conta não autenticada não acessa `/accounts/me`.
- A API recusa login sem e-mail verificado (`auth/presentation/routes.ts:299-301`).
- Escritas autenticadas usam CSRF em rotas implementadas; limite de tamanho de JSON e sanitização de campos sensíveis em logs já estão no servidor.
- O Círculo é calculado por follows aceitos nos dois sentidos; não há uma tabela independente de Círculo.
- Bloquear remove follows e pedidos entre as duas contas numa transação; somente o iniciador remove seu registro de bloqueio. Há, entretanto, uma corrida concorrente com follow/aprovação a tratar.
- O código deixa a demonstração de conteúdo e mídia identificável como local, em vez de fingir que já existe um serviço REST de conteúdo.
- Typecheck de workspace, 42 testes locais de frontend e build do backend passaram nesta rodada.

Esses pontos positivos não removem as lacunas de integração, testes ou persistência descritas acima.

## 7. Plano de ação passo a passo

### Fase 1 — Fixar os contratos e o fluxo de conta

1. **Definir DTO canônico para sessão/conta/perfil comercial.** A resposta ou uma consulta após login deve fornecer conta pessoal/comercial, campos de perfil permitidos, versão e estado de onboarding, sem expor dados privados por acidente.
2. **Alinhar o editor e o cadastro comercial.** Criar extensão comercial quando ausente, preservar os campos do registro e usar o mesmo perfil como fonte do Seek.
3. **Unificar OpenAPI, contratos Zod e cliente gerado.** Documentar como ativas somente as operações existentes, corrigir destino do codegen e testar geração sem drift.
4. **Fechar versão e apresentação dos termos.** O frontend deve exibir os documentos e enviar a versão efetivamente aceita.

**Critério de saída:** cadastro pessoal/comercial segue a mesma identidade Social; sessão reidrata a conta completa; erros/status/DTOs são iguais no servidor, tipos compartilhados e documentação. Resend funciona em desenvolvimento; produção permanece desativada até configuração própria, nunca simulada como sucesso.

### Fase 2 — Tornar a primeira fatia do backend reproduzível e testável

5. Para o PostgreSQL gerenciado da Replit, usar `drizzle-kit push` somente no desenvolvimento pelo pós-merge e o fluxo oficial de publicação para promover o diff de schema; não criar um executor próprio de migrations para produção nem usar `push-force`.
6. Completar testes HTTP/DB em banco de teste isolado para registro pendente, login antes/depois da confirmação, CSRF, expiração/reuso de código, onboarding, perfil, privacidade, follows, aprovação, Círculo, bloqueio e desbloqueio. O pacote A02 adiciona agora testes HTTP sem mutação para liveness, readiness, request ID, 404 e rota protegida.
7. Adicionar testes negativos entre contas: perfil privado, follow não aprovado, dados bloqueados, tentativa de desbloqueio por quem não iniciou e isolamento de sessão.
8. A02 adicionou 404 JSON, request ID no formato de erro, readiness dependente de `SELECT 1` e encerramento gracioso. Alinhar contrato/codegen ainda está pendente.
9. A confiança em proxy fica adiada até existir topologia concreta. O limitador atual é local ao processo; documentar/decidir uma solução compartilhada antes de executar múltiplas instâncias.
10. Corrigir operações concorrentes por par de contas para que bloqueio prevaleça sobre follow/aprovação; corrigir CSRF entre abas, contador de tentativas e `joinedAt`.

**Critério de saída:** o schema de desenvolvimento é aplicado pelo fluxo Replit configurado, produção recebe alterações pelo fluxo oficial de publicação e a suíte isolada de API prova as regras de autorização sem testes manuais. Saúde e prontidão já reportam estados diferentes; os demais critérios continuam pendentes.

### Fase 3 — Integrar telas que já têm endpoints

11. Implementar um cliente único para sessão, CSRF, serialização de DTOs, erros, timeout/cancelamento e invalidamento de cache.
12. Conectar conta, perfil, edição, privacidade, seguidores/seguindo, pedidos, Círculo e bloqueios às APIs existentes.
13. Aplicar o estado de bloqueio consistentemente à busca, listas e resultados, cobrindo os caminhos com testes.
14. Remover sucesso local enganoso para operações conectadas; estados de carregamento, vazio, erro, conflito e sessão expirada devem ser visíveis.
15. Manter o preview fictício restrito ao desenvolvimento e isolado da conta real; verificar também o bundle de produção.

**Critério de saída:** a mesma conta mostra as mesmas relações em nova sessão/navegador; falhas de rede não viram sucesso nem fallback para fixtures; bloqueio e autorização são aplicados pelo servidor.

### Fase 4 — Implementar conteúdo e mídia com autorização

16. Criar APIs de posts, artigos, comentários, likes, reposts e salvamentos com autoria, idempotência, paginação e ACL.
17. Implementar upload com ownership, validação server-side do conteúdo real do arquivo, limites, status de processamento e referências por ID — não por `blob:` URL.
18. Definir uma única regra para galeria: mídia publicada deve respeitar audiência do post; mídia independente de perfil comercial deve ter finalidade e autorização próprias.
19. Cobrir no backend e E2E conteúdo público, privado, de Círculo, autor e observadores bloqueados.

**Critério de saída:** upload + publicação persistem e são autorizados; nenhuma mídia privada pode ser obtida por URL/ID sem a ACL do conteúdo de origem.

### Fase 5 — Seek e os domínios do comerciante

20. Implementar leitura/edição de perfil comercial associado obrigatoriamente à conta Social, horários e serviços oferecidos.
21. Fazer o Seek descobrir apenas contas comerciais elegíveis; jamais converter perfil pessoal ou endereço residencial em localização comercial sem regra aprovada.
22. Implementar avaliações e respostas com as regras do produto: nota 1–5, uma avaliação por conta/comércio, sem autoavaliação e crítica não apagável pelo comerciante.
23. Implementar eventos e consultas de descoberta com cidade/categoria/filtros. GPS permanece opt-in; não inventar distância nem disponibilidade em tempo real.
24. Não prometer reservas, agendamentos, entrega, ingresso, pagamento ou compra até existirem os respectivos fluxos e contratos aprovados.

**Critério de saída:** resultados do Seek têm origem em contas comerciais persistidas e visíveis; apenas serviços marcados como oferecidos aparecem; avaliação e localização têm regras testadas.

### Fase 6 — Mensagens, notificações, configurações e Shop

25. Definir e implementar conversas/mensagens, participantes, política de recebimento, leitura e autorização.
26. Aplicar bloqueio ao envio e à leitura; ocultar histórico sem apagar enquanto o bloqueio estiver ativo e reapresentá-lo ao desbloquear, sem restaurar follows/pedidos.
27. Persistir notificações e preferências; remover leitura automática por timer e conectar cada controle da interface ao comportamento correspondente.
28. Implementar catálogo do Shop como leitura quando aprovado; tratar compra/checkout como escopo independente e não habilitado até a decisão de produto.

**Critério de saída:** regras de mensagem e bloqueio funcionam em servidor e entre dispositivos; nenhuma configuração é apresentada como ativa sem efeito; compra permanece indisponível até ser implementada.

### Fase 7 — Preparar publicação, sem confundir desenvolvimento com produção

29. Integrar os scripts existentes de auditoria de navegador a um fluxo reproduzível e adicionar E2E com frontend + API reais em ambiente isolado.
30. Fazer build de produção e verificar que fixtures interativas/dados demo não entram no bundle nem aparecem fora de desenvolvimento.
31. Preparar ambiente de staging, variáveis/secrets por ambiente, aplicação deliberada das migrations, backup/restore, monitoramento, limites, readiness e plano de rollback.
32. Executar smoke tests em staging com contas descartáveis e confirmar que produção não foi alterada antes da autorização explícita.

**Critério de saída:** checklist de release aprovado com evidência reproduzível; staging validado; nenhum caminho crítico depende de estado local ou dados fictícios.

## 8. Ordem recomendada imediata

Para a próxima etapa, seguir esta sequência, sem abrir trabalho no Gestor/Painel:

1. Corrigir a corrida entre bloqueio e aprovação/seguir e filtrar bloqueios também na busca; cobrir ambos com testes.
2. Definir o DTO da conta e garantir que perfil comercial seja reidratado após login e utilizável no Seek.
3. Alinhar contrato OpenAPI, codegen, formatos de erro e respostas; o runtime já devolve request ID e os dois health checks, mas os clientes públicos continuam defasados.
4. Completar testes autenticados HTTP/DB em banco isolado, sem utilizar produção.
5. Conectar perfil, privacidade e relações às APIs atuais.
6. Implementar conteúdo/mídia e então Seek/avaliações/eventos; mensagens, notificações e Shop vêm depois.

O envio real de e-mail fica como dependência explícita quando a etapa de provedores for autorizada. Até lá, o comportamento correto é mostrar indisponibilidade e não permitir entrada de conta não verificada.

## 9. Fontes principais examinadas

- Frontend: `Aplicativo/front/src/App.tsx`, `context/AppContext.tsx`, `context/SocialContext.tsx`, `services/authApi.ts`, `services/contentService.ts`, `services/mediaService.ts`, `pages/Register.tsx`, `pages/ProfileEdit.tsx`, `pages/settings/Account.tsx`, `hooks/useSeekDiscovery.ts`, páginas de perfil/Seek/Shop/mensagens/configurações e `tests/`.
- Backend: `Aplicativo/back/src/app.ts`, `security/session.ts`, `modules/index.ts` e módulos `auth`, `onboarding`, `profiles`, `social`, `health`.
- Dados e contratos: `infra/database/src/schema/`, `shared/contracts/src/`, `shared/api-spec/openapi.yaml`, `shared/api-spec/orval.config.ts`.
- Documentação comparada: `docs/api/backend/frontend-readiness-audit.md`, `endpoints.md`, `frontend-integration.md`, `implementation-and-tests.md`.

**Conclusão:** existe uma base inicial de backend e uma interface extensa de desenvolvimento, mas ainda há uma distância material entre o que a UI apresenta e o que persiste/autorizada a API. A integração deve avançar por fatias pequenas, cada uma com contrato, migração, testes no servidor e estados honestos na interface. Nenhum item deste relatório altera o escopo do Gestor ou do Painel.

---

## 10. Complemento da auditoria — áreas que faltavam cobrir

**Esta seção amplia e corrige o relatório anterior.** Três agentes adicionais fizeram uma segunda passagem somente de leitura, cobrindo páginas/componentes do frontend não detalhados antes, todos os fontes do backend/banco e as bordas de contrato, build, scripts e documentação. O agente principal conferiu diretamente as evidências citadas aqui. Nenhum arquivo de código, dado, configuração, segredo ou workflow foi alterado.

### 10.1 Novas verificações operacionais

| Verificação | Resultado | Limite |
|---|---|---|
| Build específico de produção do frontend, com `PORT=5000 BASE_PATH=/` | Aprovado; Vite transformou 2.344 módulos | Emite aviso de sourcemap em componentes UI, aviso de importação mista de `mockData.ts` e aviso de chunk principal acima de 500 kB. |
| Bundle gerado | `index-*.js` = 951,26 kB (277,86 kB gzip); CSS = 143,31 kB (21,95 kB gzip) | Tamanho não mede sozinho desempenho real, que depende de rede, dispositivo e execução no navegador. |
| Busca de marcadores fictícios específicos no bundle | Não encontrou as strings consultadas (por exemplo, `Café Central`, `Alex Rivera`, `usuario_demo`, `Tênis Runner Pro`) | Busca de strings selecionadas não prova ausência de todas as fixtures; nenhuma sessão visual de produção foi executada. |
| Tentativa de build sem as variáveis exigidas | Falhou no carregamento do Vite config: faltava primeiro `PORT`, depois `BASE_PATH` | Com ambas definidas, o build concluiu. O erro é de configuração ausente, não prova falha do código de aplicação. |

### 10.2 Frontend — novos achados

1. **P1 — A pessoa não consegue abrir os termos que aceita; o formulário declara versão fixa. Confirmado.** `Aplicativo/front/src/pages/Register.tsx:121-128` envia sempre `acceptedTermsVersion: "v1"`. Em `:487-504`, “Termos de Serviço” e “Política de Privacidade” são `span` com aparência clicável, sem `href` ou handler. Isso não demonstra que documentos não existam fora do app, mas demonstra que este fluxo não os apresenta. A aceitação/versionamento pode não corresponder ao texto efetivamente visto. **Ação:** publicar links acessíveis, versionar os documentos e enviar exatamente a versão apresentada.

2. **P2 — A busca contextual do Shop é decorativa. Confirmado.** `Aplicativo/front/src/components/layout/AppShell.tsx:37-64` renderiza campos de busca desktop e mobile sem estado, `onChange`, submit ou integração com o catálogo. Digitar não filtra nem navega. **Ação:** ligar ambos ao mesmo fluxo de busca ou remover/desabilitar o controle até existir busca.

3. **P2 — Editar foto de perfil e capa parece possível, mas não tem ação. Confirmado.** `Aplicativo/front/src/pages/ProfileEdit.tsx:180-195` mostra cursor, overlay e ícone de câmera sobre imagens, mas não contém input de arquivo nem handler nessas áreas. **Ação:** implementar seleção/preview/upload e erro; até lá, retirar a affordance de edição.

4. **P2 — Falha ao carregar sessão é confundida com sessão anônima. Confirmado.** `Aplicativo/front/src/context/AppContext.tsx:54-66` transforma qualquer rejeição de `getCurrentSession()` em `currentUser = null`, igual ao caso de sessão realmente ausente. Um erro temporário de rede pode mandar a pessoa para o fluxo público e esconder o problema. **Ação:** representar `authenticated`, `anonymous` e `session-error` como estados distintos, com tentativa de novo carregamento.

5. **P2 — Preferências de notificação e confirmação de leitura não afetam o comportamento demonstrativo. Confirmado.** `Aplicativo/front/src/pages/settings/Notifications.tsx:53-67,92-109` salva categorias no navegador; `SocialContext.tsx:360-370` filtra notificações por conta/bloqueio, não por essas categorias. `Privacy.tsx:170-173` salva `readReceipts`, mas `SocialContext.tsx:728-739` marca mensagens como lidas sem consultar a preferência e `MessageDetail.tsx:137-141` exibe o estado. O aviso em `Notifications.tsx:72` já informa corretamente que e-mail/push dependem de serviços ainda não conectados; o achado é sobre categorias locais e confirmação de leitura sem efeito. **Ação:** implementar o efeito no preview e depois no servidor, ou apresentar os controles como indisponíveis.

6. **P2 — Agregados de avaliações podem contradizer a lista visível após bloqueio. Confirmado na lógica local.** `Aplicativo/front/src/components/profile/CommercialProfilePage.tsx:144-154` remove avaliações bloqueadas da lista, mas a nota/contagem pode continuar agregando o conjunto original. **Ação:** derivar lista, nota e contagem da mesma coleção elegível; definir teste de bloqueio.

7. **P2 — Aplicação é empacotada em um chunk principal grande e páginas são importadas de modo eager. Confirmado; impacto de desempenho é risco a medir.** O build mediu JS principal de 951,26 kB minificado. `Aplicativo/front/src/App.tsx:12-51` importa as páginas estaticamente; o aviso do Vite mostra que a importação dinâmica de `mockData.ts` não cria chunk separado porque o módulo também é importado estaticamente por componentes/páginas. **Ação:** avaliar divisão por rota e extrair contratos/tipos/utilitários do módulo de fixtures; definir orçamento de bundle. Não alterar cegamente o limiar do aviso sem medir.

8. **Marcadores de fixtures não apareceram nas strings verificadas do bundle — verificação limitada, não garantia geral.** O frontend usa `import.meta.env.DEV` em pontos de carregamento (`AppContext.tsx:79-84`, `SocialContext.tsx:252-259`, `pages/Shop.tsx:70-71`), e as strings específicas consultadas não foram encontradas no artefato de produção. Isso é um resultado favorável para aqueles exemplos; não substitui teste completo de rotas, imagens e comportamento no build publicado nem prova de que todo dado de demonstração foi removido.

### 10.3 Backend e banco — novos achados

1. **P1 antes do lançamento — Recuperação e troca de senha não têm fluxo real. Confirmado por inventário de rotas.** `Aplicativo/back/src/modules/index.ts:1-14` registra os módulos atuais; as rotas de autenticação em `modules/auth/presentation/routes.ts` não expõem recuperação/troca de senha e `infra/database/src/schema/auth.ts:55-60` guarda somente hash e data da última troca. A tela pública de recuperação não equivale a um endpoint funcional. **Ação:** definir token separado, curto, de uso único e limitado; permitir invalidação de sessões; não reutilizar token/código de verificação de e-mail.

2. **P2 — Cabeçalhos de segurança não são definidos no middleware da API. Confirmado no app; exposição pública não confirmada.** `Aplicativo/back/src/app.ts:1-33` configura logger, cookies e parsers, sem política explícita CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` ou frame. Um proxy/CDN pode inseri-los; isso não foi verificado. **Ação:** definir a política na camada responsável e verificar os cabeçalhos efetivamente servidos em staging, sem presumir CORS amplo.

3. **P2 — Algumas invariantes só são validadas pela aplicação, não pelo schema do DB. Confirmado no schema inspecionado.** `infra/database/src/schema/auth.ts:15-40,62-73` não declara checks para faixa de idade, domínio de `accountType`/status nem garantia referencial entre tipo da conta e existência de perfil comercial; username tem índice único, mas não constraint de lowercase. `schema/social.ts` já contém checks de não seguir/bloquear a si próprio, portanto não é correto dizer que o schema inteiro não tem constraints. **Ação:** especificar invariantes, normalização e transição de conta comercial; proteger os que precisam valer para qualquer escritor com constraints ou estratégia transacional/migration apropriada.

4. **P2 — Consulta de bloqueios é sem paginação e faz leituras em sequência por conta. Confirmado.** `Aplicativo/back/src/modules/social/presentation/routes.ts:354-367` carrega todos os bloqueios, chama `findActiveAccountById` em loop e então `accountView`; `profiles/presentation/routes.ts:185-190` consulta relacionamento e estatísticas por item. **Impacto:** latência e carga crescem com o número de bloqueios. **Ação:** cursor/paginação e hidratação em lote, respeitando filtros de contas desativadas/bloqueadas.

5. **P2 — Caminho/método não encontrado não tem envelope 404 da API. Confirmado pela composição do Express.** `Aplicativo/back/src/app.ts:33-58` monta router e error handler, mas não instala um handler final de not-found. Requisições não correspondentes podem cair no 404 padrão do Express e não no envelope JSON documentado. **Ação:** handler terminal JSON com status, código e request ID coerentes.

6. **P2 — Encerramento gracioso não está implementado no entry point. Confirmado no código; consequência de deploy é inferida.** `Aplicativo/back/src/index.ts:18-25` não conserva o servidor retornado por `listen` nem trata SIGTERM/SIGINT; `infra/database/src/index.ts:13-14` cria o pool sem rotina de fechamento exportada. **Ação:** parar de aceitar novas requisições, drenar o servidor e fechar pool com timeout durante desligamento.

7. **P2 — Rate limiter local pode acumular buckets e fazer limpeza custosa. Confirmado.** Além de não ser compartilhado entre processos (já registrado no item 5.2), `Aplicativo/back/src/security/session.ts:145-163` mantém um `Map`; a limpeza só começa depois de 10 mil chaves e varre todas as entradas quando o tamanho continua acima desse limite. Chaves expiradas podem permanecer abaixo do limiar. **Ação:** limitar cardinalidade e custo por requisição; escolher armazenamento distribuído conforme a topologia antes de produção.

### 10.4 Contratos, migrações, documentação e build — novos achados/refinamentos

1. **P1 — O contrato documental/OpenAPI tem status de sucesso diferentes dos handlers ativos. Confirmado.** `docs/api/backend/endpoints.md:9` diz que cadastro responde `201`, enquanto o handler responde `202` (`Aplicativo/back/src/modules/auth/presentation/routes.ts:251`); o `docs/api/backend/openapi.json` gerado já descreve `202`, portanto a divergência específica está na prosa resumida. Em contrapartida, a especificação gerada anuncia `200` para operações que respondem `204`: recusa de pedido e bloqueio (`social/presentation/routes.ts:308-320,370-398`; regras padrão do gerador em `docs/api/backend/generate-contracts.mjs:468-471`). **Ação:** declarar explicitamente status por operação e testar o contrato contra rotas realmente registradas.

2. **P1 antes de ativar — O adapter REST de conteúdo não envia CSRF e os DTOs propostos divergem. Confirmado, adapter atualmente desativado.** `Aplicativo/front/src/services/contentService.ts:31-48` não envia `X-CSRF-Token`, mas mutações do servidor exigem `requireCsrf` (`back/src/security/session.ts:116-143`). `front/src/services/restContracts.ts:41-46` espera arrays para resultados de busca enquanto o gerador descreve envelopes paginados. Como as rotas de conteúdo ainda não existem e o adapter está desligado (`contentService.ts:55-68`), isto é bloqueio futuro de ativação, não falha de uma chamada atualmente usada. **Ação:** unificar cliente para sessão/CSRF/erro/DTO antes de ligar esse adapter.

3. **P1 operacional — achado inicial parcialmente resolvido pelo A02.** No estado inicial, havia `push`/`push-force`, sem pós-merge configurado. O projeto usa PostgreSQL gerenciado da Replit; o A02 removeu o comando forçado, configurou `Seekalive/Projeto/scripts/post-merge.sh` para sincronizar somente o desenvolvimento e acrescentou recusa de ambientes explicitamente marcados como produção. O script não foi executado nesta etapa, então nenhum `push` ocorreu. **Ação restante:** testar a criação do schema em banco isolado; produção permanece no fluxo oficial Publish, sem runner próprio ou DDL no startup.

4. **P2 — Instruções de ambiente/runtime não correspondem totalmente ao código. Confirmado.** `Seekalive/Projeto/replit.md:12,16` lista apenas `DATABASE_URL` como variável obrigatória e afirma Node 24; `Aplicativo/back/src/security/session.ts:9-11` exige `SESSION_SECRET` com ao menos 32 bytes, e `.replit:1` configura `nodejs-20`. Não se verificou se a plataforma injeta ou substitui a versão; o achado é a inconsistência documental/configurada, não que o serviço necessariamente esteja rodando Node 20. **Ação:** confirmar runtime suportado e atualizar instruções com nomes de variáveis necessárias, sem expor valores.

5. **P2 — Scripts e fontes documentais continuam divergindo do grafo atual. Confirmado.** `docs/api/backend/frontend-readiness-audit.md:39-47` mantém afirmações antigas de que a autenticação não existe junto de afirmação posterior de que foi implementada e informa sete tabelas, enquanto os schemas atuais declaram dez (`infra/database/src/schema/auth.ts` e `social.ts`). `docs/api/backend/render-docs.mjs:10-19` republica essa fonte no HTML. O gerador de contratos (`generate-contracts.mjs:539-567`) alimenta um catálogo documental separado do OpenAPI em `shared/api-spec`; isso é explicitado em `docs/api/backend/README.md:18`, mas precisa continuar claro para que “130 operações candidatas” não seja confundido com rotas reais.

6. **P2 — Comandos gerais podem ultrapassar o escopo autorizado. Confirmado.** `pnpm-workspace.yaml:37-44` inclui Aplicativo, Gestor, Painel e outros pacotes. O `typecheck` de raiz filtra Aplicativo/shared/infra/scripts/artifacts (`package.json:10`), mas o `build` recursivo (`package.json:8`) pode executar scripts de todos os workspaces. Por isso a nova verificação usou o build específico do frontend e não executou o build global, preservando Gestor/Painel fora do escopo. Corrigir também a afirmação abrangente em `replit.md:8` de que o typecheck cobre todos os pacotes.

### 10.5 Cobertura desta passagem e limites restantes

- **Frontend lido nesta passagem pelos agentes:** rotas e páginas de autenticação, onboarding, Social, Seek, Shop, mensagens, notificações, artigos, perfis e configurações; componentes próprios de brand/content/layout/post/profile/seek/social; 56 dos 58 arquivos em `components/ui` (os dois restantes foram conferidos pelo agente principal); contextos, serviços, hooks, tipos, adapters de storage, bibliotecas de regra, os dois testes, todo o arquivo `mockData.ts` (805 linhas) e `SettingsSubheader.tsx`. O agente principal verificou diretamente os achados citados e o artefato de build.
- **Backend/banco lidos nesta passagem:** todos os arquivos sob `Aplicativo/back/src` e `infra/database/src`, configurações/build do backend/banco e contratos Zod usados na validação.
- **Contratos/execução/documentação lidos nesta passagem:** OpenAPI, configuração Orval e cliente gerado; scripts de teste/auditoria e pós-merge; manifests, workspace, configs do Vite/Drizzle/artifacts; documentação API/deploy.
- **Ainda não revisados linha a linha:** implementação interna das dependências de terceiros e cada artefato binário/gerado. Os scanners automatizados foram executados; ao menos a auditoria de dependências tem escopo padrão do workspace, então seus totais não são atribuídos integralmente ao Aplicativo. A leitura estática não cobre todas as combinações de estado visual nem todas as interações em navegador. Gestor/Painel não foram auditados manualmente nem alterados; scanners automáticos podem ter escopo mais amplo que o pedido.
- **Ainda sem prova operacional:** E2E em navegador contra produção/staging, API testada com duas contas concorrentes, migration contra DB limpo, cabeçalhos/proxy/TLS efetivamente publicados, consultas/índices no PostgreSQL, desligamento em orquestrador, rate limiting multi-instância e ausência de todas as fixtures em todas as rotas do bundle. Esses itens não foram descritos como aprovados.

### 10.6 Complemento ao plano de ação

33. Exibir termos e política de privacidade reais no cadastro e versionar de forma consistente o documento apresentado e o aceite enviado.
34. Separar erro de rede de sessão anônima; incluir estado de recuperação e não ocultar falha de carregamento.
35. Ligar preferências de categoria e confirmação de leitura a efeitos observáveis, ou marcar controles indisponíveis; usar botões/links semânticos e acessíveis para cada ação.
36. Implementar busca do Shop e upload de avatar/capa ou retirar seus controles até a implementação; alinhar nota/contagem das avaliações com a lista elegível após bloqueio.
37. Definir recuperação/troca de senha; responder 404 em JSON; definir headers de segurança na camada correta; implementar shutdown gracioso, paginação/lote da lista de bloqueios e proteção de rate limit adequada à topologia.
38. Substituir a promoção implícita de schema por migrations protegidas e documentar corretamente os passos de deploy, runtime e variáveis obrigatórias.
39. Dividir o bundle por rota/domínio, resolver ou aceitar explicitamente os avisos do build e adicionar um orçamento/teste automatizado que verifique bundle e ausência de fixtures interativas em produção.
40. **P0 antes de produção — Atualizar `proxy-addr` usado pelo Express para versão corrigida (2.0.8+) e testar o IP de origem sob a topologia real de proxies.** Na auditoria de 23/10, o pacote 2.0.7 foi sinalizado como crítico e `trust proxy` estava como número `1`. Em 24/10, a dependência foi confirmada em 2.0.8 e, por decisão do usuário, a configuração explícita de confiança foi removida; Express voltou ao default `trust proxy = false`. A topologia real ainda precisa ser definida antes de staging/produção.
41. **P1 — Atualizar o Orval do pacote compartilhado de API antes de gerar a partir de especificações não confiáveis.** O scanner encontrou 12 avisos críticos/altos em `orval@8.9.1` (dependência de desenvolvimento de `shared/api-spec`), com correções indicadas nas versões 8.21.0/8.22.0. Hoje a especificação é local e versionada; o risco descrito exige especificação controlada/influenciada por atacante ou referências externas. Fixar e testar a versão, limitar `$ref` remoto/local e validar alterações antes do codegen.
42. **P2 — Acompanhar a sinalização alta de Zod antes de ampliar validação de entrada.** `zod@3.25.76` está no grafo runtime da API/contratos/banco; o scanner sugere correção em 4.6.6 (mudança major). A API já tem rotas de autenticação, onboarding e relações sociais; na busca realizada, o único array de entrada definido no contrato é `interests`, limitado a 100 itens e 80 caracteres por item (`shared/contracts/src/auth.ts:60`). A condição de array sem limite não foi identificada nos schemas atuais. Manter esses limites, verificar aplicabilidade da advisory e planejar migração com testes antes de introduzir coleções sem limite.
43. **P2 — Atualizar o Vite do ambiente de desenvolvimento e limitar exposição da ferramenta.** `vite@7.3.3` (dev dependency do frontend) recebeu sete avisos no scan; vários dependem de Windows, middleware customizado ou paths específicos e não correspondem ao build de produção atual. Como o servidor de desenvolvimento escuta `0.0.0.0` e `allowedHosts: true` (`front/vite.config.ts:67-71`), manter versão corrigida e não tratar o dev server como serviço público.
44. **P3 — Reduzir e documentar o armazenamento temporário de email no navegador.** O HoundDog marcou `sessionStorage["seekalive:pending-email"]` como dado pessoal de baixa severidade (`front/src/pages/Register.tsx:151`). É email, não senha/token, e o armazenamento é de sessão; preferir estado em memória quando não for necessário sobreviver à navegação, ou documentar a retenção.

**Conclusão complementar:** as passagens encontraram problemas funcionais adicionais de cadastro/controles de interface, riscos de operação e divergências de contrato/deploy. O build de produção do frontend funciona com as variáveis necessárias, mas é grande e ainda não foi validado em navegador. O scanner SAST concluiu sem achados; o HoundDog reportou somente o email temporário em sessionStorage (baixo). O scanner de dependências reportou 62 ocorrências no escopo padrão do workspace (12 críticas, 26 altas, 18 moderadas, 6 baixas), número que **não** representa o Aplicativo isoladamente. No grafo do Aplicativo/shared API foram confirmados `proxy-addr`, Zod, Orval e Vite; a aplicabilidade depende das condições descritas nos itens 40–43. As strings de fixtures consultadas não apareceram no bundle; isto é evidência parcial, não certificação de ausência em todos os fluxos. Gestor/Painel não foram auditados manualmente nem alterados; o scanner automático pode ter analisado mais que o escopo autorizado.

### 10.7 Revisão integral dos wrappers de interface

Os 58 arquivos sob `Aplicativo/front/src/components/ui` foram revisados linha a linha: agentes leram grupos sem sobreposição e o agente principal completou a conferência dos dois arquivos que ficaram fora das listas iniciais. Os achados foram confrontados com o código e uso no app. **A maioria é wrapper fino de Radix/shadcn e não apresentou defeito próprio relevante.** Os itens a seguir são riscos de componente, com indicação explícita se a tela atual os utiliza:

1. **P2 — Botão de fechar notificação sem nome acessível; alcança os toasts do app. Confirmado.** `components/ui/toast.tsx:71-85` renderiza o X sem `aria-label` ou texto oculto; `components/ui/toaster.tsx:4,26` usa esse botão no toaster global. **Ação:** nome acessível em português e teste com leitor de tela/árvore acessível.
2. **P2 — Contrato de refs incompatível com elementos renderizados. Confirmado; componente não apareceu em uso fora do próprio pacote na busca realizada.** `components/ui/alert.tsx:35-55` declara refs de parágrafo; `AlertTitle` renderiza `h5` e `AlertDescription` renderiza `div`. Typecheck atual passa, mas consumidor recebe um contrato incorreto para focar/medir o elemento. Corrigir tipos ou tags e testar ref.
3. **P2 — Props de acessibilidade/DOM declaradas e descartadas nos helpers de gráfico. Confirmado; componentes de gráfico não têm consumidor no app atualmente.** `components/ui/chart.tsx:103-130,261-287` declara props de `div`, mas não as encaminha ao elemento; `id`, `role` e `aria-label` fornecidos podem não chegar à árvore acessível. Encaminhar props suportadas e definir nome de região ao consumir.
4. **P2 — Valor numérico zero some do tooltip de gráfico. Confirmado; helper sem consumidor atual.** `components/ui/chart.tsx:241-245` usa `item.value &&`, que não renderiza `0`. Condicionar a `null`/`undefined`.
5. **P2 — Carrossel captura teclas de seta de descendentes. Confirmado no wrapper; `Carousel` não tem consumidor atual.** `components/ui/carousel.tsx:86-97,135-141` registra captura e sempre chama `preventDefault` para setas, inclusive quando foco está em campo editável ou outro controle. Ignorar descendentes editáveis/interativos. A região também pode ficar sem nome se um futuro consumidor não passar `aria-label`/`aria-labelledby`.
6. **P2 — Prop `separator` não é implementada no breadcrumb. Confirmado; nenhum uso do componente foi encontrado no app.** `components/ui/breadcrumb.tsx:7-12` a declara e espalha props restantes diretamente em `nav`, portanto ela não controla o separador e pode vazar como atributo não padrão. Implementar a prop ou removê-la.
7. **P3 — Addon do InputGroup não focaliza textarea. Confirmado; nenhum consumidor foi encontrado.** `components/ui/input-group.tsx:58-75` procura somente `input`, enquanto o mesmo arquivo oferece `InputGroupTextarea` (`:145-158`). Incluir textarea na busca ou usar associação explícita.
8. **P3 — API de `IconButton` permite esquecer nome acessível. Confirmado como possibilidade; todos os sete consumidores encontrados em `pages/StyleGuide.tsx:140-146` fornecem `label`.** Tornar `label` obrigatório ou garantir `aria-label` equivalente; atualmente não foi encontrado um botão sem nome entre esses consumidores.
9. **P3 — Estado do menu lateral é gravado, mas não restaurado, e atalho global pode interferir na digitação. Confirmado no componente, que não tem consumidor fora de si no app.** `components/ui/sidebar.tsx:74-86` inicializa com `defaultOpen` sem ler o cookie que grava; `:97-109` não ignora eventos em input/textarea/contenteditable nem repetição. Não confundir esse wrapper sem uso com `components/social/SocialDrawer.tsx`, que é a navegação atualmente usada.
10. **Não classificado como defeito:** skeleton usa `Math.random()` (`sidebar.tsx:603-613`), mas o frontend entra via `createRoot` (`src/main.tsx:1-5`) e não foi encontrado renderizador SSR/hydration; portanto o risco de mismatch de hidratação sugerido inicialmente não se aplica à arquitetura atual.
11. **Sem novos achados** em `drawer.tsx` e `slider.tsx`; ambos encaminham props/ref para as primitivas Vaul/Radix e não foram identificados como consumidores de fluxo atual.

### 10.8 Testes, fixtures e dados públicos revisados

- Foram lidos integralmente `Aplicativo/front/tests/content.test.ts` (432 linhas) e `seekDiscovery.test.ts` (200 linhas). Juntos contêm 42 testes de regras do frontend, seleção/local storage e fixtures; o executor `scripts/test-social.mjs` os compila com `import.meta.env.DEV = true`. Não são testes de API nem de renderização real.
- Alguns testes verificam texto/regex do código-fonte (`content.test.ts:187-215,240-248,283-327`), não o comportamento do componente no navegador. São úteis como guardrails de estrutura, mas podem ser frágeis a refactors e não provam interação, autorização do servidor ou fluxo acessível.
- O catálogo `public/data/ibge-cities-20261022.json` contém 5.571 linhas de municípios, IDs únicos e nenhuma linha inválida conforme validação estrutural local; ocupa 167.950 bytes. O próprio JSON identifica o serviço oficial do IBGE e data de coleta `2026-10-22`. A validação foi estrutural; não foi comparada ao catálogo online nem a uma licença externa.
- O arquivo `public/demo-seek/CREDITS.md` identifica as imagens de exemplos como ilustrativas e atribui fontes Pexels. Não se fez auditoria jurídica dos termos/licenças das imagens.
- `mockData.ts` contém dados claramente fictícios para pessoas, comércios, posts, avaliações, mensagens e usuário `usuario_demo` (linhas 147-780). A aplicação os seleciona sob `import.meta.env.DEV` em pontos centrais (`SocialContext.tsx:252-259,322`); no bundle de produção, os marcadores literais consultados não apareceram. A separação de modo é visível no código, mas a busca parcial de strings não substitui o E2E de produção que permanece pendente.

### 10.9 Scanners automatizados de segurança e privacidade

Execução em 2026-10-23, em paralelo, sem editar código:

| Scanner | Resultado | Interpretação |
|---|---|---|
| Auditoria de dependências | 62 ocorrências agregadas no escopo padrão do workspace: 12 críticas, 26 altas, 18 moderadas, 6 baixas | Não usar esse total como contagem do Aplicativo. `pnpm why` e manifests confirmaram as dependências descritas nos itens 40–43; outros pacotes do workspace não foram atribuídos ao Aplicativo nem tiveram seu código auditado. |
| SAST | Concluído, 0 achados | Resultado do scanner, não prova de ausência de defeitos ou de vulnerabilidades em runtime. |
| HoundDog | 1 achado baixo: email em sessionStorage, `Register.tsx:151` | Dado temporário; não é senha, segredo ou token. Aplicar minimização/retenção conforme item 44. |

**Detalhes de aplicabilidade confirmados no código:**

- `proxy-addr@2.0.7` é dependência transitiva do Express no backend. A condição de spoofing do aviso exige subnet de confiança malformada; o app usa `trust proxy = 1`, portanto o scanner detecta dependência vulnerável, mas não foi reproduzida a pré-condição descrita. A topologia de proxies publicada continua sem verificação.
- `zod@3.25.76` está no grafo runtime da API/contratos/banco. O aviso trata de arrays muito grandes e sem limite; a API possui rotas ativas, mas o único schema de array de entrada encontrado limita `interests` a 100 valores de até 80 caracteres. Não foi demonstrada a condição da advisory nos schemas atuais.
- `orval@8.9.1` é dependência de desenvolvimento de `shared/api-spec`; hoje gera a partir de especificação local versionada. As ocorrências críticas/altas de codegen descritas dependem de input malicioso ou influenciado por atacante. Não confundir risco de ferramenta de geração com execução normal da API.
- `vite@7.3.3` é dependência de desenvolvimento do frontend. Os avisos têm condições específicas e não indicam que o bundle de produção use o servidor Vite; a configuração atual, porém, expõe o dev server em todas as interfaces, então atualização e controle de acesso são recomendados.
- `body-parser@2.2.2` também foi reportado como baixo no grafo Express, mas o `express.json` atual usa limite literal válido de `32kb` (`Aplicativo/back/src/app.ts:30`); a falha descrita exige `limit` inválido. Não há evidência da condição no código atual.

**Resultado da cobertura restante:** código próprio do frontend, rotas/backend, esquemas do banco, contratos, documentação e 58 componentes UI locais foram percorridos em múltiplas passagens; testes e scanners automatizados foram executados. O que ainda requer trabalho além da leitura estática é corrigir/validar os achados, executar E2E em browser e infraestrutura real, verificar arquivos binários/artefatos e fazer auditoria jurídica externa das mídias. Não se declara o app “perfeito” nem pronto para produção.

---

## 11. Plano coordenado de resolução das pendências

**Este é o plano de execução consolidado a partir dos achados das seções 1–10. Ele prevalece como sequência recomendada sobre as listas preliminares das seções 7–8 e complementos 10.6.** As referências `A01–A12` agrupam pendências já descritas; não são novas funcionalidades.

### 11.1 Coordenação, priorização e limites

- **Driver proposto:** IA coordenadora — mantém sequência, dependências, critérios de aceite e atualização deste documento; não representa aprovação de mudanças de código.
- **Aprovador:** usuário Seekalive.
- **Executor técnico:** agente de implementação a designar em cada etapa.
- **Status geral:** A01 aplicado e parcialmente validado; confiança explícita em proxy foi removida do escopo atual por decisão do usuário, com Express no padrão `trust proxy = false`. A02 teve a primeira parte executada; continuam pendentes os testes com escrita em banco isolado e a cobertura de autorização entre contas.
- **Estimativas e datas:** não definidas, pois capacidade/equipe e duração de referência não foram informadas. Não inventar prazos nem usar números RICE sem dados de usuários.
- **Prioridade:** P0 bloqueia lançamento; P1 deve ser resolvida antes de ativar o domínio correspondente; P2 é necessária antes de ampliar cobertura/escala; P3 é qualidade e consistência.
- **Limite fixo:** apenas Aplicativo e dependências compartilhadas diretamente ligadas a ele. Gestor/Painel fora do trabalho manual.
- **Provedores externos:** Resend está autorizado e testado somente para envio em desenvolvimento; produção permanece desativada. Armazenamento de mídia, push e pagamento seguem sem conexão e exigem autorização explícita. Nunca criar sessão nem simular confirmação de e-mail.

### 11.2 Sequência de trabalho

| Ordem / pacote | Prioridade e status | Escopo e pendências agrupadas | Dependências | Critério de conclusão verificável |
|---|---|---|---|---|
| **A01. Corrigir dependências de risco no backend e codegen** | P1 antes de produção/codegen; **implementado, parcialmente validado** | Manter `proxy-addr` corrigido no runtime do Express; a configuração explícita de confiança em proxy foi retirada. Express usa `trust proxy = false`, sem confiar em cabeçalhos encaminhados. Configuração de proxies fica adiada até a topologia de staging/produção ser conhecida. Orval 8.22.0; negar `$ref` externo/arquivo antes do dereference e testar codegen. Vite 7.3.7 no frontend; o sandbox também foi atualizado antes da validação. Atualizar o resolvedor de formulários para manter o typecheck compatível; triar advisories restantes sem ampliar mudanças sem autorização. | Nenhuma para iniciar A02. A política de proxy só volta a ser necessária antes de validar a implantação real. | **Validado localmente:** typecheck, builds, codegen e teste HTTP mostram `trust proxy = false` por padrão e ignoram XFF forjado. A01 continua parcial pelas dependências altas ainda não triadas; não se afirma validação de proxy em produção. |
| **A02. Tornar schema e testes do backend reproduzíveis** | P1; execução parcial | Usar PostgreSQL gerenciado Replit: `push` normal no desenvolvimento via pós-merge e Publish para produção; remover `push-force`; separar readiness/liveness; JSON 404 e request ID; encerramento gracioso; testes HTTP sem mutação. Ainda faltam os testes de jornadas autenticadas e regras entre contas em banco isolado. | A01 para usar dependências corrigidas; banco descartável/desenvolvimento para qualquer teste com escrita. Não exige configurar proxy agora. | **Dado** o fluxo de desenvolvimento, **quando** o pós-merge sincroniza o schema, **então** usa apenas `push` regular e não executa no processo de produção; a suíte isolada ainda deve validar autenticação, autorização e erros sem usar produção. |
| **A03. Unificar contratos e perfil da conta** | P1; pendente | Definir OpenAPI canônico das rotas reais, corrigir destino do codegen, alinhar status/erros/DTOs; fazer sessão reidratar conta pessoal/comercial, endereço e campos comerciais permitidos; garantir que editar perfil crie a extensão comercial quando ausente; versionar termos e política e oferecer links acessíveis; representar separadamente estado anônimo e erro de sessão. | A02 para testes de contrato; A01 para Orval. | **Dado** login de uma conta comercial, **quando** a sessão for carregada novamente, **então** os mesmos dados comerciais retornam do servidor e podem ser editados; termos exibidos correspondem à versão enviada no aceite; erro de rede não é mostrado como logout. |
| **A04. Preservar e testar as regras de autenticação** | P1; fluxo de e-mail de desenvolvimento ainda precisa de E2E | Login por usuário ou email; conta real sem email confirmado não recebe sessão nem acessa recursos; código de confirmação tem expiração, uso único e limite atômico; CSRF funciona em múltiplas abas; corrigir `joinedAt`; planejar recuperação/troca de senha separadamente. Resend já foi testado para entrega em desenvolvimento; produção permanece desativada. | A02 e A03; E2E com banco descartável. | **Dado** email não verificado, **quando** a conta tenta entrar, **então** não recebe sessão; testes provam envio, reenvio, expiração, uso único e confirmação em desenvolvimento. Produção só pode ser habilitada após configuração e autorização próprias. |
| **A05. Fechar privacidade, bloqueios e relações no servidor** | P1; pendente | Corrigir corrida entre bloqueio e follow/aprovação; validar transacionalmente; filtros consistentes em busca, perfil, comentários, avaliações e conversas; corrigir paginação filtrada e consulta de bloqueios; definir visibilidade de contagens privadas; conectar preferências e telas às rotas reais. | A02–A04. | **Dado** um perfil privado, **quando** alguém pede para seguir, **então** o pedido pendente não concede acesso; após aprovação, publicações do perfil ficam visíveis ao seguidor aprovado, mas Círculo exige seguimento mútuo. **Dado** bloqueio, **então** ambos desaparecem um para o outro, follows e pedidos são removidos; só o iniciador desbloqueia, e desbloquear não restaura relações. |
| **A06. Conectar frontend aos endpoints existentes** | P1; pendente | Criar um cliente único para sessão, CSRF, DTO, erros, timeout/cancelamento e cache; conectar conta, perfil, privacidade, seguidores, pedidos, Círculo e bloqueios; eliminar sucesso local enganoso, incluindo logout e edição local; implementar erros/repetição/conflito. | A03–A05 aprovados e testados. | **Dado** a mesma conta em novo navegador, **quando** carregar perfil e relações, **então** o estado corresponde ao servidor; falha de rede permanece visível e nunca converte mutação em sucesso nem troca silenciosamente para dados fictícios. |
| **A07. Implementar publicação e mídia com limites claros** | P1 para considerar Social integrado; armazenamento externo bloqueado até autorização | Definir contratos/ACL de posts, artigos, comentários, likes, reposts e salvos; preparar interface do serviço de mídia, validação server-side, ownership, limites e referência por ID. Não tratar `blob:` como persistência nem ligar storage provider sem autorização. | A02, A03, A05 e A06; decisão/autorização do provider antes de persistência real de arquivos. | **Dado** mídia ainda local no preview, **quando** a pessoa publica ou recarrega, **então** a UI não declara persistência entre aparelhos. Após integração autorizada, somente IDs persistentes e ACL do conteúdo permitem acesso, com testes de conteúdo público/privado/Círculo/bloqueado. |
| **A08. Concluir Seek e perfil comercial** | P1 para diretório real; pendente | Descobrir apenas contas comerciais vinculadas à conta Social; completar horários, serviços, delivery, mesa, agendamento e eventos conforme domínio; exibir somente serviços explicitamente oferecidos; criar avaliações com nota 1–5, sem autoavaliação e sem exclusão pelo comerciante; resolver agregados de avaliações com bloqueio. | A03–A07; dados comerciais persistidos e regra de localização definida. | **Dado** conta pessoal ou comercial incompleta, **quando** buscar no Seek, **então** só a conta comercial elegível aparece; serviços “não oferecido/não informado” não aparecem; avaliações e nota obedecem às regras, sem dados demonstrativos em produção. |
| **A09. Implementar mensagens, notificações e configurações** | P2; pendente | Criar conversas/mensagens e autorização por participante; bloquear leitura/envio bilateral; ocultar mensagens antigas durante bloqueio e restaurá-las ao desbloquear; persistir notificações e preferências; remover leitura automática por timer e ligar cada controle ao comportamento real. | A02–A06; A05 para política de bloqueio. | **Dado** duas contas bloqueadas, **quando** uma abre conversas ou tenta enviar mensagem, **então** conteúdo e envio ficam indisponíveis; ao desbloquear, histórico antigo reaparece, sem reativar follows/pedidos. Preferências têm efeito observável em teste. |
| **A10. Entregar Shop sem antecipar checkout** | P2; catálogo pode ser separado de compra | Implementar catálogo/endpoints somente após contratos aprovados; busca da interface deve funcionar; manter checkout/pagamento desativado até aprovação e provider autorizado. | A02, A03 e decisão de escopo do comércio. | **Dado** catálogo disponível, **quando** a pessoa busca produto, **então** resultados correspondem ao catálogo persistido; não há ação de pagamento/compra alegando sucesso sem integração aprovada. |
| **A11. Qualidade de interface, acessibilidade e performance** | P2/P3; paralelo às integrações | Corrigir rótulo acessível do fechar toast ativo; corrigir contratos de refs e props dos wrappers; impedir carrossel de capturar setas de controles internos; completar breadcrumb/InputGroup se forem usados; eliminar controles sem ação; dividir bundle por rota após medir. | Pode começar após A01; regressão visual exige preview e testes de interação. | **Dado** leitor de tela e teclado, **quando** usar toast, navegação e controles ativos, **então** cada ação tem nome/foco e atalhos não interrompem campos; build mantém o orçamento acordado e os fluxos principais passam em browser. |
| **A12. Validar staging e decidir publicação** | P0; bloqueado até todas as fases anteriores e autorização | Integrar E2E de navegador com frontend+API, validar migrações, permissões, headers/proxy/TLS, backup/restore, monitoramento, rate limit, contas descartáveis e ausência de fixtures interativas. Registrar decisão separada para conectar providers. | A01–A11, ambiente de staging e autorização de release. | **Dado** staging isolado, **quando** executar checklist E2E e smoke tests, **então** cadastro verificado, privacidade, bloqueio, conteúdo, Seek e demais domínios aprovados funcionam sem estado local; nenhuma alteração em produção ocorre sem autorização explícita. |

### 11.3 Roteiro Now / Next / Later

- **NOW — Base segura e contratos:** A01–A05. A02 estabeleceu o fluxo de schema do PostgreSQL gerenciado e testes HTTP básicos; concluir os testes de jornadas em banco isolado, contratos e regras de autenticação/privacidade. E-mail está funcional apenas no desenvolvimento; produção continua desativada.
- **NEXT — Integrar o que já tem modelo e endpoints:** A06–A08. Conectar contas e relações, depois publicação/mídia e Seek. Não declarar como persistente qualquer recurso que dependa de provider ainda não conectado.
- **LATER — Completar domínios e preparar release:** A09–A12. Mensagens, notificações, Shop, qualidade de interface e staging. Checkout e integrações de terceiros continuam condicionados a decisão explícita.

### 11.4 Regras de coordenação

1. Executar um pacote por vez quando houver dependência; pacotes sem dependência podem ser paralelizados somente depois de confirmar limites e arquivos envolvidos.
2. Antes de começar, registrar no documento o pacote, executor, data, dependência e testes de entrada; ao terminar, marcar evidência, testes e pendências residuais. Não transformar achado em “resolvido” só porque o código foi alterado.
3. Toda etapa de backend inclui contrato, teste HTTP/DB e estado de erro do frontend; alterações de schema seguem o fluxo gerenciado da Replit. Toda regra de bloqueio/privacidade precisa de teste negativo entre duas contas.
4. Nenhum dado ou segredo de produção, alteração de schema em produção, provider externo, publicação ou alteração em Gestor/Painel entra no plano de execução sem autorização separada.
5. **Sequência após A01:** A02 está em andamento; concluir testes de jornadas em ambiente isolado antes de avançar à integração visual. Não configurar proxy nesta etapa; manter `trust proxy = false` e decidir a topologia antes de staging/produção.

### 11.5 Execução do pacote A01

**Data:** 23/10/2026; atualização de escopo em 24/10/2026. **Resultado:** codegen e verificações locais concluídos no desenvolvimento; confiança explícita em proxy retirada por decisão do usuário. Não declarar proxy validado em produção.

- `proxy-addr` permanece corrigido em 2.0.8, versão efetivamente resolvida pelo Express. O helper `trustProxy.ts` e `app.set("trust proxy", ...)` foram removidos em 24/10; Express usa o default `trust proxy = false` e ignora cabeçalhos encaminhados. Não configurar allowlist até a topologia real ser definida.
- Orval foi atualizado para 8.22.0. A configuração do codegen foi corrigida para gravar nos pacotes compartilhados existentes, não em um caminho `lib/` inexistente. `parserOptions.externalRefs.allow` está explicitamente vazio, fazendo o Orval negar referências externas antes do dereference; o transformador e testes acrescentam uma verificação para aceitar somente JSON Pointers locais. A especificação atual gera sem referências externas.
- Vite foi atualizado para 7.3.7 no frontend e no servidor isolado de prévias de componentes para manter alinhados os tipos dos plugins. O resolvedor de formulários foi atualizado para 5.9.2 porque o typecheck revelou incompatibilidade de tipos com as versões de Zod e React Hook Form do workspace.
- Testes de segurança atuais: cinco, cobrindo versão de `proxy-addr`, default `trust proxy = false`, falsificação de `X-Forwarded-For` contra o middleware de rate limit e política de `$ref`. Testes de allowlist foram removidos junto com a configuração.
- **Verificações aprovadas:** `pnpm run typecheck`; `pnpm run test:social` (42/42); `pnpm --filter @workspace/scripts run test:security-boundaries` (5/5 após remoção); builds da API e frontend; codegen Orval seguido de `typecheck:libs`. Um pedido de login com credenciais fictícias inválidas no preview retornou `401 INVALID_CREDENTIALS`; `/api/healthz` retornou 200.
- **Avisos que continuam:** build do frontend ainda emite avisos de sourcemap, importação mista de `mockData.ts` e bundle principal em torno de 953 kB. A geração/build passa, mas esses avisos não foram tratados no A01.
- **Pendência de produção:** proxy foi deliberadamente adiado; manter `trust proxy = false` até a topologia real ser fornecida e aprovada. O limite por IP poderá agrupar usuários atrás do proxy compartilhado. O teste local confirma o default, não substitui validação HTTP pela infraestrutura publicada.
- **Autenticação não validada integralmente:** A02 agora testa os limites HTTP sem mutações, mas ainda não existe uma suíte em banco isolado para login válido, email não verificado ou confirmação. O envio Resend em desenvolvimento foi aceito e o usuário confirmou recebimento; produção continua desativada. Não existe rota de recuperação de senha na API. O rate limit foi testado no middleware real em Express local, não por repetição no endpoint de login real.
- **Novas dependências altas na varredura atual do workspace:** `body-parser@2.2.2` (Express), `fast-uri@3.1.2` e `js-yaml@4.2.0` (grafo de Orval/Ajv), `browserslist@4.28.2`, `postcss@8.5.14`, `source-map-js@1.2.1` (toolchain) e `zod@3.25.76` (correção indicada é major). O scan contou 0 críticas, 16 altas, 10 moderadas e 6 baixas no workspace inteiro; SAST 0; HoundDog 1 baixo. Esses achados não foram tratados neste pacote de validação e precisam de triagem.
- A alteração em `artifacts/mockup-sandbox` limita-se à versão de desenvolvimento do Vite, necessária para o typecheck do sandbox; ela está fora do limite estrito de “somente Social” indicado no prompt A01. Não foi revertida durante a validação. Gestor e Painel não foram modificados.

### 11.6 Execução do pacote A02 — 24/10/2026

- **Banco e publicação:** confirmado que este projeto usa PostgreSQL gerenciado da Replit. O script `Seekalive/Projeto/scripts/post-merge.sh` foi configurado no pós-merge, usa o `push` normal no desenvolvimento e recusa execução quando o ambiente está explicitamente identificado como produção. O comando `push-force` foi removido. O fluxo oficial de publicação da Replit continua responsável por promover o diff de schema para produção.
- **Sem alteração de dados/schema:** o pós-merge não foi executado nesta etapa. Não houve migration, push, criação/remoção de conta ou escrita no banco. Foram feitas consultas somente de leitura para identificar o banco: a consulta pelo contexto de desenvolvimento e a conexão local retornaram o mesmo nome de banco, mas o endereço do servidor não foi exposto pela conexão e não pôde ser comparado. Portanto, o alvo da conexão local não foi considerado comprovadamente de desenvolvimento.
- **API:** `/api/healthz` é liveness sem dependência do banco; `/api/readyz` verifica o banco e retorna 503 se indisponível. 404 e demais erros da API incluem `requestId` no objeto `error`, também enviado pelo header `X-Request-Id`. O encerramento por SIGTERM/SIGINT drena HTTP e fecha o pool, com limite de 10 segundos.
- **Verificação:** typecheck e build de todos os pacotes permitidos no script de raiz aprovados; build da API aprovado; `pnpm --filter @workspace/scripts run test:backend` passou com 10/10 testes sem mutações; um smoke test SIGTERM foi aprovado.
- **Suíte de banco isolado:** o executor `test:api-isolated-db` foi implementado com schema aleatório, schema explícito nas tabelas, catálogo `public` protegido por fingerprint e entrega de e-mail em memória (sem Resend). A execução foi bloqueada antes da conexão e de qualquer DDL porque `REPLIT_ENVIRONMENT=production`. O nome da base coincidiu com a consulta do ambiente de desenvolvimento, mas isso não prova a identidade do servidor. Nenhum schema de teste foi criado; não se deve ignorar ou sobrescrever essa proteção.
- **Pendências A02:** executar a suíte de banco isolado somente em ambiente de desenvolvimento comprovado; cobrir escrita e autorização de cadastro, confirmação, onboarding, perfil, follows, Círculo e bloqueios entre duas contas. Não há cobertura autenticada de ponta a ponta concluída nesta entrega. A confiança em proxy continua desligada/adiada e o rate limit segue local ao processo.

### Histórico do documento

| Versão | Data | Atualização |
|---|---|---|
| 1.1 | 2026-10-23 | Consolida os resultados da auditoria complementar, scanners e plano coordenado de remediação com dependências e critérios de aceite. |
| 1.2 | 2026-10-23 | Registra a execução do A01, as verificações aprovadas e a dependência ainda pendente da topologia real do proxy. |
| 1.3 | 2026-10-23 | Registra a validação A01, o teste HTTP contra falsificação de IP, os limites de autenticação e os achados atuais de dependências. |
| 1.4 | 2026-10-24 | Retira confiança explícita em proxy conforme decisão do usuário, registra Express em `trust proxy = false`, atualiza o teste e define A02 como próximo pacote. Atualiza o estado do Resend em desenvolvimento. |
| 1.5 | 2026-10-24 | Registra a execução parcial do A02, o fluxo de schema do PostgreSQL gerenciado, health checks, erros com request ID, encerramento gracioso, testes HTTP básicos e lacunas de integração autenticada. |
| 1.6 | 2026-10-24 | Registra a suíte de integração com schema isolado e a execução interrompida pelo marcador de produção, sem DDL ou mutações; identifica a necessidade de confirmar o ambiente antes da execução. |
