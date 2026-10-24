---
name: Geração de contratos Orval
description: Alinhamento de Orval, Zod 4 e exports de tipos gerados da API.
---

O workspace usa Orval 8.44 e Zod 4.6, alinhados com o código Zod 4 que Orval gera para `format: uuid` e `format: uri`. O pacote do cliente precisa incluir `DOM.Iterable` porque a saída do Orval usa `Headers.entries()`. Orval também acrescenta um export por estrela para `generated/types`; esses DTOs podem compartilhar nomes com schemas Zod em `generated/api`, então o barrel público mantém os DTOs no namespace `GeneratedTypes`. A normalização verifica os exports recebidos e falha se o gerador mudar o formato de saída.

**Why:** a geração anterior combinava código Zod 4 com Zod 3, e exports redundantes provocavam colisão real de nomes no typecheck.

**How to apply:** depois de alterar `openapi.yaml`, executar o script `codegen` do pacote api-spec; manter as versões compatíveis, a validação estrita do barrel e `DOM.Iterable`. Não substituir `format` por regex apenas para contornar uma dependência incompatível nem editar arquivos gerados manualmente.
