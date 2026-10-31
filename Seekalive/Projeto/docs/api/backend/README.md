# Seekalive — documentação do aplicativo e especificação do backend

**Atualizado:** 30/10/2026. **Natureza:** documentação técnica do backend já implementado em fatias e contratos futuros do produto.

> Estado atual de desenvolvimento: sessão, CSRF, cadastro/login/verificação, recuperação/troca de senha, instalações confiáveis, sessões, onboarding, perfis, relações, Feed e upload de fotos/vídeos estão implementados em fatias. O PostgreSQL de desenvolvimento tem tabelas nos schemas `accounts` (4), `security` (4), `profiles` (5), `feed` (6) e `media` (1); `feed.posts` e `media.assets` existem. Referências de mídia do Feed apontam para ativos do domínio Mídias; os arquivos binários ficam em disco local apenas em desenvolvimento, fora do Git e do deploy. Upload temporário pode ser anexado por até 24 horas; a limpeza de expirados é oportunística no próximo upload, sem worker periódico. As migrations Feed e Mídias possuem trilhas independentes e foram aplicadas/verificadas somente no banco de desenvolvimento. Nenhuma alteração foi feita em produção. A suíte geral, os testes isolados de exclusão de conta (6/6), o replay dos baselines em schemas temporários, typecheck, build, geração de contratos e verificações locais de migration passaram. Os testes isolados confirmaram remoção do schema temporário e preservação do schema `public`. Processamento de mídia e armazenamento permanente não estão implementados.

## Como utilizar este pacote

1. Ler este documento e `architecture-and-security.md`: escopo atual, regras e decisões futuras.
2. Ler `analysis-of-reference-documents.md`: comparação dos PDFs com o produto atual e decisões que ainda precisam de aprovação.
3. Ler `frontend-readiness-audit.md`: resultado da revisão do estado atual e bloqueios antes da integração.
4. Consultar `frontend-integration.md`: cada página e cada armazenamento temporário que precisam de integração.
5. Usar `shared/api-spec/openapi.yaml` como fonte de verdade dos contratos ativos da API. `endpoints.md` e `openapi.json` neste pacote descrevem o catálogo técnico mais amplo do produto e incluem propostas que ainda não estão ligadas.
6. Revisar `data-dictionary.md`, as migrations em `../../infra/database/migrations/` e `schema-core.sql`: distinguir o modelo Drizzle, o journal local, a presença física no banco e o modelo futuro. O `drizzle-kit check` valida somente os arquivos locais; não prova aplicação. **Não executar `push`, `migrate` ou DDL no banco principal sem apresentar antes o diff, impacto, recuperação e obter aprovação explícita para a alteração específica.**
7. Consultar `external-services-and-operations.md`: serviços, links oficiais, configuração, implantação e monitoramento.
8. Seguir `implementation-and-tests.md`: ordem de implementação, critérios de aceite e funcionalidades futuras.

O HTML autônomo e `Seekalive-backend-documentation.md` reúnem as fontes para consulta em formatos navegável e Markdown; o ZIP inclui documentação, o mapa de domínios de dados, o catálogo técnico, o OpenAPI compartilhado da API ativa, SQL de referência, migrations versionadas e o catálogo IBGE usado no frontend. Regenere ambos depois de alterar as fontes e mantenha o ZIP sincronizado com a documentação e todas as migrations/snapshots atuais. `docs/api/backend/openapi.json` é um catálogo separado de referência/propostas; para paths e schemas implementados, use `shared/api-spec/openapi.yaml`, inclusive para upload e leitura de mídia.

## 1. Produto

Seekalive reúne três módulos conectados por uma identidade única:

| Módulo | Objetivo                                             | Entidades centrais                                                      |
| ------ | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Social | Publicar, interagir, manter perfis e relacionamentos | Conta, publicação, artigo, mídia, comentário, repost, Círculo, conversa |
| Seek   | Descobrir comércios, profissionais e eventos         | A própria conta comercial, dados comerciais, cidade, avaliação, evento  |
| Shop   | Descobrir produtos, ofertas e serviços               | Item, vendedor comercial, catálogo e salvos                             |

**Regra estrutural:** uma conta é pessoal ou comercial. Uma conta comercial continua sendo uma conta Social; sua extensão comercial alimenta o Seek. Não criar um cadastro independente de estabelecimentos. Para o Shop real, a proposta é vincular cada vendedor a uma conta comercial existente — os vendedores fictícios atuais ainda não possuem esse vínculo consistente.

**Não pertencem ao produto:** Shuffle e Comunidades. **Círculo é apenas uma projeção de seguimento mútuo:** A segue B e B segue A, ambos os seguimentos efetivos/aceitos. Não existe convite, aceite, recusa ou tabela de Círculo separada. Desfazer qualquer um dos seguimentos desfaz automaticamente o Círculo.

**Identidade e navegação:** marca Seekalive; símbolo Elo; interface escura/laranja. Barra inferior preservada: menu lateral, Social, criação, Seek e Shop. A implementação do backend não autoriza redesenhar esses controles.

## 2. O que existe de verdade hoje

| Área                    | Situação auditada                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Servidor                | Express/TypeScript em `Aplicativo/back`; saúde, autenticação, onboarding, perfis e relações estão implementados                                                                                               |
| Banco                   | Em desenvolvimento, Feed e Mídias têm schemas e ledgers independentes; `feed.posts` e `media.assets` estão aplicados. Produção não foi consultada nem alterada                                                |
| Especificação           | `shared/api-spec/openapi.yaml` mantém o contrato público existente; `docs/api/backend/openapi.json` distingue endpoints ativos dos propostos                                                                  |
| Login                   | API própria com Argon2id, CSRF, e-mail confirmado e versão de política; contas legadas precisam validar ou atualizar a senha antes de receber sessão                                                          |
| Regra de senha          | 8–128 caracteres, ao menos uma maiúscula, uma minúscula, um número e um caractere especial; credenciais legadas são migradas no login sem tentar inferir o conteúdo do hash                                   |
| Cadastro                | Rota de cadastro/verificação implementada; o teste direto de envio Resend foi recebido em desenvolvimento. O fluxo completo ainda requer validação E2E; nenhuma conta sem confirmação recebe sessão           |
| Recuperação/verificação | Confirmação de e-mail, recuperação de senha esquecida e atualização autenticada de senha têm rotas no backend; a integração ponta a ponta no navegador/banco continua sendo validada em etapa própria         |
| Publicações/comentários | Publicação remota de texto/artigo e publicação com ativos de mídia; curtidas, comentários, reposts, referências e parte da experiência ainda permanecem locais ou não implementados                           |
| Fotos/vídeos            | Envio autenticado de arquivos para armazenamento local de desenvolvimento; metadados são persistidos em `media.assets` e IDs são associados a publicações em `feed.posts`. Não é armazenamento de produção    |
| Contas/avaliações       | Rotas e interface de avaliações de Profiles estão implementadas; a migration `profiles/0003` ainda não foi aplicada, então a persistência remota não está operacional. A prévia persiste somente no navegador |
| Perfil e relações       | API ativa para perfil básico, privacidade, seguir, pedidos privados, Círculo derivado e bloqueio; avaliações comerciais têm código pronto, mas aguardam a migration `profiles/0003`                           |
| Mensagens               | Ainda locais/demonstrativas; o backend não tem domínio de mensagens para aplicar ocultação/restauração durante bloqueio                                                                                       |
| Seek                    | Pesquisa e filtros locais; catálogo oficial de municípios incluído; GPS explícito, sem geocodificação reversa ou consulta por distância                                                                       |
| Dados demonstrativos    | Fixtures de Social, Seek, Search e Shop são limitados ao preview/desenvolvimento; o build de produção não deve exibir dados fictícios e usa estados vazios até conectar a API                                 |
| Shop                    | Catálogo ilustrativo, detalhes, referências e salvos. Sem carrinho, estoque, compra, pagamento, frete ou assinatura real                                                                                      |
| Configurações           | A API já persiste privacidade básica e bloqueios; preferências restantes e a interface ainda usam estado local. Bloquear remove seguimentos/pedidos nas duas direções e só quem iniciou desbloqueia           |

O frontend e a API têm processos separados. A autenticação está conectada à API; parte das telas de perfil e relações ainda não consome todos os endpoints. A aba de avaliações do perfil comercial já chama Profiles, mas sua persistência aguarda a migration `profiles/0003`. Antes de conectar outras telas, validar roteamento de mesma origem e manter a separação entre sessão real e demonstração de desenvolvimento.

## 3. Regras de negócio obrigatórias

### Identidade e autorização

- O servidor identifica o autor pela sessão, nunca pelo `authorId`, `senderId`, `reviewerId`, `sellerId` ou `organizerId` enviado pelo navegador.
- `username` único sem diferenciação de maiúsculas; preservar a regra atual de 3–20 caracteres `[a-z0-9_]`. Definir lista reservada, política de troca e redirecionamento de links antigos.
- `isFollowing`, `isInCircle`, `isBlocked`, `isBlockedByViewer`, `blocksViewer`, `isMuted`, `isLiked` e semelhantes são projeções da relação com o visitante, não atributos globais gravados no perfil. `isBlocked` combina o bloqueio iniciado pelo visitante e o iniciado pelo perfil alvo; ambos ficam sem acesso/interação. `isInCircle` é verdadeiro somente quando os dois seguimentos estão efetivos; não há `circleStatus`.
- Selos de verificação e papéis administrativos não são editáveis pela API de perfil.
- A verificação de e-mail deverá ser concluída pela API; um código digitado no frontend nunca basta para declarar a conta verificada.

### Conteúdo Social

- Uma publicação possui um autor; um artigo é uma publicação com `format=article`, não um blog ou identidade separados.
- Referenciar outro conteúdo não muda autoria nem duplica o original.
- Repost é uma relação entre conta e publicação pública; remover repost não remove o original.
- Texto curto: até 280 caracteres; título de artigo: 1–160; corpo: 1–50.000; comentário: 1–2.000; mensagem: 1–5.000. Conteúdo somente com espaços é inválido.
- Até 8 mídias por publicação. Formato de mídia exige pelo menos uma mídia; artigo exige título e corpo; uma referência isolada sem texto/mídia não constitui publicação válida.
- Mídias publicadas alimentam automaticamente a galeria do autor, pessoal ou comercial. A galeria deriva das publicações e mantém a audiência; não copiar o arquivo nem criar uma galeria pública paralela.
- Mídias legadas de perfil comercial exigem uma estratégia de importação explícita para a mesma origem de ativos/publicações, sem duplicação silenciosa.
- Resposta de comentário deve pertencer à mesma publicação do comentário pai. Curtidas, reposts e salvos são únicos por conta/recurso.
- Compartilhamento registra, no máximo, uma intenção de compartilhar. Não é prova de entrega por WhatsApp, rede externa ou destinatário.

### Privacidade proposta para o servidor

O frontend tem verificações parciais; esta é a política segura proposta, que exige adaptar telas e testes:

1. Conteúdo privado: apenas autor e eventual moderação autorizada/auditada.
2. Conteúdo para Círculos: autor e relação bilateral aceita; seguir alguém não equivale a entrar no Círculo.
3. Conteúdo público: visível conforme o estado da conta. Conta privada requer relação de seguimento aceita para conteúdo destinado ao perfil; bloqueio prevalece sobre relações anteriores.
4. Aplicar a mesma política a feed, busca, perfil, comentários, contadores, galeria, notificações, referências e download dos arquivos.
5. Recursos privados ou não existentes devem produzir resposta indistinguível para terceiros, normalmente `404`. Ações negadas em recurso que o usuário pode conhecer podem retornar `403`.
6. Silenciar é um filtro pessoal de distribuição. Bloquear é bilateral: remove os seguimentos e solicitações pendentes entre as contas; ambas deixam de ver perfis/conteúdo e iniciar interações. Mensagens antigas ficam ocultas e reaparecem após desbloquear. Publicações, comentários e avaliações não são apagados. Só quem iniciou o bloqueio pode removê-lo; seguimentos e solicitações não são restaurados automaticamente.

A descoberta do Seek exclui contas comerciais privadas, suspensas, removidas ou bloqueadas. A precisão de endereço de profissionais deve ser controlada: área de atendimento não deve publicar residência particular.

### Comércio, serviços e avaliações

- `business_profiles.account_id` é a mesma chave da conta comercial, com relação 1:1.
- Categoria, especialidades e áreas de atendimento são dados declarados pelo responsável. Não significam verificação profissional.
- Delivery, atendimento no local/mesa, retirada, reservas e agendamento são **capacidades declaradas**. Não são pedidos, entregas, mesas disponíveis ou horários reserváveis.
- Avaliação: nota inteira obrigatória de 1–5, comentário de 10–500 caracteres; uma avaliação por conta e negócio; o dono não avalia o próprio negócio.
- Resposta comercial: somente dono da conta comercial; comentário de resposta entre 3–500 caracteres. Serviço e schema validam esses limites; a migration `profiles/0003` ainda não foi aplicada ao banco de desenvolvimento.
- Serviço comercial: delivery, mesa, retirada, reserva e agendamento só aparecem publicamente quando marcados explicitamente como oferecidos (`true`). Não oferecido (`false`) e não informado (`null`/ausente) não podem aparecer como oferta.
- O dono pode responder, não apagar crítica de cliente pela API comercial. Remoções são do autor ou de moderação autorizada.
- Média e quantidade são calculadas das avaliações elegíveis. Ausência de avaliações não significa nota zero.

### Localização e eventos

- Preferência de cidade, endereço do negócio e posição física são conceitos separados.
- Município deve usar ID oficial do IBGE, não comparação livre de nome. Código é texto de 7 dígitos, não chave UUID.
- GPS exige ação explícita. Por padrão, não persistir coordenadas do dispositivo nem incluí-las em logs, analytics ou URL de consulta.
- Distância exige coordenadas verificadas do negócio, fonte geográfica e cálculo real. Distância em linha reta não é rota, tempo de viagem ou prazo de entrega.
- Não adicionar mapa visual por consequência da implementação geográfica.
- Evento real exige organizador comercial existente, cidade, data/hora com fuso, estado de publicação e dados próprios. Interesse não equivale a ingresso, inscrição paga ou reserva.
- Datas UTC/ISO no transporte e armazenamento; fuso IANA para apresentação e regras de calendário. Não interpretar rótulos como “sábado, 21 jun” como datas canônicas.

## 4. Entregas de backend e limites

**Núcleo a completar:** integração e validação autenticada do perfil comercial após a migration `profiles/0003`; descoberta remota do Seek como projeção derivada de Profiles; interações sociais ainda ausentes; mensagens, notificações, eventos, catálogo Shop, salvos, preferências e moderação.

**Extensões ainda sujeitas a decisão:** checkout/marketplace, estoque, pagamentos, assinaturas, frete, delivery operacional, agenda, reserva de mesas, ingressos, geocodificação e busca espacial. O pacote explica os requisitos, mas não transforma essas extensões em funcionalidades prontas.

**Direção implementada nesta etapa:** autenticação própria pela API, com PostgreSQL/Drizzle, sessão opaca em cookie seguro, CSRF, hash Argon2id e bloqueio de contas sem e-mail confirmado; perfis, configurações de privacidade e relações sociais essenciais também usam a API. Metadados de desenvolvimento confirmam as tabelas atuais desses domínios; não foi encontrada tabela de histórico que permita afirmar qual sequência de comandos criou cada objeto. O contrato OpenAPI separa rotas ativas das propostas. O envio direto pelo Resend foi testado e o e-mail de teste foi recebido; ainda falta validar o fluxo completo de cadastro/confirmação no navegador e a produção não está configurada. Sem configuração de envio, o servidor responde `503` e não cria conta. O schema completo dos demais domínios continua proposto e não foi aplicado à produção.

## 5. Links e versões

- Rotas da interface e URLs relativas da API estão em `frontend-integration.md` e `endpoints.md`.
- A análise e os bloqueios verificados no frontend estão em `frontend-readiness-audit.md`.
- Links oficiais das integrações estão em `external-services-and-operations.md`.
- URL pública definitiva do app/API: **não definida por esta auditoria**. Não inferir domínio de produção a partir do endereço de desenvolvimento.
- Base proposta de mesma origem: `/api/v1`; liveness: `/api/healthz`; readiness do banco: `/api/readyz`.
- O PostgreSQL gerenciado usa `drizzle-kit push` apenas no desenvolvimento pelo pós-merge; mudanças de produção seguem o fluxo oficial de publicação da Replit. O journal `0000`–`0005` não comprova aplicação física e não foi encontrada tabela de histórico por nome contendo `drizzle` ou `migration`. Não usar `push-force` nem DDL no startup.
- Não copiar dados pessoais, tokens ou segredos para este pacote. Exemplos de payload usam valores fictícios e não são credenciais.
