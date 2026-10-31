# Auditoria de prontidão do frontend — Seekalive

**Auditoria-base:** 22/10/2026; última atualização de estado: 31/10/2026
**Escopo:** prontidão do frontend para integração gradual. A auditoria original foi análise/documentação; desde então, autenticação, onboarding, perfil básico, privacidade e relações sociais essenciais receberam API e schema no desenvolvimento.

> Os achados detalhados abaixo preservam o corte da auditoria-base de 22–23/10, incluindo estados que já foram alterados depois. Para o estado mais recente de avaliações, consulte `implementation-and-tests.md` e `auditoria/plano-de-acao-tecnico.md`.

## Parecer

**Escopo desta auditoria:** ambiente de desenvolvimento. Login/sessão/onboarding consultam a API. Configurações > Conta diferencia conta pessoal e comercial e lê/salva por `/v1/accounts/me` em sessão real; Privacidade e Segurança também usam APIs no fluxo autenticado. A tela Segurança lista e revoga instalações confiáveis por token de navegador/app. O envio Resend foi testado, mas a jornada completa ainda precisa de E2E. O perfil comercial consome operações de avaliações de Profiles. O estado físico do banco deve ser confirmado pela query de catálogo. Seek discovery remoto e os domínios de mensagens/notificações continuam sem implementação completa; fixtures pertencem ao desenvolvimento.

O backend foi iniciado. O próximo trabalho de frontend é consumir somente os endpoints ativos e manter a demonstração de desenvolvimento separada da conta real; não conectar telas a contratos que ainda estejam marcados como propostos.

## Como a análise foi feita

- Inventário das rotas e dos módulos de produto em `Aplicativo/front/src` (159 arquivos de origem, sendo 158 TypeScript/TSX), incluindo pontos de entrada, contextos, serviços, persistência local, telas de conta, perfis, Social, Seek, Shop e configurações.
- Leitura focalizada das regras de negócio e fluxos de maior risco; busca estática por chamadas de rede, armazenamento, fixtures, controles desabilitados e contratos.
- Conferência da API em `Aplicativo/back`, dos contratos OpenAPI/SQL propostos e dos testes disponíveis.
- A leitura não inclui dependências, bundles, arquivos gerados ou primitivas genéricas de UI como uma auditoria de segurança de cada byte. O resultado é uma revisão funcional/de integração do código próprio, não uma certificação de segurança ou revisão de produção.

## Resultado por área

| Área                           | Estado atual                                                                                                                                                                                                                                                                                                                                                                                                          | Prontidão                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Rotas e navegação              | Páginas para cadastro, login, onboarding, Social, perfis, Seek, Shop e configurações; guard do cliente complementa a autorização independente da API                                                                                                                                                                                                                                                                  | Parcial                                                                                                      |
| Identidade e sessão            | Login, cadastro, sessão, CSRF, confirmação de e-mail, onboarding, recuperação, troca de senha, sessões e instalações confiáveis chamam a API                                                                                                                                                                                                                                                                          | Falta E2E no navegador; consulte a query de catálogo para o estado físico atual                                    |
| Contas e perfis                | Configurações > Conta usa `/v1/accounts/me` em sessões reais, com campos pessoais/comerciais separados; idade é coletada no cadastro, permanece somente no servidor para a regra de 18+ e nunca é retornada após a criação; e-mail é somente para o titular. Perfis remotos já carregam publicações/artigos pela API; a inspeção visual autenticada não foi executada                                                 | Parcial; falta E2E visual e continuam fora os campos comerciais ainda não suportados pelo contrato           |
| Publicações e comentários      | A prévia permanece local. Em sessão remota, o Feed global consome a API nas abas Para você, Seguindo, Artigos e Vídeos, e perfis carregam publicações/artigos paginados; curtir, comentar/responder, repostar e salvar usam a API. Estados de carregamento/erro/vazio, paginação sem duplicação e ações assíncronas da aba Vídeos têm testes. A jornada autenticada ainda não foi verificada visualmente no navegador | Parcial                                                                                                      |
| Fotos e vídeos                 | Upload autenticado, IDs de mídia e associação às publicações funcionam no desenvolvimento com arquivos locais; isso não fornece armazenamento permanente de produção                                                                                                                                                                                                                                                  | Desenvolvimento funcional; produção não pronta                                                               |
| Galeria                        | Fotos/vídeos de publicações alimentam a galeria. O perfil comercial também combina fotos/vídeos independentes do objeto comercial; precisa de uma regra única sem duplicar arquivos nem contornar audiência                                                                                                                                                                                                           | Parcial                                                                                                      |
| Relacionamentos e Círculo      | API persiste seguimentos, pedidos privados e Círculo derivado; sessões remotas usam a API para visualizar e alterar relações                                                                                                                                                                                                                                                                                          | Integrado em sessão remota; falta E2E visual                                                                 |
| Privacidade e bloqueio         | A tela Privacidade e ações de bloqueio usam a API em sessões remotas. O servidor remove follows/pedidos em transação, permite desbloqueio só pelo iniciador e aplica visibilidade a posts/mídias                                                                                                                                                                                                                      | Integrado para perfis, posts e mídias; Mensagens ainda não tem API                                           |
| Mensagens e notificações       | Conteúdo local/demonstrativo; leituras e preferências ficam separadas por conta neste navegador. Não há API, entrega ou sincronização entre aparelhos                                                                                                                                                                                                                                                                 | Bloqueador                                                                                                   |
| Seek                           | Descoberta por localização/categoria de perfis comerciais originados no Social; cidade baseada no catálogo IBGE; filtros e salvos separados por conta no navegador. Não há API real de descoberta no servidor                                                                                                                                                                                                         | Parcial                                                                                                      |
| Avaliações do perfil comercial | Interface, contrato e rotas de Profiles implementados em código. O estado de persistência física deve ser verificado pela query de catálogo; a jornada autenticada ainda requer E2E                                                                                                                                                                                                          | Implementado em código; estado físico não presumido                                                         |
| Shop                           | Catálogo ilustrativo e itens salvos separados por conta no navegador; checkout é explicitamente indisponível                                                                                                                                                                                                                                                                                                          | Parcial por escopo                                                                                           |
| Configurações                  | Conta, privacidade e segurança usam a API em sessão real; notificações e aparência ainda ficam no navegador; ações sensíveis adicionais aguardam implementação                                                                                                                                                                                                                                                        | Parcial                                                                                                      |

## Bloqueios e falhas concretas

### Autenticação e identidade — núcleo implementado; E2E visual pendente

- O cadastro pessoal/comercial, a confirmação de e-mail e o login passam pela API; a API cria uma identidade Social única e, para conta comercial, sua extensão no mesmo fluxo. A senha não é persistida no navegador.
- O login envia usuário ou e-mail e senha à API; conta sem e-mail confirmado não recebe sessão nem acessa recursos protegidos.
- `ForgotPassword.tsx` solicita e confirma a redefinição pela API. A suíte isolada valida os casos principais; o fluxo visual completo e o recebimento de e-mail na tela ainda exigem E2E separado.
- `SettingsSecurity.tsx` consulta sessões e instalações próprias e permite revogação individual ou em lote. A sessão/instalação atual fica marcada; a interface não inventa modelo, navegador ou localização. O token reconhece uma instalação do navegador/app, não prova identidade do aparelho físico. MFA geral e histórico detalhado continuam indisponíveis.
- O estado local de demonstração não equivale a sessão autenticada; a autorização real continua no servidor e na sessão da API.

**Atualização de autenticação em 25/10:** cadastro, login, verificação de e-mail, onboarding, configurações de conta/privacidade/segurança usam a API. A política exige Argon2id e senha de 8–128 caracteres com uma maiúscula, uma minúscula, um número e um caractere especial. A existência física das tabelas necessárias foi reconfirmada por metadados em 29/10/2026; esta consulta não leu registros e não declara que o banco esteja vazio.

**Regras confirmadas:** conta sem e-mail verificado não pode entrar nem acessar recursos. O registro mantém a conta pendente e sem sessão. Na confirmação, uma conta legada com política de senha antiga é ativada sem sessão e segue para login; senha legada compatível é promovida após validação, e senha incompatível exige atualização com a senha atual.

**Atenção restante:** a recuperação de senha e a revogação de sessões estão implementadas; a entrega assíncrona ainda não tem outbox durável nem tentativa persistente. Reconhecimento de dispositivo usa token revogável por instalação, não IP nem fingerprint. O estado físico atual deve ser consultado com a query de catálogo; este relatório trata exclusivamente do desenvolvimento.

O login aceita senhas antigas de 8–128 caracteres para poder verificá-las; a regra de composição é aplicada a novas senhas e a atualizações obrigatórias. O campo de senha permanece apenas em memória durante o fluxo e não é salvo em `localStorage`.

### Integração gradual — conteúdo e relações ainda incompletos

- `Aplicativo/back/src` implementa saúde, autenticação (incluindo recuperação de senha e gestão de sessões), onboarding, perfil básico, privacidade, relações, Feed global/perfil, interações sociais, upload de mídia e avaliações do perfil comercial. A descoberta Seek ainda não consome a API de descoberta; Shop, mensagens e notificações também não estão integralmente conectados.
- Em sessões remotas, Feed, linha do tempo do perfil, busca de publicações/hashtags e avaliações do perfil comercial usam endpoints próprios; a prévia demonstrativa continua local e não é fallback após erro de rede. A nota agregada de avaliações ainda não foi conectada à projeção de resultados do Seek. A integração visual autenticada não foi verificada ponta a ponta.
- O catálogo público do IBGE é uma integração externa de dados; cadastro, autenticação e configurações usam a API Seekalive.
- O fluxo da API usa processos/servidores separados; a configuração de same-origin/proxy e CORS precisa ser conferida antes de conectar novos módulos. A API ativa exige sessão verificada e CSRF para escrita.

### Busca remota de publicações e hashtags — validada em 31/10/2026

- A tela Social > Busca consulta `GET /api/v1/social/feed?q=...` em sessão remota. O endpoint mantém paginação com cursor vinculado à consulta e aplica as mesmas regras de perfil privado, Círculo, bloqueio e audiência do Feed; a busca não amplia acesso ao conteúdo.
- A consulta por hashtag usa prefixo normalizado sem diferenciar acentos ou caixa: `café` encontra `#cafeteira`. Texto comum, legenda e conteúdo de artigo também participam da busca. Resultados de tags derivam de publicações existentes; tendências de demonstração permanecem somente no modo de desenvolvimento.
- Publicações comuns e artigos aceitam até dez hashtags distintas, contando legenda, título e corpo do artigo em conjunto. Duplicatas que diferem apenas em caixa/acentos contam como uma só. A API rejeita o excesso antes da persistência; as hashtags retornam na leitura e a projeção normalizada pertence ao schema `feed`.
- As migrations `feed/0002` e `feed/0003_post_references` criaram `feed.post_tags` e `feed.post_references` e foram aplicadas exclusivamente ao banco de desenvolvimento. A existência da tabela nova foi confirmada por consulta somente de leitura. Nenhuma migration, dado ou serviço de produção foi consultado ou alterado.
- A busca foi validada em teste HTTP com schema temporário: `café` encontrou `#cafeteira`, 11 hashtags foram rejeitadas, o schema foi removido e `public` permaneceu inalterado. Typecheck, suíte completa, build, codegen e verificações dos tracks de migration passaram. O teste de navegador autenticado não foi feito porque o navegador de captura não possui sessão.

**Antes de integrar novos módulos remotos:** reutilizar o cliente, roteamento e tratamento de erros/paginação já adotados; reavaliar CORS somente se a implantação futura separar as origens. Manter a prévia demonstrativa isolada: falha de rede nunca deve acionar fallback silencioso para fixtures.

### Resolvido — Fixtures de exemplo aparecem somente no desenvolvimento

- Posts, usuários seed, notificações, conversas, mensagens, avaliações, tendências e tópicos ficam restritos ao modo de desenvolvimento. A tela inicial pode manter o perfil fictício apenas dentro de uma imagem estática ilustrativa, sem registro ou interação.
- A página Social, o Shop, as referências a produtos/eventos e os painéis laterais não exibem esses fixtures no build de produção. Sem API conectada, mostram estados vazios em vez de registros inventados. O único exemplo permitido fora do dev é uma imagem estática de apresentação.
- Os mocks continuam disponíveis no preview de desenvolvimento para revisão visual. O conteúdo escrito pelo usuário no navegador continua local e não passa a ser dado compartilhado/real.

**Frontend concluído para esta regra:** fixtures do produto só aparecem no desenvolvimento; produção não usa sementes fictícias. Antes de publicar com dados reais, conectar os estados vazios aos endpoints e testar o build de produção.

### Estado relativo ao usuário — isolamento local concluído; integração com backend pendente

- Curtidas, curtidas em comentários, repostagens, publicações salvas e leituras de notificações/mensagens agora ficam registradas por ID da conta no navegador. Contagens compartilhadas são derivadas das ações locais de cada conta.
- Notificações com destinatário só aparecem para essa conta; notificações de demonstração sem destinatário aparecem apenas na conta demo. A leitura automática após três segundos continua sendo uma regra de interface, mas agora é gravada para a conta ativa.
- Preferências de notificação/aparência, filtros e cidade recente do Seek, estabelecimentos/eventos salvos e itens salvos do Shop usam escopo por conta. As preferências de privacidade e interesses já eram associadas à conta.
- Bloqueios agora são relações locais da conta ativa para um perfil alvo; os filtros do app ocultam perfis e interações nos dois sentidos. Bloquear remove seguimentos e solicitações entre as contas; mensagens antigas ficam ocultas e voltam após desbloquear. Publicações, comentários e avaliações não são apagados. Só quem iniciou pode desbloquear; relações removidas não são restauradas automaticamente.
- Relações, solicitações, publicações, comentários e avaliações continuam como conteúdo compartilhado local e identificado por autor/destinatário; não são preferências do visitante. Isso não substitui autorização no servidor.
- Chaves globais antigas não são apagadas nem migradas automaticamente: não há como saber a qual conta os valores compartilhados pertenciam. Os novos escopos começam vazios, preservando os valores legados no navegador.
- Em `onboarding/Suggestions.tsx`, cada toque em “Seguir” aplica a relação imediatamente: contas públicas são atualizadas no armazenamento local da conta ativa; perfis privados criam uma solicitação pendente, também local. “Concluir e entrar” e “Pular por agora” apenas navegam; não há lote de escolhas a salvar nessa etapa. Não exige API nesta fase.
- Corrigido: alterar o nome de usuário em `settings/Account.tsx` agora atualiza o `AppContext` e o `SocialContext`, mantendo a conta persistida e o perfil/busca alinhados.

**Antes de integrar outras áreas:** os endpoints de perfil e relações já associam cada ação à sessão e devolvem projeções do visitante. O estado local do frontend continua sendo demonstração, não autorização nem proteção contra alteração do `localStorage`.

### P1 — Privacidade e segurança só existem parcialmente no frontend

- `canReadPost` e filtros de tela são úteis para UX, mas não protegem dados. Feed, busca, perfil, comentário, notificações, mensagens, referência e arquivo precisam da mesma autorização no servidor.
- Em perfil público, seguir é imediato. Em perfil privado, a API cria solicitação pendente; somente o dono pode aceitar ou recusar. Pedido pendente não conta como seguidor e não libera conteúdo.
- Após a aprovação, o seguidor vê publicações com audiência `public` e `private` do perfil privado. Publicações destinadas ao Círculo continuam exigindo seguimento aceito nos dois sentidos. A regra de Círculo permanece derivada: A segue B e B segue A; a remoção de qualquer seguimento encerra o Círculo.
- A API de bloqueio remove seguimentos e pedidos nos dois sentidos em transação, oculta a conta e permite desbloqueio apenas pelo iniciador. Ao desbloquear, os vínculos não voltam automaticamente. As telas em sessão remota consomem esses endpoints; a validação E2E autenticada permanece pendente.
- Mensagens antigas ainda não têm API; portanto, ocultação/restauração durante bloqueio permanece pendente para o futuro domínio de mensagens. A API já persiste preferência de mensagens e confirmações de leitura, mas a tela ainda não a consome.

**Regra de backend concluída para perfil, posts e mídias:** os endpoints ativos foram verificados com sessões autenticadas temporárias no banco de desenvolvimento. As telas de perfil e relações consomem esses endpoints em sessões remotas; mensagens ainda não têm API e deverão aplicar a regra de bloqueio quando forem construídas.

### P1 — Upload de mídia funciona no desenvolvimento; a galeria comercial ainda precisa de ownership definido

- A prévia de desenvolvimento pode usar URLs `blob:` locais, mas a publicação em sessão remota envia o arquivo pelo fluxo de upload, recebe um ID e associa esse ID ao post; uma falha remota não é tratada como publicação bem-sucedida.
- O backend valida arquivo/titularidade e mantém os binários no disco local de desenvolvimento. Armazenamento permanente, processamento e limpeza periódica de produção continuam fora desta etapa.
- A galeria derivada das publicações respeita audiência, mas `CommercialProfilePage` também reúne `commercialProfile.photos/videos`. Ainda é necessário definir se esses ativos pertencem a publicações vinculadas ou ao perfil comercial; não duplicar arquivos nem expor conteúdo privado via galeria.

### P1 — O contrato documental tinha divergências de regra

Corrigido neste pacote:

- Círculo deixou de ter convites, estados pendentes e tabela própria; a listagem retorna apenas seguimentos recíprocos efetivos.
- Avaliação agora exige nota inteira de 1–5, comentário entre 10–500 caracteres e resposta entre 3–500, alinhados à UI.
- Opções de serviço comerciais distinguem oferecido (`true`), não oferecido (`false`) e não informado (`null`/ausente). Só `true` pode aparecer no perfil público.

As rotas de avaliação e o contrato estão implementados em código. Antes de declarar persistência física ou aceite da experiência autenticada, consulte o banco de desenvolvimento e execute testes HTTP integrados seguros.

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

| Módulo            | Rotas/páginas                                                                                                             | Fontes atuais                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso e cadastro | `/`, `/login`, `/register`, `/forgot-password`, `/verify-email`                                                           | API própria para conta real; estado local separado apenas para demonstração de desenvolvimento                                                                                                                |
| Onboarding        | `/onboarding/interests`, `/onboarding/suggestions`                                                                        | preferências locais e sugestões mock                                                                                                                                                                          |
| Social            | `/feed`, `/search`, `/post/:id`, `/article/:id`, `/compose`, `/article/create`, `/social/activity`, `/social/suggestions` | Sessão remota: Feed global/perfil, busca de texto/hashtags e ações de conteúdo via API. Prévia de desenvolvimento: `SocialContext`, fixtures restritas e `contentService` demo. Referências permanecem locais |
| Perfis e relações | `/profile`, `/profile/:username`, `/profile/edit`, seguidores/seguindo, `/circles`                                        | perfil e publicações remotas usam a API em sessão real; seções comerciais sem contrato permanecem limitadas; `/profile/edit` não substitui os dados privados de Configurações > Conta                         |
| Seek              | `/seek`, `/seek/event/:id`                                                                                                | dados locais, catálogo IBGE, preferências de busca; eventos de exemplo                                                                                                                                        |
| Shop              | `/shop`, `/shop/item/:id`                                                                                                 | catálogo ilustrativo restrito ao desenvolvimento; salvos em localStorage                                                                                                                                      |
| Comunicação       | `/messages`, `/messages/:conversationId`, `/notifications`                                                                | objetos em memória/contexto; sem entrega externa                                                                                                                                                              |
| Configurações     | `/settings/*`                                                                                                             | preferências locais e controles ainda indisponíveis                                                                                                                                                           |

## Testes e verificações

Na auditoria e nesta fatia:

- Baseline anterior: `pnpm test:social` passou em 42 testes. Na verificação atual de 31/10/2026, `pnpm run test:social` passou em **95/95**, incluindo Feed remoto, paginação e ações.
- `pnpm run typecheck`, `pnpm run test` e `pnpm run build`: aprovados. O build do frontend passou pela verificação de conteúdo demonstrativo em 97 chunks. Permaneceram dois avisos em comentários internos do Zod; a versão não foi alterada.
- `pnpm --filter @workspace/api-spec run codegen` e `pnpm --filter @workspace/db run check`: aprovados. `pnpm --filter @workspace/db run test:baselines` passou com replay isolado; o teste HTTP isolado passou em **5/5**, incluindo busca acentuada de hashtag e validação do limite. Os schemas temporários foram removidos e o schema `public` permaneceu inalterado.
- Testes HTTP com três contas temporárias e e-mail verificado no banco **de desenvolvimento**: pedido privado, lista e aprovação; perfil após aprovação; seguimento público e mutualidade/Círculo; bloqueio, ocultação de perfil e rejeição de seguimento durante bloqueio; desbloqueio sem restaurar vínculos; edição de perfil e privacidade com versão.
- Rotas protegidas responderam `401` sem sessão e escrita sem CSRF respondeu `403`; health check da API respondeu `200`. As contas temporárias foram excluídas ao final.

Esses resultados comprovam as fatias testadas, não a prontidão integral do backend. Não há teste de navegador autenticado ponta a ponta; avaliações do perfil comercial têm código implementado, mas aguardam migration e validação HTTP integrada; referências, mensagens e notificações também continuam pendentes. Busca por texto e hashtags está integrada em sessões remotas. Upload de mídia está integrado no desenvolvimento, mas armazenamento permanente/produção permanece fora do escopo atual.

## Próximas etapas vigentes

A ordem oficial é a do `auditoria/plano-de-acao-tecnico.md`, que controla os gates e substitui a sequência histórica abaixo. Avaliações do perfil comercial pertencem a Profiles, não ao Seek. A situação física do banco não é afirmada neste relatório. Referências do Feed aceitam somente publicações Social e são reautorizadas ao montar cada prévia. O Feed global e a busca por hashtags não devem ser reimplementados.

## Ordem histórica da auditoria inicial

1. **Concluído nesta etapa:** edição de dados pessoais/comerciais em Configurações > Conta ligada à API owner-only, mantendo o preview de demonstração separado. Próximo: validar a tela em navegador autenticado e fechar as decisões/controles de conta que ainda faltam antes de iniciar páginas públicas.
2. **Fatia de identidade implementada:** registro pessoal/comercial, login por usuário/e-mail, sessão, CSRF, verificação obrigatória, gravação das escolhas de onboarding e recuperação de senha. O fluxo de recuperação tem teste integrado com e-mail em memória; validar o envio no navegador e a entrega real no ambiente de desenvolvimento segue como aceite separado.
3. **Concluído no frontend:** fixtures de exemplo ficam no desenvolvimento; curtidas, repostagens, salvos, leituras, filtros e preferências locais são separados por conta. Não migrar automaticamente os valores das chaves antigas sem identificar seu dono.
4. Aprovar um contrato OpenAPI que corresponda às telas atuais e definir uma API de mesma origem, erros, paginação, CSRF e sessão.
5. Implementar upload de mídia com ownership/validação e migrar a galeria para IDs de mídia autorizados.
6. Integrar gradualmente cadastro/perfil, Social, avaliações dentro do perfil comercial, descoberta do Seek, mensagens/notificações e Shop; somente ligar telas depois de haver endpoints e estados loading/erro/vazio.
7. Criar testes de API e navegador que cubram autorização entre contas, privacidade, Círculo, publicação/galeria, avaliações, mensagens e ações de configuração.

**Estado vigente desta auditoria:** perfis owner-only, privacidade, relações, Feed global, publicações/artigos de perfil e busca de texto/hashtags usam contratos remotos em sessão autenticada, enquanto a prévia segue local. Avaliações do perfil comercial estão implementadas em código; E2E visual autenticado e alguns domínios ainda não têm aceite. A presença de rotas não é prova de persistência nem de validação completa.
