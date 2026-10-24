---
name: Implementação progressiva do backend
description: Escopo sequencial do backend Seekalive e critério para diferenciar pendência atual de módulo futuro.
---

O backend é construído por etapas. A fase inicial cobre login e cadastro; a próxima é Social e também deve avançar em entregas menores. Uma funcionalidade do frontend ainda sem backend não é automaticamente um defeito se pertence a uma etapa futura.

**Regra de sequência:** não iniciar Seek, Shop ou outro módulo até que todo o módulo Social esteja completo e validado como pronto para produção. Antes de avançar páginas públicas de perfil, feed/algoritmo, mensagens ou notificações, resolver e implementar as regras de idade, credenciais, recuperação, sessões/dispositivos, onboarding e configurações de conta. Isso inclui perfil/grafo/privacidade, feed/publicações/mídias, comentários/curtidas/reposts, mensagens/notificações e verificações de produção; concluir uma subetapa não libera a troca de módulo.

**Why:** o usuário esclareceu que os módulos são integrados progressivamente, que o Social deve ficar completo e pronto para produção antes de qualquer mudança de módulo e que identidade/segurança/configurações da conta são pré-requisitos para avançar às páginas públicas e recursos sociais.

**How to apply:** em auditorias e planos, declarar a fase avaliada e manter o próximo trabalho dentro de identidade/segurança da conta e depois Social até cumprir os critérios de prontidão de todo o módulo. Para cada subetapa, fechar contrato, persistência, autorização, integração da interface e testes; não tratar testes de desenvolvimento como prova de prontidão para produção. Separar explicitamente lacunas da fase atual de módulos ainda não iniciados.
