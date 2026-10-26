# Back-end e banco de dados

## Arquitetura encontrada

O serviço de API fica em `Aplicativo/back`, pacote `@workspace/api-server`. O runtime é Express 5; schemas Zod e tipos são importados de `@workspace/api-zod`; persistência está em `infra/database` via Drizzle e PostgreSQL. O build de backend é configurado em `Aplicativo/back/build.mjs`, e o ponto de montagem das rotas é `Aplicativo/back/src/app.ts` → `modules/index.ts`.

Os módulos presentes em `Aplicativo/back/src/modules` são:

- `accounts`: regras comuns de conta, visibilidade e política de @.
- `auth`: cadastro, login/sessão, desafios, verificação de e-mail/dispositivo, alteração/recuperação de senha, e-mail e dispositivos/sessões confiáveis.
- `feed`: operações de texto/artigo existentes no código; cobertura de persistência e endpoints ainda precisa ser conciliada com as migrações e contratos.
- `health`: disponibilidade/health check.
- `onboarding`: gravação e leitura de interesses/conclusão.
- `profiles`: consulta/atualização de perfil próprio/público, privacidade e disponibilidade de @.
- `social`: seguir, solicitações, bloqueio, listas e círculo.
- `security`: proteção transversal da API e rotas relacionadas a conta/sessão.

Cada módulo usa diretórios de aplicação e apresentação em graus diferentes. A separação por pastas existe; a regra de que a apresentação somente converte HTTP em chamadas de aplicação ainda não está completamente cumprida.

## Entradas e fluxo de requisição

1. `src/app.ts` cria o Express, configura middleware e monta a API.
2. `src/modules/index.ts` monta routers dos módulos em `/v1` e organiza endpoints sociais.
3. Arquivos `presentation/*Routes.ts` validam path/body/estado de sessão e retornam respostas.
4. A aplicação contém casos de uso/regras em `application/`; a persistência usa a camada Drizzle/database.
5. O contrato compartilhado provê códigos e schemas consumidos tanto pelo cliente quanto pela API.

O proxy de desenvolvimento é configurado em `Aplicativo/front/vite.config.ts`: encaminha `/api` para o servidor de API e normaliza o IP encaminhado antes de o backend o aceitar. No backend, `trust proxy` permanece desligado; o helper de IP aceita a informação encaminhada somente a partir do proxy local esperado. IP é usado como dado transitório de segurança/rate limit; o token revogável é a identidade durável da instalação. Isso é comportamento de desenvolvimento verificado no código, não evidência de proxy de produção.

## Domínios de dados

Os schemas/tabelas Drizzle estão em `infra/database/src/schema/`:

| Schema PostgreSQL | Arquivo de schema | Tabelas declaradas em código | Domínio |
|---|---|---|---|
| `accounts` | `accounts.ts` | `accounts`, `account_emails`, `account_interests`, `account_username_reservations` | Identidade da conta, e-mail, interesses e reservas temporárias do @ |
| `security` | `security.ts` | `password_credentials`, `auth_challenges`, `trusted_devices`, `sessions` | Credenciais, desafios de confirmação, instalações confiáveis e sessões |
| `profiles` | `social.ts` | `account_follows`, `account_follow_requests`, `account_blocks` | Relações entre contas, solicitações e bloqueios |
| `seek` | `seek.ts` | `business_profiles` | Dados de perfil comercial do Seek |
| `feed` | `feed.ts` | `posts` | Publicações |

**Total do modelo fonte:** 13 tabelas em 5 schemas com tabelas. A configuração reconhece 12 schemas de domínio, além do schema `public` (13 no total); vários domínios ainda não possuem tabelas.

### Migrações

- `0000_high_avengers.sql` cria as 11 tabelas iniciais.
- `0001_ancient_spitfire.sql` adiciona reservas de @ e timestamps de alteração (12 tabelas após a migração).
- `0002_magenta_ser_duncan.sql` amplia desafios com e-mail pendente.
- `0003_fuzzy_otto_octavius.sql` cria/move tabelas para schemas de domínio.
- `0004_noisy_gargoyle.sql` registra schemas futuros ainda sem tabelas.
- `0005_mushy_centennial.sql` cria `feed.posts` (13ª tabela no modelo).

O `drizzle-kit check` passou sobre a consistência do histórico local. Isso valida os arquivos de migration entre si, não confirma quais migrations foram aplicadas no banco. A documentação afirma que a migration `0005` está pendente; o banco de desenvolvimento não foi consultado nesta execução, logo o estado físico permanece **não verificado**.

### Divergência de dicionário

`docs/api/backend/data-dictionary.md` apresenta a alegação de 12 tabelas, mas a relação nela exibida omite `account_username_reservations`. O documento não inclui `feed.posts` como tabela ativa, coerente com seu status descrito como migration pendente, mas não deve ser usado como lista integral do modelo fonte. Corrigir o dicionário exige distinguir:

1. tabelas modeladas no código;
2. tabelas criadas pelas migrations versionadas;
3. migrations efetivamente aplicadas ao banco;
4. domínios futuros sem tabelas.

## Camada de apresentação ainda ligada ao banco

Foi localizado import de `@workspace/db` em 17 arquivos de apresentação: 16 ligados a fluxos de produto e um de prontidão operacional. As leituras e escritas estão espalhadas nestas rotas:

- **Auth:** `csrfRoutes.ts`, `deviceVerificationRoutes.ts`, `emailVerificationRoutes.ts`, `passwordResetRoutes.ts`, `passwordUpdateRoutes.ts`, `registrationRoutes.ts`, `sessionRoutes.ts`, `trustedDeviceRoutes.ts`.
- **Profiles:** `accountAvailabilityRoutes.ts`, `privacyRoutes.ts`.
- **Social:** `accountSearchRoutes.ts`, `blockListRoutes.ts`, `circleRoutes.ts`, `followerListRoutes.ts`, `followingListRoutes.ts`, `followRequestListRoutes.ts`.
- **Health:** `readinessRoutes.ts` usa pool para verificar prontidão do serviço; esta dependência de infraestrutura é compatível com a finalidade de health/readiness.

No grupo de Auth, as transações de verificação, senha, dispositivo e CSRF são exemplos de operações de persistência presentes no adaptador HTTP. Nas rotas Social/Profiles, consultas de listas, busca e privacidade também vão ao banco diretamente. O efeito arquitetural é que parte de validação, composição de transação e tratamento HTTP fica acoplada. Não é falha de compilação; é dívida de fronteira de camadas.

`profiles/presentation/publicProfileRoutes.ts` orquestra dentro do handler a leitura da conta, bloqueios, relação de seguimento, visibilidade e publicações/artigos, chamando funções dos módulos `accounts`, `social` e `feed`. A composição é de domínio e deveria ficar num caso de uso de leitura; a rota deveria permanecer como adaptador HTTP.

## Domínios e dependências cruzadas

Dependências verificadas entre módulos de backend incluem:

- `accounts` usa serviços de `social` para estatísticas/estado de relações.
- `feed` usa política/consulta de `accounts`.
- `profiles` usa regras e views de `accounts` e relações de `social`.
- rotas de perfil público agregam os casos de uso de mais de um domínio.

Algumas dependências são legítimas (um perfil precisa expor relações), mas a direção atual não é uniforme e a apresentação participa de agregações. Antes de criar mais domínios, convém explicitar contratos de consulta e a direção autorizada dos imports para evitar ciclos e regras duplicadas.

## Segurança e comportamento de conta observados

- Política compartilhada de senha: mínimo 8, máximo 128, ao menos maiúscula, minúscula, número e símbolo; hash no backend por Argon2id.
- Cadastro requer conta pessoal ou comercial, idade mínima 18, e-mail e username segundo schema compartilhado.
- Existe verificação de e-mail como condição para autenticação; desafios e dispositivos/sessões estão representados no domínio `security`.
- Sessões usam cookie e defesa CSRF; writes do cliente devem enviar o token CSRF.
- Código de dispositivo confiável é ligado a instalação, revogável por conta, e revogação está disponível pela API.
- Erros têm contrato `{ error: { code, key, message, requestId, ... } }`; status HTTP é transporte e não substitui o código numérico único de domínio.
- Limites de corpo JSON e logging/request id estão configurados no app. Nenhum segredo foi lido ou escrito para esta auditoria.

Estes pontos descrevem implementação encontrada e não significam auditoria de segurança formal, teste de penetração ou aprovação regulatória.

## Cobertura funcional da API

### Presente na API

- cadastro/login/verificação de e-mail e dispositivo;
- sessão atual, logout, lista/revogação de sessões/dispositivos;
- atualização/recuperação de senha e alteração de e-mail;
- onboarding de interesses;
- leitura/atualização de dados da conta e configurações de privacidade;
- perfis público/próprio e disponibilidade de username;
- relações sociais (seguir, aceitar/recusar pedido, bloquear/desbloquear, listas e círculo);
- publicação de texto/artigo em primeira etapa.

### Não comprovado como completo/ligado

- operações completas de comentários, curtidas, repostagens, feed de recomendação e upload/durabilidade de mídia;
- persistência de eventos, avaliações do Seek, catálogo/ordens/checkout do Shop;
- armazenamento durável de mídia, fila, cache e notificações externas;
- execução de migrações no banco real deste ambiente;
- integração operacional dos domínios `messages`, `notifications`, `shop`, `media`, `location`, `search` e `trust_safety`.

O pacote de banco tem schemas reservados para esses domínios, mas schema reservado não é implementação de endpoints nem integração ativa.

## Testes de backend e banco

O teste raiz atual passou em 93 casos no conjunto dos pacotes de teste. O teste que cria schema temporário requer `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1`, `SEEKALIVE_EXPECTED_DATABASE` e a URL configurada. Nesta sessão havia URL de banco definida, mas não havia a confirmação `SEEKALIVE_EXPECTED_DATABASE`; a suíte isolada de escrita não foi executada. Nenhuma tabela foi criada/modificada e nenhuma migração foi aplicada.

O arquivo `Aplicativo/back/test/api-isolated-db.test.mjs` é muito maior do que os demais testes (1.933 linhas) e concentra testes isolados de várias partes; há oportunidade de dividir por contrato/domínio sem alterar o comportamento, mas não foi dividido nesta auditoria.
