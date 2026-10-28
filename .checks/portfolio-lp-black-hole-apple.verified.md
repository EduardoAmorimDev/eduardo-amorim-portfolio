# Landing page do portfólio — lente em forma de maçã e Hero parada · Verificação

**Verdict**: PASS
**Profile**: light (rodaram os passos 2, 3 e 5; os passos 1 e 4 e o join de `Coverage` / `Test policy` não rodam neste perfil)
**Diff range**: 8642951..052b21a
**Round**: 1 - full
**Verifier**: sub-agente independente (autor != verificador), somente leitura

## Contexto das provas

- As provas ficam **fora do repositório**, no scratchpad da sessão
  (`/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/a43d5673-cd23-4c14-b639-6f8d61e3badb/scratchpad/apple/`):
  `math.ts` (node, módulos puros e leitura do fonte) e `probe.mjs` (Playwright, build de produção em `:3200`).
  Não ficam versionadas e somem com o scratchpad.
- Por decisão do usuário ("não faça testes nem rode os antigos"), nenhum teste do repositório foi
  escrito nem rodado. Os testes listados no `Impact` da tarefa (`deflection.test.ts`,
  `black-hole.test.ts`, `glass-motion.test.ts`, `e2e/deflection`, `e2e/black-hole`, `e2e/hero`,
  `e2e/interaction`, `e2e/a11y`, `e2e/lens`, `e2e/sections`, `e2e/glitch`) devem quebrar e **não
  foram executados**.
- Build em `:3200`: `.next/BUILD_ID` de 12:45:48, servidor iniciado às 12:45:49; nenhum arquivo de
  `app/`, `components/` ou `lib/` é mais novo que o build e a árvore está limpa em `052b21a`. O
  build corresponde ao conteúdo de HEAD (o commit é posterior, mas o conteúdo não mudou).

## Checks

| Check | Claim                                                                                                             | Proof run                                                                             | Evidence                                                                                                                                                                                                                                                         | Result          |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| C1    | caixa do `logo` (x 1080–1290, y 0–220) igual a até 6 níveis com o ponteiro passando sobre ele, movimento reduzido | `node probe.mjs` exit 0 — "icons hold still under the pointer max change 0"           | `probe.mjs:25` (ponteiro em 1180,100 → 1200,120, ~1 s) · `probe.mjs:28-29` — `worst <= 6` sobre `y<220, 1080<=x<1290`. Código: `glass-elements.tsx:145-148` (sem `useFrame`/`onPointer*`, busca sem resultado)                                                   | PASS            |
| C2    | anel 1,60/1,34/1,04 ±3% a 90/60/45°; sem anel a 30°; tabela de θ₊ ±4 px                                           | `node --test math.ts` exit 0 — "apple lens"                                           | `math.ts:19` — `Math.abs(ringAt(d) - ring) <= ring * 0.03`; `math.ts:20` — `sourceRadiusAt(1 + 1e-6, deg(30), bend) > 0`; `math.ts:27` — `Math.abs(seen - images[i]) <= 4` com a tabela literal em `math.ts:22`. Código: `deflection.ts:11`, `deflection.ts:91`  | PASS (lacuna 3) |
| C3    | shader: sen²φ = (dy/\|d\|)², β = θ − K·α(θ/sen²φ)                                                                 | `node --test math.ts` exit 0 — "shader follows the field line"                        | `math.ts:34` — `assert.match(src, /float share = pow\(offset\.y \/ length\(offset\), 2\.0\);/)`; `math.ts:35` — `assert.match(src, /theta - uBend \* bentBy\(theta \/ share\)/)`. Código: `bent-light.tsx:64-65`, `uBend = bendAt(lift)` em `bent-light.tsx:152` | PASS (lacuna 4) |
| C4    | sombra redonda: largura e altura a ±4 px                                                                          | `node probe.mjs` exit 0 — `w 190, h 190`                                              | `probe.mjs:31` — `Math.abs(rest.w - rest.h) <= 4`                                                                                                                                                                                                                | PASS (lacuna 2) |
| C5    | largura da sombra em 3 instantes, 4 s entre eles, varia ≤ 4 px                                                    | `node probe.mjs` exit 0 — larguras 190/189/189, centros (724,283) (692,338) (621,332) | `probe.mjs:35` (3 capturas, `waitForTimeout(4000)`) · `probe.mjs:37` — `Math.max(...ws) - Math.min(...ws) <= 4 && new Set(centros).size > 1`. Código: `use-hero-field.ts:91`, `black-hole-path.ts:64`                                                            | PASS (lacuna 1) |
| C6    | `#hero` sem `h1`, `p` nem `a`                                                                                     | `node probe.mjs` exit 0                                                               | `probe.mjs:23` — `!document.querySelector('#hero h1, #hero p, #hero a')`. Código: `app/page.tsx:32`                                                                                                                                                              | PASS            |
| C7    | velocidade entre 5 e 15 px/s                                                                                      | `node --test math.ts` exit 0 — "pace unchanged"                                       | `math.ts:42` — `wander.speed >= 5 && wander.speed <= 15` a cada quadro por 600 s, sobre `holeBox` novo                                                                                                                                                           | PASS            |
| C8    | nenhuma dependência nova                                                                                          | `git diff --exit-code 8642951 -- package.json package-lock.json` exit 0, saída vazia  | o próprio comando                                                                                                                                                                                                                                                | PASS            |
| C9    | compila e passa no lint                                                                                           | `npx tsc --noEmit -p .` exit 0; `npm run lint` exit 0                                 | "TypeScript: No errors found"; "ESLint: No issues found"                                                                                                                                                                                                         | PASS            |

## Lacunas (em ordem)

1. **C5 discrimina por pouco** (`probe.mjs:37`). Não exige deslocamento vertical mínimo. Calculado com
   `horizonAt` (ainda em `black-hole.ts`): no caminho desta execução (y 283→338), o horizonte antigo
   iria de 95,79 a 98,30 px, cerca de 5 px de diferença na largura. Isso passa do limite de 4 px por
   apenas ~1 px, dentro do ruído de medição (189 vs 190). Num caminho mais horizontal, o código
   antigo passaria. Além disso, não se afirma o valor absoluto de 96 ±2 px (critério 7; o medido,
   ~95 px, está dentro) nem a janela 375×667 do `Observable`.
2. **C4 mais estreito que o critério 6** (`probe.mjs:31`). Afirma só |w − h| ≤ 4. Não afirma o raio
   de 1 horizonte nem que "nada do que está atrás aparece dentro dela". É uma lacuna de precisão do
   checklist frente à tarefa.
3. **C2, "sem anel a 30°", prova em um ponto só** (`math.ts:20`). Afirma β > 0 apenas em r = 1+10⁻⁶ e
   supõe β crescente em r, sem varrer r. As bisseções de `math.ts:17` e `math.ts:26` também supõem
   monotonia. O resultado é plausível, mas a prova é mais fraca que a afirmação "nenhum anel".
4. **C3 é textual** (`math.ts:34-35`). Prova por regex sobre o fonte, sem executar o shader. Não
   cobre a guarda `share > 1e-6 ? … : theta` (β = θ nos polos, `bent-light.tsx:65`). Também não
   cobre o `bentBy` do GLSL igual a α de `deflection.ts`.
5. **C1 cobre só o `logo`** (`probe.mjs:28`). Os quatro modelos de trás (`cursor`, `wave`, `atom`,
   `brick`, critério 1) não são medidos. No código, o `GlassElement` sem `useFrame` é o mesmo para
   os cinco (`glass-elements.tsx:145`), então o risco é baixo, mas não está provado.
6. **Critério 10 da tarefa sem check** (0 draw calls fora da tela). O checklist tem C1–C9 para 11
   critérios. O critério 10 é herdado e o diff não toca `render-gate`. Fica registrado como lacuna
   de cobertura do checklist; o passo 1 não roda em `light`.

## Gate

`node --test …/scratchpad/apple/math.ts` - 3 passed, 0 failed · `node …/scratchpad/apple/probe.mjs` - 4 passed, 0 failed · `git diff --exit-code 8642951 -- package.json package-lock.json` exit 0 · `npx tsc --noEmit -p .` exit 0 · `npm run lint` exit 0
