# 07 — Mídias, upload e armazenamento local

## Escopo

Verificação do caminho de fotos e vídeos entre navegador, API, filesystem local, registro de ativo, publicação e remoção. Nenhum arquivo foi enviado, lido da pasta de armazenamento ou removido durante a auditoria.

## Achados

### 07-001 — O armazenamento local é explicitamente restrito ao desenvolvimento

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `media/infrastructure/localMediaFileStore.ts:35–39` define o diretório de teste sob `generated-artifacts/social-media`. `:60–63` rejeita upload se `NODE_ENV` não for `development`. A rota converte essa condição em resposta 503 (`media/presentation/mediaRoutes.ts:140–145`).

**Trecho:** `if (process.env.NODE_ENV !== "development") throw new Error("Local media uploads are enabled only in development.");`

**Conclusão:** corresponde à decisão de usar arquivos locais para testes de desenvolvimento; não é uma estratégia de armazenamento de produção.

### 07-002 — O servidor gera nomes, limita bytes em streaming e confere assinatura inicial

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `media/domain/mediaAsset.ts:4–9` fixa oito anexos, 10 MiB por imagem, 100 MiB por vídeo e validade staged de 24 h. `mediaRoutes.ts:97–119` valida declaração/tipo de transporte e o `Content-Length`, quando enviado. `localMediaFileStore.ts:65–107` gera UUID, conta bytes do stream, guarda arquivo temporário com permissão `0600`, limita tamanho e confere assinatura. `:18–19,41–46` valida a chave de armazenamento contra formato UUID antes de formar o caminho; diretório é criado com modo `0700` (`:74`).

**Trecho:** `sizeBytes += chunk.length; if (sizeBytes > maximumBytes) callback(new MediaUploadTooLargeError());` e `createWriteStream(..., { flags: "wx", mode: 0o600 })`.

### 07-003 — A assinatura não equivale à decodificação ou validação completa do arquivo

**Veredito:** PARCIAL  
**Prioridade:** Alta antes de exposição pública de uploads

**Evidência:** `media/domain/mediaAsset.ts:82–130` reconhece tipos por assinatura inicial; o arquivo é gravado após essa verificação (`localMediaFileStore.ts:99–107`). Não há, neste caminho, decodificação por parser de imagem/vídeo, verificação de dimensões/pixels, duração, transcodificação, remoção de EXIF ou análise de conteúdo.

**Trecho:** `const detected = detectMediaSignature(header); if (!detected) throw new UnsupportedMediaSignatureError();`.

**Impacto:** o controle atual rejeita formatos e declarações não reconhecidos, mas não comprova que o conteúdo inteiro é válido, seguro para processamento ou compatível com políticas de privacidade/moderação.

### 07-004 — A publicação autenticada envia o arquivo ao backend; a prévia local usa URL temporária

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `front/src/modules/social/application/postActions.ts:78–87` escolhe o adaptador REST para uma sessão autenticada não demonstrativa. `front/src/modules/social/services/restContentService.ts:20–50` envia cada arquivo, depois cria publicação com os IDs dos ativos. `front/src/modules/social/services/restMediaApi.ts:15–31` faz `POST /api/v1/social/media` como `application/octet-stream` e valida a resposta; o backend recebe o stream (`back/src/modules/media/presentation/mediaRoutes.ts:86–149`). A prévia de navegador usa URL `blob:` e não persiste por si só (`front/src/modules/social/services/mediaService.ts:71–86`); a sessão de demonstração só pode ser iniciada em desenvolvimento (`front/src/modules/app/state/AppContext.tsx:112–120`).

**Trecho:** `body: file` no upload; após resposta, `mediaAssetIds: uploadedMedia.map((media) => media.id)` no payload da publicação.

**Limite:** a ligação estática existe; nenhum arquivo foi enviado para testar ponta a ponta nesta auditoria. Em demonstração local, a prévia continua temporária; a persistência do servidor é o caminho da sessão autenticada.

### 07-005 — Vínculo entre ativo staged e publicação é autorizado e transacional

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `mediaAssetRepository.ts:58–76` só seleciona ativos staged, não expirados e pertencentes ao autor, bloqueando as linhas para atualização. `feed/composition/postPersistence.ts:23–74` valida IDs, cria publicação e tags e anexa os ativos na mesma transação. A leitura de staged exige que o solicitante seja o proprietário (`mediaRoutes.ts:168–180`).

**Trecho:** a consulta exige `ownerAccountId`, `state = "staged"` e `expiresAt > now`, e usa `.for("update")`.

### 07-006 — Falha ao apagar arquivo após excluir publicação não tem fila durável de repetição

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `feed/composition/postPersistence.ts:81–100` remove os registros em transação e retorna chaves dos arquivos. `:102–112` tenta apagar os arquivos depois; se falhar, apenas registra evento e continua. O registro do ativo já foi removido em cascata com a publicação (FK confirmada no bloco 05), de modo que não fica uma referência persistente para nova tentativa.

**Trecho:** `await localMediaFileStore.remove(storageKey)` está dentro de `try/catch`; o `catch` registra `media.deleted_post_file_cleanup_failed` e continua.

**Impacto:** uma falha transitória de filesystem pode deixar arquivo órfão sem mecanismo de retry ou reconciliação comprovado.

### 07-007 — A limpeza de uploads abandonados depende de novo upload

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `media/application/uploadMedia.ts:31–43` consulta e limpa ativos expirados dentro do início de cada upload. `mediaAssetRepository.ts:133–155` limita cada busca a 100 registros. Não foi encontrado agendador/worker de limpeza dedicado no módulo.

**Trecho:** a limpeza é chamada no corpo de `uploadMedia`; a consulta termina com `.limit(100)`.

**Impacto:** ativos não anexados podem permanecer além de 24 h até outro upload acionar a limpeza; mais de 100 expirados exigem novas execuções. A retenção operacional do arquivo não é garantida apenas pelo campo `expiresAt`.

### 07-008 — A entrega de arquivos anexados reutiliza a autorização da publicação

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** para ativo anexado, `mediaRoutes.ts:172–180` consulta a publicação por `readPost(postId, accountId)` e confirma que a URL pertence à lista de mídias autorizadas. A resposta define `Content-Type` detectado, `nosniff`, `private, no-store`, suporte a Range e entrega em stream (`:193–218`).

**Trecho:** `const post = await dependencies.readPost(asset.postId, accountId); canRead = Boolean(post && post.mediaUrls?.includes(...));`.

### 07-009 — Limites de concorrência, uso de disco e limpeza de arquivos órfãos não foram demonstrados

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Média

**Evidência:** o código limita bytes por arquivo e chamadas por janela na rota, mas não foi executado teste de carga, concorrência de streams, disco cheio nem reconciliação de arquivos no filesystem. A auditoria estática não pode confirmar os limites efetivos do host de desenvolvimento.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** entrega de e-mail e integração Resend, sem consultar nem imprimir credenciais.
