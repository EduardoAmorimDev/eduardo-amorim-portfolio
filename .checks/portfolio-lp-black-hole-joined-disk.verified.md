# Landing page do portfólio — buraco negro com disco ligado: verificação

**Verdict**: PASS
**Profile**: light (rodaram os passos 2, 3 e 5; o passo 1, comparação com as fontes vinculantes, e o passo 4, injeção de falhas, não rodam neste perfil)
**Diff range**: 993200c..b735bc6 (código em 1223082; de 1223082 a b735bc6 só mudou `.checks/`)
**Round**: 2 - scoped
**Verifier**: subagente independente (autor != verificador)

Notas de contexto:

- Desde a rodada 1, nenhum fonte mudou: `git diff --stat 1223082 b735bc6` só lista os dois
  arquivos de `.checks/`. Mudaram o texto de C3/C4 no checklist e os scripts de prova fora do
  repositório (`…/scratchpad/joined/source.ts` e `probe.mjs`). As provas ficam no scratchpad da
  sessão, não são versionadas e somem com ela.
- Os testes do repositório não rodaram, por decisão do usuário.
- O build em `:3200` corresponde ao HEAD. Os fontes do hero têm mtime 14:25:36–14:25:41,
  `.next/BUILD_ID` tem 14:26:16, e o chunk `.next/static/chunks/2cncakej3ctvh.js` contém a linha
  `foot` atual. A árvore de trabalho estava limpa.

## Checks

| Check | Escopo                                    | Proof run (HEAD b735bc6)                                                                                                      | Evidence                                                                                                                                                                                                                                                        | Result                                                                                                                    |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| C1    | lacuna da rodada 1 (amostra de 1/4)       | `node probe.mjs` exit 0 — `✔ only the black hole models 0, stray px 0`                                                        | `probe.mjs:15`: varre **todos** os pixels (passo 1 em x e em y) fora de 4,8 R contra a cor do `body`                                                                                                                                                            | PASS, verified at b735bc6. Lacuna fechada.                                                                                |
| C2    | carried                                   | idem — `✔ no text, no 2D drawing {"text":"","tags":0,"ink":0}`                                                                | `probe.mjs:17-18`                                                                                                                                                                                                                                               | PASS, carried from 1223082 (prova re-executada, verde)                                                                    |
| C3    | NOT PROVEN na rodada 1                    | idem — `✔ thicker on top top 1.285 R, bottom 1.180 R, difference 0.105`                                                       | `probe.mjs:20`: limiar 0,05 a ±8°, como diz o check (`.checks/…joined-disk.md:81-83`); `:22`: `Math.abs(top - 1.3) <= 0.05 && top - bottom >= 0.05`                                                                                                             | PASS, verified at b735bc6. A posição absoluta agora é afirmada. A medida (1,285) fica a 0,035 do limite inferior de 1,25. |
| C4    | lacuna da rodada 1 (faixa na tela)        | `probe.mjs` (`✔ unchanged below bottom edge 1.180 R`) e `node --test source.ts` (`✔ bottom edge stays 1.22`)                  | `probe.mjs:23`: `Math.abs(bottom - 1.22) <= 0.05`; `source.ts:12-15`: `halfHeight 1.22`, `topHeight 1.3`, linhas literais `rise`/`outer` (mesh `:185,:187`); `:18-22`: de 200° a 340°, `rise` e `foot` = 0 com as constantes do shader fixadas em `:14` e `:27` | PASS, verified at b735bc6. Faixa restaurada para 1,17–1,27. A medida, 1,180, fica a 0,010 do limite.                      |
| C5    | lacuna da rodada 1 (peso inteiro nos pés) | `source.ts` — `✔ feet widen into the disk`                                                                                    | `source.ts:26-28` (`FOOT_OUT`, `foot`, `diskGas` no plano); `:29`: `float weight = max(mix(0.6, 1.0, …), foot);` (mesh `:198`)                                                                                                                                  | PASS, verified at b735bc6. Lacuna fechada.                                                                                |
| C6    | carried                                   | `probe.mjs` — `✔ no dark gap at the sides lowest share of the 2 R brightness: 0.92`                                           | `probe.mjs:25-28`                                                                                                                                                                                                                                               | PASS, carried from 1223082 (prova re-executada, verde; média em faixa, como registrado na rodada 1)                       |
| C7    | carried                                   | `source.ts` — `✔ both disks share the gas`                                                                                    | `source.ts:33-35`                                                                                                                                                                                                                                               | PASS, carried from 1223082 (prova re-executada, verde)                                                                    |
| C8    | lacuna da rodada 1 (voltas do `DISK`)     | `git diff --exit-code 993200c -- package.json package-lock.json` exit 0; `source.ts` — `✔ pace and horizontal disk unchanged` | `source.ts:40`: `[DISK.inner, DISK.outer, DISK.innerTurn, DISK.outerTurn]` = `[1.15, 3, 80/1.1, 160/1.1]`, os mesmos valores de `993200c:black-hole.ts:29-33`; `:39` `WANDER`; `:41-42` diff do mesh                                                            | PASS, verified at b735bc6. Lacuna fechada.                                                                                |
| C9    | carried                                   | `npx tsc --noEmit -p .` exit 0 (`No errors found`); `npm run lint` exit 0 (`No issues found`)                                 | saída dos comandos                                                                                                                                                                                                                                              | PASS, carried from 1223082 (re-executado, verde)                                                                          |

## Notas (não bloqueiam)

- **Texto impreciso no `Landing`**, em `.checks/portfolio-lp-black-hole-joined-disk.md:43`. Ele
  diz que, onde sen θ ≤ −0,2 (θ de 191° a 349°), a borda fica exatamente 1,22. Isso não vale de
  ~191° a 200° nem de 340° a ~349°: ali |sen θ| < 0,33, então `foot` > 0. A 195°, por exemplo,
  `outer` ≈ 1,31. O mesmo exagero aparece na primeira frase de C4 (`:85`). A prova cobre de 200°
  a 340°, que é o que o critério 4 da tarefa exige (`.tasks/portfolio-lp-black-hole-joined-disk.md:52`).
  O check fica provado, mas convém corrigir o texto.
- **Margens apertadas nas medidas de tela.** Embaixo, a borda medida (1,180) fica a 0,010 de
  1,17. Uma troca de rasterizador ou de GPU pode deixar C4 vermelho sem que o código mude.

## Gate

`node --test …/joined/source.ts`: 4 passed, 0 failed · `node …/joined/probe.mjs`: 5 passed, 0 failed (exit 0) ·
`git diff --exit-code 993200c -- package.json package-lock.json`: exit 0 · `npx tsc --noEmit -p .`: exit 0 ·
`npm run lint`: exit 0. Checks provados: 9/9.
