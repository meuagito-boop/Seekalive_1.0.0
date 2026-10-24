---
name: Implementação progressiva do backend
description: Escopo sequencial do backend Seekalive e critério para diferenciar pendência atual de módulo futuro.
---

O backend é construído por etapas. A fase inicial cobre login e cadastro; a próxima é Social e também deve avançar em entregas menores. Uma funcionalidade do frontend ainda sem backend não é automaticamente um defeito se pertence a uma etapa futura.

**Regra de sequência:** não iniciar Seek, Shop ou outro módulo até que todo o módulo Social esteja completo e validado como pronto para produção. Isso inclui perfil/grafo/privacidade, feed/publicações/mídias, comentários/curtidas/reposts, mensagens/notificações e verificações de produção; concluir uma subetapa não libera a troca de módulo.

**Why:** o usuário esclareceu que os módulos são integrados progressivamente e que, após login/cadastro, o trabalho seguirá para Social.

**How to apply:** em auditorias e planos, declarar a fase avaliada e manter o próximo trabalho dentro de Social até cumprir os critérios de prontidão de todo o módulo. Para cada subetapa, fechar contrato, persistência, autorização, integração da interface e testes; não tratar testes de desenvolvimento como prova de prontidão para produção. Separar explicitamente lacunas da fase atual de módulos ainda não iniciados.
