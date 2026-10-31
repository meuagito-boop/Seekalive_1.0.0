# 04 — Profiles, privacidade e relações sociais

## Método e limites

Revisão estática dos serviços, regras de domínio, repositórios e rotas de Profiles/Social/Feed. Nenhuma conta ou conteúdo de usuário foi consultado no banco. Não foram executadas chamadas de escrita, nem testes de permissões.

## Achados

### 04-001 — Perfil privado exige seguimento aprovado; Círculo continua sendo seguimento mútuo

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `profiles/domain/profileVisibility.ts:1–9` permite conteúdo privado ao titular ou a quem tem seguimento aceito. `social/domain/relationshipView.ts:17–30` define Círculo somente quando o seguimento do visitante é aceito e há seguimento recíproco. `feed/application/postVisibility.ts:26–35` aplica essas regras a publicações privadas e de Círculo.

```ts
if (!isPrivate) return true;
return viewerId === profileOwnerId || following === "accepted";
...
inCircle: following === "accepted" && state.reciprocalFollow,
```

**Resultado:** A pessoa aprovada vê o conteúdo de perfil privado; o status de Círculo não se torna recíproco só por aprovação de seguimento.

### 04-002 — Bloquear remove as relações bilaterais e desbloquear não as recria

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `social/infrastructure/blockMutationRepository.ts:9–30` cria o bloqueio e remove seguimentos e pedidos pendentes nos dois sentidos. `:34–42` remove apenas o bloqueio ao desbloquear. `profiles/application/publicProfile.ts:55–57, 115–119` retorna perfil não encontrado quando há bloqueio entre as contas.

**Resultado:** Depois do desbloqueio, os antigos vínculos não são restaurados automaticamente. As rotas/serviços de mensagens ainda não existem, portanto ocultar e restaurar conversas durante bloqueio não está implementado nem verificado.

### 04-003 — A resposta pública de perfil pessoal inclui localização, site e data de entrada além dos campos aprovados

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `profiles/application/profileViewMapper.ts:18–33` retorna `location`, `website` e `joinedAt`, além de `username`, `displayName`, `bio`, relacionamento e estatísticas. O mapeador também preenche URL de avatar e capa com `null`. A regra fornecida para perfil pessoal especifica nome de exibição, @, bio, seguidores, seguindo e Círculo; localização, site e data de entrada foram expressamente removidos do escopo público.

```ts
location: privateDetailsVisible ? row.locationLabel : null,
website: privateDetailsVisible ? row.websiteUrl : null,
joinedAt: row.createdAt.toISOString(),
```

**Limite:** Esta constatação é sobre o DTO do backend. O que o componente visual efetivamente mostra será verificado no bloco 10.

### 04-004 — Dados de idade não aparecem no DTO público de perfil

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `profileViewMapper.ts:18–33` lista os campos de saída e não contém idade. A busca estática por `accounts.age`/`age:` nos módulos backend e contratos encontrou usos no fluxo de cadastro e nenhum campo de idade em respostas de Profiles. Não foi feita uma chamada de perfil autenticada.

### 04-005 — O perfil comercial não expõe horário, serviços, comodidades nem link de mapa

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `profiles/application/commercialProfileDetails.ts:1–9` define o objeto público comercial com categoria, tipo de descoberta e endereço/CEP/cidade/estado/país. `profiles/application/publicProfile.ts:38–48` inclui esse objeto, publicações, artigos e mídia no perfil, mas não declara horários, serviços, comodidades, avaliação-resumo ou URL de mapa. Busca estática por esses campos nos módulos e schemas de Profiles encontrou somente referências de avaliação, sem modelos de horários/serviços/commodities.

**Impacto:** A leitura pública atual não consegue preencher os principais itens comerciais especificados. O endereço existe; a construção de um link externo para Google Maps não está definida neste contrato.

### 04-006 — O perfil público sempre retorna uma galeria de mídia vazia

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `profiles/application/publicProfile.ts:79–91` retorna `media: emptyPage`, com `emptyPage = { items: [], nextCursor: null }` declarado na linha 13. O mesmo DTO apresenta `avatarUrl` e `coverUrl` como `null` em `profileViewMapper.ts:23–24`.

```ts
posts: posts ?? emptyPage,
articles: articles ?? emptyPage,
media: emptyPage,
```

**Impacto:** Embora Media possua rotas próprias, a galeria não está ligada ao perfil público; fotos e vídeos não podem ser apresentados por essa resposta.

### 04-007 — Reviews têm regras centrais implementadas, mas a tabela necessária não existe no banco atual

**Veredito:** PARCIAL  
**Prioridade:** Crítica

**Evidência:** `businessProfileReviews.ts:246–294` permite avaliação somente por conta pessoal, valida nota de 1–5 e comentário de 10–500 caracteres, e trata duplicidade por índice único. `:297–331` permite exclusão pelo titular e resposta do perfil comercial. `shared/contracts/src/businessProfileReviews.ts:3–10` não possui campos para foto; a revisão lista média, total e distribuição em `businessProfileReviews.ts:22–26`. `businessProfileReviewRoutes.ts:143–185, 187–216, 218–278` registra criação, exclusão e resposta. O catálogo de desenvolvimento consultado no bloco 01 não contém `profiles.business_profile_reviews`, e a documentação já marca as quatro rotas como “banco pendente” (`docs/api/backend/endpoints.md:86–89`).

**Impacto:** A intenção e as regras de aplicação estão estruturadas, mas a API de reviews não pode ser considerada operacional sem a tabela ausente. Não foi chamada nenhuma dessas rotas. Fotos em avaliações não são aceitas pelo contrato atual; o skill de reviews registra comentários/fotos como regra vigente. Também não foi localizada rota de edição, consistente com a regra de apagar e republicar.

### 04-008 — Privacidade comercial não pode ser validada contra a remoção do Seek

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta

**Evidência:** `privacySettingsRepository.ts:43–64` salva `isPrivate` no perfil. `modules/index.ts:13–19` não monta um módulo Seek, e o catálogo do banco consultado no bloco 01 não contém tabelas de Seek.

**Impacto:** A API do perfil aceita torná-lo privado e bloqueia conteúdo conforme privacidade, mas não há fluxo de descoberta Seek no backend atual que prove que a listagem comercial desaparece quando a conta fica privada. Não é possível declarar essa regra concluída.

### 04-009 — Preferências de mensagens são gravadas por Profiles/Accounts sem módulo consumidor montado

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `profiles/application/privacySettings.ts:13–20` devolve preferências `messages` e `readReceipts`; `privacySettingsRepository.ts:56–64` grava esses campos na tabela `accounts`. O inventário de rotas do bloco 02 não encontrou roteador de mensagens.

**Impacto:** A interface pode oferecer controles sem uma implementação de Mensagens que os aplique. A propriedade desses dados também cruza a fronteira do futuro domínio de mensagens; a decisão de armazená-los em Accounts deve ser reconciliada no bloco 11, sem criar o módulo aqui.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 2 |
| CONTRADITO | 3 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** Banco de dados, migrations, constraints, índices, relações e diferenças entre schema local e banco de desenvolvimento.
