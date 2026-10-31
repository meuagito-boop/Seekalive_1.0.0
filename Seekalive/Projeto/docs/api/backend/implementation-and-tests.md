# Plano de implementação e testes

Este documento registra etapas de implementação e testes do ambiente de desenvolvimento. As contagens e a presença física de tabelas não são fixadas aqui: use `queries/development-database-catalog.sql` contra o banco de desenvolvimento. Schemas lógicos e trilhas de migration são organizados por domínio. Este arquivo não declara estado de produção.

**Avaliações de perfil comercial:** contrato, rotas e lógica pertencem a Profiles; Seek não cria nem responde avaliações e pode consumir somente projeções autorizadas. O estado atual do schema físico precisa ser verificado pela consulta de catálogo, não inferido deste registro.

## Antes de implementar

1. Autenticação própria já tem handlers para sessão, CSRF, cadastro/login, confirmação de e-mail, recuperação, troca de senha confirmada por e-mail, gestão de sessões e instalações confiáveis. Conta só recebe sessão após e-mail confirmado e política de senha vigente. Uma instalação sem token ativo recebe código por e-mail antes da sessão; IP não é identidade do dispositivo. Troca/reset de senha revoga todas as sessões e instalações e exige novo login/código. O tempo de sessão atual é configurável por `SESSION_TTL_SECONDS` (padrão de 7 dias).
2. A base PostgreSQL documentada nesta etapa é a de desenvolvimento. Backup, retenção e restauração são critérios para uma futura operação real; esta etapa não configura nem presume produção.
3. Para testes de desenvolvimento, fotos/vídeos usam arquivo local com limites e assinatura validados. Antes de lançamento, decidir armazenamento permanente, processamento, limites operacionais e retenção de produção.
4. Confirmar se geocodificação será habilitada; GPS nunca obrigatório para busca manual.
5. Revisar `schema-core.sql`, constraints, migrações, termos de privacidade e matriz de autorização.
6. Aprovar e versionar o contrato OpenAPI proposto sem substituir o contrato atual até haver migração testada.

## Fases sugeridas e critérios de aceite

### Fase 1 — Infraestrutura segura e identidade (núcleo implementado)

- Registro histórico de 30/10/2026: trilhas Feed e Mídias foram aplicadas no banco de desenvolvimento e seus objetos foram verificados naquela data. Para o estado físico atual, consulte `queries/development-database-catalog.sql`. Os binários são mantidos localmente apenas em desenvolvimento.
- O teste direto do Resend foi recebido em desenvolvimento, mas a suíte de API usa e-mail em memória; o fluxo E2E de cadastro via Resend deve ser validado separadamente. Produção não é presumida nem habilitada.
- A política definida é 8–128 caracteres, com uma maiúscula, minúscula, número e caractere especial; o hash usa Argon2id. A recuperação por código de e-mail está implementada: somente contas ativas e verificadas são elegíveis; resposta anti-enumeração; HMAC-SHA256; expiração em 10 minutos; cinco tentativas; uso único; limites de IP e conta; redefinição, consumo do desafio e revogação de sessões em transação.
- A recuperação não cria sessão após a troca. A entrega é iniciada depois da resposta HTTP e não tem outbox persistente; em falha de envio o código é invalidado, e a pessoa pode solicitar outro após o intervalo de segurança. O envio Resend foi testado em desenvolvimento, mas produção permanece desativada até configuração própria.
- Gestão de sessões implementada: listagem paginada de sessões próprias; revogação de sessão; encerramento das demais; lista de instalações confiáveis e revogação individual ou em lote. Ownership é aplicado no banco e escritas exigem CSRF. Instalações usam token opaco por navegador/app, guardado no servidor somente como hash; não se armazena IP, fingerprint ou user-agent como identidade. Na web, cookie persistente tem limite prático de 400 dias e o navegador pode apagá-lo; nesse caso, a pessoa confirma novamente. MFA geral e app nativo ainda não existem.
- Verificação refeita em 29/10/2026: `test:api-isolated-db` passou com 5/5 testes em schema temporário. Cobertura inclui cadastro/verificação, privacidade e relações, bloqueio, instalações confiáveis, alteração de senha/e-mail e revogação de sessões. O schema temporário foi removido ao fim; o catálogo permanente permaneceu inalterado. A consulta não leu dados das tabelas, portanto não declara que o banco principal esteja vazio. Nenhuma alteração foi feita em produção.
- Aceite: build de produção não carrega registros fictícios de demonstração; páginas sem endpoint/dados mostram estados vazios, enquanto o preview de desenvolvimento mantém as fixtures para revisão visual.

### Fase 2 — Conta única, perfil e relacionamentos (API essencial implementada; frontend parcial)

- Perfil básico, privacidade, seguir, pedidos de perfis privados, Círculo derivado e bloquear/desbloquear já têm endpoints e tabelas próprias. O frontend ainda mantém vários desses controles no estado local da demonstração.
- Rotas de conta/Auth/Social registradas no backend incluem `GET/PATCH /v1/accounts/me`, `GET /v1/accounts/availability`, `GET /v1/accounts/{accountId}`, `GET /v1/profiles/{username}`, `GET/PUT /v1/accounts/me/privacy`, `POST /v1/auth/account/email/change/request`, `/v1/auth/account/email/change/confirm-current`, `/v1/auth/account/email/change/confirm-new`, `/v1/auth/account/password/change/request`, `/v1/auth/account/password/change/confirm`, `/v1/auth/account/deletion/code`, `/v1/auth/account/deletion/confirm`, `/v1/auth/account/deletion/restore/code` e `/v1/auth/account/deletion/restore/confirm`, além das rotas de relações. Registro e contrato não significam que cada fluxo foi exercitado; use `endpoints.md` para o inventário e os testes específicos para evidência comportamental.
- A edição de dados da conta usa uma única identidade Social e diferencia o formulário por tipo: conta pessoal (nome e sobrenome) e conta comercial (nome comercial e endereço comercial completo). A idade é coletada somente no cadastro, mantida no servidor para a regra de 18+ e nunca retornada ao cliente após a criação; não aparece nem em Configurações. E-mail verificado é retornado somente no DTO owner-only. A edição de endereço e conta é atômica; não foi necessária migração de schema.
- O endpoint de perfil público compõe a identidade canônica da conta com os dados comerciais, respeitando privacidade e bloqueios. Avaliações e respostas pertencem a Profiles, não a Seek. O estado do banco deve ser verificado pela query de catálogo. Horários, serviços, galeria real e integração de descoberta do Seek ainda não estão completos.
- Regras: Círculo só existe com dois seguimentos aceitos em sentidos opostos; pedido pendente não dá acesso; após aprovação, o seguidor pode ver conteúdo público do perfil privado; conteúdo do Círculo continua exigindo mutualidade; bloqueio remove follows/pedidos em ambas as direções; só o iniciador remove o próprio bloqueio.
- Mensagens antigas ainda não podem ser ocultadas/restauradas pela API, pois o domínio de mensagens não foi implementado. Posts e outras leituras também precisarão aplicar a autorização quando entrarem no backend.

#### Verificação da Fase 2 concluída em desenvolvimento

- Três contas sintéticas temporárias, autenticadas e com e-mail marcado como verificado, foram usadas somente no banco de desenvolvimento e excluídas ao final.
- Verificado por HTTP: pedido privado, leitura e aprovação pelo dono; acesso ao perfil após aprovação; seguimento público e mutualidade; criação/remoção derivada do Círculo; bloqueio oculta perfil, impede novo seguimento e encerra mutualidade; desbloqueio não restaura vínculos; edição de perfil e privacidade com controle de versão.
- Rotas protegidas responderam `401` sem sessão; escrita sem CSRF respondeu `403`; health check respondeu `200`.
- Limites: nenhuma migração de produção, integração das telas de perfil/relações, domínio de mensagens, posts, mídias, avaliações, Seek ou edição comercial completa foi feita nesta fase.

### Fase 3 — Social e mídia

- Implementar upload direto com URL assinada, inspeção MIME/tamanho, quarentena e processamento.
- Implementar publicação, artigos, galeria derivada, comentários, curtidas, reposts e referências com autorização.
- Aceite: só mídia pronta e pertencente ao autor pode ser anexada; excluir/ocultar publicação não deixa mídia acessível por URL alternativa; `blob:` só é preview local e nunca entra no banco.

### Fase 4 — descoberta Seek e perfil comercial

- Cadastrar catálogo IBGE e categorias aprovadas; descobrir e organizar somente contas comerciais Social elegíveis por localização/categoria.
- Manter dados comerciais, serviços e horários na experiência e nos contratos do perfil comercial; Seek apenas consome uma projeção pública necessária à descoberta.
- Exibir, criar e responder avaliações na experiência do perfil comercial. A API de avaliações pertence a Profiles; Seek não grava nem edita avaliações e pode consumir apenas o agregado derivado e autorizado.
- Aceite: perfil pessoal não aparece como comércio; Seek não cria nem edita cadastro/perfil/avaliação; comerciante só edita dados da própria conta; município resolve pelo código IBGE; a nota nos resultados de descoberta deriva das avaliações do perfil e não expõe conteúdo privado.

### Fase 5 — Shop (catálogo, sem checkout)

- Integrar produto a vendedor com conta comercial existente; salvos e filtros.
- Aceite: nenhum botão/tela promete compra, estoque, entrega ou pagamento enquanto isso não existir. Checkout é projeto separado.

### Fase 6 — Mensagens, notificações, privacidade e operação

- Implementar conversas privadas, stream/eventos autorizados, notificações, denúncias e jobs de exportação/exclusão.
- Aceite: somente participantes autorizados leem mensagens; stream não vaza conteúdo; exclusão/exportação tem estados e auditoria redigida.

### Fase 7 — Ativar o frontend gradualmente

- Integrar por módulo; manter demo somente em preview/testes explicitamente identificados.
- Não fazer fallback silencioso para dados demo em erro de rede.
- Aceite: contratos validados, loading/erro/vazio/paginação acessíveis, controles existentes preservados e testes visuais em viewport móvel/desktop.

## Estratégia de teste

| Camada              | Cobertura obrigatória                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validação/contratos | DTO Zod/OpenAPI, limites, enum, códigos e respostas; gerar spec reproduzível                                                                                                                                                                                                                                  |
| Unidade             | Políticas de leitura/ação, normalização username, status, audiência, transições de evento e tipos de conta                                                                                                                                                                                                    |
| PostgreSQL          | O workflow pós-merge configura Drizzle `push` para desenvolvimento; o estado físico deve ser confirmado por metadados, sem inferir histórico. Para testes com escrita, usar schema isolado, FKs, unicidade concorrente, constraints e isolamento transacional. Produção permanece separada e fora deste gate. |
| Integração HTTP     | Sessão anônima/autenticada, CSRF, paginação, idempotência, erros, rate limits e ACL por recurso                                                                                                                                                                                                               |
| Segurança           | IDOR entre contas, perfil privado, bloqueio mútuo, mídia privada, brute force e enumeração, XSS/links, SSRF em URLs, upload poliglota e CSRF                                                                                                                                                                  |
| Concorrência        | Duas avaliações simultâneas, like/repost repetidos, edição com versão antiga, upload duplicado e outbox reprocessada                                                                                                                                                                                          |
| Dados               | Seed de municípios determinístico; usuários e conteúdos sintéticos apenas em ambiente local; nunca importar contas mock como usuários reais                                                                                                                                                                   |
| Frontend            | Fluxos de perfil Social/comercial, abas de perfil, galeria, publicação/mídia, Seek e estados de erro sem regressão da navegação                                                                                                                                                                               |
| Frontend por conta  | Likes, salvos, leituras, bloqueios, notificações e recomendações precisam ser isolados por ator; fixtures não podem entrar no build/estado de produção                                                                                                                                                        |
| Operação            | Health/readiness, logs sem PII/segredos, backup/restauração, job retry/failure queue e alertas                                                                                                                                                                                                                |

### Fluxo de schema neste projeto

O PostgreSQL gerenciado da Replit é usado no desenvolvimento; Feed e Mídias possuem migrations e ledgers independentes. Consulte `queries/development-database-catalog.sql` para confirmar o catálogo físico atual. `generate` cria SQL versionado sem conexão. Esta documentação não declara estado de produção.

#### Seleção de conexão

- O runtime usa `DATABASE_URL`, fornecida pela instância gerenciada da Replit. Não copiar ou imprimir seu valor.
- `SEEKALIVE_DB_MIGRATION_TARGET=replit` seleciona explicitamente o destino de desenvolvimento para `push`; o pós-merge já aplica essa proteção.
- Um seletor técnico para PostgreSQL externo permanece inativo no código legado. A escolha atual é PostgreSQL gerenciado da Replit; não habilitar destinos externos nem criar outra conexão sem nova decisão explícita.
- Migrations versionadas e `push` são mecanismos distintos. O estado físico atual não identifica qual mecanismo criou cada objeto; não misturar ou executar os dois fluxos no banco principal sem revisão e aprovação.

### Integração HTTP com schema isolado (A02)

Para executar em um runtime comprovadamente de desenvolvimento:

1. Consulte `SELECT current_database()` no banco de desenvolvimento e use o nome retornado em `SEEKALIVE_EXPECTED_DATABASE`.
2. Execute `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE='<nome-do-banco-dev>' pnpm --filter @workspace/scripts run test:api-isolated-db`.
3. O executor valida o opt-in, o banco-alvo e o ambiente antes de criar um schema aleatório `seekalive_test_<id>`. O push normal do Drizzle fica limitado a esse schema; as tabelas são qualificadas explicitamente. A suíte usa um coletor de e-mail em memória, testa cadastro/verificação e relações sociais e remove apenas o schema criado por ela ao encerrar. Também compara o catálogo `public` antes e depois.

Para a validação HTTP isolada de Reviews, execute `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE='<nome-do-banco-dev>' pnpm --filter @workspace/scripts run test:profiles-reviews-api-isolated`. Essa suíte cria contas pessoais e comerciais pela própria API, usa apenas o coletor de e-mail em memória, exerce autenticação/CSRF, autorização por tipo de conta, validação, unicidade concorrente, paginação, agregados, resposta comercial, exclusão e republicação. O executor remove o schema temporário e comprova que o catálogo `public` não mudou; isso não altera nem testa escrita na tabela física do schema principal.

Em 31/10/2026, `test:profiles-reviews-api-isolated` passou em 1/1 no banco de desenvolvimento `heliumdb`. A validação HTTP confirmou a gravação e leitura no schema temporário, a rejeição de avaliações duplicadas em requisições simultâneas com HTTP 409, a paginação/contagem, as permissões de autor e comerciante e a exclusão/republicação. A concorrência revelou inicialmente HTTP 500; o repositório agora traduz apenas o SQLSTATE `23505` da constraint única de Reviews para o resultado de conflito da aplicação, propagando erros de banco diferentes sem mascará-los. O schema aleatório foi removido e o catálogo `public` permaneceu inalterado.

Não execute em produção, não remova nem sobrescreva marcadores válidos para contornar o bloqueio e não use `push-force`. A [documentação do Replit](https://docs.replit.com/features/project-setup/configuration) identifica um runtime publicado por `REPLIT_DEPLOYMENT=1`; quando essa variável está ausente, o Repl está em desenvolvimento. `REPLIT_DEV_DOMAIN` identifica o domínio de desenvolvimento. `REPLIT_ENVIRONMENT` não é o marcador documentado e não deve bloquear testes sozinho. Em 29/10/2026, `test:api-isolated-db` passou em 5/5 no banco de desenvolvimento `heliumdb`; criou e removeu seu schema aleatório e comparou o catálogo `public` antes/depois. A migration versionada `0005` também foi testada em namespace isolado e o fingerprint das colunas, constraints, índices e views consultados permaneceu idêntico. Nenhuma escrita foi feita no schema principal nem em produção.

## Decisões que permanecem abertas

- Contrato detalhado da API própria e UX final de cadastro/verificação/recuperação.
- Rotina de backup, retenção, restauração e política regional do PostgreSQL antes do lançamento.
- Object Storage, política de URL pública/assinada e limites de vídeo.
- Fornecedor de geocodificação/mapas (se houver), consentimento e retenção.
- Provedor de e-mail/push.
- Escopo e fornecedor de checkout/pagamentos para uma fase comercial futura.
- Regras de moderação, retenção/legal hold e prazos de exclusão.

## Estado inicial do contrato

`shared/api-spec/openapi.yaml` é o contrato HTTP. `pnpm --filter @workspace/scripts run docs:api-routes` gera `endpoints.md` e `routes.generated.md` a partir do inventário Express e desse contrato; o teste `test:api-route-contract` falha diante de diferenças de método/caminho ou declaração CSRF. `generate-contracts.mjs` mantém apenas o catálogo de planejamento não normativo em `docs/roadmap/`.
