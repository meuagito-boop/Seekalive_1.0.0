# Fronteiras e fluxos entre Contas e Segurança

**Status:** desenho de integração para a arquitetura aprovada de banco físico por domínio; ainda não implementado.
**Ambiente observado:** desenvolvimento. Nenhum banco foi criado, migrado ou alterado por este documento.
**Escopo:** cadastro, verificação de e-mail, login, sessões/dispositivos, mudanças e recuperação de credenciais, exclusão/restauração e finalização. O aplicativo continua um monólito modular; cada domínio acessa somente o próprio banco.

## Decisões que orientam o desenho

1. **Contas é a autoridade da identidade e do ciclo de vida:** `account_id` UUID imutável, `@`, tipo, e-mails atual/verificado, estado da conta, idade/termos privados, interesses e prazos de exclusão.
2. **Segurança é a autoridade das credenciais e acessos:** hashes Argon2id, desafios/códigos, sessões, CSRF, instalações confiáveis, tentativas, bloqueios de segurança e revogações.
3. **Perfis é dono da inicialização de perfil comercial** conforme a fronteira já aprovada. A inicialização não pode compartilhar transação com Contas. O perfil não cria uma segunda identidade.
4. Cada domínio usa transações locais no próprio banco. Não há FKs, joins, locks ou transações SQL entre bancos. UUIDs externos são referências validadas por contrato.
5. O fluxo público pode ser composto por casos de uso de Auth no mesmo processo. Essa composição chama serviços/portas dos domínios, não tabelas/repositórios internos de outros domínios.
6. Comandos entre domínios são idempotentes por `operation_id`/`account_id`; eventos que precisam sobreviver a falhas são registrados em outbox local no banco de origem e deduplicados pelo domínio receptor. Não há exigência de introduzir um broker externo nesta etapa.
7. Login e autorização falham fechados se o estado autoritativo de Contas ou Segurança não puder ser validado. A política de exclusão exige bloqueio imediato: até existir invalidação distribuída com garantia e limite de atraso aprovado, o middleware deve confirmar o estado de Contas antes de autorizar uma sessão.

## Evidência do acoplamento atual

Hoje os módulos usam o mesmo cliente `db` de `@workspace/db` e os schemas Contas, Segurança e Perfis convivem na mesma instância de desenvolvimento. Os seguintes fluxos dependem de transações ou consultas cruzando domínios:

| Fluxo observado                 | Dados/domínios envolvidos na implementação atual                                                                                                                                      | Fronteira exigida                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro pessoal/comercial      | `registrationAccountRepository` grava conta, e-mail, reserva de @ e credencial na mesma transação; para conta comercial chama também o inicializador de perfil com a mesma transação. | Contas cria a identidade e a reserva; Segurança cria credencial/desafio; Perfis inicializa o perfil comercial numa operação própria, idempotente.                                             |
| Verificação de e-mail           | `emailVerificationRepository` consome desafio, marca e-mail verificado, ativa a conta e cria instalação confiável/sessão em uma transação.                                            | Segurança valida/consome o código; Contas verifica e ativa; Segurança emite sessão somente após confirmação de Conta ativa. Cada fase pode ser repetida sem duplicar efeitos.                 |
| Login                           | `loginRepository` junta conta, e-mail e credencial; numa transação consulta/atualiza estado, dispositivo e sessão.                                                                    | Contas resolve identidade e estado; Segurança verifica senha, bloqueio, dispositivo e sessão. A criação da sessão exige estado ativo verificado.                                              |
| Verificação de novo dispositivo | `deviceVerificationRepository` usa conta/e-mail/credencial, desafio, bloqueio, dispositivo e sessão dentro da mesma transação.                                                        | Desafio, tentativas, bloqueio de segurança, dispositivo e sessão pertencem a Segurança; o estado de Conta é consultado pelo contrato de Contas.                                               |
| Troca de e-mail                 | `emailChangeRepository` lê/ativa e-mail e credencial e manipula desafios na mesma transação.                                                                                          | Contas guarda e-mail atual e mudança pendente; Segurança reautentica, consome códigos e coordena a prova de endereço atual e novo. O e-mail atual só muda após a confirmação do novo.         |
| Troca/recuperação de senha      | Os repositórios consultam estado/e-mail de Contas e alteram credencial, desafios, sessões e dispositivos em transações no cliente compartilhado.                                      | Contas fornece apenas estado/e-mail verificado; Segurança executa a mudança de credencial, consome desafio e revoga acessos numa transação local.                                             |
| Pedido/restauração de exclusão  | `accountDeletionRepository` altera conta, e-mail, desafio e sessões numa transação; o login consulta `deletionScheduledFor` na própria consulta de Conta.                             | Contas controla status e prazos; Segurança controla o código e revoga sessões/dispositivos. A tela e o login leem o estado autoritativo de Contas.                                            |
| Exclusão definitiva             | `accountDeletionFinalizerRepository` reserva o @ e remove a conta; a limpeza de outros schemas depende hoje de cascatas da mesma instância.                                           | Contas coordena; cada banco proprietário limpa/anônimiza seus próprios dados e confirma por operação idempotente. Só então Contas encerra o tombstone, preservando a reserva do @ pelo prazo. |

`securityLockedAt` está hoje armazenado em `accounts`. Na arquitetura-alvo, bloqueio por risco/tentativas pertence a Segurança; suspensão ou encerramento da identidade continua sendo estado de Contas. Essa distinção deve ser migrada sem reduzir as proteções existentes.

## Sequência-alvo por fluxo

### 1. Cadastro

1. Auth valida o contrato e aplica as regras comuns de senha, idade, e-mail, username e tipo de conta.
2. Contas, em transação local, reivindica o `@` por constraint/lock local e cria uma identidade não ativa e um registro durável de operação de cadastro.
3. Segurança, em transação local e idempotente, grava a credencial e cria o desafio de verificação referenciando o `account_id`.
4. Para uma conta comercial, Perfis inicializa seu perfil por operação idempotente própria. O perfil fica indisponível publicamente até que a conta esteja ativa.
5. O código só é enviado depois que o desafio estiver persistido. Uma falha de entrega não desfaz a identidade nem cria uma conta ativa; permite reenvio limitado.
6. A resposta de sucesso (`verification_required`) só é emitida quando as etapas necessárias foram confirmadas. Falha parcial retorna erro recuperável e mantém a operação retomável; repetição não cria outro usuário, credencial, perfil ou código válido concorrente.

O registro durável da operação deve pertencer ao domínio que controla a criação da identidade; a deduplicação da credencial/desafio pertence a Segurança. Os nomes definitivos das tabelas/estados são decisão da migration de cada banco, não deste documento.

### 2. Verificação do e-mail

1. Segurança valida tentativas, expiração e uso único do código numa transação local; persiste que a prova foi aceita antes de comunicar o sucesso.
2. Contas recebe a confirmação idempotente e marca o e-mail verificado e a conta ativa somente se ainda estiver em `pending_verification`.
3. Segurança consulta/confirma o estado ativo em Contas e então cria a primeira instalação confiável e sessão na própria transação local.
4. Se Contas ficar indisponível após a confirmação do código, não há sessão. A operação pode ser repetida/reconciliada; o código já consumido não permite ativar outra conta.

### 3. Login e novo dispositivo

1. Contas resolve e-mail ou `@` normalizado e retorna o mínimo necessário: `account_id`, estado da conta, e-mail verificado e dados mínimos de apresentação. Não retorna credenciais.
2. Segurança aplica rate limit, compara Argon2id (inclusive verificação de hash fictício para identificador inexistente), aplica bloqueios, lê a instalação confiável e decide entre sessão ou desafio de código.
3. Antes de criar sessão e ao autorizar requisições protegidas, o estado de Conta deve ser válido. A indisponibilidade de Contas/Segurança falha fechado.
4. Código, tentativas, cooldowns de 30 s/90 s, bloqueio após a terceira falha, dispositivos confiáveis e sessões são gravados/revogados somente em Segurança. O bloqueio de segurança não altera o cadastro de identidade em Contas.
5. A operação é protegida contra replay e corridas entre login, bloqueio, revogação e pedido de exclusão. A revogação em Segurança pode ser repetida; o status não ativo em Contas impede acesso imediatamente mesmo se a revogação estiver aguardando retry.

### 4. Troca e recuperação de senha

- Contas fornece a verificação mínima de que a conta existe, está ativa e tem e-mail verificado.
- Segurança verifica a senha atual, grava/consome os desafios, atualiza o hash e revoga todas as sessões e instalações confiáveis na mesma transação local.
- E-mail de reset/change é enviado somente após o desafio persistir. A API não revela se um endereço pertence a uma conta.
- Se a confirmação perder uma corrida ou a operação expirar, a senha não muda. Reenvio e confirmação são idempotentes e sujeitos aos limites existentes.

### 5. Troca de e-mail

1. Contas mantém o e-mail atual como endereço efetivo e registra o novo como pendente, com unicidade reservada no próprio banco.
2. Segurança reautentica com a senha atual, cria e valida os desafios para o e-mail atual e depois para o novo.
3. Só após os dois códigos corretos Segurança solicita a Contas a troca idempotente do endereço; Contas revalida a unicidade antes de efetivar.
4. Segurança envia o aviso ao endereço antigo após a confirmação de commit em Contas. Em falha de envio, a mudança não é revertida; a notificação permanece recuperável.

### 6. Exclusão e restauração

1. Segurança consome o código de confirmação; Contas marca a conta como `deletion_pending` e grava pedido e prazo de sete dias numa transação local.
2. Contas registra um evento/outbox de mudança de estado. Segurança revoga sessões e instalações confiáveis localmente e de forma repetível. Enquanto a revogação não termina, a autorização consulta Contas e nega acesso à conta pendente.
3. A restauração exige senha e código válidos. Segurança confirma/consome o desafio; Contas limpa o agendamento e reativa a identidade; nenhuma sessão é criada. O titular faz login novamente.
4. Ao vencer o prazo, Contas emite comandos de exclusão a cada domínio dono. Cada domínio exclui seus próprios posts/mídias/interações, remove relações/salvos e, em Mensagens, anonimiza o remetente conforme as regras definidas. Cada resposta é persistida e deduplicada.
5. Contas só encerra a identidade depois das confirmações requeridas e aplica a reserva do `@` por 30 dias desde a solicitação. Erros temporários mantêm a operação recuperável; não se declara exclusão concluída enquanto um domínio não confirmou.

## Propriedades obrigatórias e recuperação

- **Sem falsa atomicidade:** uma chamada concluída num banco não prova que o outro concluiu. O processo deve guardar etapa/resultado e retomar sem duplicar efeito.
- **Estados explícitos:** cadastro incompleto, verificação aceita aguardando Conta, conta ativa, pedido de exclusão pendente, restauração e finalização precisam de transições condicionais e auditáveis.
- **Concorrência:** constraints/updates condicionais dentro do domínio proprietário protegem username/e-mail, consumo de desafio, mudança de credencial e datas de exclusão. Não usar locks distribuídos improvisados.
- **Outbox/inbox:** gravação de estado e intenção de evento ocorre na mesma transação local; consumidor deduplica por ID de evento/operação. Retries são limitados, observáveis e não enviam códigos ilimitados.
- **Falha fechada:** estado desconhecido, assinatura inválida, resposta parcial ou timeout não cria sessão nem ativa uma conta. Timeout depois de commit é tratado como resultado incerto e resolvido consultando a operação pelo mesmo ID.
- **Dados mínimos:** Segurança recebe `account_id` e atributos estritamente necessários; não recebe idade nem perfil completo. Contas nunca recebe hashes de senha nem tokens de sessão.
- **Sem cascata cruzada:** nenhum banco apaga dados de outro domínio por FK. A exclusão é uma coordenação explícita com confirmação por proprietário.

## Ordem para voltar à implementação

1. Tratar o desenho acima como a fronteira de trabalho; atualizar os contratos internos de Contas/Security e identificar todo acesso direto a tabelas de outro domínio.
2. Provisionar, em desenvolvimento, os bancos físicos de Contas e Segurança (e o banco proprietário de Perfil para a inicialização comercial), com conexões e credenciais independentes. Não reutilizar o único `db` atual como se fosse isolamento.
3. Projetar e revisar migrations separadas e a estratégia de transferência dos objetos/linhas atuais; fazer inventário read-only antes de qualquer cópia ou DDL.
4. Refatorar primeiro o cadastro/verificação com operações idempotentes; depois login/dispositivos; depois credenciais/e-mail; por fim exclusão/restauração/finalização.
5. Testar cada banco em isolamento e as combinações de sucesso/falha, timeout-após-commit, retry, duplicação, concorrência e indisponibilidade. Só então reavaliar fechamento de Accounts/Auth.

**Estado atual:** os testes anteriores em schema temporário validam a implementação no banco compartilhado atual; não provam integração entre bancos físicos. A migration `0006` permanece sem aprovação e não deve ser aplicada à instância compartilhada. Nenhum banco ou migration foi alterado por este plano.
