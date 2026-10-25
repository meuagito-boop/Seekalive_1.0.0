---
name: Banco gerenciado e schemas por domínio
description: Escolha atual de PostgreSQL gerenciado da Replit e limites entre schemas lógicos do Seekalive.
---

O usuário substituiu a decisão anterior de usar PostgreSQL externo: o backend deve usar o PostgreSQL gerenciado da Replit. Cada domínio possui um schema lógico próprio dentro da instância do ambiente; isso organiza ownership, mas não equivale a bancos físicos, usuários ou credenciais isolados. Os 12 schemas estão preparados em desenvolvimento; Contas, Segurança, Perfis/Relações e Seek já têm tabelas, e os demais estão vazios. Shop e Confiança e Segurança mantêm ownership lógico confirmado.

**Why:** o usuário autorizou usar o banco Replit e pediu separação por domínio sem adiar a construção do backend. A distinção entre schema lógico e isolamento físico evita alegar uma barreira de segurança que o modelo atual não oferece.

**How to apply:** manter dados de desenvolvimento e produção separados. Não habilitar o seletor PostgreSQL externo sem nova decisão explícita. O ambiente de desenvolvimento existente é sincronizado com Drizzle `push`; não aplicar nele o histórico de migrations como se fosse um banco vazio. Produção permanece intocada até o produto estar completo e a publicação ser autorizada.
