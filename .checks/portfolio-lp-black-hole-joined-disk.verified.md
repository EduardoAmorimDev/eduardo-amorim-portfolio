# Landing page do portfólio — buraco negro com disco ligado: verificação

**Verdict**: FAIL
**Profile**: light (rodaram os passos 2, 3 e 5; o passo 1, comparação com as fontes vinculantes, e o passo 4, injeção de falhas, não rodam neste perfil)
**Diff range**: 993200c..1223082
**Round**: 1 - full
**Verifier**: subagente independente (autor != verificador)

Notas de contexto:

- As provas ficam **fora do repositório**, no scratchpad da sessão
  (`/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/a43d5673-cd23-4c14-b639-6f8d61e3badb/scratchpad/joined/`).
  Elas não ficam versionadas e somem com a sessão.
- Os testes do repositório estão quebrados e não rodaram, por decisão do usuário. Nenhum
  `npm test`, `node --test` sobre testes do repositório nem suíte do Playwright foi executado.
- O build em `:3200` corresponde ao HEAD: os fontes alterados têm mtime 14:25:36–14:25:41,
  `.next/BUILD_ID` tem 14:26:16, e o chunk `.next/static/chunks/2cncakej3ctvh.js` contém
  `ARC_TOP = 1.30`, `FOOT_OUT = 1.6` e a nova linha `outer`. A árvore de trabalho estava limpa.
- O canvas `hero-lens` é 2D (`use-hero-field.ts:60`, `lens.getContext('2d')`), então o
  `ink === 0` de C2 não passa por vazio.

## Mudança na medição da sonda (C3, C4, C6)

O `Landing` registra que a sonda mudou durante o build (commit 96cc43d), mas o texto dos
checks não mudou. C3 e C4 ainda dizem "último ponto com luminância > 0,2". Para cada um:

- **C3: enfraquecido.** O check afirma a posição absoluta: a borda de cima fica em 1,30 R ±0,05.
  A sonda só afirma a diferença entre a borda de cima e a de baixo: `top − bottom = 0,08 ±0,03`.
  Com o limite de C4 (embaixo entre 1,10 e 1,22), qualquer borda de cima entre 1,15 e 1,33 R
  passa. Uma borda a 1,15 R violaria o check e ainda assim passaria. O valor medido, 1,285 R,
  cabe na faixa do check, mas nada o afirma. A diferença medida, 0,105, fica a 0,005 do limite
  de tolerância (0,11).
- **C4: a metade na tela foi enfraquecida; a metade no fonte prova o check.** A faixa passou de
  1,22 ±0,05 (1,17–1,27) para 1,10–1,22. O lado de baixo ficou mais largo: uma borda configurada
  em ~1,15 R também passaria. A parte do fonte afirma diretamente `halfHeight = 1,22` e a forma
  de `outer` (`source.ts:12,14,15`, mais `foot` em `:22`). Ela garante que a borda de baixo não
  mudou, e é ela que sustenta o check.
- **C6: ainda prova o que o check afirma, com uma leve suavização.** "Nunca cai abaixo" era lido
  pixel a pixel. Agora vira a média de janelas de 9 px de altura por ±0,05 R, contíguas de
  1,05 a 2,0 R. A referência passou de um pixel a 2 R para a média de 1,9 a 2,1 R. Uma faixa
  escura entre os discos ainda derruba a média. O mínimo medido foi 0,92, contra o limite de
  0,60. Só um vão mais estreito que cerca de 10 px escaparia.

## Checks

| Check | Claim                                                                     | Proof run                                                                                                                     | Evidence                                                                                                                                                                                                                                                                       | Result                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1    | sem `/models/glass/*.glb`; fora de 4,8 R nenhum pixel > 8 níveis do fundo | `node probe.mjs` exit 0 — `✔ only the black hole models 0, stray px 0`                                                        | `probe.mjs:15-16` — `Math.hypot(...) > 4.8 * R && max(abs(px−bg)) > 8` → `stray++`; `models.length === 0 && stray === 0`                                                                                                                                                       | PASS. Nota: amostra 1 pixel a cada 2 em x e em y, ou seja, 1/4 dos pixels, não "nenhum pixel". Comparar com a cor do `body` em vez do token corrige a medida, não a enfraquece. |
| C2    | `#hero` sem `h1`/`p`/`a`/texto; `hero-lens` todo transparente             | idem — `✔ no text, no 2D drawing {"text":"","tags":0,"ink":0}`                                                                | `probe.mjs:17-18` — `dom.text === '' && dom.tags === 0 && dom.ink === 0`                                                                                                                                                                                                       | PASS                                                                                                                                                                            |
| C3    | borda de cima a 1,30 R ±0,05 (limiar 0,2)                                 | idem — `✔ thicker on top top 1.285 R, bottom 1.180 R, difference 0.105`                                                       | `probe.mjs:22` — `Math.abs(top - bottom - (1.3 - 1.22)) <= 0.03`                                                                                                                                                                                                               | **NOT PROVEN**: a sonda afirma a diferença, não a posição de 1,30 ±0,05, e o limiar mudou de 0,2 para 0,05 sem mudar o texto do check. Ver acima.                               |
| C4    | borda de baixo a 1,22 R ±0,05; o fonte fixa 1,22 onde sen θ ≤ −0,2        | `probe.mjs` (idem, `✔ unchanged below bottom edge 1.180 R`) e `node --test source.ts` exit 0 (`✔ bottom edge stays 1.22`)     | `source.ts:12` `assert.equal(HOLE.halfHeight, 1.22)`; `:14` `includes('float rise = smoothstep(-0.2, 0.6, sin(theta));')`; `:15` `includes('float outer = mix(mix(ARC_OUT, ARC_TOP, rise), FOOT_OUT, foot);')`; `probe.mjs:23` `bottom >= 1.1 && bottom <= 1.22`               | PASS pelo fonte. A metade na tela foi enfraquecida (1,10–1,22 em vez de 1,17–1,27). `source.ts:17` afirma só um fato de trigonometria, não o código.                            |
| C5    | pés até 1,6 R onde \|sen θ\| < 0,33, com o gás do disco horizontal        | `source.ts` — `✔ feet widen into the disk`                                                                                    | `source.ts:21` `includes('const float FOOT_OUT = 1.6;')`; `:22` `includes('float foot = 1.0 - smoothstep(0.1, 0.33, abs(sin(theta)));')`; `:23` `match(/diskGas\(length\(onPlane\), atan\(onPlane\.y, onPlane\.x\)\),\s*foot/)`; e `:15` (`outer` vai a `FOOT_OUT` por `foot`) | PASS. Nota: o "brilho inteiro, sem o desconto de 0,6" do critério 5 da tarefa (`weight = max(..., foot)`, `black-hole-mesh.tsx:198`) não é afirmado, e C5 não o cita.           |
| C6    | sobre a horizontal, de 1,05 a 2 R, ≥ 60% do brilho a 2 R                  | `probe.mjs` — `✔ no dark gap at the sides lowest share of the 2 R brightness: 0.92`                                           | `probe.mjs:27-28` — `worst = min(band(t±0.05R)/ref)` nos dois lados, `t` de 1,1 a 1,95; `worst >= 0.6`                                                                                                                                                                         | PASS, com a média em faixa (ver acima)                                                                                                                                          |
| C7    | os dois discos usam `wisps` com `uInnerTurn`/`uOuterTurn`                 | `source.ts` — `✔ both disks share the gas`                                                                                    | `source.ts:27` `match(/float gas\(...\) \{\s*return GLOW \* \([^)]*wisps\(/)`; `:28` o mesmo para `diskGas`; `:29` `match(/float wisps\(...\)[\s\S]*?mix\(uInnerTurn, uOuterTurn, share\)/)`                                                                                   | PASS                                                                                                                                                                            |
| C8    | nenhuma dependência nova; `WANDER` e `DISK` não mudam                     | `git diff --exit-code 993200c -- package.json package-lock.json` exit 0; `source.ts` — `✔ pace and horizontal disk unchanged` | `source.ts:33` `deepEqual([WANDER.minSpeed, WANDER.maxSpeed], [2.5, 7.5])`; `:34` `deepEqual([DISK.inner, DISK.outer], [1.15, 3])`; `:36` nenhuma linha +/- do diff do mesh casa `THICK\|float diskGas\|vec2 disk(\|float wisps`                                               | PASS. Nota: `DISK.innerTurn` e `DISK.outerTurn` não são afirmados. O diff de `black-hole.ts` só toca `HOLE`, então eles não mudaram.                                            |
| C9    | compila e passa no lint                                                   | `npx tsc --noEmit -p .` exit 0 (`No errors found`); `npm run lint` exit 0 (`No issues found`)                                 | saída dos comandos                                                                                                                                                                                                                                                             | PASS                                                                                                                                                                            |

## Gate

`node --test …/joined/source.ts`: 4 passed, 0 failed · `node …/joined/probe.mjs`: 5 passed, 0 failed (exit 0) ·
`git diff --exit-code 993200c -- package.json package-lock.json`: exit 0 · `npx tsc --noEmit -p .`: exit 0 ·
`npm run lint`: exit 0. Checks provados: 8/9. C3 não está provado como foi escrito.
