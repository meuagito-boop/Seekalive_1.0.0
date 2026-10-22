# Análise dos documentos de referência do Seekalive

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
| Idade mínima | Acesso exclusivo para maiores de 18 anos, com data de nascimento e verificação a validar juridicamente | O cadastro atual coleta idade/localmente; não há política de bloqueio por idade implementada | Aprovar a restrição e a forma de verificação com revisão jurídica antes de alterar cadastro ou persistência |
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
