# Validação técnica do pacote A01 — Seekalive

**Data da atualização:** 24/10/2026
**Escopo:** validação do pacote A01 no Aplicativo Social, backend compartilhado e codegen relacionado.  
**Ambiente:** desenvolvimento/preview. Nenhum teste foi executado em produção.  
**Classificação:** **IMPLEMENTADO, MAS PARCIALMENTE VALIDADO**. A configuração explícita de confiança em proxy foi retirada do A01 por decisão do usuário; Express permanece com `trust proxy = false`.

## A. Resumo executivo

O A01 manteve a versão corrigida `proxy-addr@2.0.8`, Orval 8.22.0 e as atualizações de dependências/codegen. A configuração explícita de proxy e a função de allowlist foram removidas conforme solicitado; o comportamento padrão do Express (`trust proxy = false`) ignora `X-Forwarded-For`. Os testes locais verificam esse padrão e o rate limit. Orval gera os clientes a partir da especificação local, o typecheck geral passa e os builds do backend e frontend concluem.

Não considero o pacote concluído para produção. A configuração de proxy foi deliberadamente adiada, e a infraestrutura real de produção ainda não existe ou não foi disponibilizada. Com o padrão atual, cabeçalhos encaminhados são ignorados, mas visitantes atrás de um proxy compartilhado podem ser agrupados sob o IP desse proxy para rate limiting. A política só deve ser revisitada quando a topologia de staging/produção for conhecida.

O Resend foi testado em desenvolvimento: a API aceitou o envio e o usuário confirmou recebimento. Ainda faltam testes de cadastro/verificação ponta a ponta com banco de teste. O scanner encontrou dependências de severidade alta no backend e no grafo de codegen; elas não foram atualizadas nesta validação. A auditoria principal registra o estado atual e define A02 como próximo pacote.

## B. Arquivos modificados

### Implementação existente do A01

| Arquivo | Alteração | Motivo técnico | Área |
|---|---|---|---|
| `Aplicativo/back/src/security/trustProxy.ts` | **Removido em 24/10/2026.** A função de allowlist por CIDRs foi retirada por decisão do usuário. | Adiar configuração de confiança em proxy até conhecer a topologia real; Express usa o padrão seguro `trust proxy = false`. | API |
| `Aplicativo/back/src/app.ts` | **Removido em 24/10/2026.** `app.set("trust proxy", ...)` foi retirado. | Manter Express sem confiança explícita em cabeçalhos encaminhados. | API |
| `Aplicativo/back/package.json` | Declara `proxy-addr@^2.0.8`. | Garantir a versão corrigida no runtime do Express. | API |
| `shared/api-spec/package.json` | Atualiza Orval para 8.22.0. | Atender à versão corrigida mínima indicada na auditoria anterior. | Codegen compartilhado |
| `shared/api-spec/orval.config.ts` | Corrige os diretórios de saída, bloqueia referências externas no parser e verifica JSON Pointers locais no transformer. | Gerar nos pacotes existentes e evitar buscar `$ref` externo. | Codegen compartilhado |
| `shared/api-client-react/src/generated/api.ts` | Código regenerado. | Manter o cliente React alinhado à especificação versionada. | Contrato compartilhado |
| `shared/api-client-react/src/generated/api.schemas.ts` | Código regenerado. | Manter os schemas do cliente alinhados. | Contrato compartilhado |
| `shared/contracts/src/generated/api.ts` | Código regenerado. | Manter o contrato compartilhado alinhado. | Contrato compartilhado |
| `shared/contracts/src/generated/types/healthStatus.ts` | Código regenerado. | Saída de schema do codegen. | Contrato compartilhado |
| `shared/contracts/src/generated/types/index.ts` | Código regenerado. | Exportar a saída de schema do codegen. | Contrato compartilhado |
| `Aplicativo/front/package.json` | Atualiza Vite para 7.3.7 e `@hookform/resolvers` para 5.9.2. | Vite: corrigir a versão sinalizada na auditoria. Resolver: corrigir erros concretos de tipos dos formulários entre Zod e React Hook Form, sem casts de tipo. | Frontend Social |
| `artifacts/mockup-sandbox/package.json` | Atualiza Vite para 7.3.7. | Alinhar os tipos dos plugins e fazer o typecheck do sandbox passar. | Sandbox de prévias |
| `pnpm-lock.yaml` | Atualiza as resoluções correspondentes às versões acima. | Reprodutibilidade das dependências instaladas. | Workspace |
| `scripts/package.json` | Adiciona o comando de testes de limites de segurança. | Executar os testes A01 pelo padrão Node test runner/tsx já usado no workspace. | Scripts |

### Alteração feita nesta validação

| Arquivo | Alteração | Motivo técnico | Área |
|---|---|---|---|
| `scripts/src/security-boundaries.test.mjs` | Acrescenta teste HTTP local usando o `createAuthRateLimit` real: cabeçalhos encaminhados diferentes não mudam o IP observado e o terceiro pedido recebe 429. | Os testes anteriores verificavam a função de confiança, mas não demonstravam o efeito do cabeçalho sobre o middleware de rate limit. | Testes do backend |

Na validação original, o novo teste HTTP local foi acrescentado. Na atualização de 24/10/2026, o helper de proxy e a configuração explícita foram removidos; o teste HTTP passou a verificar o default do Express. Nenhuma alteração foi feita no código do Gestor ou do Painel.

## C. Segurança do proxy

- A função `createTrustProxy()` e a chamada `app.set("trust proxy", ...)` foram removidas em 24/10/2026, a pedido do usuário.
- Express permanece no default `trust proxy = false`; não usa `X-Forwarded-For` para escolher `req.ip`.
- A dependência transitiva usada pelo Express permanece corrigida e foi conferida como `proxy-addr@2.0.8`; isso não habilita confiança em proxies.
- O teste HTTP local envia três valores diferentes de `X-Forwarded-For`; todos conservam o IP do socket local, e o terceiro pedido recebe 429. Não há mais teste de allowlist porque essa configuração saiu do escopo.
- O smoke test de login no preview, com usuário fictício inexistente e senha não real, retornou `401 INVALID_CREDENTIALS`. A obtenção de CSRF retornou 200.
- Antes da remoção, `TRUSTED_PROXY_CIDRS` estava ausente no ambiente consultado. A topologia real de produção não foi fornecida; nenhum CIDR foi inventado. A configuração permanece adiada.
- O rate limit de login configurado é 10 pedidos por IP a cada 15 minutos. Ele usa um `Map` em memória do processo, não uma store compartilhada entre instâncias; a validação não comprova proteção distribuída entre réplicas.

## D. Resultados dos testes

| Teste/verificação | Resultado | Evidência | Pendência |
|---|---|---|---|
| `pnpm --filter @workspace/api-spec run codegen` | Aprovado | Orval 8.22.0 gerou cliente React e schemas; `typecheck:libs` passou. | Não valida geração de uma especificação externa; o parser está configurado para negar refs externos. |
| `pnpm --filter @workspace/scripts run test:security-boundaries` | Aprovado, 5/5 após retirar a configuração explícita | Versão do `proxy-addr`, default `trust proxy = false`, efeito real de XFF no rate limit e regra de `$ref`. | Não substitui teste através da cadeia de proxies de produção. |
| `pnpm run typecheck` | Aprovado | Pacotes do workspace compilados, incluindo frontend, API, scripts, contratos e sandbox. | Não significa que fluxos funcionais com banco estejam testados. |
| `pnpm run test:social` | Aprovado, 42/42 | Testes de regressão do Social e Seek. | Não é suíte HTTP/DB de autenticação. |
| `pnpm --filter @workspace/api-server run build` | Aprovado | Build da API concluído. | Nenhum teste de integração com banco foi executado. |
| `pnpm --filter @workspace/social run build` | Aprovado, com avisos | Vite 7.3.7 produziu o bundle. Bundle principal: 953,10 kB; avisos de sourcemap e importação mista de `mockData.ts`. | Avisos de performance/sourcemap permanecem. |
| Preview e API | Aprovado para smoke test | Página inicial abriu; `/api/healthz` retornou `{"status":"ok"}`; sessão sem cookie retornou estado não autenticado. | Não valida produção. |
| Login com credenciais inválidas | Aprovado para um caso negativo no preview | CSRF 200; tentativa fictícia retornou `401 INVALID_CREDENTIALS`. | Não testei conta real nem login válido. |
| Login válido, sessão verificada e bloqueio após limite | Não executado integralmente | O código exige conta e banco; não há fixture/teste HTTP de autenticação disponível. O middleware de rate limit foi testado isoladamente por HTTP local. | Criar conta de teste em banco descartável e executar a suíte de integração. |
| Verificação de e-mail | Envio de teste aceito e recebido; cadastro não testado ponta a ponta | Resend foi habilitado somente no desenvolvimento; a chamada de envio retornou 200 e o usuário confirmou recebimento. A consulta do status de leitura retornou 401 por falta de permissão de leitura. O fluxo ainda depende de banco e conta descartável. | Testar cadastro, reenvio, expiração e confirmação em banco descartável. Produção permanece desativada. |
| Recuperação de senha | Não executada; rota não encontrada | A API de autenticação não contém endpoint de recuperação/redefinição de senha. | Funcionalidade pendente, fora das alterações feitas no A01. |
| Lint | Não executado | Não há script `lint` nos manifests consultados. | Definir comando de lint em etapa própria, se desejado. |
| Gestor/Painel | Não executado | Não aparecem como targets no workspace pnpm consultado. | Nenhum código deles foi alterado; não há comando de validação disponível neste workspace. |

## E. Vite e dependências

- **Vite do frontend Social:** 7.3.3 → 7.3.7. O build e o typecheck passam. O scanner atual não reportou advisory para o pacote Vite 7.3.7 em si.
- **Escopo:** a atualização também está em `artifacts/mockup-sandbox/package.json`, que não é o frontend Social. Isso foi feito antes desta validação para alinhar os tipos e resolver o typecheck do sandbox. É uma divergência em relação à instrução mais estrita de restringir o Vite ao Social; não a reverti nesta tarefa de validação. Não houve atualização global do catálogo nem alteração no Gestor/Painel.
- **`@hookform/resolvers`:** 3.10.0 → 5.9.2. Foi uma atualização major motivada por quatro erros reais de typecheck em formulários; após a atualização, typecheck geral e build passam. Não há testes de interação dedicados aos formulários neste pacote.
- **Orval:** 8.22.0. A configuração explicita `externalRefs.allow: []`, que bloqueia referências externas antes do dereference; o transformer também exige JSON Pointer local.
- **Scanner de dependências atual, workspace inteiro:** 0 críticas, 16 altas, 10 moderadas e 6 baixas. O resultado não é isolado ao Aplicativo. SAST: 0 achados, scan completo. HoundDog: 1 achado baixo, sobre o email temporário em `sessionStorage` no cadastro.
- Dependências altas ainda encontradas pelo scanner:
  - `body-parser@2.2.2`, transitiva do Express 5.2.1 usado pela API; correção indicada: 2.4.0.
  - `fast-uri@3.1.2`, no grafo de `@scalar/openapi-parser`/Ajv usado pelo Orval; há correções indicadas a partir de 3.1.3–3.1.7 conforme advisory.
  - `js-yaml@4.2.0`, dependência do Orval 8.22.0; correções indicadas até 4.3.2.
  - `browserslist@4.28.2`, `postcss@8.5.14` e `source-map-js@1.2.1`, transitivas do toolchain frontend/sandbox; correções indicadas pelo scanner em versões posteriores.
  - `zod@3.25.76`, usado na API e contratos; o scanner indica 4.6.6, que é major e não foi aplicado.
- Não atualizei essas dependências adicionais nesta validação: o prompt limita a mudança ao escopo A01 e exige confirmação antes de ampliar alterações. Os achados precisam de triagem/decisão específica; o bloqueio de refs reduz uma superfície do codegen, mas não prova ausência de risco nas dependências transitivas.

## F. Regressões e impacto

- Não houve falha no typecheck, no codegen, nos 42 testes sociais, nos 7 testes de segurança ou nos builds executados.
- O preview Social abriu após reiniciar os workflows; API e front estão ativos no ambiente de desenvolvimento.
- Não foram feitas operações de produção, criação de contas, alteração de banco, publicação ou deploy.
- Gestor e Painel não foram modificados. Como não constam como targets de build/test do workspace consultado, não afirmo que foram testados.
- A atualização de Vite no sandbox de componentes é uma alteração fora do limite estrito “somente Social”; está declarada acima e permanece sem reversão para não mudar estado anterior sem autorização.

## G. Pendências e riscos

1. Manter Express com `trust proxy = false` por enquanto. Antes de staging/produção, decidir a topologia real e só então aprovar/configurar proxies confiáveis e validar o IP e rate limit através da cadeia publicada.
2. O rate limit é em memória e por processo; definir uma estratégia distribuída antes de operar várias instâncias.
3. Triar e corrigir, com testes de compatibilidade, os achados altos de `body-parser`, `fast-uri`, `js-yaml`, `browserslist`, `postcss`, `source-map-js` e Zod. A mudança de Zod é major.
4. Criar um banco descartável de teste e uma suíte HTTP/DB para login válido, conta não verificada, rate limit da rota real, sessões e logout.
5. Resend está habilitado somente em desenvolvimento e o envio de teste foi recebido. A verificação completa do cadastro ainda depende de E2E com banco descartável; produção permanece desativada.
6. Implementar e testar recuperação de senha em pacote posterior.
7. Avaliar a divergência da versão Vite do sandbox em relação ao limite “Vite somente no Social”.
8. Resolver os avisos do build do frontend (bundle, sourcemap e importação de mocks) em etapa própria.

## H. Estado final

**IMPLEMENTADO, MAS PARCIALMENTE VALIDADO.**

Os requisitos de código e testes locais principais do A01 passam: versão corrigida de `proxy-addr` confirmada no Express, default `trust proxy = false`, cabeçalhos encaminhados não escolhem o IP, middleware de limite responde 429, Orval gera os artefatos e os builds/typechecks aprovam. A configuração explícita de proxy foi retirada do escopo, não é bloqueio atual do A01 e continua sendo decisão necessária antes de validar a implantação real. A classificação permanece parcial pelas dependências de severidade alta não triadas e pela ausência de suíte integrada de autenticação. Não há evidência para declarar o proxy ou a autenticação validados em produção.
