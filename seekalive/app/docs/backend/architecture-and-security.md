# Arquitetura, segurança e fluxos

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

| Convenção | Contrato proposto |
|---|---|
| Versão | `/api/v1`; manter `/api/healthz` existente |
| IDs novos | UUID gerado no servidor; IDs legados de demonstração não são importados |
| Datas | ISO 8601 UTC; fuso IANA separado quando houver calendário local |
| Dinheiro | Inteiro em centavos + moeda ISO, inicialmente BRL; jamais fazer cálculo com `R$ 29,90` |
| Paginação | `{items: [...], nextCursor: string|null}`; limite padrão 20, máximo 100 |
| Cursor | Opaco, assinado ou validado, vinculado a filtros/ordem/escopo; desempate por ID |
| Busca | Normalização de acentos, limites de tamanho, ranking documentado; não chamar de semântica sem implementação |
| Erro | `{error:{code,message,requestId,fields?}}`, sem SQL, token, stack ou informação privada |
| Concorrência | `version`/ETag em recursos editáveis; `If-Match` nas alterações; `412` para versão divergente |
| Relações | PUT/DELETE idempotentes; repost POST existente também deve ser idempotente por par conta/publicação |
| Criações | `Idempotency-Key` em POST com efeito; vincular conta, método, rota e hash do corpo; rejeitar reutilização com corpo diferente |
| Limites | `429` e `Retry-After`; cotas propostas, configuráveis e medidas |

Status principais: `200`, `201`, `202` para tarefa realmente aceita, `204` sem corpo, `400` sintaxe, `401`, `403`, `404`, `409` conflito de domínio, `412` versão, `413` tamanho, `415` tipo, `422` validação, `429`, `500`, `502` integração, `503` indisponibilidade. `401` nunca deve ser convertido em resultado vazio nem em dados de demonstração.

### Exemplo de erro

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Revise os campos informados.",
    "requestId": "req_exemplo",
    "fields": [{"path": "rating", "message": "Informe uma nota inteira entre 1 e 5."}]
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

**Direção escolhida:** autenticação própria pela API, a implementar somente quando começar o backend. Até lá, login, cadastro, verificação e recuperação permanecem demonstrativos no frontend; não conectar Clerk nem OIDC.

Requisitos para a futura implementação:

1. Um registro cria uma única identidade Social, pessoal ou comercial; a conta comercial recebe extensão comercial na mesma transação. `username` e e-mail precisam de normalização e unicidade com respostas que não exponham dados de terceiros.
2. O login aceita o identificador já definido pela interface: nome de usuário ou e-mail, mais senha. Falhas usam resposta genérica, limite de tentativas e auditoria sem registrar credenciais.
3. Armazenar senha somente com hash forte Argon2id e parâmetros versionados; nunca persistir senha no browser, logs, eventos ou telemetria.
4. Emitir sessão opaca aleatória em cookie `Secure`, `HttpOnly`, `SameSite=Lax`; persistir somente hash, aplicar CSRF, expiração, rotação e revogação pelo servidor.
5. Verificação de e-mail e recuperação usam tokens de uso único, expirados e armazenados como hash. Respostas de recuperação são anti-enumeração; o provedor de envio de e-mail continua por escolher.
6. Logout revoga a sessão no servidor e limpa caches privados. O estado ativo do navegador não é prova de autenticação.

**Aviso de contrato:** os endpoints `authorize/callback` e as tabelas `auth_identities`/FK correspondente são rascunhos OIDC legados e não selecionados. Revisar o OpenAPI e o modelo SQL para a API própria antes de implementar ou migrar. Nenhuma alteração de backend, segredo ou banco foi feita nesta etapa.

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

| Operação | Unidade transacional / prevenção de corrida |
|---|---|
| Cadastro | Identidade + conta + perfil comercial, se houver + termos; unique username/provider-subject |
| Publicar | Sessão + ACL da referência + ownership de mídia + post + vínculos + outbox |
| Repost/curtir/salvar | Unique de par; retry não duplica; contador derivado ou atualizado na mesma transação |
| Comentário/resposta | Permissão do post + pai no mesmo post + conteúdo + evento de notificação |
| Seguir/Círculo | Persistir somente arestas de seguir. Círculo é uma projeção de duas arestas aceitas em sentidos opostos; desfazer qualquer uma remove o resultado derivado. Não há transição própria de convite/aceite de Círculo |
| Bloquear | Impedir leitura e novas interações entre as duas contas em ambos os sentidos; manter os seguimentos aceitos armazenados, porém sem efeito enquanto houver bloqueio. Só o iniciador remove sua relação de bloqueio |
| Avaliação | Sessão do avaliador + conta comercial distinta + unique negócio/avaliador; média coerente com moderação |
| Resposta comercial | Apenas dono do negócio vinculado à avaliação; nenhum `businessAccountId` arbitrário |
| Mensagem | Participação + permissão de contato + clientMessageId único + mensagem + outbox |
| Leitura de conversa | Cursor monotônico; mensagem deve pertencer à conversa; um participante não altera o cursor de outro |
| Atualização de perfil | Versão esperada; username único; cache do Seek invalidado somente após commit |
| Remoção de conteúdo | Estado removido + dependências/reposts ocultos + invalidação de busca/referências/galeria |

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
