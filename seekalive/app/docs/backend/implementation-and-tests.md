# Plano de implementação e testes

Este plano organiza o backend futuro; não autoriza nem executa migrações ou mudanças de produto. As fases dependem de decisões explícitas nos itens indicados.

## Antes de implementar

1. Autenticação própria pela API já foi escolhida e o contrato proposto está em `openapi.json` e `schema-core.sql`; revisar e aprovar política de acesso antes da verificação de e-mail, serviço de envio e duração/retention de sessões antes dos handlers.
2. Confirmar PostgreSQL por ambiente e política de backup/retention.
3. Confirmar armazenamento de mídia, limites, formatos e retenção.
4. Confirmar se geocodificação será habilitada; GPS nunca obrigatório para busca manual.
5. Revisar `schema-core.sql`, constraints, migrações, termos de privacidade e matriz de autorização.
6. Aprovar e versionar o contrato OpenAPI proposto sem substituir o contrato atual até haver migração testada.

## Fases sugeridas e critérios de aceite

### Fase 1 — Infraestrutura segura e identidade

- Configurar ambiente de desenvolvimento isolado e banco PostgreSQL.
- Implementar migrations versionadas, readiness, request IDs, validação, rate limits, sessão HttpOnly e CSRF.
- Criar fluxo real de autenticação, sessão, recuperação e encerramento; remover o falso estado autenticado.
- Aceite: visitante anônimo não lê/escreve recursos protegidos; logout revoga a sessão; CSRF/expiração são testados; nenhum segredo aparece em logs.
- Aceite: build de produção não carrega registros fictícios de demonstração; páginas sem endpoint/dados mostram estados vazios, enquanto o preview de desenvolvimento mantém as fixtures para revisão visual.

### Fase 2 — Conta única, perfil e relacionamentos

- Conta pessoal/comercial é a mesma identidade Social; extensão comercial vinculada um-a-um à conta.
- Implementar perfil, privacidade, seguir, Círculo derivado, bloqueio/silenciamento e salvos.
- Aceite: toda consulta aplica ACL no servidor; Círculo só existe com dois seguimentos aceitos em sentidos opostos e desaparece quando qualquer lado deixa de seguir; pedidos para perfis privados ficam pendentes até o aceite, não concedem acesso antes disso e são testados para solicitante e dono; seguidores aceitos veem publicações públicas do perfil privado, mas audiência do Círculo continua mútua; não existe cadastro de comércio independente nem tabela de Comunidades/Shuffle ou Círculo.

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
| PostgreSQL | Migrations up/down em banco descartável, FKs, unicidade concorrente, constraints e isolamento transacional |
| Integração HTTP | Sessão anônima/autenticada, CSRF, paginação, idempotência, erros, rate limits e ACL por recurso |
| Segurança | IDOR entre contas, perfil privado, bloqueio mútuo, mídia privada, brute force e enumeração, XSS/links, SSRF em URLs, upload poliglota e CSRF |
| Concorrência | Duas avaliações simultâneas, like/repost repetidos, edição com versão antiga, upload duplicado e outbox reprocessada |
| Dados | Seed de municípios determinístico; usuários e conteúdos sintéticos apenas em ambiente local; nunca importar contas mock como usuários reais |
| Frontend | Fluxos de perfil Social/comercial, abas de perfil, galeria, publicação/mídia, Seek e estados de erro sem regressão da navegação |
| Frontend por conta | Likes, salvos, leituras, bloqueios, notificações e recomendações precisam ser isolados por ator; fixtures não podem entrar no build/estado de produção |
| Operação | Health/readiness, logs sem PII/segredos, backup/restauração, job retry/failure queue e alertas |

## Decisões que permanecem abertas

- Contrato detalhado da API própria e UX final de cadastro/verificação/recuperação.
- Região, ambiente e operação do PostgreSQL.
- Object Storage, política de URL pública/assinada e limites de vídeo.
- Fornecedor de geocodificação/mapas (se houver), consentimento e retenção.
- Provedor de e-mail/push.
- Escopo e fornecedor de checkout/pagamentos para uma fase comercial futura.
- Regras de moderação, retenção/legal hold e prazos de exclusão.

## Estado inicial do contrato

O gerador (`node docs/backend/generate-contracts.mjs`) escreve `openapi.json` e `endpoints.md`. O contrato é uma proposta; somente `GET /api/healthz` é uma rota implementada confirmada. Antes de gerar clientes ou conectar o frontend, revisar as decisões acima e validar schemas/ref/operationIds.
