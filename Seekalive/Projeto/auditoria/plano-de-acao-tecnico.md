# Roadmap técnico do Seekalive

## What & Why

Transformar os achados de `Seekalive/Projeto/auditoria/` em um programa de execução controlado para corrigir a arquitetura atual, provar o estado do banco de desenvolvimento, validar os controles de segurança e só então retomar a expansão do backend. O trabalho será organizado por frentes — banco de dados, backend, frontend, segurança, Social/Feed, Seek, mensageria, filas e algoritmo — sem executar frentes simultâneas que possam criar contratos ou migrations incompatíveis.

O roteiro parte do estado real da auditoria: código Drizzle com 13 tabelas em cinco schemas com tabelas; banco físico ainda não consultado; rotas de apresentação com acesso direto a `@workspace/db`; agregação de perfil público em rota; contexto global do front atravessando domínios; divergências entre contratos, documentação e integração real; mensagens, notificações, filas e ranking ainda sem backend completo.

**Premissa de produto:** a rede social é o núcleo do Seekalive e a fonte canônica das contas pessoais e comerciais. O perfil comercial do Social é a origem dos dados que o Seek indexa e apresenta para descoberta; Seek não cria uma conta nem um cadastro comercial paralelo. Shop é um módulo futuro e fica fora da execução até o usuário iniciar essa frente.

## Done looks like

- Cada gate termina com evidências, arquivos alterados, verificações executadas, falhas encontradas e riscos residuais apresentados ao usuário.
- A etapa seguinte não começa sem revisão e aprovação explícita do usuário no gate anterior.
- O estado físico do banco é identificado apenas como desenvolvimento e comparado ao modelo/migrations; nenhuma operação é feita em produção.
- As rotas HTTP ficam como adaptadores; regras, consultas, transações e composição entre domínios pertencem a módulos/casos de uso com fronteiras testáveis.
- Frontend e backend permanecem organizados por domínio, sem monólitos, fragmentação artificial, dependências circulares ou serviços genéricos que concentrem regras.
- Segurança, mensageria, filas e algoritmo têm contratos e critérios de aceitação próprios; nenhuma regra aprovada é alterada silenciosamente.
- Testes, typecheck, build, verificações de migrations, testes de contrato e testes de integração pertinentes passam no corte final, ou cada bloqueio fica explicitamente impedindo a aprovação.
- Documentos-fonte, contratos e código refletem o mesmo estado; arquivos gerados são regenerados a partir de suas fontes.
- O backend só volta a receber novas capacidades depois da aprovação do Gate de prontidão.

## Out of scope

- Banco de produção, publicação, lançamento ou alteração de configuração de produção.
- Gestor e Painel, que estão fora da raiz do Aplicativo auditada.
- Iniciar o Shop ou criar no Seek uma fonte/conta comercial independente do perfil comercial pertencente ao Social.
- Escolher ou contratar provedores externos, configurar credenciais ou ativar entregas externas sem uma aprovação específica.
- Aplicar migrations ao banco principal de desenvolvimento sem mostrar antes o SQL/diff, o impacto, o método de recuperação e obter aprovação explícita para aquela migration.
- Inventar pesos do algoritmo, novas regras sociais, retenção de dados ou permissões sem aprovação do usuário.
- Atualizações de dependências sem necessidade técnica demonstrada e análise de compatibilidade.

## Steps

1. **Gate 0 — estabelecer a linha de base** — Repetir as verificações atuais e revisar os achados da auditoria contra o código presente; classificar cada item como defeito confirmado, integração ausente, divergência documental ou estado desconhecido. Consultar o banco somente em modo de leitura e apenas após confirmar que o destino é o banco de desenvolvimento; confrontar também a diferença entre Node 20 configurado e o engine do workspace, além das divergências documentais sobre tabelas, recuperação de senha, perfis, Feed e inventário do front. Se a proteção de ambiente impedir a confirmação, parar e pedir a informação específica, sem inferir o banco; apresentar a linha de base e as correções factuais propostas para aprovação.
### Gate 0A — corrigir primeiro a estrutura do frontend e do backend

Antes do Gate 1 ou de novas funcionalidades, auditar e corrigir a responsabilidade real dos arquivos por domínio, camada e aplicação; não basta criar pastas ou mover código. Trabalhar um domínio por vez, em ordem alfabética dentro de cada aplicativo, concluir e validar a pasta atual antes de passar à próxima e parar para revisão do usuário a cada domínio. Começar pelo domínio backend `accounts`, já iniciado nesta etapa; depois concluir os demais domínios do backend e então revisar o frontend. Preservar rotas, contratos, regras, permissões e comportamento visual; nenhuma migration, mudança de schema ou início do Shop nesta fase. Considerar concluído somente quando os domínios atuais de ambos os lados tiverem sido inspecionados, as responsabilidades independentes estiverem nos arquivos apropriados e as verificações de imports, ciclos, testes, tipos e build passarem.
2. **Gate 1 — reconciliar o modelo de dados** — Comparar schemas/tabelas Drizzle, migrations, journal, documentação e estado físico confirmado, incluindo `account_username_reservations` e `feed.posts`; atualizar o dicionário e a matriz de estado sem declarar migration aplicada antes da evidência. Validar migrations em schema temporário isolado; apresentar qualquer alteração necessária e seu plano de rollback para aprovação antes de aplicá-la ao schema principal de desenvolvimento.
3. **Gate 2 — modularizar Auth e Accounts no backend** — Separar as operações de persistência atualmente presentes nas rotas em casos de uso/repositórios do domínio proprietário, trabalhando um fluxo por vez: cadastro, e-mail, login/sessões, senha e dispositivos confiáveis. Preservar API, mensagens de erro e regras aprovadas; após cada fluxo, executar os testes correspondentes e parar para revisão.
4. **Gate 3 — corrigir a fronteira de Profiles** — Mover a composição de perfil público para um caso de uso de leitura e estabelecer consultas entre Accounts, Social e Feed por contratos exportados pelos domínios proprietários, sem acesso direto às tabelas de outro domínio. Validar bloqueios, privacidade, perfis pessoais/comerciais, paginação e respostas HTTP antes da aprovação do gate.
5. **Gate 4 — modularizar Social e Feed no backend** — Retirar persistência e composição de negócio das rotas sociais/de Feed, mantendo cada regra no módulo correspondente; trabalhar uma família de operações por vez e confrontar handlers, OpenAPI integrado, cliente gerado e documentação para marcar claramente o que está implementado, migrado e consumido pelo front. Não editar artefatos gerados manualmente nem declarar recurso ativo apenas porque há um handler.
6. **Gate 5 — conectar o estado do frontend aos contratos remotos** — Com as fronteiras por domínio já estabelecidas no Gate 0A, ligar cada fluxo de estado aos endpoints correspondentes sem reintroduzir agregação de regras entre Social/Feed, Seek, Mensagens e Notificações. Preservar navegação, tamanhos, botões, preview e regras de privacidade; validar cada domínio antes de integrar o seguinte.
7. **Gate 6 — revisar e fechar segurança** — Construir uma matriz de ameaças e controles para cadastro, autenticação, sessão, token de instalação, CSRF, autorização, perfis, Social e conteúdo; confrontá-la com as regras já aprovadas e corrigir as falhas confirmadas. Incluir teste automatizado para unicidade e contrato dos códigos de erro, e executar testes de segurança e análise de dependências aplicáveis ao código existente, sem chamar uma correção de concluída se houver alerta relevante aberto ou controle apenas visual.
8. **Gate 7 — decidir prontidão antes de novas funcionalidades** — Executar regressão completa de front, backend, contratos e banco de desenvolvimento, incluindo fluxos autenticados testáveis e integrações reais que já existam. Apresentar uma lista fechada de defeitos corrigidos, testes, limites e riscos residuais; aguardar aprovação explícita para retomar a construção de capacidades de backend.
9. **Gate 8 — completar Social e Feed** — Só após o Gate 7, ligar publicação e as operações sociais ainda locais a contratos e persistência do backend, começando por uma capacidade vertical de cada vez e mantendo regras de bloqueio, Círculo, perfil privado e exclusão já aprovadas. Cada capacidade inclui migrations, autorização por recurso, paginação/consistência, UI, testes e documentação antes da próxima.
10. **Gate 9 — construir o backend do Seek** — Tratar Seek como descoberta/projeção dos perfis comerciais canônicos do Social, sem cadastro ou identidade comercial duplicada, e implementar, por fatias aprovadas, catálogo público, localização/endereço principal, filtros, serviços, avaliações e eventos conforme o escopo já definido. Validar que somente contas comerciais existentes no Social aparecem no Seek e que campos não oferecidos/não informados não são publicados; não iniciar Shop nesta etapa.
11. **Gate 10 — construir Mensagens e Notificações** — Definir ownership de dados, contratos, autorização, solicitações, leitura/entrega e estados de UI para cada domínio antes de conectar o cliente; preservar as regras aprovadas de bloqueio e visibilidade de conversas. Entregar uma operação vertical completa, com persistência e testes, por vez; não simular persistência usando estado local como se fosse sincronizado.
12. **Gate 11 — avaliar e implementar filas** — Mapear quais trabalhos realmente precisam ser assíncronos e comparar a alternativa mais simples com uma fila antes de escolher tecnologia; então, se justificado e aprovado, implementar um fluxo por vez com idempotência, retries limitados, tratamento de falhas, descarte/recuperação, observabilidade e teste de reprocessamento. A pasta `infra/queues` é preparação documental, não prova de serviço ativo.
13. **Gate 12 — especificar e aprovar os algoritmos** — Criar especificações separadas para Feed Social e descoberta Seek: objetivos, sinais permitidos, privacidade, cold start, diversidade, explicabilidade, limites de abuso e métricas. Apresentar exemplos de ordenação e casos de teste ao usuário; não escolher pesos ou sinais sensíveis sem aprovação.
14. **Gate 13 — implementar a primeira versão dos algoritmos** — Implementar somente a especificação aprovada, em módulos de domínio separados, com ranking determinístico inicial, fixtures representativas, testes de invariantes e proteção contra resultados vazios ou enviesados por dados de demonstração. Medir os resultados em desenvolvimento e obter revisão antes de considerar ajustes adicionais.
15. **Gate final — integração e encerramento** — Rodar a suíte completa, typecheck, build, migrations/checks, testes de contrato e fluxos integrados; verificar divergências de schema, chamadas locais indevidas, logs sensíveis, imports entre domínios e documentação gerada. Registrar o resultado final e não avançar para produção nem declarar prontidão pública sem uma autorização posterior específica.

**Disciplina de execução:** cada número é uma atividade sequencial, não um convite para executar várias frentes em paralelo. Ao fim de cada gate, parar; entregar diagnóstico, diff, comandos/resultados e decisão necessária; só seguir após aprovação do usuário. Se uma verificação falhar, corrigir e repetir a verificação afetada antes de avançar. Se a correção exigir mudar regra aprovada ou ampliar o escopo, pausar e discutir antes de alterar.

## Relevant files

- `Seekalive/Projeto/auditoria/00-indice-metodologia-e-conclusoes.md`
- `Seekalive/Projeto/auditoria/01-arvore-e-catalogo-da-raiz.md`
- `Seekalive/Projeto/auditoria/02-backend-e-banco.md`
- `Seekalive/Projeto/auditoria/03-frontend.md`
- `Seekalive/Projeto/auditoria/04-contratos-documentacao-e-validacoes.md`
- `Seekalive/Projeto/auditoria/05-documentos-artefatos-e-assets.md`
- `Seekalive/Projeto/infra/database/src/schema/accounts.ts`
- `Seekalive/Projeto/infra/database/src/schema/security.ts`
- `Seekalive/Projeto/infra/database/src/schema/social.ts`
- `Seekalive/Projeto/infra/database/src/schema/seek.ts`
- `Seekalive/Projeto/infra/database/src/schema/feed.ts`
- `Seekalive/Projeto/infra/database/migrations/meta/_journal.json`
- `Seekalive/Projeto/infra/queues/README.md`
- `Seekalive/Projeto/Aplicativo/back/src/modules/auth/presentation/registrationRoutes.ts`
- `Seekalive/Projeto/Aplicativo/back/src/modules/auth/presentation/emailVerificationRoutes.ts`
- `Seekalive/Projeto/Aplicativo/back/src/modules/auth/presentation/sessionRoutes.ts`
- `Seekalive/Projeto/Aplicativo/back/src/modules/profiles/presentation/publicProfileRoutes.ts`
- `Seekalive/Projeto/Aplicativo/back/src/modules/social/presentation/circleRoutes.ts`
- `Seekalive/Projeto/Aplicativo/back/src/modules/feed/presentation/routes.ts`
- `Seekalive/Projeto/Aplicativo/front/src/modules/app/state/SocialApplicationContext.tsx`
- `Seekalive/Projeto/Aplicativo/front/src/modules/app/state/socialApplicationState.ts`
- `Seekalive/Projeto/Aplicativo/front/src/modules/app/state/socialApplicationTypes.ts`
- `Seekalive/Projeto/Aplicativo/front/src/modules/social/services/contentService.ts`
- `Seekalive/Projeto/Aplicativo/front/src/modules/social/services/restContentService.ts`
- `Seekalive/Projeto/Aplicativo/front/src/modules/seek/hooks/useSeekDiscovery.ts`
- `Seekalive/Projeto/shared/api-spec/openapi.yaml`
- `Seekalive/Projeto/shared/api-spec/orval.config.ts`
- `Seekalive/Projeto/shared/contracts/src/errorCodes.ts`
- `Seekalive/Projeto/docs/api/backend/data-dictionary.md`
- `Seekalive/Projeto/docs/api/backend/frontend-integration.md`
- `Seekalive/Projeto/docs/api/backend/frontend-readiness-audit.md`
- `Seekalive/Projeto/Aplicativo/back/test/api-isolated-db.test.mjs`
- `Seekalive/Projeto/package.json`
