---
name: Núcleo Social e Seek
description: Arquitetura de produto que conecta contas sociais, descoberta comercial no Seek e o Shop planejado.
---

Seekalive é um aplicativo que une uma rede social, o módulo Seek para encontrar perfis comerciais e um módulo Shop previsto para o futuro.

A rede social é o núcleo do Seekalive: contas, perfis pessoais e perfis comerciais fazem parte dela. No cadastro, a conta é pessoal ou comercial. O domínio interno Profiles mantém os dados canônicos dos perfis como parte desse núcleo Social; não é um produto nem uma fonte independente. O perfil comercial que aparece no Seek é a própria conta comercial da rede social. Seek, Shop futuro e outros módulos consomem dados sociais por contratos e não podem criar identidades, perfis ou fontes paralelas. Seek usa uma projeção para descoberta por localização e categorias e não deve servir como fonte de dados do perfil nem permitir cadastro comercial isolado. Avaliações são apresentadas e realizadas na experiência do perfil comercial; não pertencem ao fluxo de descoberta do Seek.

O Shop é uma frente futura do mesmo produto e deve evoluir sobre a identidade já existente, não criar uma árvore de contas concorrente.

Na contagem pública de publicações do perfil, considerar todas as publicações da conta, sem filtrar por audiência ou formato.

**Why:** O usuário confirmou explicitamente que Social é o núcleo de todo o produto, que Profiles é um domínio interno desse núcleo, que os demais módulos são alimentados por dados sociais, que Seek recebe uma projeção para descoberta por localização/categoria, que avaliações ficam na experiência do perfil comercial, que Shop virá no futuro e que o contador do perfil deve incluir todas as publicações da conta.

**How to apply:** Ao projetar schemas, APIs, onboarding, busca, indexação ou integrações, tratar Social como origem canônica de contas, perfis e conteúdo social. Profiles, Feed e relações são domínios internos do núcleo Social; Seek, Shop e demais módulos consomem apenas os dados necessários por contratos, sem duplicar identidade nem tornar-se fonte social alternativa. Seek deve ler uma projeção de descoberta e nunca servir como dependência de leitura do perfil. Avaliações devem aparecer no perfil comercial, e rotas de avaliação não devem ser atribuídas ao Seek sem decisão explícita de ownership; eventual nota nos resultados é derivada e somente de leitura. Feed é dono dos dados de publicações; outros módulos devem consumir sua contagem por contrato, sem ler tabelas Feed diretamente. No perfil, contar todas as publicações da conta independentemente de audiência/formato. Não implementar contas comerciais independentes no Seek. Manter Shop fora do escopo atual até o usuário iniciar essa frente.
