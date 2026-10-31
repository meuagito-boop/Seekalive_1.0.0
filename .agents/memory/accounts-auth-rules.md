---
name: Regras de Accounts/Auth
description: Decisões de produto do usuário para cadastro, autenticação, privacidade de contas e sessões.
---

## Decisões aprovadas

- Cadastro coleta data de nascimento no formato `dd/mm/aaaa`; o backend calcula a idade e recusa menores de 18. A idade não é exibida no perfil nem nas configurações.
- Aceite de Termos de Uso e Política de Privacidade é obrigatório e deve registrar versão e data do aceite.
- O tipo de conta não pode ser convertido entre pessoal e comercial.
- Conta comercial pode ficar privada; enquanto privada, não aparece no Seek.
- Em perfil privado, seguidores aprovados podem ver publicações privadas; conteúdo do Círculo continua restrito a seguidores mútuos. Bloqueios ocultam o conteúdo entre as contas.
- `@`: de 3 a 20 caracteres; aceita letras sem acento, números, hífen e sublinhado. É normalizado para minúsculas; Seekalive e variações reconhecidas são reservadas para o sistema. Alteração: a cada 30 dias; identificador antigo fica indisponível por 30 dias.
- Códigos de confirmação valem 10 minutos em todos os fluxos. Login de instalação nova conserva as regras específicas aprovadas: reenvio após 30 segundos, depois 90 segundos; três falhas bloqueiam a conta e direcionam ao suporte.
- Sessão padrão de sete dias, sem expiração por inatividade; no máximo duas sessões ativas simultâneas. Ao criar outra, revogar a mais antiga na mesma transação. Todas as rotas que criam sessão devem passar pelo repositório compartilhado que bloqueia a linha da conta, evitando ultrapassar o limite em logins concorrentes. Instalação confiável continua reconhecida até revogação; mudança de senha revoga todas.
- Contas públicas não podem reivindicar `seekalive` nem variações de formatação, separadores, repetição e substituições numéricas comuns; o validador compartilhado e a política estão documentados. O lookup continua permitindo localizar perfil oficial. A criação/provisionamento privilegiado de contas oficiais ainda não existe.

## IP e ciclo de retenção

- Token revogável é o identificador durável do dispositivo; IP serve somente ao rate limit nesta etapa e não deve ser tratado como identidade do aparelho nem persistido como histórico de sessão.
- No desenvolvimento, a API só aceita o cabeçalho interno de IP quando a conexão imediata vem de loopback; a confiança na entrada do proxy ainda não foi validada. Não ampliar o uso do IP sem verificar a cadeia no ambiente-alvo.
- Após os sete dias de desativação, a conta não pode ser restaurada; todos os registros permanecem por mais 90 dias e depois são eliminados. Durante a retenção, a conta fica fora das APIs públicas.
- O @ antigo fica reservado por 30 dias desde o pedido de exclusão e pode ser reivindicado depois, mesmo enquanto os registros antigos continuam retidos. O endereço de e-mail permanece indisponível até a purga por causa da unicidade e retenção atuais; esse efeito deve ser informado antes de mudar a política.

**Why:** Estas regras foram fornecidas diretamente pelo usuário em 29/10/2026 e não são dedutíveis do código. A interpretação incorreta de retenção ou de confiança no IP pode mudar exclusão de dados e controles de segurança.

**How to apply:** preservar a janela de restauração de sete dias, a retenção adicional de 90 dias contada do prazo final, a liberação do @ no 30º dia e o limite transacional de duas sessões. Não usar IP para reconhecer instalação.

## Visibilidade de publicações em perfis privados

**Regra:** o dono e seguidores aprovados podem ler publicações com audiência privada quando o perfil do autor está privado. Publicações do Círculo continuam exigindo seguimento mútuo; em perfis públicos, audiência privada continua restrita ao próprio autor. Um bloqueio de qualquer lado impede a leitura.

**Why:** o usuário aprovou explicitamente que um seguidor aprovado veja publicações privadas e que Círculo permaneça mútuo; a audiência do post não deve apagar essa distinção.

**How to apply:** manter a política autoritativa no backend e espelhá-la apenas para a experiência de preview no frontend; testar perfil público/privado, aprovados, Círculo mútuo e não mútuo, dono e bloqueios.
