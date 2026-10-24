---
name: Privacidade de sessões
description: Política para sessões autenticadas e identificação de dispositivos.
---

Não classificar um aparelho como “habitual” com base em IDs de sessão ou horários. Cada login representa uma sessão independente; a interface pode mostrar a sessão atual, criação e expiração, e permitir revogação. Não adicionar coleta de fingerprint, user-agent, IP ou localização para reconhecimento de dispositivo sem decisão explícita de produto e revisão de privacidade.

**Why:** A tabela de sessões atual não contém sinais de dispositivo. Inferir familiaridade sem evidência seria enganoso; coletar sinais novos alteraria o modelo de privacidade e precisa de aprovação.

**How to apply:** Ao adicionar alertas de novo login, dispositivo confiável ou MFA, primeiro definir a regra e os dados mínimos necessários. Até lá, exibir apenas a sessão como sessão, sem prometer detecção de dispositivo ou histórico que não existe.
