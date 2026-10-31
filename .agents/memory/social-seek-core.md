---
name: Núcleo Social e Seek
description: Arquitetura de produto que conecta contas sociais, descoberta comercial no Seek e o Shop planejado.
---

Seekalive é um aplicativo que une uma rede social, o módulo Seek para encontrar perfis comerciais e um módulo Shop previsto para o futuro.

A rede social é o núcleo do produto e a fonte de identidade das contas. No cadastro, a conta é pessoal ou comercial. Profiles é dono dos dados canônicos dos perfis pessoais e comerciais; o perfil comercial que aparece no Seek é a própria conta comercial da rede social. Seek consome uma projeção para descoberta por localização e categorias e não deve ser consultado como fonte de dados do perfil, manter uma fonte paralela de comerciantes ou permitir cadastro comercial isolado. Avaliações são apresentadas e realizadas na experiência do perfil comercial; não pertencem ao fluxo de descoberta do Seek.

O Shop é uma frente futura do mesmo produto e deve evoluir sobre a identidade já existente, não criar uma árvore de contas concorrente.

Na contagem pública de publicações do perfil, considerar todas as publicações da conta, sem filtrar por audiência ou formato.

**Why:** O usuário confirmou explicitamente que Social é o núcleo, que Profiles contém os dados canônicos dos perfis pessoais e comerciais, que Seek só recebe uma projeção para descoberta por localização/categoria, que avaliações ficam na experiência do perfil comercial, que Shop virá no futuro e que o contador do perfil deve incluir todas as publicações da conta.

**How to apply:** Ao projetar schemas, APIs, onboarding, busca, indexação ou integrações entre módulos, manter perfis pessoais e comerciais canônicos em Profiles; Seek deve ler uma projeção de descoberta e nunca servir como dependência de leitura do perfil. Avaliações devem aparecer no perfil comercial, e rotas de avaliação não devem ser atribuídas ao Seek sem decisão explícita de ownership; eventual nota nos resultados é derivada e somente de leitura. Feed é dono dos dados de publicações; outros módulos devem consumir sua contagem por contrato, sem ler tabelas Feed diretamente. No perfil, contar todas as publicações da conta independentemente de audiência/formato. Não implementar contas comerciais independentes no Seek. Manter Shop fora do escopo atual até o usuário iniciar essa frente.
