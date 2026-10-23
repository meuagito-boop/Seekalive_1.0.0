---
name: Bloqueio por conta
description: Comportamento atual do protótipo para bloquear perfis sem backend.
---

O frontend guarda bloqueios como relações entre a conta ativa e o perfil alvo. O perfil bloqueado é ocultado para quem bloqueou; a pessoa pode remover o bloqueio na tela de bloqueados ou na página indisponível do perfil. Bloquear não apaga nem altera seguimentos existentes, não cria solicitação/aviso para o alvo e não estabelece ainda um bloqueio bilateral.

**Why:** o usuário autorizou trocar a flag global do perfil por uma relação ator-alvo e habilitar o desbloqueio, mas não definiu remoção de seguimentos nem visibilidade bilateral. Preservar relações evita uma mudança destrutiva ou uma regra inventada.

**How to apply:** manter o estado local e isolado por conta enquanto o backend não for autorizado. Não remover relações existentes nem presumir efeito bilateral até o usuário decidir a política final; o servidor deverá impor a política aprovada quando for implementado.
