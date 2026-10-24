---
name: Estratégia de autenticação Seekalive
description: Regra do produto para autenticação própria e bloqueio de contas sem e-mail confirmado.
---

Autenticação própria pela API, sem Clerk/OIDC. O login aceita nome de usuário ou e-mail. Conta real sem e-mail confirmado não pode entrar nem acessar recursos. Cadastro permanece pendente e sem sessão até a confirmação; somente então a API pode emitir a primeira sessão. A exceção autorizada é a demonstração fictícia apenas no preview de desenvolvimento, sem conta ou sessão real. O envio de verificação por Resend está autorizado e confirmado em desenvolvimento; produção permanece desativada até configuração e validação explícitas.

A idade mínima definida para contas pessoais e comerciais é 18 anos autodeclarados; não há verificação documental. A consulta agregada ao banco de desenvolvimento encontrou zero contas abaixo de 18. A senha deve ter 8–128 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial; armazenar somente hash Argon2id.

Essas regras também valem para contas antigas. Como a composição não pode ser lida do hash, no próximo login uma senha legada compatível é validada e recebe a versão atual; uma senha incompatível não cria sessão e exige atualização usando a senha atual. A migração marca sessões existentes como antigas, exige novo login e não apaga contas/conteúdo. Não aplicar a migração no banco principal de desenvolvimento sem explicar e obter autorização, pois invalida as sessões atuais.

Não excluir nem alterar automaticamente contas existentes. A idade é auto declarada; para a primeira mudança no banco principal, confirmar a contagem agregada e aplicar uma restrição que impeça novas idades fora de 18–120. Não configurar confiança em proxy até a topologia real ser conhecida; manter Express em `trust proxy = false`.

**Why:** o usuário definiu acesso somente após e-mail verificado, preview separado, idade 18+ e a mesma regra de senha para contas novas e antigas. Contas antigas não podem ser avaliadas pela composição de um hash; exigir a senha atual para promoção ou troca evita bloquear contas válidas ou fingir que o hash revela a senha. A migração de sessão requer consentimento por encerrar sessões existentes.

**How to apply:** validar 18+ no contrato, frontend e banco sem coletar documento. Validar a composição da senha em cadastro e troca; manter login permissivo o suficiente para verificar hashes antigos, mas condicionar sessão à política atual. Promover hash legado compatível durante login; para incompatível, exigir troca confirmada por senha atual e revogar sessões. Nunca armazenar/logar a senha em claro. Aplicar verificação de e-mail no servidor; demonstração só no frontend de desenvolvimento, sem sessão real. Usar Resend somente em desenvolvimento até aprovação/configuração de produção. Não habilitar confiança em proxy sem confirmar a cadeia real.
