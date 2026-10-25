---
name: Implementação progressiva do backend
description: Escopo sequencial do backend Seekalive e critério para diferenciar pendência atual de módulo futuro.
---

O backend é construído por etapas. A primeira fase é o domínio de Cadastro/Contas e tudo diretamente relacionado à conta: identidade, autenticação, segurança, sessões/dispositivos, recuperação, onboarding, configurações e ciclo de vida. Só depois de concluir essa fase começa Social, que também avança em entregas menores. Uma funcionalidade do frontend ainda sem backend não é automaticamente um defeito se pertence a uma etapa futura.

**Regra de sequência:** não iniciar Seek, Shop ou outro módulo até que todo o módulo Social esteja completo e validado como pronto para produção. Antes de avançar páginas públicas de perfil, feed/algoritmo, mensagens ou notificações, resolver e implementar as regras de idade, credenciais, recuperação, sessões/dispositivos, onboarding e configurações de conta. Isso inclui perfil/grafo/privacidade, feed/publicações/mídias, comentários/curtidas/reposts, mensagens/notificações e verificações de produção; concluir uma subetapa não libera a troca de módulo.

**Painel e suporte:** o Painel de Controle será usado para controle, gestão e moderação de assuntos do aplicativo e do Gestor. Não implementar nem alterar o Painel ou o Gestor enquanto essa etapa estiver fora do escopo autorizado. Solicitações manuais de recuperação de conta deverão chegar ao e-mail de suporte e ao Painel quando esses canais forem construídos.

**Why:** o usuário esclareceu que Cadastro/Contas e todas as regras relacionadas devem ser concluídos primeiro; Social só começa depois. Também definiu que Social deve ficar completo e validado antes de qualquer mudança para Seek/Shop, e que o Painel será o centro de controle/gestão/moderação do app e do Gestor, sem autorização para implementação nesta etapa.

**How to apply:** em auditorias e planos, declarar a fase avaliada e concluir Cadastro/Contas e todas as regras diretamente ligadas à conta antes de iniciar Social. Depois, manter o trabalho no Social até cumprir os critérios de prontidão do módulo inteiro; só então considerar Seek/Shop. Para cada subetapa, fechar contrato, persistência, autorização, integração da interface e testes; não tratar testes de desenvolvimento como prova de prontidão para produção. Separar lacunas da fase atual de módulos futuros. Registrar integrações futuras do Painel sem criar telas, endpoints ou alterar a pasta do Gestor/Painel antes de autorização.
