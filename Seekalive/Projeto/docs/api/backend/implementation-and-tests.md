# Plano de implementação e testes

Este documento registra a implementação já existente e organiza as próximas fatias do backend. O projeto ainda usa o PostgreSQL gerenciado da Replit. O usuário decidiu mover o backend para PostgreSQL hospedado fora da Replit; o provedor ainda não foi conectado e nenhum banco externo foi criado. Até a transição ser concluída, não considerar a troca ativa nem alterar `DATABASE_URL`.

## Antes de implementar

1. Autenticação própria já tem handlers para sessão, CSRF, cadastro/login, confirmação de e-mail, recuperação, troca de senha confirmada por e-mail, gestão de sessões e instalações confiáveis. Conta só recebe sessão após e-mail confirmado e política de senha vigente. Uma instalação sem token ativo recebe código por e-mail antes da sessão; IP não é identidade do dispositivo. Troca/reset de senha revoga todas as sessões e instalações e exige novo login/código. O tempo de sessão atual é configurável por `SESSION_TTL_SECONDS` (padrão de 7 dias).
2. Conectar e provisionar o provedor PostgreSQL externo escolhido; definir ambientes, backup e retenção antes de apontar o backend para ele.
3. Confirmar armazenamento de mídia, limites, formatos e retenção.
4. Confirmar se geocodificação será habilitada; GPS nunca obrigatório para busca manual.
5. Revisar `schema-core.sql`, constraints, migrações, termos de privacidade e matriz de autorização.
6. Aprovar e versionar o contrato OpenAPI proposto sem substituir o contrato atual até haver migração testada.

## Fases sugeridas e critérios de aceite

### Fase 1 — Infraestrutura segura e identidade (núcleo implementado)

- PostgreSQL/Drizzle, sessão segura, CSRF, cadastro/login/verificação, atualização de política e onboarding estão implementados no código. A versão de senha e a restrição de idade foram aplicadas ao schema principal de desenvolvimento; a nova tabela de instalações e o campo de bloqueio por segurança ainda estão somente no código e no teste de schema isolado. Produção não foi alterada.
- O teste direto do Resend foi recebido em desenvolvimento, mas a suíte de API usa e-mail em memória; o fluxo E2E de cadastro via Resend deve ser validado separadamente. Produção não é presumida nem habilitada.
- A política definida é 8–128 caracteres, com uma maiúscula, minúscula, número e caractere especial; o hash usa Argon2id. A recuperação por código de e-mail está implementada: somente contas ativas e verificadas são elegíveis; resposta anti-enumeração; HMAC-SHA256; expiração em 10 minutos; cinco tentativas; uso único; limites de IP e conta; redefinição, consumo do desafio e revogação de sessões em transação.
- A recuperação não cria sessão após a troca. A entrega é iniciada depois da resposta HTTP e não tem outbox persistente; em falha de envio o código é invalidado, e a pessoa pode solicitar outro após o intervalo de segurança. O envio Resend foi testado em desenvolvimento, mas produção permanece desativada até configuração própria.
- Gestão de sessões implementada: listagem paginada de sessões próprias; revogação de sessão; encerramento das demais; lista de instalações confiáveis e revogação individual ou em lote. Ownership é aplicado no banco e escritas exigem CSRF. Instalações usam token opaco por navegador/app, guardado no servidor somente como hash; não se armazena IP, fingerprint ou user-agent como identidade. Na web, cookie persistente tem limite prático de 400 dias e o navegador pode apagá-lo; nesse caso, a pessoa confirma novamente. MFA geral e app nativo ainda não existem.
- Aceite verificado em schema temporário isolado: conta anônima/não verificada não acessa recursos; contas legadas sem senha compatível não recebem sessão; senha nova é aplicada somente após senha atual e código de e-mail; troca e reset revogam sessões e dispositivos; login em instalação desconhecida não cria sessão antes do código; reenvio respeita os intervalos; terceiro erro bloqueia a conta e informa suporte. O schema temporário foi removido; a mudança ainda não foi aplicada ao banco principal de desenvolvimento.
- Aceite: build de produção não carrega registros fictícios de demonstração; páginas sem endpoint/dados mostram estados vazios, enquanto o preview de desenvolvimento mantém as fixtures para revisão visual.

### Fase 2 — Conta única, perfil e relacionamentos (API essencial implementada; frontend parcial)

- Perfil básico, privacidade, seguir, pedidos de perfis privados, Círculo derivado e bloquear/desbloquear já têm endpoints e tabelas próprias. O frontend ainda mantém vários desses controles no estado local da demonstração.
- Endpoints ativos: `GET/PATCH /v1/accounts/me`, `GET /v1/accounts/availability`, `GET /v1/accounts/{accountId}`, `GET /v1/profiles/{username}`, `GET/PUT /v1/accounts/me/privacy`; listas de seguidores/seguindo; seguir/deixar de seguir; consultar/aprovar/recusar pedidos privados; Círculos; consultar/bloquear/desbloquear.
- A edição de dados da conta usa uma única identidade Social e diferencia o formulário por tipo: conta pessoal (nome e sobrenome) e conta comercial (nome comercial e endereço comercial completo). A idade é coletada somente no cadastro, mantida no servidor para a regra de 18+ e nunca retornada ao cliente após a criação; não aparece nem em Configurações. E-mail verificado é retornado somente no DTO owner-only. A edição de endereço e conta é atômica; não foi necessária migração de schema.
- O perfil público, conteúdo, mídia, avaliações e integração de descoberta do Seek permanecem fora desta fatia e não devem ser confundidos com os dados privados de cadastro.
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

O PostgreSQL atualmente conectado ao runtime de desenvolvimento é gerenciado pela Replit. O pós-merge permanece como sincronização de schema desse banco de desenvolvimento; não é o fluxo para aplicar migrações externas. O usuário escolheu preparar o backend para PostgreSQL externo, ainda não conectado. Foi preparado um fluxo Drizzle de SQL versionado: `generate` cria arquivos sem conexão; `migrate` exige `SEEKALIVE_DB_MIGRATION_TARGET` explícito e só aplica ao URL selecionado. Nenhuma migração externa foi executada. Replit Publish não aplica schema a banco externo, e o processo de migração de produção não está configurado. Não sobrescrever `DATABASE_URL`, não executar DDL no startup e não usar `push-force`. Os testes HTTP básicos não fazem mutações; a suíte `test:api-isolated-db` cria dados somente em schema aleatório e força o destino Replit de desenvolvimento.

#### Seleção de conexão externa

- `SEEKALIVE_EXTERNAL_DATABASE_URL`: segredo PostgreSQL externo; deve ficar disponível somente ao backend.
- `SEEKALIVE_DATABASE_TARGET=external`: seleciona o banco externo para o runtime. Sem essa opção, o runtime continua usando `DATABASE_URL`.
- `SEEKALIVE_DB_MIGRATION_TARGET=external`: obrigatório para selecionar o banco externo em `migrate`; migrações sem alvo explícito falham, mesmo que o runtime tenha destino padrão. O pós-merge de desenvolvimento continua selecionando Replit.
- Para ativar a conexão externa, primeiro provisionar o banco, configurar a URL pelo fluxo seguro de Secrets, revisar os arquivos SQL e aplicar a migração ao banco externo de desenvolvimento. Só depois selecionar o alvo externo para o runtime. Hoje nenhum segredo ou seletor externo está ativo; nenhum banco foi alterado nesta etapa.
- Verificação atual: os seletores passam em testes sem conexão. A geração de migração usa configuração sem credenciais; `migrate` requer alvo explícito. O SQL gerado é uma migração inicial para banco vazio, não um delta automático para um banco existente.

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
