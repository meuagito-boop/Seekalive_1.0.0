# Serviços externos, configuração e operação

## Situação da auditoria

Não há provedor de identidade, serviço de mapas/geocodificação, armazenamento de objetos, e-mail, push, pagamentos ou checkout conectado nesta auditoria. Não há domínio de produção confirmado neste pacote. Não foram lidos valores de segredos, nem se deve copiar credenciais para a documentação.

O único endpoint ativo observado é `GET /api/healthz`. Os outros endpoints são contratos propostos. Os serviços abaixo são decisões/integrações a avaliar, não conexões já configuradas.

## Serviços candidatos e documentação oficial

| Necessidade | Opção / situação | Referência oficial |
|---|---|---|
| Banco relacional | PostgreSQL é o destino proposto; Drizzle/driver já aparecem no projeto, mas não existe schema Drizzle ativo nem confirmação de banco provisionado | [Replit SQL Database](https://docs.replit.com/features/data-and-storage/sql-database) |
| Fotos e vídeos | Object Storage é a opção candidata para uploads persistentes; usar URLs assinadas e ACL, nunca `blob:` como URL de backend | [Replit Object Storage](https://docs.replit.com/features/data-and-storage/object-storage) |
| Autenticação | Comparar provedor OIDC e Replit-managed Clerk antes de implementar. Nada está conectado. Confirmar impacto de tenants separados entre desenvolvimento e produção | [Replit Clerk Auth](https://docs.replit.com/features/auth-and-identity/clerk-auth) |
| Cidades brasileiras | O catálogo local contém 5.571 municípios; origem oficial do IBGE abaixo. Versionar/importar em migration ou seed determinístico, sem consulta a cada render | [API de localidades do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado&orderBy=nome) |
| Mapas/geocodificação | Nenhum fornecedor escolhido. A interface pode selecionar cidade manualmente. GPS só após consentimento; resolver cidade aproximada sem persistir coordenadas | Decidir provedor e termos antes de habilitar o endpoint proposto |
| E-mail e notificações | Integrações não conectadas. Só adicionar após decidir provedor, consentimento, templates, retentativa e descadastro | Proposta em `architecture-and-security.md` |
| Pagamentos / Shop | Não há checkout real. Estoque, pedido, pagamento, entrega e reembolso estão fora do escopo do catálogo atual | Decisão comercial e integração financeira ficam para projeto próprio |
| Deploy e secrets | Usar Secrets para valores sensíveis e deployments do Replit para publicação; não registrar valores em arquivos | [Secrets](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets) · [Deployments](https://docs.replit.com/learn/projects-and-artifacts/replit-deployments) |

## Catálogo municipal

O frontend já contém uma cópia versionada em `artifacts/social/public/data/ibge-cities-20261022.json`, com código oficial IBGE de sete dígitos, nome e UF; não contém geolocalização precisa. Foi obtida da API pública do IBGE em 22/10/2026. O SQL proposto em `schema-core.sql` trata município como referência para negócios, eventos e busca. O pacote ZIP inclui esse arquivo para auxiliar a implementação do seed.

Para atualizar: baixar de novo a fonte oficial, validar unicidade do código, quantidade e UF, comparar diff, e importar por migration/seed idempotente. Não apagar código antigo sem estratégia para FKs. O frontend pode manter seleção manual quando GPS ou geocodificação não estiver disponível.

## Configuração (nomes, nunca valores)

Os nomes a seguir são inventário de proposta para deployment; não afirmam que já existam:

| Nome sugerido | Uso / tratamento |
|---|---|
| `SESSION_SECRET` | Já consta como secret disponível no ambiente. Não ler nem exibir seu valor. Antes de produção, confirmar rotação, comprimento e uso; preferir sessão criptograficamente segura gerada pelo servidor/provedor |
| `DATABASE_URL` | String de conexão do PostgreSQL; cadastrar somente pelo fluxo de Secrets. Não escrever em `.env` versionado ou log |
| `SITE_ORIGIN` | Origem oficial para validação de redirecionamento/links; configurar por ambiente após confirmação do domínio de produção |
| `OBJECT_STORAGE_BUCKET` | Identificador do bucket; credenciais ficam no serviço integrado, não no código |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID` | Identificadores do cliente/issuer, conforme provedor escolhido; segredo do cliente apenas em Secrets |
| `OIDC_CLIENT_SECRET` | Sensível; somente Replit Secrets, nunca documentação, build output ou log |
| `EMAIL_PROVIDER_*`, `MAPS_PROVIDER_*` | Só definir depois da escolha explícita do fornecedor e usando Secrets para credenciais |

Segredos de desenvolvimento e produção devem ter escopos separados. Não reutilizar banco de desenvolvimento para dados de usuários reais. Nunca pedir ao usuário para colar senha, token ou chave no chat.

## Operação e monitoramento

- Manter readiness separado de liveness: liveness não deve falhar por indisponibilidade temporária de serviço externo; readiness deve mostrar dependências sem revelar strings de conexão.
- Gerar `requestId`; redigir cookies, tokens, e-mail, conteúdo privado e coordenadas dos logs.
- Medir latência/erros por rota, filas de uploads, falhas de e-mail/push e atrasos de outbox; alertar sem incluir conteúdo do usuário.
- Retentar tarefas externas com backoff e chave de idempotência; mensagens irrecuperáveis vão para fila de falhas monitorada.
- Ter backup/retention e teste de restauração do banco antes de habilitar dados reais; planejar ciclo de vida/exclusão de mídia separadamente.
- Antes de publicar, conferir origem/callbacks OIDC, variáveis do ambiente certo, migrações aplicadas deliberadamente e health/readiness.

Mais referências de plataforma: [Storage e bancos no Replit](https://docs.replit.com/learn/projects-and-artifacts/storage-and-databases) e [Troubleshooting](https://docs.replit.com/build/troubleshooting).
