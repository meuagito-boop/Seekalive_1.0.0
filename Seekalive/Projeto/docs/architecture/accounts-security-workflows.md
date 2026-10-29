# Fronteiras e fluxos entre Contas e Segurança

**Status:** arquitetura lógica para o ambiente de desenvolvimento. Contas, Segurança, Perfis/Relações, Feed e Seek são módulos separados no código e schemas separados no mesmo PostgreSQL compartilhado. Não há provisionamento de bancos físicos por domínio neste escopo.
**Escopo:** cadastro, verificação de e-mail, login, sessões/dispositivos, credenciais, exclusão/restauração e relação com a inicialização do perfil comercial.

## Ownership por domínio

| Domínio                      | Responsabilidade de dados                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contas (`accounts`)          | UUID canônico, `@`, tipo/status, idade e termos privados, e-mail, interesses e ciclo de vida da identidade.                                      |
| Segurança (`security`)       | Hashes Argon2id, desafios/códigos, sessões, CSRF, instalações confiáveis, tentativas e revogações.                                               |
| Perfis/Relações (`profiles`) | Relações sociais, pedidos de seguimento e bloqueios. O perfil comercial público precisa manter uma fronteira própria, sem criar nova identidade. |
| Seek (`seek`)                | Dados da listagem comercial e descoberta: categoria, endereço principal e dados comerciais próprios do Seek.                                     |
| Auth                         | Coordena casos de uso e ordem das operações; não é proprietário das tabelas acima.                                                               |

As FKs entre schemas são válidas na infraestrutura compartilhada atual. Módulos ainda devem acessar dados por operações/composição explícitas; compartilhar um PostgreSQL não autoriza qualquer módulo a gravar diretamente em qualquer tabela.

## Estado observado no código

- `@workspace/db` cria um único pool PostgreSQL e uma instância Drizzle para o runtime.
- A composição de cadastro coordena adaptadores de Contas, Segurança e Profiles dentro da mesma transação, preservando atomicidade neste banco compartilhado.
- Os arquivos de schema estão organizados por domínio em `infra/database/src/schema/`; as tabelas de relação pertencem a `profiles/relationships.ts`. O registry central apenas compõe as tabelas para Drizzle.
- `business_profiles` permanece no schema lógico `seek`, pois representa a listagem comercial usada pela descoberta. O inicializador de cadastro está em Profiles. Essa distinção entre o perfil Social e os dados de listagem do Seek deve ser preservada; não mover a tabela nem alterar FKs sem uma decisão funcional e migration de dados revisada.
- Os campos legados de apresentação e preferências que ainda ficam em `accounts.accounts` estão registrados em `database-domains.md`. A extração ocorrerá junto à implementação das APIs proprietárias, evitando fontes duplicadas.
- A configuração não cria nem conecta bancos físicos separados, não escolhe provedor externo e não executa migrations.

## Fluxos e invariantes

### Cadastro

1. Auth valida o contrato e as políticas aprovadas.
2. Contas cria a identidade pendente, e-mail e reserva do `@`.
3. Segurança grava a credencial e o desafio de verificação.
4. Para conta comercial, a composição chama o inicializador de perfil previsto no fluxo.
5. As gravações são confirmadas ou revertidas na transação compartilhada. O código de verificação é enviado após persistir o desafio.
6. A conta não pode autenticar até o e-mail estar confirmado.

### Verificação, login e dispositivo

- Desafio, tentativas, cooldowns, consumo, dispositivos confiáveis e sessões pertencem a Segurança.
- Contas é fonte oficial do estado cadastral e do e-mail verificado.
- A sessão só é emitida para identidade ativa e e-mail confirmado; falha ao validar estado deve negar o acesso.
- O dispositivo confiável é uma instalação identificada por token revogável, com somente o hash armazenado. IP não é identificador durável de dispositivo.

### Alteração e recuperação de credenciais

- A senha é armazenada com Argon2id; nunca em claro ou em logs.
- Troca de senha exige a senha atual e confirmação pelo e-mail atual, conforme regra aprovada; sessões e dispositivos confiáveis são revogados após a alteração.
- Troca de e-mail mantém o endereço atual até confirmação do novo e requer senha e código no endereço atual; o endereço anterior recebe aviso de segurança após a mudança.
- Recuperação sem acesso ao e-mail atual segue suporte manual; o procedimento de comprovação adicional permanece fora do escopo acordado.

### Exclusão e restauração

- A solicitação exige confirmação conforme o fluxo atual; a conta fica imediatamente oculta/desativada por sete dias.
- Durante o prazo, a tela de login permite restauração com senha e código de e-mail; a restauração não cria sessão automaticamente.
- Ao vencer, a exclusão remove os dados existentes da conta e das relações cobertas pelas cascatas atuais; Mensagens, Mídias e demais domínios só podem completar suas próprias regras quando suas persistências existirem.
- A reserva do `@` permanece pelo prazo aprovado. Dados de mensagens que venham a existir devem preservar o conteúdo do destinatário e anonimizar o remetente, conforme regra já definida.

## Confiança e Segurança de Conteúdo

Confiança e Segurança não deve ser absorvida por Contas, Segurança, Profiles, Feed, Mensagens ou Seek. Denúncias e decisões de moderação podem ter alvos em todos esses domínios; a fonte original do recurso continua pertencendo ao domínio de origem. Um domínio lógico separado (`trust_safety`) permite restringir evidências, decisões e histórico de moderação sem duplicar conteúdo.

No estado atual, não há tabela de denúncia nem ação de moderação no schema Drizzle, nem API de moderação. Antes de implementar, precisam ser aprovados tipos de denúncia, evidência mínima, papéis de moderador, estados de revisão, retenção, recurso e contrato para solicitar a aplicação de ações ao domínio dono. Uma denúncia é uma alegação, não prova de violação. A proposta de tabelas em `schema-core.sql` é apenas referência, não modelo ativo.

## Shop

Shop está fora do escopo atual. Nenhuma tabela, API ou fluxo de catálogo/compra será construído nesta etapa. A migration histórica `0004` contém a criação de um schema vazio `shop`; o código atual não o registra como domínio ativo. A migration histórica não será reescrita nem executada para remover o schema.

## Estado de migrations e validação

- Após autorização explícita, o SQL de `0006_brief_raza.sql` foi aplicado em uma única transação ao banco de desenvolvimento `heliumdb`. A leitura anterior confirmou as colunas ausentes e zero contas; a verificação posterior confirmou as duas colunas, a restrição `accounts_deletion_schedule_consistent` e o índice `accounts_deletion_due_idx`. Nenhum dado de conta foi alterado e produção não foi acessada.
- A API recebeu um smoke test sem sessão no endpoint de solicitação; respondeu `403 CSRF_REJECTED`, não `503 ACCOUNT_DELETION_SCHEMA_REQUIRED`. Isso confirma que a verificação de schema passou, mas não testa uma jornada autenticada.
- `drizzle-kit check` passou e a suíte específica de exclusão passou 3/3 em schema temporário isolado. O E2E do frontend usa API simulada; nenhum e-mail real foi enviado.
- **Reconciliação concluída no desenvolvimento:** foram criados tracks independentes e baselines para Accounts, Security, Profiles e Seek, com ledgers próprios em `drizzle`. A leitura do banco `heliumdb` confirmou 12 tabelas vazias, objetos correspondentes aos baselines, ausência de `feed.posts` e ausência de histórico anterior. Cada ledger recebeu uma entrada com hash e timestamp do respectivo baseline.
- **Validação da reconciliação:** `drizzle-kit check` passou nos quatro tracks; os comandos `migrate:accounts`, `migrate:security`, `migrate:profiles` e `migrate:seek` reconheceram os baselines existentes. A leitura posterior confirmou exatamente uma entrada por ledger, nenhuma tabela global `drizzle.__drizzle_migrations`, zero linhas nas tabelas de negócio consultadas e `feed.posts` ainda ausente. Nenhuma DDL de negócio foi executada e produção não foi acessada.
- **Bootstrap reproduzível:** os quatro baselines foram aplicados em schemas descartáveis numa transação, com contagens esperadas de tabelas, colunas, FKs, checks e índices; os schemas de teste foram removidos. A validação detectou e corrigiu expressões qualificadas inválidas em constraints e no índice parcial.
- **Histórico legado:** a sequência combinada antiga `0000`–`0006` foi preservada para auditoria, mas deixou de ser o caminho executável do pacote. O `0005` histórico não foi aplicado nem registrado como feito. Não há track Feed ativo e Shop segue fora do escopo.
- **Proteções operacionais:** o comando `push` agora só aceita schema temporário de teste; o pós-merge verifica os journals e não aplica schema automaticamente. Novas mudanças usam o track do domínio proprietário e exigem alvo explícito.

## Critérios para encerrar Accounts/Auth

1. Concluir e testar cadastro pessoal e comercial, verificação obrigatória de e-mail, login, novo dispositivo, sessões e revogação.
2. Manter a evolução pelos tracks independentes documentados em `docs/architecture/database-migration-tracks.md`; criar o track Feed somente quando essa etapa for autorizada e Shop permanece fora do escopo.
3. Testar a jornada de solicitação/restauração de exclusão com API e banco temporário isolado e entrega de código em memória.
4. Confirmar que nenhum endpoint público expõe idade, e-mail, hashes ou tokens.
5. Registrar lacunas de Mídias, Feed e Mensagens como não implementadas; não alegar que a exclusão já cobre dados que ainda não têm persistência.

O critério não exige separar bancos físicos, escolher provedor de hospedagem ou criar filas. Esses temas não são pré-requisitos para o modelo lógico por domínio.
