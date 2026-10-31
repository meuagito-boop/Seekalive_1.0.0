# Arquitetura, segurança e fluxos

## Escopo atualmente implementado

A API Express com PostgreSQL/Drizzle implementa autenticação, recuperação de senha, gestão de sessões, onboarding, leitura/edição do próprio perfil, consulta pública de perfil, privacidade, relações e bloqueios. Feed persiste publicações e aceita fotos/vídeos enviados pelo titular por meio do domínio Mídias. Escritas exigem sessão verificada e CSRF. Em 30/10/2026, `feed.posts` e `media.assets` foram verificados no banco de desenvolvimento. Os binários usam disco local restrito a desenvolvimento; isso não configura armazenamento de produção. O frontend mantém demonstração local em parte das experiências; a presença de um endpoint não significa que todas as telas autenticadas foram verificadas visualmente.

Permanecem incompletos: comentários/respostas, curtidas, reposts, salvos, referências e ranking do feed. Upload de mídia funciona no desenvolvimento, mas armazenamento permanente, processamento/transcodificação, thumbnails e reconciliação de arquivos órfãos ainda não estão implementados. O fluxo de avaliações do perfil comercial foi implementado em Profiles e no frontend; a migration `profiles/0003` aguarda aplicação no banco de desenvolvimento e a validação HTTP/autenticada ainda não foi concluída. Perfil comercial completo/descoberta do Seek, mensagens, notificações, silenciamentos, busca e moderação continuam fora desta fatia.

## 1. Arquitetura de referência

```text
Navegador / aplicativo web
  | mesma origem; cookie HttpOnly; token CSRF nas alterações
  v
Roteador HTTP / Express
  | autenticação -> autorização -> validação -> serviço de domínio
  +--> PostgreSQL / Drizzle (transações, índices, constraints)
  +--> Object Storage privado (upload autorizado / leitura com ACL)
  +--> API própria de autenticação (login, recuperação, verificação e sessão)
  +--> Provedor de e-mail e Web Push (quando habilitados)
  +--> Adaptador de geocodificação (opcional e explícito)
  |
  +--> Outbox na mesma transação
          -> worker de mídia / notificações / busca / exclusão
          -> stream SSE autorizado para o destinatário
```

Preservar a stack atual; separar routers, políticas, serviços, repositórios e DTOs. Não colocar a regra de domínio somente no componente React nem retornar linhas SQL diretamente. O pacote não cria esses diretórios na aplicação.

### Responsabilidades sugeridas

- **HTTP:** parsing, limites, contexto de sessão, request ID e serialização.
- **Políticas:** `canReadAccount`, `canReadPost`, `canInteract`, `canManageBusiness`, `canReadConversation`, `canUseMedia`.
- **Serviços:** transações e regras de estado; não dependem de componentes de UI.
- **Repositórios:** queries parametrizadas, índices, paginação e bloqueio otimista.
- **DTOs:** camelCase, propriedades do visitante e URLs autorizadas; omitir PII e metadados internos.
- **Workers:** tarefas repetíveis com deduplicação, retentativa, fila de falhas e cancelamento.

## 2. Convenções da API

| Convenção    | Contrato proposto                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Versão       | `/api/v1`; manter `/api/healthz` existente                                                                                    |
| IDs novos    | UUID gerado no servidor; IDs legados de demonstração não são importados                                                       |
| Datas        | ISO 8601 UTC; fuso IANA separado quando houver calendário local                                                               |
| Dinheiro     | Inteiro em centavos + moeda ISO, inicialmente BRL; jamais fazer cálculo com `R$ 29,90`                                        |
| Paginação    | `{items: [...], nextCursor: string                                                                                            | null}`; limite padrão 20, máximo 100 |
| Cursor       | Opaco, assinado ou validado, vinculado a filtros/ordem/escopo; desempate por ID                                               |
| Busca        | Normalização de acentos, limites de tamanho, ranking documentado; não chamar de semântica sem implementação                   |
| Erro         | `{error:{code,message,requestId,fields?}}`, sem SQL, token, stack ou informação privada                                       |
| Concorrência | `version`/ETag em recursos editáveis; `If-Match` nas alterações; `412` para versão divergente                                 |
| Relações     | PUT/DELETE idempotentes; repost POST existente também deve ser idempotente por par conta/publicação                           |
| Criações     | `Idempotency-Key` em POST com efeito; vincular conta, método, rota e hash do corpo; rejeitar reutilização com corpo diferente |
| Limites      | `429` e `Retry-After`; cotas propostas, configuráveis e medidas                                                               |

Status principais: `200`, `201`, `202` para tarefa realmente aceita, `204` sem corpo, `400` sintaxe, `401`, `403`, `404`, `409` conflito de domínio, `412` versão, `413` tamanho, `415` tipo, `422` validação, `429`, `500`, `502` integração, `503` indisponibilidade. `401` nunca deve ser convertido em resultado vazio nem em dados de demonstração.

### Exemplo de erro

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Revise os campos informados.",
    "requestId": "req_exemplo",
    "fields": [
      { "path": "rating", "message": "Informe uma nota inteira entre 1 e 5." }
    ]
  }
}
```

### Adaptação dos contratos existentes

- O cliente espera objeto `Post` diretamente, não envelope `{data: Post}`. Páginas usam `Page<T>`.
- Busca de pessoas existente retorna array de resumo; busca de tags retorna array de strings. Não trocar o formato sem alterar o adaptador.
- Comentário enviado usa `text`; resposta usa `content`. Essa diferença foi preservada no contrato.
- `authorId` atual deve ser retirado das decisões de autorização. Compatibilidade temporária pode aceitá-lo somente se coincidir com a sessão.
- Publicação com mídias deve passar `mediaIds` de uploads concluídos, não `blob:`, `data:`, URLs de terceiros ou object keys fornecidos pelo cliente. Alterar `PublishPostInput`, validação e adaptador antes de ativar REST.
- Completar `postSchema` com `isBookmarked`, `parentPostId` quando aplicável e `version`; hoje esses campos não estão todos no parser REST.
- `type=text|video` é legado de apresentação; derivar de `format` e das mídias, não criar duas fontes conflitantes.
- Referências públicas continuam `seek_entity|shop_item|social_post`. O legado `seek_entity` com `id="event:<id>"` deve ser normalizado internamente para evento, com FK própria, sem criar entidade comercial fictícia.

## 3. Autenticação e ciclo de conta

**Estado implementado em desenvolvimento (25/10/2026):** autenticação própria na API cobre cadastro, confirmação de e-mail, login, recuperação, troca de senha, sessões e reconhecimento revogável de instalações. O PostgreSQL gerenciado da Replit contém os schemas ativos de desenvolvimento; produção permanece separada e não foi publicada nem alterada. O envio Resend foi testado em desenvolvimento; a suíte isolada usa um coletor de e-mail falso. Isso não prova E2E no navegador nem habilita o envio em produção.

1. `POST /v1/auth/register` valida cadastro pessoal/comercial e idade autodeclarada mínima de 18 anos. A senha exige 8–128 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial. Cria identidade Social pendente e, para conta comercial, a extensão na mesma transação. Sem envio de e-mail configurado, responde `503` sem criar conta. Senha e confirmação são entrada transitória; confirmação nunca é armazenada.
2. `POST /v1/auth/login` aceita username ou e-mail e senha; só prossegue com e-mail confirmado, conta ativa e política atual. Senhas legadas compatíveis sobem de versão no login; as demais recebem `403 PASSWORD_UPDATE_REQUIRED`. Credenciais pendentes recebem `403 EMAIL_NOT_VERIFIED`, sem sessão.
3. O navegador/app recebe um token aleatório por instalação no cookie `__Host-seekalive_device` (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`). A API persiste apenas o hash do token em `trusted_devices`; não registra fingerprint, user-agent ou IP como identidade do aparelho. A confirmação inicial do e-mail confia na instalação atual. Em login futuro, token ativo permite sessão; instalação sem token ativo recebe `202`, código no e-mail verificado e nenhuma sessão antes da confirmação.
4. O desafio de instalação expira em 10 minutos. O primeiro código errado estabelece 30 segundos até reenvio; o segundo, 90 segundos; o terceiro bloqueia a conta, revoga sessões/instalações e apresenta o contato de suporte. O desbloqueio é manual e ainda não há operação administrativa no Painel. **Risco:** quem já conhece a senha pode provocar bloqueio ao errar os códigos; antes do lançamento, planejar suporte, monitoramento e mitigação de bloqueios abusivos. O limitador por IP é transitório e local ao processo; IP não é persistido nem usado para confiar na instalação.
5. O registro confiável no servidor fica ativo até revogação pelo titular; na web o cookie expira no máximo após 400 dias e pode ser removido pelo navegador antes disso. Limpar o armazenamento ou trocar de navegador exige confirmação por e-mail novamente. O servidor não consegue provar que duas instalações de navegador pertencem ao mesmo aparelho físico.
6. `POST /v1/auth/password/update` exige senha atual e e-mail confirmado; só aplica a nova senha após código no e-mail atual. A confirmação grava Argon2id e revoga todas as sessões e instalações confiáveis numa transação. A redefinição por senha esquecida também revoga sessões e instalações e exige novo login/novo código de instalação. A entrega ocorre fora da transação e ainda não usa outbox durável.
7. Senhas usam Argon2id (64 MiB, três iterações, paralelismo 1). Credenciais antigas começam na versão `0`, novas/atualizadas ficam na versão `1`; a política de composição não pode ser inferida do hash. Senha não é persistida no navegador, logs, eventos ou telemetria.
8. Cookies de sessão e pré-autenticação são opacos, `HttpOnly`, `Secure`, `SameSite=Lax` e `Path=/`; o servidor guarda hashes e valida CSRF nas mutações. `GET /v1/auth/devices` lista somente instalações da própria conta; revogar uma instalação ou todas as demais também encerra suas sessões. Logout encerra só a sessão atual e mantém a instalação confiável.
9. As tabelas físicas de instalações confiáveis e bloqueio foram encontradas no banco de desenvolvimento por metadados. A suíte de API passou em schema temporário isolado e removeu o namespace ao final. A consulta não leu registros; portanto, não afirma que o banco principal esteja vazio nem que nenhuma conta/sessão exista. Produção não foi consultada nem alterada.
10. A confirmação de e-mail é exigida antes de entrar ou acessar recursos protegidos. Trata-se de autorização do servidor, não apenas de uma proteção no React. O código de e-mail para instalação desconhecida é uma verificação adicional contextual; não é MFA geral para todo login nem TOTP.

**Regra de bloqueio no contrato:** bloquear grava a relação do iniciador e, na mesma transação, remove follows aceitos e solicitações pendentes nos dois sentidos. Mensagens e conteúdo não são apagados; conversas ficam ocultas durante o bloqueio e podem voltar após desbloquear. Só o iniciador remove seu bloqueio; follows e pedidos não são recriados. A API deve aplicar isso em toda leitura, escrita e entrega de mídia/notificação.

### Contas e consentimento

- Registrar versão de termos/política aceita e data. Separar consentimento de marketing e notificações do contrato necessário para operar a conta.
- Alteração de e-mail, exclusão, conexão de identidade e recuperação exigem reautenticação.
- Exclusão/desativação deve revogar sessões, parar descoberta, ocultar conteúdo, cancelar jobs e iniciar rotina de retenção/anônimização. Não prometer eliminação instantânea de backups.
- Exportação é tarefa assíncrona com autorização do solicitante, prazo e download privado; deve excluir segredos e dados privados de terceiros.

## 4. Upload, publicação e galeria

```text
POST /media/uploads (MIME declarado, tamanho, finalidade)
  -> valida cota/usuário -> cria media_asset pending
  -> retorna instrução de upload temporária, escopo de um objeto
PUT/POST no armazenamento, conforme instrução autorizada
POST /media/{id}/complete
  -> verifica objeto real, tamanho, checksum e tipo pelo conteúdo
  -> processamento/antivírus/remoção de EXIF/transcodificação
GET /media/{id} -> ready ou failed/quarantined
POST /social/posts com mediaIds
  -> valida autoria e estado ready -> grava post + post_media + outbox
GET /accounts/{id}/media
  -> consulta publicações legíveis + post_media, sem duplicar ativos
```

Limites atuais a preservar inicialmente: 8 mídias; foto até 10 MiB; vídeo até 100 MiB. JPEG/PNG/WebP/GIF/AVIF e MP4/WebM/MOV/OGG. Tipo informado pelo navegador é insuficiente: verificar magic bytes, dimensões, duração, tamanho descomprimido e codecs. Arquivos inválidos não viram URLs publicáveis.

Não aceitar SVG/HTML executável como foto. Remover EXIF, inclusive GPS, das variantes públicas. Validar URLs externas somente se houver um serviço específico de importação com proteção SSRF; a primeira versão deve aceitar arquivos enviados, não buscar qualquer URL.

**Leitura privada:** usar endpoint autorizado de conteúdo/proxy para ativos restritos. URLs pré-assinadas de leitura têm janela de acesso até expirar e não podem prometer revogação imediata. Se forem usadas para mídias públicas, definir TTL, invalidação e política de mudança de audiência. Nunca expor bucket inteiro ou object keys previsíveis como autorização.

Uploads sem vínculo podem expirar, proposta inicial 24 horas. Um ativo ainda usado em avatar, capa ou outra publicação não pode ser apagado por excluir apenas um vínculo. Exclusão física é job idempotente após checagem de referências e retenção.

## 5. Transações críticas

| Operação              | Unidade transacional / prevenção de corrida                                                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro              | Identidade + conta + perfil comercial, se houver + termos; unique username/provider-subject                                                                                                                                                                                                          |
| Publicar              | Sessão + ACL da referência + ownership de mídia + post + vínculos + outbox                                                                                                                                                                                                                           |
| Repost/curtir/salvar  | Unique de par; retry não duplica; contador derivado ou atualizado na mesma transação                                                                                                                                                                                                                 |
| Comentário/resposta   | Permissão do post + pai no mesmo post + conteúdo + evento de notificação                                                                                                                                                                                                                             |
| Seguir/Círculo        | Persistir somente arestas de seguir. Círculo é uma projeção de duas arestas aceitas em sentidos opostos; desfazer qualquer uma remove o resultado derivado. Não há transição própria de convite/aceite de Círculo                                                                                    |
| Bloquear              | Em transação, remover seguimentos aceitos e solicitações pendentes entre as contas; ocultar perfis/conteúdo e impedir interação nos dois sentidos. Mensagens existentes ficam inacessíveis durante o bloqueio, sem apagamento. Só o iniciador pode desbloquear; relações removidas não são recriadas |
| Avaliação             | Sessão do avaliador + conta comercial distinta + unique negócio/avaliador; média coerente com moderação                                                                                                                                                                                              |
| Resposta comercial    | Apenas dono do negócio vinculado à avaliação; nenhum `businessAccountId` arbitrário                                                                                                                                                                                                                  |
| Mensagem              | Participação + permissão de contato + clientMessageId único + mensagem + outbox                                                                                                                                                                                                                      |
| Leitura de conversa   | Cursor monotônico; mensagem deve pertencer à conversa; um participante não altera o cursor de outro                                                                                                                                                                                                  |
| Atualização de perfil | Versão esperada; username único; cache do Seek invalidado somente após commit                                                                                                                                                                                                                        |
| Remoção de conteúdo   | Estado removido + dependências/reposts ocultos + invalidação de busca/referências/galeria                                                                                                                                                                                                            |

## 6. Tempo real

Proposta inicial: SSE `GET /api/v1/stream` com sessão, heartbeat, limite por conta e `Last-Event-ID`; escritas permanecem REST. WebSocket é alternativa caso presença/digitação/volume justifiquem, não dependência obrigatória.

Envelope:

```json
{
  "eventId": "00000000-0000-4000-8000-000000000001",
  "type": "message.created",
  "occurredAt": "2026-10-22T15:00:00Z",
  "resourceId": "00000000-0000-4000-8000-000000000002",
  "version": 1
}
```

Tipos propostos: `message.created`, `conversation.read`, `notification.created`, `notification.read`, `follow.updated` (a projeção de Círculo muda junto), `post.updated`, `post.deleted`, `media.ready`, `media.failed`, `event.updated`.

Autorizar cada assinante e cada replay. Revogar assinaturas em logout/bloqueio/remoção de participante. Preferir IDs a corpo de mensagens em pushes e notificações de sistema. Entrega é **pelo menos uma vez**: frontend deduplica por eventId e consulta o recurso autorizado. Não prometer entrega exatamente uma vez.

## 7. Segurança e abuso

- Autorização por objeto em todo ID recebido: BOLA/IDOR é um risco central em posts, mídias, salvos, avaliações e conversas.
- Cookie de sessão exige defesa CSRF nas mutações: token + validação de origem; CORS não é autorização. SameSite não substitui todas as verificações.
- Origens CORS explícitas somente se realmente houver frontend separado. Não combinar credenciais com `Access-Control-Allow-Origin: *`.
- Queries parametrizadas; allowlist de ordenação e campos editáveis; não repassar objetos arbitrários do cliente para UPDATE.
- Sanitizar corpo de artigo ao renderizar; definir formato permitido. HTML de usuário não deve executar script, iframe ou handlers. Escapar texto normal.
- Usar CSP, HSTS em HTTPS, `X-Content-Type-Options: nosniff` e política de referrer.
- Rate limit por rota, conta e IP; anti-enumeração em autenticação; limites de busca, tamanho de página, payload e uploads; proteção contra spam e fan-out excessivo.
- Moderação exige papel administrativo confiável fora do perfil editável, motivo e trilha auditável. Verificação de negócio não é papel de administrador.
- Webhooks: assinatura, timestamp/tolerância, deduplicação por evento do provedor, corpo bruto para verificar assinatura e processamento assíncrono idempotente. Não confiar em query string de “pagamento aprovado”.
- Logs redigidos: nunca senha, cookie, token, segredo, URL assinada, corpo de DM, código de recuperação ou GPS bruto.
- O banco deve ter usuário de aplicação com privilégios mínimos e credenciais diferentes das de migração. Testes não devem usar dados pessoais de produção.

## 8. LGPD e retenção

Esta é orientação de engenharia, não parecer jurídico. Documentar finalidades, bases legais e operadores com revisão responsável.

Propostas para aprovação: remover upload órfão após 24h; idempotência por 24–72h conforme operação; logs operacionais redigidos por 30 dias; exportação privada com expiração curta; retenção de auditoria/moderação segundo necessidade legal. Não fixar retenção financeira antes de definir o modelo comercial e obrigações aplicáveis.

Não guardar GPS físico por padrão. Histórico de busca/visitas deve ser opt-in ou ter finalidade claramente informada e ação para limpar. Minimizar IP/user-agent e evitar rastreamento persistente desnecessário.

Exclusão deve tratar conta, identidade, sessões, mídia, busca, caches, notificações, mensagens, avaliações, jobs e backups. Mensagens/conteúdo de interação podem exigir anonimização ou tombstone em vez de cascade cego; a política deve ser documentada e testada.

## Estado da primeira fatia de Feed — registro histórico de 25/10/2026

- Schema lógico `feed.posts` modelado com chave da conta autora, audiência, tipo texto/artigo, conteúdo, timestamps, versão, checks e índices cronológicos. A migração versionada `0005_mushy_centennial.sql` foi gerada sem conexão ao banco; **não foi aplicada nesta etapa**.
- Rotas: `POST /v1/social/posts`, `POST /v1/social/articles`, `GET /v1/social/posts/{postId}`, `GET /v1/social/articles/{postId}`, `DELETE /v1/social/posts/{postId}` e `GET /v1/social/accounts/{accountId}/posts`. Perfil público agora recebe páginas separadas de posts e artigos do domínio Feed.
- O autor é sempre a conta autenticada; `authorId` de compatibilidade, quando enviado, precisa coincidir com a sessão. Escritas exigem CSRF. Entradas usam schemas Zod estritos, limites de tamanho, limite de página e cursores que carregam e validam conta/formato. Rotas de leitura e escrita possuem rate limits; a implementação desses limites é local ao processo e precisa ser revisada antes de executar múltiplas réplicas.
- A API recalcula autorização a cada leitura usando a projeção de Conta/Social: perfil privado exige follow aprovado para publicação pública; Círculo exige mutualidade; audiência privada é somente do titular; bloqueio bilateral oculta o recurso usando `404`. Conteúdo textual só é retornado como texto JSON; não é HTML executável.
- Artigos aceitam até 50.000 caracteres no corpo. Só `POST /v1/social/articles` recebe o limite de parser de 256 KB necessário para esse contrato; demais JSON continuam limitados a 32 KB. A requisição é testada antes de CSRF para comprovar o tamanho e o tratamento por request ID.
- Fotos/vídeos, `blob:` e URLs externas são rejeitados com erro explícito `CONTENT_MEDIA_NOT_READY`; nenhum arquivo é salvo e nenhum provedor de mídia foi habilitado. Curtidas, comentários e reposts ainda não existem no servidor; os contadores/estados no DTO retornam zero/falso nesta etapa e não devem ser confundidos com os estados locais da prévia.
- A geração Orval atualiza OpenAPI e cliente/tipos. A interface ainda não foi ligada a essas rotas: segue usando conteúdo local de preview. A próxima etapa não deve ser Seek; Feed Social precisa continuar até incluir as interações, a integração frontend e uma verificação autenticada real.
- A migração principal não foi executada porque `SEEKALIVE_EXPECTED_DATABASE` não está disponível para confirmar explicitamente o destino de desenvolvimento exigido pelos guardrails. `drizzle-kit check`, typecheck e testes de unidade/runtime foram executados; a suíte que grava em schema isolado não foi executada neste turno por esse bloqueio de segurança. Não houve DDL ou gravação no banco principal, nem alteração em produção.
