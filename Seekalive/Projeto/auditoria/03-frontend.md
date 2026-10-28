# Front-end e módulos de produto

## Aplicativo e inicialização

`Aplicativo/front` é o pacote `@workspace/social`, construído com React, TypeScript, Vite, Wouter e TanStack Query. O ponto de entrada é `src/main.tsx`; `src/App.tsx` instala provedores, roteamento, tema escuro e escolhe rotas autenticadas ou públicas. As rotas são carregadas de forma lazy.

O roteamento autenticado está em `modules/app/routes/AuthenticatedRoutes.tsx`; o não autenticado em `UnauthenticatedRoutes.tsx`. O app restringe a tela de onboarding até concluir interesses e não transforma falha de verificação de sessão em logout. O preview de dados demonstrativos é protegido por `import.meta.env.DEV`, com faixa visual explícita na tela.

## Revisão estrutural do módulo `app` — 27/10/2026

O módulo possui 23 arquivos TypeScript/TSX. A inspeção de imports locais encontrou um importador para cada arquivo; a análise do frontend inteiro resolveu 730 imports locais em 230 arquivos e não encontrou ciclos. Isso valida a estrutura estática observada, não garante a ausência de todo problema de runtime.

| Área/arquivo                                                                                   | Responsabilidade observada                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                                                                                      | Inicialização dos provedores de UI/consulta, roteador e seleção da árvore autenticada/não autenticada.                                                                                                          |
| `state/AppContext.tsx`                                                                         | Estado de sessão no cliente, consulta/retry de sessão, usuário ativo, logout e estado do preview. É uma composição do fluxo Auth com o modelo de conta exibido no cliente.                                      |
| `routes/AuthenticatedRoutes.tsx`, `routes/UnauthenticatedRoutes.tsx`                           | Registro de rotas e carregamento lazy das páginas pertencentes aos módulos. A composição global de rotas é responsabilidade do app.                                                                             |
| `layouts/*`, `components/RouteLoadingFallback.tsx`                                             | Shell, navegação e feedback de carregamento compartilhados.                                                                                                                                                     |
| `state/SocialApplicationContext.tsx`, `socialApplicationState.ts`, `socialApplicationTypes.ts` | Store cliente composta que liga reducers, seletores e ações já definidos por Social, Seek, Messages e Notifications; hidrata dados de preview somente em desenvolvimento. Não define a persistência do backend. |
| `persistence/*`, `hooks/useAccountScopedIds.ts`                                                | Estado de atividade e listas locais por conta, usado enquanto esses recursos não têm persistência remota completa. Não é fonte confiável de autorização.                                                        |
| `content/*`                                                                                    | Validação e resolução de referências entre publicações, estabelecimentos, eventos e itens Shop. A leitura atual de eventos/Shop é explicitamente de demonstração.                                               |
| `api/*`                                                                                        | Normalização de erros HTTP e erro compartilhado de operação do cliente.                                                                                                                                         |
| `screens/*`                                                                                    | Splash, página não encontrada e guia visual.                                                                                                                                                                    |

**Decisão arquitetural da auditoria inicial:** o provider global foi mantido como composição da aplicação, não como proprietário das regras de cada domínio. Os reducers, seletores e fábricas de ações estão nos módulos Social, Seek, Messages e Notifications; a composição os conecta à sessão e ao preview. Portanto, mover ou duplicar essas regras dentro de `app` seria incorreto, e extrair agora vários providers exigiria migrar consumidores e contratos sem evidência de que a composição atual altere o comportamento.

**Correção estrutural concluída em 27/10/2026:** removido `layouts/AppLayout.tsx`, que somente encaminhava `children` a `AppShell` sem adicionar configuração ou comportamento. `AuthenticatedRoutes.tsx` agora usa `AppShell` diretamente para as rotas de largura padrão; as rotas que já definiam `fullWidth` continuam iguais. A busca por `AppLayout` confirmou que seu único consumidor era o roteador autenticado. Nenhuma rota, provider, navegação ou classe visual foi alterada. A revisão estrutural do módulo `app` foi concluída conforme os critérios desta etapa; o campo de busca visual de Shop é uma pendência funcional do domínio Shop, já registrada para aquela etapa.

**Verificação da correção estrutural:** `rg -n 'AppLayout' Aplicativo/front/src Aplicativo/front/tests` não encontrou referências. `pnpm exec prettier --check Aplicativo/front/src/modules/app/routes/AuthenticatedRoutes.tsx`, `pnpm test` e `pnpm build` passaram. O conjunto de testes inclui 63 testes frontend, as suítes `security-boundaries` (8), `db-connection` (7), `api-runtime` (6), fronteiras de backend (23) e testes de aplicação por injeção (126), sem falhas. O build passou no typecheck dos workspaces e validou 96 chunks do frontend sem marcadores de conteúdo demonstrativo conhecidos. O workflow reiniciou e a rota inicial `/` exibiu a página pública; o estado autenticado com `AppShell` não foi verificado visualmente. `git diff --check` não foi executado; a proteção do ambiente já havia bloqueado esse comando e não foi contornada.

O contexto oferece uma API ampla (`useSocial`) aos consumidores de vários domínios; seu objeto de valor é reconstruído quando o provider renderiza, então uma mudança pode atualizar consumidores que usam partes não relacionadas. Isso é um risco de acoplamento/renderização confirmado pela forma de consumo, mas não há medição que demonstre impacto visível. Fica para revisão de cada consumidor no seu domínio e, se necessário, medição de renderização; não foi tratado como defeito provado nem escondido com uma divisão cosmética.

As leituras de `localStorage` normalizam estado corrompido para listas/objetos vazios; gravações sem sucesso emitem `console.warn`. Essa persistência é local e não autoritativa. Ela pode perder estado de demonstração/atividade neste navegador; não substitui nem autoriza operações do backend. O teste de fronteira confirmou sessão indisponível distinta de sessão encerrada e os testes sociais cobrem preview, privacidade, bloqueios e persistência local por conta.

**Limite funcional encontrado na fronteira com Shop:** `AppShell.tsx` exibe campo “Buscar produtos, serviços, ofertas e lojas...” em `/shop`, mas o input não tem estado, evento de busca nem submissão. Ele é apenas visual e não pode ser contado como busca implementada. Não o removi nem alterei nesta etapa para preservar o layout; será tratado quando o domínio Shop for auditado, definindo se deve ser ligado à busca existente ou retirado.

`screens/StyleGuide.tsx` contém exemplos estáticos de componentes, não funcionalidades de feed. A prévia da navegação inferior estava divergente do componente real (ícone de lupa no Seek e menu ausente); foi alinhada ao menu, Social, Criar, pin do Seek e Shop. Isso altera somente a referência visual do guia, não a navegação executada.

**Validação deste recorte:** após esse ajuste, `pnpm test:social` passou (60/60) e `pnpm --filter @workspace/social run typecheck` passou. O build de todos os workspaces da etapa anterior passou antes desta mudança visual; o build completo será repetido nesta etapa final. Não foram alterados contratos, rotas ou comportamento funcional da barra inferior.

## Mapa de módulos em `src/modules`

| Módulo          | Responsabilidade visível                                                                                        | Estado de integração                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `app`           | rotas, shell/layout, contexto da aplicação, persistência local auxiliar, resolução de referências e erros de UI | Raiz de composição do estado cliente; regras específicas permanecem nos módulos proprietários.                           |
| `auth`          | login, cadastro, confirmação de e-mail, recuperação de senha, sessão, dispositivos e chamadas HTTP              | Integrado à API para os fluxos implementados; depende da API e de cookie/CSRF.                                           |
| `onboarding`    | seleção de interesses e sugestões                                                                               | Há serviço e telas; leitura/escrita de interesses vai para a API quando sessão é remota.                                 |
| `profile`       | perfil público, edição, conexões e submódulos pessoal/comercial                                                 | Consulta e edição de conta usam API em sessão remota; o preview tem fixtures.                                            |
| `social`        | feed, busca, publicação, conteúdo, relações, bloqueio, círculo e comentários                                    | Relações usam API quando remoto; várias interações/publicações continuam locais/demonstrativas.                          |
| `seek`          | descoberta, localização, eventos e avaliações                                                                   | Descoberta e persistência demonstrativa ficam principalmente no cliente; não há backend Seek completo no estado atual.   |
| `shop`          | vitrine, item e salvos                                                                                          | Há telas e fixtures; operações reais de loja/checkout não foram conectadas.                                              |
| `messages`      | conversas, detalhe e regras de estado da interface                                                              | Contexto/ações disponíveis no cliente; API de mensagens não está ativa.                                                  |
| `notifications` | lista e marcação de notificações                                                                                | Contexto/ações no cliente; provedor/entrega e persistência server-side não estão ligados.                                |
| `settings`      | conta, privacidade, notificações, aparência, bloqueados e segurança                                             | Algumas telas consultam e alteram endpoints de conta/privacidade/sessão; outras preferências são armazenadas localmente. |

## Auditoria estrutural do módulo `auth` — 27/10/2026

O inventário inicial continha 13 arquivos TypeScript/TSX e 1.895 linhas. A separação entre telas, chamadas HTTP, estado da sessão e tipos estava explícita. O fluxo usa cookies (`credentials: "include"`), busca token CSRF antes de POST/DELETE e mantém a distinção entre sessão encerrada e API indisponível. Não foi executado cadastro/login real nem disparado e-mail durante a auditoria.

| Arquivo | Responsabilidade observada |
|---|---|
| `screens/Login.tsx` (565 linhas) | Login, senha antiga que exige atualização, desafio de nova instalação, reenvio/código, suporte em conta bloqueada e preview de desenvolvimento. |
| `screens/Register.tsx` (542 linhas) | Formulário pessoal/comercial, validação local, montagem do payload e envio para confirmação de e-mail. |
| `screens/VerifyEmail.tsx` (179 linhas) | Entrada do e-mail e código, confirmação e reenvio; o e-mail pendente fica em memória e pode ser informado novamente após recarga. |
| `screens/ForgotPassword.tsx` (247 linhas) | Solicitação, confirmação por código, definição da nova senha e sucesso, com resposta que não revela se o e-mail existe. |
| `modules/app/api/httpClient.ts` | Cliente HTTP compartilhado, cookies, token CSRF e conversão do contrato de erro para `ApiRequestError`; consumido por Auth, Social e Onboarding. Movido para fora de Auth em 27/10/2026. |
| `services/loginApi.ts` | Login, confirmação/reenvio do desafio de dispositivo e atualização de política de senha. |
| `services/registrationApi.ts` | Envio do cadastro. |
| `services/emailVerificationApi.ts` | Confirmação e reenvio do código de e-mail. |
| `services/passwordApi.ts` | Solicitação e confirmação de recuperação de senha. |
| `services/sessionApi.ts` | Sessão corrente, logout, listagem/revogação de sessões e dispositivos confiáveis. |
| `services/accountSecurityApi.ts` | Mudança de e-mail e senha autenticada, consumida pelas telas de Configurações. |
| `state/authSessionState.ts` | Converte carregamento de sessão em autenticado, encerrado ou indisponível. |
| `types.ts` | DTOs e tipos usados pelos fluxos de autenticação e cadastro. |

### Achados e limites verificados

1. **Contrato HTTP e validação runtime de Auth — corrigidos em 27/10/2026.** As 24 operações Auth implementadas estão descritas em `shared/api-spec/openapi.yaml`; os clientes foram regenerados. Os serviços de Auth passam schemas compartilhados e status HTTP esperados ao transporte comum. O login `202` usa um schema Zod compartilhado manualmente porque Orval não o gera junto com o schema da resposta `200`. A implementação e as verificações constam na seção “Contrato Auth e validação runtime” de `04-contratos-documentacao-e-validacoes.md`.
2. **Validação genérica do transporte continua opcional fora dos serviços que fornecem contrato.** `httpClient.ts` agora rejeita explicitamente status/payload inválidos quando recebe mapa de schemas, e todos os serviços Auth o fornecem. Outros consumidores — incluindo Onboarding — ainda precisam adotar contratos de resposta próprios; sem um contrato, a compatibilidade de JSON permanece tipada pelo chamador e não validada em runtime.
3. **Documentos legais ainda não estão ligados ao cadastro.** `application/registrationPayload.ts` envia `acceptedTermsVersion: "v1"`; “Termos de Serviço” e “Política de Privacidade” continuam texto, não links, porque os documentos oficiais não foram aprovados/fornecidos. A semântica do checkbox foi corrigida em 27/10/2026: o controle tem rótulo associado, nome acessível e suporte a teclado; o conteúdo legal não foi inventado.
4. **Nomes acessíveis nos seis campos OTP de e-mail — corrigido em 27/10/2026.** Cada campo em `VerifyEmail.tsx` agora tem nome individual com o número do dígito. A jornada Playwright localiza e preenche os seis campos por seus nomes acessíveis, protegendo essa regressão sem alterar o protocolo.
5. **Responsabilidade concentrada nas telas — corrigida em 27/10/2026.** A extração estrutural descrita abaixo retirou dos componentes de tela a orquestração dos fluxos de login, desafio de instalação, atualização obrigatória de senha e cadastro pessoal/comercial. Não houve alteração intencional das regras de negócio ou dos contratos.
6. **Fronteira de transporte compartilhado — corrigida em 27/10/2026.** `modules/social/services/socialGraphApi.ts`, `modules/onboarding/services/onboardingApi.ts` e os serviços de Auth agora importam o cliente de `modules/app/api/httpClient.ts`, não de Auth. O cliente é propriedade da API comum do aplicativo, e Auth mantém apenas os serviços dos seus próprios fluxos. Endpoints, cabeçalhos, cookies, payloads e tratamento de sessão foram preservados.
7. **“Salvar senha” é apenas uma dica ao navegador.** O checkbox no Login alterna o atributo `autoComplete` entre `current-password` e `off`; a aplicação não salva a senha. O texto diz que o gerenciador do navegador é responsável, mas esse atributo é uma solicitação ao navegador e não garante que ele vá persistir a credencial.
8. **Cobertura frontend é limitada para integração real.** Há testes unitários do cliente HTTP/contratos, três testes de validação/montagem do cadastro e cinco jornadas de navegador com a API de Auth interceptada por respostas determinísticas. Os testes de navegador cobrem o fluxo cliente, não a integração com o backend, banco ou provedor de e-mail. A cobertura de reenvio, limites de tentativa e recuperação também não é uma jornada real de ponta a ponta.

**Controles observados:** os segredos não são armazenados no estado do app; requisições usam origem relativa e `credentials: "include"`; os schemas compartilhados cobrem política de senha, cadastro/idade, username e recuperação; o login não libera conta não verificada e apresenta desafio para instalação não reconhecida; a recuperação evita indicar se um e-mail está cadastrado. A validação autoritativa e a proteção contra abuso permanecem responsabilidade do backend.

### Correção estrutural do transporte — 27/10/2026

`auth/services/http.ts` foi removido após verificar todos os consumidores. O transporte comum agora fica em `app/api/httpClient.ts`, ao lado de `apiErrors.ts`, e os consumidores de Auth, Social e Onboarding foram atualizados. A classe interna de erro foi renomeada de `AuthApiError` para `ApiRequestError`, pois representa respostas da API em todos esses domínios. Nenhuma URL, regra de CSRF, método HTTP, cookie, formato de resposta ou tratamento de erro foi intencionalmente alterado. Foram adicionados três testes diretos para POST com CSRF, GET/DELETE e propagação dos metadados de erro.

**Validação desta correção:** `pnpm test` passou; `pnpm build` e typecheck de todos os workspaces passaram; Prettier e busca por importações antigas passaram. Os três testes novos validam o transporte isoladamente, mas não substituem jornadas reais de login/cadastro nem validam estruturalmente os corpos de sucesso. Naquele momento, a revisão estrutural de Auth ainda aguardava a separação de Login e Cadastro; o estado atualizado está na seção seguinte.

**Validação disponível:** `pnpm test:social` passou (60/60), incluindo `authSessionState.test.ts` e `contracts.test.ts`; typecheck e build completos passaram no estado atual. Não foi feita verificação visual/interativa dos formulários nem chamada a e-mail ou cadastro real. A melhoria/correção dos achados ficará para a fase posterior de correções solicitada pelo usuário.

### Separação estrutural de Login e Cadastro — 27/10/2026

As telas agora compõem responsabilidades do domínio Auth em vez de concentrá-las:

| Arquivo/módulo | Responsabilidade |
| --- | --- |
| `application/loginFormSchema.ts` | Schemas de credenciais e atualização obrigatória de senha. |
| `application/useLoginSubmission.ts` | Submissão de credenciais e despacho dos resultados: conta autenticada, desafio de instalação, troca obrigatória ou e-mail não confirmado. |
| `application/useDeviceLoginChallenge.ts` | Estado e operações do desafio de instalação: confirmar código, reenviar, temporizador, erros e cancelamento. |
| `application/usePasswordPolicyUpdate.ts` | Troca obrigatória, confirmação por e-mail e novo login após a alteração. |
| `components/login/LoginCredentialsForm.tsx` | Campos de usuário/e-mail, senha, visibilidade, opção do gerenciador do navegador e acesso à recuperação. |
| `components/login/DeviceLoginVerificationPanel.tsx` | Apresentação e entrada do código de novo dispositivo/instalação. |
| `components/login/PasswordPolicyUpdateForm.tsx` | Formulário da nova senha e confirmação local. |
| `components/login/PasswordUpdateVerificationPanel.tsx` | Entrada do código para confirmar a troca de senha. |
| `application/registrationFormSchema.ts` | Regras client-side do cadastro, incluindo campos condicionais pessoal/comercial. |
| `application/registrationPayload.ts` | Normalização permitida e montagem dos payloads discriminados de cadastro pessoal/comercial. |
| `components/registration/RegistrationAccountTypeField.tsx` | Seleção pessoal/comercial. |
| `components/registration/PersonalRegistrationFields.tsx` | Nome e sobrenome da conta pessoal. |
| `components/registration/CommercialRegistrationNameField.tsx` | Nome público da empresa/prestador. |
| `components/registration/CommercialRegistrationFields.tsx` | Categoria, tipo de presença no Seek e endereço comercial. |
| `components/registration/RegistrationAgeField.tsx` | Coleta privada da idade e rótulo condicional do responsável comercial. |
| `components/registration/RegistrationIdentityFields.tsx` | @ e e-mail compartilhados entre os tipos de conta. |
| `components/registration/RegistrationCredentialsFields.tsx` | Senha, exibição da senha e confirmação. |
| `components/registration/RegistrationTermsField.tsx` | Apresentação do aceite já existente. |
| `screens/Login.tsx` / `screens/Register.tsx` | Composição da tela, navegação, feedback e conexão entre os componentes e os casos de uso. |

O formulário preserva a ordem visual anterior dos campos, os valores iniciais, validações, mapeamento de payload, chamadas e rotas. O esquema não passou a aceitar um @ inicial: isso não era permitido pela regra existente. A atualização obrigatória da senha continua exigindo a credencial atual e confirmação de e-mail; a confirmação de novo dispositivo continua com tentativas/reenvio e bloqueio conforme resposta da API. As operações de e-mail continuam ligadas aos serviços existentes.

**Verificações executadas:** `pnpm test` passou integralmente, incluindo 69 testes frontend e todas as suítes de backend/limites; `pnpm --filter @workspace/social typecheck` passou; `pnpm build` passou em todos os workspaces com typecheck e checagem de conteúdo demonstrativo; Prettier passou nos arquivos alterados. As páginas públicas Login e Cadastro foram conferidas no preview a 402×874 e 1365×900; os registros do navegador mostraram apenas conexão Vite e a informação do React DevTools. Não foi feita interação com credenciais, desafio de instalação, envio de e-mail ou cadastro real.

**Limite residual:** a verificação `git diff --check` não foi executada porque a proteção do workspace bloqueou o acesso ao índice Git; isso não foi contornado. Os achados 1, 2 e 4 foram atualizados/corrigidos nas seções abaixo; permanecem os achados 3 e 7–8, além da integração real com API/banco/e-mail ainda não demonstrada. Os cinco testes browser/client com API simulada não substituem essa integração. O corte estrutural de Login/Cadastro está concluído; não se declara o domínio Auth inteiro pronto para produção nem se inicia outro domínio nesta etapa.

### Jornadas de Auth no navegador — 27/10/2026

Foi criado um conjunto Playwright separado da suíte padrão, executado por `pnpm --filter @workspace/social run test:e2e:auth`. Requer o workflow `Start application` ativo e Chromium; no Replit usa `/repl/tools/bin/chromium`, com possibilidade de configurar `SEEKALIVE_CHROMIUM_EXECUTABLE_PATH`. `SEEKALIVE_WEB_URL` é restrito a localhost/loopback para impedir que o teste aponte a produção. Todas as requisições `/api/v1/**` são interceptadas: sessão e CSRF têm respostas de teste, endpoints não configurados retornam 501 e são registrados. Uma segunda regra aborta origens externas; o único host externo observado foi `fonts.googleapis.com`, referenciado em `index.html` para Inter. Logo, a tipografia do teste usa fallback e não valida o carregamento remoto.

As cinco jornadas verificadas no navegador foram:

1. Cadastro pessoal, normalização do e-mail, submissão do código e encaminhamento ao onboarding após confirmação.
2. Cadastro comercial, seleção condicional de categoria/tipo/endereço e envio do payload próprio.
3. Login em instalação conhecida até o Feed.
4. Login em instalação não reconhecida, apresentação do desafio e acesso somente após confirmar o código.
5. Atualização obrigatória da senha, confirmação por e-mail, novo login com a senha alterada, desafio de instalação não reconhecida e acesso somente após a segunda confirmação.

**Validação executada:** `pnpm --filter @workspace/social run test:e2e:auth` passou (5/5); `pnpm test` passou (69 testes frontend e todas as suítes backend/limites); `pnpm build` passou, incluindo typecheck e verificação dos 96 chunks; `pnpm audit` informou zero vulnerabilidades conhecidas; as varreduras de dependências, SAST e HoundDog terminaram sem achados. Playwright `1.64.1` foi adicionado apenas a `devDependencies`; metadados do registro confirmam licença Apache-2.0 e repositório Microsoft. Não houve envio de e-mail real nem acesso a um banco.

**Não verificado:** uma jornada integrada front-end → backend → banco; entrega e confirmação com Resend real; reenvio e cooldown observados no navegador; recuperação de senha completa. Os testes existentes do backend exercitam separadamente regras e dependências injetadas; não são prova dessas integrações. A API simulada é uma fronteira intencional deste teste, não uma afirmação de que tais integrações passaram.

### Contrato Auth e validação runtime — 27/10/2026

As 24 operações Auth implementadas foram adicionadas ao contrato OpenAPI integrado, elevando o total de 30 para 49 operações. Os clientes Zod e React foram regenerados. Os serviços Auth agora validam respostas por status e schema no limite HTTP: `200`/`202` têm formatos explícitos e `204` exige resposta vazia. `ApiResponseContractError` falha de forma segura quando status ou corpo não respeita o contrato. A resposta de login `202` permanece em schema Zod compartilhado manual porque o Orval gera o schema Zod do `200`, mas não a resposta adicional; o tipo do cliente React contém a união dos dois resultados.

**Verificações reais:** `pnpm --filter @workspace/api-spec run codegen`, `pnpm -w run typecheck:libs`, `pnpm test` (72 testes frontend e todos os demais grupos do workspace), `pnpm --filter @workspace/social run test:e2e:auth` (5/5), `pnpm build` e screenshot de `/login` em 402×874 passaram. A primeira execução das jornadas falhou em quatro fluxos porque IDs textuais dos fixtures contrariavam o contrato UUID; os dados de teste foram alinhados a UUID, sem flexibilizar schemas, e a repetição passou. O preview mostrou a tela pública de login; console sem erros de aplicação. As verificações usam API simulada e não comprovam backend, banco ou entrega de e-mail reais.

### Acessibilidade dos campos OTP de e-mail — 27/10/2026

Cada um dos seis campos da confirmação de e-mail agora expõe nome acessível distinto por meio de `aria-label`, informando a posição do dígito. A alteração não muda o layout, o protocolo de seis dígitos, a validação, o foco automático ou as chamadas de API. O teste Playwright passou a localizar e preencher cada posição com `getByLabel`, comprovando o nome acessível no navegador.

**Verificações:** `pnpm --filter @workspace/social run test:e2e:auth` passou (5/5); `pnpm build` passou com typecheck do frontend e demais workspaces. Isso comprova o nome acessível nos campos cobertos, não conformidade integral WCAG nem uma avaliação com leitor de tela.

### Semântica acessível do aceite — 27/10/2026

`RegistrationTermsField.tsx` deixou de colocar um botão com `role="checkbox"` dentro de outro `label`. Agora usa o componente de checkbox do design system com `FormControl` e `FormLabel`, associação entre controle e rótulo, foco por teclado e atualização do mesmo campo booleano `terms` no React Hook Form. O teste Playwright encontra o checkbox pelo nome acessível, ativa com Espaço e confirma `aria-checked=true`. Uma descrição não visual informa que o aceite é obrigatório. Os nomes dos documentos permanecem texto sem links reais, e as partes coloridas não simulam mais uma ação de clique; os links só poderão ser adicionados quando houver conteúdo oficial aprovado.

**Verificações reais:** a jornada E2E de cadastro pessoal valida nome acessível e ativação por teclado; a jornada comercial ativa o mesmo controle por seu rótulo. `pnpm --filter @workspace/social run typecheck`, `pnpm --filter @workspace/social run test:e2e:auth` (5/5), `pnpm test` (72 testes frontend e todas as demais suítes) e `pnpm build` passaram. O screenshot full-page do cadastro em 402×874 confirmou que a organização visual foi preservada. Não foi feita avaliação com leitor de tela.

**Risco de privacidade externo identificado:** navegadores de usuários que abrem a página fora deste teste podem solicitar a fonte ao Google Fonts e expor ao provedor metadados de conexão, como IP e agente do navegador. O teste bloqueia essa solicitação; a interface de produção não foi alterada. Antes de lançamento, decidir entre hospedar a fonte localmente ou aprovar explicitamente o carregamento externo.

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
- mensagens e notificações são modeladas no estado de interface; não foi encontrado cliente ativo para esses domínios. Há uma divergência documental específica de mensagens descrita na auditoria do módulo abaixo.

Essa separação é importante: a UI pode responder e manter estado na sessão/navegador sem que a alteração exista no banco ou esteja sincronizada entre dispositivos.

## Contexto de estado transversal: composição e risco de acoplamento

`modules/app/state/SocialApplicationContext.tsx` importa e coordena perfis, relações, publicações, avaliações Seek, mensagens, notificações, bloqueios e estado de atividade. `socialApplicationTypes.ts` expõe todos esses recursos como uma única API de contexto. `socialApplicationState.ts` agrega os reducers de Social, Seek, Messages e Notifications.

Os reducers, ações e políticas específicas permanecem nos módulos proprietários; o provider fica no app como raiz de composição cliente. Não há ciclos de importação entre arquivos no grafo resolvido desta auditoria. A API compartilhada permanece ampla e pode ampliar rerenderizações; não há profiling que demonstre impacto. Os próximos módulos devem continuar usando operações do seu domínio e evitar acrescentar novas regras específicas ao provider global. A extração de contextos separados só será justificada por uma necessidade funcional ou evidência de desempenho, não pela contagem de arquivos.

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

## Auditoria estrutural do módulo `messages` — 27/10/2026

Foram inspecionados os oito arquivos e as 512 linhas TypeScript/TSX do domínio, a composição no `SocialApplicationContext`, os bloqueios, as preferências de mensagens, os testes e os contratos/API encontrados. Nenhum código funcional foi alterado nesta etapa.

| Arquivo | Responsabilidade observada |
|---|---|
| `screens/Messages.tsx` (120 linhas) | Lista conversas do usuário, filtra por nome/@, exibe contagem não lida e navega ao detalhe. |
| `screens/MessageDetail.tsx` (188 linhas) | Renderiza mensagens, marca leitura ao abrir, permite texto até 5.000 caracteres e apresenta falha de envio. |
| `application/messageActions.ts` (73 linhas) | Cria ações locais de leitura/envio, consulta preferência de mensagem do destinatário e regra de Círculo mútuo. |
| `application/messageValidation.ts` (27 linhas) | Valida sessão, existência/participação na conversa, texto não vazio e limite; monta mensagem local com ID/data. |
| `application/selectVisibleMessages.ts` (44 linhas) | Restringe conversas ao participante, filtra bloqueios e projeta estado de leitura. |
| `state/messageReducer.ts` (43 linhas) | Atualiza conversas/mensagens em memória e ignora IDs duplicados ou remetentes fora da conversa. |
| `types/conversation.ts` e `types/message.ts` | Tipos locais de conversa, participantes, última mensagem, contagem e mensagem textual. |

### Achados e limites verificados

1. **Envio e leitura não são persistidos no servidor.** `sendMessage` monta uma mensagem com `makeDemoMessage` e executa `dispatch({type: "SEND_MESSAGE"})`; o reducer atualiza somente o estado React. O estado inicial começa sem conversas/mensagens e fixtures são hidratadas no desenvolvimento. Não há serviço frontend de mensagens conectado a API. Mensagens enviadas se perdem ao recarregar; recibos de leitura são armazenados separadamente em `localStorage` por conta. A tela não identifica a conversa/mensagem como demonstrativa, portanto a interface não deve ser interpretada como confirmação de entrega remota.
2. **Divergência entre documentos de API e implementação.** `docs/api/backend/openapi.json` lista `GET/POST /v1/conversations`, leitura/exclusão de conversa, listagem/envio de mensagens e marcação de leitura. Não existe módulo `messages` entre os domínios do backend (`accounts`, `auth`, `feed`, `health`, `onboarding`, `profiles`, `social`); não foram encontrados handlers/rotas correspondentes. `shared/api-spec/openapi.yaml` contém a preferência `messages`, mas não os endpoints de conversa; o cliente frontend gerado também não expõe operações de mensagens. Portanto, a documentação JSON não é evidência de backend implementado e sua origem/atualidade precisa ser reconciliada antes da integração.
3. **Bloqueio remoto não chega ao seletor de conversas.** `selectVisibleMessages` recebe `blockedAccountIds`, derivado no provider de `readAccountScopedIdsMap` do navegador. Na sessão remota, `useRemoteSocialGraph` mantém a lista autoritativa em `remoteBlockedUserIds`, separada; essa lista não é fornecida ao seletor. Hoje não há mensagens remotas a filtrar, então não foi demonstrada exposição de uma conversa real. A integração futura precisa usar a relação de bloqueio autoritativa para ocultar mensagens antigas e impedir novos envios, conforme regra aprovada; a regra funciona com o estado local de demonstração.
4. **Ação “nova mensagem” não tem comportamento.** O botão de edição em `Messages.tsx` não possui `onClick`, texto ou nome acessível. Não há fluxo de criação de conversa/seleção de destinatário iniciado por ele. Isso é uma capacidade ausente, não um problema de envio dentro de conversa existente.
5. **Acessibilidade incompleta na lista.** O botão de nova mensagem não tem nome acessível e o campo de busca não tem rótulo programático. O campo de texto e os botões desabilitados de anexo/emoji na tela de detalhe possuem rótulos acessíveis.
6. **Responsabilidade e acoplamento entre domínios.** `messageActions.ts` importa diretamente `getPrivacyPreferences` de `settings/data` e `areMutualFollowers` de `social/domain`. A regra de Círculo usa a relação mútua aprovada, mas a preferência do destinatário é lida de armazenamento local, sem autoridade remota. Essa implementação é adequada apenas ao estado de demonstração; a futura política de mensagens deve receber dados remotos/autoridade do servidor sem duplicar a regra de seguimento.
7. **Estado de leitura redundante.** `messageActions.markConversationRead` atualiza os IDs de leitura em `AccountActivity` no navegador; o seletor usa esses IDs para a interface. Embora o reducer também declare `MARK_CONVERSATION_READ`, não há chamada que despache essa ação no fluxo atual. O ramo do reducer não participa do caminho observado e deve ser reavaliado na fase de melhorias, sem removê-lo durante a auditoria.
8. **Comentário contradiz o código.** `MessageDetail.tsx` descreve um efeito como simulação de digitação da outra pessoa, mas o efeito apenas rola a lista até a mensagem mais recente. Não há indicador de digitação implementado.
9. **Escopo de conversa ainda não está definido pelo contrato.** O tipo permite vários `participantIds`, a ação aplica políticas a todos os destinatários e a tela apresenta somente a primeira outra conta. O código não prova que conversas em grupo sejam um requisito suportado. A auditoria não escolhe entre mensagens individuais e grupo; o contrato de backend precisa explicitar isso antes de implementar criação/envio persistente.

### Regras e controles observados

- Validação local exige usuário, conversa existente, remetente participante e conteúdo não vazio de até 5.000 caracteres; o texto é aparado antes de criar a mensagem.
- Ações de leitura são ignoradas quando a conversa não está visível para o ator.
- A seleção local oculta conversas quando outro participante está no conjunto indisponível; testes existentes verificam o bloqueio por inspeção estática do seletor.
- `messages: "nobody"` impede envio; `messages: "circle"` exige seguimento mútuo. Isso usa preferências de navegador e não substitui validação/autorização server-side.
- A renderização de conteúdo textual passa pelo escape padrão do React; a tela não interpreta o texto como HTML.

### Cobertura de testes

`tests/content.test.ts` cobre criação/trim de mensagem, vínculo remetente/conversa, texto vazio e rejeição de IDs duplicados no reducer. Outro teste confere por correspondência de código que o seletor inclui a relação de bloqueio. Não foram encontrados testes de componente/E2E para lista, criação de conversa, busca, envio visível, leitura, política de destinatário, bloqueio remoto, falha de rede ou persistência/sincronização. Os testes atuais exercitam apenas o caminho local e não validam endpoints de mensagens.

**Resultado da etapa:** o módulo está separado em telas, aplicação, estado e tipos, sem arquivo monolítico ou reexport artificial observado. A limitação central é de integração: mensagens são demonstração em memória, embora exista um artefato OpenAPI backend com rotas que não aparecem na implementação nem no contrato compartilhado. Os achados ficam registrados para a fase de melhorias; nenhum contrato, regra ou tela foi alterado. A suíte social já executada nesta rodada geral passou em 60/60; não foi reexecutada durante esta inspeção, pois nenhum código foi modificado.

## Auditoria estrutural do módulo `notifications` — 27/10/2026

Foram inspecionados os cinco arquivos e as 239 linhas TypeScript/TSX do domínio, seu reducer/ações/seletor, a tela, estado global, fixtures, testes e referências de API. Nenhum código funcional foi alterado nesta etapa.

| Arquivo | Responsabilidade observada |
|---|---|
| `screens/Notifications.tsx` (141 linhas) | Lista notificações, filtra por abas, marca uma ou todas como lidas e monta texto/ícone por tipo. |
| `application/notificationActions.ts` (30 linhas) | Marca IDs visíveis como lidos na atividade local da conta. |
| `application/selectVisibleNotifications.ts` (33 linhas) | Filtra por destinatário, bloqueio de ator/publicação e projeta leitura local/preview. |
| `state/notificationReducer.ts` (26 linhas) | Reduz ações de leitura diretamente no estado de notificações. |
| `types/notification.ts` | Define os tipos de evento e os campos de destinatário, ator, recurso, leitura e data. |

### Achados e limites verificados

1. **Notificações são apenas estado de interface.** A lista inicial é vazia; fixtures são hidratadas em desenvolvimento. Ações de leitura atualizam `AccountActivity` no `localStorage`, sem serviço frontend ou sincronização remota. No inventário do backend não há módulo `notifications`; nenhum endpoint equivalente consta no OpenAPI compartilhado.
2. **Divergência documental de API.** `docs/api/backend/openapi.json` lista consulta de notificações, marcação individual/em lote, preferências e inscrição/cancelamento de push. Não há módulo correspondente no backend; `shared/api-spec/openapi.yaml` não define essas operações e o frontend não possui cliente de notificações. O JSON não comprova implementação; é necessário reconciliar fonte e versão antes de ligar a tela. O achado se soma à divergência de mensagens, ambos documentados no item de contratos.
3. **Entrada na página tenta marcar tudo como lido automaticamente.** Um efeito agenda `markAllNotificationsRead` após três segundos, independentemente de o usuário ter visto todas ou estar em outra aba. A ação marca todas as notificações visíveis, não apenas as exibidas no filtro atual. Além disso, o efeito usa dependências vazias e captura a ação da primeira renderização; se a lista mudar/hidratar antes do timer, a ação pode usar uma lista antiga. É um comportamento e risco de dados/UX observáveis, sem requisito aprovado que o justifique.
4. **A linha não abre o conteúdo relacionado.** O clique em uma notificação somente chama `markNotificationRead`; não há navegação para o perfil/publicação/recurso indicado por `entityId`. O elemento é um `motion.div` com `onClick`, sem semântica de botão/link nem suporte de teclado.
5. **O modelo de evento é mais restrito que o domínio social.** `Notification["type"]` aceita apenas `follow`, `like`, `comment`, `repost` e `mention`. Não representa pedidos/aceites do Círculo, mesmo que sejam eventos distintos no domínio social. A auditoria não define novos tipos nem decide quais eventos devem gerar notificação; isso precisa ser especificado antes do contrato de entrega.
6. **Filtros e texto não cobrem necessariamente o mesmo conjunto.** “Reações” inclui apenas curtidas e reposts; comentários aparecem somente em “Todas”. A intenção dessa classificação não está formalizada. O texto para ator (`actorName`) é passado a `notifText` mas não é usado dentro da função.
7. **Leitura duplicada em estado e armazenamento.** As ações públicas atualizam somente os IDs no armazenamento de atividade. O reducer declara `MARK_ALL_NOTIFICATIONS_READ` e `MARK_NOTIFICATION_READ`, mas a busca de referências não encontrou despacho dessas ações. O caminho visível atual usa `selectVisibleNotifications` com os IDs locais; os ramos do reducer não participam desse fluxo.
8. **Bloqueios remotos não são aplicados pelo seletor de notificações.** O seletor recebe `blockedAccountIds` da projeção local de armazenamento, enquanto a lista de bloqueados do usuário autenticado é mantida separadamente no estado remoto. Como não há entrega remota de notificações implementada, não foi demonstrada exposição de uma notificação real; antes da integração, o filtro deve consumir estado autoritativo do servidor e atender à regra aprovada de bloqueio.

### Cobertura de testes

O teste existente verifica estaticamente que o seletor contém um filtro para ator bloqueado e confirma que fixtures usam tipos aceitos por uma lista permitida mais ampla. Não foram encontrados testes de componente/E2E para carregamento, abas, clique/teclado, marcação de leitura, timer, estado após recarga, bloqueio remoto, navegação ao recurso ou endpoints. Nenhuma validação de entrega de e-mail/push foi feita nesta etapa.

**Resultado da etapa:** a separação por tela, aplicação, estado e tipo é legível, mas reducer e persistência local duplicam conceitos de leitura sem o reducer ser usado pelo fluxo atual. O produto ainda não tem serviço remoto de notificações; o timer automático, a interação sem semântica acessível e a ausência de navegação são comportamentos/incompletudes registrados para correção posterior. Não alterei código, contratos ou regra de notificação.

## Auditoria estrutural do módulo `onboarding` — 27/10/2026

Foram inspecionados os três arquivos do domínio (261 linhas), os três passos de interesses, as rotas e redirecionamentos, a adaptação de conta, a API de persistência e os contratos/aplicação backend diretamente relacionados. Nenhum código funcional foi alterado.

| Arquivo | Responsabilidade observada |
|---|---|
| `screens/Interests.tsx` (152 linhas) | Wizard de três etapas, seleção de interesses, pular/concluir e envio para persistência remota. |
| `screens/Suggestions.tsx` (104 linhas) | Sugere até seis usuários do contexto e permite seguir/solicitar seguimento. |
| `services/onboardingApi.ts` (5 linhas) | Envia interesses e opção de pular para `POST /onboarding/interests` usando o transporte genérico compartilhado de Auth. |
| `src/data/onboardingInterestSteps.ts` | Fonte de conteúdo das três etapas e de suas 22 opções, fora da pasta do domínio. |

### Achados e limites verificados

1. **O fluxo principal de conclusão está ligado à API existente.** Login e confirmação de e-mail direcionam contas não concluídas a `/onboarding/interests`. A tela exige usuário, redireciona contas já concluídas e permite salvar ou pular. Para sessão remota, envia a escolha ao endpoint; para preview de desenvolvimento, altera somente o usuário local. O backend valida sessão/CSRF, persiste interesses e marca a conclusão em transação.
2. **A tela tem três etapas, não três rotas independentes.** As três perguntas/opções diferentes e a barra “Passo X de 3” são estados sequenciais de um único componente/rota `Interests.tsx`. Visualmente o usuário percorre três passos; não foram criadas três páginas isoladas. A auditoria não altera esse desenho.
3. **Os interesses não são recuperados no cliente depois da sessão inicial.** O cadastro localiza as escolhas no backend, mas o retorno de conclusão contém apenas `onboardingCompleted` e `interestCount`. O DTO de sessão/conta não inclui interesses, e `AppContext.toUser` inicializa `interests: []`. Após novo carregamento, o frontend não dispõe de uma leitura de interesses para alimentar personalização; não se afirma que os dados persistidos tenham sido apagados.
4. **A taxonomia aceita mais valores do que a UI apresenta.** O formulário oferece 22 rótulos em português; o contrato backend permite qualquer string aparada de 1–80 caracteres e até 100 entradas, sem conjunto canônico. O repositório armazena o texto recebido como `interestKey`. Isso não é falha de validação de formato, mas deixa valores persistidos sem normalização/taxonomia estável para algoritmo e filtros futuros.
5. **Sugestões não usam os interesses.** `Suggestions.tsx` seleciona os primeiros seis usuários fornecidos por `useSocial`, sem API de recomendação, ordenação por interesses ou paginação. A escolha de gostos é persistida, mas não altera as sugestões nem o feed no frontend atual.
6. **A lista não distingue perfis remotos dos locais.** A tela filtra por conta atual e `isBlocked`, mas não exige `source === "server"`. Na sessão remota, `toggleFollow` recusa contas que não são do servidor e mostra aviso de perfil de demonstração. Se usuários locais de preview estiverem no contexto, podem aparecer como sugestões que a conta real não consegue seguir.
7. **O contrato compartilhado do endpoint está incompleto.** `onboardingApi.ts` monta manualmente `/onboarding/interests` e usa tipos locais. O endpoint está implementado em `back/src/modules/onboarding`, mas não aparece em `shared/api-spec/openapi.yaml` nem no cliente gerado; o artefato `docs/api/backend/openapi.json` lista a operação. A rota documentada e a implementação existem; falta unificar a fonte de contrato usada pelo cliente.
8. **Dependência transversal e tipagem de resposta.** `onboardingApi.ts` agora importa `postJson` de `modules/app/api/httpClient.ts`, alinhando o proprietário do transporte comum. A resposta continua tipada apenas em TypeScript, sem validação runtime, como registrado no achado transversal de HTTP em Auth.
9. **Sugestões sem tratamento de lista vazia e testes de fluxo.** Se não houver usuários elegíveis, a tela mantém o espaço da lista sem mensagem específica. Não foram encontrados testes de componente/E2E para seleção nas três etapas, pular, persistir/recarregar interesses, redirecionamentos ou interação com sugestões.

### Regras e controles observados

- As três etapas possuem opções distintas e a seleção pode ser vazia.
- “Pular por agora” envia `interests: []` e `skipped: true`; concluir envia os itens marcados e `skipped: false`.
- O schema compartilhado rejeita interesses repetidos e uma lista não vazia quando `skipped` é verdadeiro.
- O backend substitui interesses anteriores da conta e atualiza `onboardingCompletedAt` na mesma transação; quando pulado, não grava linhas de interesse.
- Há um `follow`/solicitação pelo fluxo Social; a autorização final permanece no servidor. A lista de sugestões não é um mecanismo de autorização.

**Resultado da etapa:** onboarding tem integração real de gravação no backend e a regra opcional de pular está implementada; não deve ser descrito como totalmente desconectado. Persistência de interesses existe, mas o cliente não os relê, o vocabulário não é canônico para algoritmo, o endpoint não está na especificação compartilhada e a tela de sugestões ainda é uma seleção simples do estado disponível. Nenhuma regra, tela ou contrato foi alterado. A suíte geral já executada passou em 60/60; não foi reexecutada durante esta inspeção.

## Auditoria estrutural do módulo `profile` — 27/10/2026

Foram inspecionados os 19 arquivos do domínio (2.694 linhas, conforme inventário), suas rotas e consumidores, o cliente de Social usado para carregar perfis e conexões, os tipos gerados e os contratos/backend diretamente relacionados. Nenhum código funcional foi alterado.

| Arquivo/área | Responsabilidade observada |
|---|---|
| `screens/Profile.tsx` (488 linhas) | Resolve perfil próprio/remoto, estados de carregamento/erro, bloqueio, privacidade e seguimento; deriva publicações, respostas, mídias, curtidas e artigos; renderiza o perfil pessoal e suas abas. |
| `screens/ProfileEdit.tsx` (100 linhas) | Monta a tela compartilhada de edição e seleciona os campos comerciais quando a conta é comercial. |
| `hooks/useProfileEditController.ts` (271 linhas) | Carrega conta do titular, prepara formulário, aplica regras de nome/@ e horário, escolhe atualização remota ou preview local e coordena persistência/navegação. |
| `commercial-profile/components/CommercialProfilePage.tsx` (711 linhas) | Renderiza capa, ações, informações, serviços, mídias, avaliações e artigos; também calcula notas, galeria e timeline e mantém diálogo/estado de salvar/compartilhar. |
| `commercial-profile/components/CommercialProfileFields.tsx` (168 linhas) | Campos comerciais, cidade de descoberta, endereço, horários, faixa de preço e opções de serviço. |
| `components/ConnectionList.tsx` (237 linhas) | Carrega, filtra e pagina listas de seguidores/seguindo; oferece ações de seguimento/solicitação. |
| `components/ProfileIdentityFields.tsx` (115 linhas) | Campos de identidade pessoal ou comercial, @, bloqueios temporários e mensagens de erro. |
| `components/ProfileDetailsFields.tsx` (56 linhas) | Bio, localização e website. |
| `components/ProfileEditHeader.tsx` (25 linhas) | Apresenta capa e avatar na edição; exibe ícones de câmera sem implementar seleção/envio de arquivo. |
| `types/profileEditSchema.ts` (43 linhas) | Schema compartilhado do formulário, incluindo campos pessoais, comerciais e serviços. |
| `types/user.ts` (45 linhas) | Projeção de usuário consumida transversalmente; mistura identidade, estado social, conteúdo, preferências e campos comerciais opcionais. |
| `commercial-profile/types/commercialProfile.ts` (29 linhas) e `types/businessHours.ts` (20 linhas) | Tipos de perfil comercial e de horários semanais. |
| `commercial-profile/utils/businessHours.ts` (119 linhas) | Cria, interpreta, valida e formata horários semanais e formatos legados. |
| `commercial-profile/utils/commercialProfileEdit.ts` (88 linhas) e `personal-profile/utils/personalProfileEdit.ts` (44 linhas) | Constroem patches remotos e projeções de preview separados por tipo de conta. |
| `utils/commonProfileEdit.ts` (27 linhas) | Normalização de @ e patch de campos comuns. |
| `utils/profileTimeline.ts` (47 linhas) | Combina publicações próprias e registros de repostagem, preservando autoria original e ordenação. |
| `data/accountStorage.ts` (61 linhas) | Persistência local de dados da conta usada no modo de demonstração. |

### Achados e limites verificados

1. **Perfil público remoto recebe somente a identidade básica no frontend.** `SocialApplicationContext.loadRemoteProfile` consulta `GET /v1/profiles/{username}`, mas adapta apenas `profile.account` por `accountViewToUser`. O contrato da resposta também traz visibilidade, páginas de publicações, artigos e mídias; esses campos não são incorporados ao estado usado pelas telas. `Profile.tsx` então deriva o conteúdo do estado global existente, em vez de consumir as páginas recebidas pelo endpoint.
2. **Perfil comercial remoto cai no layout pessoal genérico.** `accountViewToUser` não monta `commercialProfile`, e `Profile.tsx` seleciona `CommercialProfilePage` somente quando esse objeto existe. Portanto, uma conta comercial carregada pela rota pública tem `accountType: "commercial"`, mas não satisfaz a condição de renderização comercial. O mapeador `myAccountToUser` preenche apenas categoria, tipo de descoberta, endereço e cidade para a conta do titular; não resolve a projeção pública.
3. **A API pública de perfil ainda devolve mídia vazia e não inclui detalhes comerciais.** O caso de uso backend retorna `media: {items: [], nextCursor: null}`; a projeção de conta não contém horários, faixa de preço, serviços, fotos ou vídeos comerciais. Mesmo se a tela receber o perfil, o contrato atual não fornece esses campos. Isso é uma capacidade incompleta confirmada, não apenas um defeito visual.
4. **Edição remota de serviços, horários e preço está desativada.** `CommercialProfileFields` desabilita esses controles em uma sessão de servidor e informa que não estão conectados. O patch comercial remoto envia endereço/cidade e campos comuns, não `serviceOptions`, horários ou faixa de preço. O preview local aceita os três. A regra de exibir somente serviços oferecidos é respeitada localmente (`=== true`), mas não pode ser exercida por uma conta remota com o contrato atual.
5. **O contrato do perfil é consumido parcialmente e a navegação de conteúdo remoto não está fechada.** `ProfileResponse` traz `posts`, `articles` e `media`, mas `loadRemoteProfile` descarta todos esses dados. `media` é vazio pelo backend; publicações e artigos, embora produzidos pelo caso de uso, não são exibidos a partir da resposta. Os perfis remotos podem, portanto, mostrar contagem/listas vazias ou dados que vieram de outro estado cliente; não se deve interpretar a tela atual como feed de perfil sincronizado.
6. **A página comercial concentra responsabilidades distintas.** `CommercialProfilePage.tsx` reúne composição visual, abas, consulta/agregação de avaliações, galeria, dados de comércio, serviços, salvar local, compartilhar e bloquear em 711 linhas. `Profile.tsx` também reúne carregamento, autorização visual, ações de relação e cinco conteúdos/abas. `useProfileEditController.ts` coordena os dois tipos de conta e os caminhos remoto/local. São candidatas sustentadas por responsabilidades identificáveis para decomposição proporcional na fase de correções; tamanho isolado não é usado como critério.
7. **O header de edição sugere upload sem operação.** A capa e o avatar têm `cursor-pointer` e ícone de câmera no hover, mas não são botões, não têm input de arquivo e não executam alteração. No código atual, esses elementos são somente visuais.
8. **A aba inicial do perfil comercial é “Informações”, não “Publicações”.** A lista de abas exibe Publicações, Informações, Avaliações, Mídias e Artigos, mas `activeTab` inicializa como Informações. O conteúdo de serviços fica dentro de Informações e a aba Avaliações é separada; isso corresponde às decisões registradas sobre não duplicar avaliações dentro de Informações. A diferença está na aba selecionada ao abrir, não na ordem dos rótulos.
9. **Mídia de fallback pode ser contada como foto real.** Quando não há fotos cadastradas nem mídia de publicação, a lista usa `user.coverUrl` como elemento único mesmo que a URL esteja vazia. O número exibido (“Ver N fotos”) pode então indicar uma foto inexistente e a galeria pode apresentar item vazio.
10. **A ação de bloqueio comercial confirma sucesso antes do resultado.** O handler da página comercial chama `blockUser` sem aguardar a Promise e mostra imediatamente toast de bloqueio; se a chamada remota falhar, a mensagem ainda afirma sucesso. A tela pessoal aguarda o resultado e só então mostra confirmação.
11. **Indicadores de avaliação e lista visível podem divergir.** As avaliações listadas excluem autores bloqueados, enquanto média e distribuição usam todas as avaliações do comércio. A regra final para agregados de avaliações de contas bloqueadas não foi definida pelo código; o relatório registra a diferença, sem presumir que a média deve ou não ser recalculada.
12. **Dependência de UI entre domínios.** A edição comercial importa `CommercialDiscoveryCity` e `DiscoveryLocation` do módulo Seek, enquanto a edição do perfil canônico reside em Profiles. Avaliar na correção se a localização é um contrato compartilhado/entrada do Seek ou se o componente está acoplando indevidamente os domínios; não foi movido nem duplicado durante a auditoria.
13. **Mensagens de alteração do nome/@ não têm o mesmo grau de clareza.** O formulário informa explicitamente que o @ antigo fica reservado por 30 dias e mostra a data de próxima troca; o nome público tem bloqueio/data, mas não apresenta a mesma explicação explícita do intervalo antes de iniciar a alteração. A regra no servidor continua autoritativa; a constatação é sobre a comunicação na interface.
14. **Listas de conexões e avaliações dependem de estado diferente conforme o modo.** Conexões usam endpoints paginados na sessão remota e estado local no preview; avaliações são lidas do `useSocial` e não têm carregamento remoto próprio nesta tela. A lista de conexões apresenta dois textos de carregamento quando a primeira página ainda está vazia. Testes de autorização do endpoint não foram repetidos nesta auditoria.
15. **A projeção `User` funciona como read model transversal.** Ela reúne identidade, estatísticas, relações sociais, mídia e dados comerciais, e é importada por vários domínios. Isso facilita a UI atual, mas não deve virar um contrato de persistência ou autorização comum; a fronteira e o proprietário de cada campo precisam permanecer explícitos ao ligar novos endpoints.

### Cobertura de testes e controles

Existem testes unitários para validação/montagem dos patches pessoais e comerciais, mapeamento local de serviços, seleção de mídia conforme privacidade/audiência e timeline com repostagens. A cobertura não inclui o ciclo de componente do perfil público pessoal/comercial, consumo de `ProfileResponse`, carregamento remoto de conteúdo, upload de avatar/capa, bloqueio remoto com falha, filtros de avaliações, abas por teclado/viewport nem testes E2E. O backend de perfil já verifica bloqueio entre contas e visibilidade no caso de uso, mas essa observação não substitui um teste de integração HTTP/SQL neste recorte.

**Resultado da etapa:** há separação explícita entre utilitários de edição pessoal/comercial e um único editor compartilhado, mas a integração pública do perfil não consome o conteúdo que a API retorna, a tela remota comercial não recebe a projeção necessária e mídia/serviços comerciais permanecem fora do contrato. O layout de serviços dentro de Informações e avaliações em aba própria está implementado; a aba inicial e os controles de imagem foram registrados como discrepâncias. Nenhum código funcional, API, regra ou banco foi alterado.

## Auditoria estrutural do módulo `seek` — 27/10/2026

Foram inspecionados os 19 arquivos do módulo (1.950 linhas), seus consumidores em Profiles e no estado global do cliente, a fonte de cidades, os testes e as rotas/contratos encontrados no workspace. Nenhum código funcional foi alterado.

| Arquivo/área | Responsabilidade observada |
|---|---|
| `screens/Seek.tsx` (229 linhas) | Compõe busca, localização, abas, categorias, filtros, listas/carrosséis, vazio/offline e diálogos. |
| `screens/SeekEventDetail.tsx` (104 linhas) | Carrega e mostra somente fixture de evento no desenvolvimento; em outros ambientes apresenta indisponibilidade. |
| `hooks/useSeekDiscovery.ts` (159 linhas) | Deriva resultados do contexto Social, gerencia filtros, localização, salvos, fixtures, estado offline e abertura de avaliações. |
| `utils/seekDiscovery.ts` (212 linhas) | Define o modelo local de itens/filtros, projeta contas e eventos, filtra por cidade/categoria/nota/data e ordena os resultados. |
| `utils/seekFilters.ts` (38 linhas) | Normaliza texto acentuado; também contém uma segunda implementação de busca/filtro de negócios, atualmente sem consumidores de produção encontrados. |
| `services/seekLocationService.ts` (145 linhas) | Lê o catálogo estático de municípios, pesquisa/localiza cidades, salva cinco recentes por sessão e solicita geolocalização apenas mediante ação. |
| `components/DiscoveryLocationDialog.tsx` (173 linhas) | Escolha manual de cidade, recentes, estados e erros da localização do dispositivo. |
| `components/CommercialDiscoveryCity.tsx` (25 linhas) | Adaptador visual do seletor de cidade usado também pelo formulário de perfil comercial. |
| `components/DiscoveryCard.tsx` (105 linhas) | Cartão de lugar, prestador ou evento, incluindo imagem, categoria, avaliação, situação, cidade e salvar. |
| `components/DiscoveryCarousel.tsx` (95 linhas) | Carrossel acessível com rolagem por botão/teclado, controle de bordas e ação “Ver todos”. |
| `components/DiscoveryCategories.tsx` (67 linhas) | Chips e diálogo de categorias presentes nos itens carregados. |
| `components/DiscoveryFiltersPanel.tsx` (78 linhas) | Controles de ordenação, avaliação, período/preço de eventos e situação; raio aparece desativado. |
| `components/BusinessReviewsDialog.tsx` (305 linhas) | Lista local de avaliações, envio/edição de nota e resposta do comércio. |
| `application/reviewActions.ts` (72 linhas) | Valida regras de avaliação/resposta no cliente e atualiza armazenamento/reducer local. |
| `state/reviewReducer.ts` (42 linhas) e `types/review.ts` (12 linhas) | Estado e contrato local de avaliação e resposta comercial. |
| `data/reviewStorage.ts` (44 linhas) | Leitura/validação/gravação das avaliações em `localStorage`. |
| `types/event.ts` (16 linhas) e `data/demoSeekEvents.ts` (29 linhas) | Modelo de evento e fixtures datadas dinamicamente para demonstração. |

### Achados e limites verificados

1. **A descoberta real não consulta uma API Seek.** `useSeekDiscovery` constrói os itens a partir de `users` e `reviews` do `SocialApplicationContext`; a única requisição de rede do módulo é a leitura do arquivo estático do catálogo de cidades. Não há cliente de descoberta, paginação remota, estado de carregamento da API ou sincronização de resultados comerciais/eventos.
2. **A regra de identidade comercial segue Social no modelo local.** `buildSeekItems` seleciona `User` com `accountType === "commercial"`, `commercialProfile` presente, não bloqueado e não privado; os links levam ao perfil Social da mesma conta. Não há cadastro paralelo de empresa. A projeção não distingue `source: "server"` de conta local, nem possui estado ativo/suspenso/verificação comercial. A elegibilidade observada é apenas a condição do cliente; não é autorização nem prova de publicação válida.
3. **Descoberta local por município funciona; busca por GPS ainda não encontra resultados.** O catálogo brasileiro está empacotado como `public/data/ibge-cities-20261022.json`, é consultado com `credentials: "omit"` e mantém cache em memória. A seleção manual é comparada por ID ou declaração de cidade/UF; até cinco recentes ficam em `sessionStorage`, sem coordenadas. GPS só é solicitado após ação do usuário e suas coordenadas ficam em memória. Porém `itemMatchesLocation` retorna `false` para todos os itens quando a localização é de dispositivo, pois os perfis não têm coordenadas; a tela avisa para escolher cidade manualmente.
4. **Raio, distância e ranking geográfico não estão implementados.** O seletor “Raio de busca” está desabilitado e explica a ausência de suporte geoespacial. O tipo de filtro não contém raio e cartões não calculam distância. Não existem coordenadas comerciais no modelo carregado nem ordenação “mais perto”; a instrução atual de não inventar distância está respeitada, mas a busca local não atende à descoberta por proximidade.
5. **Busca e ordenação são locais e determinísticas, não algoritmo de recomendação.** Os termos são normalizados e cada termo precisa aparecer como substring em nome, categoria, descrição, região/cidade ou tags; relevância soma apenas correspondência em nome/categoria/outros e desempata alfabeticamente. A UI descreve “palavras exatas em nome, categoria e descrição”, o que não corresponde exatamente às fontes e à comparação por substring. Não há personalização por interesses, busca server-side, paginação, sinais de ranking de qualidade nem métricas. Não foi inferido nenhum algoritmo além do código observado.
6. **Opções de filtro têm diferenças de contexto.** A ordenação “Data do evento” aparece também para lugares/prestadores sem `startsAt` e nesse caso desempata por nome. O filtro de “Situação informada: aberto” usa `open === true`; os cartões mostram o estado apenas para `place`, embora o filtro de `onlyOpen` também processe itens `provider`. O campo de raio permanece visível mas desabilitado.
7. **Eventos são somente fixtures no frontend atual.** A lista carrega eventos de `previewFixtures` em modo desenvolvimento; a página de detalhe também procura exclusivamente nessa fixture e não usa API. Em ambiente sem `DEV`, o endereço do evento termina em “Evento indisponível”. Inscrição/interesse e ingressos estão desabilitados/indisponíveis. A fixture é identificada como demonstração e não é apresentada como evento real.
8. **A associação de eventos a contas não é obrigatória no tipo/projeção.** `SeekEvent.organizerId` é opcional e `buildSeekItems` aceita evento sem organizador; quando informado, exige que o organizador esteja entre contas comerciais elegíveis do Social. O teste existente inclui um evento sem `organizerId`. Se todos os eventos tiverem de pertencer a uma conta comercial Social, isso não está imposto pelo modelo atual; a auditoria registra o ponto sem inventar a regra.
9. **Avaliações e respostas persistem só neste navegador.** O formulário lê o estado social local e grava a lista inteira em `localStorage` sob a mesma chave, enquanto ações validam no cliente uma avaliação por pessoa/comércio, nota 1–5 e comentário mínimo de 10 caracteres; o comércio responde com mínimo de 3. Não há cliente/API, persistência remota, paginação ou autorização de servidor. O texto confirma que foi salvo neste navegador, o que evita afirmar sincronização.
10. **Bloqueio não é aplicado consistentemente aos agregados de avaliação.** A lista filtra autores cujo `User.isBlocked` está marcado, mas média e contagem são calculadas sobre todas as avaliações. Isso cria diferença entre o que a lista mostra e seus números; a política de reputação após bloqueio permanece sem especificação.
11. **A propriedade das avaliações atravessa a composição Social.** Embora o domínio das avaliações esteja em `seek`, os actions chamam-se `createSocialReviewActions`, os tipos de operação são expostos pelo estado Social global e a chave de armazenamento chama-se `seekalive-social-reviews`. O provider pode compor domínios, mas essa nomenclatura/ownership e o fato de `reviewStorage` ser global a todos os usuários do navegador precisam ser considerados ao conectar uma API.
12. **Há uma implementação de filtro antiga sem uso de produção.** Busca do repositório encontrou `filterSeekBusinesses` e `matchesSeekSearch` apenas na própria `seekFilters.ts` e em `tests/content.test.ts`; a única dependência de produção desse arquivo é `normalizeSeekText`. Esses helpers repetem partes do filtro de `seekDiscovery.ts` e são candidatos a confirmação/removal na fase corretiva, após verificar referências e contrato dos testes.
13. **Componentes com ciclos distintos estão concentrados.** `BusinessReviewsDialog.tsx` reúne formulário de avaliação, listagem, agregados e resposta de comércio; `Seek.tsx` concentra composição dos filtros/abas e resultados. Há responsabilidades identificáveis para avaliar em decomposição proporcional, sem criar arquivos menores apenas pelo tamanho.
14. **A especificação derivada lista muitas operações sem implementação correspondente.** `docs/api/backend/openapi.json` lista cidades, categorias, descoberta, negócios, avaliações/respostas e eventos/publicação/cancelamento/interesse em `/v1/seek/*`. Não existe `back/src/modules/seek`; `shared/api-spec/openapi.yaml` e o cliente gerado não possuem essas operações. A presença no JSON não prova backend ativo e é uma divergência documental que deve ser reconciliada.

### Cobertura de testes e controles

`tests/seekDiscovery.test.ts` cobre projeção de contas comerciais, exclusão de perfis pessoais/privados/bloqueados, exemplos, avaliação válida, comparação por cidade, filtros e datas de evento, parse/cache do catálogo, consentimento explícito de GPS, erros/cancelamento e ausência de coordenadas armazenadas. `tests/content.test.ts` cobre os helpers antigos de `seekFilters.ts`. Não foram encontrados testes de componente/E2E de busca, permissões visuais, diálogo de filtros, card, avaliações/respostas ou detalhe de evento; também não há teste contra API Seek porque o cliente/backend não existe. A suíte não foi executada nesta etapa.

**Resultado da etapa:** a descoberta manual por cidade e seus limites de privacidade estão explicitados; a lista usa perfis comerciais existentes no estado Social, sem duplicar identidade. Distância/GPS, descoberta online, detalhes comerciais suficientes, avaliações remotas e ciclo de eventos não estão conectados. A documentação OpenAPI derivada anuncia operações não presentes no backend nem no contrato compartilhado. Nenhum código, contrato ou dado foi alterado.

## Auditoria estrutural do módulo `settings` — 27/10/2026

Foram inspecionados os 14 arquivos do módulo (2.112 linhas), telas/rotas, serviços Auth/Social consumidos, preferências locais, efeitos em Messages e Notification, estado de sessão e testes encontrados. Nenhum código funcional foi alterado.

| Arquivo/área | Responsabilidade observada |
|---|---|
| `screens/Settings.tsx` (108 linhas) | Índice das configurações e ação de logout. |
| `screens/Account.tsx` (535 linhas) | Carrega e atualiza dados próprios pessoais/comerciais, @, compõe formulários de email/senha, mostra provedores indisponíveis e controles de encerramento indisponíveis. |
| `components/account/AccountEmailChange.tsx` (194 linhas) | Solicita mudança e conduz códigos do e-mail atual e do novo. |
| `components/account/AccountPasswordChange.tsx` (195 linhas) | Valida, solicita e confirma mudança de senha; encerra sessões após sucesso. |
| `screens/Privacy.tsx` (316 linhas) | Privacidade remota/local, pedidos recebidos, política de mensagens diretas, confirmações de leitura e acesso a bloqueios. |
| `screens/Security.tsx` (349 linhas) | Consulta, lista e revoga sessões e instalações confiáveis; informa recursos indisponíveis. |
| `screens/Blocked.tsx` (86 linhas) | Lista contas bloqueadas pelo titular e oferece desbloqueio. |
| `screens/Notifications.tsx` (118 linhas) | Edita preferências locais de canal e categoria. |
| `screens/Appearance.tsx` (87 linhas) | Exibe o tema fixo e ajusta tamanho de texto. |
| `screens/SettingsSubheader.tsx` (38 linhas) | Subcabeçalho, aviso de indisponibilidade e título de seção, componentes visuais reutilizados pelas páginas. |
| `data/browserPreferenceStorage.ts` (22 linhas) | Chaves por conta e leitura/gravação genérica em `localStorage`. |
| `data/appearancePreferences.ts` (15 linhas) | Contrato/padrão e acesso local ao tamanho de texto. |
| `data/notificationPreferences.ts` (28 linhas) | Contrato/padrões e acesso local às preferências de notificação. |
| `data/privacyPreferences.ts` (21 linhas) | Preferências locais do protótipo para privacidade e mensagens. |

### Achados e limites verificados

1. **Há duas fontes de configuração por modo.** Privacidade usa `socialGraphApi` quando a sessão é remota e `localStorage` no preview; dados de conta também usam API remota ou estado demonstrativo. Aparência e notificações permanecem no navegador mesmo para uma conta autenticada. A UI de notificações explicita isso; as telas de privacidade e conta identificam o modo.
2. **A tela de conta respeita privacidade da idade, mas não explica as regras temporais de nome e @.** `Account.tsx` não exibe idade, conforme decisão, e há teste estático para essa ausência. Para o @, a tela informa apenas que é único. Antes da alteração, não explica o intervalo de 30 dias nem a reserva do @ antigo por 30 dias; nome público também não recebe aviso da restrição. No preview local, a troca de @ só verifica colisão entre usuários carregados e pode ser repetida sem cooldown/reserva. A chamada remota delega a atualização à API, mas a UI não apresenta previamente essa regra aprovada.
3. **Exclusão da conta não está disponível.** “Desativar conta” e “Excluir conta permanentemente” estão desabilitados e avisam que nada será alterado. Não há chamada de API nessa tela nem rota de exclusão encontrada no backend. Portanto o fluxo já decidido — autenticação, ocultação/desativação imediata, prazo de sete dias, cancelamento no login com senha+código e remoção dos conteúdos/interações especificados — não está implementado pelo frontend atual.
4. **Vinculação de Google/Apple não funciona.** Os dois controles estão desabilitados e rotulados “Indisponível”. A limitação é explícita; nenhum provedor é conectado nesta tela.
5. **Mudança de email e senha usa os serviços de Auth.** Os componentes estão separados da tela principal. A mudança de email exige senha atual e código no endereço atual antes do código no novo; o endereço só é atualizado depois da confirmação e mostra se o aviso de segurança ao email antigo foi enviado. A mudança de senha usa o schema compartilhado, senha atual, nova/confirmada e código; após confirmar, limpa a autenticação local e navega ao login. Esses são fluxos remotos, não apenas estados visuais.
6. **A alteração de nome/@ atualiza mais de uma projeção local.** `syncUpdatedUser` atualiza `AppContext`, `SocialApplicationContext` e o usuário remoto em memória; há teste estático para a sincronização do @. A regra de unicidade/cooldown no servidor não é substituída por essa sincronização cliente.
7. **Ação de logout pode falhar sem feedback visível nesta tela.** `AppContext.logout()` devolve `false` e grava `logoutError` quando a API falha; a página `Settings.tsx` só observa o resultado para navegar se for `true` e não lê/exibe `logoutError`. Nesse caso a conta permanece aberta sem mensagem na própria página.
8. **Sessões e instalações confiáveis têm API real e ações de revogação.** `Security.tsx` consome `GET/DELETE /auth/sessions` e `GET/DELETE /auth/devices`, confirma ações destrutivas, identifica a sessão/instalação atual e informa revogações. A tela descreve corretamente token revogável e não afirma usar IP/impressão digital. Lista até 100 instalações e permite revogar as demais; sessão e instalação são apresentadas como conceitos separados.
9. **A tela de segurança chama APIs mesmo no preview local.** `SettingsSecurity` carrega sessões/dispositivos no `useEffect` sem consultar `isDevelopmentPreview` ou `isRemoteSocialSession`. Uma pessoa autenticada apenas pela demonstração pode, portanto, disparar chamadas de sessão real e ver estado de falha de autenticação. A apresentação de “entre com conta autenticada” não explica o modo de demonstração.
10. **Uma única variável de erro mistura sessões e dispositivos.** `loadSessions` e `loadDevices` iniciam e atualizam o mesmo `error`; as duas listas também usam esse erro genérico para determinar seu estado vazio. Uma falha de rede em um recurso pode produzir mensagem incorreta no outro, inclusive pedir login quando a consulta daquele segundo recurso retornou uma lista vazia com sucesso.
11. **Respostas de sessão validadas em runtime — corrigido em 27/10/2026.** `sessionApi.ts` agora passa ao `httpClient.ts` os schemas compartilhados e status esperados para sessão atual, lista/revogação de sessões e dispositivos confiáveis. A validação testa a estrutura e as datas antes de entregar o payload original ao cliente; resposta inválida falha como erro de contrato seguro, em vez de chegar a `Intl.DateTimeFormat` e interromper a renderização.
12. **Privacidade remota salva na conta, mas mensagens ainda não consomem todos esses valores.** Perfil privado, permissão de mensagens e leitura são carregados/atualizados pelo serviço; pedidos de seguir e bloqueios vêm do estado Social. No preview local, permissões de DM consultam `getPrivacyPreferences` e aplicam a regra de Círculo por seguimento mútuo. A busca no frontend encontrou `readReceipts` apenas no armazenamento/configuração; o domínio de mensagens não implementa leitura remota/recibos. Assim, o controle de confirmações de leitura não tem efeito funcional de mensagens nesta versão.
13. **Preferências de notificação não são consumidas pela entrega/lista.** Push/email são explicitamente descritos como dependentes de serviços não conectados. As categorias também são só persistidas localmente: nenhuma outra parte do frontend consulta `getNotificationPreferences`, portanto os toggles não filtram notificações in-app existentes.
14. **A preferência de privacidade local pode ficar presa à conta anterior.** O efeito de `Privacy.tsx` executa novamente quando muda `currentUser.id`, mas no modo local apenas define `privacyLoading(false)` e retorna; não recarrega `getPrivacyPreferences` nem reinicializa `prefs`. Se a conta de demonstração mudar sem desmontar a tela, mensagens/recibos podem mostrar os valores da conta anterior e ser gravados na chave da nova.
15. **Valores persistidos no navegador não são validados estruturalmente.** `readBrowserPreference` faz `JSON.parse`, mescla qualquer objeto superficialmente e converte para `T` sem validação. Por exemplo, `categories: null` pode quebrar o acesso `prefs.categories[item.key]`; `fontSize` arbitrário pode ser aplicado como tamanho da raiz. Erros de leitura retornam padrão; falhas de gravação só geram `console.warn`, enquanto a tela mantém visualmente a alteração, sem informar que ela não foi persistida.
16. **O seletor de mensagens em Privacidade é um popover customizado pouco exposto a tecnologias assistivas.** O botão não declara `aria-expanded`/`aria-controls`, a lista não usa semântica de menu/listbox e não há tratamento visível de Escape/fechamento externo. Os botões de opção continuam alcançáveis por teclado, mas a relação entre botão e popup e seu estado não é anunciada.
17. **A tela principal de Conta concentra ciclos de edição distintos.** Os formulários de email e senha já são componentes próprios. Ainda permanecem no arquivo de 535 linhas o carregamento/edição de dados pessoais ou comerciais, atualização de @, sincronização de projeções, estado de erro e montagem de provedores e encerramento de conta. É uma candidata a decomposição proporcional de operações já distintas; não há evidência para extrair cada campo isoladamente.
18. **Tema escuro fixo é explícito; tamanho de texto é uma preferência local funcional.** O usuário escolhe 16/18/20 px e a tela aplica ao `documentElement`; a preferência é por conta/navegador. O tema não possui controle de troca e a UI informa que fica sempre escuro. A tela principal de configurações ainda aplica animação sem consultar `prefers-reduced-motion`, ao contrário de outras subpáginas.
19. **O desbloqueio explicita que relações não são restauradas.** O usuário pode remover seu bloqueio; a mensagem resultante avisa que seguimentos removidos não voltam automaticamente e informa se o outro perfil também bloqueia. A lista deriva do estado Social, não tem persistência própria em Settings.

### Cobertura de testes e controles

`tests/content.test.ts` contém verificações por inspeção estática para ausência de idade, sincronização de username e integração da tela de bloqueados. Não foram encontrados testes comportamentais de preferências de aparência/notificações/privacidade, mudança de conta com a tela montada, chamada de logout que falha, estados concorrentes de sessões/dispositivos, parsing de respostas HTTP, fluxo de códigos de email/senha ou fluxo de exclusão. A etapa apenas inspecionou testes existentes; não executou a suíte.

**Resultado da etapa:** dados de conta, privacidade e segurança têm caminhos de API e a tela separa honestamente várias funções indisponíveis. Há lacunas concretas de implementação para exclusão e notificações, divergências de modo no preview, mensagens de erro/validação do armazenamento e itens de acessibilidade. A idade continua oculta. Nenhum código, contrato ou dado foi alterado.

## Auditoria estrutural do módulo `shop` — 27/10/2026

Foram inspecionados os cinco arquivos do módulo (416 linhas), rotas e moldura de busca, dados de demonstração, referências compartilhadas, testes, nomes de rotas documentados, módulos do backend e namespaces do banco. Nenhum código funcional foi alterado.

| Arquivo/área | Responsabilidade observada |
|---|---|
| `screens/Shop.tsx` (247 linhas) | Carrega fixtures apenas em desenvolvimento, filtra categorias localmente, compõe cards e layouts desktop/mobile. |
| `screens/ShopItemDetail.tsx` (115 linhas) | Carrega item apenas de fixture de desenvolvimento, apresenta detalhe, salvar/compartilhar e informa compra indisponível. |
| `hooks/useSavedShopItems.ts` (15 linhas) | Mantém IDs salvos no navegador, com chave por conta. |
| `types/item.ts` (20 linhas) | Define modelo cliente de produto e loja, com preço/avaliação e vendedor opcionais. |
| `data/demoCatalog.ts` (19 linhas) | Catálogo demonstrativo com URLs externas de imagem, preços, avaliações, lojas e contagens em texto. |
| `AppShell.tsx` (consumidor) | Insere busca contextual do Shop no header desktop e mobile; no estado atual é apenas visual. |
| `referenceResolver.ts` (consumidor) | Resolve `shop_item` somente por fixtures de desenvolvimento para prévia/rota do item. |

### Achados e limites verificados

1. **Catálogo real não está conectado.** `Shop.tsx` e `ShopItemDetail.tsx` carregam itens e lojas por import dinâmico de `previewFixtures`, apenas quando `import.meta.env.DEV`. Fora desse modo, não há consulta remota e os itens ficam indisponíveis/coleção vazia. Nenhuma operação real de catálogo ocorre.
2. **O banco reserva o namespace de Shop, mas ainda não há domínio persistido.** `infra/database/src/schema/domains.ts` declara `shopNamespace` e o filtro de schemas inclui `shop`; não há tabelas/colunas de catálogo Shop, repositório, migração ou módulo `back/src/modules/shop`. A separação lógica solicitada está reservada, não implementada como modelo.
3. **O artefato OpenAPI derivado anuncia rotas sem implementação.** `docs/api/backend/openapi.json` lista produtos, lojas, categorias, itens do titular e favoritos em `/v1/shop/*`; não há módulo/rotas no backend nem operações no `shared/api-spec/openapi.yaml` ou cliente gerado. O documento derivado não constitui serviço ativo.
4. **Produtos e lojas não possuem vínculo obrigatório à conta Social.** `ShopItem.store` é texto e `sellerId` é opcional; as fixtures não preenchem `sellerId`. O detalhe tenta encontrar vendedor por `getUserById` apenas quando há ID. `ShopStore` também usa nome e contagem textual sem ID de conta associada. Assim, não se comprova identidade do vendedor comercial Social no modelo atual; a tela de loja e o cadastro de produtos por comerciante não existem.
5. **Busca do Shop é somente aparência.** `AppShell` mostra campo de busca em desktop e mobile com placeholder, mas não possui label explícito, valor, handler, filtro ou submission. O conteúdo não reage ao que for digitado.
6. **Filtro e navegação de lojas são parciais.** Produtos/serviços/ofertas são filtrados por `tag` local. A categoria “Lojas” está desabilitada; a ordenação está desabilitada. “Lojas em destaque” usa contagens estáticas e linhas sem link/ação, aparece somente no layout desktop e não oferece seção equivalente no mobile.
7. **Compra não existe e o estado é comunicado.** O botão “Compra indisponível” está desabilitado; texto afirma que carrinho, pagamento e entrega não existem e nenhuma compra é registrada. Não há API/cart/order/checkout nem operações para inventário ou fulfillment no backend.
8. **Itens salvos permanecem apenas neste navegador.** `useSavedShopItems` usa `useAccountScopedIds` e `localStorage` com chave por conta. Isso permite restauração local no mesmo navegador, não sincronização entre dispositivos ou uma coleção remota. Os controles só alternam o estado salvo; não há API de favoritos.
9. **Compartilhamento de item depende de fixtures e não resolve em ambiente não DEV.** `ShopItemDetail` gera referência `shop_item`; `referenceResolver` procura ID apenas na fixture de desenvolvimento e devolve `null` fora de `DEV`. O teste atual valida o caminho de fixture `/shop/item/p1`, não uma referência de catálogo remota.
10. **Apresentação dos dados de demonstração varia por viewport.** O banner desktop informa explicitamente preços ilustrativos; a faixa mobile apenas diz que a compra está indisponível, embora cards mostrem preço e avaliações estáticas. A tela de detalhe esclarece que o preço não é oferta e não confirma disponibilidade. Os dados de loja/seguidores são texto sintético e não recebem marcação individual de demonstração.
11. **Conteúdo visual depende de imagens externas sem fallback local.** As fixtures usam `picsum.photos`; cards/detalhe não têm tratamento `onError`. Uma falha do domínio de imagem resulta em imagem quebrada no cartão/detalhe, sem placeholder/fallback.
12. **Bloqueio do vendedor não cobre as fixtures atuais.** O detalhe consulta `seller?.isBlocked` somente quando `sellerId` existe; nenhuma fixture de item define esse ID. Mesmo para um ID futuro, a consulta é ao estado `useSocial` do cliente, sem autorização ou resolução de bloqueio por um serviço Shop.
13. **Modelo de apresentação contém dados formatados e campos ausentes para operação.** `ShopItem.price` e `oldPrice` são strings exibidas diretamente; `ShopStore.followers` também é texto como “12 mil”. O contrato não contém moeda/valor numérico, preço promocional estruturado, estoque, disponibilidade, variante, frete, vendedor obrigatório ou estado de publicação. As strings servem às fixtures visuais, não são contrato de domínio de comércio.
14. **Responsabilidades atuais são proporcionais ao estágio visual, mas concentram ciclos distintos.** `Shop.tsx` compõe carregamento demonstrativo, filtros e duas versões responsivas; `ProductCard` fica local ao screen e é usado somente ali. A tela detalhe mantém carregar/compartilhar/salvar. Ao introduzir catálogo remoto e operações de comerciante, esses fluxos precisarão de fronteiras próprias; neste momento não há justificativa para fragmentar o card em vários arquivos.

### Cobertura de testes e controles

`tests/content.test.ts` verifica navegação inferior e resolução de referência `shop_item` contra a fixture `p1`. Não foram encontrados testes de busca/filtro da tela Shop, layout mobile/desktop de lojas, persistência de salvos, detalhe indisponível, erro de imagem, bloqueio de vendedor ou operação de compra/API. Nenhuma chamada real de Shop existe para testar. Os testes não foram executados nesta etapa.

**Resultado da etapa:** o Shop é uma prévia de catálogo, não um comércio operacional. O namespace lógico `shop` já está reservado, mas banco, API, identidade do vendedor, estoque, carrinho, pagamento e entrega ainda não existem; o OpenAPI derivado está adiantado em relação ao código. Nenhum código, contrato ou dado foi alterado.

## Auditoria estrutural do módulo `social` — 27/10/2026

Foram revisados os 38 arquivos do domínio (4.084 linhas), mais os pontos de integração no estado global, rotas, componentes compartilhados, API gerada e rotas reais de Social/Feed no backend. A análise abaixo diferencia o grafo social que já se comunica com a API das publicações/interações ainda locais. Nenhum código, contrato ou dado foi alterado.

### Inventário do domínio

| Arquivo | Responsabilidade observada |
|---|---|
| `application/blockProjection.ts` | Projeta contas bloqueadas por cada lado e a união indisponível no estado local. |
| `application/contentValidation.ts` | Valida publicação/comentário, extrai menções/hashtags, aplica regra de leitura e cria objetos demonstrativos. |
| `application/postAccessPolicy.ts` | Exige sessão/autor e valida leitura da publicação antes de ações de conteúdo. |
| `application/postActions.ts` | Orquestra publicar, comentar, curtidas, repostagem, exclusão e salvos no estado local/serviço de conteúdo. |
| `application/relationshipActions.ts` | Orquestra seguir, solicitações, bloqueio/desbloqueio e sincronização dos relacionamentos remotos/locais. |
| `application/selectSocialView.ts` | Projeta publicações, comentários, contas, contagens e estado relativo ao visualizador. |
| `components/layout/SocialLayout.tsx` | Monta cabeçalho, busca funcional por rota, três colunas no desktop e navegação inferior no mobile. |
| `components/post/PostActionBar.tsx` | Apresenta ações de comentar, repostar, curtir, salvar e compartilhar. |
| `components/post/PostCard.tsx` | Renderiza publicação/artigo/mídia, autor, bloqueio/acesso e exclusão do próprio post. |
| `components/SocialContextPanel.tsx` | Reúne sugestões de pessoas, comércios/avaliações locais e eventos do Seek no painel contextual. |
| `components/SocialDrawer.tsx` | Controla menu lateral como dialog acessível, fechamento ao navegar e retorno de foco. |
| `components/SocialSidebar.tsx` | Apresenta perfil, Círculo, seguir e atalhos para atividades. |
| `data/followRequestStorage.ts` | Lê/grava solicitações de seguir locais no `localStorage`, validando a forma básica. |
| `domain/followRelationships.ts` | Calcula seguimento mútuo, seguidores e remoção das arestas no bloqueio local. |
| `hooks/useRemoteSocialGraph.ts` | Carrega conta, até 100 pedidos recebidos e lista de bloqueios pela API em sessão remota. |
| `screens/ActivityPage.tsx` | Exibe histórico indisponível e listas de salvos, curtidas, comentários próprios e publicações próprias. |
| `screens/ArticleEditor.tsx` | Edita título/corpo, formatação simples, prévia, mídia e audiência de artigo. |
| `screens/ArticleReader.tsx` | Lê artigo acessível, mídia, referência e comentários. |
| `screens/Circles.tsx` | Lista e pagina o Círculo da conta, definido como seguidores mútuos. |
| `screens/Compose.tsx` | Compõe publicação curta, mídia demonstrativa, referência e audiência. |
| `screens/Feed.tsx` | Apresenta abas Para você, Seguindo, Artigos e Vídeos e cartões de publicação. |
| `screens/Followers.tsx` | Adapta a rota de seguidores ao componente compartilhado de conexões. |
| `screens/Following.tsx` | Adapta a rota de seguindo ao componente compartilhado de conexões. |
| `screens/PostDetail.tsx` | Exibe detalhe de publicação acessível e comentários. |
| `screens/Search.tsx` | Pesquisa local por publicação/tag demonstrativa e usa API remota somente para contas. |
| `screens/SuggestionsPage.tsx` | Lista sugestões locais de pessoas, tópicos demonstrativos e contas comerciais. |
| `services/contentService.ts` | Interface de criação de post/comentário e adaptador demonstrativo atualmente selecionado. |
| `services/mediaService.ts` | Valida formatos/tamanho e gera URLs de objeto locais para prévia; não faz upload. |
| `services/restContentService.ts` | Adaptador REST não selecionado para criar post/artigo/comentário. |
| `services/restContracts.ts` | Operações REST propostas para feed, leitura, interações, busca e referências. |
| `services/socialGraphApi.ts` | Cliente ativo gerado para perfil/grafo social, com cookies, CSRF nas mutações e conversão de DTOs. |
| `services/socialHttp.ts` | Cliente e schemas Zod usados apenas pelos adaptadores REST propostos de conteúdo. |
| `state/contentReducer.ts` | Atualiza estado local de posts, comentários, repostagens e favoritos. |
| `state/relationshipReducer.ts` | Atualiza contas e solicitações de seguir locais. |
| `types/followRequest.ts` | Forma compartilhada de pedido de seguimento. |
| `types/posts.ts` | Formatos de publicação, entrada de criação, comentários e repostagens. |
| `types/post.ts` | Modelo de publicação e contadores exibidos pelo cliente. |
| `types/socialActivity.ts` | IDs de curtidas/salvos e repostagens armazenados por conta no navegador. |

Pontos de integração analisados: `modules/app/state/SocialApplicationContext.tsx` (283 linhas) fornece `SocialContext` e instancia ações de Social, Seek/avaliações, Messages e Notifications; `socialApplicationState.ts` (114 linhas) compõe os reducers desses domínios e carrega estado inicial local; `socialApplicationTypes.ts` expõe tipos de cinco domínios em um só contexto. `AuthenticatedRoutes.tsx` registra rotas; `profile/components/ConnectionList.tsx` implementa a lista de seguidores/seguindo apesar de residir em Profile; `CommentThread.tsx` e `use-draft-media.ts` são componentes/hooks compartilhados usados por Social.

### Regras já refletidas no cliente

1. **Círculo = seguimento mútuo.** `areMutualFollowers` exige que ambos sigam um ao outro; no modo remoto, `relationship.inCircle` vem do servidor. A tela privada “Meu Círculo” não aceita consultar o círculo de outra conta.
2. **Perfil privado.** `canReadPost` oculta publicações de conta privada de não aprovados; publicação de audiência “Círculo” continua exigindo reciprocidade. Audiência “Privado” permanece somente para o autor.
3. **Bloqueio local.** O fluxo local elimina arestas de seguimento nos dois sentidos, pedidos pendentes e círculo; a projeção marca as duas contas indisponíveis. Desbloquear apenas retira o bloqueio, sem restaurar seguimentos automaticamente.
4. **Grafo remoto ativo.** `socialGraphApi` usa clientes gerados para busca de contas, seguidores/seguindo paginados, solicitações, Círculo, bloqueios e configurações de privacidade. Mutações passam por obtenção de token CSRF e usam cookies. `relationshipActions` recusa ações da conta autenticada contra usuários demonstrativos.
5. **Publicações e interações ainda demonstrativas.** `SocialContext` ativa `demoContentAdapter`; publicação e comentários são inseridos no reducer e/ou `localStorage` de atividade, não gravados pela API. Curtidas, salvos, repostagens e curtidas em comentários também usam projeção de estado/atividade local.

### Achados, impacto e evidências

1. **Resolvido em 27/10/2026 — isolamento de fixtures e estado local por modo de sessão.** Antes, `SocialProvider` hidratava `createDevelopmentPreviewState()` em qualquer build `DEV`, e `createInitialState` sempre lia contas, pedidos e avaliações do navegador. Agora a hidratação exige simultaneamente build de desenvolvimento e `isDevelopmentPreview` ativo; a leitura inicial do estado local também é limitada ao preview. Os dados locais não são apagados. Testes cobrem a regra de carregamento, estado remoto vazio e manutenção dos dados para o preview.
2. **Resolvido em 27/10/2026 — atividades locais não entram nos agregados remotos.** `selectSocialView` não soma atividades do `localStorage` em contagens/listas de repostagens quando a sessão é remota; no preview a agregação demonstrativa foi preservada e testada. **Limite ainda existente:** os marcadores de interação da própria conta (`isLiked`, `isBookmarked`, `isReposted`) continuam usando atividade local; ações e timeline ainda não estão conectadas ao servidor. Como não há feed remoto ativo no escopo atual, isso não foi apresentado como persistência remota nem alterado nesta correção.
3. **Feed “Para você” não é algoritmo de recomendação.** `useVisibleFeed` junta posts disponíveis e reposts, ordena apenas por `createdAt` decrescente e usa essa mesma lista em “Para você”. Não há busca de feed remoto, ranking, paginação, personalização, deduplicação por relevância ou sinais de recomendação. A aba “Seguindo” filtra localmente por `isFollowing`.
4. **Feed remoto e detalhes não carregam dados da API.** `restSocialApi` não tem consumidores; `Feed`, `useReadablePost`, `PostDetail` e `ArticleReader` leem o estado do `SocialContext`. O estado inicial não carrega publicações do servidor. Em desenvolvimento, os exemplos mascaram a ausência; fora de desenvolvimento, o feed não recebe posts remotos.
5. **Adaptador REST não está habilitado e propõe operações parcialmente inexistentes.** `contentService` aponta fixamente para `demoContentAdapter`; `restContentAdapter` e `restSocialApi` não são importados por consumidores. O backend atual tem rotas de criação/leitura/exclusão de posts e artigos sob `/v1/social`, mas não rotas de timeline `/feed`, curtidas, comentários, repostagens ou exclusão de comentário. O adaptador REST proposto também envia mutações via `socialHttp.apiRequest` sem obter `X-CSRF-Token`, enquanto as rotas de escrita exigem `requireCsrf`; ativá-lo sem ajustar o contrato/CSRF não completa o fluxo.
6. **Mídia de publicação não tem upload nem persistência.** `mediaService` cria `blob:` URLs no navegador; `useDraftMedia.handOff()` preserva os objetos somente enquanto a página/documento atual existir. O endpoint backend de criação textual rejeita mídia com `CONTENT_MEDIA_NOT_READY`; não há endpoint de upload/storage no fluxo. Recarregar ou usar outro dispositivo perde a mídia e a publicação local.
7. **A aba Vídeos inclui publicações só com imagem.** `Feed.tsx` forma `videoPosts` com `p.type === "video" || mediaUrls.length > 0`; qualquer post com imagem entra nessa lista. `VideoFeedItem` então exibe a foto como cartaz e a etiqueta “Prévia ilustrativa — sem vídeo real”. O filtro não corresponde ao nome da aba.
8. **Busca local não aplica integralmente a regra de bloqueio.** Em `Search.tsx`, `filteredUsers` e `filteredPosts` não excluem `isBlocked`; `PostCard` oculta texto do post bloqueado, mas pode mostrar o placeholder “Publicação indisponível” no resultado. No estado de demonstração, uma conta bloqueada ainda pode aparecer nos resultados. Busca remota de contas usa API, mas posts e tags continuam locais/demonstrativos.
9. **Atalhos de atividades navegam para a aba errada e todos parecem ativos.** “Itens salvos”, “Curtidas”, “Comentários” e “Publicações” em `SocialSidebar` apontam ao mesmo `/social/activity`; não passam estado de aba. `ActivityPage` inicia em “Histórico”, e `NavItem` marca todos os itens da mesma rota como ativos. O usuário não chega à seção nomeada pelo atalho.
10. **Sugestões não são recomendação.** “Pessoas para seguir” usa os primeiros elementos do estado local; comércios também são filtrados da lista carregada sem ranking. Tópicos e contagens são fixtures de desenvolvimento. O painel “Lugares em alta” mostra os primeiros comerciais e média local, sem ordenar por popularidade; eventos são os dois primeiros itens da fixture, sem ordenação/consulta remota.
11. **Paginação/concorrência de busca tem janela de dados antigos.** A busca remota inicial cancela atualização por `active` quando o termo muda, mas `loadMoreAccounts()` não captura o termo/cursor da solicitação nem verifica se ainda corresponde à consulta atual. Uma página iniciada antes de mudar o texto pode ser acrescentada aos resultados do novo termo. A busca remota não usa `AbortSignal` apesar da API aceitar um.
12. **Lista de pedidos recebidos não pagina.** `useRemoteSocialGraph` solicita no máximo 100 pedidos e não expõe `nextCursor` ou ação para carregar mais. Mais de 100 solicitações pendentes não são apresentadas ao usuário nessa sessão.
13. **Lista social está localizada fora do domínio Social.** `profile/components/ConnectionList.tsx` concentra busca, API, paginação e mutação de seguidores/seguindo; as telas de Social são wrappers de cinco linhas. O código de relacionamento e seu ciclo de mudança pertencem ao domínio Social, enquanto Profile deveria consumir a lista/contrato.
14. **Contexto global concentra composição de domínios.** `SocialApplicationContext` monta reducer social e também ações/selectors de Seek Reviews, Messages e Notifications; `SocialContextType` expõe todos esses modelos. O reducer agregador é legítimo como composição de estado, mas o provider também concentra integração e montagem de casos de uso, o que aumenta acoplamento entre alterações de feed, relações, mensagens, notificações e avaliações.
15. **Ações de conteúdo não têm uma fronteira de persistência uniforme.** `postActions.ts` inclui ações locais e remotas ao mesmo tempo; `addPost` despacha diretamente sem validação/session policy e não tem consumidor encontrado. `deletePost` só despacha remoção local, apesar de haver rota remota. Curtir/salvar/repostar/comentar não possuem uma implementação remota ativa. Não se deve ativar o caminho local silenciosamente como se a operação tivesse sido persistida.
16. **Fechar editor de artigo perde rascunho sem confirmação.** `ArticleEditor` chama `window.history.back()` no botão “Cancelar” sem confirmar alterações ou descartar mídia com aviso; `Compose` tem confirmação explícita antes de descartar. Os comportamentos não são consistentes.
17. **Histórico é uma seção sem implementação, mas declarada honestamente.** `ActivityPage` apresenta “Histórico de visualizações indisponível nesta versão”; as demais abas derivam das atividades/postagens locais e não consultam API. A tela renderiza o título “Atividades” duas vezes no início (título de página e cabeçalho sticky).
18. **Arquivos de REST proposto são código sem consumidores.** `restContentService.ts`, `restContracts.ts` e `socialHttp.ts` definem schemas, cliente e operações, mas nenhum consumidor os ativa. Há operações não implementadas e CSRF incompatível; manter esse código sem delimitação de “proposta não ativa” deixa o caminho de integração ambíguo.
19. **Mídia é validada apenas no navegador.** MIME declarado/tamanho são validados client-side, e arquivos são carregados no elemento de imagem/vídeo para prévia. Isso não substitui validação do backend; o limite atual chega a 8 vídeos de até 100 MB cada e usa `preload="auto"`, com possível pressão de memória no aparelho durante a leitura de vários arquivos.
20. **A cobertura exercita lógica isolada, não o fluxo social real.** `tests/content.test.ts` cobre reducers, bloqueio local, círculo, validação e conteúdo demonstrativo; `profilePresentation.test.ts` cobre parte da visibilidade. Não há teste de integração frontend/API para feed, publicação remota, CSRF do conteúdo, comentários, ações persistidas, busca remota com troca de termo, feed com usuário bloqueado ou envio real de mídia.
21. **Acessibilidade tem base, mas há pontos específicos.** `SocialDrawer` usa Sheet/Dialog com foco/tecla e substitui o botão fechar duplicado; buscas do `SocialLayout`, Círculo e ConnectionList têm nome acessível; tabs principais incluem teclado. Em contrapartida, a busca principal de `Search.tsx` não tem `label`/`aria-label`, os links do Sidebar não declaram `aria-current`, e a seção de audiência no Compose usa botões sem semântica de radio group, ao contrário do editor de artigo.
22. **Não foi encontrado módulo de comunidades.** “Círculo” é somente a lista privada de seguimento recíproco; não há entidades, rotas ou tela de comunidade/grupo no domínio revisado.

### Verificações executadas nesta etapa

- Inventário de arquivos: 38 arquivos e 4.084 linhas no domínio `social`.
- Busca de consumidores: confirmou cliente ativo `socialGraphApi`, adaptadores de conteúdo REST sem consumidor e uso de ações/contexto por telas/Profile/Settings.
- Busca de rotas e leitura de rotas backend: confirmou rotas remotas de grafo e conteúdo existentes; as interações de like/comment/repost e a timeline não aparecem na implementação atual.
- `pnpm run test:social`: aprovado, 60/60 testes.
- `pnpm --filter @workspace/social run typecheck`: aprovado.
- `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/social run build`: aprovado; a checagem de produção encontrou 96 chunks JavaScript sem dados demonstrativos conhecidos. O Rollup emitiu dois avisos de posição de comentários `@__PURE__` dentro do Zod 4.6.7; não foram alteradas dependências nem esses avisos.
- `git diff --check`: aprovado após remover um espaço final em uma linha desta documentação.

**Resultado da etapa:** o grafo de relações tem integração remota ativa; o feed e as ações de conteúdo permanecem locais/demonstrativos, e a integração de publicação/mídia ainda não está pronta. As regras de círculo e bloqueio local correspondem ao que foi aprovado, mas há lacunas de filtro de bloqueio na busca e de isolamento de estado demonstrativo. Nenhum código, contrato ou dado foi alterado.
