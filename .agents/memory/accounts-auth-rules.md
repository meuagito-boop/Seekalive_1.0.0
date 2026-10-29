---
name: Regras de Accounts/Auth
description: Decisões de produto do usuário para cadastro, autenticação, privacidade de contas e sessões.
---

## Decisões aprovadas

- Cadastro coleta data de nascimento no formato `dd/mm/aaaa`; o backend calcula a idade e recusa menores de 18. A idade não é exibida no perfil nem nas configurações.
- Aceite de Termos de Uso e Política de Privacidade é obrigatório e deve registrar versão e data do aceite.
- O tipo de conta não pode ser convertido entre pessoal e comercial.
- Conta comercial pode ficar privada; enquanto privada, não aparece no Seek.
- `@`: de 3 a 20 caracteres; aceita letras sem acento, números, hífen e sublinhado. É normalizado para minúsculas; Seekalive e variações reconhecidas são reservadas para o sistema. Alteração: a cada 30 dias; identificador antigo fica indisponível por 30 dias.
- Códigos de confirmação valem 10 minutos em todos os fluxos. Login de instalação nova conserva as regras específicas aprovadas: reenvio após 30 segundos, depois 90 segundos; três falhas bloqueiam a conta e direcionam ao suporte.
- Sessão padrão de sete dias, sem expiração por inatividade; no máximo duas sessões simultâneas. Uma terceira sessão revoga a mais antiga. Instalação confiável continua reconhecida até revogação; mudança de senha revoga todas.
- Contas públicas não podem reivindicar `seekalive` nem variações de formatação, separadores, repetição e substituições numéricas comuns; o validador compartilhado e a política estão documentados. O lookup continua permitindo localizar perfil oficial. A criação/provisionamento privilegiado de contas oficiais ainda não existe.

## IP e retenção: limites pendentes

- Token revogável é o identificador durável do dispositivo; IP serve somente ao rate limit nesta etapa e não deve ser tratado como identidade do aparelho nem persistido como histórico de sessão.
- No desenvolvimento, a API só aceita o cabeçalho interno de IP quando a conexão imediata vem de loopback; a confiança na entrada do proxy ainda não foi validada. Não ampliar o uso do IP sem verificar a cadeia no ambiente-alvo.
- Após os sete dias de desativação, a conta não pode ser restaurada; todos os registros devem permanecer por mais 90 dias, com acesso restrito para pedidos legais, e depois ser eliminados. O finalizador atual apaga aos sete dias, portanto contradiz a regra e precisa ser substituído antes de fechar Accounts/Auth.

**Why:** Estas regras foram fornecidas diretamente pelo usuário em 29/10/2026 e não são dedutíveis do código. A interpretação incorreta de retenção ou de confiança no IP pode mudar exclusão de dados e controles de segurança.

**How to apply:** preservar as regras aprovadas e verificar a implementação antes de fechar Accounts/Auth. O limite de sessões, a retenção legal adicional e a exclusão final precisam de testes próprios; não declarar cobertura onde o domínio ainda não possui persistência. Não usar IP para reconhecer instalação.
