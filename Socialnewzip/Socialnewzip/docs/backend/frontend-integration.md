# Inventário de telas, rotas e pontos de integração

Todos os caminhos de código abaixo são relativos a `artifacts/social/src`, salvo indicação contrária. Rotas da UI são links relativos do aplicativo, **não endpoints de API**.

## 1. Rotas auditadas

| Rotas da interface | Código / comportamento atual | Integração necessária |
|---|---|---|
| `/`, `/login`, `/register` | `App.tsx`, `Login`, `Register`, `AppContext`; login demonstrativo | Sessão real, cadastro único, identidade, termos, username, retorno de autenticação |
| `/forgot-password`, `/verify-email` | Sucesso local/código de demonstração | Fluxo real do provedor, rate limit, desafio com expiração e estados de erro |
| `/onboarding/interests`, `/onboarding/suggestions` | Preferências/sugestões locais; conclusão no-op | Catálogo de interesses, escolhas da conta, recomendações autorizadas e conclusão persistida |
| `/feed` | Feed local: para você, seguindo, artigos, vídeos | `GET social/feed`, paginação, audiência, bloqueios, contadores e cache por visitante |
| `/compose`, `/article/create` | `contentService` demo + mídias blob | Upload, criação transacional, validação, idempotência e publicação com referência |
| `/post/:postId`, `/article/:postId` | Leitura e interação locais | Leitura autorizada, comentários/respostas, curtidas, reposts, remoção e edição proposta |
| `/search` | Pessoas/publicações/tags e tendências locais | Busca paginada, índices, permissões e tendências calculadas |
| `/profile`, `/profile/:username` | Perfil pessoal/comercial com posts/mídias/artigos | DTO de conta + relações do visitante + conteúdo autorizado + galeria derivada |
| `/profile/edit` | Atualiza conta local e SocialContext | PATCH de conta, extensão comercial, mídia, município, horários, recursos, versão |
| `/profile/:username/followers`, `/profile/:username/following` | Listas locais | Listas paginadas e permissões para perfis privados |
| `/profile/:username/circles`, `/circles` | Listas de amizades/convites; estado parcialmente separado | Uma fonte canônica de relações; respeitar username da rota e política de lista pública |
| `/social/activity` | Histórico, salvos, curtidas, comentários e publicações | Consultas do ator autenticado; limpar histórico sem apagar conteúdo original |
| `/social/suggestions` | Sugestões locais | Recomendações com exclusão de bloqueados, já seguidos e perfis não acessíveis |
| `/notifications` | Eventos e leitura locais | Destinatário no servidor, paginação, marcar lida, preferências e entrega |
| `/messages`, `/messages/:conversationId` | Conversas/mensagens locais | Participação, criação de conversa, texto, leitura monotônica, deduplicação e stream |
| `/seek` | Localização, categorias, filtros, carrosséis, salvos e mocks | Descoberta por contas comerciais, busca, cidades, avaliações e eventos reais |
| `/seek/event/:id` | Detalhe de demonstração; ingresso desabilitado | Evento real com organizador, interesse persistente, estado; ingressos são extensão |
| `/shop`, `/shop/item/:id` | Catálogo ilustrativo, detalhe, favoritos; compra desabilitada | Catálogo real ligado ao vendedor, preço numérico, salvos; checkout fora do núcleo |
| `/settings`, `/settings/account` | Username local; ações sensíveis desabilitadas | Preferências, identidade, reautenticação, exportação/desativação/exclusão |
| `/settings/privacy`, `/settings/blocked` | Controles principalmente desabilitados | Política efetiva, bloqueios/mutes e permissões de contato/relacionamento |
| `/settings/notifications` | Defaults visuais desabilitados | Preferências reais e consentimento para push/e-mail |
| `/settings/security` | Sessões/MFA/histórico indisponíveis | Sessões revogáveis, ações no provedor e auditoria de acesso redigida |
| `/settings/appearance` | Escuro; tamanho 16/18/20 local | Persistir preferências não sensíveis; aparência não deve depender de chamada a cada render |
| `/styleguide`, página inexistente | Apoio visual e fallback | Nenhum CRUD de domínio; preservar 404 da interface sem mascarar 404 da API |

O estado “autenticado” do router é apenas UI. Todas as regras precisam existir no servidor, mesmo que a tela esteja atrás de uma rota protegida no React.

## 2. Arquivos que precisam trocar de fonte

| Arquivo | Alteração de integração, quando autorizada |
|---|---|
| `context/AppContext.tsx` | Consultar sessão, retirar login automático/mock, expiração e logout autoritativos |
| `context/SocialContext.tsx` | Substituir fixtures/reducer como verdade por cache de API e mutações reconciliadas |
| `services/contentService.ts` | Migrar payload de mídia/autor; ativar REST somente após teste real; não fallback para demo em erro |
| `services/restContracts.ts` | Completar operações, erros, paginação e validações; manter formatos existentes documentados |
| `services/contentValidation.ts` | Compartilhar regras com servidor sem confundir validação de UI com segurança |
| `services/mediaService.ts`, `hooks/use-draft-media.ts` | Upload real, estado de processamento, progresso/cancelamento; blob somente para preview temporário |
| `services/referenceResolver.ts`, `lib/contentLinks.ts` | Resolver no servidor respeitando audiência e destino original, incluindo `event:` |
| `lib/postMedia.ts` | Galeria derivada de publicações e mídias autorizadas; não expor ativo oculto por outro caminho |
| `data/accountStorage.ts`, `data/reviewStorage.ts` | Retirar como persistência principal; importação, se houver, explícita e validada |
| `hooks/useSeekDiscovery.ts`, `lib/seekDiscovery.ts` | Consultar API por filtros/cidade; separar estado de UI dos dados; preservar retorno e scroll |
| `services/seekLocationService.ts` | Manter seleção manual e GPS consentido; adaptar catálogo à API/cache; geocodificação só após configuração |
| `hooks/use-saved-shop-items.ts`, salvos comerciais | API única de salvos tipados, compartilhada entre perfil e módulos |
| `data/mockData.ts`, `demoCatalog.ts`, `demoSeek*.ts`, `demoIntegrationPosts.ts` | Fixtures exclusivamente de testes/preview; não seeds automáticos de produção |
| `components/profile/CommercialProfilePage.tsx` | Dados da mesma conta comercial, avaliações e resposta; nenhuma identidade comercial paralela |
| `lib/api-spec/openapi.yaml` (raiz do projeto) | Evoluir contrato vigente após aprovação; preservar título `Api` exigido pelo código gerado |
| `lib/api-client-react`, `lib/api-zod` | Regenerar a partir do contrato aprovado, não editar artefatos gerados manualmente |
| `lib/db/src/schema` | Implementar Drizzle a partir do modelo revisado; criar migrações versionadas |
| `artifacts/api-server/src/app.ts` | Ordem de middleware, autenticação, CSRF, limites, routers, erros e logs seguros |

### Atenção aos contratos atuais

O adaptador existente não envia CSRF nem `Idempotency-Key` e não trata `412`, `413`, `415`, `429` de forma específica. Acrescentar essas respostas à experiência de erro. Consultas devem suportar cancelamento, e um resultado antigo não deve sobrescrever a cidade/filtro novo.

`AppContext`, `SocialContext` e página de Círculos hoje podem representar estados distintos. A API deve ser a fonte única; a mudança de username precisa atualizar todos os caches, links, sessão e busca. “Atualização otimista” exige rollback em erro, não apenas toast de sucesso.

## 3. Persistência atual e destino

| Origem atual | Chave / conteúdo | Destino |
|---|---|---|
| localStorage | `seekalive-social-accounts`, `seekalive-active-account` | Conta e sessão reais; nunca importar identidade/ownership sem autenticação |
| localStorage | `seekalive-social-reviews` | Avaliações validadas por sessão; não importar avaliações de outras pessoas |
| localStorage | `seekalive-saved-shop-items`, `seekalive-saved-businesses` | `saved_resources`, somente IDs reais e legíveis |
| sessionStorage | `seekalive-seek-saved-events` | Salvos de evento reais, ou manter local quando for apenas demonstração |
| sessionStorage | `seekalive-seek-filters`, `seekalive-seek-scroll` | Pode continuar como estado de navegação local; não precisa virar tabela |
| sessionStorage | `seekalive-seek-recent-cities` | Preferência manual local; sincronização entre dispositivos opcional/consentida |
| sessionStorage | `seekalive-seek-demo-preview` | Somente desenvolvimento; nunca configura catálogo de produção |
| Memória React | Posts, comentários, reposts, relações, notificações e mensagens | Tabelas e cache de API; fixtures não são dados migráveis automaticamente |
| `blob:` | Fotos/vídeos de rascunho/publicação | Upload de arquivos reais e vínculos de mídia; URL blob não pode ser “migrada” pelo servidor |

Não transformar tudo em tabela: scroll, modal aberto, termo parcialmente digitado e seleção temporária são estados de UI. O servidor deve persistir escolhas de produto, conteúdo e relações, não cada renderização.

## 4. Exemplos de integração

### Publicação

```http
POST /api/v1/social/posts
Content-Type: application/json
X-CSRF-Token: <token-da-sessao>
Idempotency-Key: <uuid-da-tentativa>

{
  "format": "media",
  "content": "Um registro do encontro.",
  "audience": "public",
  "mediaIds": ["00000000-0000-4000-8000-000000000010"],
  "reference": {"type":"seek_entity","id":"00000000-0000-4000-8000-000000000011"}
}
```

O servidor preenche autor, datas, contadores, menções e hashtags, valida os arquivos e a referência. A resposta continua no formato `Post` esperado pelo cliente.

### Busca de serviço em município

```http
GET /api/v1/seek/discover?q=pedreiro&kind=provider&cityId=3550308&minRating=4&sort=rating&limit=20
```

Mapeamento do filtro atual: `query→q`, `tab=providers→kind=provider`, `minimumRating→minRating`; `list` e `scroll` não são filtros de servidor. `onlyOpen` atual é situação declarada: mapear para `open=declared`, não “aberto agora” sem horários estruturados.

### Referência a evento legado

```http
GET /api/v1/references/seek_entity/event%3A00000000-0000-4000-8000-000000000012
```

O adaptador mantém `encodeURIComponent`. O servidor valida o prefixo, resolve evento e retorna `/seek/event/<id>`, sem transformar o evento em conta.

### Avaliação

```http
PUT /api/v1/seek/businesses/00000000-0000-4000-8000-000000000011/reviews/me
Content-Type: application/json
X-CSRF-Token: <token-da-sessao>

{"rating":5,"comment":"Atendimento cuidadoso e serviço bem explicado."}
```

O autor vem da sessão. Atualização substitui a avaliação da mesma pessoa, sem duplicar contagens; resposta comercial é um recurso separado.

## 5. Matriz resumida de permissão

| Recurso | Visitante autorizado a ler | Quem altera |
|---|---|---|
| Perfil público | Público conforme política de exposição | Dono; moderação auditada para suspensão |
| Conta privada | Dono/seguidores aceitos conforme campo | Dono; sem exposição de e-mail/sessões |
| Publicação/artigo | Audiência + privacidade + bloqueio | Autor |
| Comentário | Leitor autorizado do post | Autor; moderação com motivo |
| Galeria/arquivo | Mesma audiência da origem | Dono do ativo e vínculos autorizados |
| Avaliação comercial | Política pública/moderação do negócio | Avaliador; resposta somente dono do negócio |
| Evento/item Shop | Publicado e organizador/vendedor acessível | Dono da conta comercial |
| Conversa/mensagem | Participantes autorizados | Remetente para envio; participante para seu cursor de leitura |
| Notificação/salvo/preferência | Apenas destinatário/dono | Apenas destinatário/dono |
| Relatório de abuso | Denunciante vê seu protocolo; moderador vê fila | Equipe autorizada, com auditoria |
| Exportação/exclusão | Próprio titular reautenticado | Worker autorizado, com trilha e estados |
