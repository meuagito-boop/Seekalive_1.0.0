# Auditoria de prontidão do frontend — Seekalive

**Data:** 22/10/2026  
**Escopo:** preparação do frontend para uma futura integração com backend. Esta auditoria é análise/documentação; não cria endpoints, banco, autenticação ou armazenamento remoto.

## Parecer

**O frontend ainda não está pronto para receber o backend em produção.** Há componentes úteis — rotas, validações de interface, regras locais, telas de estados vazios/indisponíveis, modelos de domínio e contratos REST propostos — mas a aplicação continua sendo um protótipo local. A interface não consome os endpoints `/api/v1` documentados, não tem autenticação real, não envia mídia e mantém estado de demonstração/local no navegador; as fixtures pré-carregadas agora ficam apenas no desenvolvimento.

O backend pode ser iniciado depois de fechar as decisões e lacunas listadas aqui. Conectar o servidor agora faria a interface aparentar sucesso com dados locais, perder conteúdo após recarga e aplicar permissões somente no navegador.

## Como a análise foi feita

- Inventário das rotas e dos módulos de produto em `artifacts/social/src` (159 arquivos de origem, sendo 158 TypeScript/TSX), incluindo pontos de entrada, contextos, serviços, persistência local, telas de conta, perfis, Social, Seek, Shop e configurações.
- Leitura focalizada das regras de negócio e fluxos de maior risco; busca estática por chamadas de rede, armazenamento, fixtures, controles desabilitados e contratos.
- Conferência do esqueleto API em `artifacts/api-server`, dos contratos OpenAPI/SQL propostos e dos testes disponíveis.
- A leitura não inclui dependências, bundles, arquivos gerados ou primitivas genéricas de UI como uma auditoria de segurança de cada byte. O resultado é uma revisão funcional/de integração do código próprio, não uma certificação de segurança ou revisão de produção.

## Resultado por área

| Área | Estado atual | Prontidão |
|---|---|---|
| Rotas e navegação | Páginas para cadastro, login, onboarding, Social, perfis, Seek, Shop e configurações; proteção de rota apenas no cliente | Parcial |
| Identidade e sessão | Login/cadastro continuam demonstrativos. Direção escolhida: autenticação própria na API quando começar o backend; recuperação e verificação reais também ficam para essa fase | Adiado por decisão até o backend |
| Contas e perfis | Dados guardados em `localStorage`; edição local. Contextos de conta e Social podem divergir | Bloqueador |
| Publicações e comentários | `SocialContext` com reducer; `contentService` usa `demoContentAdapter`; adaptador REST não está ativo | Bloqueador |
| Fotos e vídeos | Prévia usa URL `blob:` do navegador; não há upload, ID de mídia ou persistência remota | Bloqueador |
| Galeria | Fotos/vídeos de publicações alimentam a galeria. O perfil comercial também combina fotos/vídeos independentes do objeto comercial; precisa de uma regra única sem duplicar arquivos nem contornar audiência | Parcial |
| Relacionamentos e Círculo | O frontend calcula Círculo pelo seguimento recíproco; “deixar de seguir” remove a associação derivada | Regra alinhada; sem API |
| Privacidade e bloqueio | Pedidos de seguimento, bloqueios por conta e desbloqueio funcionam apenas no navegador; a autorização do servidor ainda não existe | Bloqueador para backend |
| Mensagens e notificações | Conteúdo local/demonstrativo; leituras e preferências ficam separadas por conta neste navegador. Não há API, entrega ou sincronização entre aparelhos | Bloqueador |
| Seek | Negócios derivados de contas comerciais; cidade baseada no catálogo IBGE; filtros e salvos separados por conta no navegador. Não há busca/avaliações/eventos reais no servidor | Parcial |
| Avaliações | Registros locais; interface exige nota 1–5, comentário de 10–500 caracteres e resposta de 3–500 | Parcial |
| Shop | Catálogo ilustrativo e itens salvos separados por conta no navegador; checkout é explicitamente indisponível | Parcial por escopo |
| Configurações | Preferências de privacidade, notificações e aparência separadas por conta no navegador; recursos de segurança e ações sensíveis explicitamente indisponíveis | Parcial |

## Bloqueios e falhas concretas

### P0 — Autenticação e identidade inexistentes

- `pages/Register.tsx` valida e cria um perfil local, usa ID baseado no nome de usuário e grava dados de conta no navegador. A senha não é armazenada — isso é correto para o protótipo, mas significa que não existe credencial utilizável no backend.
- `pages/Login.tsx` não envia usuário/e-mail e senha para um serviço; a tela apresenta o fluxo como não conectado. Após sair, a conta local não pode ser autenticada novamente pelo login.
- `ForgotPassword.tsx` e `VerifyEmail.tsx` não enviam nem validam códigos reais.
- `AppContext` considera ativa a conta carregada do `localStorage`; isso não equivale a sessão autenticada. A proteção de rotas não substitui autorização no servidor.
- O cadastro comercial e pessoal deve resultar na mesma identidade Social, com extensão comercial somente para contas comerciais. Isso está descrito como regra, mas ainda é cadastro no navegador.

**Decisão registrada:** a autenticação será própria pela API; não integrar Clerk/OIDC agora. O login e cadastro demonstrativos permanecem até a fase de backend. Antes de implementar essa fase, definir os endpoints de registro/login, armazenamento seguro de credenciais, sessão, verificação e recuperação; nunca tratar `localStorage` como identidade ou autorização.

**Atenção documental:** `openapi.json` e `schema-core.sql` ainda contêm rascunhos OIDC. Estão marcados como não selecionados e precisam ser substituídos/revistos antes de qualquer implementação ou migração.

### P0 — Nenhum caminho frontend → API está ligado

- `artifacts/api-server/src` confirma apenas `GET /api/healthz`; não há handlers de identidade, conteúdo, mídia, Seek, avaliações, Shop, mensagens ou notificações.
- O frontend não usa os endpoints `/api/v1` propostos. `services/contentService.ts` exporta `demoContentAdapter`; `services/restContracts.ts` é apenas um contrato/adaptador parcial.
- A chamada remota encontrada no frontend é para o catálogo público do IBGE, não para a API Seekalive.
- O fluxo da API usa processos/servidores separados; a configuração de same-origin/proxy e CORS precisa ser conferida antes de conectar o navegador. A implementação atual não oferece autenticação, autorização ou CSRF.

**Antes de integrar:** escolher um cliente/base URL, conectar cada módulo por etapas, configurar roteamento/CORS e CSRF, mapear erros/paginação e garantir que falha de rede nunca faça fallback silencioso para fixtures.

### Resolvido — Fixtures de exemplo aparecem somente no desenvolvimento

- Posts, usuários seed, notificações, conversas, mensagens, avaliações, tendências e tópicos ficam restritos ao modo de desenvolvimento. A tela inicial pode manter o perfil fictício apenas dentro de uma imagem estática ilustrativa, sem registro ou interação.
- A página Social, o Shop, as referências a produtos/eventos e os painéis laterais não exibem esses fixtures no build de produção. Sem API conectada, mostram estados vazios em vez de registros inventados. O único exemplo permitido fora do dev é uma imagem estática de apresentação.
- Os mocks continuam disponíveis no preview de desenvolvimento para revisão visual. O conteúdo escrito pelo usuário no navegador continua local e não passa a ser dado compartilhado/real.

**Frontend concluído para esta regra:** fixtures do produto só aparecem no desenvolvimento; produção não usa sementes fictícias. Antes de publicar com dados reais, conectar os estados vazios aos endpoints e testar o build de produção.

### Estado relativo ao usuário — isolamento local concluído; integração com backend pendente

- Curtidas, curtidas em comentários, repostagens, publicações salvas e leituras de notificações/mensagens agora ficam registradas por ID da conta no navegador. Contagens compartilhadas são derivadas das ações locais de cada conta.
- Notificações com destinatário só aparecem para essa conta; notificações de demonstração sem destinatário aparecem apenas na conta demo. A leitura automática após três segundos continua sendo uma regra de interface, mas agora é gravada para a conta ativa.
- Preferências de notificação/aparência, filtros e cidade recente do Seek, estabelecimentos/eventos salvos e itens salvos do Shop usam escopo por conta. As preferências de privacidade e interesses já eram associadas à conta.
- Bloqueios agora são relações locais da conta ativa para um perfil alvo; os filtros do app ocultam os perfis e interações nos dois sentidos. Só quem iniciou o bloqueio pode removê-lo; a opção está em Configurações > Usuários bloqueados ou na página bloqueada do perfil. Seguimentos existentes são mantidos.
- Relações, solicitações, publicações, comentários e avaliações continuam como conteúdo compartilhado local e identificado por autor/destinatário; não são preferências do visitante. Isso não substitui autorização no servidor.
- Chaves globais antigas não são apagadas nem migradas automaticamente: não há como saber a qual conta os valores compartilhados pertenciam. Os novos escopos começam vazios, preservando os valores legados no navegador.
- Em `onboarding/Suggestions.tsx`, cada toque em “Seguir” aplica a relação imediatamente: contas públicas são atualizadas no armazenamento local da conta ativa; perfis privados criam uma solicitação pendente, também local. “Concluir e entrar” e “Pular por agora” apenas navegam; não há lote de escolhas a salvar nessa etapa. Não exige API nesta fase.
- Corrigido: alterar o nome de usuário em `settings/Account.tsx` agora atualiza o `AppContext` e o `SocialContext`, mantendo a conta persistida e o perfil/busca alinhados.

**Antes de integrar:** o servidor ainda precisa associar cada ação ao usuário autenticado e devolver projeções do visitante. O isolamento atual é apenas uma separação de interface no navegador; não é autorização nem proteção contra alteração do `localStorage`.

### P1 — Privacidade e segurança só existem parcialmente no frontend

- `canReadPost` e filtros de tela são úteis para UX, mas não protegem dados. Feed, busca, perfil, comentário, notificações, mensagens, referência e arquivo precisam da mesma autorização no servidor.
- Em perfil público, seguir é imediato. Em perfil privado, o frontend cria solicitação pendente; o dono pode aceitar ou recusar em Configurações > Privacidade. O pedido pendente não conta como seguidor. Isso ainda é estado local, sem API/autorização de servidor.
- Após a aprovação, o seguidor vê publicações com audiência pública do perfil privado. Publicações destinadas ao Círculo continuam exigindo seguimento aceito nos dois sentidos. A regra de Círculo permanece derivada: A segue B e B segue A; a remoção de qualquer seguimento encerra o Círculo.
- O bloqueio bilateral existe apenas no frontend/localStorage. O backend ainda deve impor a mesma regra de acesso e interação em todas as rotas, conversas, feed, busca, seguimento e solicitações.
- As opções para receber mensagens e confirmações de leitura são preferências locais; precisam ser verificadas em cada envio/leitura no backend.

**Frontend concluído para esta regra:** estados de solicitação, cancelamento, aprovação/recusa, acesso a publicações aprovadas e separação do Círculo. O backend ainda precisa aplicar a mesma regra em cada rota e arquivo privado.

### P1 — Mídias não são uploads e a galeria tem duas fontes

- `mediaService.ts` e `use-draft-media.ts` criam URLs locais para prévia. URLs `blob:` deixam de existir após recarga e não são IDs que o backend possa anexar a um post.
- A publicação precisa enviar IDs de uploads prontos, pertencentes ao autor e validados pelo servidor; tipo MIME declarado pelo navegador não é prova do formato do arquivo.
- A galeria derivada das publicações respeita audiência, mas `CommercialProfilePage` também reúne `commercialProfile.photos/videos`. O contrato precisa definir se essas mídias são publicações importadas/vinculadas ou ativos de perfil separados. Não duplicar arquivo nem expor conteúdo privado via galeria.

### P1 — O contrato documental tinha divergências de regra

Corrigido neste pacote:

- Círculo deixou de ter convites, estados pendentes e tabela própria; a listagem retorna apenas seguimentos recíprocos efetivos.
- Avaliação agora exige nota inteira de 1–5, comentário entre 10–500 caracteres e resposta entre 3–500, alinhados à UI.
- Opções de serviço comerciais distinguem oferecido (`true`), não oferecido (`false`) e não informado (`null`/ausente). Só `true` pode aparecer no perfil público.

Ainda é necessário validar esses contratos com testes de integração quando a API existir.

### P2 — Controles/telas que não completam a ação esperada

- O botão “nova mensagem” em `Messages.tsx` não tem ação associada.
- Envio de imagem e emoji em mensagens está explicitamente desabilitado.
- Recuperação, verificação, histórico de visualização, ordenação/categoria de lojas, raio/distância e compra são ausentes ou indisponíveis. Isso não deve ser documentado como backend pronto.
- `Seek` trabalha com pesquisa/filtros locais; o filtro de raio está desabilitado e “aberto agora” não é disponibilidade verificada em tempo real.

## Regras de produto que o backend deve respeitar

1. Uma pessoa escolhe conta pessoal ou comercial no cadastro. Conta comercial é a mesma conta Social e é a fonte dos perfis que podem aparecer no Seek.
2. Só contas comerciais elegíveis e públicas podem aparecer como comércio/prestador no Seek. Perfil pessoal não vira estabelecimento; endereço residencial de prestador não deve ser exposto como endereço comercial sem decisão explícita.
3. Círculo é uma projeção: dois seguimentos aceitos em sentidos opostos. Não criar convites, pedidos, tabela, endpoint de entrada/saída ou notificação própria de Círculo. Deixar de seguir em qualquer direção remove a condição.
4. Serviços de comércio aparecem apenas quando declarados como oferecidos. Não informado e não oferecido não podem ser mostrados como serviço disponível.
5. Fotos e vídeos publicados alimentam automaticamente a galeria da mesma conta, sempre respeitando a audiência do post; não tornar privada uma mídia só porque está na galeria.
6. Avaliação não pode ser feita pelo próprio comércio; uma conta pode avaliar o mesmo comércio uma vez; nota é obrigatória de 1 a 5; responsável comercial pode responder sem apagar crítica de cliente.
7. O GPS é opt-in; a seleção manual de cidade continua disponível. Distância só deve ser exibida com origem de localização e coordenadas verificadas, sem estimativa inventada.
8. Seek e Shop não podem afirmar reserva, agendamento confirmado, entrega, ingresso, compra ou pagamento que o produto ainda não implementa.
9. Shuffle e Comunidades não fazem parte do escopo atual.

## Mapa de módulos e fontes atuais

| Módulo | Rotas/páginas | Fontes atuais |
|---|---|---|
| Acesso e cadastro | `/`, `/login`, `/register`, `/forgot-password`, `/verify-email` | `AppContext`, `accountStorage`, validação local |
| Onboarding | `/onboarding/interests`, `/onboarding/suggestions` | preferências locais e sugestões mock |
| Social | `/feed`, `/search`, `/post/:id`, `/article/:id`, `/compose`, `/article/create`, `/social/activity`, `/social/suggestions` | `SocialContext`, fixtures restritas ao desenvolvimento, reducer; `contentService` demo |
| Perfis e relações | `/profile`, `/profile/:username`, `/profile/edit`, seguidores/seguindo, `/circles` | conta local, `SocialContext`, relações derivadas |
| Seek | `/seek`, `/seek/event/:id` | dados locais, catálogo IBGE, preferências de busca; eventos de exemplo |
| Shop | `/shop`, `/shop/item/:id` | catálogo ilustrativo restrito ao desenvolvimento; salvos em localStorage |
| Comunicação | `/messages`, `/messages/:conversationId`, `/notifications` | objetos em memória/contexto; sem entrega externa |
| Configurações | `/settings/*` | preferências locais e controles ainda indisponíveis |

## Testes e verificações

Na auditoria e nesta correção:

- `pnpm test:social`: **40 testes aprovados** incluindo isolamento/persistência local de ações sociais, seguimentos e bloqueios bilaterais por conta, desbloqueio ativo, sincronização de nome de usuário entre conta e Social, além de regras de conteúdo, privacidade, validação, referências e erros do adaptador.
- `pnpm --filter @workspace/social run typecheck`: aprovado.
- `pnpm --filter @workspace/social run build`: aprovado nesta revisão; apresentou avisos não bloqueantes de sourcemap e tamanho de bundle.

Esses resultados comprovam compilação e um conjunto limitado de regras, não a prontidão do backend. Não há testes de navegador ponta a ponta, integração HTTP com sessão, banco, CSRF, uploads, troca entre contas, fluxo de seguir mútuo, telas de aprovação privada, notificações por destinatário ou persistência entre dispositivos.

## Ordem recomendada para fechar a prontidão

1. **Concluído no frontend/documentação:** perfis privados exigem aprovação do dono; seguidores aprovados veem publicações públicas; Círculo continua exigindo seguimento mútuo. Implementar a mesma regra no backend.
2. **Direção escolhida; implementação adiada:** autenticação própria na API. Definir contrato de registro/login, credenciais, verificação, recuperação e sessão no início da fase de backend.
3. **Concluído no frontend:** fixtures de exemplo ficam no desenvolvimento; curtidas, repostagens, salvos, leituras, filtros e preferências locais são separados por conta. Não migrar automaticamente os valores das chaves antigas sem identificar seu dono.
4. Aprovar um contrato OpenAPI que corresponda às telas atuais e definir uma API de mesma origem, erros, paginação, CSRF e sessão.
5. Implementar upload de mídia com ownership/validação e migrar a galeria para IDs de mídia autorizados.
6. Integrar gradualmente cadastro/perfil, Social, avaliações/Seek, mensagens/notificações e Shop; somente ligar telas depois de haver endpoints e estados loading/erro/vazio.
7. Criar testes de API e navegador que cubram autorização entre contas, privacidade, Círculo, publicação/galeria, avaliações, mensagens e ações de configuração.

**Estado final desta auditoria:** documentação atualizada; nenhum endpoint novo, banco ou serviço foi implementado.
