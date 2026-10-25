---
name: Ciclo de vida da conta Seekalive
description: Regras confirmadas para solicitar encerramento e exclusão permanente da conta.
---

Na primeira versão, o titular deve poder solicitar a exclusão permanente da própria conta em Configurações. A conta fica oculta e desativada imediatamente, os dados são preservados para restauração, e a exclusão ocorre 7 dias após a solicitação. O titular pode cancelar até o último dia: ao tentar entrar, depois de validar credenciais, vê o tempo restante e escolhe restaurar ou manter a exclusão programada. Se recusar, o acesso continua bloqueado. Ainda é preciso decidir se restaurar exige código por e-mail, além do conteúdo relacionado, retenção e anonimização. Não apagar dados automaticamente enquanto essas regras estiverem indefinidas.

**Why:** o usuário quer oferecer ao titular um caminho para excluir a conta com prazo de 7 dias, oportunidade de cancelar durante uma tentativa de login e conta desativada nesse intervalo, sem apagar dados antes da decisão final.

**How to apply:** tratar a exclusão como fluxo de conta destrutivo e autenticado; só revelar o estado de exclusão após validar credenciais. Permitir restauração após cancelamento, definindo a confirmação de segurança e o tratamento de dados antes de criar endpoint ou rotina que apague registros.
