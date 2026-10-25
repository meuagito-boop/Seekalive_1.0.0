---
name: Localização comercial
description: Regra de produto para quantas unidades físicas uma conta comercial representa.
---

Cada conta comercial do Seekalive representa no máximo uma unidade/endereço físico principal, e o Seek mostra somente esse endereço. O usuário decidiu não incluir cidades/regiões/raios de atendimento para prestadores; não criar `business_service_areas`. Não expor endereço residencial automaticamente. O usuário ainda não definiu como várias contas comerciais independentes podem se agrupar sob uma marca ou rede.

**Why:** o usuário confirmou uma unidade principal por conta e decidiu manter a informação pública do Seek limitada ao endereço principal, sem uma área geográfica de atendimento.

**How to apply:** ao modelar contas comerciais, Seek ou Localização, preservar a relação de uma conta para no máximo um local físico principal e exibir somente esse endereço. Não criar áreas de atendimento, hierarquia de marca/rede, compartilhar avaliações ou agregar seguidores entre contas até haver decisão explícita.
