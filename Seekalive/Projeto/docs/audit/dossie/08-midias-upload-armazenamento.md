# 08 — Mídia, upload e armazenamento

## Escopo e método

Verificação do caminho de fotos e vídeos entre navegador, API, filesystem local, registro de ativo, publicação e remoção. Nenhum arquivo foi enviado, lido da pasta de armazenamento ou removido. As afirmações sobre autorização/headers derivam da leitura de código, não de requisições de mídia.

## Achados

### 08-001 — O armazenamento local está restrito ao desenvolvimento

**Afirmação da doc:** O armazenamento local é temporário e exclusivo para desenvolvimento.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — não deve ser apresentado como armazenamento de produção.

**Evidência:** `media/infrastructure/localMediaFileStore.ts:35–39,60–63` configura o caminho `generated-artifacts/social-media` e rejeita upload quando `NODE_ENV` não é `development`. `media/presentation/mediaRoutes.ts:140–145` transforma isso em 503.

**Trecho:** `if (process.env.NODE_ENV !== "development") throw new Error("Local media uploads are enabled only in development.");`.

### 08-002 — Upload usa UUID, streaming com limite de bytes e assinatura inicial

**Afirmação da doc:** N/A — inventário de controles implementados.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — os limites reduzem o tamanho aceito, mas não validam integralmente o conteúdo.

**Evidência:** `media/domain/mediaAsset.ts:4–9` define oito anexos, 10 MiB por imagem, 100 MiB por vídeo e validade staged de 24 h. `mediaRoutes.ts:97–119` valida tipo e `Content-Length` quando presente. `localMediaFileStore.ts:65–107` gera UUID, conta bytes do stream, valida assinatura e cria arquivo com `0600`; a chave UUID é validada antes de formar o caminho (`:18–19,41–46`), e o diretório é criado com `0700` (`:74`).

**Trecho:** o contador `sizeBytes` interrompe quando ultrapassa `maximumBytes`; o arquivo é criado com `flags: "wx", mode: 0o600`.

### 08-003 — Magic bytes não comprovam decodificação, integridade completa ou segurança do arquivo

**Afirmação da doc:** N/A — análise adversarial da validação.  
**Veredito:** PARCIAL  
**Risco:** Alto antes de expor uploads publicamente — arquivos malformados podem passar na assinatura inicial.

**Evidência:** `media/domain/mediaAsset.ts:82–130` reconhece assinatura inicial e `localMediaFileStore.ts:99–107` grava após essa verificação. Não foi encontrado parser/decodificador completo, validação de dimensão/duração, transcodificação, remoção EXIF ou análise de conteúdo.

**Trecho:** `const detected = detectMediaSignature(header); if (!detected) throw new UnsupportedMediaSignatureError();`.

### 08-004 — A sessão Social autenticada envia mídia ao backend; preview usa URL temporária

**Afirmação da doc:** N/A — verificação estática da integração frontend/backend.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — nenhuma transferência real foi testada durante esta auditoria.

**Evidência:** `front/src/modules/social/application/postActions.ts:78–87` escolhe REST fora do preview. `social/services/restContentService.ts:20–50` envia arquivos e cria post com IDs staged. `restMediaApi.ts:15–31` envia `POST /api/v1/social/media` como octet-stream; o backend recebe stream em `back/src/modules/media/presentation/mediaRoutes.ts:86–149`. A prévia do navegador usa `blob:` (`mediaService.ts:71–86`); o modo preview só inicia em desenvolvimento (`app/state/AppContext.tsx:112–120`).

**Trecho:** o payload da publicação inclui `mediaAssetIds: uploadedMedia.map((media) => media.id)`.

### 08-005 — A anexação de ativos staged ao post valida titularidade e usa uma transação de banco

**Afirmação da doc:** N/A — verificação do vínculo entre mídia e publicação.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — arquivo físico e transação de banco continuam sendo recursos distintos.

**Evidência:** `media/infrastructure/mediaAssetRepository.ts:58–76` exige proprietário, estado staged, não expirado e bloqueia a linha. `feed/composition/postPersistence.ts:23–74` valida IDs, cria post/tags e anexa os ativos na mesma transação. A leitura de ativo staged confere o proprietário (`mediaRoutes.ts:168–180`).

**Trecho:** a consulta exige `ownerAccountId`, `state = "staged"` e `expiresAt > now`, usando `.for("update")`.

### 08-006 — Exclusão de post pode deixar arquivo órfão sem retry durável

**Afirmação da doc:** N/A — análise da remoção e recuperação após falha.  
**Veredito:** PARCIAL  
**Risco:** Médio — uma falha transitória do filesystem pode deixar conteúdo ocupando disco sem referência recuperável.

**Evidência:** `feed/composition/postPersistence.ts:81–100` remove os registros em transação e retorna chaves; `:102–112` tenta apagar arquivos depois e apenas registra evento em caso de falha. O ativo associado já foi removido por cascade, conforme o schema do bloco 05.

**Trecho:** o `catch` registra `media.deleted_post_file_cleanup_failed` e continua sem retry durável.

### 08-007 — A limpeza de uploads abandonados depende de novos uploads

**Afirmação da doc:** A expiração de 24 horas elimina ativos staged.  
**Veredito:** PARCIAL  
**Risco:** Médio — o arquivo pode permanecer no disco após expirar até outro upload acionar a limpeza.

**Evidência:** `media/application/uploadMedia.ts:31–43` aciona limpeza no começo do upload; `mediaAssetRepository.ts:133–155` limita a consulta a 100 registros. Não foi encontrado worker/agenda de limpeza dedicado no módulo.

**Trecho:** a limpeza está dentro de `uploadMedia`; consulta `.limit(100)`.

### 08-008 — A leitura de mídia anexada reutiliza a autorização do post e envia `private, no-store`

**Afirmação da doc:** N/A — verificação de cache compartilhado e leitura privada.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — nenhum cache compartilhado externo foi testado, mas a resposta de origem não deve ser armazenada.

**Evidência:** `media/presentation/mediaRoutes.ts:172–180` chama `readPost(postId, accountId)` e verifica que a URL pertence ao post. `:203–218` envia `Content-Type` detectado, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Cache-Control: private, no-store`, suporte a Range e stream. Busca estática do mesmo arquivo não encontrou `Vary`.

**Trecho:** `canRead = Boolean(post && post.mediaUrls?.includes(...))`; a origem não define `Vary`. O `private, no-store` reduz o risco de cache compartilhado conforme o comportamento esperado dos caches conformes, mas nenhum cache externo foi testado.

### 08-009 — Concorrência de streams, limite de disco e reconciliação de órfãos não foram demonstrados

**Afirmação da doc:** N/A — validação operacional proibida nesta auditoria.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — limites por arquivo não comprovam o uso total de disco ou comportamento sob carga.

**Evidência:** não foram executados testes de carga/concorrência, disco cheio ou reconciliação do filesystem. O código limita bytes por arquivo e define rate limit, mas o consumo máximo do host de desenvolvimento não foi medido.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |
