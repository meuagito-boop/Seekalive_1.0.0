# 03 — Cadastro, autenticação, sessões e dispositivos

## Método e limites

Revisão estática do contrato compartilhado, serviços de aplicação, repositórios, rotas e schema do banco. Não foram criadas contas, solicitados códigos, feitas autenticações nem enviados e-mails. As regras de concorrência foram inferidas do SQL/Drizzle; não foram submetidas a testes paralelos.

## Achados

### 03-001 — A verificação de idade usa a data informada e calcula o limite no calendário de São Paulo

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `shared/contracts/src/auth.ts:7–27` exige `DD/MM/AAAA` e valida a existência da data. `Aplicativo/back/src/modules/accounts/domain/accountAgeEligibility.ts:10–18, 41–71` calcula a idade no fuso `America/Sao_Paulo`; `createRegistrationAccount.ts:30–36` impede a criação quando inelegível. A validação do schema usa componentes UTC apenas para conferir se o dia existe no calendário; a comparação da idade usa São Paulo.

```ts
const AGE_CALENDAR_TIME_ZONE = "America/Sao_Paulo";
...
const eligibility = assessAccountAge(
  registration.dateOfBirth,
  getCurrentDate(),
);
if (eligibility.kind === "ineligible") {
  return { kind: "age_ineligible", reason: eligibility.reason };
}
```

### 03-002 — O código adiciona idade máxima de 120 anos além do mínimo aprovado

**Veredito:** CONTRADITO  
**Prioridade:** Média

**Evidência:** `accountAgeEligibility.ts:69–71` rejeita idade inferior a 18 e superior a 120. A regra aprovada registrada pelo usuário define idade mínima de 18; não foi localizada decisão de idade máxima.

```ts
if (age < 18) return { kind: "ineligible", reason: "underage" };
if (age > 120) return { kind: "ineligible", reason: "over_age_limit" };
```

**Impacto:** Uma pessoa com data válida e idade superior a 120 não consegue se cadastrar. A intenção pode ser rejeitar datas evidentemente equivocadas, mas isso não está formalizado como política.

### 03-003 — A data de nascimento não é persistida, mas a idade calculada é armazenada

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** O fluxo de Auth converte `dateOfBirth` em `eligibility.age` (`createRegistrationAccount.ts:30–58`) e não encaminha a data original. `accounts/infrastructure/accountRegistrationRepository.ts:52–60` grava `age` na tabela Accounts. Uma busca estática por `accounts.age` e `age:` em `Aplicativo/back/src/modules` e `shared/contracts/src` encontrou uso da idade apenas durante o cadastro; não encontrou campo `age` nas respostas desses módulos.

```ts
.values({
  username: input.username,
  age: input.age,
  acceptedTermsVersion: input.acceptedTermsVersion,
  accountType: input.accountType,
  status: "pending_verification",
})
```

**Impacto:** A data exata não fica armazenada, mas a idade capturada no cadastro é um dado pessoal derivado e envelhece com o tempo. Não foi encontrada resposta pública com esse campo. A necessidade de reter esse valor após concluir a verificação de 18 anos não está justificada no código.

### 03-004 — A criação divide dados de conta, credencial e perfil, mas depende de uma única transação entre domínios

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `auth/composition/registration.ts:1–17` compõe o cadastro com `Accounts`, Auth e inicializadores de `Profiles`. `registrationAccountCoordinator.ts:37–80` executa a criação da identidade, credencial e perfis dentro do mesmo `runInTransaction`; cada inicializador recebe a mesma `DatabaseTransaction`.

```ts
return dependencies.runInTransaction(async (transaction) => {
  const account = await dependencies.createPendingAccountIdentity(transaction, ...);
  await dependencies.createInitialPasswordCredential(transaction, ...);
  await dependencies.initializeAccountProfile(transaction, account.id, ...);
  if (input.accountType === "commercial") {
    await dependencies.initializeCommercialProfile(transaction, account.id, ...);
  }
});
```

**Avaliação:** A propriedade lógica está razoavelmente separada: Accounts cria identidade/e-mail; Auth cria credencial; Profiles inicializa o perfil. Porém, a atomicidade depende de todos os domínios compartilharem uma conexão transacional. Quando cada domínio tiver banco físico próprio, essa transação única não pode ser preservada sem uma estratégia explícita de coordenação distribuída. A conexão física futura não foi configurada nem testada.

### 03-005 — Autenticação é própria, sem Clerk, e usa Argon2id e sessões opacas no servidor

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `Aplicativo/back/src/modules/auth/application/passwordHashing.ts:3–12` usa Argon2id, custo de memória 65.536 KiB, três iterações e paralelismo 1. `sessionMaterial.ts:6–18` gera token aleatório de 32 bytes e grava hash do token, não o token bruto. `sessionConfig.ts:1–10` exige `SESSION_SECRET` com pelo menos 32 bytes. A busca por SDK/integração Clerk em código e manifests não encontrou uso.

```ts
const ARGON2ID_OPTIONS = {
  type: argon2.argon2id as 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};
```

**Limite:** Esta é uma leitura de implementação, não uma validação de resistência por benchmark, pentest ou teste de carga.

### 03-006 — A senha segue as regras aprovadas; cadastro comercial também exige campos de descoberta

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `shared/contracts/src/auth.ts:29–36` exige 8–128 caracteres, maiúscula, minúscula, número e caractere especial; o hashing é Argon2id (03-005). `:47–73` define os dois tipos de conta; o tipo comercial exige também `categoryKey`, `discoveryKind`, endereço, CEP, cidade, estado e país.

```ts
.min(8).max(128)
.regex(/\p{Lu}/u)
.regex(/\p{Ll}/u)
.regex(/\p{N}/u)
.regex(/[\p{P}\p{S}]/u);
```

**Impacto:** A política de senha coincide com a regra aprovada. Os dois campos adicionais de descoberta são parte obrigatória do cadastro comercial; devem estar representados no formulário e descritos como exigências, não como dados opcionais.

### 03-007 — Uma conta com e-mail não verificado não obtém sessão

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `authenticateLogin.ts:75–80` retorna `email_not_verified` para conta pendente ou e-mail sem `verifiedAt`. `loginRoutes.ts:49–56` devolve erro 403 e declara que nenhuma sessão foi criada. O desafio de verificação expira em 10 minutos e permite cinco tentativas (`emailVerification/policy.ts:1–2`).

### 03-008 — Novo navegador/instalação é reconhecido por token revogável, não por IP ou identificador físico

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `startDeviceVerification.ts:30–35` gera 32 bytes aleatórios, armazena o hash e envia um código. `authenticateLogin.ts:55–59, 92–95` valida token de 43 caracteres e procura o hash no banco. `confirmDeviceLogin.ts:116–120` cadastra o hash como dispositivo confiável. O token é transportado no cookie HttpOnly/Secure/SameSite (`sessionCookies.ts:27–32`). Uma busca por colunas/campos de IP nos fluxos Auth e schemas não encontrou persistência de IP para identificar sessão ou dispositivo.

**Interpretação:** O mecanismo reconhece uma instalação daquele navegador que conserva o cookie. Não identifica hardware físico de celular ou computador, nem persiste IP como identidade do aparelho. Isso corresponde à definição aprovada de token revogável, mas o produto deve chamar a entidade de “dispositivo/instalação reconhecida”, não alegar identificação física.

### 03-009 — O código de novo dispositivo tem prazo, limite de tentativas e atrasos de reenvio definidos

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `challenges/deviceLogin.ts:6–9` define validade de 10 minutos, três tentativas, intervalo inicial de 30 segundos e intervalo final de 90 segundos. `loginRoutes.ts:110–152` solicita o código somente após senha correta e dispositivo desconhecido; a resposta mostra o e-mail mascarado e os horários do desafio.

### 03-010 — A terceira falha de código bloqueia a conta e revoga todas as sessões e instalações confiáveis

**Veredito:** CONFIRMADO  
**Prioridade:** Alta

**Evidência:** `confirmDeviceLogin.ts:76–103` bloqueia na terceira tentativa incorreta. `deviceVerificationRepository.ts:140–181` define `securityLockedAt`, revoga sessões e dispositivos e consome os demais desafios de login daquele titular. As rotas devolvem 423 e orientam procurar suporte (`deviceVerificationRoutes.ts:56–62`).

**Risco de disponibilidade:** A política está implementada conforme a decisão do usuário, mas cria um bloqueio total de conta. Quem conhece a senha válida pode iniciar um desafio para instalação não reconhecida e errar os três códigos, provocando bloqueio e revogação. A limitação por IP é local ao processo; mitigação distribuída e operação de desbloqueio não foram validadas neste bloco.

### 03-011 — O limite de duas sessões simultâneas e a revogação da mais antiga estão implementados

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `application/sessions/sessionPolicy.ts:1–14` define máximo de duas e seleciona as mais antigas para revogação. `sessionCreationRepository.ts:21–61` bloqueia a linha da conta, lista sessões ativas em ordem determinística, revoga as necessárias e insere a nova dentro da transação.

**Limite:** A correção sob concorrência foi avaliada pelo fluxo de locks, mas não houve teste paralelo no banco.

### 03-012 — A sessão tem expiração absoluta de sete dias por padrão, incompatível com “sem limite de inatividade”

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `security/sessionConfig.ts:12–16` define sete dias como padrão e permite configurar de 60 segundos até 30 dias. `sessionMaterial.ts:6–18` calcula `expiresAt` uma vez na criação. `activeSession.ts:39–43` rejeita sessão vencida; a busca estática de atualizações de `sessions.expiresAt` não encontrou renovação por atividade.

**Impacto:** A sessão expira após prazo contado da criação, mesmo com uso ativo. Isso não equivale a expiração por inatividade e conflita com a decisão registrada de não impor limite temporal à sessão.

### 03-013 — O cookie de instalação confiável expira após 400 dias, não apenas quando revogado

**Veredito:** CONTRADITO  
**Prioridade:** Média

**Evidência:** `security/sessionConfig.ts:1–4` define `DEVICE_COOKIE_MAX_AGE_MS` como 400 dias. `sessionCookies.ts:27–32` aplica esse `maxAge`; os únicos pontos de gravação localizados são login e confirmação do novo dispositivo. Não foi encontrada renovação periódica do cookie durante uso.

**Impacto:** Uma instalação sem novo login por mais de 400 dias perde o token no navegador e precisa passar novamente pela confirmação por e-mail, embora a regra aprovada seja manter o dispositivo reconhecido até revogação.

### 03-014 — Configurações permitem revogar sessões e dispositivos, mas mostram poucos dados para distingui-los

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `sessionRoutes.ts:94–101` retorna ID, datas e indicação da sessão atual. `trustedDeviceManagementRepository.ts:7–22` retorna ID, `createdAt` e `lastSeenAt`. Nenhuma dessas respostas fornece nome da instalação, tipo de aparelho ou localização/IP. As rotas também permitem revogar uma sessão ou dispositivo específico e os demais.

**Impacto:** A revogação existe, mas o titular precisa inferir a qual computador/celular cada registro corresponde pelas datas. O backend não possui metadados suficientes para apresentar um rótulo reconhecível; isso não deve ser preenchido com IP sem decisão específica.

### 03-015 — Troca e redefinição de senha revogam sessões e dispositivos; alteração de e-mail mantém duas confirmações e avisa o endereço antigo

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** A troca de senha exige senha atual e código, e revoga sessões/dispositivos (`passwordChange/requestPasswordChange.ts:35–63`; `confirmPasswordChange.ts:71–86`). A redefinição também revoga ambos (`confirmPasswordReset.ts:77–92`). A alteração de e-mail pede senha atual, código no e-mail atual e, depois, código no novo endereço (`startEmailChange.ts:37–60`; `confirmCurrentEmailChange.ts:55–104`); somente após a confirmação nova atualiza o e-mail e envia aviso ao antigo (`confirmNewEmailChange.ts:81–130`).

**Limite:** A entrega dos e-mails não foi testada nesta auditoria.

### 03-016 — Tentativas de verificação de e-mail usam lock de linha em transação, não incremento SQL atômico

**Afirmação da doc:** N/A — verificação da hipótese prioritária sobre `auth_challenges.attempts`.

**Veredito:** PARCIAL
**Risco:** Médio — o padrão serializa o fluxo observado, mas não há teste concorrente que confirme o limite em corrida.

**Evidência:** `emailVerificationRepository.ts:76–101` executa a operação dentro de `db.transaction` e lê o desafio `verify_email` com `.for("update")`. `confirmEmailVerification.ts:59–62` passa `challenge.attempts + 1`; o repositório grava esse valor absoluto em `:104–120`, em vez de fazer `attempts = attempts + 1` no SQL. As chamadas que seguem esse caminho ficam serializadas pelo lock da linha; não foi encontrado teste de confirmações paralelas.

**Trecho:** `.for("update")`; em seguida `.set({ attempts })` com condições de desafio não consumido, não expirado e abaixo do máximo.

### 03-017 — Contas pendentes de verificação não têm TTL ou purga automática identificada

**Afirmação da doc:** N/A — verificação da hipótese prioritária sobre contas não verificadas.

**Veredito:** PARCIAL
**Risco:** Médio — identidade, nome de usuário e e-mail podem permanecer reservados após o desafio expirar.

**Evidência:** `emailVerification/policy.ts:1–2` dá TTL de dez minutos ao código. `accountRegistrationRepository.ts` cria a conta com `status: "pending_verification"`; o fluxo de verificação muda esse estado para `active` (`emailVerificationRepository.ts:153–163`). Busca estática de `pending_verification` e remoção de contas encontrou a purga somente para `deletion_retained` no worker de exclusão, não uma limpeza de contas pendentes.

**Trecho da saída:** os caminhos de criação e ativação existem; não foi encontrado job/consulta que apague `accounts.status = "pending_verification"` após expirar o código.

### 03-018 — O hashing Argon2id não tem limite global de concorrência no código da aplicação

**Afirmação da doc:** N/A — verificação da hipótese prioritária de exaustão de recursos.

**Veredito:** PARCIAL
**Risco:** Alto sob tráfego concorrente — cada hash usa 65.536 KiB de memória e não há semáforo/fila global visível.

**Evidência:** `application/passwordHashing.ts:3–12` configura Argon2id com `memoryCost: 65_536` e chama diretamente `argon2.hash`. Cadastro, troca de senha, redefinição e atualização de senha chamam esse serviço. Busca por semáforo, fila ou limitador global de hashing no backend não encontrou mecanismo correspondente. Não foi feito benchmark nem teste de concorrência.

**Trecho:** `return argon2.hash(password, ARGON2ID_OPTIONS);`.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 8 |
| PARCIAL | 7 |
| CONTRADITO | 3 |
| NÃO VERIFICADO | 0 |

**Próximo bloco:** Profiles, privacidade, seguidores, Círculo, bloqueios e avaliações comerciais.
