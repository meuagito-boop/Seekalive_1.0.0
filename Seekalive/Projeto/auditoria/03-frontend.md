# Front-end e módulos de produto

## Aplicativo e inicialização

`Aplicativo/front` é o pacote `@workspace/social`, construído com React, TypeScript, Vite, Wouter e TanStack Query. O ponto de entrada é `src/main.tsx`; `src/App.tsx` instala provedores, roteamento, tema escuro e escolhe rotas autenticadas ou públicas. As rotas são carregadas de forma lazy.

O roteamento autenticado está em `modules/app/routes/AuthenticatedRoutes.tsx`; o não autenticado em `UnauthenticatedRoutes.tsx`. O app restringe a tela de onboarding até concluir interesses e não transforma falha de verificação de sessão em logout. O preview de dados demonstrativos é protegido por `import.meta.env.DEV`, com faixa visual explícita na tela.

## Mapa de módulos em `src/modules`

| Módulo | Responsabilidade visível | Estado de integração |
|---|---|---|
| `app` | rotas, shell/layout, contexto da aplicação, persistência local auxiliar, resolução de referências e erros de UI | Camada transversal. A composição do estado global ainda agrega vários domínios. |
| `auth` | login, cadastro, confirmação de e-mail, recuperação de senha, sessão, dispositivos e chamadas HTTP | Integrado à API para os fluxos implementados; depende da API e de cookie/CSRF. |
| `onboarding` | seleção de interesses e sugestões | Há serviço e telas; leitura/escrita de interesses vai para a API quando sessão é remota. |
| `profile` | perfil público, edição, conexões e submódulos pessoal/comercial | Consulta e edição de conta usam API em sessão remota; o preview tem fixtures. |
| `social` | feed, busca, publicação, conteúdo, relações, bloqueio, círculo e comentários | Relações usam API quando remoto; várias interações/publicações continuam locais/demonstrativas. |
| `seek` | descoberta, localização, eventos e avaliações | Descoberta e persistência demonstrativa ficam principalmente no cliente; não há backend Seek completo no estado atual. |
| `shop` | vitrine, item e salvos | Há telas e fixtures; operações reais de loja/checkout não foram conectadas. |
| `messages` | conversas, detalhe e regras de estado da interface | Contexto/ações disponíveis no cliente; API de mensagens não está ativa. |
| `notifications` | lista e marcação de notificações | Contexto/ações no cliente; provedor/entrega e persistência server-side não estão ligados. |
| `settings` | conta, privacidade, notificações, aparência, bloqueados e segurança | Algumas telas consultam e alteram endpoints de conta/privacidade/sessão; outras preferências são armazenadas localmente. |

## Divisão pessoal e comercial

O front possui subpastas explícitas `modules/profile/personal-profile` e `modules/profile/commercial-profile`, além das telas e tipos compartilhados de perfil. A página comercial e seus campos/componentes estão em componentes próprios; regras de edição foram extraídas para utilitários. Isso atende parcialmente à separação visual por tipo. Há, contudo, ainda uma tela comercial grande (`CommercialProfilePage.tsx`, cerca de 33,7 KB) e uma edição de conta (`settings/screens/Account.tsx`, cerca de 21,3 KB) com estados de formulário e integração na mesma tela. São candidatas de revisão proporcional, não prova automática de código incorreto.

## Integração real com a API

### Fluxos ligados

- login, cadastro, sessão, logout, senha, e-mail, dispositivos e desafios usam `modules/auth/services/*`;
- o usuário/conta e ajustes de privacidade são expostos por `modules/social/services/socialGraphApi.ts` e gerados pelo cliente OpenAPI;
- `useRemoteSocialGraph` consome operações de relação/perfil da API;
- o onboarding possui `modules/onboarding/services/onboardingApi.ts`;
- o proxy de desenvolvimento direciona `/api` ao backend.

### O que ainda não é gravação/remoto

- `modules/social/services/contentService.ts` seleciona `demoContentAdapter` como `contentService` padrão. `modules/social/application/postActions.ts` o usa para `publishPost` e `addComment`.
- `modules/social/services/restContentService.ts` existe, mas não é importado pela ação ativa encontrada; sua presença não equivale a integração.
- likes, reposts, favoritos e atividade são mantidos pelo estado do cliente e/ou armazenamento do navegador. A publicação criada por `addPost` também é apenas dispatch local.
- Seek reviews usam `reviewStorage`/ações locais; as telas de descoberta leem fixtures/exemplos, preferências e salvos no browser.
- Shop possui catálogo demonstrativo e favoritos locais.
- mensagens e notificações são modeladas no estado de interface; não foi encontrado cliente ativo equivalente às rotas de backend para esses domínios.

Essa separação é importante: a UI pode responder e manter estado na sessão/navegador sem que a alteração exista no banco ou esteja sincronizada entre dispositivos.

## Contexto de estado transversal: achado arquitetural

`modules/app/state/SocialApplicationContext.tsx` importa e coordena perfis, relações, publicações, avaliações Seek, mensagens, notificações, bloqueios e estado de atividade. `socialApplicationTypes.ts` expõe todos esses recursos como uma única API de contexto. `socialApplicationState.ts` agrega os reducers de Social, Seek, Messages e Notifications.

Os reducers e ações individuais já estão em pastas de domínio (`modules/social`, `modules/seek`, `modules/messages`, `modules/notifications`), o que reduz duplicação. Porém, os consumidores ficam acoplados a um contexto global chamado Social que funciona como uma fachada para cinco módulos. Isso está em tensão com a regra solicitada de cada lógica no domínio correspondente. Uma correção futura deve separar os providers/stores por domínio sem quebrar regras de bloqueio, privacidade e preview; a auditoria não fez essa alteração.

## Persistência de navegador e dados de demonstração

Persistência browser (`localStorage`/`sessionStorage`) é usada em:

- conta ativa/demo, atividade, relações e pedidos locais;
- preferências de conta/privacidade/aparência/notificações;
- reviews do Seek, itens salvos e filtros/última localização;
- fixtures de demonstração no desenvolvimento.

O comportamento é específico por recurso. Não tratar todos os dados de browser como sessão temporária, nem presumir que qualquer informação demonstrativa sobreviva ao recarregamento. Fixtures de preview são explicitamente carregadas apenas em desenvolvimento; `contentService` produz objetos demonstrativos em memória.

## Design system e tipagem

Há tokens de UI em `src/design/tokens.ts` e CSS em `src/design/tokens.css`, `typography.css` e `utilities.css`; `src/index.css` importa essas folhas. A biblioteca de componentes fica em `src/components/ui`, incluindo `button.tsx`. Isto oferece elementos reutilizáveis, mas ainda existe uma combinação de tokens CSS, aliases Tailwind e variantes de componentes. A fonte de verdade para algumas propriedades precisa ser mantida consistente; não há evidência de que todo estilo do app seja exclusivamente consumido via `tokens.ts`.

## Estrutura, tamanho e notas de manutenção

- `front/src`: 234 arquivos de código fonte nesta contagem; há 65 em `components` e 38 no módulo Social.
- As telas e componentes são majoritariamente organizados por domínio.
- Alguns arquivos de tela são extensos; devem ser revisados por responsabilidade/coesão, não fatiados automaticamente por tamanho.
- `data/mockData.ts` e fixtures são demonstração; o `check-production-demo-content.mjs` verifica marcadores conhecidos no build final, mas não comprova que todos os fluxos remotos estejam implementados.
- A biblioteca de componentes UI possui componentes genéricos reutilizáveis; não foi tratada como lógica de domínio.

## Resultado do build do front

`pnpm run build` concluiu. O Vite gerou bundles para o front e a verificação posterior analisou 96 chunks JS sem encontrar os marcadores de conteúdo demo que ela conhece. A validação é útil para os padrões cobertos por esse script; não prova ausência de todos os dados de demonstração nem integração completa. O preview deve ser verificado separadamente em navegador para cada rota/interação.
