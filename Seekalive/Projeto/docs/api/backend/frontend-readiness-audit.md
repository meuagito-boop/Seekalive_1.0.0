# Auditoria de prontidão do frontend — Seekalive

**Auditoria-base:** 22/10/2026; última atualização de estado: 24/10/2026
**Escopo:** prontidão do frontend para integração gradual. A auditoria original foi análise/documentação; desde então, autenticação, onboarding, perfil básico, privacidade e relações sociais essenciais receberam API e schema no desenvolvimento.

> Os achados detalhados abaixo preservam o corte da auditoria-base de 22–23/10. Para o estado mais recente, decisões de produto e plano de ação, consulte `reports/auditoria-aplicativo-e-plano-de-acao-2026-10-23.md` (versão 2.16).

## Parecer

**O frontend ainda não está pronto para usar todo o backend em produção.** Login/sessão/onboarding consultam a API. Configurações > Conta diferencia conta pessoal e comercial e lê/salva por `/v1/accounts/me` em sessão real; Privacidade e Segurança também usam APIs no fluxo autenticado. O preview de demonstração permanece local. As páginas públicas, conteúdo e várias áreas sociais ainda não estão integradas integralmente. O envio de e-mail está desligado, então não é possível criar conta real nesta configuração. Posts, mídias, avaliações, mensagens, Seek e outros domínios ainda não têm API ativa; fixtures pré-carregadas ficam apenas no desenvolvimento.

O backend foi iniciado. O próximo trabalho de frontend é consumir somente os endpoints ativos e manter a demonstração de desenvolvimento separada da conta real; não conectar telas a contratos que ainda estejam marcados como propostos.

## Como a análise foi feita

- Inventário das rotas e dos módulos de produto em `Aplicativo/front/src` (159 arquivos de origem, sendo 158 TypeScript/TSX), incluindo pontos de entrada, contextos, serviços, persistência local, telas de conta, perfis, Social, Seek, Shop e configurações.
- Leitura focalizada das regras de negócio e fluxos de maior risco; busca estática por chamadas de rede, armazenamento, fixtures, controles desabilitados e contratos.
- Conferência da API em `Aplicativo/back`, dos contratos OpenAPI/SQL propostos e dos testes disponíveis.
- A leitura não inclui dependências, bundles, arquivos gerados ou primitivas genéricas de UI como uma auditoria de segurança de cada byte. O resultado é uma revisão funcional/de integração do código próprio, não uma certificação de segurança ou revisão de produção.

## Resultado por área

| Área | Estado atual | Prontidão |
|---|---|---|
| Rotas e navegação | Páginas para cadastro, login, onboarding, Social, perfis, Seek, Shop e configurações; proteção de rota apenas no cliente | Parcial |
| Identidade e sessão | Login, cadastro, sessão, CSRF, confirmação de e-mail, onboarding, recuperação de senha e gestão de sessões chamam a API | Entrega Resend dos fluxos de e-mail ainda precisa de E2E no navegador; API de e-mail permanece habilitada somente em desenvolvimento |
| Contas e perfis | Configurações > Conta usa `/v1/accounts/me` em sessões reais, com campos pessoais/comerciais separados; idade é coletada no cadastro, permanece somente no servidor para a regra de 18+ e nunca é retornada após a criação; e-mail é somente para o titular. `/profile/edit` e conteúdo do perfil público ainda não estão ligados a essa edição | Parcial; falta E2E autenticado e integração das páginas públicas |
| Publicações e comentários | `SocialContext` com reducer; `contentService` usa `demoContentAdapter`; adaptador REST não está ativo | Bloqueador |
| Fotos e vídeos | Prévia usa URL `blob:` do navegador; não há upload, ID de mídia ou persistência remota | Bloqueador |
| Galeria | Fotos/vídeos de publicações alimentam a galeria. O perfil comercial também combina fotos/vídeos independentes do objeto comercial; precisa de uma regra única sem duplicar arquivos nem contornar audiência | Parcial |
| Relacionamentos e Círculo | API persiste seguimentos, pedidos privados e Círculo derivado; telas ainda usam estado local | Regra no backend; falta integração de telas |
| Privacidade e bloqueio | A tela Privacidade usa GET/PUT da API na sessão real; o estado de bloqueio usa o SocialContext remoto. O servidor aplica o bloqueio, remove follows/pedidos em transação e permite desbloqueio só pelo iniciador | Parcial; posts/mensagens ainda precisam de ACL quando tiverem API |
| Mensagens e notificações | Conteúdo local/demonstrativo; leituras e preferências ficam separadas por conta neste navegador. Não há API, entrega ou sincronização entre aparelhos | Bloqueador |
| Seek | Negócios derivados de contas comerciais; cidade baseada no catálogo IBGE; filtros e salvos separados por conta no navegador. Não há busca/avaliações/eventos reais no servidor | Parcial |
| Avaliações | Registros locais; interface exige nota 1–5, comentário de 10–500 caracteres e resposta de 3–500 | Parcial |
| Shop | Catálogo ilustrativo e itens salvos separados por conta no navegador; checkout é explicitamente indisponível | Parcial por escopo |
| Configurações | Preferências de privacidade, notificações e aparência separadas por conta no navegador; recursos de segurança e ações sensíveis explicitamente indisponíveis | Parcial |

## Bloqueios e falhas concretas

### P0 — Autenticação e identidade inexistentes

- `pages/Register.tsx` valida e cria um perfil local, usa ID baseado no nome de usuário e grava dados de conta no navegador. A senha não é armazenada — isso é correto para o protótipo, mas significa que não existe credencial utilizável no backend.
- `pages/Login.tsx` não envia usuário/e-mail e senha para um serviço; a tela apresenta o fluxo como não conectado. Após sair, a conta local não pode ser autenticada novamente pelo login.
- `ForgotPassword.tsx` solicita e confirma a redefinição pela API. A suíte isolada valida os casos principais; o fluxo visual completo e o recebimento de e-mail na tela ainda exigem E2E separado.
- `SettingsSecurity.tsx` consulta sessões próprias e executa revogação individual ou em lote. A sessão atual fica marcada; a interface não inventa dados de dispositivo. 2FA, histórico detalhado e identificação de aparelho habitual continuam explicitamente indisponíveis.
- `AppContext` considera ativa a conta carregada do `localStorage`; isso não equivale a sessão autenticada. A proteção de rotas não substitui autorização no servidor.
- O cadastro comercial e pessoal deve resultar na mesma identidade Social, com extensão comercial somente para contas comerciais. Isso está descrito como regra, mas ainda é cadastro no navegador.

**Atualização de autenticação em 24/10:** cadastro, login, verificação de e-mail e onboarding usam a API. A política é Argon2id com senha de 8–128 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial. O frontend e a API suportam migração de credenciais anteriores sem tentar inferir a senha a partir do hash. As regras foram exercitadas em schema temporário isolado e as colunas/restrição foram aplicadas e verificadas no banco principal de desenvolvimento, que estava sem contas, credenciais e sessões ativas.

**Regras confirmadas:** conta sem e-mail verificado não pode entrar nem acessar recursos. O registro mantém a conta pendente e sem sessão. Na confirmação, uma conta legada com política de senha antiga é ativada sem sessão e segue para login; senha legada compatível é promovida após validação, e senha incompatível exige atualização com a senha atual.

**Atenção restante:** não havia sessões nem credenciais no banco quando a migração foi aplicada; portanto, nenhum usuário precisou entrar novamente por causa dela. A recuperação de senha e a revogação de sessões estão implementadas; a entrega assíncrona ainda não tem outbox durável nem tentativa persistente. Reconhecimento de dispositivo habitual, autenticação em duas etapas e histórico de acesso não existem e não são simulados. Não há produção real nem mudança em produção.

O login aceita senhas antigas de 8–128 caracteres para poder verificá-las; a regra de composição é aplicada a novas senhas e a atualizações obrigatórias. O campo de senha permanece apenas em memória durante o fluxo e não é salvo em `localStorage`.

### P0 — O frontend ainda não consome perfil e relações da API

- `Aplicativo/back/src` implementa saúde, autenticação (incluindo recuperação de senha e gestão de sessões), onboarding, perfil básico, privacidade e relações sociais. Conteúdo, mídia, Seek, avaliações, Shop, mensagens e notificações continuam sem handlers.
- A autenticação e o onboarding usam a API. As telas de perfil, privacidade, seguir, pedidos, Círculo e bloqueio ainda não consomem os endpoints ativos. `services/contentService.ts` continua apontando para `demoContentAdapter`.
- A chamada remota encontrada no frontend é para o catálogo público do IBGE, não para a API Seekalive.
- O fluxo da API usa processos/servidores separados; a configuração de same-origin/proxy e CORS precisa ser conferida antes de conectar novos módulos. A API ativa exige sessão verificada e CSRF para escrita.

**Antes de integrar as telas de perfil/relações:** escolher o cliente/base URL, configurar roteamento/CORS, mapear erros/paginação e manter as demonstrações separadas; falha de rede nunca deve acionar fallback silencioso para fixtures.

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
- Após a aprovação, o seguidor vê publicações com audiência pública do perfil privado. Publicações destinadas ao Círculo continuam exigindo seguimento aceito nos dois sentidos. A regra de Círculo permanece derivada: A segue B e B segue A; a remoção de qualquer seguimento encerra o Círculo.
- A API de bloqueio remove seguimentos e pedidos nos dois sentidos em transação, oculta a conta e permite desbloqueio apenas pelo iniciador. Ao desbloquear, os vínculos não voltam automaticamente. As telas ainda não consomem esses endpoints.
- Mensagens antigas ainda não têm API; portanto, ocultação/restauração durante bloqueio permanece pendente para o futuro domínio de mensagens. A API já persiste preferência de mensagens e confirmações de leitura, mas a tela ainda não a consome.

**Regra de backend concluída para perfil e relações:** os endpoints ativos foram verificados com sessões autenticadas temporárias no banco de desenvolvimento. Falta ligar a interface e aplicar a mesma autorização a posts, mídia, mensagens e demais domínios quando forem implementados.

### P1 — Mídias não são uploads e a galeria tem duas fontes

- `mediaService.ts` e `use-draft-media.ts` criam URLs locais para prévia. URLs `blob:` deixam de existir após recarga e não são IDs que o backend possa anexar a um post.
- A publicação precisa enviar IDs de uploads prontos, pertencentes ao autor e validados pelo servidor; tipo MIME declarado pelo navegador não é prova do formato do arquivo.
- A galeria derivada das publicações respeita audiência, mas `CommercialProfilePage` também reúne `commercialProfile.photos/videos`. O contrato precisa definir se essas mídias são publicações importadas/vinculadas ou ativos de perfil separados. Não duplicar arquivo nem expor conteúdo privado via galeria.

### P1 — O contrato documental tinha divergências de regra

Corrigido neste pacote:

- Círculo deixou de ter convites, estados pendentes e tabela própria; a listagem retorna apenas seguimentos recíprocos efetivos.
- Avaliação agora exige nota inteira de 1–5, comentário entre 10–500 caracteres e resposta entre 3–500, alinhados à UI.
- Opções de serviço comerciais distinguem oferecido (`true`), não oferecido (`false`) e não informado (`null`/ausente). Só `true` pode aparecer no perfil público.

Os contratos de domínio comercial e avaliação ainda são propostas e precisam de testes de integração quando suas APIs forem implementadas.

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
| Perfis e relações | `/profile`, `/profile/:username`, `/profile/edit`, seguidores/seguindo, `/circles` | dados públicos/conteúdo ainda usam estado local em partes; `/profile/edit` não substitui os dados privados de Configurações > Conta |
| Seek | `/seek`, `/seek/event/:id` | dados locais, catálogo IBGE, preferências de busca; eventos de exemplo |
| Shop | `/shop`, `/shop/item/:id` | catálogo ilustrativo restrito ao desenvolvimento; salvos em localStorage |
| Comunicação | `/messages`, `/messages/:conversationId`, `/notifications` | objetos em memória/contexto; sem entrega externa |
| Configurações | `/settings/*` | preferências locais e controles ainda indisponíveis |

## Testes e verificações

Na auditoria e nesta fatia:

- `pnpm test:social`: **42 testes aprovados** incluindo isolamento/persistência local de ações sociais, seguimentos e bloqueios bilaterais por conta, remoção das relações entre contas, desbloqueio ativo, sincronização de nome de usuário entre conta e Social, além de regras de conteúdo, privacidade, validação, referências e erros do adaptador.
- `pnpm --filter @workspace/social run typecheck`: aprovado.
- `pnpm --filter @workspace/social run build`: aprovado nesta revisão; apresentou avisos não bloqueantes de sourcemap e tamanho de bundle.
- Testes HTTP com três contas temporárias e e-mail verificado no banco **de desenvolvimento**: pedido privado, lista e aprovação; perfil após aprovação; seguimento público e mutualidade/Círculo; bloqueio, ocultação de perfil e rejeição de seguimento durante bloqueio; desbloqueio sem restaurar vínculos; edição de perfil e privacidade com versão.
- Rotas protegidas responderam `401` sem sessão e escrita sem CSRF respondeu `403`; health check da API respondeu `200`. As contas temporárias foram excluídas ao final.

Esses resultados comprovam esta fatia, não a prontidão integral do backend. Não há testes de navegador ponta a ponta; também seguem pendentes uploads, conteúdo, avaliações, mensagens, notificações e conexão das telas de perfil/relações com a API.

## Ordem recomendada para fechar a prontidão

1. **Concluído nesta etapa:** edição de dados pessoais/comerciais em Configurações > Conta ligada à API owner-only, mantendo o preview de demonstração separado. Próximo: validar a tela em navegador autenticado e fechar as decisões/controles de conta que ainda faltam antes de iniciar páginas públicas.
2. **Fatia de identidade implementada:** registro pessoal/comercial, login por usuário/e-mail, sessão, CSRF, verificação obrigatória, gravação das escolhas de onboarding e recuperação de senha. O fluxo de recuperação tem teste integrado com e-mail em memória; validar o envio no navegador e a entrega real no ambiente de desenvolvimento segue como aceite separado.
3. **Concluído no frontend:** fixtures de exemplo ficam no desenvolvimento; curtidas, repostagens, salvos, leituras, filtros e preferências locais são separados por conta. Não migrar automaticamente os valores das chaves antigas sem identificar seu dono.
4. Aprovar um contrato OpenAPI que corresponda às telas atuais e definir uma API de mesma origem, erros, paginação, CSRF e sessão.
5. Implementar upload de mídia com ownership/validação e migrar a galeria para IDs de mídia autorizados.
6. Integrar gradualmente cadastro/perfil, Social, avaliações/Seek, mensagens/notificações e Shop; somente ligar telas depois de haver endpoints e estados loading/erro/vazio.
7. Criar testes de API e navegador que cubram autorização entre contas, privacidade, Círculo, publicação/galeria, avaliações, mensagens e ações de configuração.

**Estado final desta auditoria:** perfil owner-only, privacidade e relações atualizados/testados em desenvolvimento; Configurações > Conta já está integrada por tipo de conta. E2E visual autenticado, páginas públicas, conteúdo e demais áreas continuam pendentes; produção e provedores externos não foram alterados.
