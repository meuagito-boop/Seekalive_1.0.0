---
name: Geração de contratos Orval
description: Compatibilidade entre Orval, Zod 3 e os exports de tipos gerados da API.
---

No workspace, o codegen Orval 8.22 com Zod 3 gerou helpers `zod.uuid()` e `zod.url()` indisponíveis na versão instalada e produziu nomes duplicados para tipos de query e schemas Zod ao exportar ambos por estrela. O fluxo agora usa padrões OpenAPI compatíveis e normaliza o barrel do pacote depois da geração, mantendo os tipos auxiliares no namespace `GeneratedTypes`.

**Why:** a geração dos contratos sociais falhou no typecheck até as incompatibilidades de versão e exports serem corrigidas.

**How to apply:** depois de alterar `openapi.yaml`, executar o script `codegen` do pacote api-spec; manter `normalize-contract-exports.mjs` ligado ao comando e validar typecheck das bibliotecas. Não editar arquivos gerados manualmente.
