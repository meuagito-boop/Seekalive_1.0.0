# Auditoria de prontidão do frontend — Seekalive

**Data da auditoria:** 22/10/2026; atualização de estado: 23/10/2026  
**Escopo:** prontidão do frontend para integração gradual. A auditoria original foi análise/documentação; desde então, autenticação, onboarding, perfil básico, privacidade e relações sociais essenciais receberam API e schema no desenvolvimento.

## Parecer

**O frontend ainda não está pronto para usar todo o backend em produção.** Login/sessão/onboarding consultam a API, e já existem endpoints para perfil básico, privacidade e relações; porém, as telas de perfil, configurações, seguir e bloquear ainda usam dados locais/demonstrativos. O envio de e-mail está desligado, então não é possível criar conta real nesta configuração. Posts, mídias, avaliações, mensagens, Seek e outros domínios ainda não têm API ativa; fixtures pré-carregadas ficam apenas no desenvolvimento.

O backend foi iniciado. O próximo trabalho de frontend é consumir somente os endpoints ativos e manter a demonstração de desenvolvimento separada da conta real; não conectar telas a contratos que ainda estejam marcados como propostos.

## Como a análise foi feita

- Inventário das rotas e dos módulos de produto em `artifacts/social/src` (159 arquivos de origem, sendo 158 TypeScript/TSX), incluindo pontos de entrada, contextos, serviços, persistência local, telas de conta, perfis, Social, Seek, Shop e configurações.
- Leitura focalizada das regras de negócio e fluxos de maior risco; busca estática por chamadas de rede, armazenamento, fixtures, controles desabilitados e contratos.
- Conferência do esqueleto API em `artifacts/api-server`, dos contratos OpenAPI/SQL propostos e dos testes disponíveis.
- A leitura não inclui dependências, bundles, arquivos gerados ou primitivas genéricas de UI como uma auditoria de segurança de cada byte. O resultado é uma revisão funcional/de integração do código próprio, não uma certificação de segurança ou revisão de produção.

## Resultado por área

| Área | Estado atual | Prontidão |
|---|---|---|
| Rotas e navegação | Páginas para cadastro, login, onboarding, Social, perfis, Seek, Shop e configurações; proteção de rota apenas no cliente | Parcial |
| Identidade e sessão | Login, cadastro, sessão, CSRF, confirmação de e-mail e onboarding já chamam a API; recuperação de senha permanece demonstrativa | Envio de e-mail sem provedor; cadastro responde 503 |
| Contas e perfis | A API já lê/edita perfil básico com versão; telas de perfil/edição ainda usam estado local e não chamam essa API | Parcial; falta integração de telas |
| Publicações e comentários | `SocialContext` com reducer; `contentService` usa `demoContentAdapter`; adaptador REST não está ativo | Bloqueador |
| Fotos e vídeos | Prévia usa URL `blob:` do navegador; não há upload, ID de mídia ou persistência remota | Bloqueador |
| Galeria | Fotos/vídeos de publicações alimentam a galeria. O perfil comercial também combina fotos/vídeos independentes do objeto comercial; precisa de uma regra única sem duplicar arquivos nem contornar audiência | Parcial |
| Relacionamentos e Círculo | API persiste seguimentos, pedidos privados e Círculo derivado; telas ainda usam estado local | Regra no backend; falta integração de telas |
| Privacidade e bloqueio | API aplica bloqueio em leitura de perfil/listas, remove follows/pedidos em transação e permite desbloqueio só pelo iniciador; interface ainda salva no navegador | Parcial; posts/mensagens ainda precisam de ACL quando tiverem API |
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

**Decisão e estado atual:** autenticação própria implementada em Express, com sessão opaca, CSRF e hash Argon2id. Login, cadastro, verificação e onboarding estão ligados às rotas da API. O banco de desenvolvimento tem o schema de sete tabelas da primeira fatia; `localStorage` não concede acesso. Recuperação de senha ainda é demonstrativa.

**Regra confirmada:** conta sem e-mail verificado não pode entrar nem acessar recursos. O registro mantém a conta pendente e sem sessão; a confirmação ativa a conta e inicia uma sessão. Essa regra deve ser aplicada no servidor em todas as rotas.

**Atenção restante:** conectar um serviço de envio de e-mail para que cadastro e verificação possam concluir. O cookie de sessão usa validade configurável de sete dias por padrão. Não há alteração em banco de produção; o SQL completo segue como proposta.

O contrato limita senhas a 128 caracteres; os formulários atuais ainda não definem limite máximo. Alinhar validação visual e mensagens de erro antes de ligar registro/login à API.

### P0 — Nenhum caminho frontend → API está ligado

- `artifacts/api-server/src` implementa saúde, autenticação e onboarding. Conteúdo, mídia, Seek, avaliações, Shop, mensagens, notificações, recuperação de senha e gestão de sessões continuam sem handlers.
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
- Bloqueios agora são relações locais da conta ativa para um perfil alvo; os filtros do app ocultam perfis e interações nos dois sentidos. Bloquear remove seguimentos e solicitações entre as contas; mensagens antigas ficam ocultas e voltam após desbloquear. Publicações, comentários e avaliações não são apagados. Só quem iniciou pode desbloquear; relações removidas não são restauradas automaticamente.
- Relações, solicitações, publicações, comentários e avaliações continuam como conteúdo compartilhado local e identificado por autor/destinatário; não são preferências do visitante. Isso não substitui autorização no servidor.
- Chaves globais antigas não são apagadas nem migradas automaticamente: não há como saber a qual conta os valores compartilhados pertenciam. Os novos escopos começam vazios, preservando os valores legados no navegador.
- Em `onboarding/Suggestions.tsx`, cada toque em “Seguir” aplica a relação imediatamente: contas públicas são atualizadas no armazenamento local da conta ativa; perfis privados criam uma solicitação pendente, também local. “Concluir e entrar” e “Pular por agora” apenas navegam; não há lote de escolhas a salvar nessa etapa. Não exige API nesta fase.
- Corrigido: alterar o nome de usuário em `settings/Account.tsx` agora atualiza o `AppContext` e o `SocialContext`, mantendo a conta persistida e o perfil/busca alinhados.

**Antes de integrar:** o servidor ainda precisa associar cada ação ao usuário autenticado e devolver projeções do visitante. O isolamento atual é apenas uma separação de interface no navegador; não é autorização nem proteção contra alteração do `localStorage`.

### P1 — Privacidade e segurança só existem parcialmente no frontend

- `canReadPost` e filtros de tela são úteis para UX, mas não protegem dados. Feed, busca, perfil, comentário, notificações, mensagens, referência e arquivo precisam da mesma autorização no servidor.
- Em perfil público, seguir é imediato. Em perfil privado, o frontend cria solicitação pendente; o dono pode aceitar ou recusar em Configurações > Privacidade. O pedido pendente não conta como seguidor. Isso ainda é estado local, sem API/autorização de servidor.
- Após a aprovação, o seguidor vê publicações com audiência pública do perfil privado. Publicações destinadas ao Círculo continuam exigindo seguimento aceito nos dois sentidos. A regra de Círculo permanece derivada: A segue B e B segue A; a remoção de qualquer seguimento encerra o Círculo.
- O bloqueio e a remoção de relações existem apenas no frontend/localStorage. O backend ainda deve aplicar a mudança dos dois grafos e dos pedidos em transação, esconder mensagens durante bloqueio e impor a regra em todas as rotas e interações.
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

- `pnpm test:social`: **42 testes aprovados** incluindo isolamento/persistência local de ações sociais, seguimentos e bloqueios bilaterais por conta, remoção das relações entre contas, desbloqueio ativo, sincronização de nome de usuário entre conta e Social, além de regras de conteúdo, privacidade, validação, referências e erros do adaptador.
- `pnpm --filter @workspace/social run typecheck`: aprovado.
- `pnpm --filter @workspace/social run build`: aprovado nesta revisão; apresentou avisos não bloqueantes de sourcemap e tamanho de bundle.

Esses resultados comprovam compilação e um conjunto limitado de regras, não a prontidão do backend. Não há testes de navegador ponta a ponta, integração HTTP com sessão, banco, CSRF, uploads, troca entre contas, fluxo de seguir mútuo, telas de aprovação privada, notificações por destinatário ou persistência entre dispositivos.

## Ordem recomendada para fechar a prontidão

1. **Concluído no frontend/documentação:** perfis privados exigem aprovação do dono; seguidores aprovados veem publicações públicas; Círculo continua exigindo seguimento mútuo. Implementar a mesma regra no backend.
2. **Primeira fatia implementada:** registro pessoal/comercial, login por usuário/e-mail, sessão, CSRF, verificação obrigatória e gravação das escolhas de onboarding. O envio de e-mail segue bloqueado; recuperação de senha, testes de integração e rotas dos demais módulos continuam pendentes.
3. **Concluído no frontend:** fixtures de exemplo ficam no desenvolvimento; curtidas, repostagens, salvos, leituras, filtros e preferências locais são separados por conta. Não migrar automaticamente os valores das chaves antigas sem identificar seu dono.
4. Aprovar um contrato OpenAPI que corresponda às telas atuais e definir uma API de mesma origem, erros, paginação, CSRF e sessão.
5. Implementar upload de mídia com ownership/validação e migrar a galeria para IDs de mídia autorizados.
6. Integrar gradualmente cadastro/perfil, Social, avaliações/Seek, mensagens/notificações e Shop; somente ligar telas depois de haver endpoints e estados loading/erro/vazio.
7. Criar testes de API e navegador que cubram autorização entre contas, privacidade, Círculo, publicação/galeria, avaliações, mensagens e ações de configuração.

**Estado final desta auditoria:** documentação atualizada; nenhum endpoint novo, banco ou serviço foi implementado.
