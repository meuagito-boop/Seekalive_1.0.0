# Seekalive — documentação do aplicativo e especificação do backend

**Atualizado:** 31/10/2026. **Natureza:** documentação técnica do backend em desenvolvimento; não representa produção.

> Estado de desenvolvimento: há rotas de autenticação, perfis, relações sociais, Feed, comentários e interações registradas no Express. Os arquivos de mídia usam armazenamento local de desenvolvimento, fora do Git e do deploy; isso não é armazenamento de produção. O inventário físico do banco não é fixado neste texto: consulte [a consulta de catálogo PostgreSQL](queries/development-database-catalog.sql) no banco de desenvolvimento. Nenhum dado de produção é descrito ou alterado por esta documentação.

## Como utilizar este pacote

1. Ler este documento e `architecture-and-security.md`: escopo atual, regras e decisões futuras.
2. Ler `analysis-of-reference-documents.md`: comparação dos PDFs com o produto atual e decisões que ainda precisam de aprovação.
3. Ler `frontend-readiness-audit.md`: resultado da revisão do estado atual e bloqueios antes da integração.
4. Consultar `frontend-integration.md`: cada página e cada armazenamento temporário que precisam de integração.
5. Usar `shared/api-spec/openapi.yaml` como fonte de verdade dos contratos HTTP. `endpoints.md` é gerado a partir das rotas Express montadas; `routes.generated.md` inclui método, caminho, segurança declarada, middleware CSRF/rate limit, schemas e respostas. O catálogo de planejamento não normativo fica em `docs/roadmap/seekalive-operation-catalog.*`.
6. Revisar `data-dictionary.md`, as migrations em `../../infra/database/migrations/` e `schema-core.sql`: distinguir o modelo Drizzle, o journal local, a presença física no banco e o modelo futuro. O `drizzle-kit check` valida somente os arquivos locais; não prova aplicação. **Não executar `push`, `migrate` ou DDL no banco principal sem apresentar antes o diff, impacto, recuperação e obter aprovação explícita para a alteração específica.**
7. Consultar `external-services-and-operations.md`: serviços, links oficiais, configuração, implantação e monitoramento.
8. Seguir `implementation-and-tests.md`: ordem de implementação, critérios de aceite e funcionalidades futuras.

O HTML autônomo e `Seekalive-backend-documentation.md` reúnem as fontes para consulta. Regenere-os depois de alterar os documentos-base. `shared/api-spec/openapi.yaml` é o contrato; o catálogo histórico em `docs/roadmap/` não deve ser usado para inferir rotas ativas. O estado físico do banco deve ser consultado pelo SQL de catálogo, não por contagens copiadas neste documento.

## 1. Produto

Seekalive reúne três módulos conectados por uma identidade única:

| Módulo | Objetivo                                             | Entidades centrais                                                      |
| ------ | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Social | Publicar, interagir, manter perfis e relacionamentos | Conta, publicação, artigo, mídia, comentário, repost, Círculo, conversa |
| Seek   | Descobrir comércios, profissionais e eventos         | Projeções de perfis comerciais, localização, categorias e eventos        |
| Shop   | Descobrir produtos, ofertas e serviços               | Item, vendedor comercial, catálogo e salvos                             |

**Regra estrutural:** uma conta é pessoal ou comercial. Uma conta comercial continua sendo uma conta Social; sua extensão comercial alimenta o Seek. Não criar um cadastro independente de estabelecimentos. Para o Shop real, a proposta é vincular cada vendedor a uma conta comercial existente — os vendedores fictícios atuais ainda não possuem esse vínculo consistente.

**Não pertencem ao produto:** Shuffle e Comunidades. **Círculo é apenas uma projeção de seguimento mútuo:** A segue B e B segue A, ambos os seguimentos efetivos/aceitos. Não existe convite, aceite, recusa ou tabela de Círculo separada. Desfazer qualquer um dos seguimentos desfaz automaticamente o Círculo.

**Identidade e navegação:** marca Seekalive; símbolo Elo; interface escura/laranja. Barra inferior preservada: menu lateral, Social, criação, Seek e Shop. A implementação do backend não autoriza redesenhar esses controles.

## 2. O que existe de verdade hoje

| Área                    | Situação auditada                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Servidor                | Express/TypeScript em `Aplicativo/back`; saúde, autenticação, onboarding, perfis e relações estão implementados                                                                                               |
| Banco                   | Somente desenvolvimento; consulte `queries/development-database-catalog.sql` para o estado físico atual. Este texto não fixa contagens nem descreve produção                                                |
| Especificação           | `shared/api-spec/openapi.yaml` é o contrato; `endpoints.md` e `routes.generated.md` são gerados das rotas montadas e do contrato                                                                  |
| Login                   | API própria com Argon2id, CSRF, e-mail confirmado e versão de política; contas legadas precisam validar ou atualizar a senha antes de receber sessão                                                          |
| Regra de senha          | 8–128 caracteres, ao menos uma maiúscula, uma minúscula, um número e um caractere especial; credenciais legadas são migradas no login sem tentar inferir o conteúdo do hash                                   |
| Cadastro                | Rota de cadastro/verificação implementada; o teste direto de envio Resend foi recebido em desenvolvimento. O fluxo completo ainda requer validação E2E; nenhuma conta sem confirmação recebe sessão           |
| Recuperação/verificação | Confirmação de e-mail, recuperação de senha esquecida e atualização autenticada de senha têm rotas no backend; a integração ponta a ponta no navegador/banco continua sendo validada em etapa própria         |
| Publicações/comentários | Feed, comentários, curtidas, reposts, salvos, remoção de posts/comentários e referências têm rotas registradas; `endpoints.md` lista as rotas montadas sem afirmar que cada fluxo foi exercitado                           |
| Fotos/vídeos            | Envio autenticado de arquivos para armazenamento local de desenvolvimento; metadados são persistidos em `media.assets` e IDs são associados a publicações em `feed.posts`. Não é armazenamento de produção    |
| Contas/avaliações       | As avaliações pertencem a Profiles, não ao Seek. Rotas de avaliação/reposta estão registradas; o estado físico atual deve ser conferido pela consulta de catálogo |
| Perfil e relações       | API com rotas de perfil, privacidade, seguir, pedidos privados, Círculo derivado e bloqueio; o inventário de rotas não substitui teste de autorização/persistência                           |
| Mensagens               | Ainda locais/demonstrativas; o backend não tem domínio de mensagens para aplicar ocultação/restauração durante bloqueio                                                                                       |
| Seek                    | Pesquisa e filtros locais; catálogo oficial de municípios incluído; GPS explícito, sem geocodificação reversa ou consulta por distância                                                                       |
| Dados demonstrativos    | Fixtures de Social, Seek, Search e Shop pertencem ao preview/desenvolvimento. Esta documentação não afirma estado ou comportamento de produção                                 |
| Shop                    | Catálogo ilustrativo, detalhes, referências e salvos. Sem carrinho, estoque, compra, pagamento, frete ou assinatura real                                                                                      |
| Configurações           | A API já persiste privacidade básica e bloqueios; preferências restantes e a interface ainda usam estado local. Bloquear remove seguimentos/pedidos nas duas direções e só quem iniciou desbloqueia           |

O frontend e a API têm processos separados. A documentação distingue rotas registradas, contrato e telas conectadas; nenhuma dessas informações, isoladamente, comprova um fluxo completo. Verifique a integração pelo teste específico de cada domínio. Todo o estado aqui descrito é de desenvolvimento.

## 3. Regras de negócio obrigatórias

### Identidade e autorização

- O servidor identifica o autor pela sessão, nunca pelo `authorId`, `senderId`, `reviewerId`, `sellerId` ou `organizerId` enviado pelo navegador.
- `username` único sem diferenciação de maiúsculas; 3–20 caracteres ASCII entre letras, números, hífen (`-`) e sublinhado (`_`), sem acentos. Nome de exibição e `@` são campos distintos; as trocas obedecem ao intervalo de 30 dias aprovado. Um `@` liberado permanece reservado por 30 dias.
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

### Privacidade e visibilidade no Social

Estas são as regras vigentes para os endpoints implementados:

1. Publicação com audiência `private`: titular e seguidores aprovados de um perfil privado.
2. Conteúdo para Círculos: titular e relação bilateral de seguimento efetiva; seguir alguém em uma única direção não basta.
3. Conteúdo público: visível conforme o estado da conta. Conta privada exige seguimento aprovado para o conteúdo destinado ao perfil; bloqueio prevalece sobre relações anteriores.
4. Cada rota que expõe conteúdo deve aplicar a mesma regra de audiência e bloqueio antes de retornar publicação, comentário, referência ou mídia.
5. Recursos privados ou não existentes devem produzir resposta indistinguível para terceiros, normalmente `404`. Ações negadas em recurso que o usuário pode conhecer podem retornar `403`.
6. Silenciar é um filtro pessoal de distribuição. Bloquear é bilateral: remove os seguimentos e solicitações pendentes entre as contas; ambas deixam de ver perfis/conteúdo e iniciar interações. Mensagens antigas ficam ocultas e reaparecem após desbloquear. Publicações, comentários e avaliações não são apagados. Só quem iniciou o bloqueio pode removê-lo; seguimentos e solicitações não são restaurados automaticamente.

A descoberta do Seek consome perfis comerciais públicos do Social e exclui contas privadas, suspensas, removidas ou bloqueadas. Avaliações e campos de apresentação pertencem a Profiles; Seek apenas os consome como dados de descoberta.

### Comércio, serviços e avaliações

- `business_profiles.account_id` é a mesma chave da conta comercial, com relação 1:1.
- Categoria e especialidades são dados declarados pelo responsável. Não significam verificação profissional. Para localização pública, exibir somente o endereço principal definido para o perfil.
- Delivery, atendimento no local/mesa, retirada, reservas e agendamento são **capacidades declaradas**. Não são pedidos, entregas, mesas disponíveis ou horários reserváveis.
- Avaliação: nota inteira obrigatória de 1–5, comentário de 10–500 caracteres; uma avaliação por conta e negócio; o dono não avalia o próprio negócio.
- Resposta comercial: somente dono da conta comercial; comentário de resposta entre 3–500 caracteres. O estado físico atual deve ser confirmado pela consulta de catálogo de desenvolvimento.
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

**Núcleo Social registrado no backend:** Feed, leitura/paginação, comentários, curtidas, reposts, salvos, referências e remoções têm rotas montadas. O teste de paridade comprova registro e contrato, não execução completa de cada fluxo nem estado físico do banco.

**Fases ainda não concluídas:** integração autenticada de todas as telas; projeção remota do Seek a partir de Profiles; mensagens, notificações, eventos, catálogo Shop, preferências e moderação. A presença de um endpoint no inventário não declara essas fases concluídas.

**Extensões ainda sujeitas a decisão:** checkout/marketplace, estoque, pagamentos, assinaturas, frete, delivery operacional, agenda, reserva de mesas, ingressos, geocodificação e busca espacial. O pacote explica os requisitos, mas não transforma essas extensões em funcionalidades prontas.

**Limite desta documentação:** descreve somente o ambiente de desenvolvimento. O envio direto pelo Resend foi testado e o e-mail de teste foi recebido; isso não comprova o fluxo E2E de cadastro/confirmação. O estado do banco deve ser obtido pela consulta de catálogo indicada no início, não por afirmações estáticas. Nenhuma conclusão sobre produção é feita aqui.

## 5. Links e versões

- Rotas da interface estão em `frontend-integration.md`; métodos e caminhos registrados estão em `endpoints.md` e `routes.generated.md`.
- A análise e os bloqueios verificados no frontend estão em `frontend-readiness-audit.md`.
- Links oficiais das integrações estão em `external-services-and-operations.md`.
- URL pública definitiva do app/API: **não definida por esta auditoria**. Não inferir domínio de produção a partir do endereço de desenvolvimento.
- Base proposta de mesma origem: `/api/v1`; liveness: `/api/healthz`; readiness do banco: `/api/readyz`.
- O PostgreSQL gerenciado usa `drizzle-kit push` apenas no desenvolvimento pelo pós-merge; mudanças de produção seguem o fluxo oficial de publicação da Replit. O journal `0000`–`0005` não comprova aplicação física e não foi encontrada tabela de histórico por nome contendo `drizzle` ou `migration`. Não usar `push-force` nem DDL no startup.
- Não copiar dados pessoais, tokens ou segredos para este pacote. Exemplos de payload usam valores fictícios e não são credenciais.
