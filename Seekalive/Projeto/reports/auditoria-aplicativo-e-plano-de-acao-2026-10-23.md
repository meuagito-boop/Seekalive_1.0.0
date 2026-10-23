# Auditoria técnica do Aplicativo Seekalive e plano de ação

**Data:** 23/10/2026  
**Escopo autorizado:** `Aplicativo/front`, `Aplicativo/back`, contratos compartilhados e dependências diretas de banco/documentação para verificar prontidão de integração.  
**Fora do escopo:** `Gestor` e `Painel` — não foram auditados nem alterados.  
**Tipo de revisão:** auditoria estática de engenharia e verificação operacional não destrutiva. Nenhum código de produto foi modificado para esta auditoria.

## 1. Parecer executivo

**O Aplicativo está em um estado funcional de desenvolvimento, mas ainda não está pronto para produção nem para conectar todas as telas ao backend.** O projeto compila, a API sobe, o login consulta a API e uma primeira fatia de autenticação, onboarding, perfil básico, privacidade e relações sociais já existe. Isso é progresso real; não equivale a um backend completo.

O bloqueio operacional mais claro é que **cadastros reais não podem ser concluídos nesta configuração**: o adaptador de e-mail está deliberadamente desligado e a rota de cadastro retorna `503` antes de criar uma conta. Além disso, o frontend ainda executa muitas ações sociais e de conteúdo no próprio navegador, enquanto as APIs correspondentes não existem ou não são consumidas. Em especial, publicação/mídia, mensagens, avaliações, Seek, notificações e Shop ainda não têm integração completa.

**Decisão de prontidão:** pode-se continuar a implementação incremental no ambiente de desenvolvimento; **não se deve declarar o produto pronto para lançamento ou tratar as telas atuais como persistência real compartilhada**. Antes do lançamento são necessários, no mínimo, cadastro operacional, contratos confiáveis, migrações reproduzíveis, autorização testada no servidor e cobertura automatizada da API.

## 2. Como a auditoria foi conduzida e seus limites

- Três agentes fizeram revisões independentes e somente de leitura: front-end e regras da interface; backend e segurança; contratos, documentação e prontidão de integração. O agente principal conferiu diretamente os achados mais importantes e executou verificações do workspace e chamadas HTTP não destrutivas.
- Foram examinados os pontos de entrada, serviços, contextos de estado, persistência local, telas de conta/perfil/Social/Seek/Shop/configurações, rotas da API, esquemas Drizzle, contratos compartilhados, scripts e documentação de backend.
- O repositório contém um número significativo de arquivos de UI e componentes genéricos. **Não afirmo que cada byte, dependência de terceiros, bundle ou cada linha de todos os arquivos tenha sido revisado manualmente.** Esta é uma auditoria profunda de código próprio e lógica prioritária, com análise estática e verificações de compilação/teste; não é certificação, pentest, auditoria de dependências nem prova do estado de produção.
- Não foram criadas contas, alterados dados, executadas migrações, conectados provedores ou modificadas configurações/segredos. A API foi consultada apenas em endpoints GET de saúde, sessão sem autenticação e conta protegida sem sessão.
- Achados estão classificados como **confirmados** quando observáveis no código ou em verificações executadas. Pontos que dependem de uma decisão de produto ou topologia estão explicitamente identificados como **risco/decisão pendente**.

## 3. Verificações executadas nesta auditoria

| Verificação | Resultado | O que demonstra — e o que não demonstra |
|---|---|---|
| `pnpm run typecheck` na raiz do projeto | Aprovado | Os pacotes incluídos no script passam no TypeScript. Não comprova comportamento correto nem cobertura de API. |
| `pnpm run test:social` | **42/42 testes aprovados** | Testa regras locais de conteúdo, descoberta, privacidade e relações no frontend. Não é uma suíte HTTP/backend nem teste de navegador. |
| `pnpm --filter @workspace/api-server run build` | Aprovado | O bundle do servidor é gerado. Não comprova cadastro operacional, banco saudável, segurança ou deploy. |
| `GET /api/healthz` | `200 {"status":"ok"}` | Confirma liveness HTTP. A rota é estática e não verifica se o banco está pronto. |
| `GET /api/v1/auth/session`, sem cookie | `200`, sessão não autenticada | Confirma a resposta pública do estado de sessão. |
| `GET /api/v1/accounts/me`, sem cookie | `401 UNAUTHENTICATED` | Confirma que essa rota protegida exige sessão verificada. Não substitui testes de autorização entre duas contas. |
| `git status --short` após verificações | Sem alterações de fonte antes deste relatório | Nenhuma alteração de aplicação foi feita durante a verificação. |

**Não executado nesta rodada:** build integral de produção do frontend, E2E de navegador, suite HTTP automatizada do backend, teste de migração em banco limpo, teste multi-instância/rate limit, análise de dependências ou teste contra banco/produção. Existem scripts avulsos de auditoria de navegador (`scripts/audit-social-browser.mjs` e `scripts/audit-seek-browser.mjs`), mas não são chamados por um workflow de CI encontrado e não exercitam a integração HTTP real do backend. Resultados documentados anteriormente em `docs/api/backend/frontend-readiness-audit.md` não são apresentados como se tivessem sido reproduzidos nesta auditoria.

## 4. Estado real por área

| Área | Situação observada |
|---|---|
| Acesso e sessão | Login, consulta de sessão, CSRF, confirmação e logout têm cliente e rotas de API. A criação de conta e o reenvio de confirmação ficam bloqueados sem serviço de e-mail configurado. Recuperação de senha continua sem implementação real. |
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

**Cadastro e reenvio de verificação não funcionam nesta configuração — confirmado.**  
`Aplicativo/back/src/modules/auth/infrastructure/emailDelivery.ts:19-25` declara o envio como não configurado. `Aplicativo/back/src/modules/auth/presentation/routes.ts:155-168` retorna `503 EMAIL_DELIVERY_UNAVAILABLE` antes de gravar a conta; o reenvio retorna o mesmo estado em `:326-334`. A regra de impedir sessão sem e-mail verificado está implementada (`:299-301`), mas não existe caminho operacional para um novo usuário receber o código.

**Impacto:** não é possível concluir o cadastro ponta a ponta com uma conta real.  
**Ação:** manter a falha explícita até a etapa autorizada de integrar um provedor. Depois de configurado, testar entrega, reenvio, expiração, uso único, tentativas inválidas e criação de sessão somente após confirmação. Não substituir por bypass de verificação.

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

**Não há migrações versionadas nem testes automatizados de API identificados — confirmado no repositório inspecionado.**  
`infra/database/package.json` oferece `push`/`push-force`; não foi localizado histórico versionado de migrações. `Aplicativo/back/package.json` não tem script de testes; os 42 testes atuais são do frontend. O script de typecheck/build não verifica transações, autorização, privacidade ou compatibilidade de banco.

**Impacto:** não há procedimento reprodutível e revisável para promover o schema a outro ambiente, nem regressão automatizada de autorização no servidor.  
**Ação:** criar migrações incrementais revisáveis e testes de integração HTTP/DB em ambiente descartável/desenvolvimento; planejar rollback. Não aplicar mudanças em produção nesta auditoria.

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
13. **Controles de configurações não têm todos os efeitos anunciados — confirmado.** Há preferências locais que não são consultadas pelo fluxo de notificações/confirmação de leitura. Implementar efeitos antes de apresentá-los como controles efetivos.
14. **Notificações são marcadas como lidas por timer — confirmado.** `front/src/pages/Notifications.tsx:40-44` chama `markAllNotificationsRead()` após três segundos, sem exigir visibilidade ou leitura. A página em segundo plano pode limpar indicadores; marcar por item visível ou interação explícita.
15. **Ação de iniciar conversa não funciona — confirmado.** `front/src/pages/Messages.tsx:39-44` tem botão com ícone, mas sem `onClick`, nome acessível ou fluxo de escolha de destinatário. Implementar o fluxo ou desabilitar e informar claramente.
16. **Listas de conexão podem ser affordances sem conteúdo — confirmado.** `front/src/components/profile/ConnectionList.tsx:31-35,55-60` exibe indisponibilidade para seguidores e listas de outros perfis apesar de navegação pelos contadores. Integrar API ou ajustar a navegação.
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

**Critério de saída:** cadastro pessoal/comercial segue a mesma identidade Social; sessão reidrata a conta completa; erros/status/DTOs são iguais no servidor, tipos compartilhados e documentação. Sem provedor de e-mail, o comportamento permanece explicitamente indisponível, nunca simulado como sucesso.

### Fase 2 — Tornar a primeira fatia do backend reproduzível e testável

5. Criar migrations versionadas e um procedimento de instalação em banco vazio; evitar `push-force` como procedimento de produção.
6. Criar testes HTTP e de banco para registro pendente, login antes/depois da confirmação, CSRF, expiração/reuso de código, onboarding, perfil, privacidade, follows, aprovação, Círculo, bloqueio e desbloqueio.
7. Adicionar testes negativos entre contas: perfil privado, follow não aprovado, dados bloqueados, tentativa de desbloqueio por quem não iniciou e isolamento de sessão.
8. Corrigir o contrato de erros e adicionar identificador de requisição consistente; criar readiness separado de liveness.
9. Definir política de proxy/origem, rate limiting e armazenamento dos contadores compatíveis com a topologia alvo.

**Critério de saída:** banco novo recebe o schema por migrações revisáveis; a suíte de API prova regras de autorização sem depender de testes manuais; saúde e prontidão reportam estados diferentes.

### Fase 3 — Integrar telas que já têm endpoints

10. Implementar um cliente único para sessão, CSRF, serialização de DTOs, erros, timeout/cancelamento e invalidamento de cache.
11. Conectar conta, perfil, edição, privacidade, seguidores/seguindo, pedidos, Círculo e bloqueios às APIs existentes.
12. Remover sucesso local enganoso para operações conectadas; estados de carregamento, vazio, erro, conflito e sessão expirada devem ser visíveis.
13. Manter o preview fictício restrito ao desenvolvimento e isolado da conta real; verificar também o bundle de produção.

**Critério de saída:** a mesma conta mostra as mesmas relações em nova sessão/navegador; falhas de rede não viram sucesso nem fallback para fixtures; bloqueio e autorização são aplicados pelo servidor.

### Fase 4 — Implementar conteúdo e mídia com autorização

14. Criar APIs de posts, artigos, comentários, likes, reposts e salvamentos com autoria, idempotência, paginação e ACL.
15. Implementar upload com ownership, validação server-side do conteúdo real do arquivo, limites, status de processamento e referências por ID — não por `blob:` URL.
16. Definir uma única regra para galeria: mídia publicada deve respeitar audiência do post; mídia independente de perfil comercial deve ter finalidade e autorização próprias.
17. Cobrir no backend e E2E conteúdo público, privado, de Círculo, autor e observadores bloqueados.

**Critério de saída:** upload + publicação persistem e são autorizados; nenhuma mídia privada pode ser obtida por URL/ID sem a ACL do conteúdo de origem.

### Fase 5 — Seek e os domínios do comerciante

18. Implementar leitura/edição de perfil comercial associado obrigatoriamente à conta Social, horários e serviços oferecidos.
19. Fazer o Seek descobrir apenas contas comerciais elegíveis; jamais converter perfil pessoal ou endereço residencial em localização comercial sem regra aprovada.
20. Implementar avaliações e respostas com as regras do produto: nota 1–5, uma avaliação por conta/comércio, sem autoavaliação e crítica não apagável pelo comerciante.
21. Implementar eventos e consultas de descoberta com cidade/categoria/filtros. GPS permanece opt-in; não inventar distância nem disponibilidade em tempo real.
22. Não prometer reservas, agendamentos, entrega, ingresso, pagamento ou compra até existirem os respectivos fluxos e contratos aprovados.

**Critério de saída:** resultados do Seek têm origem em contas comerciais persistidas e visíveis; apenas serviços marcados como oferecidos aparecem; avaliação e localização têm regras testadas.

### Fase 6 — Mensagens, notificações, configurações e Shop

23. Definir e implementar conversas/mensagens, participantes, política de recebimento, leitura e autorização.
24. Aplicar bloqueio ao envio e à leitura; ocultar histórico sem apagar enquanto o bloqueio estiver ativo e reapresentá-lo ao desbloquear, sem restaurar follows/pedidos.
25. Persistir notificações e preferências e conectar cada controle da interface ao comportamento correspondente.
26. Implementar catálogo do Shop como leitura quando aprovado; tratar compra/checkout como escopo independente e não habilitado até a decisão de produto.

**Critério de saída:** regras de mensagem e bloqueio funcionam em servidor e entre dispositivos; nenhuma configuração é apresentada como ativa sem efeito; compra permanece indisponível até ser implementada.

### Fase 7 — Preparar publicação, sem confundir desenvolvimento com produção

27. Adicionar E2E de navegador para onboarding e fluxos principais em ambiente isolado.
28. Fazer build de produção e verificar que fixtures interativas/dados demo não entram no bundle nem aparecem fora de desenvolvimento.
29. Preparar ambiente de staging, variáveis/secrets por ambiente, aplicação deliberada das migrations, backup/restore, monitoramento, limites, readiness e plano de rollback.
30. Executar smoke tests em staging com contas descartáveis e confirmar que produção não foi alterada antes da autorização explícita.

**Critério de saída:** checklist de release aprovado com evidência reproduzível; staging validado; nenhum caminho crítico depende de estado local ou dados fictícios.

## 8. Ordem recomendada imediata

Para a próxima etapa, seguir esta sequência, sem abrir trabalho no Gestor/Painel:

1. DTO e persistência/hidratação do perfil comercial.
2. Alinhamento OpenAPI/codegen/erros/status.
3. Migrations versionadas e suíte de testes HTTP/DB da fatia já existente.
4. Integração frontend de perfil, privacidade e relações às APIs existentes.
5. Conteúdo e upload; depois Seek/avaliações/eventos.
6. Mensagens/notificações/configurações e então preparação de staging.

O envio real de e-mail fica como dependência explícita quando a etapa de provedores for autorizada. Até lá, o comportamento correto é mostrar indisponibilidade e não permitir entrada de conta não verificada.

## 9. Fontes principais examinadas

- Frontend: `Aplicativo/front/src/App.tsx`, `context/AppContext.tsx`, `context/SocialContext.tsx`, `services/authApi.ts`, `services/contentService.ts`, `services/mediaService.ts`, `pages/Register.tsx`, `pages/ProfileEdit.tsx`, `pages/settings/Account.tsx`, `hooks/useSeekDiscovery.ts`, páginas de perfil/Seek/Shop/mensagens/configurações e `tests/`.
- Backend: `Aplicativo/back/src/app.ts`, `security/session.ts`, `modules/index.ts` e módulos `auth`, `onboarding`, `profiles`, `social`, `health`.
- Dados e contratos: `infra/database/src/schema/`, `shared/contracts/src/`, `shared/api-spec/openapi.yaml`, `shared/api-spec/orval.config.ts`.
- Documentação comparada: `docs/api/backend/frontend-readiness-audit.md`, `endpoints.md`, `frontend-integration.md`, `implementation-and-tests.md`.

**Conclusão:** existe uma base inicial de backend e uma interface extensa de desenvolvimento, mas ainda há uma distância material entre o que a UI apresenta e o que persiste/autorizada a API. A integração deve avançar por fatias pequenas, cada uma com contrato, migração, testes no servidor e estados honestos na interface. Nenhum item deste relatório altera o escopo do Gestor ou do Painel.
