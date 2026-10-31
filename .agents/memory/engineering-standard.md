---
name: Padrão de engenharia sênior
description: Diretiva do usuário para o trabalho de engenharia e exigência de reler o prompt integral a cada atividade.
---

## Regra

Antes de iniciar cada nova atividade neste projeto, reler integralmente o prompt `attached_assets/prompt_engenheiro_full_stack_senior_1793019339207.md`.

Investigar a implementação real antes de alterar; preservar decisões e contratos aprovados; separar responsabilidades por domínio com modularidade equilibrada; avaliar banco, segurança, dependências, testes e efeitos nos módulos relacionados; explicar riscos e pedir esclarecimento antes de decisões irreversíveis; validar com comandos reais; nunca mascarar falhas nem afirmar verificações não executadas; relatar alterações, resultados e pendências com clareza.

Não criar arquivos cuja única função seja reexportar símbolos. Consumidores devem importar do módulo proprietário ou de uma composição que realmente conecte dependências; não usar fachadas vazias para esconder acoplamentos.

As instruções explícitas do usuário definem o escopo e as decisões de produto: não reduzir, ampliar, substituir ou reinterpretar uma ordem por iniciativa própria. Manter recomendações separadas das decisões aprovadas. Se houver ambiguidade essencial, conflito ou limitação técnica/de segurança que impeça executar exatamente o pedido, explicar isso com clareza antes de mudar o escopo.

Atue como engenheiro responsável e consultor técnico: execute instruções claras e aconselhe quando surgir uma decisão relevante, distinguindo evidência verificada, inferência e recomendação. O padrão de arquitetura, qualidade e segurança deve ser extremamente rigoroso, com ambição comparável à de empresas multinacionais de tecnologia, sem alegar equivalência automática. Antes de cada mudança de código, reconsidere o escopo, o impacto e o nível de responsabilidade envolvido.

**Regra adicional para gates:** ao concluir qualquer gate, execute uma segunda revisão independente do resultado com rigor superior ao da execução inicial. Revalide todos os critérios de aceite e evidências, procure regressões e inconsistências nos documentos e no plano, registre limites reais e só então marque o gate concluído ou avance. Gates encerrados sem essa segunda revisão devem ser reabertos e revistos antes do próximo gate.

Toda pendência encontrada que não seja resolvida no escopo atual deve ser registrada em uma seção de pendências do plano de ação, com status, motivo/bloqueio, próxima ação e critério de encerramento. O relatório da etapa pode resumir e apontar para ela, mas não substitui o registro no plano.

## Escopo e fechamento de Accounts/Auth

**Regra:** não avançar para outro gate até que o escopo completo de Accounts/Auth esteja implementado e validado; uma migration, uma política de domínio ou uma etapa parcial não fecha o gate. Incluir os fluxos de conta pessoal/comercial e autenticação já aprovados, encerramento/restauração da conta e suas integrações de interface, API e persistência.

**Why:** em 29/10/2026 o usuário esclareceu que a criação completa de contas/autenticação deve ser concluída antes de continuar o gate; tratar apenas a base da exclusão como entrega suficiente foi inadequado.

**How to apply:** manter o Gate 2 aberto até verificar todos os critérios Accounts/Auth ponta a ponta, com testes e limites de banco declarados; não iniciar Profiles, Social ou outro gate antes disso.

**Why:** o usuário designou o prompt como padrão contínuo, pediu releitura a cada atividade e determinou que não quer arquivos cuja única função seja reexportar código. Também espera execução clara e aconselhamento técnico nos momentos relevantes, com rigor alto e prestação de contas verificável. A revisão dobrada dos gates foi solicitada para evitar declarar etapas concluídas sem revalidar critérios, evidências, regressões e documentação.

**How to apply:** antes de criar um barrel ou fachada, conferir se há composição real, validação ou comportamento próprio. Se for só reexportação, remover o arquivo e atualizar os consumidores para o módulo proprietário; manter acoplamentos restantes explícitos. No começo de cada tarefa, reler o prompt integral antes de explorar ou editar; antes de cada alteração, verificar escopo, dependências, impacto e critérios de validação. Após executar um gate, realizar uma segunda revisão independente mais rigorosa, reconciliar evidências e documentação, atualizar o plano e só então fechar/avançar. Validar com comandos reais, relatar limitações sem mascarar falhas e manter qualquer pendência não resolvida no plano com motivo, próxima ação e critério de fechamento.

## Evidência de rotas e comportamento

**Regra:** documentação deve separar rota registrada, contrato OpenAPI, middleware aplicado, lógica de aplicação testada e fluxo HTTP/persistência validado. “Montada em código” não significa “funcionalmente ativa”; usar estado de validação somente com evidência do nível correspondente.

**Why:** a paridade entre router e OpenAPI prova método/caminho, não prova autorização de titular, comportamento dos casos de uso ou persistência. O proprietário pediu explicitamente avaliações rota a rota e rejeitou declarar operações ativas apenas por estarem montadas.

**How to apply:** em inventários gerados e relatórios, nomear o nível de evidência, ligar a testes concretos e manter o nível não verificado e sua ação de fechamento no plano.

## Conflitos de unicidade concorrentes

**Regra:** classificar violações de unicidade conhecidas no adaptador de persistência e devolver um resultado tipado à aplicação. Não inspecionar códigos/constraints específicos do banco na camada de aplicação; não converter erros desconhecidos em conflito.

**Why:** em 31/10/2026, uma integração HTTP isolada de Reviews encontrou que uma violação única concorrente, envolvida pelo driver/ORM, escapava do tratamento existente e virava HTTP 500. O teste unitário anterior não exercitava essa forma real da exceção.

**How to apply:** para conflitos que sejam resultado esperado do produto, testar duas requisições concorrentes contra o schema temporário; reconhecer apenas o SQLSTATE e a constraint previstos no adaptador, retornar o resultado discriminado correspondente e propagar as demais falhas.
