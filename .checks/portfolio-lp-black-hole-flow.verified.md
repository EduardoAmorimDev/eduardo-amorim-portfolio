# Landing page do portfólio — fluxo em volta do buraco negro: verificação

**Verdict**: PASS (13/13 com prova localizada; 6 lacunas de precisão, nenhuma bloqueante)
**Profile**: `light`: rodaram os passos 2, 3 e 5. Não rodaram o passo 1 (fontes vinculantes, só em `ui`), a injeção de falhas (passo 4) nem as linhas de `Test policy`/`Coverage` (`standard`/`ui`).
**Diff range**: `0bd0f9e..b280a5c`
**Round**: 1 - full
**Verifier**: subagente independente (autor != verificador)

Notas de contexto:

- As provas ficam **fora do repositório**, no scratchpad da sessão (`.../scratchpad/flow/math.ts` e `probe.mjs`). Não se reproduzem depois que a sessão acaba.
- Por decisão do usuário, nenhum teste do repositório foi escrito nem rodado. Os testes existentes estão sabidamente quebrados. Exemplo: `components/organisms/hero/deflection.test.ts:43` espera anel de 2 R em lift 0,5, e hoje o anel é de 1,6 R.
- O build de `:3200` corresponde ao HEAD. `.next/BUILD_ID` é de 13:22:06, depois da última alteração dos 4 fontes (13:21:39), e a árvore estava limpa.

## Checks

| Check | Claim                                                                                                | Proof run                                                               | Evidence                                                                                                                                                       | Result          |
| ----- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| C1    | `behindPoint` espelhado na horizontal, r 1,05–8, φ 5°–175°, 10⁻⁹                                     | `node --test math.ts` › "mirror symmetric" ✔                            | `math.ts:14` varre `t` 1,05..8 e `d` 5..175. `math.ts:17`: `Math.abs(up.x - down.x) < 1e-9 && Math.abs(up.y + down.y) < 1e-9`. `math.ts:18`: `Number.isFinite` | PASS            |
| C2    | shader sem `pow` de base com sinal                                                                   | idem › "no pow of a signed value" ✔                                     | `math.ts:25`: `base === 'sine2'`. `math.ts:26`: casa `float sine2 = (q.y * q.y) / (theta * theta);` (`bent-light.tsx:65`)                                      | PASS (lacuna 3) |
| C3    | `cursor` acima do centro aparece, > 300 px fora do fundo, sob movimento reduzido                     | `node probe.mjs` › "the icon above shows" ✔ (4818 px)                   | `probe.mjs:4` usa `reducedMotion: 'reduce'`. `probe.mjs:14-15`: `p[2] - p[0] > 60` na caixa x 330–480, y 100–290; `blue > 300`                                 | PASS (lacuna 5) |
| C4    | fator \|sen φ\|^0,5: 0,84 a 45°, 0,59 a 20°, ±0,01                                                   | `math.ts` › "field factor" ✔                                            | `math.ts:30-31`: `Math.abs(fieldShare(deg(45)) - 0.84) <= 0.01` e `Math.abs(fieldShare(deg(20)) - 0.59) <= 0.01`                                               | PASS (lacuna 2) |
| C5    | cruza o centro a 2,17 / 1,83 / 1,43 R (90° / 60° / 45°), ±3%; não cruza fora da sombra a 30°         | `math.ts` › "where it crosses the centre" ✔                             | `math.ts:35-37`: `Math.abs(cross - at) <= at * 0.03`. `math.ts:39`: `radial(1 + 1e-6, deg(30)) > 0`                                                            | PASS (lacuna 4) |
| C6    | a 90°, d = 96 / 192 / 476 / 700 aparecem a 258 / 320 / 548 / 752 px, ±4                              | `math.ts` › "above and below" ✔                                         | `math.ts:44-46`: pares literais e `Math.abs(at - seen) <= 4`, com R = 96 px, conforme o critério da tarefa (linha 45)                                          | PASS            |
| C7    | a 0°, 476 / 700 aparecem a 420 / 665 px, ±4; nenhum pixel de 1 a 6 R lê < 3,2 R                      | `math.ts` › "at the poles" ✔                                            | `math.ts:51-53`: `Math.abs(at - seen) <= 4`. `math.ts:55`: `radial(t, 0) >= 3.2 - 1e-9` para `t` de 1 a 6, passo 0,01                                          | PASS (lacuna 6) |
| C8    | shader soma `uFlow * uFlow * vec2(q.x, -q.y) / (theta * theta)`                                      | `math.ts` › "shader adds the flow" ✔                                    | `math.ts:59`: `shader.includes('uFlow * uFlow * vec2(q.x, -q.y) / (theta * theta)')` (`bent-light.tsx:71`)                                                     | PASS            |
| C9    | texto em ≥ 10 de 12 faixas de 1440×75, fora de 300 px do centro, > 200 px acima do fundo em 8 níveis | `probe.mjs` › "text wall shows" ✔ (12/12 faixas, de 13 686 a 30 942 px) | `probe.mjs:16`: `far(x, y) && gap(px(a, x, y), ink) > 8`. `probe.mjs:17`: `bands.filter(n => n > 200).length >= 10`                                            | PASS (lacuna 1) |
| C10   | texto é lorem, numa textura (sem nó de texto no DOM da Hero), dentro do canvas `aria-hidden`         | `probe.mjs` › "text is not in the DOM" ✔                                | `probe.mjs:19`: `dom.text === '' && dom.hidden === 'true'`. "Lorem" só se lê no fonte (`behind-text.tsx:24`), sem asserção                                     | PASS (lacuna 1) |
| C11   | duas capturas com 1 s de intervalo iguais a até 6 níveis, longe do buraco negro                      | `probe.mjs` › "text holds still" ✔ (máx. 0)                             | `probe.mjs:20-23`: `waitForTimeout(1000)` e `worst <= 6`                                                                                                       | PASS            |
| C12   | nenhuma dependência nova                                                                             | `git diff --exit-code 0bd0f9e -- package.json package-lock.json` exit 0 | saída vazia, exit 0                                                                                                                                            | PASS            |
| C13   | compila e passa no lint                                                                              | `npx tsc --noEmit -p .` exit 0; `npm run lint` exit 0                   | "TypeScript: No errors found"; "ESLint: No issues found"                                                                                                       | PASS            |

## Lacunas (por gravidade)

1. **C10 e C9: a asserção é mais fraca que a afirmação.**
   - C10: "o texto é lorem" não tem asserção, só o fonte (`behind-text.tsx:24`). `probe.mjs:19` afirma só que `#hero` não tem texto visível e que `hero-scene` é `aria-hidden`. Não afirma que a textura está nesse canvas.
   - C9: `probe.mjs:16` conta qualquer pixel diferente de `ink`. Ícones, brilho e vinheta passam do mesmo jeito que o texto, então nada isola a parede de texto.
2. **Paridade TS/shader do expoente sem prova.** C4 prova `fieldShare` em TS (`math.ts:30`). O shader usa `pow(sine2, ${(FIELD.exponent / 2).toFixed(2)})` (`bent-light.tsx:66`), e nenhuma prova afirma que o expoente é 0,25. C1 também prova a simetria só em `behindPoint`: o critério 1 da tarefa ("±1 px" na tela) não tem prova renderizada.
3. **C2: o regex não pega todos os `pow`.** `math.ts:23` (`\bpow\((\w+)\s*,`) só captura bases que são um identificador. Um `pow(a.y / b, …)` futuro, como o da versão antiga, escapa enquanto houver algum `pow(sine2, …)`.
4. **C5 a 30°: um único ponto.** `math.ts:39` testa só r = 1 + 10⁻⁶. "Não cruza fora da sombra" vale para todo r > 1 e depende de monotonicidade não provada. A bissecção de `math.ts:36` supõe o mesmo.
5. **C3: a caixa é fixa.** `probe.mjs:14` usa coordenadas fixas (x 330–480, y 100–290) e o centro em (720, 288) em `probe.mjs:11`. Nada confirma que o `cursor` está nessa caixa, e o limite y 290 passa 2 px da linha do centro.
6. **C7: só um polo.** `math.ts:52` e `math.ts:55` amostram φ = 0. O polo esquerdo (φ = 180°) fica coberto só pela forma da fórmula.

Fora do escopo `light`, registrado sem julgar:

- O critério 7 da tarefa (z = −4, Montserrat, `mist` a 40%, 18/28 px, blocos de 4–8 linhas) não tem check próprio além da presença (C9).
- Os critérios herdados 10 (5–15 px/s) e 11 (0 draw calls fora da tela) não têm check.

## Gate

`node --test .../scratchpad/flow/math.ts`: 7 passed, 0 failed. `node .../scratchpad/flow/probe.mjs`: 4 de 4 ✔, exit 0. `git diff --exit-code` (C12): exit 0. `npx tsc --noEmit -p .`: exit 0. `npm run lint`: exit 0.
