# Auditoria de prontidão do frontend — Seekalive

**Data:** 22/10/2026  
**Escopo:** preparação do frontend para uma futura integração com backend. Esta auditoria é análise/documentação; não cria endpoints, banco, autenticação ou armazenamento remoto.

## Parecer

**O frontend ainda não está pronto para receber o backend em produção.** Há componentes úteis — rotas, validações de interface, regras locais, telas de estados vazios/indisponíveis, modelos de domínio e contratos REST propostos — mas a aplicação continua sendo um protótipo local. A interface não consome os endpoints `/api/v1` documentados, não tem autenticação real, não envia mídia e mistura alguns dados de demonstração ao estado usado pelo Social.

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
| Identidade e sessão | Cadastro cria conta local e ativa-a no navegador; login não autentica; recuperação e verificação não enviam e-mail | Bloqueador |
| Contas e perfis | Dados guardados em `localStorage`; edição local. Contextos de conta e Social podem divergir | Bloqueador |
| Publicações e comentários | `SocialContext` com reducer; `contentService` usa `demoContentAdapter`; adaptador REST não está ativo | Bloqueador |
| Fotos e vídeos | Prévia usa URL `blob:` do navegador; não há upload, ID de mídia ou persistência remota | Bloqueador |
| Galeria | Fotos/vídeos de publicações alimentam a galeria. O perfil comercial também combina fotos/vídeos independentes do objeto comercial; precisa de uma regra única sem duplicar arquivos nem contornar audiência | Parcial |
| Relacionamentos e Círculo | O frontend calcula Círculo pelo seguimento recíproco; “deixar de seguir” remove a associação derivada | Regra alinhada; sem API |
| Privacidade e bloqueio | Visibilidade é verificada no cliente. Preferências são locais; bloqueio não é modelado por relação ator-alvo e a ação “Desbloquear” está desabilitada | Bloqueador |
| Mensagens e notificações | Estado local/demonstrativo. Não há API, entrega, sincronização entre aparelhos ou leitura por participante no servidor | Bloqueador |
| Seek | Negócios derivados de contas comerciais; cidade baseada no catálogo IBGE; filtros locais. Não há busca/avaliações/eventos reais no servidor | Parcial |
| Avaliações | Registros locais; interface exige nota 1–5, comentário de 10–500 caracteres e resposta de 3–500 | Parcial |
| Shop | Catálogo ilustrativo e salvos no navegador; checkout é explicitamente indisponível | Parcial por escopo |
| Configurações | Preferências de privacidade/notificações no navegador; recursos de segurança e ações sensíveis explicitamente indisponíveis | Parcial |

## Bloqueios e falhas concretas

### P0 — Autenticação e identidade inexistentes

- `pages/Register.tsx` valida e cria um perfil local, usa ID baseado no nome de usuário e grava dados de conta no navegador. A senha não é armazenada — isso é correto para o protótipo, mas significa que não existe credencial utilizável no backend.
- `pages/Login.tsx` não envia usuário/e-mail e senha para um serviço; a tela apresenta o fluxo como não conectado. Após sair, a conta local não pode ser autenticada novamente pelo login.
- `ForgotPassword.tsx` e `VerifyEmail.tsx` não enviam nem validam códigos reais.
- `AppContext` considera ativa a conta carregada do `localStorage`; isso não equivale a sessão autenticada. A proteção de rotas não substitui autorização no servidor.
- O cadastro comercial e pessoal deve resultar na mesma identidade Social, com extensão comercial somente para contas comerciais. Isso está descrito como regra, mas ainda é cadastro no navegador.

**Antes de integrar:** escolher e configurar o provedor de identidade; implementar criação de conta, sessão, logout, verificação e recuperação reais; parar de tratar dados de `localStorage` como identidade ou autorização.

### P0 — Nenhum caminho frontend → API está ligado

- `artifacts/api-server/src` confirma apenas `GET /api/healthz`; não há handlers de identidade, conteúdo, mídia, Seek, avaliações, Shop, mensagens ou notificações.
- O frontend não usa os endpoints `/api/v1` propostos. `services/contentService.ts` exporta `demoContentAdapter`; `services/restContracts.ts` é apenas um contrato/adaptador parcial.
- A chamada remota encontrada no frontend é para o catálogo público do IBGE, não para a API Seekalive.
- O fluxo da API usa processos/servidores separados; a configuração de same-origin/proxy e CORS precisa ser conferida antes de conectar o navegador. A implementação atual não oferece autenticação, autorização ou CSRF.

**Antes de integrar:** escolher um cliente/base URL, conectar cada módulo por etapas, configurar roteamento/CORS e CSRF, mapear erros/paginação e garantir que falha de rede nunca faça fallback silencioso para fixtures.

### P1 — Dados demonstrativos podem aparecer como conteúdo de produto

- `SocialContext` inicializa posts, contas, notificações, conversas e mensagens de demonstração sem restringi-los ao modo de desenvolvimento.
- `Search.tsx` contém tendências e contagens estáticas; `SocialContextPanel.tsx` mostra eventos demonstrativos. Parte da descoberta do Seek é marcada como exemplo, mas isso não protege os outros pontos.
- O catálogo de Shop é explicitamente ilustrativo e a compra está desabilitada; essa transparência deve ser preservada até a existência de dados e operações reais.

**Antes de integrar:** separar fontes de exemplo da fonte de produção, ou retirar as fixtures do estado da aplicação. Não semear dados fictícios em usuários ou tabelas reais.

### P1 — Estado relativo ao usuário está guardado em objetos globais

- Likes e bookmarks são alternados por ID de publicação e alteram flags da própria publicação; não recebem consistentemente o ator. Em troca de conta no mesmo navegador, o estado pode parecer pertencer a todas as contas.
- Notificações de exemplo são lidas em conjunto; a página marca todas como lidas automaticamente após três segundos. Isso não representa uma caixa de entrada por destinatário.
- Preferências de notificação e salvos do Shop usam chaves globais no navegador, sem isolamento por conta.
- `onboarding/Suggestions.tsx` altera apenas um `Set` temporário de perfis mockados; o botão de concluir não persiste as relações de seguir escolhidas.
- `settings/Account.tsx` atualiza o username no `AppContext`, mas não sincroniza essa alteração com `SocialContext`, podendo deixar o perfil/busca com o valor anterior.

**Antes de integrar:** cada reação, favorito, leitura, relação e preferência precisa ser associada ao usuário autenticado; respostas da API devem devolver projeções do visitante, não flags globais persistidas em posts/contas.

### P1 — Privacidade e segurança só existem parcialmente no frontend

- `canReadPost` e filtros de tela são úteis para UX, mas não protegem dados. Feed, busca, perfil, comentário, notificações, mensagens, referência e arquivo precisam da mesma autorização no servidor.
- O botão “Seguir” muda a relação imediatamente. Não há inbox de solicitações nem aceite para perfis privados. A regra de Círculo, por sua vez, está alinhada: A segue B e B segue A; a remoção de qualquer seguimento elimina o Círculo derivado.
- O modelo de bloqueio usa `isBlocked` no objeto do usuário, em vez de uma relação por ator e alvo. A página de bloqueados lista essa flag e apresenta “Desbloquear” desabilitado apesar de existir um handler.
- As opções para receber mensagens e confirmações de leitura são preferências locais; precisam ser verificadas em cada envio/leitura no backend.

**Decisão pendente:** confirmar se perfil privado exige que cada novo seguimento seja aprovado. Se sim, falta implementar o estado de solicitação e sua interface; esse fluxo não deve ser confundido com Círculo.

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
| Social | `/feed`, `/search`, `/post/:id`, `/article/:id`, `/compose`, `/article/create`, `/social/activity`, `/social/suggestions` | `SocialContext`, fixtures, reducer; `contentService` demo |
| Perfis e relações | `/profile`, `/profile/:username`, `/profile/edit`, seguidores/seguindo, `/circles` | conta local, `SocialContext`, relações derivadas |
| Seek | `/seek`, `/seek/event/:id` | dados locais, catálogo IBGE, preferências de busca; eventos de exemplo |
| Shop | `/shop`, `/shop/item/:id` | catálogo de demonstração e salvos em localStorage |
| Comunicação | `/messages`, `/messages/:conversationId`, `/notifications` | objetos em memória/contexto; sem entrega externa |
| Configurações | `/settings/*` | preferências locais e controles ainda indisponíveis |

## Testes e verificações

Na auditoria:

- `pnpm test:social`: **34 testes aprovados** para regras de conteúdo, validação, referências e erros do adaptador.
- `pnpm --filter @workspace/social run typecheck`: aprovado.
- `pnpm --filter @workspace/social run build`: aprovado anteriormente; apresentou avisos não bloqueantes de sourcemap e tamanho de bundle.

Esses resultados comprovam compilação e um conjunto limitado de regras, não a prontidão do backend. Não há testes de navegador ponta a ponta, integração HTTP com sessão, banco, CSRF, uploads, troca entre contas, fluxo de seguir mútuo, telas de aprovação privada, notificações por destinatário ou persistência entre dispositivos.

## Ordem recomendada para fechar a prontidão

1. Confirmar o comportamento de seguimento para contas privadas e manter Círculo apenas como estado derivado.
2. Escolher autenticação e identidade; documentar sessão e como uma conta pessoal/comercial nasce.
3. Remover/encapsular dados demo do estado de produção e separar estados viewer-specific por conta.
4. Aprovar um contrato OpenAPI que corresponda às telas atuais e definir uma API de mesma origem, erros, paginação, CSRF e sessão.
5. Implementar upload de mídia com ownership/validação e migrar a galeria para IDs de mídia autorizados.
6. Integrar gradualmente cadastro/perfil, Social, avaliações/Seek, mensagens/notificações e Shop; somente ligar telas depois de haver endpoints e estados loading/erro/vazio.
7. Criar testes de API e navegador que cubram autorização entre contas, privacidade, Círculo, publicação/galeria, avaliações, mensagens e ações de configuração.

**Estado final desta auditoria:** documentação atualizada; nenhum endpoint novo, banco ou serviço foi implementado.
