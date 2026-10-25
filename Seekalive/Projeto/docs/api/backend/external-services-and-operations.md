# Serviços externos, configuração e operação

## Situação da auditoria

Não há provedor externo de identidade, mapas/geocodificação, armazenamento de objetos, push, pagamentos ou checkout conectado. A autenticação própria usa o servidor e o PostgreSQL gerenciado da Replit no desenvolvimento; a produção permanece separada e não foi publicada. O envio de códigos via Resend foi testado em desenvolvimento, mas o E2E completo e a configuração de produção permanecem pendentes. Não há banco PostgreSQL externo escolhido ou conectado. Não foram lidos valores de segredos, nem se deve copiar credenciais para a documentação.

Além de `GET /api/healthz`, estão ativas as rotas de autenticação/onboarding, perfil/privacidade e relações sociais essenciais listadas como **ATIVA** em `endpoints.md`. As outras rotas são propostas. Os serviços abaixo são decisões/integrações a avaliar, não conexões já configuradas.

## Serviços candidatos e documentação oficial

| Necessidade | Opção / situação | Referência oficial |
|---|---|---|
| Banco relacional | PostgreSQL gerenciado da Replit com Drizzle. No desenvolvimento, 12 schemas lógicos estão preparados; 12 tabelas estão distribuídas em `accounts`, `security`, `profiles` e `seek`. Produção é separada e continua sem publicação. | [Replit SQL Database](https://docs.replit.com/features/data-and-storage/sql-database) |
| Fotos e vídeos | Object Storage é a opção candidata para uploads persistentes; usar URLs assinadas e ACL, nunca `blob:` como URL de backend | [Replit Object Storage](https://docs.replit.com/features/data-and-storage/object-storage) |
| Autenticação | API própria, sem Clerk/OIDC. Resend foi testado no desenvolvimento; falta E2E completo e configuração própria para produção | Confirmar remetente/domínio e testar o fluxo completo antes de abrir cadastro real |
| Cidades brasileiras | O catálogo local contém 5.571 municípios; origem oficial do IBGE abaixo. Versionar/importar em migration ou seed determinístico, sem consulta a cada render | [API de localidades do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado&orderBy=nome) |
| Mapas/geocodificação | Nenhum fornecedor escolhido. A interface pode selecionar cidade manualmente. GPS só após consentimento; resolver cidade aproximada sem persistir coordenadas | Decidir provedor e termos antes de habilitar o endpoint proposto |
| E-mail e notificações | Resend envia códigos no desenvolvimento; push e demais notificações não estão conectados. Produção requer domínio, credenciais e políticas próprios, mais outbox/retry duráveis | Proposta em `architecture-and-security.md` |
| Pagamentos / Shop | Não há checkout real. Estoque, pedido, pagamento, entrega e reembolso estão fora do escopo do catálogo atual | Decisão comercial e integração financeira ficam para projeto próprio |
| Deploy e secrets | Usar Secrets para valores sensíveis e deployments do Replit para publicação; não registrar valores em arquivos | [Secrets](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets) · [Deployments](https://docs.replit.com/learn/projects-and-artifacts/replit-deployments) |

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
- Antes de publicar, conferir origem, cookies/CSRF, serviço de e-mail, variáveis do ambiente certo, schema promovido pelo fluxo Replit Publish e health/readiness. Não fazer lançamento público até o sistema completo ser aprovado.

Mais referências de plataforma: [Storage e bancos no Replit](https://docs.replit.com/learn/projects-and-artifacts/storage-and-databases) e [Troubleshooting](https://docs.replit.com/build/troubleshooting).
