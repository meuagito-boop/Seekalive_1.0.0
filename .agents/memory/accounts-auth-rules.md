---
name: Regras de Accounts/Auth
description: Decisões de produto do usuário para cadastro, autenticação, privacidade de contas e sessões.
---

## Decisões aprovadas

- Cadastro coleta data de nascimento no formato `dd/mm/aaaa`; o backend calcula a idade e recusa menores de 18. A idade não é exibida no perfil nem nas configurações.
- Aceite de Termos de Uso e Política de Privacidade é obrigatório e deve registrar versão e data do aceite.
- O tipo de conta não pode ser convertido entre pessoal e comercial.
- Conta comercial pode ficar privada; enquanto privada, não aparece no Seek.
- `@`: de 3 a 20 caracteres; aceita letras sem acento, números, hífen e sublinhado. Mantêm-se as regras já definidas de exclusividade, intervalo de 30 dias para alteração e reserva do identificador antigo por 30 dias.
- Códigos de confirmação valem 10 minutos em todos os fluxos. Login de instalação nova conserva as regras específicas aprovadas: reenvio após 30 segundos, depois 90 segundos; três falhas bloqueiam a conta e direcionam ao suporte.
- Sessão padrão de sete dias, sem expiração por inatividade; no máximo duas sessões simultâneas. Instalação confiável continua reconhecida até revogação. A ação ao tentar criar uma terceira sessão ainda não foi definida.
- O usuário pediu que contas comuns não possam usar `seekalive` nem variações; uma política de nomes reservados precisa ser preparada, sem tentar enumerar literalmente um conjunto potencialmente enorme.

## IP e retenção: limites pendentes

- Token revogável é o identificador durável do dispositivo; IP não deve ser tratado como identidade do dispositivo.
- No desenvolvimento, o Vite extrai um IP de `X-Forwarded-For` e encaminha `x-seekalive-client-ip`. A API aceita o cabeçalho apenas quando a conexão imediata vem de loopback. Atualmente o IP serve à limitação de tentativas, não é persistido na sessão. A confiança no cabeçalho de entrada do proxy e a topologia de produção ainda não foram validadas; não assumir o IP como confiável nem persistir sem essa validação.
- O usuário indicou retenção de 90 dias para “todos os registros”, mas isso pode conflitar com a exclusão definitiva de conteúdo após sete dias e a retenção somente mínima/obrigatória já aprovada. Confirmar o escopo antes de implementar retenção ou exclusão.

**Why:** Estas regras foram fornecidas diretamente pelo usuário em 29/10/2026 e não são dedutíveis do código. A interpretação incorreta de retenção ou de confiança no IP pode mudar exclusão de dados e controles de segurança.

**How to apply:** preservar as regras aprovadas; pedir esclarecimento para o destino da terceira sessão e para o alcance dos 90 dias. Antes de armazenar IP, verificar a cadeia de proxy em desenvolvimento e no ambiente-alvo; não usar IP para reconhecer instalação.
