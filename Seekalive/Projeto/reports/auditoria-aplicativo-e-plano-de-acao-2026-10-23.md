# Auditoria técnica do Aplicativo Seekalive e plano de ação

**Data:** 24/10/2026
**Versão do documento:** 2.52
**Contas de usuários reais:** o aplicativo não foi lançado; não há população legada para migrar. Contas ou dados de teste no desenvolvimento não representam usuários reais.
**Verificação de novo login:** após usuário e senha corretos, se o IP observado diferir da sessão anterior, mostrar o aviso definido, enviar código ao e-mail verificado e não abrir a sessão até a confirmação. Um código incorreto leva a esperas progressivas de 30 s e 90 s; o terceiro erro bloqueia o acesso até contato com o suporte por e-mail.
**Status atualizado em 24/10/2026:** O projeto está em desenvolvimento; não há produção real. A tela Configurações > Conta carrega e salva dados pela API em sessões reais, diferenciando os campos pessoais dos comerciais; o preview continua local. O DTO privado retorna o e-mail verificado somente ao titular. A idade é coletada no cadastro e mantida apenas no servidor para validar a regra de 18+; depois da criação, não é retornada ao app nem exibida, inclusive ao titular em Configurações. Testes de API com schema isolado confirmaram persistência por tipo, atualização atômica, controle de versão e rejeição de campos incompatíveis. Isso não fecha o gate completo de conta nem torna a Social pronta para produção: o fluxo autenticado da tela ainda não foi verificado por E2E de navegador, e-mail/senha ainda não podem ser trocados nesta tela, 2FA não foi implementado e páginas públicas, feed, mensagens, notificações, Seek e Shop continuam incompletos. Produção não foi alterada. O app não reconhece automaticamente um dispositivo habitual nem coleta fingerprint para isso. O Social completo e validado como pronto para produção continua sendo pré-requisito para Seek/Shop. A auditoria de bancos independentes (seções 11.16–11.22) confirmou uma única conexão e um único banco PostgreSQL no desenvolvimento; o banco externo não foi provisionado nem conectado. No PostgreSQL de desenvolvimento, versão 16.10, PostGIS 3.5.3 está disponível, mas não instalado. Shop e Confiança e Segurança foram confirmados como domínios adicionais; cada conta comercial terá no máximo uma unidade física principal e o Seek mostrará somente esse endereço, sem áreas de atendimento. No perfil pessoal, somente o nome de exibição escolhido pelo usuário é público; nome e sobrenome do cadastro permanecem privados. Essas decisões não criam bancos nem alteram schema ou dados. A configuração explícita de confiança em proxy permanece adiada.
**Atualização do proxy de desenvolvimento em 24/10/2026:** o preview Replit encaminha o IP do visitante em `X-Forwarded-For`. O Vite valida os endereços e passa somente um IP no cabeçalho interno `X-Seekalive-Client-IP`; a API aceita esse valor apenas quando a conexão imediata vem do proxy local em loopback. O Express continua com `trust proxy = false`. Login e confirmação de e-mail falham de forma segura quando o IP confiável não está disponível. O ajuste vale para o caminho de desenvolvimento Vite → API; não configura ainda o acesso móvel ou a topologia de produção. IP ainda não é persistido em sessão e o desafio por novo IP não foi implementado.

**Escopo autorizado:** `Aplicativo/front`, `Aplicativo/back`, contratos compartilhados e dependências diretas de banco/documentação para verificar prontidão de integração.  
**Fora do escopo:** `Gestor` e `Painel` — não foram auditados nem alterados.  

**Decisão de conta incorporada em 24/10/2026:** a primeira versão pública não terá selo de verificação. A confirmação de e-mail é privada e usada para autenticação; o contrato público e os componentes de perfil/publicação não devem expor nem exibir `isVerified`.

**Regra de nome de usuário incorporada em 24/10/2026:** a primeira troca é permitida após 30 dias do registro; cada troca posterior, 30 dias após a anterior. O @ antigo fica indisponível para todos por 30 dias, inclusive para o titular anterior, e a interface deve avisar antes da confirmação.

**Regra de alteração de credenciais incorporada em 24/10/2026:** trocar e-mail ou senha exige senha atual e código enviado ao e-mail já cadastrado. Para troca de e-mail, o novo endereço só entra em vigor depois de confirmado; o atual permanece ativo até lá e recebe um aviso de segurança quando a troca termina.

**Recuperação sem acesso ao e-mail:** solicitar contato manual com suporte e verificação adicional. A solicitação deverá chegar ao e-mail de suporte e ao futuro Painel de Controle; o método de verificação fica fora do escopo atual, sem coleta de documentos nesta etapa.

**Exclusão de conta:** permitir solicitar exclusão permanente em Configurações mediante senha atual e código no e-mail verificado; ocultar e desativar a conta imediatamente, preservar os dados e executar a exclusão após 7 dias. O titular pode cancelar até o fim desse período pelo login, com senha e código no e-mail verificado. Ao concluir, excluir publicações, mídias, comentários, curtidas, repostagens e itens salvos, atualizar contagens e remover relações sociais; mensagens diretas permanecem para os destinatários com o remetente anonimizado.

**Exportação de dados:** não oferecer recurso de exportação na primeira versão. Verificar as obrigações de privacidade aplicáveis antes do lançamento público; a decisão de escopo não presume dispensa dessas obrigações.

**Sessões:** registrar o IP observado em cada sessão autenticada, web ou celular. Enviar código ao e-mail verificado quando o IP de uma nova sessão diferir do IP da sessão anterior. IP não identifica com precisão um aparelho nem um local físico; captura confiável do IP do cliente depende da configuração de proxy confiável, que não está autorizada nesta etapa.
**Tipo de revisão:** auditoria estática de engenharia e verificação operacional não destrutiva. Esta versão registra a execução posterior do pacote A01; os achados da auditoria original permanecem datados e contextualizados.

## 1. Parecer executivo

**O Aplicativo está em um estado funcional de desenvolvimento, mas ainda não está pronto para produção nem para conectar todas as telas ao backend.** O projeto compila, a API sobe, o login consulta a API e a Social 1B agora conecta perfil, busca de contas e relações básicas ao backend. Isso é progresso real; não equivale a um backend completo.

O envio direto de teste via Resend foi recebido, e cadastro/confirmação/onboarding foram exercitados em uma suíte autenticada no banco de desenvolvimento, usando entrega de e-mail em memória. Isso ainda não equivale a E2E de navegador nem testa cadastro real pela integração Resend. O frontend ainda executa muitas ações sociais e de conteúdo no navegador; publicação/mídia, mensagens, avaliações, Seek, notificações e Shop não têm integração completa.

**Decisão de prontidão:** pode-se continuar a implementação incremental no ambiente de desenvolvimento; **não se deve declarar o produto pronto para lançamento ou tratar as telas atuais como persistência real compartilhada**. Antes do lançamento são necessários, no mínimo, cadastro operacional, contratos confiáveis, migrações reproduzíveis, autorização testada no servidor e cobertura automatizada da API.

## 2. Como a auditoria foi conduzida e seus limites

- Oito agentes fizeram revisões independentes e somente de leitura em três passagens: três na auditoria inicial, três para cobrir as lacunas declaradas e dois para revisar os wrappers de interface restantes. As frentes foram interface, backend/segurança e contratos/documentação/integração. O agente principal conferiu diretamente os achados mais importantes e executou verificações não destrutivas.
- Foram examinados os pontos de entrada, serviços, contextos de estado, persistência local, telas de conta/perfil/Social/Seek/Shop/configurações, rotas da API, esquemas Drizzle, contratos compartilhados, scripts e documentação de backend.
- O repositório contém um número significativo de arquivos de UI e componentes genéricos. **Não afirmo que cada byte, implementação interna das dependências de terceiros, bundle ou cada linha de todos os arquivos tenha sido revisado manualmente.** Esta é uma auditoria profunda de código próprio e lógica prioritária, com análise estática, scanners automatizados de dependências/SAST/privacidade e verificações de compilação/teste; não é certificação, pentest nem prova do estado de produção. Os limites e escopo dos scanners estão detalhados na seção 10.9.
- Na auditoria inicial não foram criadas contas, alterados dados, executadas migrações ou conectados provedores. Na validação posterior, a suíte autorizada criou um schema aleatório no banco de desenvolvimento, executou os fluxos de teste, verificou o fingerprint de `public` e removeu o schema. Não houve escrita em produção.
- Achados estão classificados como **confirmados** quando observáveis no código ou em verificações executadas. Pontos que dependem de uma decisão de produto ou topologia estão explicitamente identificados como **risco/decisão pendente**.

## 3. Verificações executadas nesta auditoria

| Verificação | Resultado | O que demonstra — e o que não demonstra |
|---|---|---|
| `pnpm run typecheck` na raiz do projeto | Aprovado | Os pacotes incluídos no script passam no TypeScript. Não comprova comportamento correto nem cobertura de API. |
| `pnpm run test:social` | **43/43 testes aprovados** | Testa regras locais de conteúdo, descoberta, privacidade e relações e a hidratação do DTO comercial do titular. Não é uma suíte HTTP/backend nem teste de navegador. |
| `pnpm --filter @workspace/scripts run test:backend` | **17/17 testes aprovados** | Verifica limites de segurança, seleção de banco e contratos/runtime HTTP. |
| `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE=heliumdb pnpm --filter @workspace/scripts run test:api-isolated-db` | **1/1 teste integrado aprovado** | Inclui idade mínima, composição de senha, atualização obrigatória de uma senha legada, promoção automática de senha legada compatível, revogação de sessões, cadastro pessoal/comercial, onboarding, privacidade, mutualidade do Círculo e bloqueios; cria e remove apenas schema temporário no banco de desenvolvimento. |
| `pnpm -C shared/api-spec run codegen` | Aprovado | Orval gerou cliente e schemas a partir do OpenAPI; `typecheck:libs` também passou. |
| `pnpm --filter @workspace/api-server run build` | Aprovado | O bundle do servidor é gerado. Não comprova cadastro operacional, banco saudável, segurança ou deploy. |
| `PORT=8081 BASE_PATH=/ pnpm run build` | Aprovado com avisos | Typecheck e build dos pacotes passaram. O JS principal do frontend tem 1.011,19 kB (298,17 kB gzip), excede o aviso de 500 kB e ainda há avisos de sourcemap/importação mista. |
| Busca de marcadores demonstrativos no bundle de produção | Marcadores pesquisados não encontrados | Foram pesquisados nomes/valores específicos das fixtures; isso não prova exaustivamente que nenhum dado fictício possa ser empacotado ou renderizado em qualquer caminho. |
| `GET /api/healthz` | `200 {"status":"ok"}` | Liveness HTTP independente do banco. |
| `GET /api/readyz` | `200 {"status":"ready"}` no ambiente de desenvolvimento | Confirma `SELECT 1` no PostgreSQL gerenciado; não altera dados. |
| `GET /api/v1/auth/session`, sem cookie | `200`, sessão não autenticada | Confirma a resposta pública do estado de sessão. |
| `GET /api/v1/accounts/me`, sem cookie | `401 UNAUTHENTICATED` | Confirma que essa rota protegida exige sessão verificada. Não substitui testes de autorização entre duas contas. |
| `pnpm --filter @workspace/scripts run test:backend` | **17/17 testes aprovados** | Seis testes de limites de segurança, seis de seleção de conexão e cinco de runtime HTTP. |
| `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE=heliumdb pnpm --filter @workspace/scripts run test:api-isolated-db` | **1/1 aprovado** | Cadastro, confirmação, onboarding, política de senha nova e legada, revogação de sessão, DTO owner-only, privacidade, Círculo, concorrência follow/aprovação×bloqueio e filtros bilaterais foram testados em schema aleatório no banco dev `heliumdb`; o schema foi removido e `public` permaneceu inalterado. |
| `pnpm --filter @workspace/api-server run typecheck` e `build` | Aprovados | Confirma compilação/typecheck da API, não cobertura dos fluxos comerciais. |
| Script pós-merge | Guard atualizado para `NODE_ENV=production` ou `REPLIT_DEPLOYMENT` definido; teste de regressão aprovado | O script não foi executado; nenhum push global foi feito. |
| SIGTERM da API | Smoke test aprovado em porta isolada | O processo drenou/fechou o servidor HTTP e o pool do PostgreSQL; não testa interrupção de uma solicitação longa. |

**Ainda não executado:** E2E de navegador; envio/reenviado/expiração de código pelo fluxo real do Resend; comparação de schema em banco vazio; teste multi-instância/rate limit; qualquer teste contra produção. A análise automatizada de dependências está registrada na seção 10.9 e atualizada na seção 11.7. Existem scripts avulsos de auditoria de navegador (`scripts/audit-social-browser.mjs` e `scripts/audit-seek-browser.mjs`), mas não são chamados por um workflow de CI e não exercitam a integração HTTP real do backend. O build frontend ainda excede o aviso de chunk de 500 kB.

## 4. Estado real por área

| Área | Situação observada |
|---|---|
| Acesso e sessão | Cadastro, confirmação, sessão após confirmação, bloqueio de login antes da verificação e recuperação de senha foram exercitados no schema isolado de desenvolvimento; o cliente e as rotas de sessão, CSRF e logout existem. A recuperação usou e-mail em memória, não Resend. |
| Cadastro pessoal/comercial | O formulário envia os campos pessoais/comerciais. O backend tem tabelas para conta e perfil comercial, mas a resposta de sessão e o modelo de conta que o frontend hidrata não transportam os dados completos do perfil comercial para as telas. |
| Onboarding | A API contém a operação de salvar interesses. Sugestões e interações com perfis no onboarding ainda incluem dados/estado demonstrativo. |
| Perfil e privacidade | Perfil público, privacidade e DTO owner-only do perfil pessoal/comercial são carregados pela API na sessão autenticada; demonstração continua local no preview. A edição do perfil ainda não está integrada. |
| Seguidores, solicitações, Círculo e bloqueios | Fluxos básicos estão conectados à API na sessão autenticada. Follow, aprovação, bloqueio e desbloqueio serializam por par de contas; filtros bilaterais de conta bloqueada e regra de Círculo mútuo têm cobertura HTTP/DB isolada. Permanecem testes negativos adicionais e E2E autenticado. |
| Publicações e interações | O serviço selecionado é `demoContentAdapter`; posts/comentários são adicionados ao estado local. Likes, reposts, salvamentos e exclusões também são predominantemente locais. As rotas de conteúdo aparecem como propostas, não implementadas. |
| Fotos e vídeos | A seleção usa URLs `blob:` do navegador. Os arquivos não são enviados a um storage nem transformados em IDs persistentes que a API possa anexar a um post. |
| Seek, comerciantes, serviços, avaliações e eventos | A experiência de descoberta e dados de exemplo existem no frontend; não há API ativa de diretório/avaliações/eventos. Conta comercial é requisito de origem do Seek, mas o perfil comercial precisa ser carregado e mantido pela conta para que a descoberta real funcione. |
| Mensagens e notificações | Estado e interações locais/demonstrativos; não há tabelas nem operações de API para mensagens/conversas. A política de bloqueio para mensagens antigas ainda não pode ser garantida no servidor. |
| Shop | Catálogo é demonstrativo no desenvolvimento; não há API ativa do catálogo. Checkout/compra não deve ser considerado funcional. |
| Configurações | Diversos controles gravam preferências no navegador, mas nem todos alteram o comportamento efetivo de notificações, confirmações de leitura ou dados no servidor. |
| Organização do backend | Módulos de rota estão separados por domínio, mas parte da validação, regra de negócio e SQL está concentrada nos handlers. O schema atual declara dez tabelas: conta/e-mail/credencial/perfil comercial/desafio/sessão/interesses, follows/pedidos/bloqueios. |

## 5. Achados priorizados

### P1 — Validação de cadastro em desenvolvimento não substitui preparação para lançamento

**O fluxo de cadastro foi exercitado em desenvolvimento, mas não em E2E/browser ou produção — confirmado.**
Em 24/10/2026, a suíte de schema isolado cadastrou e confirmou duas contas, validou que login antes da confirmação é recusado e testou onboarding e relações. A suíte usa entrega de e-mail em memória. Um envio direto de teste pelo Resend foi recebido separadamente; o fluxo de cadastro via Resend e o envio em produção não foram habilitados.

**Impacto:** os fluxos centrais e a lógica de recuperação passaram no banco de desenvolvimento isolado, mas o envio real de e-mail de recuperação por esta rota, navegação no navegador e configuração de lançamento ainda não foram validados.
**Ação:** manter a verificação de e-mail obrigatória; acrescentar E2E de navegador e testar reenvio/expiração/uso único antes de considerar o fluxo pronto para lançamento.

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

1. **Concluído:** serializar follow, aprovação, bloqueio, unfollow, recusa e desbloqueio por bloqueio ordenado das duas contas; revalidar estado ativo/verificado e bloqueio dentro das transações; testar corridas, filtros bilaterais e visibilidade.
2. **Concluído:** definir o DTO privado de `/accounts/me`, gerar o contrato Orval e hidratar o perfil comercial da conta autenticada; endereço/CEP não são adicionados ao DTO público nem persistidos no armazenamento local.
3. **Concluído:** ligar Configurações > Conta a `GET/PATCH /v1/accounts/me`, com formulário pessoal/comercial, e-mail verificado somente para o titular, idade privada, validação de tipo, controle de versão e persistência atômica do endereço comercial.
4. **Próximo:** validar essa tela em navegador com uma sessão autenticada de desenvolvimento, sem contornar o login; cobrir loading, erro, conflito de versão e atualização após recarregar.
5. **Continuar no gate de conta/Social:** resolver as decisões e controles de conta que ainda faltam (por exemplo, troca de e-mail, 2FA e persistência/sincronização das preferências) antes de abrir as páginas públicas de perfil, feed/algoritmo ou mensagens.
6. Manter Seek e Shop bloqueados até o módulo Social estar completo e validado para produção. Depois, avançar em conteúdo/mídia, avaliações e demais áreas com contratos e autorização próprios.

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
| **A05. Fechar privacidade, bloqueios e relações no servidor** | P1; **parcial** | Perfil privado, pedido/aprovação, mutualidade, bloqueio, busca e preferências já têm fluxo de API e testes integrados básicos. Ainda faltam teste de concorrência bloquear×seguir/aprovar, cobertura de filtros em todos os domínios, autorização negativa adicional e paginação estável sob alterações concorrentes. | A02–A04. | **Dado** um perfil privado, **quando** alguém pede para seguir, **então** o pedido pendente não concede acesso; após aprovação, publicações do perfil ficam visíveis ao seguidor aprovado, mas Círculo exige seguimento mútuo. **Dado** bloqueio, **então** ambos desaparecem um para o outro, follows e pedidos são removidos; só o iniciador desbloqueia, e desbloquear não restaura relações. |
| **A06. Conectar frontend aos endpoints existentes** | P1; **parcial — Social 1B implementada no desenvolvimento** | Cliente comum com sessão, CSRF, DTO e erros; perfil, busca de contas, seguidores/seguindo, follow/pedido/aprovação, privacidade, Círculo e bloqueio/desbloqueio estão conectados. Edição do perfil, cadastro comercial completo, logout e domínios de conteúdo ainda precisam integrar endpoints próprios; não há fallback silencioso para a relação local em sessão autenticada. | A03–A05; a subetapa 1B avançou enquanto os riscos residuais de A05 permanecem explicitamente abertos. | **Dado** a mesma conta em novo navegador, **quando** carregar perfil e relações, **então** o estado corresponde ao servidor; falha de rede permanece visível e nunca converte mutação em sucesso nem troca silenciosamente para dados fictícios. |
| **A07. Implementar publicação e mídia com limites claros** | P1 para considerar Social integrado; armazenamento externo bloqueado até autorização | Definir contratos/ACL de posts, artigos, comentários, likes, reposts e salvos; preparar interface do serviço de mídia, validação server-side, ownership, limites e referência por ID. Não tratar `blob:` como persistência nem ligar storage provider sem autorização. | A02, A03, A05 e A06; decisão/autorização do provider antes de persistência real de arquivos. | **Dado** mídia ainda local no preview, **quando** a pessoa publica ou recarrega, **então** a UI não declara persistência entre aparelhos. Após integração autorizada, somente IDs persistentes e ACL do conteúdo permitem acesso, com testes de conteúdo público/privado/Círculo/bloqueado. |
| **A08. Concluir Seek e perfil comercial** | P1 para diretório real; pendente | Descobrir apenas contas comerciais vinculadas à conta Social; completar horários, serviços, delivery, mesa, agendamento e eventos conforme domínio; exibir somente serviços explicitamente oferecidos; criar avaliações com nota 1–5, sem autoavaliação e sem exclusão pelo comerciante; resolver agregados de avaliações com bloqueio. | A03–A07; dados comerciais persistidos e regra de localização definida. | **Dado** conta pessoal ou comercial incompleta, **quando** buscar no Seek, **então** só a conta comercial elegível aparece; serviços “não oferecido/não informado” não aparecem; avaliações e nota obedecem às regras, sem dados demonstrativos em produção. |
| **A09. Implementar mensagens, notificações e configurações** | P2; pendente | Criar conversas/mensagens e autorização por participante; bloquear leitura/envio bilateral; ocultar mensagens antigas durante bloqueio e restaurá-las ao desbloquear; persistir notificações e preferências; remover leitura automática por timer e ligar cada controle ao comportamento real. | A02–A06; A05 para política de bloqueio. | **Dado** duas contas bloqueadas, **quando** uma abre conversas ou tenta enviar mensagem, **então** conteúdo e envio ficam indisponíveis; ao desbloquear, histórico antigo reaparece, sem reativar follows/pedidos. Preferências têm efeito observável em teste. |
| **A10. Entregar Shop sem antecipar checkout** | P2; catálogo pode ser separado de compra | Implementar catálogo/endpoints somente após contratos aprovados; busca da interface deve funcionar; manter checkout/pagamento desativado até aprovação e provider autorizado. | A02, A03 e decisão de escopo do comércio. | **Dado** catálogo disponível, **quando** a pessoa busca produto, **então** resultados correspondem ao catálogo persistido; não há ação de pagamento/compra alegando sucesso sem integração aprovada. |
| **A11. Qualidade de interface, acessibilidade e performance** | P2/P3; paralelo às integrações | Corrigir rótulo acessível do fechar toast ativo; corrigir contratos de refs e props dos wrappers; impedir carrossel de capturar setas de controles internos; completar breadcrumb/InputGroup se forem usados; eliminar controles sem ação; dividir bundle por rota após medir. | Pode começar após A01; regressão visual exige preview e testes de interação. | **Dado** leitor de tela e teclado, **quando** usar toast, navegação e controles ativos, **então** cada ação tem nome/foco e atalhos não interrompem campos; build mantém o orçamento acordado e os fluxos principais passam em browser. |
| **A12. Validar staging e decidir publicação** | P0; bloqueado até todas as fases anteriores e autorização | Integrar E2E de navegador com frontend+API, validar migrações, permissões, headers/proxy/TLS, backup/restore, monitoramento, rate limit, contas descartáveis e ausência de fixtures interativas. Registrar decisão separada para conectar providers. | A01–A11, ambiente de staging e autorização de release. | **Dado** staging isolado, **quando** executar checklist E2E e smoke tests, **então** cadastro verificado, privacidade, bloqueio, conteúdo, Seek e demais domínios aprovados funcionam sem estado local; nenhuma alteração em produção ocorre sem autorização explícita. |

### 11.3 Roteiro Now / Next / Later

- **NOW — Base segura e contratos:** A01–A05. A02 e a suíte isolada foram validados em desenvolvimento; Social 1B cobriu os fluxos básicos de relações e privacidade. Antes de declarar A05 concluído, fechar concorrência, filtros e autorização negativa entre contas. E-mail está funcional apenas no desenvolvimento; produção continua desativada.
- **NEXT — Integrar o que já tem modelo e endpoints:** A06–A08. A integração do grafo Social avançou; terminar os casos residuais de A05/A06 antes de conectar publicação/mídia e Seek. Não declarar como persistente qualquer recurso que dependa de provider ainda não conectado.
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
- **Autenticação no estado anterior à revisão 2.3:** ainda não havia suíte em banco isolado; os resultados atuais estão na seção 11.7. O envio Resend em desenvolvimento foi recebido. Recuperação de senha continua sem rota. O rate limit foi testado no middleware real em Express local, não por repetição no endpoint de login real.
- **Varredura de dependências anterior à revisão 2.3:** registrou 0 críticas, 16 altas, 10 moderadas e 6 baixas, incluindo `zod@3.25.76`. A seção 11.7 traz a nova varredura após alinhamento de Zod/Orval. SAST 0 e HoundDog 1 baixo são resultados da rodada anterior, não foram repetidos nesta revisão.
- A alteração em `artifacts/mockup-sandbox` limita-se à versão de desenvolvimento do Vite, necessária para o typecheck do sandbox; ela está fora do limite estrito de “somente Social” indicado no prompt A01. Não foi revertida durante a validação. Gestor e Painel não foram modificados.

### 11.6 Execução do pacote A02 — 24/10/2026

- **Banco e publicação:** confirmado que este projeto usa PostgreSQL gerenciado da Replit. O script `Seekalive/Projeto/scripts/post-merge.sh` usa o `push` normal e o guard agora reconhece `NODE_ENV=production` ou `REPLIT_DEPLOYMENT` definido. O comando `push-force` foi removido. O fluxo oficial de publicação da Replit continua responsável por promover o diff de schema para produção.
- **Estado antes do teste isolado:** o pós-merge não foi executado e nenhum schema de teste havia sido criado nessa etapa. Naquela verificação, `REPLIT_ENVIRONMENT=production` foi interpretado pelo guard antigo como produção; isso não comprovava que o Repl estava publicado. A revisão 2.3 confirma o ambiente de desenvolvimento pelos indicadores oficiais e registra a execução isolada posterior. Nenhuma migration ou escrita em `public` foi feita.
- **API:** `/api/healthz` é liveness sem dependência do banco; `/api/readyz` verifica o banco e retorna 503 se indisponível. 404 e demais erros da API incluem `requestId` no objeto `error`, também enviado pelo header `X-Request-Id`. O encerramento por SIGTERM/SIGINT drena HTTP e fecha o pool, com limite de 10 segundos.
- **Verificação:** typecheck e build de todos os pacotes permitidos no script de raiz aprovados; build da API aprovado; `pnpm --filter @workspace/scripts run test:backend` passou com 10/10 testes sem mutações; um smoke test SIGTERM foi aprovado.
- **Primeira tentativa da suíte isolada:** o executor `test:api-isolated-db` usa schema aleatório, tabelas qualificadas, fingerprint de `public` e entrega de e-mail em memória. A execução foi bloqueada antes da conexão porque o guard antigo confiava incorretamente em `REPLIT_ENVIRONMENT=production`. Após corrigir o indicador, confirmar o banco de desenvolvimento e receber autorização para usar schema temporário, a execução bem-sucedida foi registrada na seção 11.7.
- **Falha de inicialização corrigida:** a primeira implementação do schema isolado tentou criar `pgSchema("public")`, que o Drizzle rejeita. A configuração foi corrigida para usar `pgTable` no schema padrão e schema explícito somente nos testes; typecheck, build, testes HTTP e reinicialização da API passaram. `/api/readyz` retornou `{"status":"ready"}`.
- **Direção externa de banco:** o usuário pediu PostgreSQL hospedado fora da Replit e optou por preparar o backend sem integração. O backend aceita `SEEKALIVE_EXTERNAL_DATABASE_URL` como segredo, `SEEKALIVE_DATABASE_TARGET=external` para o runtime e `SEEKALIVE_DB_MIGRATION_TARGET=external` para migrações manuais; o pós-merge fixa o destino Replit. O destino padrão continua Replit. Nenhum banco externo foi provisionado, nenhuma conexão secreta foi inserida e nenhuma escrita/migração externa ocorreu.
- **Testes do seletor:** seis testes sem conexão comprovam seleção explícita, padrão Replit, separação runtime/migração, falha sem segredo e rejeição de protocolo/alvo inválidos.
- **Drizzle Kit:** `drizzle-kit export` carregou a configuração e gerou SQL sem conexão ou escrita. `drizzle-kit check` não passou: retornou erro de parâmetros do driver AWS Data API (`database` indefinido e `secretArn` igual a `postgresql`); a forma com `--config` e `--dialect` também foi recusada pela CLI. Nenhuma tentativa executou DDL. A validação de migração externa permanece pendente.
- **Pendências identificadas naquele ponto:** executar a suíte isolada e ampliar testes de rate limit multi-instância. A primeira pendência foi resolvida na revisão 2.3; a confiança em proxy continua desligada/adiada conforme decisão do usuário.

### 11.7 Validação integrada de Frontend e Backend — 24/10/2026

**Resultado geral:** o frontend, a API e os testes locais funcionam no ambiente de desenvolvimento. O fluxo autenticado foi exercitado com escrita restrita a um schema temporário descartável; não é um teste de produção nem significa que todos os módulos estejam ligados. Feed, Seek e Shop continuam como etapas futuras.

- **Typecheck:** `pnpm run typecheck` passou como parte do build completo, incluindo frontend, API, bibliotecas compartilhadas e sandbox.
- **Build:** `PORT=8081 BASE_PATH=/ pnpm run build` passou com typecheck. O bundle principal do frontend foi de 987,54 kB minificado (291,42 kB gzip), acima do aviso de 500 kB; avisos de sourcemap/importação mista permanecem. O comando sem variáveis não foi usado como critério de falha, pois o Vite requer `PORT` e `BASE_PATH`.
- **Testes frontend:** `pnpm run test:social` passou com 42/42 testes. São testes de regras e armazenamento local; não substituem testes de navegação/browser nem a integração real com API.
- **Testes backend:** `pnpm --filter @workspace/scripts run test:backend` passou com 17/17: 6 limites de segurança, 6 de seleção de conexão e 5 contratos de runtime HTTP.
- **Teste autenticado com escrita isolada:** `test:api-isolated-db` passou 1/1 no PostgreSQL de desenvolvimento `heliumdb`. O teste cobriu cadastro, bloqueio de login não verificado, confirmação, onboarding, privacidade, aprovação de follow privado, mutualidade do Círculo e bloqueio bilateral. Criou e removeu o schema temporário; o fingerprint de `public` permaneceu igual.
- **Primeira tentativa do teste autenticado:** falhou com `CSRF_REJECTED` porque o helper escolhia o cookie antigo quando a resposta emitia mais de um `Set-Cookie`. O helper passou a selecionar o cookie mais recente; a execução subsequente passou. Isso foi uma falha do harness de teste, não foi contornado reduzindo a proteção CSRF.
- **Identificação do ambiente:** a documentação oficial usa `REPLIT_DEPLOYMENT` para identificar execução publicada. Aqui estava ausente e `REPLIT_DEV_DOMAIN` estava presente; `REPLIT_ENVIRONMENT=production` não é um marcador oficial. Os guards do pós-merge e do teste isolado foram corrigidos e há teste de regressão para impedir que esse valor volte a ser usado.
- **Zod/Orval:** catálogo e workspaces alinhados em Zod 4.6.7, Orval 8.44.0 e `@hookform/resolvers` 6.0.0; Node 22.23.4 atende o requisito do Orval. Os três pacotes têm licença MIT. `format: uuid` e `format: uri` foram restaurados; codegen e typecheck passaram. Foi confirmado que Orval acrescenta um export por estrela de `generated/types`, que colide com valores schema no barrel. O normalizador agora mantém esses tipos em `GeneratedTypes` e falha diante de exports não reconhecidos, em vez de descartar mudanças silenciosamente.
- **Auditoria de dependências:** `pnpm audit` concluiu com 31 achados: 0 críticos, 15 altos, 11 moderados e 5 baixos. O alinhamento Zod/Orval não removeu todos os avisos; eles precisam de triagem antes de uma publicação. Esta revisão não executou SAST/HoundDog novamente.
- **Smoke da API:** `/api/healthz` respondeu `{"status":"ok"}`; `/api/readyz` respondeu `{"status":"ready"}` no banco atualmente selecionado (Replit). A requisição `GET /api/v1/social/feed` retornou 404 JSON porque essa rota de feed ainda não foi implementada.
- **Preview visual:** screenshots mobile de `/`, `/login` e `/register` carregaram sem erros de aplicação no console. Isso confirma apenas a renderização inicial dessas páginas; interações, desktop, teclado e leitores de tela não foram auditados nesta rodada.
- **Integração existente:** frontend usa a API para sessão, cadastro, login, confirmação de e-mail e onboarding. O progresso da integração Social 1B e seus limites estão registrados na seção 11.8; o adaptador demonstrativo continua sendo usado para conteúdo ainda não persistido pelo backend.
- **Contrato Social 1A:** a especificação OpenAPI descreve as rotas de perfil, privacidade e relações sociais. Orval gera o cliente tipado e schemas. Na Social 1B, o contrato de perfil por nome de usuário foi corrigido para refletir o envelope retornado pela API e foi documentada a busca paginada de contas.
- **Contratos fora deste subpasso:** autenticação, cadastro e onboarding continuam sem definição OpenAPI, embora suas rotas existam. Fechar esses contratos deve ser tratado como revisão da etapa anterior, sem expandir agora o escopo Social para módulos futuros.
- **Módulos futuros:** publicações/feed REST, comentários, artigos, busca e referências ainda não têm rotas no backend; Seek, Shop, avaliações, eventos e serviços também aguardam suas etapas próprias. Esses pontos não são falhas da fase de autenticação/cadastro.
- **Conta e recuperação:** a tela de recuperação de senha existe, mas não há rota correspondente na API. O fluxo de integração testado usa e-mail em memória; o envio direto pelo Resend foi verificado separadamente. E2E de navegador, reenvio/expiração do código e login por senha após confirmação ainda precisam de cobertura específica.
- **Persistência:** o banco externo solicitado ainda não existe/configurado. O banco atual é o padrão Replit em desenvolvimento. A suíte criou e removeu seu schema temporário e não alterou `public`; não houve acesso ou escrita em produção.
- **Sequência recomendada:** (0) fechar as decisões e controles de identidade/segurança/configurações descritos na seção 11.9; idade mínima já decidida e aplicada para novos cadastros; (1A, concluída) contratos de perfil, privacidade e relações; (1B, parcialmente conectada) perfil e grafo social, com autorização e E2E ainda pendentes; (2) publicações/feed e visibilidade; (3) comentários, curtidas, reposts e mídia; (4) mensagens e notificações. Nenhuma nova página pública ou algoritmo deve ser avançado antes de concluir a etapa 0. Em cada etapa, fechar contrato, persistência, autorização, integração da interface e testes. **Seek/Shop permanecem bloqueados até todas as fases do Social e os critérios de prontidão para produção estarem completos e validados.**
- **Pendências transversais:** resolver o erro de `drizzle-kit check` antes de qualquer migração externa; validar E2E da recuperação, adotar entrega durável de e-mail e controles distribuídos antes de lançamento; triagem dos achados de dependência; e testes de navegador/multi-instância. A conexão externa permanece não configurada.

### 11.8 Execução da Social 1B — 24/10/2026

**Resultado:** integração de desenvolvimento implementada para a fatia de perfil e grafo social. Não houve migração, criação de tabela ou alteração de dados persistentes fora do schema temporário usado nos testes.

- **Contrato/backend:** a resposta OpenAPI de `GET /v1/profiles/{username}` agora corresponde ao envelope de perfil usado pela API. Foi adicionado `GET /v1/social/accounts` para busca autenticada e paginada de contas ativas com e-mail verificado. O endpoint exige ao menos dois caracteres, limita query/página, trata curingas como texto literal, omite contas bloqueadas e aplica limite de 60 requisições por minuto por IP com `Retry-After`; o status `429` está documentado.
- **Frontend conectado:** em sessão autenticada, perfil público, busca de pessoas, seguidores/seguindo, follow/unfollow, pedidos e aprovação de perfil privado, lista do Círculo, bloqueio/desbloqueio e preferências de privacidade usam a API. O perfil do titular é hidratado com idade/nome e, para conta comercial, endereço e dados de categoria/localidade vindos do DTO privado. Esses campos não são persistidos em localStorage; telas públicas continuam usando DTOs sem endereço/CEP. As alterações usam CSRF; preferências respeitam versionamento otimista e mostram conflito/recarregamento.
- **Demonstração:** contas sem sessão e o modo de preview continuam usando estado local de demonstração. A sessão autenticada não alterna silenciosamente para relações fictícias quando a API falha. O Círculo exibido é o da própria conta; perfis de terceiros não abrem a lista privada do Círculo do visitante.
- **Consistência concorrente:** todas as mutações do grafo social identificadas foram revisadas. Follow, aprovação, bloqueio, unfollow, recusa e desbloqueio adquirem lock nas duas contas em ordem determinística; follow/aprovação/bloqueio revalidam conta ativa/verificada e bloqueio dentro da transação. Onboarding não escreve no grafo social. Isso impede uma operação concorrente de recriar follow/pedido após o bloqueio ser confirmado.
- **Contrato e DTO do titular:** `GET /v1/accounts/me` retorna `MyAccountResponse`, com dados pessoais/comerciais completos somente para a própria sessão verificada. O `AccountView` público não recebe endereço ou CEP. Conta comercial sem perfil completo retorna erro explícito; não é convertida silenciosamente em perfil vazio.
- **Validações:** Orval 8.44.0 gerou cliente e schemas; typecheck completo passou; `test:social` passou 43/43; `test:backend` passou 17/17; `test:api-isolated-db` passou 1/1 incluindo dados do titular e proteção do DTO público, além das corridas sociais. O teste criou e removeu schema aleatório no banco de desenvolvimento `heliumdb`; o schema `public` não foi alterado.
- **Build e execução:** `PORT=8081 BASE_PATH=/ pnpm run build` passou; o bundle principal agora tem 1.011,19 kB (298,17 kB gzip), e o aviso acima de 500 kB permanece. A API e o workflow principal foram reiniciados; API escutou na porta 8080, o preview `/` carregou e não houve erro no console do navegador.
- **Limites da validação:** a captura de preview mostra a tela inicial sem sessão; páginas autenticadas não foram verificadas visualmente nem por interação real no browser. A suíte isolada exercita as rotas e a persistência no banco de desenvolvimento, não produção, banco externo ou várias instâncias.
- **Limites funcionais restantes:** o endpoint textual de busca social não é um endpoint de diretório para o Seek. Ainda não há descoberta real de comércios por localidade/categoria, nem dados de avaliações, mídia, horários ou serviços no backend. Não foi testada a interface autenticada em navegador; a edição de perfil e logout continuam pendentes.
- **Próximo passo do plano:** definir a política de senha e, em seguida, recuperação de conta, sessões/dispositivos, uso dos interesses e persistência das configurações. Antes de aplicar a restrição ao banco principal, revisar registros de desenvolvimento existentes para não apagar nem alterar dados inadvertidamente. Depois concluir autorização/E2E da Social 1B e avançar às fases restantes do Social. Não iniciar feed, páginas públicas, mensagens, notificações ou algoritmo antes do gate de conta/segurança; Seek/Shop seguem bloqueados até o Social inteiro estar pronto para produção.

### 11.9 Cadastro, sessão e segurança da conta — auditoria preliminar

**Escopo:** análise do código atual no ambiente de desenvolvimento. Esta seção descreve implementação observada; não é certificação de segurança, avaliação jurídica ou validação de produção.

- **Onde os dados ficam hoje:** o backend escreve no PostgreSQL selecionado pelo projeto no ambiente de desenvolvimento (atualmente a conexão padrão Replit). O banco externo ainda não foi configurado. A aplicação grava conta, e-mail normalizado, hash de senha, perfil comercial, preferências de onboarding, desafios de verificação e sessões em tabelas relacionais. Não há alegação de que exista uma instância publicada ou dados de produção.
- **Dados de cadastro:** `accounts` armazena nome, sobrenome, idade autodeclarada, nome de exibição, username, tipo/status da conta e versão/data de aceite dos termos. `account_emails` armazena o e-mail normalizado e a data de verificação. Conta comercial armazena categoria, tipo de estabelecimento/prestador, endereço, CEP, cidade, estado e país em `business_profiles`.
- **Senha e proteção em repouso:** a senha não é armazenada em texto claro nem criptografada reversivelmente; o backend usa Argon2id com memory cost de 65.536 KiB, 3 iterações e paralelismo 1. Desafios de verificação e tokens de sessão são armazenados como hashes. Nome, e-mail, idade e endereço estão em colunas de dados normais; não há criptografia de campo no código. A criptografia em repouso do provedor/volume não foi confirmada por esta auditoria.
- **Regra atual de senha:** 8 a 128 caracteres, confirmação igual ao valor digitado. Não existe atualmente bloqueio de senhas comuns/vazadas nem regra de comprimento mínimo superior a 8. Não há fluxo implementado para alterar a senha; a tela desativa essa ação. A política final ainda precisa ser aprovada.
- **Idade:** a decisão aprovada para novos cadastros é mínimo de 18 anos. Frontend, contrato de cadastro do backend e schema do banco restringem a idade declarada a 18–120. A idade continua autodeclarada, sem verificação documental. A única consulta a registros existentes foi uma contagem agregada no banco de desenvolvimento, que encontrou zero contas abaixo de 18; nenhum dado identificável foi lido. O schema principal não foi atualizado. Repetir a contagem antes do lançamento e aplicar a restrição com uma migração validada.
- **Username:** 3–20 caracteres alfanuméricos minúsculos ou `_`, normalizado para minúsculas, com índice único no banco. A API `PATCH /accounts/me` aceita alteração com controle de versão e conflito de duplicidade. A tela atual de configurações altera apenas o estado local do navegador; ainda não chama esse PATCH, portanto a alteração não é persistente para uma conta real.
- **E-mail não verificado:** cadastro cria conta em status `pending_verification`. A API não permite login nem cria sessão até confirmar o e-mail. O código tem 6 dígitos, expira em 10 minutos, é comparado em tempo constante e há limite de 5 tentativas por desafio; reenvio é limitado a 3 tentativas/15 min. Resend está habilitado apenas no desenvolvimento, conforme configuração do projeto.
- **Controles de autenticação atuais:** login limitado a 10/15 min e cadastro a 5/15 min; erros de login são genéricos e a verificação Argon2 é executada também quando o usuário não existe, reduzindo diferença observável para enumeração. Cookies de sessão usam prefixo `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax` e `Path=/`; banco guarda hash do token e da proteção CSRF. Mutação exige CSRF/origem válida; sessão é rejeitada se conta não estiver ativa/verificada. Sessão dura 7 dias por padrão, configurável entre 60 segundos e 30 dias. Logout revoga somente a sessão atual.
- **Limite para produção:** rate limits são armazenados em memória do processo; não coordenam instâncias e não bastam, sozinhos, para implantação horizontal. Ainda não há MFA, detecção/alerta de novo dispositivo, registro de dispositivo confiável ou histórico de acessos. A tela Segurança agora lista e revoga sessões próprias; a opção “salvar senha” apenas habilita preenchimento do gerenciador do navegador, e o site não salva a senha.
- **Outro dispositivo:** cada novo login cria uma sessão própria. O titular pode ver as sessões ativas e encerrar uma sessão ou todas as outras pela tela Segurança. A interface diferencia a sessão atual, mas não informa modelo, navegador, IP ou última atividade. O sistema não reconhece se um aparelho é de uso diário nem faz verificação adicional por dispositivo; essa identificação não é coletada nesta etapa.
- **Recuperação e alteração de e-mail/senha (estado preliminar, atualizado na seção 11.13):** a tela e os endpoints de recuperação agora solicitam e confirmam a troca de senha. A interface de conta ainda desativa a alteração voluntária de senha/e-mail. Não há fluxo de recuperação de username, troca/validação de e-mail, nem exclusão/desativação da conta.
- **Onboarding:** os interesses escolhidos são persistidos por conta na tabela `account_interests`; pular remove/salva lista vazia e marca onboarding concluído. A validação limita até 100 opções, sem duplicadas. O código encontrado persiste a preferência, mas não a consome para ranquear feed ou recomendar conteúdo; algoritmo personalizado ainda não existe.
- **Configurações e impacto:** Privacidade (perfil público/privado, política de mensagens e recibos de leitura) e bloqueios têm API para conta autenticada; preview usa dados locais. A tela Conta altera apenas o estado em memória e não chama a API; para conta real, essas alterações se perdem ao recarregar. A cópia da tela diz que o serviço de autenticação ainda não existe, embora a API própria já exista. Notificações e aparência ficam em `localStorage` por conta e não controlam uma entrega real do servidor. Segurança (2FA, dispositivos, histórico), alteração de senha/e-mail, desativação e exclusão estão indisponíveis. Não há processo de exportação/eliminação nem política técnica de retenção implementados.
- **Próximo bloqueio (estado atualizado na seção 11.13):** recuperação de senha foi implementada; continuam pendentes confiança em dispositivos e revogação de sessões pela interface, configurações de segurança, troca/validação de e-mail, uso dos interesses e definição do impacto de cada configuração. Antes do primeiro lançamento público, revisar contas de desenvolvimento existentes para tratar idade abaixo de 18; implementar APIs/UI/persistência e testes de abuso/autorização; concluir retenção/eliminação, rate limit distribuído e validação de segurança. Até fechar o gate, não avançar páginas públicas de perfil/feed/mensagem/notificação.

### 11.10 Aplicação da idade mínima de 18 anos — 24/10/2026

- A idade mínima foi definida como **18 anos para criar conta**, tanto pessoal quanto comercial. O valor é autodeclarado; não foi adicionada coleta de documento nem verificação por provedor.
- Cadastro da interface e contrato/backend rejeitam idades abaixo de 18; a tela de conta também rejeita valores abaixo de 18. O schema Drizzle contém uma restrição de 18 a 120 anos.
- A suíte de API confirmou que cadastros pessoais e comerciais com 17 anos recebem `400`, que 18 anos é aceito, e que uma inserção direta com 17 é recusada pela restrição do banco. A alteração de schema foi aplicada somente ao schema temporário da suíte, que foi removido ao final.
- **Não executado:** `drizzle-kit push` no schema principal de desenvolvimento ou em produção. Nenhum registro existente foi alterado ou excluído. A consulta autorizada foi somente `COUNT(*) WHERE age < 18`, no ambiente de desenvolvimento, e retornou `0`.
- **Limite registrado naquele corte:** a primeira implementação de idade não tratava contas antigas no login. A consulta agregada encontrou zero contas abaixo de 18; o tratamento da política de senha para contas antigas foi implementado depois e está detalhado na seção 11.11.

### 11.11 Política de senha e contas preexistentes — 24/10/2026

- Regra definida pelo usuário para contas pessoais e comerciais: senha de **8 a 128 caracteres**, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial. O hash é **Argon2id** com parâmetros definidos na API; a composição da senha nunca pode ser inferida lendo o hash.
- Cadastro, validação da API e formulário usam o mesmo contrato compartilhado. O login aceita senha legada de 8–128 caracteres sem exigir composição antes da verificação, para permitir autenticação de contas antigas.
- Credenciais e sessões existentes receberão versão `0` quando as duas colunas novas forem migradas; novas credenciais e sessões usam versão `1`. Sessão só é aceita quando ambas correspondem à versão vigente. Portanto, a migração exige que todos entrem novamente; ela não apaga contas nem conteúdo.
- No próximo login, uma senha antiga que satisfaça a política sobe para versão `1` após verificação, e o usuário recebe nova sessão. Senha antiga incompatível resulta em `PASSWORD_UPDATE_REQUIRED` e não gera sessão; após o usuário informar a senha atual e definir uma senha nova, a API atualiza o hash e revoga as sessões antigas. Conta antiga que confirme e-mail com política `0` é ativada sem sessão e segue para o login.
- **Validação realizada:** typecheck aprovado; suíte de API em schema temporário aprovou recusa de políticas inválidas, promoção de senha legada compatível, troca obrigatória de senha incompatível, rejeição da senha antiga, criação da nova sessão e revogação da sessão anterior. As demais regras sociais continuaram aprovadas na mesma suíte. O schema isolado foi removido; o schema `public` do banco de desenvolvimento não foi alterado.
- **Estado da migração:** não aplicada no banco principal de desenvolvimento e nenhuma conta existente foi atualizada. A aplicação exige autorização porque sessões atuais deixam de valer e será necessário entrar novamente. Não há produção verdadeira neste projeto.
- **Estado naquele corte, supersedido pela seção 11.13:** recuperação de senha esquecida, troca voluntária na tela de configurações, gestão de sessões/dispositivos e verificação adicional de dispositivo ainda estavam pendentes.

### 11.12 Migração de senha e idade aplicada em desenvolvimento — 24/10/2026

- A autorização foi recebida para aplicar a migração no banco principal **de desenvolvimento** (`heliumdb`, schema `public`), usando o alvo `replit` padrão do ambiente. Nenhuma operação foi direcionada a produção ou ao PostgreSQL externo.
- `drizzle-kit push` aplicou as colunas `password_policy_version` em `password_credentials` e `sessions`, ambas `smallint NOT NULL DEFAULT 0`, e a restrição `accounts_age_adult_range` (`age >= 18 AND age <= 120`).
- Verificação após a migração confirmou as duas colunas, default `0`, restrição correta e zero violações de idade. Antes e depois da aplicação: zero contas, zero credenciais e zero sessões ativas; portanto, nenhum registro ou sessão foi modificado nem usuário precisou reentrar agora.
- O workflow da API foi reiniciado e iniciou na porta `8080` sem erro de inicialização. A alteração está somente no desenvolvimento.
- A seção 11.11 descreve o estado anterior à autorização e é supersedida por esta seção. A recuperação de senha foi adicionada na seção 11.13; configurações de segurança e controle de sessões/dispositivos mantêm o gate de conta aberto.

### 11.13 Recuperação segura de senha esquecida — 24/10/2026

- **Interface:** `/forgot-password` agora tem três estados: solicitar o código pelo e-mail, confirmar o código e a nova senha, e concluir com retorno ao login. O código e as senhas ficam apenas no estado do formulário; não são persistidos no navegador. A regra compartilhada exige 8–128 caracteres, maiúscula, minúscula, número, caractere especial e confirmação correspondente.
- **API:** `POST /v1/auth/password/reset/request` responde `202` com a mesma mensagem e piso de 200 ms para e-mail desconhecido, conta não verificada, conta elegível ou pedido limitado por conta. Somente contas ativas com e-mail verificado recebem um código. O limite excedido por IP retorna `429`. A entrega inicia após a resposta HTTP para não expor latência do provedor; a API não devolve o código.
- **Desafio:** código numérico de seis dígitos; banco guarda HMAC-SHA256 com chave `SESSION_SECRET`, separada por propósito; vence em dez minutos; até cinco tentativas; uso único. Pedido anterior ativo é consumido ao emitir outro. Há limites de cinco solicitações por IP/15 min, uma solicitação por conta/60 s e cinco por conta/hora.
- **Conclusão:** valida e-mail, elegibilidade, código e política; grava hash Argon2id e versão da política, consome o desafio, invalida outros desafios de recuperação e revoga todas as sessões na mesma transação. Não autentica automaticamente; usuário deve entrar novamente. Código inválido, expirado, esgotado ou reutilizado recebe erro genérico.
- **Entrega de e-mail:** a integração Resend configurada neste ambiente permanece restrita a desenvolvimento. A suíte integrada usa adapter em memória e não envia mensagem externa. Se o envio falhar, o desafio é consumido e o log registra apenas um código de erro estático; não há outbox durável ou retry automático ainda.
- **Abuso e limites de produção:** o endpoint usa rate limit por IP em memória do processo e controle por conta no banco. O limitador por IP não é distribuído entre múltiplas instâncias. Outbox persistente, retentativa segura, E2E de navegador/Resend e limitação distribuída são critérios obrigatórios antes de habilitar produção.
- **Testes realizados:** typecheck completo passou. `test:api-isolated-db` passou em schema aleatório de desenvolvimento criado e removido pela própria suíte, sem alterar `public`: e-mail desconhecido e ativo produzem a mesma resposta; conta não verificada não recebe mensagem; cooldown suprime envio; código errado incrementa tentativas; código válido troca senha uma vez; sessão antiga é revogada; replay falha; login com a nova senha funciona; o código armazenado não é o texto enviado.
- **Estado do produto:** somente desenvolvimento foi alterado; nenhum envio externo foi feito nesta validação, nenhuma migração foi necessária e produção não existe/foi alterada. A gestão de sessões está implementada na seção 11.14; o próximo item do gate é definir quais configurações de conta e segurança precisam ser persistidas e quais exigirão 2FA ou dispositivo confiável. Depois validar os demais itens de identidade antes de abrir as páginas públicas do Social.

### 11.14 Gestão de sessões e controles da tela Segurança — 24/10/2026

- **Política de sessão:** cada login confirmado cria uma sessão independente com cookie `__Host-seekalive_session`; a validade padrão segue em sete dias. A lista retorna somente sessões ativas da própria conta, em páginas de 20, com ID, criação, expiração e indicação da sessão atual.
- **Endpoints implementados:** `GET /v1/auth/sessions?cursor=...` lista sessões; `DELETE /v1/auth/sessions/{sessionId}` encerra uma sessão não atual pertencente ao titular; `DELETE /v1/auth/sessions/others` revoga todas as outras e preserva a sessão que fez o pedido. Encerrar a sessão atual continua sendo feito pelo logout normal.
- **Autorização:** todas as consultas exigem sessão ativa, conta ativa e e-mail verificado. Escritas exigem CSRF. O filtro de ownership é aplicado diretamente no `UPDATE`; um ID de sessão de outra conta retorna o mesmo `404` de um ID inexistente. Limites por IP protegem consulta e revogação. A operação em lote é idempotente e informa quantas sessões foram revogadas.
- **Dados e privacidade:** nenhuma coluna ou migração nova. A tabela `sessions` já guarda token/CSRF como hash, versão da política, início, expiração e revogação. O endpoint não retorna os hashes, IP, user-agent, impressão digital nem localização e não inventa dado de “última atividade”. A paginação usa cursor base64url de offset, com limite de leitura de 21 registros por requisição.
- **Interface:** Configurações > Segurança consulta e atualiza a lista via API, permite encerrar um acesso individual ou todos os demais, identifica textualmente a sessão atual e mostra confirmação antes de revogar. Erros de API são exibidos; não há fallback silencioso para dados fictícios. A página deixa explícito que não reconhece aparelho habitual. 2FA e histórico detalhado continuam desativados/indisponíveis.
- **Testes:** a suíte integrada em schema temporário confirmou autenticação obrigatória, paginação/cursor inválido, CSRF, validação de UUID, bloqueio de revogação da sessão atual, isolamento entre contas, revogação individual, revogação em lote preservando a sessão atual e repetição com zero sessões. Schema temporário removido ao final; nenhum dado do schema `public` foi alterado.
- **Limites:** a captura visual de preview não autentica o navegador; em `/settings/security`, o navegador sem sessão foi encaminhado à tela inicial. O estado autenticado foi exercitado pela API e a tela protegida não foi validada visualmente sem conta, preservando o gate de autenticação. 2FA, notificações de novo login, histórico de acessos e identificação de dispositivo habitual não foram implementados. Rate limit por IP permanece em memória do processo e não é distribuído.
- **Próxima etapa:** definir e implementar as configurações de conta que realmente alteram autorização ou segurança, com seus efeitos persistidos e controles de servidor. Não avançar páginas públicas, feed ou mensagens antes de concluir e testar o gate de identidade/Social.

### 11.15 Edição de conta pessoal/comercial conectada à API — 24/10/2026

- **Comportamento da tela:** `Configurações > Conta` (`/settings/account`) mostra nome, sobrenome e nome de usuário para contas pessoais; para contas comerciais, mostra nome da empresa/prestador e endereço, CEP, cidade, estado e país. A idade deixa de aparecer no app após o cadastro. O e-mail verificado é exibido em modo somente leitura; recuperação de senha continua na tela própria e troca de e-mail/senha atual/exclusão não são simuladas.
- **API e privacidade:** `GET/PATCH /v1/accounts/me` são owner-only. O DTO inclui o e-mail verificado somente da sessão titular, mas nunca inclui idade. A idade permanece no banco e é usada somente no servidor para aplicar a regra de 18+; o PATCH não aceita alteração de idade. Perfis públicos e buscas também não recebem idade nem endereço completo. `PATCH` valida o tipo consultado no banco, não permite alterar o tipo da conta, exige nome e sobrenome juntos para contas pessoais e rejeita campos pessoais em contas comerciais (e vice-versa).
- **Consistência:** o endpoint conserva o compare-and-swap por `version`; atualização de `accounts` e `business_profiles` ocorre na mesma transação. Username duplicado e versão desatualizada retornam conflitos explícitos. O schema já comportava esses dados; não houve migração.
- **Demonstração:** o formulário continua local somente no preview de desenvolvimento; sessão real carrega e salva pela API e não faz fallback para fixtures em caso de erro. Campos privados não são gravados no armazenamento local da aplicação após o retorno do servidor.
- **Contrato e documentação:** atualizado OpenAPI, schemas Zod, tipos/cliente Orval e documentação de endpoints/integração; codegen Orval 8.44 e typecheck de libs aprovados, sem editar arquivos gerados manualmente.
- **Testes:** a suíte HTTP em schema temporário confirmou idade ausente dos DTOs público e owner-only, idade original preservada no banco após edições de perfil, rejeição de PATCH de idade, validação de idade abaixo de 18 no cadastro, edição pessoal e comercial, persistência do endereço, atualização do nome público, erro para campos incompatíveis, versão desatualizada e rejeição de username já ocupado com `409`. O schema temporário foi removido; não houve migração nem alteração em produção.
- **Limites:** typecheck integral e teste HTTP passaram; o preview autenticado não foi visualmente validado, pois a captura não autentica e o gate de login foi mantido. A próxima ação é validar a tela autenticada e fechar os controles/decisões restantes de Conta e Social; não iniciar Seek/Shop nem páginas públicas antes desse gate.

### 11.16 Auditoria de bancos independentes — Fase 1 do prompt — 24/10/2026

**Escopo executado:** inventário estático do repositório, leitura das configurações e documentação de banco, busca de acessos diretos às tabelas e consultas estritamente somente leitura ao PostgreSQL de desenvolvimento. Não foi acessada produção, não foram lidos dados pessoais, não foi escolhido/provisionado provedor externo e não foram alterados código, schema, tabelas ou dados. Esta é a Fase 1 de auditoria e plano; não significa que a arquitetura multi-banco esteja implementada.

**Parecer:** o backend atual é um monólito modular com uma única conexão Drizzle e um único PostgreSQL. A seleção de conexão externa já preparada é um seletor para um banco inteiro; ela não implementa conexões independentes por domínio. A separação em bancos distintos exige mudanças reais nos limites de dados, transações, APIs internas, migrações, saúde e recuperação. **Não é seguro aplicar `schema-core.sql` nem iniciar a divisão antes de fechar as decisões e a sequência descritas abaixo.**

#### Fatos confirmados no desenvolvimento

| Tema | Estado observado |
|---|---|
| Topologia ativa | `infra/database/src/index.ts` cria um `Pool` PostgreSQL e uma instância Drizzle compartilhada. A aplicação resolve um destino por execução; não há pool, credencial, migração ou readiness separados por domínio. |
| Seleção externa | `infra/database/src/connection.ts` prepara `SEEKALIVE_DATABASE_TARGET=external` com `SEEKALIVE_EXTERNAL_DATABASE_URL` e seleção de migração separada por `SEEKALIVE_DB_MIGRATION_TARGET`. O destino padrão e o pós-merge continuam Replit. Nenhuma conexão externa foi configurada ou testada; portanto, as variáveis preparadas não provam que um banco externo exista. |
| Banco consultado | Consulta somente leitura ao banco de desenvolvimento: PostgreSQL 16.10, schema `public`, dez tabelas atuais e zero registros em cada uma no momento da consulta. Essa constatação vale para o snapshot consultado, não garante que outros ambientes estejam vazios nem elimina a obrigação de repetir contagens e backups antes de qualquer migração futura. |
| Extensão espacial | `plpgsql` é a única extensão instalada. PostGIS 3.5.3 aparece como disponível no PostgreSQL de desenvolvimento, mas não está instalado. Isso não comprova disponibilidade, permissões ou compatibilidade no futuro provedor externo. |
| Tabelas atuais | `accounts`, `account_emails`, `password_credentials`, `business_profiles`, `auth_challenges`, `sessions`, `account_interests`, `account_follows`, `account_follow_requests` e `account_blocks`; todas no mesmo banco/schema. |
| Conteúdo das tabelas | `accounts` combina identidade, tipo/status, idade de validação, username, perfil básico, preferências de privacidade/mensagens e estado de onboarding. Credenciais, desafios e sessões têm tabelas próprias, mas continuam no mesmo banco. Perfil comercial, interesses e relações também permanecem nesse banco. |
| Chaves e transações | Há FKs de credenciais, sessões, desafios e relações sociais para `accounts`. Cadastro/credenciais/perfil comercial usam o banco compartilhado e podem ser coordenados numa transação local. Essas FKs e transações não atravessam bancos PostgreSQL independentes. |
| Acesso aos dados | Os módulos de auth, sessão, onboarding, perfis e Social importam diretamente `@workspace/db`. Rotas de perfil consultam contas e relações sociais; o código não está isolado atrás de contratos de repositório/serviço que permitam trocar cada domínio por uma conexão sem refatoração. |
| Módulos de backend | Existem `auth`, `health`, `onboarding`, `profiles` e `social`. Não há handlers persistentes de backend para publicação/feed, mídia, mensagens, notificações, busca, localização ou Seek. O Shop também não possui domínio persistente. |
| Migrações | A configuração Drizzle aponta para um schema compartilhado e o comando disponível é `drizzle-kit push`. Não há histórico de migrações versionadas e independentes por banco/domínio nem procedimento de rollback testado. O pós-merge fixa o destino Replit. |
| Infraestrutura futura | `infra/cache`, `infra/queues` e `infra/storage` contêm documentação-reserva; não foi encontrado worker, fila, cache distribuído, indexador ou outbox implementado. A tabela/outbox proposta em SQL não é um sistema ativo. |
| Contratos e testes | O monorepo usa TypeScript, Express 5, Drizzle ORM 0.45, Drizzle Kit 0.31, `pg` 8, Zod 4 e contratos OpenAPI/Orval. Os resultados recentes de build, typecheck e testes existentes estão na seção 11.7. O teste integrado com schema temporário valida fluxos no banco único; não valida consistência entre bancos independentes. |

#### Limites, conflitos e riscos

1. **A separação de Contas e Segurança ainda não existe.** Dados de identidade e credenciais/sessões estão em tabelas diferentes, mas na mesma instância lógica. `accounts` também mistura campos de identidade, perfil e preferências. É necessário definir o proprietário de cada campo antes de mover tabelas.
2. **A proposta `docs/api/backend/schema-core.sql` não é o schema atual nem está aplicada.** Ela reúne o futuro produto num arquivo SQL, não apresenta migrações executáveis independentes por domínio e não implementa PostGIS. Não deve ser tratada como base pronta para aplicar no desenho novo.
3. **O limite de domínio de Shop não foi definido pelo prompt anexado.** O prompt enumera dez domínios — Contas, Segurança, Perfis/Relações, Mídias, Feed, Mensagens, Notificações, Busca, Seek e Localização —, mas não reserva explicitamente um banco para o Shop, que é um módulo separado no produto. Também precisa ser decidido se `business_profiles` pertence a Perfis ou Seek, e se `account_interests` pertence a Contas ou Preferências/Busca.
4. **A atomização atual do cadastro deixa de valer ao dividir Contas e Segurança.** Hoje cadastro e validações dependem da mesma base transacional. Não há transação distribuída; será preciso definir uma orquestração idempotente, estados intermediários e compensação/retentativa antes da migração. Não introduzir fila/outbox sem justificar a necessidade e desenhar sua entrega/reprocessamento.
5. **Relações e bloqueios têm efeitos em outros domínios.** Hoje follows, solicitações e bloqueios são aplicados juntos; mensagens antigas devem ficar ocultas enquanto o bloqueio está ativo e voltar após desbloqueio. Com relações e mensagens em bancos separados, cada leitura e escrita precisa aplicar a mesma regra, inclusive em falha parcial e reprocessamento.
6. **Não há integridade referencial entre futuros bancos.** O identificador global estável da conta, contratos de serviço, suspensão/exclusão e estratégia de consistência precisam ser especificados; nenhuma FK poderá garantir vínculo entre bancos.
7. **Localização espacial ainda é só uma exigência planejada.** Não há coluna geográfica, consulta por raio, índice GiST, geocodificação nem serviço de mapa no backend atual. PostGIS estar disponível no PostgreSQL de desenvolvimento é apenas um teste de possibilidade local.
8. **Recuperação operacional não está demonstrada.** Não há procedimento testado de backup/restauração para vários bancos, roles por domínio, limites agregados de conexões ou recuperação coordenada. Criar dez pools sem medir limites pode exceder conexões mesmo usando um servidor comum.
9. **Há deriva em documentação adjacente.** `docs/api/backend/README.md` ainda afirma que recuperação de senha esquecida não está implementada, apesar do fluxo implementado e registrado nas seções 11.13 e 11.15. `external-services-and-operations.md` também deve ser comparado com o teste Resend recebido em desenvolvimento. A documentação de status precisa ser reconciliada antes de servir de instrução operacional.
10. **Conflito de ordem a resolver antes de avançar:** o prompt coloca Location/PostGIS antes das demais áreas; a regra de projeto já registrada exige terminar e validar Social antes de mudar para Seek/Shop. A Fase 1 apenas documenta essa divergência. A sequência existente do produto deve prevalecer por ora: não iniciar Seek/Shop nem provisionar a implementação de Location antes do gate Social, salvo nova decisão explícita.

#### Arquivos e áreas que seriam afetados numa implementação futura

- `infra/database/src/connection.ts`, `infra/database/src/index.ts`, `infra/database/src/schema/*`, `infra/database/drizzle.config.ts` e scripts do pacote `@workspace/db`: registro de conexões, schemas e migrações por domínio.
- `Aplicativo/back/src/modules/auth`, `onboarding`, `profiles`, `social` e `security/session.ts`: remover consultas cruzadas diretas, definir contratos internos e consistência de cadastro, sessão, perfil, relações e bloqueios.
- Contratos em `shared/`, documentação OpenAPI e verificações em `scripts/`/`Aplicativo/back/test`: erros de indisponibilidade por domínio, isolamento, idempotência, integridade e autorização.
- `scripts/post-merge.sh`, procedimentos de operação e documentos em `docs/api/backend/`: impedir que o pós-merge aplique migrações no destino errado; definir backup, restauração e plano de recuperação.
- `docs/api/backend/schema-core.sql` e `data-dictionary.md`: particionar a proposta, mas somente depois da decisão de ownership; o SQL atual permanece proposta e não foi executado.

#### Plano recomendado por etapas

1. **Fechar o mapa de propriedade dos dados.** Listar tabelas/campos por banco e resolver explicitamente Shop, perfil comercial e interesses; desenhar os fluxos de cadastro/verificação, login/sessão, bloqueio/desbloqueio, exclusão e leitura pública sem FKs entre bancos.
2. **Selecionar e validar o provedor externo antes de criar recursos.** Confirmar suporte a múltiplos bancos PostgreSQL, roles/credenciais independentes, PostgreSQL compatível, PostGIS, limites de conexão, backups e acesso de migração. Nenhum provedor ou instância foi escolhido nesta auditoria; não sobrescrever `DATABASE_URL`.
3. **Especificar a fundação sem alterar dados.** Definir nomes/owners/roles, variáveis por domínio, limites de pool, readiness individual, migrações versionadas, configuração fail-closed e testes de seleção. O destino de pós-merge deve permanecer Replit até haver decisão e validação específicas.
4. **Separar Contas e Segurança como primeira migração de domínio.** Planejar cópia verificável, IDs estáveis e fluxo idempotente para conta pendente, confirmação e sessão; testar falha antes/depois de cada gravação, repetição, compensação, backup e restauração em bancos descartáveis.
5. **Completar a etapa Social antes de avançar de módulo.** Definir/provar os limites de Perfis/Relações e o comportamento em falhas de identidade, relacionamento e bloqueio. Não tratar API conectada parcialmente como pronta para produção.
6. **Só após o gate Social, implementar os bancos restantes de forma incremental.** Localização/PostGIS deve começar com dados de negócio validados, coordenadas e índice espacial; manter GPS do usuário explícito e não persistido por padrão. Em seguida decidir e implementar mídia/feed, mensagens/notificações, Seek, Shop e busca com consistência e testes próprios.
7. **Fechar operação antes de qualquer uso fora do desenvolvimento.** Ensaiar cópia, contagem, validação, troca de conexão, rollback/compensação e restauração; documentar RPO/RTO e verificar que a falha de um domínio não vaza dados nem produz sucesso falso em outro.

**Resultado desta fase:** auditoria concluída e plano registrado. A proposta inicial de ownership foi escrita em `docs/architecture/database-domains.md`; ela ainda aguarda decisões sobre salvos e sobre eventual agrupamento de contas comerciais por marca/rede. Shop e Confiança e Segurança foram confirmados pelo usuário como bancos lógicos independentes, sem provisionamento. Foram feitas inspeções estáticas e uma consulta agregada somente leitura ao banco de desenvolvimento; não foram executados testes contra provedor externo, migrações ou operações de escrita. Nenhuma tabela, banco, conexão externa ou módulo foi alterado. O próximo passo é resolver as decisões em aberto, não aplicar DDL.

### 11.17 Proposta de propriedade dos dados por domínio — 24/10/2026

- **Documento:** criada a proposta `docs/architecture/database-domains.md` e indexada em `docs/architecture/README.md`; o dicionário atual aponta para ela. Inclui matriz de ownership, mapeamento das tabelas atuais/propostas, fluxos e diagrama conceitual sem acesso direto entre bancos. A proposta separa a identidade única de Contas, credenciais de Segurança, perfil e relações, mídia, Feed, Mensagens, Notificações, Pesquisa, Seek e Localização/PostGIS.
- **Shop:** o prompt lista dez bancos, mas omite Shop, embora o produto o trate como módulo distinto. O usuário confirmou um décimo primeiro banco lógico próprio, limitado inicialmente ao catálogo; pedidos, pagamentos e estoque continuam fora do escopo. Nenhum banco foi criado.
- **Entidades transversais:** salvos, auditoria, pedidos de privacidade, outbox e idempotência foram mapeados ou marcados como pendentes. Denúncias e ações de moderação passam a pertencer ao domínio Confiança e Segurança, conforme decisão registrada na seção 11.19. O SQL atual possui FKs que atravessam os futuros domínios e não pode ser usado sem ser redesenhado.
- **Campos atualmente misturados em `accounts`:** proposta de repartir identidade/idade/termos em Contas, apresentação/privacidade em Perfis/Relações e preferências de mensagens em Mensagens. Nome e sobrenome permanecem privados; somente o `displayName` escolhido pelo usuário aparece no perfil pessoal. A coluna legada `isVerified` do banco de desenvolvimento não representa selo público; confirmação de e-mail continua sendo estado privado de autenticação.
- **Localização:** separar dados geográficos de endereço/identidade comercial, usar referência `location_id`, preservar GPS de usuário como efêmero e não ativar PostGIS até validar o provedor e resolver o gate Social.
- **Fluxos:** registrados os contratos e falhas parciais que precisam de desenho antes de separar cadastro/verificação, login/sessão, perfil comercial, publicação com mídia/local, bloqueio/mensagens, indexação/notificações e exclusão de conta.
- **Limite desta entrega:** é uma matriz recomendada, não uma aprovação final ou implementação. Nenhum banco foi criado, segredo alterado, conexão configurada, migração executada ou tabela movida.

### 11.18 Decisão sobre o banco lógico do Shop — 24/10/2026

- **Decisão confirmada:** Shop terá banco lógico próprio, além dos dez domínios listados no prompt.
- **Escopo aprovado:** propriedade do catálogo de produtos/ofertas no domínio Shop. Isso não aprova carrinho, pedidos, estoque, pagamentos, frete ou entrega.
- **Estado técnico:** decisão documentada em `docs/architecture/database-domains.md`; nenhum banco ou segredo foi provisionado, nenhuma conexão foi ativada e nenhuma migração foi executada.
- **Próxima decisão pendente:** regra para vincular contas comerciais independentes a uma marca/rede, caso isso seja necessário.

### 11.19 Decisão sobre Confiança e Segurança de Conteúdo — 24/10/2026

- **Decisão confirmada:** denúncias e ações de moderação entre módulos pertencem a um domínio e banco lógico próprios, além dos dez domínios do prompt e do Shop.
- **Escopo inicial:** receber referências tipadas a contas, posts, mensagens, avaliações, eventos e itens do Shop; controlar a fila de denúncias e as ações de moderação, sem FK para bancos de outros domínios.
- **Não incluído automaticamente:** logs gerais de auditoria, credenciais/sessões, toda evidência de conteúdo, ou funcionalidades do Painel. Definir papéis, retenção, apelação e como solicitar ao domínio proprietário uma remoção/suspensão antes de criar schema.
- **Estado técnico:** a decisão está registrada no mapa; nenhum banco, segredo, conexão ou migração foi criado.

### 11.20 Decisão sobre localização principal comercial — 24/10/2026

- **Decisão confirmada:** cada conta comercial pode ter no máximo uma unidade/endereço físico principal.
- **Decisão confirmada em 24/10/2026:** o Seek mostra somente o endereço principal; não oferece regiões/cidades/raios de atendimento. Excluir `business_service_areas` do schema futuro.
- **Não decidido:** eventual relação entre várias contas comerciais independentes que pertençam à mesma marca/rede. Não criar entidade-pai, conta compartilhada ou agregação de avaliações sem regra explícita.
- **Estado técnico:** registrado em `docs/architecture/database-domains.md`; sem alteração de schema, banco, conexão ou dados.

### 11.21 Decisão sobre áreas de atendimento no Seek — 24/10/2026

- **Decisão confirmada:** o perfil comercial no Seek mostra apenas seu endereço físico principal; prestadores não cadastram cidades, regiões ou raios onde atendem.
- **Consequência arquitetural:** excluir `business_service_areas` do modelo aprovado. A tabela que aparece em `schema-core.sql` permanece parte de uma proposta não aprovada e não será criada.
- **Estado técnico:** decisão documentada; nenhum schema, banco ou dado foi alterado.

### 11.22 Decisão sobre nome público no perfil pessoal — 24/10/2026

- **Decisão confirmada:** o perfil pessoal mostra somente o nome de exibição escolhido pelo usuário.
- **Privacidade:** nome e sobrenome informados no cadastro permanecem dados privados em Contas e não são copiados para a projeção pública do perfil.
- **Estado técnico:** decisão documentada; não implica mudança de código ou banco nesta etapa.

### 11.23 Decisão sobre selo público de verificação — 24/10/2026

- **Decisão confirmada:** não oferecer selo público de verificação na primeira versão do aplicativo.
- **Regra de conta:** confirmação de e-mail continua privada, como requisito de autenticação; não significa validação pública, comercial ou reputacional.
- **Contrato e interface:** removido `isVerified` do DTO público, OpenAPI, tipos gerados e componentes de perfil/publicação. As fixtures demonstrativas também não atribuem o selo.
- **Banco:** nenhuma migração foi executada. A coluna `accounts.is_verified` ainda permanece no schema ativo de desenvolvimento, mas não é selecionada nem retornada pelo endpoint público. O SQL proposto para a versão inicial já não inclui a coluna. A remoção do campo legado no banco ativo fica para uma migração revisada.
- **Verificação:** `pnpm run typecheck`, 44 testes sociais, geração Orval e build do back passaram. O build do front passou com avisos de sourcemap e tamanho/divisão de bundle. O teste de API isolado não executou por falta de `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE` no shell; a asserção de regressão foi adicionada, mas aguarda ambiente de banco de desenvolvimento para ser executada. A captura de preview da rota de perfil mostrou a tela inicial de apresentação, portanto o perfil autenticado não pôde ser conferido visualmente neste ambiente.

### 11.24 Retenção do nome de usuário anterior — 24/10/2026

- **Decisões confirmadas:** a primeira troca só pode ocorrer 30 dias após o registro da conta; cada troca posterior exige 30 dias desde a última troca. Depois de qualquer troca, o @ anterior fica indisponível para todas as contas durante 30 dias; nem o titular anterior pode recuperá-lo. Após esse prazo, ele pode ser liberado.
- **Aviso obrigatório:** antes de confirmar a troca, a interface deve explicar que o @ antigo ficará indisponível por 30 dias e que não poderá ser recuperado nesse período.
- **Estado técnico:** ainda não implementado. O backend atual verifica unicidade do nome ativo, mas não aplica o prazo mínimo nem reserva o nome anterior. A implementação precisa bloquear alterações precoces no servidor, impedir reutilização em cadastro e em outras trocas, tratar concorrência e ter testes de API; não basta esconder a disponibilidade no frontend.
- **Gate:** não considerar o ciclo de nome de usuário pronto nem avançar para páginas públicas até a regra estar aplicada e testada. Não foi feita migração nem alteração no banco nesta decisão.

### 11.25 Ativação de novo e-mail da conta — 24/10/2026

- **Decisão confirmada:** a troca só entra em vigor depois que o novo endereço for confirmado; o e-mail atual permanece ativo até a confirmação.
- **Reautenticação confirmada:** exigir a senha atual e um código enviado ao endereço atual verificado antes de iniciar a alteração. O novo endereço também deve ser confirmado antes de substituir o atual.
- **Aviso confirmado:** após a troca bem-sucedida, enviar uma notificação de segurança ao endereço antigo.
- **Segurança:** manter a regra de que login e acesso exigem um endereço verificado. A troca não deve criar intervalo em que a conta fique sem um e-mail ativo.
- **Estado técnico:** o fluxo de alteração de e-mail não está implementado na API nem na tela Conta. Esta seção registra a regra do produto, não uma funcionalidade pronta.
- **Detalhes pendentes antes da implementação:** definir expiração/cancelamento dos desafios e comportamento se o usuário perder acesso ao endereço atual.

### 11.26 Reautenticação para troca de senha — 24/10/2026

- **Decisão confirmada:** trocar a senha exige a senha atual e um código de uso único enviado ao e-mail atual verificado, seguindo a mesma proteção da troca de e-mail.
- **Distinção:** a confirmação de um e-mail novo é adicional apenas para troca de endereço; troca de senha não modifica o e-mail cadastrado.
- **Estado técnico:** troca voluntária de senha ainda não está disponível na tela Conta/API; a recuperação de senha esquecida é um fluxo diferente e não substitui esta regra.

### 11.27 Recuperação de conta sem acesso ao e-mail atual — 24/10/2026

- **Decisão confirmada:** o titular deve entrar em contato com o suporte e passar por verificação adicional manual; o app não deve liberar a conta automaticamente sem comprovar o controle do e-mail atual.
- **Canais confirmados:** a solicitação deve ser entregue tanto ao e-mail do suporte quanto ao Painel de Controle planejado.
- **Escopo do Painel:** será usado para controle, gestão e moderação, incluindo assuntos do aplicativo e do Gestor. O Painel e o Gestor não serão alterados nesta etapa.
- **Limite de escopo confirmado:** definir o método de verificação adicional está fora do escopo atual. Não coletar documento oficial nem adicionar prova de identidade nesta etapa.
- **Estado técnico:** não há fluxo de suporte, fila de solicitações, destino de e-mail nem procedimento de verificação manual implementado. Permissões, retenção e trilha de decisão também continuam sem definição.
- **Gate futuro:** antes de permitir que suporte altere conta/e-mail, definir a verificação adicional e os controles contra fraude; entregar a solicitação aos canais confirmados sem incluir credenciais ou códigos de autenticação.

### 11.28 Solicitação de exclusão permanente da conta — 24/10/2026

- **Decisão confirmada:** a primeira versão deve permitir que o titular solicite a exclusão permanente da própria conta nas Configurações.
- **Prazo confirmado:** executar a exclusão permanente 7 dias após a solicitação.
- **Cancelamento confirmado:** o titular pode cancelar a solicitação até o último dia do período de 7 dias.
- **Estado confirmado:** ocultar e desativar a conta imediatamente após a solicitação; manter os dados preservados durante o prazo para que a conta possa ser restaurada se o titular cancelar.
- **Cancelamento pelo login:** ao tentar entrar durante os 7 dias, depois de validar as credenciais, mostrar o tempo restante e perguntar se o titular quer restaurar a conta. Se não quiser, manter a exclusão programada e bloquear o acesso.
- **Autenticação da restauração confirmada:** exigir a senha correta e um código enviado ao e-mail verificado antes de reativar a conta. Sem essa confirmação, manter a exclusão programada.
- **Autenticação do pedido:** aplicar a regra já estabelecida para ações sensíveis da conta: senha atual e código enviado ao e-mail verificado antes de agendar a exclusão.
- **E-mail após o pedido:** não enviar uma mensagem separada depois de agendar a exclusão; somente o e-mail com o código para autorizar o pedido.
- **Conteúdo público confirmado:** ao concluir a exclusão, apagar publicações, mídias e comentários produzidos pela conta.
- **Mensagens diretas confirmadas:** manter as mensagens na caixa dos destinatários e anonimizar o remetente como “Conta excluída”.
- **Relações sociais confirmadas:** remover seguidores, contas seguidas, pedidos pendentes e relações de Círculo quando a exclusão se tornar permanente; preservar esses dados durante os 7 dias para restauração.
- **Interações confirmadas:** remover curtidas e repostagens da conta e atualizar as contagens dos conteúdos afetados quando a exclusão se tornar permanente; preservar os registros durante os 7 dias para permitir restauração.
- **Itens salvos confirmados:** apagar a coleção de itens salvos quando a exclusão se tornar permanente; mantê-la durante os 7 dias para permitir restauração.
- **Retenção confirmada:** conservar apenas o mínimo exigido por obrigação aplicável, com acesso restrito e prazo definido; remover quando o prazo terminar.
- **Limite de implementação:** as categorias concretas de registro e seus prazos dependem de revisão jurídica/privacidade; não presumir prazos nem retenções.
- **Estado técnico:** não há solicitação de exclusão, fluxo de cancelamento, endpoint nem rotina de remoção implementados. Nenhum dado foi apagado ou migrado.
- **Segurança:** não revelar que uma conta está em exclusão antes da validação das credenciais.
- **Gate:** detalhar as categorias e os prazos da retenção obrigatória antes da rotina destrutiva; as regras de mensagens e relações já foram definidas.

### 11.29 Exportação de dados da conta — 24/10/2026

- **Decisão confirmada:** não oferecer, na primeira versão, download ou exportação dos dados da conta, nem por Configurações nem por solicitação ao suporte.
- **Estado técnico:** não há interface, endpoint ou fluxo de suporte para exportação.
- **Gate de lançamento:** antes do lançamento público, revisar as obrigações de privacidade aplicáveis. Se houver exigência de acesso/portabilidade, definir um canal compatível sem presumir que a função foi dispensada.

### 11.30 Registro de IP por sessão — 24/10/2026

- **Decisão confirmada:** registrar o IP observado em cada sessão autenticada, seja no aplicativo web ou celular.
- **Limite técnico:** IP representa a conexão de rede; pode mudar sem troca de aparelho e pode ser compartilhado por vários aparelhos. Não o tratar como identificador físico do dispositivo ou localização precisa.
- **Privacidade:** IP é dado pessoal. Restringir acesso, não gravá-lo em logs de aplicação em texto claro e definir retenção e visibilidade na tela de sessões antes de implementar.
- **Escopo explícito:** esta decisão não autoriza GPS, fingerprinting ou coleta de user-agent para identificar aparelho.
- **Proxy do preview configurado:** a documentação oficial do Replit confirma o encaminhamento do IP do visitante em `X-Forwarded-For` no preview de desenvolvimento. O Vite extrai o último endereço válido do cabeçalho, remove `X-Forwarded-For` do pedido interno e sobrescreve qualquer `X-Seekalive-Client-IP` enviado pelo cliente com o valor extraído. A API só aceita esse cabeçalho interno se o endereço imediato da conexão for loopback, correspondente ao Vite local.
- **Confiança explícita:** Express permanece com `trust proxy = false`; a API não passa a confiar genericamente em cabeçalhos de proxy nem usa allowlist fixa de IPs de ingress. Chamadas diretas que tentem criar sessão por login ou confirmação de e-mail sem o proxy Vite confiável recebem `CLIENT_IP_UNAVAILABLE`.
- **Verificação realizada:** `typecheck` do back e front passou; oito testes de segurança passaram; o build do back iniciou pela workflow. No domínio de preview, dez pedidos com IPs falsos diferentes receberam `403` por ausência de CSRF e o 11º recebeu `429`, mostrando que os cabeçalhos falsos não criaram buckets independentes. Os logs da API não expõem o IP.
- **Limite do que foi feito:** esta alteração só fornece uma origem de IP validada ao backend e usa esse IP no limitador existente. Não grava IP na tabela de sessões, não cria desafio de autenticação por novo IP, não envia código e não altera schema ou dados.
- **Compatibilidade ainda pendente:** a proteção exige tráfego pelo Vite local. Antes de liberar cliente móvel ou acesso direto à API, configurar e testar uma fronteira confiável própria para esses caminhos; não os tratar como cobertos por esta configuração de preview.
- **Autenticação de nova sessão confirmada:** exigir código enviado ao e-mail verificado quando o IP observado da nova sessão for diferente do IP da sessão registrada imediatamente antes. Não interpretar a diferença como prova de outro aparelho ou local físico.
- **Fluxo de tela confirmado:** depois de usuário e senha válidos, mostrar: “Aviso: como está fazendo login em local diferente do habitual, precisamos identificar se é você mesmo!”; enviar automaticamente o código ao e-mail verificado e exibir a etapa de confirmação. Sem código correto, não criar a sessão nem liberar o acesso.
- **Tentativas confirmadas:** após o primeiro código incorreto, aguardar 30 segundos antes de solicitar/enviar outro código; após o segundo erro, aguardar 1 minuto e 30 segundos para a tentativa final. No terceiro erro, bloquear o acesso e exigir contato com o suporte por e-mail para reativação.
- **Risco de abuso:** o bloqueio após três erros pode ser usado para impedir o titular de entrar. A implementação deverá validar usuário e senha antes de iniciar o desafio, limitar envios e tentativas no servidor e impedir que chamadas sem autenticação reiniciem ou prolonguem o bloqueio, sem remover a regra de suporte escolhida.
- **Pendente:** definir validade do código e se o IP será exibido ao titular na lista de sessões; revisar a cópia “local diferente” para não afirmar localização física com base apenas em IP.
- **Contas reais legadas:** não há contas de usuários reais porque o aplicativo não foi lançado; não criar fluxo de migração ou primeiro acesso legado.
- **Referência inicial:** a primeira sessão autenticada após a verificação do e-mail registra o IP-base; novas sessões são comparadas com a sessão registrada imediatamente antes.
- **Pendente de privacidade:** definir retenção do IP e se ele será exibido ao titular na lista de sessões.
- **Estado técnico:** a captura do IP do preview até a API e o bloqueio seguro de rotas que criam sessão sem essa origem foram implementados e testados. Persistência por sessão e desafio de autenticação permanecem pendentes.
- **Teste de integração com banco:** não executado nesta revisão; faltava `SEEKALIVE_EXPECTED_DATABASE`, variável de segurança exigida para autorizar o schema temporário. Nenhum banco ou schema foi alterado.
- **Pendências de privacidade:** definir validade do código, retenção do IP e se ele aparece ao titular na lista de sessões antes de persistir o dado.

### Histórico do documento

| Versão | Data | Atualização |
|---|---|---|
| 1.1 | 2026-10-23 | Consolida os resultados da auditoria complementar, scanners e plano coordenado de remediação com dependências e critérios de aceite. |
| 1.2 | 2026-10-23 | Registra a execução do A01, as verificações aprovadas e a dependência ainda pendente da topologia real do proxy. |
| 1.3 | 2026-10-23 | Registra a validação A01, o teste HTTP contra falsificação de IP, os limites de autenticação e os achados atuais de dependências. |
| 1.4 | 2026-10-24 | Retira confiança explícita em proxy conforme decisão do usuário, registra Express em `trust proxy = false`, atualiza o teste e define A02 como próximo pacote. Atualiza o estado do Resend em desenvolvimento. |
| 1.5 | 2026-10-24 | Registra a execução parcial do A02, o fluxo de schema do PostgreSQL gerenciado, health checks, erros com request ID, encerramento gracioso, testes HTTP básicos e lacunas de integração autenticada. |
| 1.6 | 2026-10-24 | Registra a suíte de integração com schema isolado e a execução interrompida pelo marcador de produção, sem DDL ou mutações; identifica a necessidade de confirmar o ambiente antes da execução. |
| 1.7 | 2026-10-24 | Registra a correção da inicialização do schema padrão, a decisão de migrar para PostgreSQL externo e que o provisionamento ainda depende da conexão com o provedor. |
| 1.8 | 2026-10-24 | Registra a seleção explícita e segura de conexão externa no backend, sem alterar o destino Replit nem provisionar ou migrar banco externo. |
| 1.9 | 2026-10-24 | Registra os testes do seletor e a falha não destrutiva de `drizzle-kit check`; a migração externa segue sem validação. |
| 2.0 | 2026-10-24 | Consolida a validação integrada do frontend e backend, build, testes, smoke de API, lacunas de contratos e próximos passos. |
| 2.1 | 2026-10-24 | Reclassifica módulos ainda não iniciados como escopo futuro e organiza a próxima fase Social em etapas incrementais. |
| 2.2 | 2026-10-24 | Registra a primeira subetapa Social: contratos OpenAPI e geração tipada de perfil e relações, sem alterar runtime ou persistência. |
| 2.3 | 2026-10-24 | Corrige a identificação do ambiente para desenvolvimento, registra o teste autenticado em schema isolado, alinha Zod/Orval/resolvers e atualiza os riscos de dependências. |
| 2.4 | 2026-10-24 | Registra a Social 1B: busca de contas, integração de perfil e grafo social/privacidade, testes isolados, build e pendências residuais A05/A06. |
| 2.5 | 2026-10-24 | Fecha a corrida concorrente de follow/aprovação versus bloqueio com locks ordenados, acrescenta testes bilaterais de visibilidade e atualiza o próximo passo da Social 1B. |
| 2.6 | 2026-10-24 | Documenta o DTO privado owner-only, a hidratação do perfil comercial sem persistência local, a geração Orval e o plano para o endpoint real de descoberta do Seek. |
| 2.7 | 2026-10-24 | Corrige a sequência do plano: o trabalho permanece no Social até o módulo completo estar validado como pronto para produção; Seek/Shop ficam bloqueados até lá. |
| 2.8 | 2026-10-24 | Registra a auditoria preliminar de cadastro, idade, senha, sessões, onboarding e configurações; adiciona o gate de conta/segurança antes das páginas públicas e recursos sociais. |
| 2.9 | 2026-10-24 | Registra a decisão de idade mínima de 18 anos, validação no frontend/backend e schema, testes isolados e a pendência de revisão dos registros existentes antes de aplicar a restrição no banco principal. |
| 2.10 | 2026-10-24 | Registra a consulta agregada autorizada no banco de desenvolvimento (zero contas abaixo de 18), sem ler identificadores ou alterar dados, e mantém a migração principal pendente. |
| 2.11 | 2026-10-24 | Define e implementa a política de senha para contas novas e antigas, registra testes no schema isolado e deixa a migração do banco principal de desenvolvimento pendente de autorização por invalidar sessões existentes. |
| 2.12 | 2026-10-24 | Registra a autorização, aplicação e verificação da migração no banco principal de desenvolvimento; confirma zero contas, credenciais e sessões ativas, sem impacto em dados ou produção. |
| 2.13 | 2026-10-24 | Implementa recuperação de senha na interface e API; registra proteção anti-enumeração, HMAC, limites, revogação de sessões, testes isolados e pendências antes de produção. |
| 2.14 | 2026-10-24 | Implementa listagem e revogação de sessões na API e na tela Segurança; registra limites de privacidade, testes de autorização e ausência de reconhecimento de dispositivo habitual. |
| 2.15 | 2026-10-24 | Conecta a tela Conta à API com campos específicos para perfis pessoais/comerciais, atualiza contrato/docs, protege dados privados e registra testes em schema isolado. |
| 2.16 | 2026-10-24 | Mantém idade somente no servidor após o cadastro, remove idade de Configurações e de DTOs, e registra testes de retenção e não exposição. |
| 2.17 | 2026-10-24 | Integra a Fase 1 do prompt de bancos independentes: inventário do banco de desenvolvimento, ausência de PostGIS instalado e de provedor externo, riscos de consistência e plano por etapas sem DDL ou alteração de dados. |
| 2.18 | 2026-10-24 | Registra a matriz proposta de propriedade das tabelas por domínio, fluxos entre bancos, lacunas de Shop/Trust & Safety e decisões ainda necessárias; nenhuma alteração no banco. |
| 2.19 | 2026-10-24 | Registra a confirmação de Shop como décimo primeiro banco lógico, limitado ao catálogo, sem provisionar conexão ou migração. |
| 2.20 | 2026-10-24 | Registra Confiança e Segurança de Conteúdo como décimo segundo banco lógico para denúncias e moderação; logs gerais e implementação permanecem pendentes. |
| 2.21 | 2026-10-24 | Registra uma unidade física principal por conta comercial; áreas atendidas por prestadores e estrutura de marcas/redes seguem indefinidas. |
| 2.22 | 2026-10-24 | Confirma que Seek mostra apenas o endereço principal e exclui áreas de atendimento/`business_service_areas` do modelo aprovado. |
| 2.23 | 2026-10-24 | Confirma que o perfil pessoal publica somente `displayName`; nome e sobrenome do cadastro ficam privados. |
| 2.24 | 2026-10-24 | Registra a ausência de selo público na primeira versão; remove `isVerified` do DTO/OpenAPI e da interface pública, sem migração no banco ativo. |
| 2.25 | 2026-10-24 | Define reserva do @ anterior por 30 dias e registra a implementação de retenção como pendência antes de páginas públicas. |
| 2.26 | 2026-10-24 | Define que a reserva do @ antigo vale para todos, exige aviso prévio e bloqueia a primeira alteração por 30 dias; o intervalo entre trocas futuras segue pendente. |
| 2.27 | 2026-10-24 | Confirma 30 dias desde o registro para a primeira troca e 30 dias desde a última troca para as seguintes; mantém o @ anterior indisponível para todos por 30 dias. |
| 2.28 | 2026-10-24 | Define que a troca de e-mail só entra em vigor após confirmar o novo endereço, mantendo o atual ativo até lá. |
| 2.29 | 2026-10-24 | Exige senha atual e código no e-mail atual para trocar e-mail ou senha; a troca de endereço também exige verificar o novo e-mail. |
| 2.30 | 2026-10-24 | Define que a troca de e-mail bem-sucedida gera aviso de segurança ao endereço antigo. |
| 2.31 | 2026-10-24 | Define recuperação manual com verificação adicional e entrega ao e-mail de suporte e ao futuro Painel de Controle, sem editar o Painel nesta etapa. |
| 2.32 | 2026-10-24 | Deixa o método de verificação adicional fora do escopo atual e proíbe coleta de documentos nesta etapa. |
| 2.33 | 2026-10-24 | Define solicitação de exclusão permanente nas Configurações, mantendo prazo, cancelamento e retenção para decisão. |
| 2.34 | 2026-10-24 | Define execução da exclusão permanente 7 dias após a solicitação; cancelamento e retenção seguem pendentes. |
| 2.35 | 2026-10-24 | Permite cancelar a solicitação de exclusão até o último dia do prazo de 7 dias. |
| 2.36 | 2026-10-24 | Oculta e desativa a conta imediatamente após a solicitação, preservando dados durante os 7 dias para possibilitar restauração. |
| 2.37 | 2026-10-24 | Define prompt de restauração no login, após validar credenciais, exibindo o prazo restante e mantendo a exclusão se o titular recusar. |
| 2.38 | 2026-10-24 | Exige senha e código enviado ao e-mail verificado para restaurar a conta durante o prazo de exclusão. |
| 2.39 | 2026-10-24 | Define a remoção de publicações, mídias e comentários quando a exclusão permanente for concluída. |
| 2.40 | 2026-10-24 | Mantém mensagens diretas para os destinatários e anonimiza o remetente após a exclusão permanente. |
| 2.41 | 2026-10-24 | Remove seguidores, contas seguidas, pedidos pendentes e Círculo na exclusão definitiva, preservando-os durante o prazo de restauração. |
| 2.42 | 2026-10-24 | Remove curtidas e repostagens da conta e atualiza as contagens quando a exclusão permanente ocorrer. |
| 2.43 | 2026-10-24 | Apaga a coleção de itens salvos quando a exclusão permanente ocorrer, preservando-a durante o prazo de restauração. |
| 2.44 | 2026-10-24 | Exige senha atual e código no e-mail verificado antes de agendar a exclusão permanente. |
| 2.45 | 2026-10-24 | Não envia e-mail adicional após agendar a exclusão; mantém somente o e-mail de código para autorizar o pedido. |
| 2.46 | 2026-10-24 | Retém apenas o mínimo exigido por obrigação aplicável, com acesso restrito e prazo definido; categorias e prazos dependem de revisão. |
| 2.47 | 2026-10-24 | Não oferece exportação de dados na primeira versão e exige verificar obrigações de privacidade antes do lançamento. |
| 2.48 | 2026-10-24 | Registra IP por sessão como requisito; documenta limites de precisão, privacidade e dependência de proxy confiável sem alterar sua configuração. |
| 2.49 | 2026-10-24 | Exige código de login por e-mail quando o IP da nova sessão difere do IP da sessão anterior; deixa pendente o primeiro acesso sem IP registrado. |
| 2.50 | 2026-10-24 | Registra que o app não foi lançado nem possui contas reais legadas; a primeira sessão verificada estabelece a referência inicial do IP. |
| 2.51 | 2026-10-24 | Define o desafio de login por IP diferente, aviso em tela, envio automático do código, esperas de 30 s e 90 s e bloqueio após três erros. |
| 2.52 | 2026-10-24 | Configura o encaminhamento validado do IP no preview via Vite, mantém `trust proxy = false`, exige IP confiável para criar sessão e registra testes, limites e pendências de persistência. |
