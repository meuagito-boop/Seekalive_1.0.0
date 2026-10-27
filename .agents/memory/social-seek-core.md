---
name: Núcleo Social e Seek
description: Arquitetura de produto que conecta contas sociais, descoberta comercial no Seek e o Shop planejado.
---

Seekalive é um aplicativo que une uma rede social, o módulo Seek para encontrar perfis comerciais e um módulo Shop previsto para o futuro.

A rede social é o núcleo do produto e a fonte de identidade das contas. No cadastro, a conta é pessoal ou comercial. O perfil comercial que aparece no Seek é a própria conta comercial da rede social; Seek não deve manter uma fonte paralela de comerciantes nem permitir um cadastro comercial isolado fora do Social.

O Shop é uma frente futura do mesmo produto e deve evoluir sobre a identidade já existente, não criar uma árvore de contas concorrente.

Na contagem pública de publicações do perfil, considerar todas as publicações da conta, sem filtrar por audiência ou formato.

**Why:** O usuário confirmou explicitamente que Social é o núcleo, que Seek é abastecido pelos perfis comerciais do Social, que Shop virá no futuro e que o contador do perfil deve incluir todas as publicações da conta.

**How to apply:** Ao projetar schemas, APIs, onboarding, busca, indexação ou integrações entre módulos, manter a conta no domínio Social como origem do perfil comercial e tratar Seek como descoberta/projeção desses perfis. Feed é dono dos dados de publicações; outros módulos devem consumir sua contagem por contrato, sem ler tabelas Feed diretamente. No perfil, contar todas as publicações da conta independentemente de audiência/formato. Não implementar contas comerciais independentes no Seek. Manter Shop fora do escopo atual até o usuário iniciar essa frente.
