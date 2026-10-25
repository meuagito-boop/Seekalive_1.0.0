---
name: Testes de refatoração frontend
description: Como manter os testes do front coerentes durante a mudança de caminhos e limites entre módulos.
---

Ao reorganizar módulos do frontend, atualizar no mesmo conjunto os caminhos e as asserções dos testes que inspecionam diretamente os arquivos-fonte, além de executar os testes comportamentais.

**Why:** parte da suíte verifica contrato lendo arquivos por caminho; arquivos movidos causam erro de resolução antes de a suíte avaliar se o comportamento permanece correto.

**How to apply:** antes de concluir uma mudança de estrutura, procurar caminhos antigos em testes e scripts, realocar as asserções para o novo módulo que possui a regra e rodar testes, typecheck e build.
