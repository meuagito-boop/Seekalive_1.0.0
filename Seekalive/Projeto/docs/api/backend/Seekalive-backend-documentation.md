# Seekalive — documentação do backend

Edição consolidada das fontes Markdown listadas abaixo. Regenere este arquivo com `node docs/api/backend/render-docs.mjs` depois de atualizar as fontes.

## Índice
- [Visão geral](#secao-1) — `README.md`
- [Análise dos documentos de referência](#secao-2) — `analysis-of-reference-documents.md`
- [Auditoria de prontidão do frontend](#secao-3) — `frontend-readiness-audit.md`
- [Arquitetura e segurança](#secao-4) — `architecture-and-security.md`
- [Integração do frontend](#secao-5) — `frontend-integration.md`
- [Endpoints](#secao-6) — `endpoints.md`
- [Auditoria das rotas do Feed](#secao-7) — `feed-route-validation.md`
- [Rotas montadas](#secao-8) — `routes.generated.md`
- [Dicionário de dados](#secao-9) — `data-dictionary.md`
- [Catálogo físico do banco de desenvolvimento — 31/10/2026](#secao-10) — `development-database-catalog-2026-10-31.md`
- [Serviços externos e operação](#secao-11) — `external-services-and-operations.md`
- [Implementação e testes](#secao-12) — `implementation-and-tests.md`

---

<a id="secao-1"></a>
## 1. Visão geral

Fonte: [`README.md`](README.md).

**Atualizado:** 31/10/2026. **Natureza:** documentação técnica do backend em desenvolvimento; não representa produção.

> Estado de desenvolvimento: há rotas de autenticação, perfis, relações sociais, Feed, comentários e interações registradas no Express. Os arquivos de mídia usam armazenamento local de desenvolvimento, fora do Git e do deploy; isso não é armazenamento de produção. O inventário físico do banco não é fixado neste texto: consulte [a consulta de catálogo PostgreSQL](queries/development-database-catalog.sql) no banco de desenvolvimento. Nenhum dado de produção é descrito ou alterado por esta documentação.

## Como utilizar este pacote

1. Ler este documento e `architecture-and-security.md`: escopo atual, regras e decisões futuras.
2. Ler `analysis-of-reference-documents.md`: comparação dos PDFs com o produto atual e decisões que ainda precisam de aprovação.
3. Ler `frontend-readiness-audit.md`: resultado da revisão do estado atual e bloqueios antes da integração.
4. Consultar `frontend-integration.md`: cada página e cada armazenamento temporário que precisam de integração.
5. Usar `shared/api-spec/openapi.yaml` como fonte de verdade dos contratos HTTP. `endpoints.md` é gerado a partir das rotas Express montadas; `routes.generated.md` inclui método, caminho, segurança declarada, middleware CSRF/rate limit, schemas e respostas. O catálogo de planejamento não normativo fica em `docs/roadmap/seekalive-operation-catalog.*`.
6. Revisar `data-dictionary.md`, as migrations em `../../infra/database/migrations/` e `schema-core.sql`: distinguir o modelo Drizzle, o journal local, a presença física no banco e o modelo futuro. O `drizzle-kit check` valida somente os arquivos locais; não prova aplicação. O último retrato físico datado está em `development-database-catalog-2026-10-31.md`; a consulta reutilizável permanece em `queries/development-database-catalog.sql`. **Não executar `push`, `migrate` ou DDL no banco principal sem apresentar antes o diff, impacto, recuperação e obter aprovação explícita para a alteração específica.**
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
| Contas/avaliações       | As avaliações pertencem a Profiles, não ao Seek. A migration `profiles/0003` foi aplicada em desenvolvimento e o catálogo de 31/10/2026 confirma a tabela; consulte a query para confirmar alterações posteriores. As rotas ainda exigem validação funcional autenticada própria |
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
- A validação individual das 11 operações do Feed, com o que foi e não foi exercitado, está em `feed-route-validation.md`.
- A análise e os bloqueios verificados no frontend estão em `frontend-readiness-audit.md`.
- Links oficiais das integrações estão em `external-services-and-operations.md`.
- URL pública definitiva do app/API: **não definida por esta auditoria**. Não inferir domínio de produção a partir do endereço de desenvolvimento.
- Base proposta de mesma origem: `/api/v1`; liveness: `/api/healthz`; readiness do banco: `/api/readyz`.
- A configuração de pós-merge pode executar `drizzle-kit push` apenas no desenvolvimento; isso não prova o estado físico atual do banco. Consulte `queries/development-database-catalog.sql` para confirmar catálogo e migrations. Não usar `push-force` nem DDL no startup.
- Não copiar dados pessoais, tokens ou segredos para este pacote. Exemplos de payload usam valores fictícios e não são credenciais.

---

<a id="secao-2"></a>
## 2. Análise dos documentos de referência

Fonte: [`analysis-of-reference-documents.md`](analysis-of-reference-documents.md).

**Documentos analisados**

- `SeekAlive_Escopo_Funcional_MVP_v1.1_1792701858945.pdf` — Escopo Funcional do MVP, versão 1.1, datado de 18/10/2026.
- `SeekAlive_Stack_Tecnologica_Arquitetura_v1_1_1792701858974.pdf` — Stack Tecnológica e Arquitetura, versão 1.1, datado de 18/10/2026.

**Status desta análise:** comparativa e não normativa. Não substitui o escopo existente, não aprova mudanças de produto e não altera código, endpoints ou banco.

## Conclusão

**Sim, há conteúdo útil para agregar.** Os documentos reforçam princípios de arquitetura, segurança, operação e critérios de aceite que devem orientar a futura implementação. A documentação backend atual já cobre boa parte desses princípios: autorização no servidor, sessões, proteção contra CSRF/IDOR, validação de uploads, processamento assíncrono, auditoria, retenção e contratos de API.

O PDF funcional também contém requisitos concretos de produto, mas alguns contradizem o aplicativo e as decisões registradas. O próprio documento separa regras obrigatórias de parâmetros “propostos” e “sujeitos à validação”; sua seção de aprovação ainda está sem responsáveis, data ou confirmação. Portanto, os pontos conflitantes abaixo precisam de validação do produto antes de substituir regras atuais ou mudar telas, contratos e SQL.

## O que os documentos acrescentam

### Princípios arquiteturais

O documento técnico recomenda um **monólito modular**, com limites claros entre apresentação, casos de uso, regras de domínio, persistência, integrações e tarefas em segundo plano. Recomenda evitar microserviços e camadas artificiais até existir uma necessidade concreta. Isso é compatível com a orientação atual de manter a API em Express/TypeScript e separar rotas, políticas, serviços, repositórios e DTOs.

Também vale reforçar na revisão de cada módulo:

- requisito e regra de negócio documentados antes da implementação;
- testes de domínio, integração e fluxo completo da interface;
- falhas, permissões e exclusões cobertas nos critérios de aceite;
- alterações de contrato e decisões arquiteturais registradas;
- métricas e evidências para afirmar desempenho, disponibilidade ou conclusão.

### Segurança, moderação e operação

São diretrizes úteis para manter como requisitos de engenharia:

- autorização no servidor em cada objeto e operação, não apenas ocultação na interface;
- proteção dos arquivos enviados, validação real do conteúdo, remoção de metadados sensíveis e ciclo de vida de uploads;
- papéis administrativos separados, auditoria de ações sensíveis e revisão de decisões de moderação;
- backups acompanhados de testes de restauração, observabilidade e tratamento explícito de tarefas que falham;
- privacidade, retenção e exclusão documentadas antes de operar dados reais.

Boa parte já consta em `architecture-and-security.md`, `data-dictionary.md` e `external-services-and-operations.md`. A contribuição mais importante é usar esses princípios como **critérios verificáveis de aceite**, e não apenas como arquitetura futura.

### Requisitos operacionais que devem continuar como metas propostas

O PDF propõe WCAG 2.2 AA, pesquisa/feed em até 2 segundos no percentil 95, disponibilidade mensal de 99,5%, backup diário e prazos de moderação. São referências úteis para planejar testes e capacidade, mas não devem virar promessas ou metas de produção sem:

1. aprovação do responsável pelo produto/operação;
2. condições de medição definidas (rede, dispositivo, volume, região e exclusões);
3. infraestrutura, alertas, equipe e orçamento capazes de sustentá-las.

## Conflitos e decisões que precisam de confirmação

| Tema | PDF funcional | Estado atual do produto/documentação | Tratamento recomendado |
|---|---|---|---|
| Escopo do Shop | Shop transacional e até o catálogo de compra ficam fora do MVP | O app e a documentação incluem um Shop demonstrativo navegável, sem checkout | Confirmar se o Shop somente para descoberta continua na primeira entrega ou se deve ficar fora dela. Não adicionar compra, pagamento ou pedidos |
| Perfis privados | O MVP declara que não haverá contas privadas nem aprovação para seguir | O frontend possui privacidade, audiência para Círculo e bloqueio; a especificação atual prevê solicitações de seguimento | Definir se perfis e posts serão sempre públicos. Círculo continua sendo uma regra separada de seguimento mútuo; não criar pedidos de Círculo |
| Idade mínima | O PDF propõe acesso exclusivo para maiores de 18 anos e validação jurídica da forma de verificação | Regra adotada pelo Seekalive: 18+ autodeclarado, validado pela API no cadastro e mantido privado no servidor; não há verificação documental independente nesta versão | Revisão jurídica e antifraude continuam pendentes antes do lançamento público |
| Depoimentos | Nova aba de depoimentos em perfis pessoais; publicação somente com seguimento mútuo, moderada pelo destinatário | Não há esse fluxo no frontend nem no contrato atual | Tratar como funcionalidade adicional; decidir se entra no MVP, regras de denúncia e limites antes de criar tela/API |
| Texto e comentários | Publicação e comentário com limite inicial de 240 caracteres | O frontend aceita até 280 para texto e até 2.000 para comentário | Aprovar limites únicos e então alinhar interface, validação, OpenAPI e banco |
| Mídias em publicações | Até quatro imagens ou um vídeo, duração proposta de 60 segundos | O frontend e a especificação atual permitem até oito mídias; tamanho máximo de vídeo é 100 MB, sem limite de duração confirmado | Validar a combinação permitida e a duração. Preservar os limites de tamanho somente após teste de custo, processamento e segurança |
| Avaliações | Até 1.000 caracteres e três fotos; resposta comercial de até 1.000 | A interface/contrato atual limita comentário a 500 caracteres e resposta a 500; fotos na avaliação ainda não estão consolidadas | Decidir limite e se fotos entram no fluxo. Depois atualizar formulário, permissões, esquema e testes em conjunto |
| Conta comercial e endereço | Endereço fixo de referência obrigatório, inclusive para autônomos; CNPJ não obrigatório | O modelo atual diferencia dados de negócio e cidade, mas a privacidade do endereço residencial precisa ser protegida | Manter a dispensa de CNPJ. Definir endereço público, área aproximada e tratamento de profissionais que atendem no endereço do cliente |
| Categorias e serviços | Até três categorias, cinco subcategorias por categoria e até 15 serviços; listas administradas | O frontend tem opções locais; limites e gestão administrativa não estão implementados | Aprovar taxonomia e limites antes de torná-los restrições de banco ou API |
| Horários | Múltiplos intervalos por dia, virada de meia-noite, exceções por data/feriados e fuso horário do negócio | O tipo atual suporta um intervalo por dia e não modela exceções de calendário | Agregar como requisito somente se o escopo for aprovado; é necessário revisar formulário, tipos, cálculo “aberto agora” e filtros |
| Busca local | Raio inicial de 5 km, opções de 1/3/5/10 km, ordenação e popularidade por sinais mensuráveis | A busca atual é local e por cidade; raio/distância real não está ligado | Adotar primeiro localização/cidade e resultados verdadeiros. Tratar raio, coordenadas e popularidade como propostas que dependem de geocodificação, consentimento e dados confiáveis |
| Mensagens | Somente texto; regras para solicitações de conversas, recusa silenciosa e início por conta comercial | A UI atual não conclui o início de uma nova conversa nem tem inbox de solicitações; mídia de mensagem está desabilitada | Decidir se esses fluxos são obrigatórios no MVP e detalhar autorização antes de criar endpoints |
| Eventos | Criados por conta comercial, com estados, cancelamento, sem recorrência ou venda de ingresso | A documentação já vincula eventos a uma conta comercial existente; regras de cancelamento/notificações podem ser detalhadas | Preservar evento informativo. Não adicionar ingresso, recorrência ou pagamento ao MVP sem aprovação |

## Avaliação da stack recomendada

O PDF técnico lista React/Vite, TanStack Query, Zustand, NestJS, CockroachDB, Prisma, Valkey, RabbitMQ, Cloudflare R2, OIDC e Argon2id. Ele também declara que são **recomendações**, não imposições, e exige justificativa para substituições.

O repositório atual já usa React/TypeScript/Vite no frontend e tem esqueleto Express/TypeScript, driver PostgreSQL e Drizzle. O schema Drizzle está vazio e a API de produto não está implementada. Por isso:

- **não migrar agora** Express para NestJS, PostgreSQL/Drizzle para CockroachDB/Prisma, ou React Context para Zustand apenas para coincidir com a lista;
- manter como princípio a arquitetura modular e a separação das responsabilidades;
- comparar tecnologias somente diante de uma necessidade concreta, considerando suporte no ambiente atual, geografia, transações, operação, custo, backup, migração e manutenção;
- filas, cache e workers devem entrar quando os requisitos e medições justificarem, não apenas por estarem na arquitetura recomendada;
- escolher autenticação e armazenamento de mídia separadamente, com revisão de segurança e integração, antes de conectar telas.

## Próxima revisão recomendada

Antes de atualizar o contrato funcional principal, confirmar:

1. se o PDF funcional está aprovado como fonte oficial, apesar dos campos de aprovação em branco;
2. escopo do Shop e regra de privacidade dos perfis;
3. idade mínima, depoimentos e limites de texto/mídia/avaliação;
4. campos comerciais públicos, taxonomia e complexidade dos horários;
5. regras de mensagens, eventos, localização e metas operacionais.

Depois dessas decisões, atualizar em uma única revisão coerente a documentação do produto, frontend, OpenAPI, dicionário de dados, SQL proposto e testes. **Até lá, este relatório não muda os contratos existentes e nenhuma tecnologia ou funcionalidade deve ser migrada automaticamente a partir dos PDFs.**

---

<a id="secao-3"></a>
## 3. Auditoria de prontidão do frontend

Fonte: [`frontend-readiness-audit.md`](frontend-readiness-audit.md).

**Auditoria-base:** 22/10/2026; última atualização de estado: 31/10/2026
**Escopo:** prontidão do frontend para integração gradual. A auditoria original foi análise/documentação; desde então, autenticação, onboarding, perfil básico, privacidade e relações sociais essenciais receberam API e schema no desenvolvimento.

> Os achados detalhados abaixo preservam o corte da auditoria-base de 22–23/10, incluindo estados que já foram alterados depois. Para o estado mais recente de avaliações, consulte `implementation-and-tests.md` e `auditoria/plano-de-acao-tecnico.md`.

## Parecer

**Escopo desta auditoria:** ambiente de desenvolvimento. Login/sessão/onboarding consultam a API. Configurações > Conta diferencia conta pessoal e comercial e lê/salva por `/v1/accounts/me` em sessão real; Privacidade e Segurança também usam APIs no fluxo autenticado. A tela Segurança lista e revoga instalações confiáveis por token de navegador/app. O envio Resend foi testado, mas a jornada completa ainda precisa de E2E. O perfil comercial consome operações de avaliações de Profiles. O estado físico do banco deve ser confirmado pela query de catálogo. Seek discovery remoto e os domínios de mensagens/notificações continuam sem implementação completa; fixtures pertencem ao desenvolvimento.

O backend foi iniciado. O próximo trabalho de frontend é consumir somente os endpoints ativos e manter a demonstração de desenvolvimento separada da conta real; não conectar telas a contratos que ainda estejam marcados como propostos.

## Como a análise foi feita

- Inventário das rotas e dos módulos de produto em `Aplicativo/front/src` (159 arquivos de origem, sendo 158 TypeScript/TSX), incluindo pontos de entrada, contextos, serviços, persistência local, telas de conta, perfis, Social, Seek, Shop e configurações.
- Leitura focalizada das regras de negócio e fluxos de maior risco; busca estática por chamadas de rede, armazenamento, fixtures, controles desabilitados e contratos.
- Conferência da API em `Aplicativo/back`, dos contratos OpenAPI/SQL propostos e dos testes disponíveis.
- A leitura não inclui dependências, bundles, arquivos gerados ou primitivas genéricas de UI como uma auditoria de segurança de cada byte. O resultado é uma revisão funcional/de integração do código próprio, não uma certificação de segurança ou revisão de produção.

## Resultado por área

| Área                           | Estado atual                                                                                                                                                                                                                                                                                                                                                                                                          | Prontidão                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Rotas e navegação              | Páginas para cadastro, login, onboarding, Social, perfis, Seek, Shop e configurações; guard do cliente complementa a autorização independente da API                                                                                                                                                                                                                                                                  | Parcial                                                                                                      |
| Identidade e sessão            | Login, cadastro, sessão, CSRF, confirmação de e-mail, onboarding, recuperação, troca de senha, sessões e instalações confiáveis chamam a API                                                                                                                                                                                                                                                                          | Falta E2E no navegador; consulte a query de catálogo para o estado físico atual                                    |
| Contas e perfis                | Configurações > Conta usa `/v1/accounts/me` em sessões reais, com campos pessoais/comerciais separados; idade é coletada no cadastro, permanece somente no servidor para a regra de 18+ e nunca é retornada após a criação; e-mail é somente para o titular. Perfis remotos já carregam publicações/artigos pela API; a inspeção visual autenticada não foi executada                                                 | Parcial; falta E2E visual e continuam fora os campos comerciais ainda não suportados pelo contrato           |
| Publicações e comentários      | A prévia permanece local. Em sessão remota, o Feed global consome a API nas abas Para você, Seguindo, Artigos e Vídeos, e perfis carregam publicações/artigos paginados; curtir, comentar/responder, repostar e salvar usam a API. Estados de carregamento/erro/vazio, paginação sem duplicação e ações assíncronas da aba Vídeos têm testes. A jornada autenticada ainda não foi verificada visualmente no navegador | Parcial                                                                                                      |
| Fotos e vídeos                 | Upload autenticado, IDs de mídia e associação às publicações funcionam no desenvolvimento com arquivos locais; isso não fornece armazenamento permanente de produção                                                                                                                                                                                                                                                  | Desenvolvimento funcional; produção não pronta                                                               |
| Galeria                        | Fotos/vídeos de publicações alimentam a galeria. O perfil comercial também combina fotos/vídeos independentes do objeto comercial; precisa de uma regra única sem duplicar arquivos nem contornar audiência                                                                                                                                                                                                           | Parcial                                                                                                      |
| Relacionamentos e Círculo      | API persiste seguimentos, pedidos privados e Círculo derivado; sessões remotas usam a API para visualizar e alterar relações                                                                                                                                                                                                                                                                                          | Integrado em sessão remota; falta E2E visual                                                                 |
| Privacidade e bloqueio         | A tela Privacidade e ações de bloqueio usam a API em sessões remotas. O servidor remove follows/pedidos em transação, permite desbloqueio só pelo iniciador e aplica visibilidade a posts/mídias                                                                                                                                                                                                                      | Integrado para perfis, posts e mídias; Mensagens ainda não tem API                                           |
| Mensagens e notificações       | Conteúdo local/demonstrativo; leituras e preferências ficam separadas por conta neste navegador. Não há API, entrega ou sincronização entre aparelhos                                                                                                                                                                                                                                                                 | Bloqueador                                                                                                   |
| Seek                           | Descoberta por localização/categoria de perfis comerciais originados no Social; cidade baseada no catálogo IBGE; filtros e salvos separados por conta no navegador. Não há API real de descoberta no servidor                                                                                                                                                                                                         | Parcial                                                                                                      |
| Avaliações do perfil comercial | Interface, contrato e rotas de Profiles implementados em código. O estado de persistência física deve ser verificado pela query de catálogo; a jornada autenticada ainda requer E2E                                                                                                                                                                                                          | Implementado em código; estado físico não presumido                                                         |
| Shop                           | Catálogo ilustrativo e itens salvos separados por conta no navegador; checkout é explicitamente indisponível                                                                                                                                                                                                                                                                                                          | Parcial por escopo                                                                                           |
| Configurações                  | Conta, privacidade e segurança usam a API em sessão real; notificações e aparência ainda ficam no navegador; ações sensíveis adicionais aguardam implementação                                                                                                                                                                                                                                                        | Parcial                                                                                                      |

## Bloqueios e falhas concretas

### Autenticação e identidade — núcleo implementado; E2E visual pendente

- O cadastro pessoal/comercial, a confirmação de e-mail e o login passam pela API; a API cria uma identidade Social única e, para conta comercial, sua extensão no mesmo fluxo. A senha não é persistida no navegador.
- O login envia usuário ou e-mail e senha à API; conta sem e-mail confirmado não recebe sessão nem acessa recursos protegidos.
- `ForgotPassword.tsx` solicita e confirma a redefinição pela API. A suíte isolada valida os casos principais; o fluxo visual completo e o recebimento de e-mail na tela ainda exigem E2E separado.
- `SettingsSecurity.tsx` consulta sessões e instalações próprias e permite revogação individual ou em lote. A sessão/instalação atual fica marcada; a interface não inventa modelo, navegador ou localização. O token reconhece uma instalação do navegador/app, não prova identidade do aparelho físico. MFA geral e histórico detalhado continuam indisponíveis.
- O estado local de demonstração não equivale a sessão autenticada; a autorização real continua no servidor e na sessão da API.

**Atualização de autenticação em 25/10:** cadastro, login, verificação de e-mail, onboarding, configurações de conta/privacidade/segurança usam a API. A política exige Argon2id e senha de 8–128 caracteres com uma maiúscula, uma minúscula, um número e um caractere especial. A existência física das tabelas necessárias foi reconfirmada por metadados em 29/10/2026; esta consulta não leu registros e não declara que o banco esteja vazio.

**Regras confirmadas:** conta sem e-mail verificado não pode entrar nem acessar recursos. O registro mantém a conta pendente e sem sessão. Na confirmação, uma conta legada com política de senha antiga é ativada sem sessão e segue para login; senha legada compatível é promovida após validação, e senha incompatível exige atualização com a senha atual.

**Atenção restante:** a recuperação de senha e a revogação de sessões estão implementadas; a entrega assíncrona ainda não tem outbox durável nem tentativa persistente. Reconhecimento de dispositivo usa token revogável por instalação, não IP nem fingerprint. O estado físico atual deve ser consultado com a query de catálogo; este relatório trata exclusivamente do desenvolvimento.

O login aceita senhas antigas de 8–128 caracteres para poder verificá-las; a regra de composição é aplicada a novas senhas e a atualizações obrigatórias. O campo de senha permanece apenas em memória durante o fluxo e não é salvo em `localStorage`.

### Integração gradual — conteúdo e relações ainda incompletos

- `Aplicativo/back/src` implementa saúde, autenticação (incluindo recuperação de senha e gestão de sessões), onboarding, perfil básico, privacidade, relações, Feed global/perfil, interações sociais, upload de mídia e avaliações do perfil comercial. A descoberta Seek ainda não consome a API de descoberta; Shop, mensagens e notificações também não estão integralmente conectados.
- Em sessões remotas, Feed, linha do tempo do perfil, busca de publicações/hashtags e avaliações do perfil comercial usam endpoints próprios; a prévia demonstrativa continua local e não é fallback após erro de rede. A nota agregada de avaliações ainda não foi conectada à projeção de resultados do Seek. A integração visual autenticada não foi verificada ponta a ponta.
- O catálogo público do IBGE é uma integração externa de dados; cadastro, autenticação e configurações usam a API Seekalive.
- O fluxo da API usa processos/servidores separados; a configuração de same-origin/proxy e CORS precisa ser conferida antes de conectar novos módulos. A API ativa exige sessão verificada e CSRF para escrita.

### Busca remota de publicações e hashtags — validada em 31/10/2026

- A tela Social > Busca consulta `GET /api/v1/social/feed?q=...` em sessão remota. O endpoint mantém paginação com cursor vinculado à consulta e aplica as mesmas regras de perfil privado, Círculo, bloqueio e audiência do Feed; a busca não amplia acesso ao conteúdo.
- A consulta por hashtag usa prefixo normalizado sem diferenciar acentos ou caixa: `café` encontra `#cafeteira`. Texto comum, legenda e conteúdo de artigo também participam da busca. Resultados de tags derivam de publicações existentes; tendências de demonstração permanecem somente no modo de desenvolvimento.
- Publicações comuns e artigos aceitam até dez hashtags distintas, contando legenda, título e corpo do artigo em conjunto. Duplicatas que diferem apenas em caixa/acentos contam como uma só. A API rejeita o excesso antes da persistência; as hashtags retornam na leitura e a projeção normalizada pertence ao schema `feed`.
- As migrations `feed/0002` e `feed/0003_post_references` criaram `feed.post_tags` e `feed.post_references` e foram aplicadas exclusivamente ao banco de desenvolvimento. A existência da tabela nova foi confirmada por consulta somente de leitura. Nenhuma migration, dado ou serviço de produção foi consultado ou alterado.
- A busca foi validada em teste HTTP com schema temporário: `café` encontrou `#cafeteira`, 11 hashtags foram rejeitadas, o schema foi removido e `public` permaneceu inalterado. Typecheck, suíte completa, build, codegen e verificações dos tracks de migration passaram. O teste de navegador autenticado não foi feito porque o navegador de captura não possui sessão.

**Antes de integrar novos módulos remotos:** reutilizar o cliente, roteamento e tratamento de erros/paginação já adotados; reavaliar CORS somente se a implantação futura separar as origens. Manter a prévia demonstrativa isolada: falha de rede nunca deve acionar fallback silencioso para fixtures.

### Resolvido — Fixtures de exemplo aparecem somente no desenvolvimento

- Posts, usuários seed, notificações, conversas, mensagens, avaliações, tendências e tópicos ficam restritos ao modo de desenvolvimento. A tela inicial pode manter o perfil fictício apenas dentro de uma imagem estática ilustrativa, sem registro ou interação.
- A página Social, o Shop, as referências a produtos/eventos e os painéis laterais não exibem esses fixtures no build de produção. Sem API conectada, mostram estados vazios em vez de registros inventados. O único exemplo permitido fora do dev é uma imagem estática de apresentação.
- Os mocks continuam disponíveis no preview de desenvolvimento para revisão visual. O conteúdo escrito pelo usuário no navegador continua local e não passa a ser dado compartilhado/real.

**Frontend concluído para esta regra:** fixtures do produto só aparecem no desenvolvimento; produção não usa sementes fictícias. Antes de publicar com dados reais, conectar os estados vazios aos endpoints e testar o build de produção.

### Estado relativo ao usuário — isolamento local concluído; integração com backend pendente

- Curtidas, curtidas em comentários, repostagens, publicações salvas e leituras de notificações/mensagens agora ficam registradas por ID da conta no navegador. Contagens compartilhadas são derivadas das ações locais de cada conta.
- Notificações com destinatário só aparecem para essa conta; notificações de demonstração sem destinatário aparecem apenas na conta demo. A leitura automática após três segundos continua sendo uma regra de interface, mas agora é gravada para a conta ativa.
- Preferências de notificação/aparência, filtros e cidade recente do Seek, estabelecimentos/eventos salvos e itens salvos do Shop usam escopo por conta. As preferências de privacidade e interesses já eram associadas à conta.
- Bloqueios agora são relações locais da conta ativa para um perfil alvo; os filtros do app ocultam perfis e interações nos dois sentidos. Bloquear remove seguimentos e solicitações entre as contas; mensagens antigas ficam ocultas e voltam após desbloquear. Publicações, comentários e avaliações não são apagados. Só quem iniciou pode desbloquear; relações removidas não são restauradas automaticamente.
- Relações, solicitações, publicações, comentários e avaliações continuam como conteúdo compartilhado local e identificado por autor/destinatário; não são preferências do visitante. Isso não substitui autorização no servidor.
- Chaves globais antigas não são apagadas nem migradas automaticamente: não há como saber a qual conta os valores compartilhados pertenciam. Os novos escopos começam vazios, preservando os valores legados no navegador.
- Em `onboarding/Suggestions.tsx`, cada toque em “Seguir” aplica a relação imediatamente: contas públicas são atualizadas no armazenamento local da conta ativa; perfis privados criam uma solicitação pendente, também local. “Concluir e entrar” e “Pular por agora” apenas navegam; não há lote de escolhas a salvar nessa etapa. Não exige API nesta fase.
- Corrigido: alterar o nome de usuário em `settings/Account.tsx` agora atualiza o `AppContext` e o `SocialContext`, mantendo a conta persistida e o perfil/busca alinhados.

**Antes de integrar outras áreas:** os endpoints de perfil e relações já associam cada ação à sessão e devolvem projeções do visitante. O estado local do frontend continua sendo demonstração, não autorização nem proteção contra alteração do `localStorage`.

### P1 — Privacidade e segurança só existem parcialmente no frontend

- `canReadPost` e filtros de tela são úteis para UX, mas não protegem dados. Feed, busca, perfil, comentário, notificações, mensagens, referência e arquivo precisam da mesma autorização no servidor.
- Em perfil público, seguir é imediato. Em perfil privado, a API cria solicitação pendente; somente o dono pode aceitar ou recusar. Pedido pendente não conta como seguidor e não libera conteúdo.
- Após a aprovação, o seguidor vê publicações com audiência `public` e `private` do perfil privado. Publicações destinadas ao Círculo continuam exigindo seguimento aceito nos dois sentidos. A regra de Círculo permanece derivada: A segue B e B segue A; a remoção de qualquer seguimento encerra o Círculo.
- A API de bloqueio remove seguimentos e pedidos nos dois sentidos em transação, oculta a conta e permite desbloqueio apenas pelo iniciador. Ao desbloquear, os vínculos não voltam automaticamente. As telas em sessão remota consomem esses endpoints; a validação E2E autenticada permanece pendente.
- Mensagens antigas ainda não têm API; portanto, ocultação/restauração durante bloqueio permanece pendente para o futuro domínio de mensagens. A API já persiste preferência de mensagens e confirmações de leitura, mas a tela ainda não a consome.

**Regra de backend concluída para perfil, posts e mídias:** os endpoints ativos foram verificados com sessões autenticadas temporárias no banco de desenvolvimento. As telas de perfil e relações consomem esses endpoints em sessões remotas; mensagens ainda não têm API e deverão aplicar a regra de bloqueio quando forem construídas.

### P1 — Upload de mídia funciona no desenvolvimento; a galeria comercial ainda precisa de ownership definido

- A prévia de desenvolvimento pode usar URLs `blob:` locais, mas a publicação em sessão remota envia o arquivo pelo fluxo de upload, recebe um ID e associa esse ID ao post; uma falha remota não é tratada como publicação bem-sucedida.
- O backend valida arquivo/titularidade e mantém os binários no disco local de desenvolvimento. Armazenamento permanente, processamento e limpeza periódica de produção continuam fora desta etapa.
- A galeria derivada das publicações respeita audiência, mas `CommercialProfilePage` também reúne `commercialProfile.photos/videos`. Ainda é necessário definir se esses ativos pertencem a publicações vinculadas ou ao perfil comercial; não duplicar arquivos nem expor conteúdo privado via galeria.

### P1 — O contrato documental tinha divergências de regra

Corrigido neste pacote:

- Círculo deixou de ter convites, estados pendentes e tabela própria; a listagem retorna apenas seguimentos recíprocos efetivos.
- Avaliação agora exige nota inteira de 1–5, comentário entre 10–500 caracteres e resposta entre 3–500, alinhados à UI.
- Opções de serviço comerciais distinguem oferecido (`true`), não oferecido (`false`) e não informado (`null`/ausente). Só `true` pode aparecer no perfil público.

As rotas de avaliação e o contrato estão implementados em código. Antes de declarar persistência física ou aceite da experiência autenticada, consulte o banco de desenvolvimento e execute testes HTTP integrados seguros.

### P2 — Controles/telas que não completam a ação esperada

- O botão “nova mensagem” em `Messages.tsx` não tem ação associada.
- Envio de imagem e emoji em mensagens está explicitamente desabilitado.
- Recuperação, verificação, histórico de visualização, ordenação/categoria de lojas, raio/distância e compra são ausentes ou indisponíveis. Isso não deve ser documentado como backend pronto.
- `Seek` trabalha com pesquisa/filtros locais; o filtro de raio está desabilitado e “aberto agora” não é disponibilidade verificada em tempo real.

## Regras de produto que o backend deve respeitar

1. Uma pessoa escolhe conta pessoal ou comercial no cadastro. Conta comercial é a mesma conta Social e é a fonte dos perfis que podem aparecer no Seek.
2. Só contas comerciais elegíveis e públicas podem aparecer como comércio/prestador no Seek. Perfil pessoal não vira estabelecimento; endereço residencial de prestador não deve ser exposto como endereço comercial sem decisão explícita.
3. Círculo é uma projeção: dois seguimentos aceitos em sentidos opostos. Não criar convites, pedidos, tabela, endpoint de entrada/saída ou notificação própria de Círculo. Deixar de seguir em qualquer direção remove a condição.
4. Serviços de comércio aparecem apenas quando declarados como oferecidos. Não informado e não oferecido não podem ser mostrados como serviço disponível.
5. Fotos e vídeos publicados alimentam automaticamente a galeria da mesma conta, sempre respeitando a audiência do post; não tornar privada uma mídia só porque está na galeria.
6. Avaliação não pode ser feita pelo próprio comércio; uma conta pode avaliar o mesmo comércio uma vez; nota é obrigatória de 1 a 5; responsável comercial pode responder sem apagar crítica de cliente.
7. O GPS é opt-in; a seleção manual de cidade continua disponível. Distância só deve ser exibida com origem de localização e coordenadas verificadas, sem estimativa inventada.
8. Seek e Shop não podem afirmar reserva, agendamento confirmado, entrega, ingresso, compra ou pagamento que o produto ainda não implementa.
9. Shuffle e Comunidades não fazem parte do escopo atual.

## Mapa de módulos e fontes atuais

| Módulo            | Rotas/páginas                                                                                                             | Fontes atuais                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso e cadastro | `/`, `/login`, `/register`, `/forgot-password`, `/verify-email`                                                           | API própria para conta real; estado local separado apenas para demonstração de desenvolvimento                                                                                                                |
| Onboarding        | `/onboarding/interests`, `/onboarding/suggestions`                                                                        | preferências locais e sugestões mock                                                                                                                                                                          |
| Social            | `/feed`, `/search`, `/post/:id`, `/article/:id`, `/compose`, `/article/create`, `/social/activity`, `/social/suggestions` | Sessão remota: Feed global/perfil, busca de texto/hashtags e ações de conteúdo via API. Prévia de desenvolvimento: `SocialContext`, fixtures restritas e `contentService` demo. Referências permanecem locais |
| Perfis e relações | `/profile`, `/profile/:username`, `/profile/edit`, seguidores/seguindo, `/circles`                                        | perfil e publicações remotas usam a API em sessão real; seções comerciais sem contrato permanecem limitadas; `/profile/edit` não substitui os dados privados de Configurações > Conta                         |
| Seek              | `/seek`, `/seek/event/:id`                                                                                                | dados locais, catálogo IBGE, preferências de busca; eventos de exemplo                                                                                                                                        |
| Shop              | `/shop`, `/shop/item/:id`                                                                                                 | catálogo ilustrativo restrito ao desenvolvimento; salvos em localStorage                                                                                                                                      |
| Comunicação       | `/messages`, `/messages/:conversationId`, `/notifications`                                                                | objetos em memória/contexto; sem entrega externa                                                                                                                                                              |
| Configurações     | `/settings/*`                                                                                                             | preferências locais e controles ainda indisponíveis                                                                                                                                                           |

## Testes e verificações

Na auditoria e nesta fatia:

- Baseline anterior: `pnpm test:social` passou em 42 testes. Na verificação atual de 31/10/2026, `pnpm run test:social` passou em **95/95**, incluindo Feed remoto, paginação e ações.
- `pnpm run typecheck`, `pnpm run test` e `pnpm run build`: aprovados. O build do frontend passou pela verificação de conteúdo demonstrativo em 97 chunks. Permaneceram dois avisos em comentários internos do Zod; a versão não foi alterada.
- `pnpm --filter @workspace/api-spec run codegen` e `pnpm --filter @workspace/db run check`: aprovados. `pnpm --filter @workspace/db run test:baselines` passou com replay isolado; o teste HTTP isolado passou em **5/5**, incluindo busca acentuada de hashtag e validação do limite. Os schemas temporários foram removidos e o schema `public` permaneceu inalterado.
- Testes HTTP com três contas temporárias e e-mail verificado no banco **de desenvolvimento**: pedido privado, lista e aprovação; perfil após aprovação; seguimento público e mutualidade/Círculo; bloqueio, ocultação de perfil e rejeição de seguimento durante bloqueio; desbloqueio sem restaurar vínculos; edição de perfil e privacidade com versão.
- Rotas protegidas responderam `401` sem sessão e escrita sem CSRF respondeu `403`; health check da API respondeu `200`. As contas temporárias foram excluídas ao final.

Esses resultados comprovam as fatias testadas, não a prontidão integral do backend. Não há teste de navegador autenticado ponta a ponta; avaliações do perfil comercial têm código implementado, mas aguardam migration e validação HTTP integrada; referências, mensagens e notificações também continuam pendentes. Busca por texto e hashtags está integrada em sessões remotas. Upload de mídia está integrado no desenvolvimento, mas armazenamento permanente/produção permanece fora do escopo atual.

## Próximas etapas vigentes

A ordem oficial é a do `auditoria/plano-de-acao-tecnico.md`, que controla os gates e substitui a sequência histórica abaixo. Avaliações do perfil comercial pertencem a Profiles, não ao Seek. A situação física do banco não é afirmada neste relatório. Referências do Feed aceitam somente publicações Social e são reautorizadas ao montar cada prévia. O Feed global e a busca por hashtags não devem ser reimplementados.

## Ordem histórica da auditoria inicial

1. **Concluído nesta etapa:** edição de dados pessoais/comerciais em Configurações > Conta ligada à API owner-only, mantendo o preview de demonstração separado. Próximo: validar a tela em navegador autenticado e fechar as decisões/controles de conta que ainda faltam antes de iniciar páginas públicas.
2. **Fatia de identidade implementada:** registro pessoal/comercial, login por usuário/e-mail, sessão, CSRF, verificação obrigatória, gravação das escolhas de onboarding e recuperação de senha. O fluxo de recuperação tem teste integrado com e-mail em memória; validar o envio no navegador e a entrega real no ambiente de desenvolvimento segue como aceite separado.
3. **Concluído no frontend:** fixtures de exemplo ficam no desenvolvimento; curtidas, repostagens, salvos, leituras, filtros e preferências locais são separados por conta. Não migrar automaticamente os valores das chaves antigas sem identificar seu dono.
4. Aprovar um contrato OpenAPI que corresponda às telas atuais e definir uma API de mesma origem, erros, paginação, CSRF e sessão.
5. Implementar upload de mídia com ownership/validação e migrar a galeria para IDs de mídia autorizados.
6. Integrar gradualmente cadastro/perfil, Social, avaliações dentro do perfil comercial, descoberta do Seek, mensagens/notificações e Shop; somente ligar telas depois de haver endpoints e estados loading/erro/vazio.
7. Criar testes de API e navegador que cubram autorização entre contas, privacidade, Círculo, publicação/galeria, avaliações, mensagens e ações de configuração.

**Estado vigente desta auditoria:** perfis owner-only, privacidade, relações, Feed global, publicações/artigos de perfil e busca de texto/hashtags usam contratos remotos em sessão autenticada, enquanto a prévia segue local. Avaliações do perfil comercial estão implementadas em código; E2E visual autenticado e alguns domínios ainda não têm aceite. A presença de rotas não é prova de persistência nem de validação completa.

---

<a id="secao-4"></a>
## 4. Arquitetura e segurança

Fonte: [`architecture-and-security.md`](architecture-and-security.md).

## Escopo atualmente implementado

A API Express/TypeScript registra autenticação, recuperação de senha, gestão de sessões, onboarding, perfis, relações, Feed, comentários, curtidas, reposts, salvos, remoções e referências. Os métodos/caminhos e o contrato são verificáveis em `endpoints.md`, `routes.generated.md` e `shared/api-spec/openapi.yaml`. Escritas registradas usam sessão e CSRF conforme o contrato. O inventário não comprova a execução ponta a ponta de cada handler. O estado físico do banco de desenvolvimento deve ser obtido por `queries/development-database-catalog.sql`; este texto não fixa contagens. Os binários usam disco local de desenvolvimento, não armazenamento de produção.

Ainda não estão completos: ranking personalizado do Feed, armazenamento persistente de mídia, processamento/transcodificação, thumbnails, limpeza periódica de arquivos órfãos, mensagens, notificações, busca completa, moderação e descoberta remota do Seek. Avaliações e campos de apresentação pertencem ao domínio Profiles; Seek apenas consome projeções públicas autorizadas. O estado físico de tabelas/migrations não é inferido nesta lista.

## 1. Arquitetura de referência

```text
Navegador / aplicativo web
  | mesma origem; cookie HttpOnly; token CSRF nas alterações
  v
Roteador HTTP / Express
  | autenticação -> autorização -> validação -> serviço de domínio
  +--> PostgreSQL / Drizzle (transações, índices, constraints)
  +--> Object Storage privado (upload autorizado / leitura com ACL)
  +--> API própria de autenticação (login, recuperação, verificação e sessão)
  +--> Provedor de e-mail e Web Push (quando habilitados)
  +--> Adaptador de geocodificação (opcional e explícito)
  |
  +--> Outbox na mesma transação
          -> worker de mídia / notificações / busca / exclusão
          -> stream SSE autorizado para o destinatário
```

Preservar a stack atual; separar routers, políticas, serviços, repositórios e DTOs. Não colocar a regra de domínio somente no componente React nem retornar linhas SQL diretamente. O pacote não cria esses diretórios na aplicação.

### Responsabilidades sugeridas

- **HTTP:** parsing, limites, contexto de sessão, request ID e serialização.
- **Políticas:** `canReadAccount`, `canReadPost`, `canInteract`, `canManageBusiness`, `canReadConversation`, `canUseMedia`.
- **Serviços:** transações e regras de estado; não dependem de componentes de UI.
- **Repositórios:** queries parametrizadas, índices, paginação e bloqueio otimista.
- **DTOs:** camelCase, propriedades do visitante e URLs autorizadas; omitir PII e metadados internos.
- **Workers:** tarefas repetíveis com deduplicação, retentativa, fila de falhas e cancelamento.

## 2. Convenções da API

| Convenção    | Contrato proposto                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Versão       | `/api/v1`; manter `/api/healthz` existente                                                                                    |
| IDs novos    | UUID gerado no servidor; IDs legados de demonstração não são importados                                                       |
| Datas        | ISO 8601 UTC; fuso IANA separado quando houver calendário local                                                               |
| Dinheiro     | Inteiro em centavos + moeda ISO, inicialmente BRL; jamais fazer cálculo com `R$ 29,90`                                        |
| Paginação    | `{items: [...], nextCursor: string                                                                                            | null}`; limite padrão 20, máximo 100 |
| Cursor       | Opaco, assinado ou validado, vinculado a filtros/ordem/escopo; desempate por ID                                               |
| Busca        | Normalização de acentos, limites de tamanho, ranking documentado; não chamar de semântica sem implementação                   |
| Erro         | `{error:{code,message,requestId,fields?}}`, sem SQL, token, stack ou informação privada                                       |
| Concorrência | `version`/ETag em recursos editáveis; `If-Match` nas alterações; `412` para versão divergente                                 |
| Relações     | PUT/DELETE idempotentes; repost POST existente também deve ser idempotente por par conta/publicação                           |
| Criações     | `Idempotency-Key` em POST com efeito; vincular conta, método, rota e hash do corpo; rejeitar reutilização com corpo diferente |
| Limites      | `429` e `Retry-After`; cotas propostas, configuráveis e medidas                                                               |

Status principais: `200`, `201`, `202` para tarefa realmente aceita, `204` sem corpo, `400` sintaxe, `401`, `403`, `404`, `409` conflito de domínio, `412` versão, `413` tamanho, `415` tipo, `422` validação, `429`, `500`, `502` integração, `503` indisponibilidade. `401` nunca deve ser convertido em resultado vazio nem em dados de demonstração.

### Exemplo de erro

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Revise os campos informados.",
    "requestId": "req_exemplo",
    "fields": [
      { "path": "rating", "message": "Informe uma nota inteira entre 1 e 5." }
    ]
  }
}
```

### Adaptação dos contratos existentes

- O cliente espera objeto `Post` diretamente, não envelope `{data: Post}`. Páginas usam `Page<T>`.
- Busca de pessoas existente retorna array de resumo; busca de tags retorna array de strings. Não trocar o formato sem alterar o adaptador.
- Comentário enviado usa `text`; resposta usa `content`. Essa diferença foi preservada no contrato.
- `authorId` atual deve ser retirado das decisões de autorização. Compatibilidade temporária pode aceitá-lo somente se coincidir com a sessão.
- Publicação com mídias deve passar `mediaIds` de uploads concluídos, não `blob:`, `data:`, URLs de terceiros ou object keys fornecidos pelo cliente. Alterar `PublishPostInput`, validação e adaptador antes de ativar REST.
- Completar `postSchema` com `isBookmarked`, `parentPostId` quando aplicável e `version`; hoje esses campos não estão todos no parser REST.
- `type=text|video` é legado de apresentação; derivar de `format` e das mídias, não criar duas fontes conflitantes.
- Referências públicas continuam `seek_entity|shop_item|social_post`. O legado `seek_entity` com `id="event:<id>"` deve ser normalizado internamente para evento, com FK própria, sem criar entidade comercial fictícia.

## 3. Autenticação e ciclo de conta

**Evidência de implementação em desenvolvimento (25/10/2026):** autenticação própria na API cobre cadastro, confirmação de e-mail, login, recuperação, troca de senha, sessões e reconhecimento revogável de instalações. Essa evidência de código/testes não declara a presença física atual de schemas no banco; consulte `queries/development-database-catalog.sql`. Produção não foi acessada nem alterada nesta revisão. O envio Resend foi testado em desenvolvimento; a suíte isolada usa um coletor de e-mail falso. Isso não prova E2E no navegador nem habilita o envio em produção.

1. `POST /v1/auth/register` valida cadastro pessoal/comercial e idade autodeclarada mínima de 18 anos. A senha exige 8–128 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial. Cria identidade Social pendente e, para conta comercial, a extensão na mesma transação. Sem envio de e-mail configurado, responde `503` sem criar conta. Senha e confirmação são entrada transitória; confirmação nunca é armazenada.
2. `POST /v1/auth/login` aceita username ou e-mail e senha; só prossegue com e-mail confirmado, conta ativa e política atual. Senhas legadas compatíveis sobem de versão no login; as demais recebem `403 PASSWORD_UPDATE_REQUIRED`. Credenciais pendentes recebem `403 EMAIL_NOT_VERIFIED`, sem sessão.
3. O navegador/app recebe um token aleatório por instalação no cookie `__Host-seekalive_device` (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`). A API persiste apenas o hash do token em `trusted_devices`; não registra fingerprint, user-agent ou IP como identidade do aparelho. A confirmação inicial do e-mail confia na instalação atual. Em login futuro, token ativo permite sessão; instalação sem token ativo recebe `202`, código no e-mail verificado e nenhuma sessão antes da confirmação.
4. O desafio de instalação expira em 10 minutos. O primeiro código errado estabelece 30 segundos até reenvio; o segundo, 90 segundos; o terceiro bloqueia a conta, revoga sessões/instalações e apresenta o contato de suporte. O desbloqueio é manual e ainda não há operação administrativa no Painel. **Risco:** quem já conhece a senha pode provocar bloqueio ao errar os códigos; antes do lançamento, planejar suporte, monitoramento e mitigação de bloqueios abusivos. O limitador por IP é transitório e local ao processo; IP não é persistido nem usado para confiar na instalação.
5. O registro confiável no servidor fica ativo até revogação pelo titular; na web o cookie expira no máximo após 400 dias e pode ser removido pelo navegador antes disso. Limpar o armazenamento ou trocar de navegador exige confirmação por e-mail novamente. O servidor não consegue provar que duas instalações de navegador pertencem ao mesmo aparelho físico.
6. `POST /v1/auth/password/update` exige senha atual e e-mail confirmado; só aplica a nova senha após código no e-mail atual. A confirmação grava Argon2id e revoga todas as sessões e instalações confiáveis numa transação. A redefinição por senha esquecida também revoga sessões e instalações e exige novo login/novo código de instalação. A entrega ocorre fora da transação e ainda não usa outbox durável.
7. Senhas usam Argon2id (64 MiB, três iterações, paralelismo 1). Credenciais antigas começam na versão `0`, novas/atualizadas ficam na versão `1`; a política de composição não pode ser inferida do hash. Senha não é persistida no navegador, logs, eventos ou telemetria.
8. Cookies de sessão e pré-autenticação são opacos, `HttpOnly`, `Secure`, `SameSite=Lax` e `Path=/`; o servidor guarda hashes e valida CSRF nas mutações. `GET /v1/auth/devices` lista somente instalações da própria conta; revogar uma instalação ou todas as demais também encerra suas sessões. Logout encerra só a sessão atual e mantém a instalação confiável.
9. **Evidência histórica:** uma auditoria anterior encontrou objetos físicos de instalações confiáveis e bloqueio e executou testes em schema temporário. Isso não declara o estado atual do banco; consulte `docs/api/backend/queries/development-database-catalog.sql`. Nesta implementação, não houve acesso a banco, execução de DDL ou consulta à produção.
10. A confirmação de e-mail é exigida antes de entrar ou acessar recursos protegidos. Trata-se de autorização do servidor, não apenas de uma proteção no React. O código de e-mail para instalação desconhecida é uma verificação adicional contextual; não é MFA geral para todo login nem TOTP.

**Regra de bloqueio no contrato:** bloquear grava a relação do iniciador e, na mesma transação, remove follows aceitos e solicitações pendentes nos dois sentidos. Mensagens e conteúdo não são apagados; conversas ficam ocultas durante o bloqueio e podem voltar após desbloquear. Só o iniciador remove seu bloqueio; follows e pedidos não são recriados. A API deve aplicar isso em toda leitura, escrita e entrega de mídia/notificação.

### Contas e consentimento

- Registrar versão de termos/política aceita e data. Separar consentimento de marketing e notificações do contrato necessário para operar a conta.
- Alteração de e-mail, exclusão, conexão de identidade e recuperação exigem reautenticação.
- Exclusão/desativação deve revogar sessões, parar descoberta, ocultar conteúdo, cancelar jobs e iniciar rotina de retenção/anônimização. Não prometer eliminação instantânea de backups.
- Exportação é tarefa assíncrona com autorização do solicitante, prazo e download privado; deve excluir segredos e dados privados de terceiros.

## 4. Upload, publicação e galeria

```text
POST /media/uploads (MIME declarado, tamanho, finalidade)
  -> valida cota/usuário -> cria media_asset pending
  -> retorna instrução de upload temporária, escopo de um objeto
PUT/POST no armazenamento, conforme instrução autorizada
POST /media/{id}/complete
  -> verifica objeto real, tamanho, checksum e tipo pelo conteúdo
  -> processamento/antivírus/remoção de EXIF/transcodificação
GET /media/{id} -> ready ou failed/quarantined
POST /social/posts com mediaIds
  -> valida autoria e estado ready -> grava post + post_media + outbox
GET /accounts/{id}/media
  -> consulta publicações legíveis + post_media, sem duplicar ativos
```

Limites atuais a preservar inicialmente: 8 mídias; foto até 10 MiB; vídeo até 100 MiB. JPEG/PNG/WebP/GIF/AVIF e MP4/WebM/MOV/OGG. Tipo informado pelo navegador é insuficiente: verificar magic bytes, dimensões, duração, tamanho descomprimido e codecs. Arquivos inválidos não viram URLs publicáveis.

Não aceitar SVG/HTML executável como foto. Remover EXIF, inclusive GPS, das variantes públicas. Validar URLs externas somente se houver um serviço específico de importação com proteção SSRF; a primeira versão deve aceitar arquivos enviados, não buscar qualquer URL.

**Leitura privada:** usar endpoint autorizado de conteúdo/proxy para ativos restritos. URLs pré-assinadas de leitura têm janela de acesso até expirar e não podem prometer revogação imediata. Se forem usadas para mídias públicas, definir TTL, invalidação e política de mudança de audiência. Nunca expor bucket inteiro ou object keys previsíveis como autorização.

Uploads sem vínculo podem expirar, proposta inicial 24 horas. Um ativo ainda usado em avatar, capa ou outra publicação não pode ser apagado por excluir apenas um vínculo. Exclusão física é job idempotente após checagem de referências e retenção.

## 5. Transações críticas

| Operação              | Unidade transacional / prevenção de corrida                                                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro              | Identidade + conta + perfil comercial, se houver + termos; unique username/provider-subject                                                                                                                                                                                                          |
| Publicar              | Sessão + ACL da referência + ownership de mídia + post + vínculos + outbox                                                                                                                                                                                                                           |
| Repost/curtir/salvar  | Unique de par; retry não duplica; contador derivado ou atualizado na mesma transação                                                                                                                                                                                                                 |
| Comentário/resposta   | Permissão do post + pai no mesmo post + conteúdo + evento de notificação                                                                                                                                                                                                                             |
| Seguir/Círculo        | Persistir somente arestas de seguir. Círculo é uma projeção de duas arestas aceitas em sentidos opostos; desfazer qualquer uma remove o resultado derivado. Não há transição própria de convite/aceite de Círculo                                                                                    |
| Bloquear              | Em transação, remover seguimentos aceitos e solicitações pendentes entre as contas; ocultar perfis/conteúdo e impedir interação nos dois sentidos. Mensagens existentes ficam inacessíveis durante o bloqueio, sem apagamento. Só o iniciador pode desbloquear; relações removidas não são recriadas |
| Avaliação             | Sessão do avaliador + conta comercial distinta + unique negócio/avaliador; média coerente com moderação                                                                                                                                                                                              |
| Resposta comercial    | Apenas dono do negócio vinculado à avaliação; nenhum `businessAccountId` arbitrário                                                                                                                                                                                                                  |
| Mensagem              | Participação + permissão de contato + clientMessageId único + mensagem + outbox                                                                                                                                                                                                                      |
| Leitura de conversa   | Cursor monotônico; mensagem deve pertencer à conversa; um participante não altera o cursor de outro                                                                                                                                                                                                  |
| Atualização de perfil | Versão esperada; username único; cache do Seek invalidado somente após commit                                                                                                                                                                                                                        |
| Remoção de conteúdo   | Estado removido + dependências/reposts ocultos + invalidação de busca/referências/galeria                                                                                                                                                                                                            |

## 6. Tempo real

Proposta inicial: SSE `GET /api/v1/stream` com sessão, heartbeat, limite por conta e `Last-Event-ID`; escritas permanecem REST. WebSocket é alternativa caso presença/digitação/volume justifiquem, não dependência obrigatória.

Envelope:

```json
{
  "eventId": "00000000-0000-4000-8000-000000000001",
  "type": "message.created",
  "occurredAt": "2026-10-22T15:00:00Z",
  "resourceId": "00000000-0000-4000-8000-000000000002",
  "version": 1
}
```

Tipos propostos: `message.created`, `conversation.read`, `notification.created`, `notification.read`, `follow.updated` (a projeção de Círculo muda junto), `post.updated`, `post.deleted`, `media.ready`, `media.failed`, `event.updated`.

Autorizar cada assinante e cada replay. Revogar assinaturas em logout/bloqueio/remoção de participante. Preferir IDs a corpo de mensagens em pushes e notificações de sistema. Entrega é **pelo menos uma vez**: frontend deduplica por eventId e consulta o recurso autorizado. Não prometer entrega exatamente uma vez.

## 7. Segurança e abuso

- Autorização por objeto em todo ID recebido: BOLA/IDOR é um risco central em posts, mídias, salvos, avaliações e conversas.
- Cookie de sessão exige defesa CSRF nas mutações: token + validação de origem; CORS não é autorização. SameSite não substitui todas as verificações.
- Origens CORS explícitas somente se realmente houver frontend separado. Não combinar credenciais com `Access-Control-Allow-Origin: *`.
- Queries parametrizadas; allowlist de ordenação e campos editáveis; não repassar objetos arbitrários do cliente para UPDATE.
- Sanitizar corpo de artigo ao renderizar; definir formato permitido. HTML de usuário não deve executar script, iframe ou handlers. Escapar texto normal.
- Usar CSP, HSTS em HTTPS, `X-Content-Type-Options: nosniff` e política de referrer.
- Rate limit por rota, conta e IP; anti-enumeração em autenticação; limites de busca, tamanho de página, payload e uploads; proteção contra spam e fan-out excessivo.
- Moderação exige papel administrativo confiável fora do perfil editável, motivo e trilha auditável. Verificação de negócio não é papel de administrador.
- Webhooks: assinatura, timestamp/tolerância, deduplicação por evento do provedor, corpo bruto para verificar assinatura e processamento assíncrono idempotente. Não confiar em query string de “pagamento aprovado”.
- Logs redigidos: nunca senha, cookie, token, segredo, URL assinada, corpo de DM, código de recuperação ou GPS bruto.
- O banco deve ter usuário de aplicação com privilégios mínimos e credenciais diferentes das de migração. Testes não devem usar dados pessoais de produção.

## 8. LGPD e retenção

Esta é orientação de engenharia, não parecer jurídico. Documentar finalidades, bases legais e operadores com revisão responsável.

Propostas para aprovação: remover upload órfão após 24h; idempotência por 24–72h conforme operação; logs operacionais redigidos por 30 dias; exportação privada com expiração curta; retenção de auditoria/moderação segundo necessidade legal. Não fixar retenção financeira antes de definir o modelo comercial e obrigações aplicáveis.

Não guardar GPS físico por padrão. Histórico de busca/visitas deve ser opt-in ou ter finalidade claramente informada e ação para limpar. Minimizar IP/user-agent e evitar rastreamento persistente desnecessário.

Exclusão deve tratar conta, identidade, sessões, mídia, busca, caches, notificações, mensagens, avaliações, jobs e backups. Mensagens/conteúdo de interação podem exigir anonimização ou tombstone em vez de cascade cego; a política deve ser documentada e testada.

## Estado da primeira fatia de Feed — registro histórico de 25/10/2026

> Este trecho registra o que existia naquela data. Rotas, regras e estados atuais devem ser lidos em `endpoints.md`, `routes.generated.md`, `shared/api-spec/openapi.yaml` e no início deste documento.

- Schema lógico `feed.posts` modelado com chave da conta autora, audiência, tipo texto/artigo, conteúdo, timestamps, versão, checks e índices cronológicos. A migração versionada `0005_mushy_centennial.sql` foi gerada sem conexão ao banco; **não foi aplicada nesta etapa**.
- Rotas: `POST /v1/social/posts`, `POST /v1/social/articles`, `GET /v1/social/posts/{postId}`, `GET /v1/social/articles/{postId}`, `DELETE /v1/social/posts/{postId}` e `GET /v1/social/accounts/{accountId}/posts`. Perfil público agora recebe páginas separadas de posts e artigos do domínio Feed.
- O autor é sempre a conta autenticada; `authorId` de compatibilidade, quando enviado, precisa coincidir com a sessão. Escritas exigem CSRF. Entradas usam schemas Zod estritos, limites de tamanho, limite de página e cursores que carregam e validam conta/formato. Rotas de leitura e escrita possuem rate limits; a implementação desses limites é local ao processo e precisa ser revisada antes de executar múltiplas réplicas.
- Regra de visibilidade registrada naquela data: perfil privado exige follow aprovado; Círculo exige mutualidade; audiência `private` era limitada ao titular; bloqueio bilateral ocultava o recurso usando `404`. A regra vigente passou a permitir também que seguidores aprovados vejam publicações `private` de perfis privados, conforme o código atual e o contrato.
- Artigos aceitam até 50.000 caracteres no corpo. Só `POST /v1/social/articles` recebe o limite de parser de 256 KB necessário para esse contrato; demais JSON continuam limitados a 32 KB. A requisição é testada antes de CSRF para comprovar o tamanho e o tratamento por request ID.
- Fotos/vídeos, `blob:` e URLs externas são rejeitados com erro explícito `CONTENT_MEDIA_NOT_READY`; nenhum arquivo é salvo e nenhum provedor de mídia foi habilitado. Curtidas, comentários e reposts ainda não existem no servidor; os contadores/estados no DTO retornam zero/falso nesta etapa e não devem ser confundidos com os estados locais da prévia.
- A geração Orval atualiza OpenAPI e cliente/tipos. A interface ainda não foi ligada a essas rotas: segue usando conteúdo local de preview. A próxima etapa não deve ser Seek; Feed Social precisa continuar até incluir as interações, a integração frontend e uma verificação autenticada real.
- A migração principal não foi executada porque `SEEKALIVE_EXPECTED_DATABASE` não está disponível para confirmar explicitamente o destino de desenvolvimento exigido pelos guardrails. `drizzle-kit check`, typecheck e testes de unidade/runtime foram executados; a suíte que grava em schema isolado não foi executada neste turno por esse bloqueio de segurança. Não houve DDL ou gravação no banco principal, nem alteração em produção.

---

<a id="secao-5"></a>
## 5. Integração do frontend

Fonte: [`frontend-integration.md`](frontend-integration.md).

Todos os caminhos de código abaixo são relativos a `Aplicativo/front/src`, salvo indicação contrária. Rotas da UI são links relativos do aplicativo, **não endpoints de API**.

## 1. Rotas auditadas

| Rotas da interface                                             | Código / comportamento atual                                                                                                                                                                                                                                                                                                | Integração necessária                                                                                                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/login`, `/register`                                     | `App.tsx`, `Login`, `Register`, `AppContext`; sessão validada pela API, formulário conectado                                                                                                                                                                                                                                | Conta Social única; confirmação obrigatória do e-mail antes de emitir sessão                                                                                                     |
| `/forgot-password`, `/verify-email`                            | Os fluxos de verificação e recuperação possuem endpoints na API; o envio direto pelo Resend foi testado em desenvolvimento, mas isso não comprova a jornada E2E no navegador                                                                                                                                                 | Validar cada jornada completa com testes próprios; manter bloqueio de sessão enquanto o e-mail não estiver confirmado                                                                                                                   |
| `/onboarding/interests`, `/onboarding/suggestions`             | Interesses concluem pela API; sugestões e escolhas de seguir continuam fixtures/locais                                                                                                                                                                                                                                      | Catálogo e recomendações autorizadas; persistir ações de seguir quando telas forem ligadas à API                                                                                 |
| `/feed`                                                        | Sessões reais usam `GET /v1/social/feed` nas abas Para você, Seguindo, Artigos e Vídeos; a prévia de desenvolvimento mantém fixtures locais                                                                                                                                                                                 | Preservar estados de carregamento/erro/vazio, paginação e consistência das ações                                                                                                 |
| `/compose`, `/article/create`                                  | Sessões remotas usam a API de criação e ativos carregados; a demonstração segue no adaptador local                                                                                                                                                                                                                         | Preservar o modo de desenvolvimento e validar upload, criação, validação, idempotência e publicação com referência                                                                   |
| `/post/:postId`, `/article/:postId`                            | Sessões remotas leem publicações e comentários pela API e acionam curtidas, comentários, reposts, salvos e remoções; a prévia usa dados locais                                                                                                                                                                             | Testar cada fluxo autenticado e manter as regras de audiência em toda leitura                                                                                                    |
| `/search`                                                      | Pessoas usam `searchAccounts` em sessão remota; a busca de publicações usa a consulta paginada do Feed; não inferir que tendências/hashtags tenham cobertura completa apenas por isso                                                                                                                                         | Verificar contrato e cobertura de busca por tipo de conteúdo, prefixo de hashtag, permissões e tendências                                                                          |
| `/profile`, `/profile/:username`                               | Sessões remotas usam `/v1/profiles/:username` e páginas de publicações/artigos. A aba Avaliações consome endpoints de Profiles; a situação física do banco deve ser verificada pela consulta de catálogo. Não há uma rota de galeria comercial nesta superfície | Preservar ACL; avaliações e apresentação pertencem a Profiles; Seek somente consome as projeções autorizadas                                                                        |
| `/profile/edit`                                                | Edição de apresentação do perfil ainda usa estado local                                                                                                                                                                                                                                                                     | Conectar campos públicos de perfil quando a fatia de perfil público for autorizada; não duplicar os campos privados de cadastro                                                  |
| `/settings/account`                                            | API e telas integradas para ler/editar perfil, trocar e-mail e senha e solicitar exclusão da conta; idade é coletada no cadastro, usada pelo backend para a regra 18+ e nunca é retornada ou exibida após a criação                                                                                                         | Exportação de dados não oferecida nesta versão; integração de produção ainda exige configuração e validação do provedor de e-mail                                                |
| `/profile/:username/followers`, `/profile/:username/following` | Sessões remotas usam as APIs paginadas; demonstração permanece local                                                                                                                                                                                                                                                        | Preservar estados de carregamento/erro e manter a demonstração isolada da sessão remota                                                                                          |
| `/settings/privacy`                                            | Sessões remotas leem e atualizam privacidade pela API; demonstração permanece local. Pedidos recebidos usam a API                                                                                                                                                                                                            | Configurações de privacidade não significam que mensagens ou notificações estejam implementadas                                                                                |
| `/profile/:username/circles`, `/circles`                       | Sessões remotas usam a API paginada de Círculo; demonstração permanece local                                                                                                                                                                                                                                                | Preservar a derivação pelos dois seguimentos aceitos; não criar convite, aceite, recusa ou remoção de Círculo                                                                    |
| `/social/activity`                                             | Histórico, salvos, curtidas, comentários e publicações                                                                                                                                                                                                                                                                      | Consultas do ator autenticado; limpar histórico sem apagar conteúdo original                                                                                                     |
| `/social/suggestions`                                          | Sugestões locais                                                                                                                                                                                                                                                                                                            | Recomendações com exclusão de bloqueados, já seguidos e perfis não acessíveis                                                                                                    |
| `/notifications`                                               | Eventos e leitura locais                                                                                                                                                                                                                                                                                                    | Destinatário no servidor, paginação, marcar lida, preferências e entrega                                                                                                         |
| `/messages`, `/messages/:conversationId`                       | Conversas/mensagens locais                                                                                                                                                                                                                                                                                                  | Participação, criação de conversa, texto, leitura monotônica, deduplicação e stream                                                                                              |
| `/seek`                                                        | Localização, categorias, filtros, carrosséis, salvos e mocks                                                                                                                                                                                                                                                                | Descoberta e organização por localização/categoria somente de perfis comerciais originados no Social; não criar ou administrar avaliações aqui                                   |
| `/profile/:username` — conta comercial                         | A aba **Avaliações** consome os endpoints de Profiles em sessão real; demonstração permanece isolada no navegador                                                                                                                                                                                                           | Confirmar o estado físico do domínio Profiles pela consulta de catálogo antes de afirmar persistência no banco; Seek não administra avaliações                                  |
| `/seek/event/:id`                                              | Detalhe de demonstração; ingresso desabilitado                                                                                                                                                                                                                                                                              | Evento real com organizador, interesse persistente, estado; ingressos são extensão                                                                                               |
| `/shop`, `/shop/item/:id`                                      | Catálogo ilustrativo, detalhe, favoritos; compra desabilitada                                                                                                                                                                                                                                                               | Catálogo real ligado ao vendedor, preço numérico, salvos; checkout fora do núcleo                                                                                                |
| `/settings/privacy`, `/settings/blocked`                       | Sessões remotas leem e salvam privacidade pela API e usam API para lista/ações de bloqueio; demonstração mantém estado local                                                                                                                                                                                                | Preservar a regra bilateral: remover follows/pedidos, ocultar relações e não restaurar ao desbloquear; mensagens antigas retornam após desbloquear                               |
| `/settings/notifications`                                      | Defaults visuais desabilitados                                                                                                                                                                                                                                                                                              | Preferências reais e consentimento para push/e-mail                                                                                                                              |
| `/settings/security`                                           | Sessões e instalações confiáveis consultam a API e permitem revogação individual/em lote. Instalações identificadas por token de navegador/app, sem IP ou fingerprint                                                                                                                                                       | MFA geral e histórico de acessos seguem indisponíveis; E2E autenticado no navegador continua pendente. As tabelas necessárias foram encontradas por metadados em desenvolvimento |
| `/settings/appearance`                                         | Escuro; tamanho 16/18/20 local                                                                                                                                                                                                                                                                                              | Persistir preferências não sensíveis; aparência não deve depender de chamada a cada render                                                                                       |
| `/styleguide`, página inexistente                              | Apoio visual e fallback                                                                                                                                                                                                                                                                                                     | Nenhum CRUD de domínio; preservar 404 da interface sem mascarar 404 da API                                                                                                       |

O estado autenticado vem de `GET /api/v1/auth/session`, nunca de `localStorage`. Login, cadastro e confirmação usam a API e cookie `HttpOnly`; o navegador não guarda credenciais. Mídias de teste usam arquivos locais no desenvolvimento; consulte a query de catálogo para o estado físico do banco, sem inferir tabela aplicada a partir deste texto. Publicações com fotos/vídeos enviam arquivos autenticados e a leitura volta a verificar a visibilidade do post. Registro não cria sessão; só a confirmação do e-mail ativa a conta. O envio direto pelo Resend foi testado e o e-mail de teste foi recebido; sem configuração de envio, o cadastro responde `503` sem criar conta. A especificação define avaliações em `/v1/profiles/{username}/reviews`; não há operações de avaliação sob `/v1/seek/...`. A jornada autenticada completa ainda precisa de E2E no navegador.

### Fluxo de acesso proposto

1. A tela de apresentação leva ao login; cadastro envia os dados pessoais/comerciais à API. Com envio disponível, cria conta pendente e responde `202` sem cookie. Sem envio configurado, responde `503` sem criar conta.
2. A pessoa informa o código de seis dígitos recebido no e-mail. Só então o servidor confirma o endereço, ativa a conta e emite cookie de sessão.
3. Login aceita usuário ou e-mail, mas só emite sessão para conta ativa e verificada. Conta pendente não recebe sessão nem pode consultar recursos privados.
4. Depois de entrar pela primeira vez, interesses podem ser salvos ou pulados pelo endpoint de onboarding. A tela de onboarding não aparece em sessões já concluídas.
5. Verificação e recuperação de senha têm rotas na API. A existência dos endpoints e o teste direto do Resend não substituem a validação E2E da jornada no navegador.

O proxy Vite encaminha `/api` à API local durante o desenvolvimento. O envio direto de teste pelo Resend foi recebido; a jornada completa de cadastro/verificação ainda precisa ser validada por teste E2E específico.

Em sessões remotas, a interface usa o cliente Orval para contas, relações e perfis. Feed, leitura de publicações, comentários, curtidas, reposts, salvos, remoções e referências também usam `restSocialApi`/`restContentAdapter`; o modo de demonstração mantém o adaptador local, sem fallback silencioso após erro remoto. Os métodos e caminhos efetivamente montados estão em `endpoints.md`; `routes.generated.md` registra CSRF, rate limits e schemas do contrato. A busca de pessoas/publicações e as recomendações são fluxos distintos: cada cobertura deve ser verificada em seu próprio fluxo.

## 2. Arquivos que precisam trocar de fonte

| Arquivo                                                                                             | Alteração de integração, quando autorizada                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `context/AppContext.tsx`                                                                            | Consultar sessão, retirar login automático/mock, expiração e logout autoritativos                                                                                                                      |
| `context/SocialContext.tsx`                                                                         | Isolar/remover fixtures de produção; substituir reducer como fonte de verdade por cache de API e mutações reconciliadas por conta                                                                      |
| `services/contentService.ts`                                                                        | Migrar payload de mídia/autor; ativar REST somente após teste real; não fallback para demo em erro                                                                                                     |
| `services/restContracts.ts`                                                                         | Completar operações, erros, paginação e validações; manter formatos existentes documentados                                                                                                            |
| `services/contentValidation.ts`                                                                     | Compartilhar regras com servidor sem confundir validação de UI com segurança                                                                                                                           |
| `services/mediaService.ts`, `hooks/use-draft-media.ts`                                              | Seleção e preview local; no envio remoto, upload autenticado via API para disco local em desenvolvimento. Estado de processamento, progresso/cancelamento e armazenamento permanente ainda não existem |
| `modules/app/content/referenceResolver.ts`, `components/content/ReferencePreviewCard.tsx`           | Sessão remota consulta a prévia autorizada de `social_post`; demonstração local continua usando snapshot. Tipos de Seek/evento/Shop não são aceitos no backend desta etapa                             |
| `lib/postMedia.ts`                                                                                  | Galeria derivada de publicações e mídias autorizadas; não expor ativo oculto por outro caminho                                                                                                         |
| `data/accountStorage.ts`, `modules/profile/commercial-profile/data/businessProfileReviewStorage.ts` | Manter somente a demonstração local; não usar localStorage como persistência da sessão remota                                                                                                          |
| `hooks/useSeekDiscovery.ts`, `lib/seekDiscovery.ts`                                                 | Consultar API por filtros/cidade; separar estado de UI dos dados; preservar retorno e scroll                                                                                                           |
| `services/seekLocationService.ts`                                                                   | Manter seleção manual e GPS consentido; adaptar catálogo à API/cache; geocodificação só após configuração                                                                                              |
| `hooks/use-saved-shop-items.ts`, salvos comerciais                                                  | API única de salvos tipados, compartilhada entre perfil e módulos                                                                                                                                      |
| `data/mockData.ts`, `demoCatalog.ts`, `demoSeek*.ts`, `demoIntegrationPosts.ts`                     | Fixtures exclusivamente de testes/preview; não seeds automáticos de produção                                                                                                                           |
| `components/profile/CommercialProfilePage.tsx`                                                      | Dados da mesma conta comercial, avaliações e resposta; galeria deve combinar mídias publicadas e mídia de perfil de forma explícita e sem duplicação                                                   |
| `shared/api-spec/openapi.yaml`                                                                      | Evoluir contrato vigente após aprovação; preservar título `Api` exigido pelo código gerado                                                                                                             |
| `shared/api-client-react`, `shared/contracts`                                                       | Regenerar a partir do contrato aprovado, não editar artefatos gerados manualmente                                                                                                                      |
| `infra/database/src/schema`                                                                         | Drizzle é a fonte do schema atual; sincronizar desenvolvimento no pós-merge e promover alterações de produção pelo fluxo oficial de publicação da Replit. Não criar migrador de produção paralelo      |
| `Aplicativo/back/src/app.ts`                                                                        | Ordem de middleware, autenticação, CSRF, limites, módulos, erros e logs seguros                                                                                                                        |

### Atenção aos contratos atuais

O adaptador existente não envia CSRF nem `Idempotency-Key` e não trata `412`, `413`, `415`, `429` de forma específica. Acrescentar essas respostas à experiência de erro. Consultas devem suportar cancelamento, e um resultado antigo não deve sobrescrever a cidade/filtro novo.

`AppContext` e `SocialContext` podem divergir: por exemplo, a troca de username em Configurações atualiza a conta ativa local, mas não chama `updateUser` no contexto Social. A API deve ser a fonte única; a mudança de username precisa atualizar todos os caches, links, sessão e busca. “Atualização otimista” exige rollback em erro, não apenas toast de sucesso. O Círculo deve ser sempre recalculado a partir de dois seguimentos aceitos em sentidos opostos.

## 3. Persistência atual e destino

| Origem atual                    | Chave / conteúdo                                                              | Destino                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| localStorage                    | `seekalive-social-accounts`, `seekalive-active-account`                       | Conta e sessão reais; nunca importar identidade/ownership sem autenticação                                                                  |
| localStorage                    | `seekalive-social-reviews`                                                    | Apenas demonstração local; sessões remotas consultam e alteram avaliações pelo endpoint de Profiles                                         |
| localStorage                    | `seekalive-saved-shop-items`, `seekalive-saved-businesses`                    | `saved_resources`, somente IDs reais e legíveis                                                                                             |
| sessionStorage                  | `seekalive-seek-saved-events`                                                 | Salvos de evento reais, ou manter local quando for apenas demonstração                                                                      |
| sessionStorage                  | `seekalive-seek-filters`, `seekalive-seek-scroll`                             | Pode continuar como estado de navegação local; não precisa virar tabela                                                                     |
| sessionStorage                  | `seekalive-seek-recent-cities`                                                | Preferência manual local; sincronização entre dispositivos opcional/consentida                                                              |
| sessionStorage                  | `seekalive-seek-demo-preview`                                                 | Somente desenvolvimento; nunca configura catálogo de produção                                                                               |
| Memória React                   | Posts, comentários, reposts, relações, notificações e mensagens               | Tabelas e cache de API; fixtures não são dados migráveis automaticamente                                                                    |
| `blob:`                         | Fotos/vídeos de rascunho/publicação                                           | Upload de arquivos reais e vínculos de mídia; URL blob não pode ser “migrada” pelo servidor                                                 |
| Estado da página/Contexto React | Curtidas, salvos, reposts, notificações, mensagens e relações de demonstração | Converter em mutações/consultas identificadas por conta; não migrar valores globais como `isLiked` ou `isRead` como estado do usuário atual |

Não transformar tudo em tabela: scroll, modal aberto, termo parcialmente digitado e seleção temporária são estados de UI. O servidor deve persistir escolhas de produto, conteúdo e relações, não cada renderização.

## 4. Exemplos de integração

### Publicação

```http
POST /api/v1/social/posts
Content-Type: application/json
X-CSRF-Token: <token-da-sessao>
Idempotency-Key: <uuid-da-tentativa>

{
  "format": "media",
  "content": "Um registro do encontro.",
  "audience": "public",
  "mediaAssetIds": ["00000000-0000-4000-8000-000000000010"],
  "reference": {"type":"social_post","id":"00000000-0000-4000-8000-000000000011"}
}
```

O servidor deriva o autor da sessão, valida os arquivos e verifica se o autor pode ler a publicação referenciada antes de criar. A prévia nunca é gravada no post: o UUID de destino é resolvido novamente na leitura, aplicando audiência, bloqueios e estado atual. Se o alvo ficar indisponível ou for apagado, a relação permanece sem metadados e a interface exibe “Conteúdo indisponível”.

### Busca de serviço em município

```http
GET /api/v1/seek/discover?q=pedreiro&kind=provider&cityId=3550308&minRating=4&sort=rating&limit=20
```

Mapeamento do filtro atual: `query→q`, `tab=providers→kind=provider`, `minimumRating→minRating`; `list` e `scroll` não são filtros de servidor. `onlyOpen` atual é situação declarada: mapear para `open=declared`, não “aberto agora” sem horários estruturados.

### Prévia de publicação Social referenciada

```http
GET /api/v1/social/posts/00000000-0000-4000-8000-000000000011/reference
```

O endpoint é público apenas para alvos legíveis por visitantes; quando login for necessário, a sessão atual precisa ter acesso. Alvo privado não legível, bloqueado ou removido retorna o mesmo `404 CONTENT_NOT_FOUND`, sem expor título, autor ou existência. Esta implementação aceita somente referências `social_post`; referências de evento/Seek e Shop continuam fora do backend atual.

### Avaliações do perfil comercial

```http
GET /api/v1/profiles/{username}/reviews?limit=20
POST /api/v1/profiles/{username}/reviews
DELETE /api/v1/profiles/{username}/reviews/me
PUT /api/v1/profiles/{username}/reviews/{reviewId}/reply
```

O GET devolve página por cursor, nota média, total, distribuição 1–5 e o ID da avaliação do visitante autenticado quando houver. POST deriva o autor da sessão e aceita apenas conta pessoal ativa/verificada; nota 1–5, comentário aparado 10–500, uma avaliação por conta/comércio e sem autoavaliação. DELETE remove a avaliação própria; PUT cria ou substitui resposta apenas pelo titular comercial (3–500 caracteres). Todas as leituras reaplicam visibilidade do perfil e bloqueios. O Seek não grava nem edita avaliações; qualquer nota nos resultados de descoberta é uma projeção de leitura. A implementação HTTP e o contrato OpenAPI existem; o estado físico do banco deve ser confirmado pela consulta de catálogo.

## 5. Matriz resumida de permissão

| Recurso                       | Visitante autorizado a ler                      | Quem altera                                                   |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Perfil público                | Público conforme política de exposição          | Dono; moderação auditada para suspensão                       |
| Conta privada                 | Dono/seguidores aceitos conforme campo          | Dono; sem exposição de e-mail/sessões                         |
| Publicação/artigo             | Audiência + privacidade + bloqueio              | Autor                                                         |
| Comentário                    | Leitor autorizado do post                       | Autor; moderação com motivo                                   |
| Galeria/arquivo               | Mesma audiência da origem                       | Dono do ativo e vínculos autorizados                          |
| Avaliação comercial           | Política pública/moderação do negócio           | Avaliador; resposta somente dono do negócio                   |
| Evento/item Shop              | Publicado e organizador/vendedor acessível      | Dono da conta comercial                                       |
| Conversa/mensagem             | Participantes autorizados                       | Remetente para envio; participante para seu cursor de leitura |
| Notificação/salvo/preferência | Apenas destinatário/dono                        | Apenas destinatário/dono                                      |
| Relatório de abuso            | Denunciante vê seu protocolo; moderador vê fila | Equipe autorizada, com auditoria                              |
| Exportação/exclusão           | Próprio titular reautenticado                   | Worker autorizado, com trilha e estados                       |

---

<a id="secao-6"></a>
## 6. Endpoints

Fonte: [`endpoints.md`](endpoints.md).

Este inventário é gerado a partir do grafo de routers Express realmente montado e comparado com `shared/api-spec/openapi.yaml`. `MONTADA EM CÓDIGO` informa apenas que o método/caminho foi registrado; não classifica o comportamento como funcionalmente validado nem afirma implantação em produção. Consulte a matriz de validação do Feed para a avaliação individual das 11 operações.

Rotas montadas: **76**. Rotas sem contrato: **0**. Contratos sem rota montada: **0**. Divergências de CSRF: **0**.

| Método | Endpoint | Acesso declarado | Entrada | Saída | Estado |
|---|---|---|---|---|---|
| DELETE | `/v1/auth/devices/{deviceId}` | __Host-seekalive_session + X-CSRF-Token | deviceId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| DELETE | `/v1/auth/devices/others` | __Host-seekalive_session + X-CSRF-Token | — | 200 (application/json: OtherDevicesRevoked) | MONTADA EM CÓDIGO |
| DELETE | `/v1/auth/sessions/{sessionId}` | __Host-seekalive_session + X-CSRF-Token | sessionId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| DELETE | `/v1/auth/sessions/others` | __Host-seekalive_session + X-CSRF-Token | — | 200 (application/json: OtherSessionsRevoked) | MONTADA EM CÓDIGO |
| DELETE | `/v1/profiles/{username}/reviews/me` | __Host-seekalive_session + X-CSRF-Token | username (path obrigatório; string, mín. 3, máx. 20) | 200 (application/json: BusinessProfileReviewDeleted) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/accounts/{accountId}/follow` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/blocks/{accountId}` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/comments/{commentId}` | __Host-seekalive_session + X-CSRF-Token | commentId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/comments/{commentId}/like` | __Host-seekalive_session + X-CSRF-Token | commentId (path obrigatório; string (uuid)) | 200 (application/json: Comment) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/media/{assetId}` | __Host-seekalive_session + X-CSRF-Token | assetId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}/bookmark` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}/like` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}/repost` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |
| GET | `/healthz` | Não declarado | — | 200 (application/json: HealthStatus) | MONTADA EM CÓDIGO |
| GET | `/readyz` | Não declarado | — | 200 (application/json: ReadinessStatus) | MONTADA EM CÓDIGO |
| GET | `/v1/accounts/{accountId}` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)) | 200 (application/json: AccountView) | MONTADA EM CÓDIGO |
| GET | `/v1/accounts/availability` | Não declarado | username (query obrigatório; string, mín. 3, máx. 21) | 200 (application/json: AccountUsernameAvailability) | MONTADA EM CÓDIGO |
| GET | `/v1/accounts/me` | __Host-seekalive_session | — | 200 (application/json: MyAccountResponse) | MONTADA EM CÓDIGO |
| GET | `/v1/accounts/me/privacy` | __Host-seekalive_session | — | 200 (application/json: PrivacySettings) | MONTADA EM CÓDIGO |
| GET | `/v1/auth/csrf` | Não declarado | — | 200 (application/json: CsrfToken) | MONTADA EM CÓDIGO |
| GET | `/v1/auth/devices` | __Host-seekalive_session | — | 200 (application/json: TrustedDevicePage) | MONTADA EM CÓDIGO |
| GET | `/v1/auth/session` | __Host-seekalive_session ou visitante | — | 200 (application/json: CurrentSession) | MONTADA EM CÓDIGO |
| GET | `/v1/auth/sessions` | __Host-seekalive_session | cursor (query; string, máx. 16) | 200 (application/json: AuthSessionPage) | MONTADA EM CÓDIGO |
| GET | `/v1/profiles/{username}` | __Host-seekalive_session ou visitante | username (path obrigatório; string, mín. 3, máx. 20) | 200 (application/json: ProfileResponse) | MONTADA EM CÓDIGO |
| GET | `/v1/profiles/{username}/reviews` | __Host-seekalive_session ou visitante | username (path obrigatório; string, mín. 3, máx. 20); limit (query; integer, min 1, max 50); cursor (query; string, máx. 256) | 200 (application/json: BusinessProfileReviewPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/accounts` | __Host-seekalive_session | q (query obrigatório; string, mín. 2, máx. 80); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/accounts/{accountId}/followers` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/accounts/{accountId}/following` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/accounts/{accountId}/posts` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512); format (query; string) | 200 (application/json: PostPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/articles/{postId}` | __Host-seekalive_session ou visitante | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |
| GET | `/v1/social/blocks` | __Host-seekalive_session | — | 200 (application/json: AccountList) | MONTADA EM CÓDIGO |
| GET | `/v1/social/circles` | __Host-seekalive_session | limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: CirclePage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/feed` | __Host-seekalive_session ou visitante | tab (query; string); q (query; string, mín. 2, máx. 120); limit (query; integer, min 1, max 50); cursor (query; string, máx. 512) | 200 (application/json: FeedPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/follow-requests` | __Host-seekalive_session | limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: FollowRequestPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/media/{assetId}` | __Host-seekalive_session ou visitante | assetId (path obrigatório; string (uuid)); Range (header; string) | 200 (image/jpeg: string (binary); image/png: string (binary); image/gif: string (binary); image/webp: string (binary); image/avif: string (binary); video/mp4: string (binary); video/webm: string (binary)); 206 (sem corpo) | MONTADA EM CÓDIGO |
| GET | `/v1/social/posts/{postId}` | __Host-seekalive_session ou visitante | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |
| GET | `/v1/social/posts/{postId}/comments` | __Host-seekalive_session | postId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512) | 200 (application/json: CommentPage) | MONTADA EM CÓDIGO |
| GET | `/v1/social/posts/{postId}/reference` | __Host-seekalive_session ou visitante | postId (path obrigatório; string (uuid)) | 200 (application/json: ReferencePreview) | MONTADA EM CÓDIGO |
| PATCH | `/v1/accounts/me` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountPatch | 200 (application/json: MyAccountResponse) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/code` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountDeletionCodeRequest | 202 (application/json: AccountDeletionCodeResponse) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/confirm` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountDeletionConfirmation | 200 (application/json: AccountDeletionScheduled) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/restore/code` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: LoginRequest | 202 (application/json: AccountDeletionCodeResponse) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/restore/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: AccountRestorationConfirmation | 200 (application/json: AccountRestoredResponse) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/email/change/confirm-current` | __Host-seekalive_session + X-CSRF-Token | application/json: ChallengeConfirmInput | 202 (application/json: EmailChangeNewCodeResponse) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/email/change/confirm-new` | __Host-seekalive_session + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: AccountEmailChangeResult) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/email/change/request` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountEmailChangeRequest | 202 (application/json: EmailChangeCurrentCodeResponse) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/password/change/confirm` | __Host-seekalive_session + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: AccountPasswordChangeResult) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/account/password/change/request` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountPasswordChangeRequest | 202 (application/json: PasswordChangeCodeResponse) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/device-verification/confirm` | __Host-seekalive_pre_auth + __Host-seekalive_device + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: AuthResult) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/device-verification/resend` | __Host-seekalive_pre_auth + __Host-seekalive_device + X-CSRF-Token | application/json: ChallengeResendInput | 200 (application/json: DeviceVerificationResent) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/login` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: LoginRequest | 200 (application/json: AuthResult); 202 (application/json: oneOf(DeviceVerificationRequired\|AccountDeletionPendingResponse)) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/logout` | __Host-seekalive_session + X-CSRF-Token ou __Host-seekalive_pre_auth + X-CSRF-Token | — | 204 (sem corpo) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/password/reset/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: PasswordResetConfirm | 200 (application/json: PasswordResetComplete) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/password/reset/request` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: PasswordResetRequest | 202 (application/json: PasswordResetRequested) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/password/update` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: PasswordPolicyUpdateRequest | 202 (application/json: PasswordUpdateChallenge) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/password/update/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: PasswordUpdated) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/register` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: RegisterRequest | 202 (application/json: VerificationRequired) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/verification` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: EmailVerificationRequest | 202 (application/json: VerificationRequired) | MONTADA EM CÓDIGO |
| POST | `/v1/auth/verification/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: EmailVerificationConfirm | 200 (application/json: EmailVerificationConfirmation) | MONTADA EM CÓDIGO |
| POST | `/v1/onboarding/interests` | __Host-seekalive_session + X-CSRF-Token | application/json: OnboardingInterestsRequest | 200 (application/json: OnboardingCompletionResult) | MONTADA EM CÓDIGO |
| POST | `/v1/profiles/{username}/reviews` | __Host-seekalive_session + X-CSRF-Token | username (path obrigatório; string, mín. 3, máx. 20); application/json: BusinessProfileReviewCreate | 201 (application/json: BusinessProfileReviewCreated) | MONTADA EM CÓDIGO |
| POST | `/v1/social/articles` | __Host-seekalive_session + X-CSRF-Token | application/json: ArticleCreate | 201 (application/json: Post) | MONTADA EM CÓDIGO |
| POST | `/v1/social/follow-requests/{accountId}/accept` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 200 (application/json: FollowState) | MONTADA EM CÓDIGO |
| POST | `/v1/social/follow-requests/{accountId}/decline` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| POST | `/v1/social/media` | __Host-seekalive_session + X-CSRF-Token | X-Seekalive-Media-Type (header obrigatório; string); application/octet-stream: string (binary) | 201 (application/json: MediaUpload) | MONTADA EM CÓDIGO |
| POST | `/v1/social/posts` | __Host-seekalive_session + X-CSRF-Token | application/json: PostCreate | 201 (application/json: Post) | MONTADA EM CÓDIGO |
| POST | `/v1/social/posts/{postId}/comments` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512); application/json: CommentCreate | 201 (application/json: Comment) | MONTADA EM CÓDIGO |
| POST | `/v1/social/posts/{postId}/repost` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |
| PUT | `/v1/accounts/me/privacy` | __Host-seekalive_session + X-CSRF-Token | application/json: PrivacySettingsWrite | 200 (application/json: PrivacySettings) | MONTADA EM CÓDIGO |
| PUT | `/v1/profiles/{username}/reviews/{reviewId}/reply` | __Host-seekalive_session + X-CSRF-Token | username (path obrigatório; string, mín. 3, máx. 20); reviewId (path obrigatório; string (uuid)); application/json: BusinessProfileReviewReply | 200 (application/json: BusinessProfileReviewReplyResponse) | MONTADA EM CÓDIGO |
| PUT | `/v1/social/accounts/{accountId}/follow` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 200 (application/json: FollowState) | MONTADA EM CÓDIGO |
| PUT | `/v1/social/blocks/{accountId}` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | MONTADA EM CÓDIGO |
| PUT | `/v1/social/comments/{commentId}/like` | __Host-seekalive_session + X-CSRF-Token | commentId (path obrigatório; string (uuid)) | 200 (application/json: Comment) | MONTADA EM CÓDIGO |
| PUT | `/v1/social/posts/{postId}/bookmark` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |
| PUT | `/v1/social/posts/{postId}/like` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | MONTADA EM CÓDIGO |

O teste `pnpm --filter @workspace/scripts run test:api-route-contract` falha se houver método/caminho registrado sem operação OpenAPI, operação OpenAPI sem registro Express, registro duplicado ou diferença entre middleware CSRF e declaração `csrfToken`.

---

<a id="secao-7"></a>
## 7. Auditoria das rotas do Feed

Fonte: [`feed-route-validation.md`](feed-route-validation.md).

**Data da revisão:** 2026-10-31
**Ambiente:** desenvolvimento. Não acessa produção nem altera o schema `public`. A suíte integrada executa `db push` e gravação somente em schema temporário aleatório; o fixture confirma fingerprint inalterado de `public` e remove o schema no encerramento.
**Escopo:** operações Feed explicitamente destacadas no Plano 1; análise individual do handler, contrato, dependências e evidência de teste.

## Critério de status

- **Montada:** método e caminho constam no grafo Express e no contrato OpenAPI.
- **Lógica de aplicação testada:** existe teste unitário da lógica de aplicação e ele foi executado nesta rodada.
- **HTTP/persistência validados:** exige executar a operação no servidor com autenticação, CSRF e persistência real; não foi declarado quando essa evidência não foi executada.

`Montada` não significa que uma operação foi exercitada ponta a ponta. Nenhuma das 11 operações recebe aqui o status “funcionalmente validada” apenas por aparecer no roteador.

## Matriz operação por operação

| Método e endpoint | Handler / camada de aplicação | Evidência disponível | Resultado desta revisão |
|---|---|---|---|
| `GET /v1/social/feed` | `presentation/globalFeedRoutes.ts` → `application/listGlobalFeed.ts` | `feed-global-listing.test.mjs` cobre visibilidade, Following, busca normalizada, cursor e artigos/vídeos. `api-isolated-db.test.mjs` exercita HTTP autenticado em abas For You, Following e Articles. | **Montada; lógica de aplicação, HTTP autenticado e leitura persistida validados no schema isolado.** |
| `GET /v1/social/posts/{postId}/comments` | `presentation/postCommentRoutes.ts` → leitura de publicação e `application/listPostComments.ts` | `feed-interactions-application.test.mjs` cobre visibilidade/paginação; integração lista comentários autenticada e valida comentários após remoção. | **Montada; lógica, HTTP autenticado e leitura persistida validados no schema isolado.** |
| `POST /v1/social/posts/{postId}/comments` | `presentation/postCommentRoutes.ts` → `application/createPostComment.ts` | Integração cria comentário e resposta, confirma autoria, texto, replay idempotente e conflito de mesma chave com corpo diferente. | **Montada; HTTP autenticado, persistência, vínculo de resposta e idempotência validados no schema isolado.** |
| `DELETE /v1/social/comments/{commentId}` | `presentation/commentDeleteRoutes.ts` → `application/deletePostComment.ts` | Integração exclui comentário do titular, confirma a lista vazia e a contagem atualizada no post. | **Montada; titularidade, HTTP autenticado, exclusão e efeito persistido validados no schema isolado.** |
| `PUT /v1/social/posts/{postId}/like` | `presentation/postLikeRoutes.ts` → `application/setPostLike.ts` | Integração valida ativação, repetição sem duplicar contagem e estado lido na publicação. | **Montada; HTTP autenticado, persistência e idempotência validados no schema isolado.** |
| `DELETE /v1/social/posts/{postId}/like` | `presentation/postLikeRoutes.ts` → `application/setPostLike.ts` | Integração remove curtida e confirma contagem/estado atualizado. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `POST /v1/social/posts/{postId}/repost` | `presentation/postRepostRoutes.ts` → `application/setPostRepost.ts` | Integração valida criação, repetição sem duplicar contagem e estado lido na publicação. | **Montada; HTTP autenticado, persistência e idempotência validados no schema isolado.** |
| `DELETE /v1/social/posts/{postId}/repost` | `presentation/postRepostRoutes.ts` → `application/setPostRepost.ts` | Integração remove repost e confirma contagem/estado atualizado. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `PUT /v1/social/comments/{commentId}/like` | `presentation/commentLikeRoutes.ts` → `application/setCommentLike.ts` | Integração ativa curtida em comentário e confirma a contagem. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `DELETE /v1/social/comments/{commentId}/like` | `presentation/commentLikeRoutes.ts` → `application/setCommentLike.ts` | Integração remove curtida do comentário e confirma a contagem. | **Montada; HTTP autenticado e persistência validados no schema isolado.** |
| `DELETE /v1/social/posts/{postId}` | `presentation/postDeleteRoutes.ts` → `application/deletePost.ts` | Integração confirma que conta não titular recebe `404`, titular exclui publicação, a linha some e a referência permanece sem FK para o alvo removido. | **Montada; autorização, HTTP autenticado, exclusão e integridade referencial validados no schema isolado.** |

## Segurança observada no código

- As nove operações de escrita registram autenticação obrigatória, CSRF e limite de taxa; os detalhes de contrato e middleware por rota estão em `routes.generated.md`.
- A listagem de comentários exige sessão e verifica a leitura da publicação antes de retornar seus comentários.
- A rota de criação de comentário valida o corpo, não aceita autoria escolhida pelo cliente, normaliza o texto e encaminha chave de idempotência e vínculo de resposta à aplicação.
- Exclusões validam o identificador, derivam o titular da sessão e retornam `404` quando a operação de domínio não encontra recurso que o titular possa excluir.
- A extração das rotas e o teste de paridade verificam o registro e a correspondência do CSRF declarado. A análise de código não substitui teste HTTP autenticado nem prova comportamento da persistência.

## Resultado do teste HTTP autenticado

O cenário de integração que cobre estas operações está em `Aplicativo/back/test/api-isolated-db.test.mjs`. Seu fixture executa `drizzle-kit push` e `DROP SCHEMA ... CASCADE` exclusivamente em schema aleatório no banco de desenvolvimento.

Após autorização expressa para DDL exclusivamente no banco de desenvolvimento, executei `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE=heliumdb pnpm --filter @workspace/scripts run test:api-isolated-db` via `CodeExecution.shellExec`. A primeira rodada revelou tabela esperada ausente no fixture (`business_profile_reviews`); a seguinte encontrou três expectativas de ID de referência obsoletas. Corrigi esses quatro defeitos exclusivamente no suporte/teste, sem alterar as regras ou handlers.

**Resultado final:** 5/5 testes passaram, 0 falhas. O fixture confirmou o fingerprint do schema `public` inalterado, removeu o schema isolado e encerrou o pool. Uma consulta somente leitura posterior confirmou zero schemas `seekalive_test_%` remanescentes no banco `heliumdb`. A tentativa alternativa de sobrescrever o workflow de API gerenciado foi rejeitada; sua configuração permaneceu inalterada.

## Conclusão

As 11 operações estão **montadas** e sem divergência de método/caminho em relação ao OpenAPI. Nesta rodada, além da cobertura unitária e das rejeições sem sessão/CSRF, os caminhos HTTP autenticados e as operações de persistência cobertas foram executados e aprovados na suíte integrada isolada. O resultado é do ambiente de desenvolvimento; não é evidência de comportamento em produção.

---

<a id="secao-8"></a>
## 8. Rotas montadas

Fonte: [`routes.generated.md`](routes.generated.md).

> Fonte: chamadas de registro efetivamente executadas ao importar `Aplicativo/back/src/app.ts`, interceptadas pelos métodos públicos `Express.Router`, `Router.route`, `Router.use` e `Application.use`. O inventário não consulta propriedades internas do Express. A autenticação, schemas e DTOs abaixo são declarações OpenAPI; CSRF e rate limit são extraídos dos handlers realmente registrados.

Operações montadas: **76**. Divergências com OpenAPI: **0**.

| Método | Caminho | Autenticação declarada | CSRF registrado | Rate limit registrado | Entrada OpenAPI | DTO/resposta OpenAPI | HTTP de resposta |
|---|---|---|---|---|---|---|---|
| DELETE | `/v1/auth/devices/{deviceId}` | __Host-seekalive_session + X-CSRF-Token | Sim | device-revoke: 20/900s | deviceId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 400, 401, 403, 404, 429 |
| DELETE | `/v1/auth/devices/others` | __Host-seekalive_session + X-CSRF-Token | Sim | devices-revoke-others: 10/900s | — | 200 (application/json: OtherDevicesRevoked) | 200, 401, 403, 429 |
| DELETE | `/v1/auth/sessions/{sessionId}` | __Host-seekalive_session + X-CSRF-Token | Sim | session-revoke: 20/900s | sessionId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 400, 401, 403, 404, 409, 429 |
| DELETE | `/v1/auth/sessions/others` | __Host-seekalive_session + X-CSRF-Token | Sim | sessions-revoke-others: 10/900s | — | 200 (application/json: OtherSessionsRevoked) | 200, 401, 403, 429 |
| DELETE | `/v1/profiles/{username}/reviews/me` | __Host-seekalive_session + X-CSRF-Token | Sim | business-profile-review-delete: 30/60s | username (path obrigatório; string, mín. 3, máx. 20) | 200 (application/json: BusinessProfileReviewDeleted) | 200, 401, 403, 404, 429 |
| DELETE | `/v1/social/accounts/{accountId}/follow` | __Host-seekalive_session + X-CSRF-Token | Sim | Nenhum limitador de rota registrado | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 401, 403, 404 |
| DELETE | `/v1/social/blocks/{accountId}` | __Host-seekalive_session + X-CSRF-Token | Sim | Nenhum limitador de rota registrado | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 401, 403, 404 |
| DELETE | `/v1/social/comments/{commentId}` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-comment-delete: 30/60s | commentId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 401, 403, 404, 429 |
| DELETE | `/v1/social/comments/{commentId}/like` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-comment-unlike: 90/60s | commentId (path obrigatório; string (uuid)) | 200 (application/json: Comment) | 200, 401, 404, 429 |
| DELETE | `/v1/social/media/{assetId}` | __Host-seekalive_session + X-CSRF-Token | Sim | social-media-delete: 30/60s | assetId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 401, 404, 429 |
| DELETE | `/v1/social/posts/{postId}` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-delete: 30/60s | postId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 401, 403, 404, 429 |
| DELETE | `/v1/social/posts/{postId}/bookmark` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-unbookmark: 60/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 401, 404, 429 |
| DELETE | `/v1/social/posts/{postId}/like` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-unlike: 90/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 401, 403, 404, 429 |
| DELETE | `/v1/social/posts/{postId}/repost` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-unrepost: 30/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 401, 403, 404, 429 |
| GET | `/healthz` | Não declarado | Não | Nenhum limitador de rota registrado | — | 200 (application/json: HealthStatus) | 200 |
| GET | `/readyz` | Não declarado | Não | Nenhum limitador de rota registrado | — | 200 (application/json: ReadinessStatus) | 200, 503 |
| GET | `/v1/accounts/{accountId}` | __Host-seekalive_session ou visitante | Não | Nenhum limitador de rota registrado | accountId (path obrigatório; string (uuid)) | 200 (application/json: AccountView) | 200, 404 |
| GET | `/v1/accounts/availability` | Não declarado | Não | account-availability: 30/60s | username (query obrigatório; string, mín. 3, máx. 21) | 200 (application/json: AccountUsernameAvailability) | 200, 400, 429 |
| GET | `/v1/accounts/me` | __Host-seekalive_session | Não | Nenhum limitador de rota registrado | — | 200 (application/json: MyAccountResponse) | 200, 401, 404, 500 |
| GET | `/v1/accounts/me/privacy` | __Host-seekalive_session | Não | Nenhum limitador de rota registrado | — | 200 (application/json: PrivacySettings) | 200, 401, 404 |
| GET | `/v1/auth/csrf` | Não declarado | Não | Nenhum limitador de rota registrado | — | 200 (application/json: CsrfToken) | 200 |
| GET | `/v1/auth/devices` | __Host-seekalive_session | Não | devices-list: 60/900s | — | 200 (application/json: TrustedDevicePage) | 200, 401, 429 |
| GET | `/v1/auth/session` | __Host-seekalive_session ou visitante | Não | Nenhum limitador de rota registrado | — | 200 (application/json: CurrentSession) | 200 |
| GET | `/v1/auth/sessions` | __Host-seekalive_session | Não | sessions-list: 60/900s | cursor (query; string, máx. 16) | 200 (application/json: AuthSessionPage) | 200, 400, 401, 429 |
| GET | `/v1/profiles/{username}` | __Host-seekalive_session ou visitante | Não | Nenhum limitador de rota registrado | username (path obrigatório; string, mín. 3, máx. 20) | 200 (application/json: ProfileResponse) | 200, 404 |
| GET | `/v1/profiles/{username}/reviews` | __Host-seekalive_session ou visitante | Não | Nenhum limitador de rota registrado | username (path obrigatório; string, mín. 3, máx. 20); limit (query; integer, min 1, max 50); cursor (query; string, máx. 256) | 200 (application/json: BusinessProfileReviewPage) | 200, 400, 404 |
| GET | `/v1/social/accounts` | __Host-seekalive_session | Não | social-account-search: 60/60s | q (query obrigatório; string, mín. 2, máx. 80); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | 200, 400, 401 |
| GET | `/v1/social/accounts/{accountId}/followers` | __Host-seekalive_session ou visitante | Não | Nenhum limitador de rota registrado | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | 200, 400, 403, 404 |
| GET | `/v1/social/accounts/{accountId}/following` | __Host-seekalive_session ou visitante | Não | Nenhum limitador de rota registrado | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | 200, 400, 403, 404 |
| GET | `/v1/social/accounts/{accountId}/posts` | __Host-seekalive_session ou visitante | Não | feed-profile-content: 120/60s | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512); format (query; string) | 200 (application/json: PostPage) | 200, 400, 404 |
| GET | `/v1/social/articles/{postId}` | __Host-seekalive_session ou visitante | Não | feed-article-read: 120/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 404 |
| GET | `/v1/social/blocks` | __Host-seekalive_session | Não | Nenhum limitador de rota registrado | — | 200 (application/json: AccountList) | 200, 401 |
| GET | `/v1/social/circles` | __Host-seekalive_session | Não | Nenhum limitador de rota registrado | limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: CirclePage) | 200, 400, 401 |
| GET | `/v1/social/feed` | __Host-seekalive_session ou visitante | Não | feed-global-list: 120/60s | tab (query; string); q (query; string, mín. 2, máx. 120); limit (query; integer, min 1, max 50); cursor (query; string, máx. 512) | 200 (application/json: FeedPage) | 200, 400, 401, 429 |
| GET | `/v1/social/follow-requests` | __Host-seekalive_session | Não | Nenhum limitador de rota registrado | limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: FollowRequestPage) | 200, 400, 401 |
| GET | `/v1/social/media/{assetId}` | __Host-seekalive_session ou visitante | Não | social-media-read: 120/60s | assetId (path obrigatório; string (uuid)); Range (header; string) | 200 (image/jpeg: string (binary); image/png: string (binary); image/gif: string (binary); image/webp: string (binary); image/avif: string (binary); video/mp4: string (binary); video/webm: string (binary)); 206 (sem corpo) | 200, 206, 404, 416, 429 |
| GET | `/v1/social/posts/{postId}` | __Host-seekalive_session ou visitante | Não | feed-post-read: 120/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 404 |
| GET | `/v1/social/posts/{postId}/comments` | __Host-seekalive_session | Não | feed-comments-read: 120/60s | postId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512) | 200 (application/json: CommentPage) | 200, 400, 401, 404 |
| GET | `/v1/social/posts/{postId}/reference` | __Host-seekalive_session ou visitante | Não | feed-post-reference-read: 120/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: ReferencePreview) | 200, 404, 429 |
| PATCH | `/v1/accounts/me` | __Host-seekalive_session + X-CSRF-Token | Sim | account-profile-update: 30/900s | application/json: AccountPatch | 200 (application/json: MyAccountResponse) | 200, 400, 401, 403, 409, 429 |
| POST | `/v1/auth/account/deletion/code` | __Host-seekalive_session + X-CSRF-Token | Sim | account-deletion-code: 5/900s | application/json: AccountDeletionCodeRequest | 202 (application/json: AccountDeletionCodeResponse) | 202, 401, 403, 429, 503 |
| POST | `/v1/auth/account/deletion/confirm` | __Host-seekalive_session + X-CSRF-Token | Sim | account-deletion-confirm: 10/900s | application/json: AccountDeletionConfirmation | 200 (application/json: AccountDeletionScheduled) | 200, 400, 401, 403, 409, 429, 503 |
| POST | `/v1/auth/account/deletion/restore/code` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | account-restoration-code: 5/900s | application/json: LoginRequest | 202 (application/json: AccountDeletionCodeResponse) | 202, 400, 401, 409, 429, 503 |
| POST | `/v1/auth/account/deletion/restore/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | account-restoration-confirm: 10/900s | application/json: AccountRestorationConfirmation | 200 (application/json: AccountRestoredResponse) | 200, 400, 401, 409, 429, 503 |
| POST | `/v1/auth/account/email/change/confirm-current` | __Host-seekalive_session + X-CSRF-Token | Sim | account-email-change-current-confirm: 10/900s | application/json: ChallengeConfirmInput | 202 (application/json: EmailChangeNewCodeResponse) | 202, 400, 401, 403, 409, 423, 429, 503 |
| POST | `/v1/auth/account/email/change/confirm-new` | __Host-seekalive_session + X-CSRF-Token | Sim | account-email-change-new-confirm: 10/900s | application/json: ChallengeConfirmInput | 200 (application/json: AccountEmailChangeResult) | 200, 400, 401, 403, 409, 423, 429 |
| POST | `/v1/auth/account/email/change/request` | __Host-seekalive_session + X-CSRF-Token | Sim | account-email-change-request: 5/900s | application/json: AccountEmailChangeRequest | 202 (application/json: EmailChangeCurrentCodeResponse) | 202, 400, 401, 403, 409, 423, 429, 503 |
| POST | `/v1/auth/account/password/change/confirm` | __Host-seekalive_session + X-CSRF-Token | Sim | account-password-change-confirm: 10/900s | application/json: ChallengeConfirmInput | 200 (application/json: AccountPasswordChangeResult) | 200, 400, 401, 403, 409, 423, 429 |
| POST | `/v1/auth/account/password/change/request` | __Host-seekalive_session + X-CSRF-Token | Sim | account-password-change-request: 5/900s | application/json: AccountPasswordChangeRequest | 202 (application/json: PasswordChangeCodeResponse) | 202, 400, 401, 403, 409, 423, 429, 503 |
| POST | `/v1/auth/device-verification/confirm` | __Host-seekalive_pre_auth + __Host-seekalive_device + X-CSRF-Token | Sim | device-login-confirm: 10/900s | application/json: ChallengeConfirmInput | 200 (application/json: AuthResult) | 200, 400, 403, 423, 429 |
| POST | `/v1/auth/device-verification/resend` | __Host-seekalive_pre_auth + __Host-seekalive_device + X-CSRF-Token | Sim | device-login-resend: 5/900s | application/json: ChallengeResendInput | 200 (application/json: DeviceVerificationResent) | 200, 400, 423, 429, 503 |
| POST | `/v1/auth/login` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | login: 10/900s | application/json: LoginRequest | 200 (application/json: AuthResult); 202 (application/json: oneOf(DeviceVerificationRequired\|AccountDeletionPendingResponse)) | 200, 202, 400, 401, 403, 409, 423, 429, 503 |
| POST | `/v1/auth/logout` | __Host-seekalive_session + X-CSRF-Token ou __Host-seekalive_pre_auth + X-CSRF-Token | Sim | Nenhum limitador de rota registrado | — | 204 (sem corpo) | 204, 403 |
| POST | `/v1/auth/password/reset/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | password-reset-confirm: 10/900s | application/json: PasswordResetConfirm | 200 (application/json: PasswordResetComplete) | 200, 400, 409, 423, 429 |
| POST | `/v1/auth/password/reset/request` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | password-reset-request: 5/900s | application/json: PasswordResetRequest | 202 (application/json: PasswordResetRequested) | 202, 400, 429 |
| POST | `/v1/auth/password/update` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | password-update: 5/900s | application/json: PasswordPolicyUpdateRequest | 202 (application/json: PasswordUpdateChallenge) | 202, 400, 401, 403, 409, 423, 429, 503 |
| POST | `/v1/auth/password/update/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | password-update-confirm: 10/900s | application/json: ChallengeConfirmInput | 200 (application/json: PasswordUpdated) | 200, 400, 409, 423, 429 |
| POST | `/v1/auth/register` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | register: 5/900s | application/json: RegisterRequest | 202 (application/json: VerificationRequired) | 202, 400, 409, 429, 503 |
| POST | `/v1/auth/verification` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | verify-resend: 3/900s | application/json: EmailVerificationRequest | 202 (application/json: VerificationRequired) | 202, 400, 429, 503 |
| POST | `/v1/auth/verification/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | Sim | verify-confirm: 10/900s | application/json: EmailVerificationConfirm | 200 (application/json: EmailVerificationConfirmation) | 200, 400, 429 |
| POST | `/v1/onboarding/interests` | __Host-seekalive_session + X-CSRF-Token | Sim | Nenhum limitador de rota registrado | application/json: OnboardingInterestsRequest | 200 (application/json: OnboardingCompletionResult) | 200, 400, 401, 403 |
| POST | `/v1/profiles/{username}/reviews` | __Host-seekalive_session + X-CSRF-Token | Sim | business-profile-review-create: 30/60s | username (path obrigatório; string, mín. 3, máx. 20); application/json: BusinessProfileReviewCreate | 201 (application/json: BusinessProfileReviewCreated) | 201, 400, 401, 403, 404, 409, 429 |
| POST | `/v1/social/articles` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-article-create: 10/60s | application/json: ArticleCreate | 201 (application/json: Post) | 201, 401, 403, 422, 429 |
| POST | `/v1/social/follow-requests/{accountId}/accept` | __Host-seekalive_session + X-CSRF-Token | Sim | Nenhum limitador de rota registrado | accountId (path obrigatório; string (uuid)) | 200 (application/json: FollowState) | 200, 401, 403, 404 |
| POST | `/v1/social/follow-requests/{accountId}/decline` | __Host-seekalive_session + X-CSRF-Token | Sim | Nenhum limitador de rota registrado | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 401, 403 |
| POST | `/v1/social/media` | __Host-seekalive_session + X-CSRF-Token | Sim | social-media-upload: 20/60s | X-Seekalive-Media-Type (header obrigatório; string); application/octet-stream: string (binary) | 201 (application/json: MediaUpload) | 201, 401, 413, 415, 429, 503 |
| POST | `/v1/social/posts` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-create: 20/60s | application/json: PostCreate | 201 (application/json: Post) | 201, 401, 403, 422, 429 |
| POST | `/v1/social/posts/{postId}/comments` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-comment-create: 10/60s | postId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512); application/json: CommentCreate | 201 (application/json: Comment) | 201, 401, 403, 404, 409, 422, 429 |
| POST | `/v1/social/posts/{postId}/repost` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-repost: 30/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 401, 403, 404, 429 |
| PUT | `/v1/accounts/me/privacy` | __Host-seekalive_session + X-CSRF-Token | Sim | Nenhum limitador de rota registrado | application/json: PrivacySettingsWrite | 200 (application/json: PrivacySettings) | 200, 400, 401, 403, 409 |
| PUT | `/v1/profiles/{username}/reviews/{reviewId}/reply` | __Host-seekalive_session + X-CSRF-Token | Sim | business-profile-review-reply: 30/60s | username (path obrigatório; string, mín. 3, máx. 20); reviewId (path obrigatório; string (uuid)); application/json: BusinessProfileReviewReply | 200 (application/json: BusinessProfileReviewReplyResponse) | 200, 400, 401, 403, 404, 429 |
| PUT | `/v1/social/accounts/{accountId}/follow` | __Host-seekalive_session + X-CSRF-Token | Sim | social-follow: 60/60s | accountId (path obrigatório; string (uuid)) | 200 (application/json: FollowState) | 200, 400, 401, 403, 404 |
| PUT | `/v1/social/blocks/{accountId}` | __Host-seekalive_session + X-CSRF-Token | Sim | social-block: 30/60s | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | 204, 401, 403, 404 |
| PUT | `/v1/social/comments/{commentId}/like` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-comment-like: 90/60s | commentId (path obrigatório; string (uuid)) | 200 (application/json: Comment) | 200, 401, 404, 429 |
| PUT | `/v1/social/posts/{postId}/bookmark` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-bookmark: 60/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 401, 403, 404, 429 |
| PUT | `/v1/social/posts/{postId}/like` | __Host-seekalive_session + X-CSRF-Token | Sim | feed-post-like: 90/60s | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | 200, 401, 403, 404, 429 |

Este arquivo comprova o registro das rotas e documenta o contrato declarado. Não comprova a execução de cada handler, autorização em banco, persistência ou comportamento HTTP; essas evidências pertencem aos testes correspondentes.

---

<a id="secao-9"></a>
## 9. Dicionário de dados

Fonte: [`data-dictionary.md`](data-dictionary.md).

**Registro histórico de 29/10/2026:** a leitura somente de metadados daquele dia não encontrou `feed.posts`; a validação de `0005` foi feita em schemas temporários, sem alteração do schema principal. Esse retrato não representa o estado físico atual.

**Estado físico:** a referência permanente é `queries/development-database-catalog.sql`; o último retrato datado está em [Catálogo físico do banco de desenvolvimento — 31/10/2026](development-database-catalog-2026-10-31.md). Este dicionário documenta ownership e significado lógico; não fixa contagens como estado futuro nem presume que uma migration esteja aplicada. A coluna `feed.posts.media` armazena referências tipadas para ativos; `feed.post_references` guarda vínculos de uma publicação Social a outra publicação Social. Os binários de teste são locais ao desenvolvimento.

## Sources and boundaries

Reviewed frontend contracts in the account, profile, social, Seek, Shop, messaging and settings flows. Reviews belong to the commercial profile in Profiles, not to Seek. The API, generated contract and frontend integration are implemented; use the development catalog query for physical schema state. A review requires a 1–5 rating and 10–500 character comment; the commercial reply requires 3–500 characters.

- O mapa de ownership vigente está em `../../architecture/database-domains.md`. Ele organiza schemas lógicos no PostgreSQL compartilhado do desenvolvimento; não cria bancos físicos, credenciais ou conexões independentes. Shop está fora do escopo atual. `schema-core.sql` continua sendo uma proposta histórica e não deve ser executado como migração.
- One `accounts` identity is personal **or** commercial. A commercial profile extends that identity; it is not a separate login/account.
- Círculo exists only when two accounts follow one another and both follow edges are effective/accepted. It is derived from `follows`, not an independent request, invitation, membership, or table. One-way following is not Círculo; removing either edge removes the derived membership.
- Shuffle and Comunidades are out of product scope. There are no community/group entities, roles, memberships, invitations, or group posts.
- A API persiste privacidade, seguimentos, pedidos pendentes e bloqueios. Pedido pendente não concede acesso; após aprovação, a conta pode ver publicações `public` e `private` do perfil privado; conteúdo do Círculo exige seguimentos aceitos nos dois sentidos. Feed aplica essas decisões a publicações e mídias; mensagens ainda não têm API e deverão aplicar as regras quando forem construídas.
- A autenticação própria pela API já existe; conta real só entra após confirmar e-mail. O envio via Resend foi testado em desenvolvimento, mas não está habilitado para produção. A demonstração de preview é fictícia, somente no desenvolvimento e não cria sessão de API.
- Event interest, product discovery, business hours, and advertised service options do not imply checkout, payments, delivery dispatch, reservations, or appointment booking.

## Conventions and DTO mapping

All bare `id` columns are UUID primary keys generated by `gen_random_uuid()` (pgcrypto). Relationship tables use the explicitly listed composite keys. PostgreSQL defaults a foreign key to `NO ACTION` unless the migration specifies otherwise; this describes the SQL default, not the current action of every physical foreign key. Use `docs/api/backend/queries/development-database-catalog.sql` to inspect current development-database actions. `created_at`, `updated_at`, and operational timestamps are `timestamptz`; SQL defaults initialize timestamps but **do not automatically maintain `updated_at`**. The server must update it. Local opening times use `time`, exceptions use `date`; weekday 0 is Sunday. Nullable columns are optional data, not empty-string sentinels. SQL is authoritative for individual types and CHECK expressions.

## Tabelas implementadas no Drizzle

Esta lista representa o modelo no código, não uma afirmação de que todas as tabelas existam fisicamente no banco. Para o estado físico atual do banco de desenvolvimento, execute a consulta de catálogo em `queries/development-database-catalog.sql`; este documento não fixa esse estado.

| Tabela                          | Uso atual                                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `accounts`                      | Identidade única pessoal/comercial, username, nome público, bio, local, site, privacidade, preferências de mensagens/leitura, versão, status de verificação e bloqueio de segurança.                                                                               |
| `account_emails`                | E-mail normalizado e instante de confirmação.                                                                                                                                                                                                                      |
| `account_username_reservations` | Reserva temporária de um @ liberado, com prazo e vínculo opcional à conta de origem.                                                                                                                                                                               |
| `password_credentials`          | Hash Argon2id, versão da política de senha e instante de alteração.                                                                                                                                                                                                |
| `business_profiles`             | Perfil comercial canônico vinculado 1:1 à mesma conta Social, pertencente ao domínio Profiles. Seek consome uma projeção de descoberta.                                                                                                                            |
| `auth_challenges`               | Desafios de e-mail, login em instalação nova e troca de senha. Código/token como hash; hash temporário da nova senha também fica no desafio até a confirmação.                                                                                                     |
| `sessions`                      | Sessões opacas com hashes do token de sessão e CSRF, associadas à instalação confiável.                                                                                                                                                                            |
| `trusted_devices`               | Instalações de navegador/app reconhecidas por token revogável; somente hash é persistido, com primeiro/último acesso e revogação. Não armazena IP, user-agent ou fingerprint.                                                                                      |
| `account_interests`             | Interesses opcionais do onboarding, associados à conta.                                                                                                                                                                                                            |
| `account_follows`               | Seguimentos aceitos; Círculo é calculado pela presença das duas direções.                                                                                                                                                                                          |
| `account_follow_requests`       | Pedidos pendentes direcionados a perfis privados; a aprovação cria o follow aceito.                                                                                                                                                                                |
| `account_blocks`                | Bloqueio iniciado por uma conta; bloquear remove follows e pedidos pendentes em ambas as direções.                                                                                                                                                                 |
| `feed.posts`                    | Publicações de texto/artigo/mídia com audiência, autoria, estado de versão, referências tipadas a ativos, constraints, FK e índices.                                                                                                                               |
| `feed.post_references`          | Até uma publicação Social referenciada por publicação de origem; guarda o UUID original e uma FK anulável que é removida ao excluir o alvo, para deixar a prévia indisponível sem reter metadados do conteúdo apagado.                                             |
| `media.assets`                  | Metadados de foto/vídeo, titular, publicação, tipo, tamanho, estado e chave de armazenamento local temporário; uploads podem ser anexados por 24 horas e expirados são limpos no próximo upload, sem worker periódico. Binários só são aceitos em desenvolvimento. |

O schema Drizzle atual e seus índices/constraints ficam em `infra/database/src/schema/`. Mídia anexada a publicações já possui armazenamento de desenvolvimento; referências no Feed aceitam somente `social_post` nesta etapa e revalidam a leitura do alvo em cada prévia. Referências para Seek, Shop ou eventos permanecem no modelo futuro, sem rotas ativas. A API e a interface de avaliações comerciais pertencem a Profiles; após a aplicação autorizada de `profiles/0003_misty_rhodey.sql`, o catálogo de desenvolvimento confirma `profiles.business_profile_reviews` com seus índices, FKs e checks. A existência estrutural não comprova, por si só, o comportamento ponta a ponta das rotas de Reviews. Armazenamento permanente, galeria comercial, campos de avatar/capa, serviços comerciais completos, conversas, mensagens e moderação ainda não têm implementação completa.

Frontend DTOs use **camelCase**, SQL uses **snake_case**. Serializers, not accidental ORM field exposure, must bridge them:

| Frontend field or behavior                                                                                                        | Proposed storage / response rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User.id`, `authorId`, demo IDs such as `u1`                                                                                      | Real UUIDs; demo IDs are not insertable production IDs or migration seeds. Derive actor from session, never trust supplied `authorId`.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `accountType`, `commercialProfile`                                                                                                | `accounts.account_type` plus `profiles.business_profiles` and child tables; Seek receives a derived discovery projection.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `displayName`, `joinedAt`, `location`                                                                                             | `display_name`, `created_at`, `location_label`; location text is not a coordinate.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `avatarUrl`, `coverUrl`, `img`, `mediaUrls`, business `photos`/`videos`                                                           | Asset FKs or owner/purpose gallery query; return authorized asset URLs, never accept arbitrary external URLs as owned uploads.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `cityId`, `cityName`, `cityState`, `serviceAreas`                                                                                 | Seven-digit IBGE ID strings and city joins; service-area city IDs, not arbitrary display names. Validate IDs against an authoritative IBGE import; regex alone proves only shape.                                                                                                                                                                                                                                                                                                                                                        |
| `categoryKey`, `category`, `discoveryKind`                                                                                        | Category key/label join and `discovery_kind`; application checks category domain.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `openingHours`, `isOpen`, `distanceKm`                                                                                            | Hours and exceptions rendered in business timezone; distance is optional, computed only from approved data. No fabricated distance or stored device location.                                                                                                                                                                                                                                                                                                                                                                            |
| `stats`, `likes`, `comments`, `reposts`, `interested`, `unreadCount`                                                              | Aggregates over eligible rows; do not trust client counters. `shares` has no durable tracking model in core; do not invent a count.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `isFollowing`, `isInCircle`, `isBlocked`, `isBlockedByViewer`, `blocksViewer`, `isMuted`, `isLiked`, `isReposted`, `isBookmarked` | Viewer-specific projections, never global booleans on target accounts/content. A block from either side hides profiles/content and disables interaction for both; blocking removes follows and pending follow requests between the accounts. Only the blocker can unblock; those relations are not restored. `isInCircle` is derived from effective follows in both directions; no `circleStatus` exists.                                                                                                                                |
| Post `format`, legacy `type: text/video`, `article`                                                                               | Canonical `format` is text/media/article. Legacy `type` derives from attached asset kinds; `article_title`/`article_body` nest into `article`.                                                                                                                                                                                                                                                                                                                                                                                           |
| `mediaTypes`                                                                                                                      | Derive from `media_assets.kind` in `post_media.position` order, not an independently mutable array.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `reference: {type,id}`                                                                                                            | Keep public types `seek_entity` / `shop_item` / `social_post`. For `seek_entity`, an `event:`-prefixed ID → `seek_event_id` after stripping exactly one prefix and validating the remaining UUID; otherwise → `business_account_id`. `shop_item` → `shop_item_id`; `social_post` → `referenced_post_id`. Serialize event targets back as `seek_entity` with `event:` + UUID. Store only the UUID in the FK, never the prefix. Reject empty/malformed prefixed IDs; do not fall back to business lookup. One optional reference per post. |
| `replyToCommentId`, `parentPostId`                                                                                                | `parent_comment_id`, `parent_post_id`; reposts are independent relationship records, not copied content.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `CommercialProfileReview.rating`, preview `rating`, `ratingCount`                                                                 | Avaliações são propriedade de Profiles e aparecem/recebem ações no perfil comercial. Nota inteira de 1–5; Seek só poderá exibir uma projeção agregada somente leitura derivada de avaliações elegíveis.                                                                                                                                                                                                                                                                                                                                  |
| `businessReply`                                                                                                                   | `business_reply`, `business_replied_at`; somente o titular comercial avaliado pode criar/substituir a resposta.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `ShopItem.price`, `oldPrice`, event `price`                                                                                       | Current formatted strings are display DTOs only. Real `price_minor`, `old_price_minor` are integer minor units; BRL uses cents, paired with ISO currency. No float money or parsing localized labels at persistence boundaries. Free events use 0; unknown price must be resolved before publication, not silently 0.                                                                                                                                                                                                                    |
| Shop `store`, optional `sellerId`, event optional `organizerId`                                                                   | Required commercial seller/organizer FKs; store label joins account display name. Demo objects lacking seller/organizer need real data before persistence. Shop ratings/review counts have no product-review source in core; omit rather than repurpose business ratings.                                                                                                                                                                                                                                                                |
| Event `date`, `startsAt`                                                                                                          | Persist actual instant and IANA timezone; format `date` for display. DTO timestamps use ISO 8601 with timezone (normally UTC `Z`); date-only exceptions use `YYYY-MM-DD`. Never store localized date labels as event time.                                                                                                                                                                                                                                                                                                               |
| Message `isRead`, conversation `lastMessage`                                                                                      | Participant read watermark and latest authorized message query. No global read boolean; honor recipient read-receipt preference before disclosure.                                                                                                                                                                                                                                                                                                                                                                                       |
| Notification `entityId`, `isRead`                                                                                                 | Typed post/comment target or actor for relationship events; map deliberately to legacy DTO, `read_at != null`.                                                                                                                                                                                                                                                                                                                                                                                                                           |

No balance or wallet exists in core. Any future balance, ledger, fee, refund, or settlement uses **integer cents/minor units plus currency**, never JavaScript floating-point monetary arithmetic. PostgreSQL `bigint` may exceed JS safe integer range: serialize minor units as decimal strings or enforce an explicit safe-number API bound. Currency syntax checks are not an ISO currency registry.

## Dicionário do modelo proposto

As tabelas e colunas abaixo descrevem o modelo-alvo/proposto e incluem entidades que ainda não estão no schema Drizzle atual. A presença física desses objetos no banco de desenvolvimento não é afirmada aqui: consulte `queries/development-database-catalog.sql`. Este modelo não deve ser lido como inventário de implantação; a lista do modelo efetivo está na seção anterior. As políticas de acesso são requisitos de servidor, não grants/RLS implementados por este documento. “Public” sempre significa filtrado por estado, privacidade e bloqueios. PK e UNIQUE criam índices automaticamente; nem toda FK tem índice próprio.

### Identity, preferences and discovery

| Table / intent                                               | Columns                                                                                                                                                                                                                              | Keys / indexes / invariants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Required access                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `accounts` — identidade canônica                             | `id`, `username`, `first_name`, `last_name`, `age`, `accepted_terms_version`, `terms_accepted_at`, `display_name`, `account_type`, `bio`, `location_label`, `website_url`, `avatar_asset_id`, `cover_asset_id`, `status`, timestamps | Username normalizado e único; idade autodeclarada entre 18 e 120; tipo pessoal/comercial; nome e sobrenome obrigatórios para conta pessoal. Estados usados atualmente: `pending_verification` → `active`; exclusão: `deletion_pending` por sete dias → `deletion_retained` por mais 90 dias → remoção física da linha. `suspended` não possui fluxo de suspensão implementado; `deleted` não é estado persistido. Versão/data dos termos aceitos; unique `(id, account_type)`; FKs de mídia adicionadas após a tabela de ativos. | Perfil público exclui nome civil, idade, e-mail, estado de confirmação e dados de sessão; não há selo público na v1. A coluna `accounts.is_verified` ainda existente no banco de desenvolvimento é legada e não deve ser retornada; e-mail verificado é controlado por `account_emails.verified_at`.   |
| `account_emails` — endereço privado da conta                 | `account_id`, `email_normalized`, `verified_at`, timestamps                                                                                                                                                                          | Uma linha inicial por conta; e-mail normalizado e único; `verified_at` vazio mantém a conta sem acesso.                                                                                                                                                                                                                                                                                                                                                                                                                          | Dono e serviços de autenticação; somente confirmação de token marca o e-mail e ativa a conta. Nunca incluído no DTO público.                                                                                                                                                                           |
| `password_credentials` — credencial própria da API           | `account_id`, `password_hash`, `password_policy_version`, `password_changed_at`, `created_at`                                                                                                                                        | Relação um-para-um com a identidade; armazena apenas hash Argon2id codificado; senha e confirmação não são persistidas. Versão `0` identifica credenciais existentes antes da migração; versão atual exige 8–128 caracteres, maiúscula, minúscula, número e caractere especial.                                                                                                                                                                                                                                                  | Apenas autenticação e atualização controlada da senha; nunca retornar hash ou gravar senha em log/telemetria. Senha legada compatível sobe de versão após login bem-sucedido; incompatível exige troca com a senha atual.                                                                              |
| `auth_challenges` — verificação e recuperação                | `id`, `account_id`, `purpose`, `token_hash`, `attempts`, `created_at`, `expires_at`, `consumed_at`                                                                                                                                   | HMAC-SHA256 de código de seis dígitos; propósito limitado a verificação ou recuperação; expiração de 10 minutos, máximo de cinco tentativas e uso único.                                                                                                                                                                                                                                                                                                                                                                         | Recuperação só para conta ativa com e-mail verificado; resposta anti-enumeração; consumo, hash Argon2id e revogação de sessões na mesma transação. O envio ocorre após a resposta e ainda não tem outbox persistente; falha de entrega consome o desafio.                                              |
| `sessions` — sessão gerida pela API                          | `id`, `account_id`, `token_hash`, `csrf_token_hash`, `password_policy_version`, `created_at`, `expires_at`, `revoked_at`                                                                                                             | FK direta à conta; hash do token único; sessão só é válida quando sua versão coincide com a política atual da credencial. Não armazena IP, user-agent, fingerprint ou último acesso; a tela lista somente sessões ativas.                                                                                                                                                                                                                                                                                                        | Cookie opaco `Secure`, `HttpOnly`, `SameSite=Lax`; apenas hash persistido; API lista e revoga sessões da própria conta, e pode encerrar todas as outras preservando a atual. Sessões antigas com versão `0` exigem novo login após a migração. Nenhuma alteração de schema foi necessária nesta etapa. |
| `account_settings` — privacy/locale                          | `account_id`, `private_profile`, `messages_from`, `read_receipts`, `locale`, `timezone`, `updated_at`                                                                                                                                | Account PK/FK; message enum everyone/circles/nobody.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Self only; server consults settings for every relevant action. Validate locale and IANA zone. If private, new followers require owner approval. Do not create a separate Círculo-request setting.                                                                                                      |
| `categories` — controlled taxonomy                           | `key`, `label`, `domain`, `active`                                                                                                                                                                                                   | Text PK; domain business/event/shop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Public read; curated admin write. Server validates the target table's category domain.                                                                                                                                                                                                                 |
| `cities` — Brazilian municipalities                          | `ibge_id`, `name`, `state_code`, `timezone`                                                                                                                                                                                          | Seven-digit text PK; two-uppercase-letter state shape; lower(name)+state index.                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Public read; authoritative controlled imports only, no fabricated municipality seeds.                                                                                                                                                                                                                  |
| `business_profiles` — extensão comercial da mesma identidade | `account_id`, constant `account_type`, `category_key`, `city_id`, `discovery_kind`, `address`, `postal_code`, `country_code`, `timezone`, `price_level`, `amenities`, `tags`, `service_options`, `updated_at`                        | Account PK/FK; composite (account_id, account_type) FK com restrição comercial; city/category/kind index; `country_code` ISO; opções de serviço true/false/unknown; só `true` aparece publicamente.                                                                                                                                                                                                                                                                                                                              | Perfil comercial público conforme configuração de descoberta; titular edita. Endereço residencial de prestador não deve ser exposto como endereço comercial sem autorização explícita.                                                                                                                 |
| `business_hours` — weekly local intervals                    | `id`, `business_account_id`, `weekday`, `opens_at`, `closes_at`                                                                                                                                                                      | Unique business+weekday+opening; 0–6 day; closing after opening. Unique index supports owner/day lookup.                                                                                                                                                                                                                                                                                                                                                                                                                         | Owner write; public read. Server prevents overlapping intervals. Overnight intervals split across weekdays; use `24:00` for end of day.                                                                                                                                                                |
| `business_hour_exceptions` — date overrides                  | `id`, `business_account_id`, `local_date`, `is_closed`, `opens_at`, `closes_at`                                                                                                                                                      | Unique business+date; closed has no times, open has both ordered times.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Owner write; public read. Overrides weekly hours entirely. Core supports one open interval per exception date; multiple exceptional shifts require extension.                                                                                                                                          |
| `business_service_areas` — city coverage                     | `business_account_id`, `city_id`                                                                                                                                                                                                     | Composite PK, reverse city index; both FKs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Owner write; public discovery read. Coverage is city-level, not a geofence or delivery guarantee.                                                                                                                                                                                                      |
| `media_assets` — managed object metadata                     | `id`, `owner_account_id`, `object_key`, `kind`, `mime_type`, `byte_size`, `width`, `height`, `duration_ms`, `status`, `purpose`, `created_at`, `expires_at`                                                                          | Unique object key; owner+purpose+creation index; non-ready expiry index; positive bytes/dimensions; image/video; pending/ready/quarantined status.                                                                                                                                                                                                                                                                                                                                                                               | Owner upload intent; scan worker controls readiness. Ready is not equivalent to public: delivery must recheck referencing resource audience. Gallery assets use owner+business_gallery purpose.                                                                                                        |

### Social content and graph

The table below describes the broader proposed cross-domain reference model, not the active schema. The implemented Feed track currently permits only a `social_post` reference in `feed.post_references`; Seek, Shop and event targets have no active persistence contract.

| Table / intent                                          | Columns                                                                                                                                     | Keys / indexes / invariants                                                                                                                                     | Required access                                                                                                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `posts` — text/media/articles                           | `id`, `author_id`, `content`, `format`, `audience`, `article_title`, `article_body`, `parent_post_id`, `status`, `created_at`, `updated_at` | Author/time, published-public/time, parent indexes; 280 text chars; article title 1–160 and body 1–50,000; title/body only for articles; no direct self-parent. | Author creates/edits/deletes; visibility checked on every fetch, search, preview and interaction. Media presence/nonempty publication needs transaction checks.                                                         |
| `post_media` — ordered attachments                      | `post_id`, `asset_id`, `position`, `alt_text`                                                                                               | PK post+asset; unique post+position; position 0–7 caps attachments at eight; asset reverse index; delete post cascades join only.                               | Same visibility as post; writer must own ready assets; never rely on client media type.                                                                                                                                 |
| `post_mentions` — resolved accounts                     | `post_id`, `mentioned_account_id`                                                                                                           | Composite PK; reverse account+post index.                                                                                                                       | Author/server extraction writes; read through visible post; notification only if recipient can see post and interaction is allowed.                                                                                     |
| `hashtags` — normalized vocabulary                      | `id`, `normalized_tag`                                                                                                                      | Unique nonempty tag, up to 100 chars.                                                                                                                           | Controlled server upsert after Unicode/locale normalization; public tag suggestions must not reveal private usage.                                                                                                      |
| `post_hashtags` — token associations                    | `post_id`, `hashtag_id`                                                                                                                     | Composite PK; reverse hashtag+post index.                                                                                                                       | Server maintains atomically with post edits; discovery always filters visible posts.                                                                                                                                    |
| `post_references` — proposed future cross-domain target | `post_id`, nullable `business_account_id`, `shop_item_id`, `referenced_post_id`, `seek_event_id`                                            | Proposed Post PK/FK; exactly one typed target; each target has FK and index; no direct self-reference.                                                          | Future model only. Active Feed implementation is social-post-only as specified in `Tabelas implementadas no Drizzle`; never expose targets that are not readable now.                                                   |
| `comments` — replies within a post                      | `id`, `post_id`, `author_id`, `parent_comment_id`, `content`, `status`, `created_at`, `updated_at`                                          | Unique (id, post_id); composite parent/post FK forces same post; no direct self-parent; 1–2,000 trimmed chars; post/time, parent/post, author indexes.          | Author write, authorized post viewers read; lock/check live parent and prevent cycles; parent/post association immutable through API.                                                                                   |
| `comment_likes` — one reaction                          | `comment_id`, `account_id`, `created_at`                                                                                                    | Composite PK, account reverse index.                                                                                                                            | Session actor adds/removes own like only on readable, eligible comment/post.                                                                                                                                            |
| `post_likes` — one reaction                             | `post_id`, `account_id`, `created_at`                                                                                                       | Composite PK, account reverse index.                                                                                                                            | Session actor own mutations; current target access required.                                                                                                                                                            |
| `reposts` — non-copying boost                           | `id`, `post_id`, `account_id`, `created_at`                                                                                                 | Unique post+account; account/time index.                                                                                                                        | Own mutation; proposed policy permits repost of published public posts from public profiles only; recheck source visibility on rendering.                                                                               |
| `follows` — relação direcionada                         | `follower_id`, `followed_id`, `status`, `created_at`                                                                                        | PK do par; sem auto-seguimento; índice de entrada; pending/accepted.                                                                                            | Perfil público aceita imediatamente; privado aguarda aprovação. Bloquear remove os dois follows e pedidos pendentes entre as contas. Círculo é projeção de dois follows aceitos; nunca tem tabela própria.              |
| `blocks` — bloqueio iniciado por uma conta              | `blocker_id`, `blocked_id`, `created_at`                                                                                                    | PK direcionada; índice reverso; sem auto-bloqueio.                                                                                                              | Bloqueio em qualquer sentido oculta perfil/conteúdo e impede interação para ambos. Somente o iniciador remove sua linha; remover não restaura follows/pedidos. Mensagens são mantidas mas ocultadas durante o bloqueio. |
| `mutes` — viewer filtering                              | `muter_id`, `muted_id`, `created_at`                                                                                                        | Pair PK; reverse muted index; self-mute forbidden.                                                                                                              | Muter only; suppress feed/notification delivery without treating mute as access denial.                                                                                                                                 |

### Commercial-profile reviews, Seek discovery, Shop and saves

Reviews are created, listed, deleted and answered in the commercial-profile experience. Their owner is the commercial identity in Profiles; Seek does not own review operations or storage. `profiles/0003_misty_rhodey.sql` was applied to the development database on 31/10/2026; the dated catalog confirms the physical table. Refresh the catalog query to verify any later state.

| Table / intent                                                      | Columns                                                                                                                                                                                                        | Keys / indexes / invariants                                                                                                                                                                                                                                                                                                                | Required access                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles.business_profile_reviews` — avaliação de perfil comercial | `id`, `business_account_id`, `reviewer_account_id`, `rating`, `comment`, `business_reply`, `business_replied_at`, `created_at`                                                                                 | UUID PK; FKs para `profiles.business_profiles.account_id` e `accounts.accounts.id`, ambas cascade; unique business+reviewer; índices business+created/id e reviewer; nota 1–5; comentário aparado 10–500; resposta nula ou aparada 3–500 com timestamp consistente; proibido autoavaliação. Estado físico em 31/10/2026: confirmado no catálogo de desenvolvimento; consultar novamente para estado futuro. | Perfil público legível; avaliador deve ser conta pessoal ativa/verificada; uma avaliação por pessoa/comércio; titular comercial responde; autor pode excluir e republicar. Bloqueio e privacidade do perfil são reaplicados nas leituras. |
| `seek_events` — discovery event                                     | `id`, `organizer_account_id`, `city_id`, `category_key`, `name`, `description`, `venue`, `starts_at`, `ends_at`, `timezone`, `price_minor`, `currency`, `cover_asset_id`, `status`, `created_at`, `updated_at` | Required business organizer FK, city/category/asset FKs; ordered times, nonnegative price; city/status/start and organizer indexes.                                                                                                                                                                                                        | Organizer writes; public reads published/eligible events, organizer sees drafts; server validates timezone and status transitions. Interest does not reserve a ticket.                                                                    |
| `event_interests` — intent to attend                                | `event_id`, `account_id`, `created_at`                                                                                                                                                                         | Composite PK; reverse account index.                                                                                                                                                                                                                                                                                                       | Actor own add/remove; eligible event required; counts public, interested-user lists require privacy review.                                                                                                                               |
| `shop_items` — product listing, not order                           | `id`, `seller_account_id`, `category_key`, `name`, `description`, `tag`, `price_minor`, `old_price_minor`, `currency`, `cover_asset_id`, `status`, `created_at`, `updated_at`                                  | Required business seller; nonnegative integer money; old price absent or >= price; seller/status and category/status indexes.                                                                                                                                                                                                              | Seller writes; public eligible listing reads; no stock, purchase, shipping or payment promises.                                                                                                                                           |
| `saved_resources` — private bookmarks                               | `id`, `account_id`, nullable `post_id`, `business_account_id`, `event_id`, `shop_item_id`, `created_at`                                                                                                        | Exactly one typed FK; `event_id` references the same `seek_events(id)` target as `post_references.seek_event_id`; four partial unique account+target indexes; owner/time index.                                                                                                                                                            | Owner only; normalize prefixed event IDs before storage. Saving does not confer access after privacy/status changes. Lists reauthorize each target, with unavailable entries handled without metadata leakage.                            |

### Messaging, safety and operations

| Table / intent                                           | Columns                                                                                                                                                                                       | Keys / indexes / invariants                                                                                                                           | Required access                                                                                                                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversations` — message container                      | `id`, `created_by_id`, `created_at`                                                                                                                                                           | Creator FK/index.                                                                                                                                     | Create through transactional participant-policy checks; participants only. Core storage permits multiple participants but does not claim a group-chat UI. Current direct-chat service must require exactly two eligible accounts.            |
| `conversation_participants` — membership/read state      | `conversation_id`, `account_id`, `joined_at`, `left_at`, `last_read_at`                                                                                                                       | Pair PK; account/conversation index; departure not before joining.                                                                                    | Server manages membership; actor may advance own read watermark/leave. Active membership and allowed history interval checked on reads; watermark monotonicity enforced transactionally.                                                     |
| `messages` — text-only messages                          | `id`, `conversation_id`, `sender_id`, `content`, `created_at`, `deleted_at`                                                                                                                   | Composite participant FK proves sender has membership row, not active membership; 1–5,000 trimmed chars; conversation/time/id and sender indexes.     | Active eligible participants only; verify DM preference/blocks and membership under lock for sends. No attachment, encryption-at-rest claim, or end-to-end encryption claim here.                                                            |
| `notifications` — private inbox                          | `id`, `recipient_id`, `actor_id`, `kind`, `post_id`, `comment_id`, `read_at`, `created_at`                                                                                                    | Typed FKs, at most one post/comment; kind enum matches frontend; recipient/time/id and unread-recipient indexes.                                      | Server creates after eligibility checks; recipient reads/marks read; reauthorize source on render. Server validates which target is required for each kind (not enforced by CHECK).                                                          |
| `push_subscriptions` — delivery endpoints                | `id`, `account_id`, `endpoint`, `p256dh`, `auth_secret_ciphertext`, `created_at`, `expires_at`, `revoked_at`                                                                                  | Unique HTTPS-shaped endpoint; owner index.                                                                                                            | Owner register/revoke, delivery worker reads encrypted secret. Authenticate endpoint reassignment; validate permitted endpoint origins and prevent SSRF; no secrets in API output/logs.                                                      |
| `reports` — typed safety queue                           | `id`, `reporter_id`, nullable `reported_account_id`, `post_id`, `comment_id`, `message_id`, `business_review_id`, `event_id`, `shop_item_id`, `reason`, `status`, `created_at`, `resolved_at` | Exactly one target FK; reason 1–2,000 chars; status/time and reporter indexes.                                                                        | Reporter submits accessible target and sees sanitized own progress; moderators see minimum evidence needed. Reporting a message requires membership; report is not an access bypass.                                                         |
| `moderation_actions` — review decisions                  | `id`, `report_id`, `moderator_id`, `action`, `reason`, `created_at`, `expires_at`                                                                                                             | Report and moderator FKs/indexes; allowlisted actions.                                                                                                | Privileged safety service only; moderator role is validated by trusted server authorization, not any `accounts` flag. Every action refers to a report; proactive actions first create an internal report through controlled service.         |
| `audit_logs` — security trace                            | `id`, `actor_id`, `action`, `resource_type`, `resource_id`, `request_id`, `metadata`, `created_at`, `retain_until`                                                                            | Resource/time and retention indexes; retain_until after creation; JSON object. Resource descriptor intentionally not an FK so traces survive removal. | Append-only application role, restricted audit readers and separate purge role. SQL does not itself grant append-only enforcement. Metadata must not contain credentials, message bodies, device coordinates, or arbitrary request payloads. |
| `outbox_events` — reliable async side effects            | `id`, `event_type`, `aggregate_type`, `aggregate_id`, `payload`, `created_at`, `available_at`, `processed_at`, `attempts`, `last_error_code`                                                  | Pending available/id partial index; nonnegative attempts; object payload. Aggregate descriptor intentionally not a polymorphic FK.                    | Server writes in same transaction as domain mutation; workers claim with locks, retry idempotently, minimize payload. Event delivery is at-least-once, not exactly-once.                                                                     |
| `idempotency_keys` — authenticated command deduplication | `account_id`, `operation`, `key`, `request_hash`, `status`, `response_status`, `response_body`, `created_at`, `expires_at`                                                                    | Composite PK scopes keys by actor+operation; 32-byte hash; HTTP status range; expiry index.                                                           | Server only; lock/conflict-check key, reject same key with different request hash; authorize again before returning stored response. Avoid sensitive response bodies.                                                                        |
| `webhook_receipts` — trusted provider deduplication      | `id`, `provider`, `provider_event_id`, `payload_hash`, `status`, `received_at`, `processed_at`, `expires_at`                                                                                  | Unique provider+event; 32-byte hash; expiry index.                                                                                                    | Verified webhook adapter only; authenticate signature/timestamp/replay window **before** insert; do not store full payload by default. Not a claim of a live payment integration.                                                            |
| `privacy_requests` — export/delete/rectify workflow      | `id`, `account_id`, `kind`, `status`, `requested_at`, `due_at`, `completed_at`, `export_object_key`, `export_expires_at`                                                                      | Owner/request time and status/due indexes; due after request; paired export key/expiry only for export requests.                                      | Verified requester sees sanitized own state; privacy worker processes. Export downloads are authorized, short-lived signed URLs, not public asset rows. Service enforces legal deadlines and completion transition rules.                    |

## Constraints SQL enforces, and what it does not

### Identity and commercial invariants

The commercial-only invariant does **not** depend on an unchecked comment: `business_profiles.account_type` is constrained to `commercial`, and `(account_id, account_type)` references the unique pair in `accounts`. The ordinary `account_id` PK/FK is also present. This is a declarative alternative to a constraint trigger; changing an account back to personal while a business profile remains is rejected. Seller/organizer/review target FKs refer to `business_profiles`, transitively enforcing commercial identity. Creating a commercial account/profile together, changing types safely, and requiring every active commercial account to have a profile are application transaction responsibilities. The schema allows a commercial account before profile completion.

Na autenticação própria, a API armazena senha com Argon2id, emite sessão opaca em cookie **Secure, HttpOnly, SameSite**, protege escritas com CSRF e limita tentativas. Tokens de verificação/recuperação são armazenados como hash; nunca colocar senha ou token de sessão em `localStorage`. `schema-core.sql` permanece apenas como referência dos domínios futuros.

### Required authorization transactions

1. Obtain actor from the authenticated session; check account active status and resource status. Service/database credentials never reach the browser. There are no implemented RLS policies or GRANTs in this proposal; SQL integrity is **not** app privacy.
2. Proposed post policy: author may read own eligible content; `private` means author only; `circles` means both effective follow edges exist; `public` is visible subject to blocks and, for a private profile, approved follow access. Private-profile gating and Círculo audience checks intersect for non-author viewers. Deleted/removed content is restricted to explicitly authorized owner/moderation workflows.
3. Resolve blocks in **both** directions. A block operation locks both accounts in canonical UUID order, creates the block and removes follows in both directions, which also removes derived Círculo membership; cancel queued deliveries where appropriate. Relationship creation/acceptance, communication and settings changes must use the same lock protocol or serializable transactions with retries to avoid races. Unblocking does not resurrect follows.
4. Círculo is computed from reciprocal effective follows. A request, approval, rejection, cancellation, or removal API for Círculo itself is forbidden by this rule. Follow-request transitions may still exist for private profiles, but need their own confirmed policy and UI; they are not Círculo actions.
5. Publication transaction checks nonempty short text or attached media for non-articles, at least one asset for media format, at most eight matching ready owned assets, valid URLs/purposes, article requirements, target readability, mentions and hashtag normalization. Persist post, attachments, tokens, reference and outbox together. SQL caps slots and article lengths but does not prove an attachment exists or is ready/owned.
6. Validate both raw and trimmed lengths consistently with frontend validation. SQL `char_length` measures Unicode characters whereas JS length uses UTF-16 code units; implement a documented canonical counting rule in the future API/DTO validator, test emoji boundaries, and do not claim perfect parity today. Normalize hashtags using the frontend's pt-BR lowercasing plus a deliberate Unicode normalization rule.
7. Authorize comments, replies, likes, interests, reviews, reposts and saves against current target access. Parent/referenced post graphs must not become cyclic; SQL prohibits self-links but not multi-row cycles. Keep parent IDs immutable through the API; check ancestor chains if moves are introduced.
8. Only reviewers modify their review fields; only reviewed business modifies reply; moderators alone change safety status. SQL cannot infer actor from a mutation. Rating averages exclude null and removed reviews; review uniqueness survives soft deletion.
9. Conversation creation inserts all participants atomically after DM policy checks. Lock participants/policies for sends; existence of a participant FK does not prove `left_at IS NULL`. Recheck blocks before delivery. Do not disclose another participant's read state when read receipts are disabled. Serialize concurrent creation for the same unordered direct-chat pair to prevent duplicates (no direct-pair unique constraint here).
10. Public feeds, search, hashtag counts, notification previews, reference previews, media URLs and caches must use the same visibility predicate. A previously saved/liked/referenced resource confers no continuing read entitlement. Cache keys include viewer/policy scope; invalidate on audience, follow/friend, block and status changes.
11. Validate category domain, IANA timezone names, meaningful event/venue data, publish transitions and approved asset ownership in services. JSON option shape checks do not enforce option keys/types. Weekly hours overlap checks require business-row locking; exception day overrides need timezone-aware calculation, including DST.
12. Use transactionally written outbox entries for async effects. Claim/retry workers with row locking, bounded backoff and deduplication; check current visibility again before push/email. Generic outbox/audit descriptors are operational references, not substitutes for typed core content FKs. Idempotency response storage and webhook receipt insertion alone do not make side effects atomic.

## Retention, deletion and geography

These are proposed defaults requiring product/security/legal approval and actual workers; timestamp columns do not delete data. Never persist device latitude/longitude by default, including in sessions, audit metadata, outbox payloads, request logs or analytics. Strip image EXIF/GPS during processing. A user-selected municipality may be persisted as a city choice through a future explicit preference; it is not permission to save location history. Business address is voluntarily supplied business data.

- Sessions: proposed maximum 30-day lifetime; logout/recovery/deletion revokes sessions immediately. A proposed seven-day purge of expired/revoked session rows applies only to accounts not in deletion. Exception: sessions for `deletion_pending`/`deletion_retained` accounts stay revoked but are retained with the account until its physical purge after the seven-day restoration cutoff plus 90 days; no independent session-purge worker is implemented today. No device fingerprint/IP column.
- Pending upload intents: set `expires_at` within 24 hours; purge abandoned objects and metadata. Quarantine: deny all delivery immediately, review/purge within 30 days unless documented legal hold. Ready assets retained only while needed by owner/resources; garbage collector checks all asset FKs and gallery purpose.
- Idempotency entries: proposed 24-hour TTL. Webhook receipts: proposed 30-day dedupe window; any provider with longer replay/retry requires an explicit adjusted policy. Processed outbox entries: purge within 7 days; failed entries enter restricted review and must not be kept indefinitely.
- Push: revoke on logout opt-out/deletion and remove invalid endpoints promptly; periodically confirm inactive subscriptions, with a proposed 90-day inactivity purge managed by worker metadata/policy.
- Notifications: proposed 90 days. Content and messages: retained while needed for the user-facing service, with account deletion initiating erasure/anonymization and object/cache cleanup within a proposed 30-day operational target unless a justified legal hold applies.
- Audit/safety evidence: require purpose-specific `retain_until`/worker retention policy, proposed 180 days for ordinary audit; minimum necessary report evidence, restricted access and documented legal exceptions. Do not use audit logs as an indefinite copy of deleted content. Moderation/report records and related account FKs require a deliberate anonymization/purge plan.
- Privacy exports: expire within 24 hours, remove object after expiry. `due_at` is calculated from applicable jurisdiction, not a universal hard-coded legal deadline; verify requester and record completion. Request records retained only as long as necessary to demonstrate handling under an approved schedule.

Most domain deletes intentionally use restrictive FKs, not giant cascades. Soft deletion changes status first, revokes sessions and hides content but is **not erasure**. A deletion worker must order relation cleanup, redact/tombstone retained rows only where justified, remove asset references, erase objects and search/cache copies, and eventually delete account PII. Account-to-asset cycles are resolved by clearing avatar/cover before deleting owner assets. Retention exceptions must have an authorized purpose and deadline. Backups require separately defined expiry and restoration deletion replay; this SQL does not solve backup erasure.

**No geospatial columns or PostGIS dependency are present.** City lookup/service coverage is core; proximity requires real, approved geocoding and consent. Do not fabricate coordinates from demo `distanceKm`. Optional future public-business geography could add `latitude double precision CHECK (latitude BETWEEN -90 AND 90)` and `longitude double precision CHECK (longitude BETWEEN -180 AND 180)` with a both-null-or-both-set CHECK. If PostGIS is deliberately enabled, the exact point expression is:

```sql
ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
```

Longitude is first. An exact matching optional expression index would be:

```sql
CREATE INDEX business_profiles_location_gist ON business_profiles
USING gist ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography))
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

These snippets are **future design only**, cannot run against the core without adding the documented columns and installing PostGIS, and are not an instruction to do so. Query with the same expression/predicate using `ST_DWithin(..., query_point::geography, radius_meters)`. Device coordinates used as a query point must stay ephemeral; never write them to these business coordinates.

## Non-core extensions and known limits

- Checkout: orders, line items with price snapshots, payment intents, refunds, disputes, tax, payouts and balanced ledger are future scope. No core balance or order tables.
- Delivery: addresses with explicit retention/consent, delivery zones/fees, fulfillment status, courier assignment and tracking are future scope. No location tracking by default.
- Booking: services, staff/resources, availability, holds, conflict prevention, reservations/appointments and cancellation policies are future scope.
- Product reviews, stock/SKUs/variants, multi-image listing galleries, recurring events/tickets, Communities, named circles, group administration, message attachments and richer hour exceptions are not implied by core.
- UUID/IBGE IDs and required seller/organizer/city/time data need explicit DTO evolution/import validation. Demo fixture values are not authentic seed records. No rows are inserted by the SQL.
- Limits at launch still need policy: upload sizes/MIME signatures, allowed origins, relationship/report rate limits, listing description lengths, pagination, quotas, spam controls, timezone/currency registries and business verification. SQL provides foundational checks, not a full abuse-control specification.
- Operational roles, RLS defense-in-depth, encryption key management, scheduler/worker implementation, migrations, rollback, backup/restore and performance/load tests remain implementation work.

## Static review (not execution)

The core currently contains **43 proposed tables**, including custom email, password-credential, challenge, and session structures. The count describes this documentation draft only; no migration, live rows, or runtime validation are asserted.

The larger SQL design in `schema-core.sql` remains a reference proposal and was not run. The initial 31/10/2026 catalog snapshot preceded the Profiles Reviews migration; the current physical state is recorded in [`development-database-catalog-2026-10-31.md`](development-database-catalog-2026-10-31.md) and must be refreshed from the read-only catalog query rather than inferred from this paragraph. Feed and Media use independent migration ledgers. Local media binaries are development-only. Production was not accessed. The API integration and baseline migration replay were run in isolated development schemas and passed; neither result alone proves the full Reviews HTTP flow.

---

<a id="secao-10"></a>
## 10. Catálogo físico do banco de desenvolvimento — 31/10/2026

Fonte: [`development-database-catalog-2026-10-31.md`](development-database-catalog-2026-10-31.md).

## Escopo e método

Consulta inicial executada em **31/10/2026**, no ambiente **development**, usando a conexão PostgreSQL de desenvolvimento. O identificador retornado por `current_database()` foi `heliumdb`. Depois, no mesmo dia, uma nova consulta somente leitura foi executada após a aplicação autorizada de `profiles/0003`.

As duas leituras usaram [`queries/development-database-catalog.sql`](queries/development-database-catalog.sql), que consulta catálogos PostgreSQL para enumerar relações, índices, constraints e ações referenciais, sem ler linhas de negócio. A migration foi uma operação separada, limitada ao track Profiles no banco de desenvolvimento; não houve `push` nem acesso à produção.

Este documento é um retrato datado, não uma garantia de estado futuro. Para atualizar o estado, execute novamente a consulta indicada em ambiente de desenvolvimento e registre uma nova data; não substitua a consulta por contagens fixas nos documentos gerais.

## Resumo atual após `profiles/0003`

| Schema | Relações (tabelas) | Índices | Constraints |
|---|---:|---:|---:|
| `accounts` | 4 | 10 | 9 |
| `drizzle` | 6 | 6 | 6 |
| `feed` | 8 | 20 | 32 |
| `media` | 1 | 5 | 7 |
| `profiles` | 6 | 13 | 23 |
| `security` | 4 | 11 | 9 |
| **Total** | **29** | **65** | **86** |

As 29 relações atuais retornadas são tabelas; as consultas não retornaram views, views materializadas, tabelas particionadas ou tabelas externas. O schema `drizzle` contém seis tabelas de journal de migrations: `accounts_migrations`, `feed_migrations`, `media_migrations`, `profiles_migrations`, `security_migrations` e `seek_migrations`. Journals não são tabelas de domínio. O snapshot inicial, antes da migration, continha 28 tabelas, 61 índices e 79 constraints.

### Tabelas observadas por domínio

- `accounts`: `accounts`, `account_emails`, `account_interests`, `account_username_reservations`.
- `feed`: `posts`, `post_references`, `post_tags`, `post_comments`, `post_likes`, `post_reposts`, `post_bookmarks`, `comment_likes`.
- `media`: `assets`.
- `profiles`: `account_profiles`, `business_profiles`, `business_profile_reviews`, `account_follows`, `account_follow_requests`, `account_blocks`.
- `security`: `password_credentials`, `auth_challenges`, `sessions`, `trusted_devices`.
- `drizzle`: os seis journals listados acima.

`profiles.business_profile_reviews` aparece no catálogo posterior à aplicação de `profiles/0003_misty_rhodey.sql`. A migration criou a estrutura; este catálogo não prova que os handlers de Reviews foram exercitados ponta a ponta nem consulta conteúdo da tabela. O ledger Profiles passou a registrar quatro migrations, correspondentes aos SQLs locais `0000`–`0003`.

## Ações `ON DELETE` das chaves estrangeiras

O catálogo atual retornou **35 FKs**:

| Schema | `CASCADE` | `SET NULL` | Total de FKs |
|---|---:|---:|---:|
| `accounts` | 2 | 1 | 3 |
| `feed` | 14 | 1 | 15 |
| `media` | 2 | 0 | 2 |
| `profiles` | 10 | 0 | 10 |
| `security` | 4 | 1 | 5 |
| **Total** | **32** | **3** | **35** |

Não houve ações `RESTRICT`, `SET DEFAULT` ou `NO ACTION` explícitas em FKs neste resultado. `NO ACTION` é o default exibido pelo PostgreSQL para `ON UPDATE` nas relações retornadas, não uma ação de exclusão observada.

## Limites da evidência

- A consulta comprova metadados do banco de desenvolvimento no momento da execução, não conteúdo de dados, integridade em produção ou prontidão funcional de endpoints.
- Não foram lidas linhas de tabelas de negócio.
- O resultado de catálogo não autoriza nem substitui uma migration; a aplicação de `profiles/0003` foi autorizada separadamente e verificada no ledger.
- A estrutura lógica multi-domínio permanece em um PostgreSQL de desenvolvimento compartilhado; os schemas lógicos observados não significam bancos físicos separados.
- A suíte HTTP integrada anterior passou 5/5 em schema temporário autorizado; o replay de migrations também passou em schemas temporários. Isso não substitui testes autenticados ponta a ponta das rotas de Reviews.

---

<a id="secao-11"></a>
## 11. Serviços externos e operação

Fonte: [`external-services-and-operations.md`](external-services-and-operations.md).

## Situação da auditoria

O projeto está em desenvolvimento. Não há provedor externo de identidade, mapas/geocodificação, armazenamento de objetos, push, pagamentos ou checkout conectado. A autenticação própria usa o servidor e o PostgreSQL de desenvolvimento. O envio de códigos via Resend foi testado nesse ambiente, mas esse teste não comprova o fluxo E2E completo. Esta documentação não descreve nem presume uma configuração de produção. Não foram lidos valores de segredos, nem se deve copiar credenciais para a documentação.

As rotas montadas estão em `endpoints.md` e `routes.generated.md`; esses inventários não afirmam que cada fluxo foi exercitado. As demais integrações abaixo são decisões a avaliar, não conexões já configuradas.

## Serviços candidatos e documentação oficial

| Necessidade | Opção / situação | Referência oficial |
|---|---|---|
| Banco relacional | PostgreSQL e Drizzle no desenvolvimento. Consulte [a query somente leitura do catálogo](queries/development-database-catalog.sql) para tabelas, views, índices, constraints e ações referenciais; este texto não fixa contagens. | [Replit SQL Database](https://docs.replit.com/features/data-and-storage/sql-database) |
| Fotos e vídeos | Object Storage é a opção candidata para uploads persistentes; usar URLs assinadas e ACL, nunca `blob:` como URL de backend | [Replit Object Storage](https://docs.replit.com/features/data-and-storage/object-storage) |
| Autenticação | API própria, sem Clerk/OIDC. Resend foi testado no desenvolvimento; falta E2E completo e configuração própria para produção | Confirmar remetente/domínio e testar o fluxo completo antes de abrir cadastro real |
| Cidades brasileiras | O catálogo local contém 5.571 municípios; origem oficial do IBGE abaixo. Versionar/importar em migration ou seed determinístico, sem consulta a cada render | [API de localidades do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado&orderBy=nome) |
| Mapas/geocodificação | Nenhum fornecedor escolhido. A interface pode selecionar cidade manualmente. GPS só após consentimento; resolver cidade aproximada sem persistir coordenadas | Decidir provedor e termos antes de habilitar o endpoint proposto |
| E-mail e notificações | Resend envia códigos no desenvolvimento; push e demais notificações não estão conectados. Produção requer domínio, credenciais e políticas próprios, mais outbox/retry duráveis | Proposta em `architecture-and-security.md` |
| Pagamentos / Shop | Não há checkout real. Estoque, pedido, pagamento, entrega e reembolso estão fora do escopo do catálogo atual | Decisão comercial e integração financeira ficam para projeto próprio |
| Deploy e secrets | A publicação não faz parte desta etapa de desenvolvimento. Valores sensíveis devem ficar fora do código e dos documentos | [Secrets](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets) · [Deployments](https://docs.replit.com/learn/projects-and-artifacts/replit-deployments) |

## Catálogo municipal

O frontend já contém uma cópia versionada em `Aplicativo/front/public/data/ibge-cities-20261022.json`, com código oficial IBGE de sete dígitos, nome e UF; não contém geolocalização precisa. Foi obtida da API pública do IBGE em 22/10/2026. O SQL proposto em `schema-core.sql` trata município como referência para negócios, eventos e busca. O pacote ZIP inclui esse arquivo para auxiliar a implementação do seed.

Para atualizar: baixar de novo a fonte oficial, validar unicidade do código, quantidade e UF, comparar diff, e importar por migration/seed idempotente. Não apagar código antigo sem estratégia para FKs. O frontend pode manter seleção manual quando GPS ou geocodificação não estiver disponível.

## Configuração (nomes, nunca valores)

Os nomes a seguir descrevem configuração por ambiente; não afirmam que todos estejam configurados:

| Nome sugerido | Uso / tratamento |
|---|---|
| `SESSION_SECRET` | Já consta como secret disponível no ambiente. Não ler nem exibir seu valor. Antes de produção, confirmar rotação, comprimento e uso; preferir sessão criptograficamente segura gerada pelo servidor/provedor |
| `DATABASE_URL` | Conexão gerenciada pelo ambiente Replit. Não exibir, sobrescrever, copiar para `.env` versionado ou incluir em logs |
| `SITE_ORIGIN` | Origem oficial para validação de redirecionamento/links; configurar por ambiente após confirmação do domínio de produção |
| `OBJECT_STORAGE_BUCKET` | Identificador do bucket; credenciais ficam no serviço integrado, não no código |
| `EMAIL_PROVIDER_*`, `MAPS_PROVIDER_*` | Só definir depois da escolha explícita do fornecedor e usando Secrets para credenciais |

Segredos e bancos de desenvolvimento/produção devem permanecer separados. Não reutilizar banco de desenvolvimento para dados de usuários reais. Nunca pedir ao usuário para colar senha, token ou chave no chat.

## Operação e monitoramento

- Manter readiness separado de liveness: liveness não deve falhar por indisponibilidade temporária de serviço externo; readiness deve mostrar dependências sem revelar strings de conexão.
- Gerar `requestId`; redigir cookies, tokens, e-mail, conteúdo privado e coordenadas dos logs.
- Medir latência/erros por rota, filas de uploads, falhas de e-mail/push e atrasos de outbox; alertar sem incluir conteúdo do usuário.
- Retentar tarefas externas com backoff e chave de idempotência; mensagens irrecuperáveis vão para fila de falhas monitorada.
- Ter backup/retention e teste de restauração do banco antes de habilitar dados reais; planejar ciclo de vida/exclusão de mídia separadamente.
- Antes de qualquer futura publicação, conferir origem, cookies/CSRF, serviço de e-mail, variáveis do ambiente e readiness. Isso é orientação futura, não uma declaração de que o projeto esteja publicado.

Mais referências de plataforma: [Storage e bancos no Replit](https://docs.replit.com/learn/projects-and-artifacts/storage-and-databases) e [Troubleshooting](https://docs.replit.com/build/troubleshooting).

---

<a id="secao-12"></a>
## 12. Implementação e testes

Fonte: [`implementation-and-tests.md`](implementation-and-tests.md).

Este documento registra etapas de implementação e testes do ambiente de desenvolvimento. As contagens e a presença física de tabelas não são fixadas aqui: use `queries/development-database-catalog.sql` contra o banco de desenvolvimento. Schemas lógicos e trilhas de migration são organizados por domínio. Este arquivo não declara estado de produção.

**Avaliações de perfil comercial:** contrato, rotas e lógica pertencem a Profiles; Seek não cria nem responde avaliações e pode consumir somente projeções autorizadas. O estado atual do schema físico precisa ser verificado pela consulta de catálogo, não inferido deste registro.

## Antes de implementar

1. Autenticação própria já tem handlers para sessão, CSRF, cadastro/login, confirmação de e-mail, recuperação, troca de senha confirmada por e-mail, gestão de sessões e instalações confiáveis. Conta só recebe sessão após e-mail confirmado e política de senha vigente. Uma instalação sem token ativo recebe código por e-mail antes da sessão; IP não é identidade do dispositivo. Troca/reset de senha revoga todas as sessões e instalações e exige novo login/código. O tempo de sessão atual é configurável por `SESSION_TTL_SECONDS` (padrão de 7 dias).
2. A base PostgreSQL documentada nesta etapa é a de desenvolvimento. Backup, retenção e restauração são critérios para uma futura operação real; esta etapa não configura nem presume produção.
3. Para testes de desenvolvimento, fotos/vídeos usam arquivo local com limites e assinatura validados. Antes de lançamento, decidir armazenamento permanente, processamento, limites operacionais e retenção de produção.
4. Confirmar se geocodificação será habilitada; GPS nunca obrigatório para busca manual.
5. Revisar `schema-core.sql`, constraints, migrações, termos de privacidade e matriz de autorização.
6. Aprovar e versionar o contrato OpenAPI proposto sem substituir o contrato atual até haver migração testada.

## Fases sugeridas e critérios de aceite

### Fase 1 — Infraestrutura segura e identidade (núcleo implementado)

- Registro histórico de 30/10/2026: trilhas Feed e Mídias foram aplicadas no banco de desenvolvimento e seus objetos foram verificados naquela data. Para o estado físico atual, consulte `queries/development-database-catalog.sql`. Os binários são mantidos localmente apenas em desenvolvimento.
- O teste direto do Resend foi recebido em desenvolvimento, mas a suíte de API usa e-mail em memória; o fluxo E2E de cadastro via Resend deve ser validado separadamente. Produção não é presumida nem habilitada.
- A política definida é 8–128 caracteres, com uma maiúscula, minúscula, número e caractere especial; o hash usa Argon2id. A recuperação por código de e-mail está implementada: somente contas ativas e verificadas são elegíveis; resposta anti-enumeração; HMAC-SHA256; expiração em 10 minutos; cinco tentativas; uso único; limites de IP e conta; redefinição, consumo do desafio e revogação de sessões em transação.
- A recuperação não cria sessão após a troca. A entrega é iniciada depois da resposta HTTP e não tem outbox persistente; em falha de envio o código é invalidado, e a pessoa pode solicitar outro após o intervalo de segurança. O envio Resend foi testado em desenvolvimento, mas produção permanece desativada até configuração própria.
- Gestão de sessões implementada: listagem paginada de sessões próprias; revogação de sessão; encerramento das demais; lista de instalações confiáveis e revogação individual ou em lote. Ownership é aplicado no banco e escritas exigem CSRF. Instalações usam token opaco por navegador/app, guardado no servidor somente como hash; não se armazena IP, fingerprint ou user-agent como identidade. Na web, cookie persistente tem limite prático de 400 dias e o navegador pode apagá-lo; nesse caso, a pessoa confirma novamente. MFA geral e app nativo ainda não existem.
- Verificação refeita em 29/10/2026: `test:api-isolated-db` passou com 5/5 testes em schema temporário. Cobertura inclui cadastro/verificação, privacidade e relações, bloqueio, instalações confiáveis, alteração de senha/e-mail e revogação de sessões. O schema temporário foi removido ao fim; o catálogo permanente permaneceu inalterado. A consulta não leu dados das tabelas, portanto não declara que o banco principal esteja vazio. Nenhuma alteração foi feita em produção.
- Aceite: build de produção não carrega registros fictícios de demonstração; páginas sem endpoint/dados mostram estados vazios, enquanto o preview de desenvolvimento mantém as fixtures para revisão visual.

### Fase 2 — Conta única, perfil e relacionamentos (API essencial implementada; frontend parcial)

- Perfil básico, privacidade, seguir, pedidos de perfis privados, Círculo derivado e bloquear/desbloquear já têm endpoints e tabelas próprias. O frontend ainda mantém vários desses controles no estado local da demonstração.
- Rotas de conta/Auth/Social registradas no backend incluem `GET/PATCH /v1/accounts/me`, `GET /v1/accounts/availability`, `GET /v1/accounts/{accountId}`, `GET /v1/profiles/{username}`, `GET/PUT /v1/accounts/me/privacy`, `POST /v1/auth/account/email/change/request`, `/v1/auth/account/email/change/confirm-current`, `/v1/auth/account/email/change/confirm-new`, `/v1/auth/account/password/change/request`, `/v1/auth/account/password/change/confirm`, `/v1/auth/account/deletion/code`, `/v1/auth/account/deletion/confirm`, `/v1/auth/account/deletion/restore/code` e `/v1/auth/account/deletion/restore/confirm`, além das rotas de relações. Registro e contrato não significam que cada fluxo foi exercitado; use `endpoints.md` para o inventário e os testes específicos para evidência comportamental.
- A edição de dados da conta usa uma única identidade Social e diferencia o formulário por tipo: conta pessoal (nome e sobrenome) e conta comercial (nome comercial e endereço comercial completo). A idade é coletada somente no cadastro, mantida no servidor para a regra de 18+ e nunca retornada ao cliente após a criação; não aparece nem em Configurações. E-mail verificado é retornado somente no DTO owner-only. A edição de endereço e conta é atômica; não foi necessária migração de schema.
- O endpoint de perfil público compõe a identidade canônica da conta com os dados comerciais, respeitando privacidade e bloqueios. Avaliações e respostas pertencem a Profiles, não a Seek. O estado do banco deve ser verificado pela query de catálogo. Horários, serviços, galeria real e integração de descoberta do Seek ainda não estão completos.
- Regras: Círculo só existe com dois seguimentos aceitos em sentidos opostos; pedido pendente não dá acesso; após aprovação, o seguidor pode ver conteúdo público do perfil privado; conteúdo do Círculo continua exigindo mutualidade; bloqueio remove follows/pedidos em ambas as direções; só o iniciador remove o próprio bloqueio.
- Mensagens antigas ainda não podem ser ocultadas/restauradas pela API, pois o domínio de mensagens não foi implementado. Posts e outras leituras também precisarão aplicar a autorização quando entrarem no backend.

#### Verificação da Fase 2 concluída em desenvolvimento

- Três contas sintéticas temporárias, autenticadas e com e-mail marcado como verificado, foram usadas somente no banco de desenvolvimento e excluídas ao final.
- Verificado por HTTP: pedido privado, leitura e aprovação pelo dono; acesso ao perfil após aprovação; seguimento público e mutualidade; criação/remoção derivada do Círculo; bloqueio oculta perfil, impede novo seguimento e encerra mutualidade; desbloqueio não restaura vínculos; edição de perfil e privacidade com controle de versão.
- Rotas protegidas responderam `401` sem sessão; escrita sem CSRF respondeu `403`; health check respondeu `200`.
- Limites: nenhuma migração de produção, integração das telas de perfil/relações, domínio de mensagens, posts, mídias, avaliações, Seek ou edição comercial completa foi feita nesta fase.

### Fase 3 — Social e mídia

- Implementar upload direto com URL assinada, inspeção MIME/tamanho, quarentena e processamento.
- Implementar publicação, artigos, galeria derivada, comentários, curtidas, reposts e referências com autorização.
- Aceite: só mídia pronta e pertencente ao autor pode ser anexada; excluir/ocultar publicação não deixa mídia acessível por URL alternativa; `blob:` só é preview local e nunca entra no banco.

### Fase 4 — descoberta Seek e perfil comercial

- Cadastrar catálogo IBGE e categorias aprovadas; descobrir e organizar somente contas comerciais Social elegíveis por localização/categoria.
- Manter dados comerciais, serviços e horários na experiência e nos contratos do perfil comercial; Seek apenas consome uma projeção pública necessária à descoberta.
- Exibir, criar e responder avaliações na experiência do perfil comercial. A API de avaliações pertence a Profiles; Seek não grava nem edita avaliações e pode consumir apenas o agregado derivado e autorizado.
- Aceite: perfil pessoal não aparece como comércio; Seek não cria nem edita cadastro/perfil/avaliação; comerciante só edita dados da própria conta; município resolve pelo código IBGE; a nota nos resultados de descoberta deriva das avaliações do perfil e não expõe conteúdo privado.

### Fase 5 — Shop (catálogo, sem checkout)

- Integrar produto a vendedor com conta comercial existente; salvos e filtros.
- Aceite: nenhum botão/tela promete compra, estoque, entrega ou pagamento enquanto isso não existir. Checkout é projeto separado.

### Fase 6 — Mensagens, notificações, privacidade e operação

- Implementar conversas privadas, stream/eventos autorizados, notificações, denúncias e jobs de exportação/exclusão.
- Aceite: somente participantes autorizados leem mensagens; stream não vaza conteúdo; exclusão/exportação tem estados e auditoria redigida.

### Fase 7 — Ativar o frontend gradualmente

- Integrar por módulo; manter demo somente em preview/testes explicitamente identificados.
- Não fazer fallback silencioso para dados demo em erro de rede.
- Aceite: contratos validados, loading/erro/vazio/paginação acessíveis, controles existentes preservados e testes visuais em viewport móvel/desktop.

## Estratégia de teste

| Camada              | Cobertura obrigatória                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validação/contratos | DTO Zod/OpenAPI, limites, enum, códigos e respostas; gerar spec reproduzível                                                                                                                                                                                                                                  |
| Unidade             | Políticas de leitura/ação, normalização username, status, audiência, transições de evento e tipos de conta                                                                                                                                                                                                    |
| PostgreSQL          | O workflow pós-merge configura Drizzle `push` para desenvolvimento; o estado físico deve ser confirmado por metadados, sem inferir histórico. Para testes com escrita, usar schema isolado, FKs, unicidade concorrente, constraints e isolamento transacional. Produção permanece separada e fora deste gate. |
| Integração HTTP     | Sessão anônima/autenticada, CSRF, paginação, idempotência, erros, rate limits e ACL por recurso                                                                                                                                                                                                               |
| Segurança           | IDOR entre contas, perfil privado, bloqueio mútuo, mídia privada, brute force e enumeração, XSS/links, SSRF em URLs, upload poliglota e CSRF                                                                                                                                                                  |
| Concorrência        | Duas avaliações simultâneas, like/repost repetidos, edição com versão antiga, upload duplicado e outbox reprocessada                                                                                                                                                                                          |
| Dados               | Seed de municípios determinístico; usuários e conteúdos sintéticos apenas em ambiente local; nunca importar contas mock como usuários reais                                                                                                                                                                   |
| Frontend            | Fluxos de perfil Social/comercial, abas de perfil, galeria, publicação/mídia, Seek e estados de erro sem regressão da navegação                                                                                                                                                                               |
| Frontend por conta  | Likes, salvos, leituras, bloqueios, notificações e recomendações precisam ser isolados por ator; fixtures não podem entrar no build/estado de produção                                                                                                                                                        |
| Operação            | Health/readiness, logs sem PII/segredos, backup/restauração, job retry/failure queue e alertas                                                                                                                                                                                                                |

### Fluxo de schema neste projeto

O PostgreSQL gerenciado da Replit é usado no desenvolvimento; Feed e Mídias possuem migrations e ledgers independentes. Consulte `queries/development-database-catalog.sql` para confirmar o catálogo físico atual. `generate` cria SQL versionado sem conexão. Esta documentação não declara estado de produção.

#### Seleção de conexão

- O runtime usa `DATABASE_URL`, fornecida pela instância gerenciada da Replit. Não copiar ou imprimir seu valor.
- `SEEKALIVE_DB_MIGRATION_TARGET=replit` seleciona explicitamente o destino de desenvolvimento para `push`; o pós-merge já aplica essa proteção.
- Um seletor técnico para PostgreSQL externo permanece inativo no código legado. A escolha atual é PostgreSQL gerenciado da Replit; não habilitar destinos externos nem criar outra conexão sem nova decisão explícita.
- Migrations versionadas e `push` são mecanismos distintos. O estado físico atual não identifica qual mecanismo criou cada objeto; não misturar ou executar os dois fluxos no banco principal sem revisão e aprovação.

### Integração HTTP com schema isolado (A02)

Para executar em um runtime comprovadamente de desenvolvimento:

1. Consulte `SELECT current_database()` no banco de desenvolvimento e use o nome retornado em `SEEKALIVE_EXPECTED_DATABASE`.
2. Execute `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE='<nome-do-banco-dev>' pnpm --filter @workspace/scripts run test:api-isolated-db`.
3. O executor valida o opt-in, o banco-alvo e o ambiente antes de criar um schema aleatório `seekalive_test_<id>`. O push normal do Drizzle fica limitado a esse schema; as tabelas são qualificadas explicitamente. A suíte usa um coletor de e-mail em memória, testa cadastro/verificação e relações sociais e remove apenas o schema criado por ela ao encerrar. Também compara o catálogo `public` antes e depois.

Para a validação HTTP isolada de Reviews, execute `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE='<nome-do-banco-dev>' pnpm --filter @workspace/scripts run test:profiles-reviews-api-isolated`. Essa suíte cria contas pessoais e comerciais pela própria API, usa apenas o coletor de e-mail em memória, exerce autenticação/CSRF, autorização por tipo de conta, validação, unicidade concorrente, paginação, agregados, resposta comercial, exclusão e republicação. O executor remove o schema temporário e comprova que o catálogo `public` não mudou; isso não altera nem testa escrita na tabela física do schema principal.

Em 31/10/2026, `test:profiles-reviews-api-isolated` passou em 1/1 no banco de desenvolvimento `heliumdb`. A validação HTTP confirmou a gravação e leitura no schema temporário, a rejeição de avaliações duplicadas em requisições simultâneas com HTTP 409, a paginação/contagem, as permissões de autor e comerciante e a exclusão/republicação. A concorrência revelou inicialmente HTTP 500; o repositório agora traduz apenas o SQLSTATE `23505` da constraint única de Reviews para o resultado de conflito da aplicação, propagando erros de banco diferentes sem mascará-los. O schema aleatório foi removido e o catálogo `public` permaneceu inalterado.

### Cobertura HTTP das operações montadas

Execute somente em desenvolvimento, após confirmar o nome do banco com `SELECT current_database()`:

```sh
SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 \
SEEKALIVE_EXPECTED_DATABASE='<nome-do-banco-dev>' \
pnpm --filter @workspace/scripts run test:api-isolated-http
```

O comando encadeia, sem paralelizar os schemas temporários, os testes de API geral, exclusão de conta, Reviews e os cenários HTTP de borda de Auth, Profiles/Onboarding, Social, Feed, Mídia e Health. Cada fixture usa schema `seekalive_test_<id>`, confirma o banco de desenvolvimento esperado, envia e-mails somente a um coletor em memória, remove os arquivos de mídia associados aos registros do próprio schema e verifica que o catálogo `public` não mudou. O store local de mídia aceita o modo de teste somente com opt-in explícito, os seletores de destino de desenvolvimento, schema de teste válido e sem `REPLIT_DEPLOYMENT`.

O inventário Express/OpenAPI verificado em `routes.generated.md` contém 76 operações método/caminho. A matriz de evidência é:

| Domínio                                  | Operações | Evidência HTTP                                                 |
| ---------------------------------------- | --------: | -------------------------------------------------------------- |
| Auth                                     |        28 | Suite de API isolada e rotas de autenticação recém-cobertas    |
| Accounts, Profiles, Onboarding e Reviews |        12 | Suite de API isolada, Reviews e consulta pública por ID        |
| Social                                   |        12 | Suite de API isolada, listagem de seguindo e recusa de pedido  |
| Feed                                     |        19 | Suite de API isolada                                           |
| Mídia                                    |         3 | Upload, leitura binária/Range e exclusão pela API real         |
| Health                                   |         2 | Liveness e readiness pelo app completo com o banco isolado     |
| **Total**                                |    **76** | **Todas as operações têm ao menos um cenário HTTP executável** |

As dez operações que antes não tinham cenário HTTP real eram: `DELETE /v1/auth/devices/{deviceId}`, `DELETE /v1/auth/devices/others`, `POST /v1/auth/logout`, `POST /v1/auth/verification`, `GET /v1/accounts/{accountId}`, `GET /v1/social/accounts/{accountId}/following`, `POST /v1/social/follow-requests/{accountId}/decline` e as três operações de `/v1/social/media` (upload, leitura por ID e exclusão). Cada uma agora é exercitada por uma requisição ao app Express completo; os novos testes também verificam autorização, CSRF, privacidade, persistência ou limpeza conforme a operação.

Em 31/10/2026, `test:api-isolated-http` passou com 24/24 testes e nenhum teste ignorado ou falho. Também passaram `typecheck` e `test:api-route-contract` (3/3); a checagem de documentação regenerável confirmou 76 operações. Os cenários de borda verificam, por domínio:

| Domínio                         | Casos HTTP de borda exercitados                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                            | CSRF em logout/exclusão/reset, respostas anti-enumeração, código inválido/reutilizado, revogação de sessões após reset, cursores/IDs inválidos, revogação da sessão atual e sessão alheia, confirmação de dispositivo sem token válido, cooldowns progressivos de reenvio (30/90 s), bloqueio após três códigos incorretos e limite de login por IP.                                                              |
| Accounts, Profiles e Onboarding | sessão e CSRF ausentes, privacidade, versão obsoleta, DTO sem idade/e-mail, incompatibilidade entre tipo de conta e campos, payload excessivo/inconsistente, repetição e substituição de interesses.                                                                                                                                                                                                              |
| Social                          | paginação/cursores inválidos, leitura privada, pedido/recusa, auto-follow/ID inexistente, follow/unfollow/bloqueio repetidos, bloqueio encerrando relações recíprocas e isolamento de bloqueios por titular.                                                                                                                                                                                                      |
| Feed                            | ausência de sessão/CSRF, autor forjado, payload inválido, audiência privada, perfil privado com pedido pendente versus seguidor aprovado, visibilidade de publicações privadas e regra mútua do Círculo, IDs inexistentes, exclusão por não titular/repetição, likes simultâneos/idempotentes, bookmark/repost/comment repetidos, conflito de chave idempotente, reply entre posts e paginação/filtros inválidos. |
| Mídia                           | autenticação/CSRF, tipo e assinatura incompatíveis, leitura por não titular, ID inválido, intervalos válidos/inválidos e limite acima do tamanho, ativo expirado, arquivo local ausente, resposta genérica sem caminho interno, exclusão por não titular/repetição e remoção do arquivo.                                                                                                                          |
| Health                          | readiness bem-sucedida e indisponibilidade simulada da dependência, com erro fechado e sem detalhes internos na resposta.                                                                                                                                                                                                                                                                                         |

Esta ampliação não equivale a cobertura exaustiva de todos os casos de borda possíveis por endpoint. Permanecem sem cenário HTTP específico nesta matriz: rate limits de Auth fora do login e do cooldown de dispositivo, falha do stream de mídia depois que a resposta começou, limpeza programada de mídias expiradas e interação de bloqueio com cada variação de audiência no Feed. Isso não invalida as operações já exercitadas; apenas delimita o que ainda não foi comprovado por esta matriz. Os testes continuam separados por comportamento para que um novo caso não seja inferido apenas pelo registro da rota ou pela presença no OpenAPI.

Não execute em produção, não remova nem sobrescreva marcadores válidos para contornar o bloqueio e não use `push-force`. A [documentação do Replit](https://docs.replit.com/features/project-setup/configuration) identifica um runtime publicado por `REPLIT_DEPLOYMENT=1`; quando essa variável está ausente, o Repl está em desenvolvimento. `REPLIT_DEV_DOMAIN` identifica o domínio de desenvolvimento. `REPLIT_ENVIRONMENT` não é o marcador documentado e não deve bloquear testes sozinho. Em 29/10/2026, `test:api-isolated-db` passou em 5/5 no banco de desenvolvimento `heliumdb`; criou e removeu seu schema aleatório e comparou o catálogo `public` antes/depois. A migration versionada `0005` também foi testada em namespace isolado e o fingerprint das colunas, constraints, índices e views consultados permaneceu idêntico. Nenhuma escrita foi feita no schema principal nem em produção.

## Decisões que permanecem abertas

- Contrato detalhado da API própria e UX final de cadastro/verificação/recuperação.
- Rotina de backup, retenção, restauração e política regional do PostgreSQL antes do lançamento.
- Object Storage, política de URL pública/assinada e limites de vídeo.
- Fornecedor de geocodificação/mapas (se houver), consentimento e retenção.
- Provedor de e-mail/push.
- Escopo e fornecedor de checkout/pagamentos para uma fase comercial futura.
- Regras de moderação, retenção/legal hold e prazos de exclusão.

## Estado inicial do contrato

`shared/api-spec/openapi.yaml` é o contrato HTTP. `pnpm --filter @workspace/scripts run docs:api-routes` gera `endpoints.md` e `routes.generated.md` a partir do inventário Express e desse contrato; o teste `test:api-route-contract` falha diante de diferenças de método/caminho ou declaração CSRF. `generate-contracts.mjs` mantém apenas o catálogo de planejamento não normativo em `docs/roadmap/`.
