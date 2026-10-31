# 99 — Síntese, contradições e lacunas

**Data de referência:** 31/10/2026  
**Ambiente auditado:** código do workspace e metadados do banco de desenvolvimento.  
**Resultado geral:** dossiê estático concluído; não significa que a implementação esteja pronta para produção. Nenhum código foi corrigido nesta auditoria.

### Atualização posterior — estrutura física de Reviews — 31/10/2026

Depois da auditoria, e mediante autorização expressa para DDL somente em desenvolvimento, `profiles/0003_misty_rhodey.sql` foi aplicada ao banco `heliumdb`. A tabela `profiles.business_profile_reviews` foi confirmada pelo catálogo posterior. Isso resolve a ausência física encontrada no snapshot original; não valida as rotas de Reviews ponta a ponta nem altera os demais achados deste dossiê.

## Método e limites

O dossiê segue o prompt de auditoria somente leitura. Não houve acesso à produção, leitura de linhas de negócio, valores de segredos, logs de execução ou conteúdo de usuários. Não foram executados testes, builds, typechecks, lint, geração, migrations, `push`, seed ou requisições HTTP de escrita. Os planos SQL foram obtidos somente com `EXPLAIN` (sem `ANALYZE`) e parâmetros fictícios. A única escrita desta atividade foi nos documentos deste dossiê.

Os vereditos distinguem confirmação estrutural de funcionamento real. `CONFIRMADO` não significa que o comportamento tenha sido testado em execução; os limites aparecem dentro do achado. O consolidado não transforma estimativas do planner em contagens de registros.

## Doze hipóteses prioritárias

Cada hipótese do prompt tem um achado detalhado próprio nos blocos temáticos. Esta tabela aponta para esse achado; não cria nem duplica a contagem geral.

| # | Hipótese | Veredito e achado | Conclusão baseada em evidência |
|---:|---|---|---|
| 1 | Concorrência em `auth_challenges.attempts` | **PARCIAL — 03-016** | O caminho de verificação usa transação e `FOR UPDATE`, depois grava `attempts + 1` como valor absoluto; não é incremento SQL atômico e não há teste concorrente. |
| 2 | `trust proxy` e IP usado pelo rate limit | **PARCIAL — 11-005** | Há seleção de IP considerando cadeia de proxies no caminho de desenvolvimento. O salto confiável depende da topologia; não se comprovou o IP observado atrás do proxy efetivo nem resistência a cabeçalho forjado. |
| 3 | Remoção física após 7 + 90 dias | **PARCIAL — 13-004, 13-006, 13-009; integridade referencial a confirmar** | O fluxo de purga e as ações referenciais precisam ser verificados com testes e com a consulta atual do catálogo de desenvolvimento; este resumo não fixa contagens de FKs. |
| 4 | Cache de mídia privada | **CONFIRMADO no código — 08-008** | A rota autoriza pelo post, responde `private, no-store`, `nosniff`, `Content-Disposition` e Range. `Vary` não é definido; nenhum cache externo foi testado. |
| 5 | Conta pendente sem TTL | **PARCIAL — 03-017** | O código de verificação expira, mas não foi encontrado job que remova conta pendente nem libere o e-mail/@ após o desafio expirar. |
| 6 | Semântica de audiência `private` | **CONFIRMADO no código / CONTRADITÓRIO nos documentos — 04-001 e A2-003** | Código permite conteúdo privado ao titular e a seguidores aprovados; Círculo continua exigindo seguimento mútuo. Documentos preservam regras divergentes. |
| 7 | Bloqueio após terceiro código incorreto | **CONFIRMADO — 03-010** | A terceira falha bloqueia a conta e revoga sessões/dispositivos. Quem tem a senha válida pode iniciar desafio em instalação nova e causar indisponibilidade ao errar três códigos. |
| 8 | Concorrência do Argon2id | **PARCIAL — 03-018** | Cada hash usa 65.536 KiB; não foi encontrado limite/fila global. Não houve teste de memória ou concorrência. |
| 9 | Falha de e-mail e múltiplas instâncias | **PARCIAL — 09-004 e 11-003** | Envio é síncrono ao provedor sem outbox durável; o rate limit é um mapa local por processo. Reinício pode perder estado de envio/limite; réplicas não compartilham buckets. |
| 10 | Rotas e status do catálogo | **CONTRADITO — 02-003 e 02-004; PARCIAL — 02-012** | OpenAPI ativo, catálogo de endpoints e roteadores não coincidem em métodos, propostas montadas e rotas ausentes. A matriz individual de auth/CSRF/limite/schemas ainda não está consolidada. |
| 11 | Administração/moderação | **CONFIRMADO — 02-011** | Não há router administrativo/moderação nem validação de papel administrativo encontrada no backend atual. |
| 12 | Parser de 256 KiB antes de auth/CSRF | **PARCIAL — 02-006 e 11-006** | Parsers globais JSON/urlencoded rodam antes do router `/api`; o parser maior de artigos também antecede autenticação/CSRF e rate limit local. |

## Contradições entre documentação, decisão registrada, schema e código

1. **Contrato OpenAPI ativo × handlers:** 74 operações no contrato ativo e 76 rotas no servidor, com rotas só no código e divergência de método para posts por conta (`02-003`). O catálogo amplo inclui propostas e não pode ser tratado como handlers (`02-004`).
2. **Estado de rotas e contrato:** corrigido; `test:api-route-contract` confirma paridade entre Express e OpenAPI. O inventário gerado lista as rotas montadas. Essa paridade não prova persistência ou execução E2E.
3. **Reviews comerciais:** no snapshot original, `profiles.business_profile_reviews` não existia no banco de desenvolvimento. A migration Profiles `0003` foi aplicada posteriormente e o catálogo confirma a tabela; a validação autenticada ponta a ponta das rotas permanece fora desta reconciliação (`02-005`, `05-002`, `04-007`).
4. **Audiência privada:** a implementação permite leitura por seguidor aprovado; documentos também afirmam “somente titular” (`04-001`, `A2-003`).
5. **DTO pessoal × campos aprovados:** o DTO público inclui localização, site e data de entrada, além do conjunto informado para perfil pessoal (`04-003`).
6. **Perfil comercial × informações exigidas:** o DTO e o schema atuais não incluem horário de funcionamento, serviços, comodidades, resumo de avaliações ou link de mapa (`04-005`).
7. **Idade:** código e constraint permitem 18–120, embora a regra aprovada tenha definido somente idade mínima de 18 (`03-002`, `05-007`).
8. **Sessão:** a duração absoluta padrão é sete dias e não renova por atividade, em conflito com a decisão de não limitar a sessão por inatividade (`03-012`).
9. **Instalação reconhecida:** o cookie tem máximo de 400 dias, enquanto a regra aprovada é manter até revogação (`03-013`).
10. **Estrutura de migrations:** arquivos históricos na raiz, trilhas em subpastas e glob de Seek não correspondem integralmente à configuração ativa (`05-005`, `05-006`, `A2-004`).
11. **Contagens e inventário documental:** há contagens antigas incompatíveis com os arquivos atuais e o mapa de módulos omite Feed/Media (`A2-005`, `A2-006`).
12. **Fronteira Accounts/Profiles:** o cadastro coordena campos de conta e inicialização de perfil em uma transação, enquanto documentos registram que a extração de apresentação para Profiles ainda está pendente (`A1-003`, `A2-007`).
13. **Mensagens e notificações:** existem referências/pastas de frontend, mas não há routers e tabelas remotas correspondentes no backend; regras de preservação/anonimização ainda não têm consumidor implementado (`A1-008`, `13-007`).
14. **Ambiente de execução:** o manifest do projeto exige Node `>=22.18.0`, `.replit` declara Node 20 e o runtime observado era Node 22.23.4 (`01-002`).
15. **Documentos de testes:** afirmações históricas do README não foram reproduzidas nesta auditoria; testes atuais não foram executados por escopo (`A2-008`, bloco 14).

## Quinze maiores riscos encontrados

| Ordem | Severidade | Risco e impacto | Evidência |
|---:|---|---|---|
| 1 | Alto | Uma pessoa que conhece a senha pode provocar bloqueio da conta ao errar três códigos de novo dispositivo; todas as sessões e instalações reconhecidas são revogadas. | `03-010`, especialmente `confirmDeviceLogin.ts:76–103` e `deviceVerificationRepository.ts:140–181`. |
| 2 | Alto | Hashes Argon2id sem limite global podem esgotar memória sob concorrência; cada operação usa 65.536 KiB. | `03-018`, `application/passwordHashing.ts:3–12`. |
| 3 | Crítico | Cliente gerado e API real divergem; alguns handlers estão rotulados como proposta e são acessíveis, e há endpoints ausentes/método divergente. | `02-003`, `02-004`, `02-012`. |
| 4 | Alto | Resposta pública de perfil pessoal excede os campos aprovados e expõe localização, site e data de entrada. | `04-003`, `profileViewMapper.ts:18–33`. |
| 5 | Alto | Perfil comercial não apresenta todos os campos funcionais solicitados; no snapshot da auditoria, as rotas de avaliações ainda não tinham tabela física. A migration foi aplicada posteriormente em desenvolvimento. | `04-005`, `04-007`, `05-002`; atualização em `docs/api/backend/development-database-catalog-2026-10-31.md`. |
| 6 | Alto | Contas não verificadas não têm purga/TTL identificado; dados de identidade podem permanecer reservados indefinidamente. | `03-017`, `emailVerificationRepository.ts:153–163`; ausência de job encontrada por busca estática. |
| 7 | Alto | Rate limit é por IP e memória local; reinícios zeram os buckets e múltiplas instâncias não compartilham o limite. | `11-002`, `11-003`. |
| 8 | Alto | Cadeia de proxies pode produzir IP compartilhado ou seleção inadequada; segurança depende de topologia não validada. | `11-005`, `trustedClientIp.ts:16–23` e `forwarded-client-ip.ts:6–11`. |
| 9 | Alto | Parse do corpo antecede autenticação/CSRF e rate limit de rota, permitindo custo de parse em chamadas anônimas dentro dos limites configurados. | `02-006`, `11-006`, `app.ts:40–50`. |
| 10 | Alto | O worker de exclusão não se reativa automaticamente se o schema não estiver pronto na inicialização. | `13-009`, `accountDeletionWorker.ts:7–14`. |
| 11 | Médio | Exclusão de arquivos locais ocorre no fluxo da transação SQL; falha posterior pode deixar a operação externa sem reversão e o storage permanente futuro ainda não tem provider de purge. | `13-008`, `accountDeletionPurgeRepository.ts:24–25`. |
| 12 | Médio | Sem outbox, falha ou encerramento após criação do desafio pode deixar o fluxo de e-mail sem entrega durável/retry. | `09-004`; não houve teste real de provedor (`09-007`). |
| 13 | Médio | Sessão expira por idade absoluta e cookie de dispositivo tem prazo de 400 dias, contra regras registradas de sessão sem limite por inatividade e dispositivo até revogação. | `03-012`, `03-013`. |
| 14 | Médio | Busca textual representativa percorre `feed.posts` sequencialmente e ordena; o plano não prova desempenho em volume maior. | `06-006`; saída de `EXPLAIN` sem `ANALYZE`. |
| 15 | Médio | O ledger e o schema não foram comparados migration a migration; objetos existentes não comprovam replay integral nem drift zero. | `05-004`, `05-015`, `05-016`. |

Severidades descrevem o impacto técnico observado no escopo de desenvolvimento, não uma estimativa de probabilidade em produção. A classificação crítica está restrita à divergência entre contrato/cliente e rotas efetivamente servidas (`02-003`); os demais achados não foram elevados sem evidência.

## O que a documentação deveria acrescentar

- Matriz única e versionada de cada rota ativa: método/caminho, autenticação, CSRF, rate limit, papel, schema de entrada, DTO de resposta, status e efeito de persistência.
- Fonte única para operação ativa versus proposta, com verificação automática contra routers e OpenAPI.
- Semântica normativa de `private`, Círculo, bloqueio e visibilidade de perfil/post/mídia/referência, incluindo matriz visitante × perfil × audiência × bloqueio.
- Contrato público de Profiles separado por tipo de conta, com allowlist explícita dos campos permitidos e estado das informações comerciais ausentes.
- Fluxo completo de Reviews: testar comportamento das rotas, autorização, resposta e exclusão; a migration e as constraints já estão aplicadas no banco de desenvolvimento.
- Diagrama de transações/locks por operação e testes de concorrência, inclusive para tentativas OTP, sessões simultâneas, seguidores, bloqueios, mídia e exclusão.
- Configuração de implantação: plataforma/tipo, build/run, proxy confiável, CORS/cabeçalhos, variáveis por ambiente, readiness e permissões do papel de runtime. Valores secretos não devem ser documentados.
- Semântica de falha do e-mail, retry/outbox, observabilidade, limites entre instâncias e condições de recuperação operacional.
- Inventário de dados pessoais por coluna, DTO e log; prazo de retenção operacional e prova de expurgo, sem incluir valores pessoais.
- Estado explícito de módulos futuros. Seek, Shop, mensagens, notificações e moderação não podem ser representados como APIs disponíveis apenas porque constam no catálogo de propostas.

## Itens que permanecem NÃO VERIFICADOS e evidência necessária

| Tema | Por que não foi verificado | Evidência necessária numa etapa autorizada |
|---|---|---|
| Implantação e configuração efetiva | Auditoria foi limitada ao desenvolvimento; valores de ambiente e produção foram proibidos. | Revisão de configuração não secreta no ambiente correto; confirmação do tipo de deployment e comandos sem expor valores. |
| Papel real da API no PostgreSQL | A ferramenta de consulta não foi comprovada como a conexão do processo backend. | Identificar o papel efetivo pelo processo de desenvolvimento sem imprimir URL/credencial; conferir privilégios catalogados. |
| Drift completo Drizzle × banco | Catálogo foi lido, mas a comparação objeto a objeto e o replay foram proibidos/não executados. | Comparação read-only de schemas e migrations com relatório por coluna, índice, check, FK e default; depois, teste isolado autorizado. |
| Estado aplicado de cada ledger | Apenas nomes/colunas dos seis ledgers foram consultados; conteúdo não foi lido. | Consulta aprovada apenas a metadados de hash/data dos ledgers de desenvolvimento, sem ler tabelas de usuário. |
| Matriz de segurança de todas as rotas | Rotas e limitadores foram inventariados, mas faltou consolidar auth/CSRF/role/schemas por rota. | Análise estática assistida pelos arquivos de rota e contratos; confirmar com testes seguros de endpoint. |
| Matriz completa de privacidade | Predicados foram revisados, mas nenhum teste de autorização foi executado. | Testes com contas fictícias e banco isolado para público/privado, seguidores, bloqueios, posts, referência e mídia. |
| Concorrência e falhas | Nenhum teste de escrita ou carga foi executado. | Testes isolados com corrida, rollback, crash, retries, deadlock e duas instâncias; medir Argon e rate limit. |
| E-mail real | Nenhuma chamada externa foi feita; segredo não foi lido. | Teste controlado com conta de teste e remetente autorizado, mantendo segredo no fluxo seguro. |
| Storage sob falha/carga | Nenhum arquivo foi enviado ou removido nesta auditoria. | Testes de disco cheio, stream concorrente, Range, autorização e reconciliação de órfãos no armazenamento de desenvolvimento. |
| Respostas visuais autenticadas | Não foram feitas navegação, login ou screenshots interativos. | Testes E2E de UI com fixtures estritamente de desenvolvimento e sem conta real. |
| Métricas/alertas externos | Nenhuma plataforma externa foi consultada. | Inspecionar configuração operacional autorizada e provar alertas de worker, DB, filas e erros. |
| Efeitos de proxy e cabeçalhos externos | Só foi observado o preview de desenvolvimento; infraestrutura externa não foi acessada. | Repetir HEAD/OPTIONS no ambiente de desenvolvimento com topologia/proxy conhecida e depois validar implantação própria. |

## Plano recomendado após aprovação do dossiê

Este plano é recomendação de sequência, não execução nesta auditoria. Nenhum módulo futuro é considerado entregue por estar documentado.

### Gate A — Contratos e evidências coerentes

1. Corrigir o status documental das rotas e alinhar OpenAPI ativo, catálogo e routers.
2. Completar a matriz por rota, incluindo sessão, CSRF, limite, papel, entrada, resposta e status.
3. Atualizar mapa de módulos, ownership Accounts/Profiles e regra `private`; retirar contagens históricas vencidas.
4. Revalidar os arquivos de contrato e o cliente gerado sem alterar regras de negócio silenciosamente.

**Aceitação:** cada rota montada tem status explícito; rota proposta não é servida sem decisão registrada; contrato corresponde ao handler.

### Gate B — Accounts/Auth

1. Resolver os achados de retenção de contas pendentes, sessão absoluta, cookie de instalação e política de lockout, preservando as decisões aprovadas ou discutindo conflito antes de alterar política.
2. Definir proteção de concorrência para Argon2id, OTP, sessões simultâneas e revogação.
3. Confirmar status/ledger de migrations e validar cadastro, verificação, reset, troca, exclusão e restauração com testes isolados.

**Aceitação:** fluxos críticos têm testes de sucesso/falha/corrida; nenhum comportamento aprovado foi substituído por conveniência técnica.

### Gate C — Profiles e Social

1. Ajustar a allowlist de campos públicos pessoais e fechar a apresentação comercial com dados realmente pertencentes a Profiles.
2. Validar as rotas autenticadas de Reviews: autoria, resposta comercial, exclusão e bloqueios; a migration e a estrutura já estão aplicadas em desenvolvimento.
3. Comprovar por testes a matriz de perfil privado, Círculo, bloqueio, seguir, mídia e referências.

**Aceitação:** endpoints, DTOs e telas exibem somente campos aprovados; regras de privacidade são consistentes em todas as leituras.

### Gate D — Feed e Media

1. Validar todas as formas de consulta e índices, especialmente busca textual, seguindo, hashtags, perfil e comentários.
2. Cobrir concorrência, cursor, contadores e regras de visibilidade.
3. Tornar limpeza e retenção de arquivos verificáveis e resilientes a falhas, sem deixar filesystem e banco em estados divergentes.

**Aceitação:** testes de acesso e consistência passam com mídias de desenvolvimento; planos SQL das formas reais estão documentados.

### Gate E — Operação e proteção contra abuso

1. Definir proxy confiável e comportamento do IP de forma compatível com a hospedagem escolhida; não usar IP como identidade do dispositivo.
2. Decidir como rate limit funciona com múltiplas instâncias; cobrir também endpoints que não têm limitador local.
3. Completar estratégia durável de e-mail e recuperação do worker; readiness precisa representar dependências críticas.
4. Fechar configuração segura de CORS/cabeçalhos, métricas, alertas e limites de recursos.

**Aceitação:** cenários de falha e abuso são testados no ambiente de desenvolvimento, com valores de segredo protegidos e resultados observáveis.

### Gate F — Integração dos módulos futuros

Só após os gates anteriores, construir a API de Seek como consumidora dos perfis comerciais de Social/Profiles. Mensagens, Notificações e moderação precisam de domínios próprios e regras aprovadas antes de serem ligados. Shop permanece fora do escopo atual. A arquitetura lógica dos schemas por domínio não equivale a provisionar bancos físicos independentes.

**Aceitação:** nenhum módulo futuro é tratado como ativo até ter schema, contratos, autorização, integrações, testes e documentação correspondentes.

## Contagem consolidada

Os rascunhos supersedidos listados no índice não entram na contagem. Os apêndices A1 e A2 entram uma vez cada. Esta síntese referencia achados anteriores e não cria IDs adicionais.

| Veredito | Achados |
|---|---:|
| CONFIRMADO | 72 |
| PARCIAL | 60 |
| CONTRADITO | 15 |
| NÃO VERIFICADO | 16 |
| **Total** | **163** |

**Leitura do total:** achados confirmados descrevem evidência estrutural/comportamental estática; não equivalem a teste funcional executado. Achados não verificados são mantidos como tal, sem inferência.
