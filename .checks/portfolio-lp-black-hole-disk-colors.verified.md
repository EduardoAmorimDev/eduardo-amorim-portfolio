# Landing page do portfólio — disco vertical nas cores do horizontal: verificação

**Verdict**: PASS (com achados, ver Notas)
**Profile**: light. Rodaram os passos 2, 3 e 5. Não rodam neste perfil: o passo 1 (comparação com as fontes vinculantes) e o passo 4 (injeção de falhas).
**Diff range**: 72d42a9..c0c4889. O código está em c0c4889. 5859492 e d95393b só mudam `.tasks/` e `.checks/`.
**Round**: 1 - full
**Verifier**: subagente independente (autor != verificador)

Notas de contexto:

- **A árvore de trabalho corresponde ao HEAD.** `git status --short` veio vazio. O `next dev` em `:3000` (pid 458641) roda com cwd neste repositório. A sonda mede, portanto, o código de c0c4889.
- **Os testes do repositório não rodaram**, por decisão do usuário. Nenhum `npm test` ou `test:e2e` foi executado.
- **As provas de tela ficam no scratchpad da sessão.** Não são versionadas e somem com a sessão:
  - a sonda: `…/scratchpad/colors/probe.mjs`;
  - a captura desta rodada: `…/scratchpad/colors/verify.png`.
- **Releituras próprias da mesma captura**, sem alterar o repositório, em `…/scratchpad/verifier/`:
  - `strict.mjs`: valores crus, sem a média de 3 pontos;
  - `traced.mjs`: as linhas traçadas a partir do JPEG de referência;
  - `white.mjs`: varre todos os pixels de 240° a 300°, até 3 R.
- **A medida renegociada** (cor descontada do fundo, janela de ±1 px, degrau da C4 entre médias de 3 pontos) foi aplicada como aprovada pelo usuário. Os limites são os do checklist.

## Checks

| Check | Claim                                                                                                            | Proof run (HEAD c0c4889)                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                        | Result                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| C1    | θ = 90°: ≤ 0,40 a 1,08 R; 0,42–0,55 a 1,25 R; ≥ 0,55 a 1,35 R                                                    | `node probe.mjs …/verify.png` exit 0: `✔ top colours — 1.08 R 0.33, 1.25 R 0.48, 1.35 R 0.72`                           | `probe.mjs:20-21`: `s108 <= 0.40 && s125 >= 0.42 && s125 <= 0.55 && s135 >= 0.55`. Os raios e o ângulo são os do check. Lê o pixel mais claro a ±3° (`:16`), como declarado.                                                                                                                                                                                                                                                    | PASS                                                                     |
| C2    | 1,08→1,35 R, nenhuma queda > 0,02 por passo de 0,01 R                                                            | idem: `✔ top order — largest drop 0.01`                                                                                 | `probe.mjs:22-23`: passo `r += 0.01` de 1,08 a 1,35; `drop <= 0.02`                                                                                                                                                                                                                                                                                                                                                             | PASS                                                                     |
| C3    | ao longo das três linhas, nos dois lados, a cada 0,05 R: ±0,10 do valor na junção; ordem vermelha < ciano ≤ roxa | idem: `✔ bands follow the lines` (piores: redL 0.05, cyanL 0.08, purpleL 0.03, redR 0.08, cyanR 0.02, purpleR 0.03)     | `probe.mjs:24-28`: pontas iguais às do critério 2 (vermelha (0,9; 0,7)→(1,45; 0,3); ciano (0,9; 1,0)→(1,45; 0,68); roxa (0; 1,43)→(1,9; 0,8)). `:29`: passo de 0,05 R. `:38`: `worst > 0.10`. `:41`: ordem. Releitura crua (`strict.mjs`), sem média nem folga: pior 0,099 (redR); pontas cyanL 0,705 < purpleL 0,714 e cyanR 0,720 < purpleR 0,742.                                                                            | PASS. Achados 1 e 2.                                                     |
| C4    | de um ponto ao próximo, a parte azul muda < 0,05, inclusive na junção                                            | idem: `✔ no colour step — largest step 0.03`                                                                            | `probe.mjs:34`: média de 3 pontos (renegociada). `:37`: degrau entre médias consecutivas. `:43`: `step < 0.05`. Sem a média, o maior degrau cru é 0,089 (cyanL); a renegociação aprovada cobre exatamente isso.                                                                                                                                                                                                                 | PASS (pela medida renegociada)                                           |
| C5    | as faixas de cima tiram o gás de `diskGas` em ρ(t); o raio fixa o período                                        | `grep -n "diskGas(rho" black-hole-mesh.tsx`: 1 linha com as duas leituras                                               | `black-hole-mesh.tsx:224`: `float topGas = mix(diskGas(rho, theta), diskGas(rho, planeAngle), lying);`. `:116-117`: `wisps` tira `turn = mix(uInnerTurn, uOuterTurn, share)` do raio. O horizontal usa `diskGas(length(centre), …)` no raio do plano (`:182`).                                                                                                                                                                  | PASS                                                                     |
| C6    | 240°–300°, 1,10–1,22 R: parte azul ≥ 0,55 e nenhum canal > 160                                                   | idem: `✔ dark blue below — all dark blue`                                                                               | `probe.mjs:46`: grade de 1° × 0,005 R. `:48`: `share(p) < 0.55 \|\| Math.max(...p) > 160` reprova. Releitura: menor parte azul 0,716, maior canal 153.                                                                                                                                                                                                                                                                          | PASS. Margem de 7 no canal.                                              |
| C7    | largura do anel `mix(0.028, 0.020, below)`; `below` = 1 de 200° a 340°                                           | `grep -n "0.020" black-hole-mesh.tsx`                                                                                   | `:259`: `float ringWidth = mix(0.028, 0.020, below);`. `:254`: `float below = smoothstep(0.1, 0.34, -sin(theta));`. −sen 200° = 0,342 ≥ 0,34, logo `below` = 1 de 200° a 340°.                                                                                                                                                                                                                                                  | PASS                                                                     |
| C8    | 240°–300°: brancos (≥ 200 nos três canais) só entre 1,00 e 1,07 R                                                | idem: `✔ white only in the ring — white px outside 1.00–1.07 R: 0`                                                      | `probe.mjs:46,49`: `Math.min(...p) >= 200 && (r < 1.0 \|\| r > 1.07)`, amostrado só de 1,00 a 1,22 R. Varredura de todos os pixels até 3 R (`white.mjs`): brancos entre 1,016 e 1,052 R (178 px); nenhum de 1,07 a 3 R; 188 px entre 0,29 e 0,56 R. Estes últimos são a metade da frente do disco horizontal, que passa diante da sombra (`:276`, `:280`, sem mudança).                                                         | PASS. Achado 3.                                                          |
| C9    | o disco horizontal não muda; nenhuma dependência entra                                                           | `git diff --exit-code 72d42a9 -- package.json package-lock.json components/organisms/hero/black-hole.ts`: vazio, exit 0 | `DISK` e `DISK_POSE` ficam em `black-hole.ts:45` (inalterado). `disk()` está em `black-hole-mesh.tsx:179-200`, fora dos hunks do diff (`@@ -136,0`, `@@ -172…-213`). A linha do `diskColor` **foi tocada**. Antes: `mix(uMist, uPrimary, smoothstep(DISK_IN, DISK_OUT - 0.6, length(vec2(q.x, q.y / lean))))`. Depois, `:213`: `diskTint(planeRadius)`. `diskTint` (`:139-141`) e `planeRadius` (`:211`) dão a mesma expressão. | PASS no valor. Achado 4: a prova, como escrita, não vale ao pé da letra. |
| C10   | em todo pixel, r ≤ b + 8                                                                                         | idem: `✔ cool blues only — warm px 0`                                                                                   | `probe.mjs:53-54`: percorre todos os pixels da captura; `d[i] > d[i + 2] + 8` conta. Releitura: o maior r − b é 0.                                                                                                                                                                                                                                                                                                              | PASS                                                                     |
| C11   | compila e passa no lint                                                                                          | `npx tsc --noEmit -p .` exit 0; `npm run lint` (`eslint`) exit 0                                                        | saída dos comandos                                                                                                                                                                                                                                                                                                                                                                                                              | PASS                                                                     |

## Notas

Achados, em ordem de peso. Nenhum muda o veredito.

1. **Lacuna de precisão na C3: o caminho da linha ciano.**
   - **Origem.** O critério 2 e a transcrição da tarefa dão só as pontas da ciano. A sonda a amostra numa reta entre elas.
   - **O que o JPEG mostra.** Tracei a linha desenhada pela cor (limiar sobre o JPEG; erro de ±1–2 px ≈ ±0,02 R). A ciano faz uma curva que fica até ~0,1 R abaixo dessa reta (do lado direito, x = 1,04: y = 0,82 contra 0,92).
   - **Resultado ao longo do traçado.**
     - cyanR: dispersão de 0,129 com a média de 3 pontos e de 0,144 cru; o limite é 0,10.
     - cyanL: 0,095.
     - A vermelha e a roxa da sonda batem com o traçado.
   - **Leitura.** A C3 passa nas coordenadas que a tarefa transcreveu. Pelo desenho, porém, a faixa azul clara cruza mais cor do que o check admite.
   - **Quem decide.** O usuário, se o traçado da ciano deve virar coordenada. Sob `light`, o passo 1 não rodou, então isto não é um veredito contra a fonte vinculante.
2. **A sonda mede a C3 com mais folga que o check.**
   - A média de 3 pontos também entra na C3, e a renegociação só a previu para a C4.
   - A ordem aceita ciano ≤ roxa + 0,02 (`probe.mjs:41`).
   - Relida sem as duas folgas, a C3 ainda passa, mas com margem de 0,001 (redR, 0,099).
3. **Lacuna de precisão na C8.** O check não limita o raio. Lido ao pé da letra, os 188 px brancos a 0,29–0,56 R, que são a metade da frente do disco horizontal diante da sombra (inalterada pelo critério 8), o reprovariam. O critério 7 diz "o disco vertical ali é só azul escuro". Nesse sentido a C8 vale: nenhum branco de 1,07 a 3 R. O texto deveria dizer "fora da sombra (r ≥ 1,00 R)".
4. **A prova da C9 fala mais do que acontece.**
   - **Texto.** Diz que "o diff do mesh não toca … a linha `diskColor`", mas a linha mudou (refatoração equivalente, ver tabela).
   - **Composição da metade de trás** (`:266-276`). Onde a faixa de cima é mais clara que a metade de trás do horizontal, aparece a faixa, em `diskTint(rho)`. É o `max` decidido no `Landing`. Antes, o arco era somado por cima. O cálculo do disco horizontal não mudou, mas o pixel exibido na junção mudou, como planejado.
5. **Margens apertadas.** As medidas de tela dependem do rasterizador; uma troca de GPU ou de driver pode inverter estas sem que o código mude:
   - C3 crua: 0,099 contra 0,10;
   - C6: canal máximo 153 contra 160;
   - C1 a 1,25 R: 0,48, dentro de 0,42–0,55.
6. **Prova extra, fora do checklist.** A sonda também afirma `no WebGL errors` (`probe.mjs:55`), e passou.
7. **Captura, só como nota** (`…/scratchpad/verifier/crop.png`, recorte em volta de (720, 288)).
   - Em cima, o disco vertical vai do branco junto ao horizonte ao azul claro e ao azul na borda de fora. As faixas descem pelos lados e entram no horizontal.
   - Embaixo, só o anel de fótons, fino e branco, sobre uma faixa azul escura bem tênue.
   - Bate com a intenção da tarefa.

## Gate

- `node …/scratchpad/colors/probe.mjs …/scratchpad/colors/verify.png`: 8 passed, 0 failed (exit 0).
- `grep -n "diskGas(rho"`: 1 linha com as duas leituras.
- `grep -n "0.020"`: `:259`.
- `git diff --exit-code 72d42a9 -- package.json package-lock.json components/organisms/hero/black-hole.ts`: exit 0.
- `npx tsc --noEmit -p .`: exit 0.
- `npm run lint`: exit 0.

Checks provados: 11/11. Não rodaram (perfil `light`): o passo 1 (fontes vinculantes) e a injeção de falhas.
