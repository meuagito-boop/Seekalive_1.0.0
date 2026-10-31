# R2-09 — Armazenamento frontend, clientes HTTP e bundle

**Status:** revisão estática concluída; build de produção executado com sucesso. Nenhum workflow foi reiniciado e nenhum teste E2E/browser foi executado.

## Armazenamento no navegador

### Chaves identificadas

| Armazenamento | Chave/base | Uso |
|---|---|---|
| `localStorage` | `seekalive-social-accounts` | Contas locais de demonstração/preview (`accountStorage.ts:3,18-36`). |
| `localStorage` | `seekalive-active-account` | Conta local ativa usada pela camada de preview (`accountStorage.ts:4,39-60`). |
| `localStorage` | `seekalive-social-reviews` | Avaliações comerciais locais (`businessProfileReviewStorage.ts:3,27-50`). |
| `localStorage` | `seekalive-follow-requests` | Pedidos locais de seguir (`followRequestStorage.ts:3,14-31`). |
| `localStorage` | `seekalive-social-account-activity` | IDs de curtidas, comentários curtidos, salvos, reposts e itens lidos; indexado por conta (`accountActivityStorage.ts:4,73-96`). |
| `localStorage` | `seekalive-settings-appearance:<account>` | Preferência de aparência/tamanho de fonte (`appearancePreferences.ts:3,11-15`). |
| `localStorage` | `seekalive-settings-notifications:<account>` | Preferências de notificação (`notificationPreferences.ts:3,24-28`). |
| `localStorage` | `seekalive-settings-privacy:<account>` | Preferências locais de privacidade/mensagens/recibos (`privacyPreferences.ts:3,17-21`). |
| `localStorage` | `seekalive-blocked-users:account:<id>` | IDs de bloqueios no estado de navegador (`SocialApplicationContext.tsx:90`; `browserAccountStorage.ts:3-5,12-40`). |
| `localStorage` | `seekalive-saved-shop-items:account:<id>` | IDs de itens Shop salvos no navegador (`useSavedShopItems.ts:5-14`). |
| `localStorage` | `seekalive-saved-businesses:account:<id>` | Negócios salvos no Seek, também usado no perfil comercial (`useSeekDiscovery.ts:12-13,41-43`). |
| `sessionStorage` | `seekalive-seek-filters:account:<id>` | Filtros da descoberta na aba atual (`useSeekDiscovery.ts:12,22-24,119-122`). |
| `sessionStorage` | `seekalive-seek-saved-events:account:<id>` | IDs de eventos salvos na sessão atual (`useSeekDiscovery.ts:14,43-44`). |
| `sessionStorage` | `seekalive-seek-recent-cities:account:<id>` | Até cinco cidades selecionadas; coordenadas são explicitamente omitidas (`seekLocationService.ts:9,78-96`). |
| `sessionStorage` | `seekalive-seek-scroll` | Posição de rolagem da tela (`useSeekDiscovery.ts:15,97-105`). |
| `sessionStorage` | `seekalive-seek-demo-preview` | Preferência de exibição de exemplos, usada apenas quando `import.meta.env.DEV` (`useSeekDiscovery.ts:16,47-49,124-127`). |
| Cookie legível por JS | `sidebar_state` | Estado visual aberto/fechado da barra lateral; 7 dias, `Path=/`, sem atributos explícitos `HttpOnly`, `Secure`, `SameSite` ou `Domain` (`components/ui/sidebar.tsx:28-29,85-87`). |

Não foi localizado token de sessão, token bearer nem senha em `localStorage`/`sessionStorage`. A autenticação do backend usa cookies `HttpOnly` descritos em R2-02; o token CSRF é obtido por requisição e mantido em memória pelo cliente. A interface `User` permite campo opcional `email`, mas o mapeador de conta do servidor não o copia (`profile/types/user.ts:3-25`; `socialGraphApi.ts:95-117`). Como `accountStorage.ts` serializa o objeto recebido integralmente, a ausência de e-mail só é garantida para objetos que não o contenham; o armazenamento continua sendo estado local de preview, não armazenamento seguro de conta.

### R2-09-001 — Dados de preview persistidos no navegador não são fonte segura ou compartilhada

- **Rodada 1:** amplia 12-008
- **Veredito:** CONFIRMADO
- **Evidência:** as chaves e as operações de leitura/escrita acima usam `localStorage`/`sessionStorage`; `accountStorage.ts:29-36` salva o objeto `User` inteiro. `User` pode conter e-mail (`types/user.ts:9`), embora o mapper server-side omita esse campo.
- **Risco:** Baixo — os dados de preview são modificáveis por qualquer script same-origin e não sincronizam entre dispositivos; não substituem persistência nem controle de autorização do backend.

## Links, conteúdo e mídia

- Os três links externos encontrados que usam `target="_blank"` também usam `rel="noopener noreferrer"` (`CommercialProfilePage.tsx:414-418,600-604`; `CommercialProfileInformation.tsx:168-172`).
- Não foi encontrado `dangerouslySetInnerHTML`, `innerHTML`, `marked` ou `react-markdown` no frontend. Conteúdo de publicação/artigo é renderizado como texto React nos componentes auditados; não foi identificado parser de HTML/Markdown.
- O website comercial é validado como HTTP/HTTPS no contrato (`R2-05`, `shared/contracts/src/social.ts:23-33`). O mapa é montado com endereço codificado e usa link externo protegido (`CommercialProfileInformation.tsx:167-175`; `CommercialProfilePage.tsx:414-418`).
- URLs de mídia publicadas são resolvidas por rota da API e validadas no backend contra post legível, conforme R2-04; o build não altera esse contrato.

## Clientes HTTP: Orval, `socialHttp` e `httpClient`

O frontend usa o cliente React gerado pelo Orval em `@workspace/api-client-react` para relações sociais, envolvido por `socialGraphApi.ts`. Esse wrapper injeta `credentials: "include"` e obtém CSRF antes de operações de escrita (`socialGraphApi.ts:73-93`). O transport Orval `customFetch` isolado não adiciona CSRF nem define `credentials`; ele preserva `status`, `headers` e corpo em `ApiError` (`shared/api-client-react/src/custom-fetch.ts:325-370`). Os demais fluxos REST de feed usam o cliente manual `socialHttp.ts`; Auth e outros serviços usam `httpClient.ts`.

| Comportamento | `httpClient.ts` | Orval via `socialGraphApi.ts` | `socialHttp.ts` |
|---|---|---|---|
| Cookies | `credentials: "include"` em GET/POST/PUT/DELETE. | Wrapper define `include` para leituras e escritas. | Define `include` em todas as requisições. |
| CSRF | Busca token e o envia em POST/PUT/DELETE (`httpClient.ts:75-139`). | Wrapper busca token para escrita (`socialGraphApi.ts:83-92`); geração Orval direta não oferece isso por si só. | Busca token em todos os métodos não seguros (`socialHttp.ts:48-63`). `init.headers` é mesclado depois do token. |
| Erros HTTP | `ApiRequestError` preserva status, código, chave, detalhes, e-mail de suporte, retry-after e dados de challenge (`httpClient.ts:9-23,35-55`). Nenhum status aciona retry automático. | `ApiError` original contém status/body/headers, mas o wrapper normaliza para status, código e chave (`socialGraphApi.ts:39-70`). Nenhum retry automático. | Mapeia mensagens específicas para 401/403/404/409/422; os outros status (incluindo 412/413/429) recebem mensagem genérica e só preservam o status em `ContentServiceError` (`socialHttp.ts:67-78`). |
| Cache de GET | `cache: "no-store"` (`httpClient.ts:75-81,142-151`). | Configuração de cache não é aplicada pelo wrapper; depende de `fetch`/cabeçalhos HTTP do servidor. | Não define `cache: "no-store"` (`socialHttp.ts:48-63`). |
| Validação de resposta | Validador de contrato opcional por status (`httpClient.ts:57-70`). | Schemas gerados para algumas rotas; `socialGraphApi` transforma DTOs em modelos UI. | Validação local com Zod para posts/comentários (`socialHttp.ts:8-46,88-102`). |

### R2-09-002 — Tratamento de erros diverge entre os clientes de Social

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `socialHttp.ts:67-78` mapeia apenas 401/403/404/409/422 e transforma 412/413/429 em mensagem genérica; `httpClient.ts:43-55` mantém os campos estruturados; `socialGraphApi.ts:55-70` descarta detalhes e retry-after ao normalizar.
- **Risco:** Médio — mensagens, recuperação de sessão, validação condicional e espera após rate limit podem variar entre operações equivalentes.

## Build de produção

- Condições do roteiro atendidas: `Aplicativo/front/dist/public` está ignorado por `.gitignore:4`; workflows configurados usam comandos `dev`, não servem esse diretório. O build ficou restrito ao output ignorado.
- Primeira tentativa, sem configurar variáveis exigidas pelo `vite.config.ts`, terminou em exit 1 antes de compilar (`PORT` obrigatório).
- Reexecução: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/social run build` — **exit 0**, Vite compilou 2.696 módulos em 19,41 s; script de verificação informou **96 chunks JS sem cinco literais de fixtures conhecidos**.
- O build emitiu dois avisos do Rollup sobre posição de anotações `@__PURE__` dentro de Zod. Não foram alterados comentários nem dependências.
- Busca adicional nos chunks: nenhum `import.meta.env.DEV` residual; nenhum nome `previewFixtures` ou `developmentSeekEvents`; o identificador `developmentExampleAccountIds` ainda aparece no chunk do Seek e textos genéricos “dados de demonstração” em três chunks. Os literais de fixtures que o verificador do projeto conhece não foram encontrados; os identificadores/textos residuais não provam que registros de demonstração estejam no bundle, mas impedem afirmar que todo marcador relacionado a preview foi removido.

### R2-09-003 — Marcadores de preview permanecem no bundle apesar da ausência de fixtures conhecidas

- **Rodada 1:** novo
- **Veredito:** PARCIAL
- **Evidência:** build de produção passou; `import.meta.env.DEV` e marcadores literais de fixtures conhecidos não foram encontrados; a busca encontrou o símbolo `developmentExampleAccountIds` e mensagens genéricas de demonstração em chunks minificados.
- **Risco:** Informativo — não há evidência de dados demonstrativos reais no resultado, mas a inspeção textual não comprova que todos os caminhos de preview foram removidos do artefato.

## Verificação dinâmica de dois clientes

**NÃO EXECUTADO:** a comparação com dois clientes/browser autenticados exigiria servidor ativo e/ou autenticação; o pré-voo obrigatório global não liberou essas suítes (R2-01-001). A paridade acima foi analisada estaticamente.

## Resumo R2-09

- **Achados novos:** 3 (1 médio, 1 baixo, 1 informativo).
- **Build:** passou após fornecer `PORT` e `BASE_PATH`; output ignorado pelo Git.
- **E2E/paridade de dois clientes:** não executada.
- **Tokens/senhas em storage JS:** não localizados; dados de preview e preferências ficam em armazenamento local do navegador.
