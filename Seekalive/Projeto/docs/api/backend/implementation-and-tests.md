# Plano de implementação e testes

Este documento registra a implementação já existente e organiza as próximas fatias do backend. O projeto ainda usa o PostgreSQL gerenciado da Replit. O usuário decidiu mover o backend para PostgreSQL hospedado fora da Replit; o provedor ainda não foi conectado e nenhum banco externo foi criado. Até a transição ser concluída, não considerar a troca ativa nem alterar `DATABASE_URL`.

## Antes de implementar

1. Autenticação própria já tem handlers para sessão, CSRF, cadastro/login, confirmação de e-mail, atualização de senha por senha atual, recuperação de senha e interesses do onboarding. A conta só recebe sessão após confirmação e política de senha vigente. Credenciais e sessões anteriores à regra recebem versão `0` na migração; senhas legadas compatíveis sobem de versão no login, senhas incompatíveis exigem atualização, e sessões antigas precisam de novo login. O tempo de sessão atual é configurável por `SESSION_TTL_SECONDS` (padrão de 7 dias).
2. Conectar e provisionar o provedor PostgreSQL externo escolhido; definir ambientes, backup e retenção antes de apontar o backend para ele.
3. Confirmar armazenamento de mídia, limites, formatos e retenção.
4. Confirmar se geocodificação será habilitada; GPS nunca obrigatório para busca manual.
5. Revisar `schema-core.sql`, constraints, migrações, termos de privacidade e matriz de autorização.
6. Aprovar e versionar o contrato OpenAPI proposto sem substituir o contrato atual até haver migração testada.

## Fases sugeridas e critérios de aceite

### Fase 1 — Infraestrutura segura e identidade (núcleo implementado)

- PostgreSQL/Drizzle, sessão segura, CSRF, cadastro/login/verificação, atualização de política e onboarding estão implementados no código. A migração de versões de senha e restrição de idade foi aplicada ao schema principal de desenvolvimento e verificada; no momento da aplicação não havia contas, credenciais nem sessões ativas.
- O teste direto do Resend foi recebido em desenvolvimento, mas a suíte de API usa e-mail em memória; o fluxo E2E de cadastro via Resend deve ser validado separadamente. Produção não é presumida nem habilitada.
- A política definida é 8–128 caracteres, com uma maiúscula, minúscula, número e caractere especial; o hash usa Argon2id. A recuperação por código de e-mail está implementada: somente contas ativas e verificadas são elegíveis; resposta anti-enumeração; HMAC-SHA256; expiração em 10 minutos; cinco tentativas; uso único; limites de IP e conta; redefinição, consumo do desafio e revogação de sessões em transação.
- A recuperação não cria sessão após a troca. A entrega é iniciada depois da resposta HTTP e não tem outbox persistente; em falha de envio o código é invalidado, e a pessoa pode solicitar outro após o intervalo de segurança. Esse fluxo não está habilitado para produção.
- Aceite verificado em schema temporário isolado: conta anônima/não verificada não acessa recursos; contas legadas sem senha compatível não recebem sessão; atualização válida grava novo hash e revoga sessões; senha legada compatível é promovida no login; recuperação resiste à enumeração, não envia para contas não verificadas, aplica cooldown, rejeita código errado/reutilizado e revoga sessões; logout revoga a sessão.
- Aceite: build de produção não carrega registros fictícios de demonstração; páginas sem endpoint/dados mostram estados vazios, enquanto o preview de desenvolvimento mantém as fixtures para revisão visual.

### Fase 2 — Conta única, perfil e relacionamentos (API essencial implementada; frontend parcial)

- Perfil básico, privacidade, seguir, pedidos de perfis privados, Círculo derivado e bloquear/desbloquear já têm endpoints e tabelas próprias. O frontend ainda mantém vários desses controles no estado local da demonstração.
- Endpoints ativos: `GET/PATCH /v1/accounts/me`, `GET /v1/accounts/availability`, `GET /v1/accounts/{accountId}`, `GET /v1/profiles/{username}`, `GET/PUT /v1/accounts/me/privacy`; listas de seguidores/seguindo; seguir/deixar de seguir; consultar/aprovar/recusar pedidos privados; Círculos; consultar/bloquear/desbloquear.
- Conta comercial continua sendo a mesma identidade Social; a edição/consulta do perfil comercial completo e a integração com Seek permanecem para a próxima fatia comercial.
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

### Fase 4 — Seek, avaliações e eventos

- Cadastrar catálogo IBGE e categorias aprovadas; descobrir somente contas comerciais Social elegíveis.
- Implementar extensão comercial, serviços (delivery/mesa/reserva/agendamento), horários, avaliação única por usuário/comércio e resposta do comerciante.
- Implementar eventos com conta organizadora comercial existente; interesse não equivale a ingresso.
- Aceite: perfil pessoal não aparece como estabelecimento; comerciante só edita dados da própria conta; avaliações respeitam uma por autor/negócio e não podem ser autoavaliação; município sempre resolve pelo código IBGE.

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

| Camada | Cobertura obrigatória |
|---|---|
| Validação/contratos | DTO Zod/OpenAPI, limites, enum, códigos e respostas; gerar spec reproduzível |
| Unidade | Políticas de leitura/ação, normalização username, status, audiência, transições de evento e tipos de conta |
| PostgreSQL | Schema do desenvolvimento aplicado com Drizzle pelo pós-merge Replit; alterações de produção promovidas pelo fluxo de publicação da Replit. Para testes com escrita, usar banco isolado, FKs, unicidade concorrente, constraints e isolamento transacional |
| Integração HTTP | Sessão anônima/autenticada, CSRF, paginação, idempotência, erros, rate limits e ACL por recurso |
| Segurança | IDOR entre contas, perfil privado, bloqueio mútuo, mídia privada, brute force e enumeração, XSS/links, SSRF em URLs, upload poliglota e CSRF |
| Concorrência | Duas avaliações simultâneas, like/repost repetidos, edição com versão antiga, upload duplicado e outbox reprocessada |
| Dados | Seed de municípios determinístico; usuários e conteúdos sintéticos apenas em ambiente local; nunca importar contas mock como usuários reais |
| Frontend | Fluxos de perfil Social/comercial, abas de perfil, galeria, publicação/mídia, Seek e estados de erro sem regressão da navegação |
| Frontend por conta | Likes, salvos, leituras, bloqueios, notificações e recomendações precisam ser isolados por ator; fixtures não podem entrar no build/estado de produção |
| Operação | Health/readiness, logs sem PII/segredos, backup/restauração, job retry/failure queue e alertas |

### Fluxo de schema neste projeto

O PostgreSQL atualmente conectado é gerenciado pela Replit. `pnpm --filter @workspace/db run push` é o fluxo de sincronização do desenvolvimento e roda pelo script pós-merge configurado. O usuário decidiu migrar para PostgreSQL externo, mas essa migração ainda não foi iniciada. O fluxo Publish da Replit não atualizará o schema do banco externo; antes de ativá-lo, definir um processo explícito e revisado de migração/rollback. Não sobrescrever a variável runtime `DATABASE_URL`, não executar DDL no startup e não usar `push-force`. Os testes HTTP básicos não fazem mutações; a suíte `test:api-isolated-db` abaixo cria dados somente em um schema de teste aleatório.

#### Seleção de conexão externa

- `SEEKALIVE_EXTERNAL_DATABASE_URL`: segredo PostgreSQL externo; deve ficar disponível somente ao backend.
- `SEEKALIVE_DATABASE_TARGET=external`: seleciona o banco externo para o runtime. Sem essa opção, o runtime continua usando `DATABASE_URL`.
- `SEEKALIVE_DB_MIGRATION_TARGET=external`: seleciona o banco externo somente em uma operação manual de schema. O pós-merge força `replit`, evitando que uma URL externa configurada passe a receber push automaticamente.
- Para ativar a conexão externa, primeiro provisionar o banco, configurar a URL pelo fluxo seguro de Secrets e aplicar/revisar o schema externo. Só depois selecionar o alvo do runtime. Hoje nenhum desses segredos ou seletores externos está ativo.
- Verificação atual: o seletor passou em seis testes sem conexão e `drizzle-kit export` carregou o schema sem escrita. `drizzle-kit check` falhou com erro de parâmetros do driver AWS Data API; não considerar o fluxo de migrações externas validado até esse erro ser esclarecido.

### Integração HTTP com schema isolado (A02)

Para executar em um runtime comprovadamente de desenvolvimento:

1. Consulte `SELECT current_database()` no banco de desenvolvimento e use o nome retornado em `SEEKALIVE_EXPECTED_DATABASE`.
2. Execute `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE='<nome-do-banco-dev>' pnpm --filter @workspace/scripts run test:api-isolated-db`.
3. O executor valida o opt-in, o banco-alvo e o ambiente antes de criar um schema aleatório `seekalive_test_<id>`. O push normal do Drizzle fica limitado a esse schema; as tabelas são qualificadas explicitamente. A suíte usa um coletor de e-mail em memória, testa cadastro/verificação e relações sociais e remove apenas o schema criado por ela ao encerrar. Também compara o catálogo `public` antes e depois.

Não execute em produção, não remova nem sobrescreva marcadores válidos para contornar o bloqueio e não use `push-force`. A [documentação do Replit](https://docs.replit.com/features/project-setup/configuration) identifica um runtime publicado por `REPLIT_DEPLOYMENT=1`; quando essa variável está ausente, o Repl está em desenvolvimento. `REPLIT_DEV_DOMAIN` identifica o domínio de desenvolvimento. `REPLIT_ENVIRONMENT` não é o marcador documentado e não deve bloquear testes sozinho. Em 24/10/2026, este workspace foi confirmado em desenvolvimento (`REPLIT_DEPLOYMENT` ausente e domínio dev presente); o guard antigo interpretou incorretamente `REPLIT_ENVIRONMENT=production`. Depois da correção, a suíte `test:api-isolated-db` passou em `heliumdb`: criou e removeu o schema temporário, e confirmou que `public` permaneceu inalterado. Nenhuma escrita foi feita em produção.

## Decisões que permanecem abertas

- Contrato detalhado da API própria e UX final de cadastro/verificação/recuperação.
- Região, ambiente e operação do PostgreSQL.
- Object Storage, política de URL pública/assinada e limites de vídeo.
- Fornecedor de geocodificação/mapas (se houver), consentimento e retenção.
- Provedor de e-mail/push.
- Escopo e fornecedor de checkout/pagamentos para uma fase comercial futura.
- Regras de moderação, retenção/legal hold e prazos de exclusão.

## Estado inicial do contrato

O gerador (`node docs/api/backend/generate-contracts.mjs`) escreve `openapi.json` e `endpoints.md`, marcando rotas ativas e propostas. A conexão do frontend deve ser incremental; não remover o modo de demonstração de desenvolvimento nem relaxar a regra de e-mail confirmado.
