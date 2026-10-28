# Landing page do portfólio — modelos atrás do buraco negro: verificação

**Verdict**: PASS (13/13 provas verdes, com lacunas de precisão abaixo)
**Profile**: light (nenhum perfil declarado no `AGENTS.md`); rodaram só os passos 2, 3 e 5 do
`verify.md`. Os passos 1 (fontes vinculantes), 4 (injeção de falhas), a junção de `Coverage` e
as linhas de `Test policy` não rodam neste perfil.
**Diff range**: 083a798..b884423
**Round**: 1 - full
**Verifier**: sub-agente independente (autor != verificador), somente leitura

Notas de contexto:

- As provas `math.ts` e `probe.mjs` ficam **fora do repositório**, no scratchpad da sessão
  (`/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/a43d5673-cd23-4c14-b639-6f8d61e3badb/scratchpad/behind/`).
  Não são versionadas e somem com a sessão; abaixo, `math.ts:N` e `probe.mjs:N` se referem a
  esses arquivos.
- Por decisão do usuário, nenhum teste do repositório além dos nomeados no checklist foi
  rodado. O `Impact` da tarefa lista testes que esta mudança quebra (`black-hole-path.test.ts`
  "the speed stays within 10 to 30px/s…", vários specs `e2e/`); não foram rodados nem são
  provas aqui.
- O servidor em `:3200` serve um build de 12:16:24 (`.next/BUILD_ID`); o último arquivo-fonte
  de `components/organisms/hero/` foi salvo às 12:16:21 e a árvore está limpa em `b884423`,
  então o build corresponde ao HEAD.

## Checks

| Check | Claim                                                                 | Proof run                                                                                                                    | Evidence                                                                                                                                                     | Result                      |
| ----- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| C1    | `#hero` sem `[data-testid="hero-grid"]`                               | `node probe.mjs` exit 0 — "✔ no grid"                                                                                        | `probe.mjs:12` — `!document.querySelector('#hero [data-testid="hero-grid"]')`; `#hero` existe (`app/page.tsx:31`)                                            | PASS                        |
| C2    | caminho, subida e tamanho como hoje                                   | `node --test …/black-hole.test.ts …/deflection.test.ts` exit 0, 17/17; `git diff --stat 083a798..HEAD` dos dois testes vazio | `black-hole.test.ts:158-159` (subida 0→1), `:185` `liftScale(lift) - expected < 1e-9`, `:63` horizonte 192 px                                                | PASS — lacuna de precisão 1 |
| C3    | os 4 `.glb` com status 200                                            | `probe.mjs` — "✔ models load" `{cursor:200,wave:200,atom:200,brick:200}`                                                     | `probe.mjs:13` — `['cursor','wave','atom','brick'].every(n => loaded[n] === 200)`                                                                            | PASS                        |
| C4    | os 4 modelos a z = −3, atrás do buraco negro                          | `node --test math.ts` exit 0, 5/5 — "✔ models lie behind…"                                                                   | `math.ts:17` — conjunto `['atom','brick','cursor','wave']`; `math.ts:24` — `along > DEPTH + 0.5` (DEPTH = 8,5); `depth: -3` em `glass-motion.ts:38,46,54,62` | PASS — lacuna de precisão 5 |
| C5    | tabelas θ₊/θ₋ continuam                                               | mesma invocação de C2; `deflection.test.ts` e `deflection.ts` sem mudança no range                                           | `deflection.test.ts:99`, `:109`, `:119` (imagens externa, espelhada, anel de Einstein)                                                                       | PASS — lacuna de precisão 3 |
| C6    | 1,1–3 raios × 360 direções leem dentro de [−720, 2160] × [−450, 1350] | `math.ts` — "✔ the lens never reads outside the back layer"                                                                  | `math.ts:36` — `restPoint == {x:720,y:288}`; `math.ts:43` — `x >= -W/2 && x <= 1.5*W && y >= -H/2 && y <= 1.5*H` com R = 96, `bendAt(0.5)`                   | PASS — lacuna de precisão 3 |
| C7    | vidro de ≥ 3 dos 4 modelos, > 300 px fora do `ink`                    | `probe.mjs` — "✔ models show through the lens" `{cursor:5109,wave:2318,atom:5361,brick:10716}`                               | `probe.mjs:26` — `gap(...) > 24` por pixel; `probe.mjs:27` — `filter(n => n > 300).length >= 3`                                                              | PASS — lacuna de precisão 2 |
| C8    | modelos de trás na camada 1, `logo` na 0                              | `math.ts` — "✔ only the logo takes the pointer"                                                                              | `math.ts:29` — `BEHIND_LAYER === 1`; `math.ts:31` — `!!layout.behind === (name !== 'logo')`                                                                  | PASS — lacuna de precisão 4 |
| C9    | `diskTurnSeconds(1.5)` = 3, `(4.2)` = 6                               | `math.ts` — "✔ the disk turns in 3 to 6 s"                                                                                   | `math.ts:51-52` — `assert.equal(diskTurnSeconds(1.5), 3)`, `assert.equal(diskTurnSeconds(4.2), 6)`                                                           | PASS                        |
| C10   | movimento reduzido: disco muda ≤ 6 níveis em 1 s                      | `probe.mjs` — "✔ the disk holds still" max change 0                                                                          | `probe.mjs:28` (1 s entre capturas), `probe.mjs:32` — `worst <= 6`, regiões x 420–580 e 860–1020, y 260–320                                                  | PASS                        |
| C11   | 600 s: 5–15 px/s, ≤ 4 px/quadro, nunca para                           | `math.ts` — "✔ the black hole wanders at 5 to 15 px/s"                                                                       | `math.ts:64` — `wander.speed >= 5 && <= 15`; `:65` — `moved/FRAME >= 5*0.97`; `:66` — `moved <= 4`                                                           | PASS — lacuna de precisão 6 |
| C12   | nenhuma dependência nova                                              | `git diff --exit-code 083a798 -- package.json package-lock.json` exit 0, sem saída                                           | —                                                                                                                                                            | PASS                        |
| C13   | compila e passa no lint                                               | `npx tsc --noEmit -p .` exit 0 ("No errors found"); `npm run lint` exit 0 ("No issues found")                                | —                                                                                                                                                            | PASS                        |

## Lacunas de precisão (em ordem)

1. **C2, "o caminho"**: `black-hole.test.ts` não tem teste do caminho (só horizonte, disco,
   subida, tamanho, poço). O caminho vive em `black-hole-path.ts`, cujo `WANDER` mudou
   (`maxSpeedStep` 4 → 2, fora do `Impact`, que cita `maxFrame` e `minHop`). "Curva a cada 4 a
   10 s" e "fica dentro da Hero" (`black-hole-path.test.ts:69`, `:121`) não rodaram. Só a parte
   de C11 (velocidade, ≤ 4 px, nunca para) cobre o caminho no HEAD.
2. **C7 é estrutural, não visual**: conta pixels fora do `ink` em caixas fixas
   (`probe.mjs:24`), sem derivá-las das `anchor` e sem controle negativo (as mesmas caixas sem
   os modelos). Brilho do disco ou outra luz na caixa passaria. As contagens (2318–10716) estão
   muito acima de 300, o que reduz o risco, mas não prova que o pixel é vidro.
3. **C5/C6 provam a matemática, não o shader**: `deflection.ts` está intacto, e
   `math.ts:38-43` usa `sourceRadius`/`bendAt`. O remapeamento para a camada 2× em
   `bent-light.tsx:64` (`0.5 + (from - 0.5) / 2`) e o fov alargado em `bent-light.tsx:131-134`
   só foram conferidos por leitura (coerentes). As posições θ₊/θ₋ na tela (critério 5 da
   tarefa) não têm prova no HEAD; o `e2e/deflection.spec.ts` está quebrado por decisão.
4. **C8 lê dados, não a ligação**: prova o `behind` de `GLASS_LAYOUT`. A atribuição de camada
   real está em `glass-elements.tsx:196` (`layer={layout.behind ? BEHIND_LAYER : 0}`) e `:87`
   (`mesh.layers.set(layer)`), sem assert. O "não pegam o ponteiro" do critério 8
   (`glass-elements.tsx:157-158`) também não é afirmado.
5. **C4**: o assert mede a distância ao longo da visão, não `z === -3`, e `DEPTH = 8.5` está
   copiado em `math.ts:15`, não lido de `black-hole-mesh.tsx:23`. Um assert mais forte que o
   claim sobre "atrás" e mais fraco sobre o valor literal.
6. **C11**: o teto de 15 px/s é afirmado sobre o campo interno `wander.speed`; o deslocamento
   medido só tem teto de 4 px/quadro (240 px/s). Uma semente só (42).

Fora do escopo deste perfil, mas registrado: o critério 12 da tarefa ("fora da tela 0 draw
calls", "`logo` não cruza o `<h1>` nem o CTA") não tem check; C13 cobre só `tsc` e lint.

## Gate

- `node --test …/scratchpad/behind/math.ts` — 5 passed, 0 failed
- `node …/scratchpad/behind/probe.mjs` — 4 passed, 0 failed (contra `:3200`, HTTP 200)
- `node --test components/organisms/hero/black-hole.test.ts components/organisms/hero/deflection.test.ts` — 17 passed, 0 failed
- `git diff --exit-code 083a798 -- package.json package-lock.json` — exit 0
- `npx tsc --noEmit -p .` — exit 0; `npm run lint` — exit 0
