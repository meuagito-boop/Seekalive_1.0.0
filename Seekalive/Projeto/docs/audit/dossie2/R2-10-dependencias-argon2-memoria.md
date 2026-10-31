# R2-10 — Dependências, política de instalação e Argon2id

**Status:** `pnpm audit --prod` já foi executado em R2-01; análise estática de dependências/política e experimento de memória sem banco/rede concluídos.

## Audit de produção

`pnpm audit --prod` terminou com exit 0 e não reportou vulnerabilidades conhecidas nessa execução (R2-01, 827 ms). Esse comando limita a conclusão às dependências de produção consultadas naquela execução; não é certificação de segurança nem auditoria de dependências de desenvolvimento.

## Dependências sem importação identificada

| Pacote declarado | Local declarado | Evidência de uso |
|---|---|---|
| `cors` | `Aplicativo/back/package.json:17` | Nenhum import `cors` foi localizado em `Aplicativo/back/src`; o backend não registra middleware CORS (`app.ts`, ver R2-05). |
| `@types/cors` | `Aplicativo/back/package.json:28` | Nenhum uso de tipo do pacote localizado. |

O scan estático identificou esses dois candidatos consistentes a dependência não usada. Não foi instalado ou executado um analisador adicional; portanto não declaro que todos os manifests do monorepo foram provados sem dependências não usadas.

### R2-10-001 — Dependências CORS aparentam estar sem uso

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** declaradas no manifest do backend; busca de import nos fontes retornou apenas as declarações do package manifest.
- **Risco:** Baixo — dependência e tipos extras aumentam a superfície de manutenção, sem evidência de middleware CORS ativo.

## Política de instalação/build scripts

- `pnpm-workspace.yaml:28-35` exige `minimumReleaseAge: 1440` minutos e exclui `@replit/*` e `stripe-replit-sync`.
- `pnpm-workspace.yaml:72-78` permite scripts de build de `@swc/core`, `argon2`, `esbuild`, `msw` e `unrs-resolver`.
- A raiz usa `preinstall` que apaga `package-lock.json` e `yarn.lock` antes de verificar se o user-agent é pnpm (`package.json:13`). Não foi executado `install` nesta rodada.

### R2-10-002 — `preinstall` apaga lockfiles de outros package managers

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** comando `preinstall` explícito no `package.json:13`.
- **Risco:** Informativo — instalar por outro gerenciador remove os lockfiles correspondentes antes de falhar; os arquivos pnpm continuam fora dessa remoção.

## Ações fora do escopo desta auditoria

1. Confirmar se `cors`/`@types/cors` são necessários em ferramentas ou configuração antes de qualquer remoção.
2. Revisar a ordem do `preinstall` para não apagar lockfiles antes de rejeitar outro gerenciador.
3. Repetir o benchmark Argon2id com limites e concorrência representativos quando houver runtime de produção definido; os valores atuais descrevem somente o container de desenvolvimento.

## Experimento Argon2id

Parâmetros copiados do código de produção `Aplicativo/back/src/modules/auth/application/passwordHashing.ts:3-13`: Argon2id, memória 65.536 KiB, 3 iterações, paralelismo 1. O script `experimentos/argon2-memory-benchmark.mjs` usa somente strings sintéticas, não acessa banco/rede, cria processos isolados para cada concorrência e mata o processo se RSS amostrado ultrapassar 1 GiB.

| Concorrência | Hashes | Tempo total | Média/hash | Mediana/hash | Máximo/hash | RSS máximo do processo |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 8 | 1.205 ms | 151 ms | 147 ms | 191 ms | 126,5 MiB |
| 2 | 8 | 742 ms | 167 ms | 162 ms | 216 ms | 190,3 MiB |
| 4 | 8 | 413 ms | 185 ms | 191 ms | 208 ms | 318,6 MiB |
| 8 | 8 | 424 ms | 284 ms | 336 ms | 416 ms | 318,6 MiB |

| Memória do container | Resultado |
|---|---:|
| Limite cgroup | 8.192 MiB |
| Baseline amostrado | 1.715 MiB |
| Pico amostrado durante os quatro ensaios | 1.991 MiB |
| Delta amostrado sobre baseline | 276 MiB |
| Limite RSS por processo | 1.024 MiB |
| Interrompido pelo limite? | Não |

O pico do container é amostrado a cada 20 ms e pode deixar de capturar picos mais curtos. `maxRSS` do processo vem de `resourceUsage` e não ultrapassou o limite. O uso de memória não cresceu linearmente entre concorrência 4 e 8 nesta medição; não se extrapola essa medição para produção.

A primeira invocação do script de benchmark abortou antes de executar hashes por incompatibilidade de tipo no cálculo da guarda BigInt. O script de auditoria foi corrigido e a execução completa acima foi repetida; nenhuma lógica do produto ou dependência foi alterada.

## R2-10 — Fechamento

- **Achados novos:** 2 (1 baixo, 1 informativo).
- **Audit de dependências de produção:** sem vulnerabilidade conhecida reportada na execução; detalhes em R2-01.
- **Inventário de dependências não usadas:** dois candidatos verificados no backend; cobertura não exaustiva do monorepo.
- **Argon2id:** 1/2/4/8 executados; máximo de RSS medido 318,6 MiB, sem atingir 1 GiB.
- **Instalação:** nenhum pacote instalado/removido; nenhum lockfile alterado.
