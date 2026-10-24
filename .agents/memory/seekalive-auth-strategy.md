---
name: Estratégia de autenticação Seekalive
description: Regra do produto para autenticação própria e bloqueio de contas sem e-mail confirmado.
---

Autenticação própria pela API, sem Clerk/OIDC. O login aceita nome de usuário ou e-mail. Conta real sem e-mail confirmado não pode entrar nem acessar recursos. Cadastro permanece pendente e sem sessão até a confirmação; somente então a API pode emitir a primeira sessão. A exceção autorizada é a demonstração fictícia apenas no preview de desenvolvimento, sem conta ou sessão real. O envio de verificação por Resend está autorizado e confirmado em desenvolvimento; produção permanece desativada até configuração e validação explícitas. Novos cadastros pessoais e comerciais exigem idade autodeclarada de 18 anos ou mais para a primeira versão pública; não há verificação documental. Não configurar confiança em proxy até a topologia de staging/produção ser conhecida; manter Express no padrão `trust proxy = false`.

Não alterar nem excluir registros de desenvolvimento existentes sem decisão explícita; revisar e tratar eventuais contas abaixo de 18 antes de aplicar a restrição ao banco principal ou abrir o app publicamente.

**Why:** o usuário definiu verificação de e-mail como requisito para contas reais, escolheu 18+ para a primeira versão pública, autorizou um modo separado de preview e confirmou o recebimento do e-mail de teste. Também adiou proxy e serviços externos até conhecer a topologia e aprovar a integração.

**How to apply:** aplicar idade 18+ a novos cadastros pessoais e comerciais, sem inferir verificação documental. Antes de aplicar a restrição no banco principal, revisar registros existentes e definir como tratar qualquer conta abaixo de 18 sem apagar dados automaticamente. Aplicar verificação de e-mail no servidor; modo fictício somente no frontend de desenvolvimento, sem sessão real. Usar Resend apenas em desenvolvimento até aprovação/configuração de produção. Não habilitar confiança em proxy sem confirmar a cadeia real.
