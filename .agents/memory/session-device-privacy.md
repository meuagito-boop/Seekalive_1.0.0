---
name: Privacidade de sessões
description: Política para sessões autenticadas e identificação de dispositivos.
---

Registrar o IP observado em cada sessão autenticada, tanto web quanto celular. Exigir código enviado ao e-mail verificado quando o IP de uma nova sessão diferir do IP da sessão registrada imediatamente antes. IP é dado pessoal e identifica a conexão de rede, não o aparelho físico nem um local preciso: pode mudar no mesmo aparelho e ser compartilhado por vários. O aplicativo ainda não foi lançado e não há contas reais legadas; a primeira sessão autenticada após a verificação do e-mail estabelece a referência inicial. Proteger o dado, restringir acesso, não registrá-lo em logs de aplicação em texto claro e definir retenção e visibilidade antes de implementar. Esta decisão não autoriza GPS, fingerprinting ou coleta de user-agent para identificar aparelho. A captura do IP original atrás de proxy depende de configuração confiável; não confiar em cabeçalhos encaminhados pelo cliente nem alterar essa configuração sem aprovação explícita.

**Why:** O usuário determinou o registro de IP e o código de e-mail para novas sessões cujo IP difira da sessão anterior. Como o aplicativo não foi lançado, não há contas reais legadas nem necessidade de um fluxo de migração. IP não equivale a dispositivo ou localização física. A configuração atual não confia em proxy; aceitar cabeçalhos arbitrários pode registrar um valor falsificado.

**How to apply:** Armazenar o IP por sessão somente a partir de uma fonte confiável, com acesso restrito e retenção definida; não colocá-lo em logs de aplicação nem apresentá-lo como localização/aparelho preciso. Manter a configuração de proxy atual até aprovação explícita. A primeira sessão após a verificação do e-mail estabelece a referência; acionar código por e-mail quando o IP da sessão seguinte diferir do anterior.
