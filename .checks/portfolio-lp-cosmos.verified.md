# Landing page do portfólio — Hero cósmica e refinamentos: verificação

**Veredito**: FAIL
**Perfil**: `light` (o `AGENTS.md` do repositório não declara perfil)
**Intervalo do diff**: `c625ce9..b4d6bad` (branch `main`). A correção está em `a0ad62b..b4d6bad`, em 4 commits.
**Rodada**: 2 - scoped
**Verificador**: subagente independente (autor != verificador), somente leitura

Placar: **75 de 76 checks provados** (73 PASS e 2 PASS com ressalva de precisão), mais 1 PARCIAL (C23).

Os FAIL da rodada 1 (C32 e C75) passaram, e também os PARCIAL (C17, C54 e C62). O C76, novo, cobre o
critério 42 para o buraco negro. A única lacuna bloqueante está na prova nova de C23: ela esconde as
camadas que diz descartar antes de fazer o teste de clique (ver Lacunas, item 1).

## Escopo desta rodada

- **Provas:** todas rodaram de novo, completas, em `b4d6bad`. Verde é propriedade de um commit.
- **Re-julgados:** todo veredito que não foi PASS na rodada 1 (C6, C7, C8, C17, C22, C26, C32, C37,
  C39, C41, C54, C62, C64, C71 e C75); tudo que o diff da correção toca (C23, C27, C29, C31, C49,
  C74 e o novo C76); e a lacuna declarada (critério 31).
- **Citações:** atualizadas nos arquivos que a correção tocou:
  - `e2e/hero.spec.ts`, `hero-grid.spec.ts`, `lens.spec.ts`, `black-hole.spec.ts`,
    `backdrop.spec.ts`, `reduced-motion.spec.ts`, `offscreen.spec.ts`, `faq.spec.ts` e
    `a11y.spec.ts`;
  - `black-hole-path.test.ts` e `grid-motion.test.ts`.

  As demais vêm de `a0ad62b`, e cada uma está marcada.
- **Código tocado pela correção:**
  - `hero.tsx:47-50` ganhou `aria-hidden` no `<Canvas>`.
  - `black-hole-path.ts:144-145`: todo trecho passa a exigir curva ≥ `minTurnCornered = 0.06`, até
    no último relaxamento. O `fallback` vem depois do filtro, então também curva. Confere.

## Passos do verify.md neste perfil (`carried from a0ad62b`)

| Passo | Rodou | Observação |
|---|---|---|
| 1. Checklist × fontes binding | não | Não há fonte binding. A comparação de cada check com o critério que cita foi refeita só para os checks re-julgados. |
| 2. Rodar todas as provas | sim, em `b4d6bad` | Comandos em Gate. |
| 3. Asserção, não presença | sim | Não há `Coverage` nem `Test policy`. |
| 4. Injeção de falhas | não | Não faz parte do perfil `light`. |
| 5. Relatório | sim | Este arquivo. |

## Fontes binding (`carried from a0ad62b`)

| Fonte | Aberta | Contradição | Sem cobertura |
|---|---|---|---|
| — | n/a: nenhuma fonte binding | — | — |

## Checks

Provas: `npm run test:e2e` em `b4d6bad` (119 passed, 0 failed) e `npm test` (40/40). Cada teste
citado aparece individualmente no log como executado. Os números `#n` são da execução da rodada 2.
Quando a linha diz `carried from a0ad62b`, só a citação vem de lá: a prova rodou verde em
`b4d6bad`.

| Check | Prova (rodada 2) | Evidência (`arquivo:linha` — asserção) | Origem | Resultado |
|---|---|---|---|---|
| C1 | e2e ✓ | `e2e/interaction.spec.ts:16,22` | carried from a0ad62b | PASS |
| C2 | e2e ✓ | `e2e/interaction.spec.ts:30` | carried from a0ad62b | PASS |
| C3 | e2e ✓ | `e2e/interaction.spec.ts:40-48` | carried from a0ad62b | PASS |
| C4 | e2e ✓ | `e2e/interaction.spec.ts:70` | carried from a0ad62b | PASS |
| C5 | e2e ✓ | `e2e/glitch.spec.ts:117-123` | carried from a0ad62b | PASS |
| C6 | e2e #24 ✓ e o toque ✓ | `e2e/faq.spec.ts:165-166` — duração 300 e `ease-out`; `:191-196` — `|full − scrollHeight do conteúdo| <= 1` (1fr); mínimo `< 1` (0fr) e altura intermediária, `:197-200` | verified at b4d6bad | PASS. Resta: o `rotate` de origem 0° não é asserido, só o destino 45°. |
| C7 | e2e ✓ | `e2e/faq.spec.ts:237-238` — `open` e altura > 0 no meio; `:250-251` — 300 ms e `ease-out`; `:255` — `+` a `0deg`/`none` | verified at b4d6bad | PASS\*: o fechamento `1fr`→`0fr` continua sem asserção (o teste de fechamento não mudou). A nota da rodada 2 cita "C6 e C7", mas só o teste de abertura ganhou a prova da altura. |
| C8 | e2e #92 ✓ | `e2e/reduced-motion.spec.ts:157,161` — `took(entered→opened)` e `took(left→closed)` `<= 50` ms; `:158,162` — `animations()` vazio | verified at b4d6bad | PASS |
| C9 | e2e ✓ | `e2e/faq.spec.ts:85` — `elapsed <= 300`; demais testes como na rodada 1 | verified at b4d6bad | PASS |
| C10 | unit ✔ | `lib/glitch.test.ts:64-73` | carried from a0ad62b | PASS |
| C11 | e2e ✓ | `e2e/glitch.spec.ts:70-71,75-76` | carried from a0ad62b | PASS |
| C12 | e2e ✓ | `e2e/glitch.spec.ts:96-97` | carried from a0ad62b | PASS |
| C13 | e2e ✓ | `e2e/glitch.spec.ts:107-112` | carried from a0ad62b | PASS |
| C14 | unit ✔ | `lib/glitch.test.ts:25-31,41-50` | carried from a0ad62b | PASS |
| C15 | e2e ✓ | `e2e/glitch.spec.ts:197,199,204-205` | carried from a0ad62b | PASS |
| C16 | e2e ✓ | `e2e/glitch.spec.ts:135,140-141` | carried from a0ad62b | PASS |
| C17 | e2e #88 ✓ | `e2e/reduced-motion.spec.ts:23` — `GLITCH_WAIT_MS = 15_000` por título; `:71` — `expect(log).toEqual([])` | verified at b4d6bad | PASS |
| C18 | e2e ✓ ✓ | `e2e/hero.spec.ts:103` — `<= 2`; `:107-112` — subtítulo e CTA abaixo | verified at b4d6bad | PASS |
| C19 | e2e ✓ ✓ | `e2e/hero.spec.ts:105-106` — entre 40% e 55% | verified at b4d6bad | PASS |
| C20 | e2e ✓ ✓ | `e2e/sections.spec.ts:56-58` | carried from a0ad62b | PASS |
| C21 | e2e ✓ | `e2e/hero.spec.ts:66` — `toEqual(['logo'])` | verified at b4d6bad | PASS |
| C22 | e2e #60 ✓ | `e2e/hero.spec.ts:24` — exclusão y ±95, ou seja, 193–383, abaixo do topo do `h1` medido (390,6); `:165-184` — sem ponteiro e com o ponteiro nos 4 cantos, `count > 500` e `crosses).toBe(false)` | verified at b4d6bad | PASS |
| C23 | unit ✔ ✔, e2e #61 ✓ | unit: `glass-motion.test.ts:54-55,63`, com `1.06` fixado em `:38`. e2e: `e2e/hero.spec.ts:191-201` — `elementFromPoint(onGlass)` cai na cena | verified at b4d6bad | **PARCIAL**. A prova nova não decide a afirmação nova ("nenhuma camada sobre a cena (malha, lente, texto) toma o ponteiro do `logo`"): `:191` chama `showSceneOnly`, que dá `visibility: hidden` justamente à malha, à lente, ao `h1`, ao `p`, ao `a` e ao contorno (`e2e/page-helpers.ts:196,209-213`). O hit test só roda depois. Elementos com `visibility: hidden` não entram no `elementFromPoint`, então o teste passa mesmo que qualquer dessas camadas tome o ponteiro. Malha e lente ficam cobertas por C37 (`pointer-events: none`); o texto, por exemplo o subtítulo, não. |
| C24 | e2e ✓ ✓ | `e2e/hero.spec.ts:78`; `e2e/hero-grid.spec.ts:164` | verified at b4d6bad | PASS |
| C25 | e2e ✓ | `e2e/hero-grid.spec.ts:191,196` | verified at b4d6bad | PASS |
| C26 | unit ✔ | `grid-motion.test.ts:28,32,45`; `:40` — `|acos((below−above)/48) − π/6| < 0.005` | verified at b4d6bad | PASS. A inclinação fica fixada em 30° ±0,3°. |
| C27 | e2e #48 ✓ | `e2e/hero-grid.spec.ts:35` — `drift(ms) = 60·ms/1000 + 4`; `:245` — `drift(600)`, que bate com 300+300 ms de relógio; `:139` — `<= 1` | verified at b4d6bad | PASS |
| C28 | unit ✔ | `grid-motion.test.ts:66` (e a asserção do ponteiro logo acima) | verified at b4d6bad | PASS |
| C29 | e2e #49 ✓ | `e2e/hero-grid.spec.ts:260` — `drift(900)` (300+300+300); `:278-279` — 6..20 | verified at b4d6bad | PASS |
| C30 | e2e ✓ | `e2e/hero-grid.spec.ts:301,304` | verified at b4d6bad | PASS |
| C31 | e2e #51 ✓ | `e2e/hero-grid.spec.ts:325` — `drift(2750)` (300+300+150+2000); `:330-333` — 6..20 e `|left−right| <= 1.5` | verified at b4d6bad | PASS |
| C32 | e2e #52 ✓ | `e2e/hero-grid.spec.ts:356` — `farFrom(null, drift(1450))` (300+50+300+800); `:139` — `<= 1` | verified at b4d6bad | PASS. A premissa de deriva agora cobre o relógio que o teste avança. |
| C33 | unit ✔ | `grid-motion.test.ts:88,94,98` | verified at b4d6bad | PASS |
| C34 | e2e ✓ | `e2e/hero-grid.spec.ts:224-225` | verified at b4d6bad | PASS |
| C35 | e2e ✓ | `e2e/hero-grid.spec.ts:235` | verified at b4d6bad | PASS |
| C36 | e2e ✓ | `e2e/reduced-motion.spec.ts:95` | verified at b4d6bad | PASS |
| C37 | e2e #53 ✓ | `e2e/hero-grid.spec.ts:365` — `pointer-events: none`; `:381` — `elementFromPoint(innerWidth/2, innerHeight/2)`; `:388` — `{scene:true,title:true,cta:true}` | verified at b4d6bad | PASS. (720, 450) cai entre o `h1` (até 446,6) e o subtítulo (a partir de 462,6), como medido na rodada 1. |
| C38 | e2e ✓ | `e2e/lens.spec.ts:141-142,145` | verified at b4d6bad | PASS |
| C39 | e2e #68 ✓ | `e2e/lens.spec.ts:166` — nada fora do raio; `:173-174` — 6..10; `:185-186` — `max(lados) >= 2`, cada lado `<= 4`; `:188` — estrelas em `mist` | verified at b4d6bad | PASS |
| C40 | unit ✔ | `lens.test.ts:28,31,33,41-42` | carried from a0ad62b | PASS |
| C41 | e2e #69 ✓ | `e2e/lens.spec.ts:247,251` — 90% apagado dentro, 95% aceso fora; `:266` — `stroke > 50`; `:267` — `closest` a `mist` `<= 12` | verified at b4d6bad | PASS\*: "apagam" vale para 90% dos pixels do miolo, não para todos. A largura de 1 px do critério 26 só está provada no código (`app/globals.css:142`). |
| C42 | e2e ✓ | `e2e/a11y.spec.ts:17,24,28` | verified at b4d6bad (linhas iguais) | PASS |
| C43 | e2e ✓ | `e2e/lens.spec.ts:280,284` | verified at b4d6bad | PASS |
| C44 | e2e ✓ | `e2e/lens.spec.ts:302` | verified at b4d6bad | PASS |
| C45 | e2e ✓ | `e2e/reduced-motion.spec.ts:103` | verified at b4d6bad | PASS |
| C46 | `! grep -rnE …`, exit 0 | nenhum resultado | verified at b4d6bad | PASS |
| C47 | e2e ✓ | `e2e/black-hole.spec.ts:98` | verified at b4d6bad | PASS |
| C48 | e2e ✓ | `e2e/black-hole.spec.ts:128` | verified at b4d6bad | PASS |
| C49 | e2e #10 ✓ | `e2e/black-hole.spec.ts:148,150-151,180`; além disso `:171-172` — vermelho/azul no miolo `> borda + 0.2` (critério 28, de `mist` a `primary`) | verified at b4d6bad | PASS. A cobertura do gradiente do critério 28 está no teste, mas o texto do check não o menciona; só a nota da rodada 2 registra. |
| C50 | e2e ✓ | `e2e/black-hole.spec.ts:201,204` | verified at b4d6bad | PASS |
| C51 | e2e ✓ | `e2e/black-hole.spec.ts:221-222,224` | verified at b4d6bad | PASS |
| C52 | unit ✔, e2e ✓ | `black-hole.test.ts:21,30-33`; `e2e/black-hole.spec.ts:267` | verified at b4d6bad | PASS |
| C53 | unit ✔ | `black-hole-path.test.ts:59,62` | verified at b4d6bad | PASS |
| C54 | unit ✔ | `black-hole-path.test.ts:82` — trechos de 4 a 10 s; `:101` — `turn >= 0.05` rad entre trechos, com o ângulo envolvido em (−π, π]. O código garante ≥ 0.06 (`black-hole-path.ts:144-145`). | verified at b4d6bad | PASS |
| C55 | unit ✔ | `black-hole-path.test.ts:115` | verified at b4d6bad | PASS |
| C56 | unit ✔ | `black-hole-path.test.ts:129` (e as três bordas seguintes) | verified at b4d6bad | PASS |
| C57 | unit ✔, e2e ✓ | `black-hole-path.test.ts:151`; `e2e/black-hole.spec.ts:281` | verified at b4d6bad | PASS |
| C58 | e2e ✓ | `e2e/reduced-motion.spec.ts:114,119` | verified at b4d6bad | PASS |
| C59 | unit ✔, e2e ✓ | `black-hole.test.ts:41`; `e2e/black-hole.spec.ts:331` | verified at b4d6bad | PASS |
| C60 | e2e ✓ | `e2e/black-hole.spec.ts:248` — `facing > away * 1.05` | verified at b4d6bad | PASS |
| C61 | e2e ✓ ✓ | `e2e/hero.spec.ts:219`; `e2e/sections.spec.ts:60-63` | verified at b4d6bad | PASS |
| C62 | e2e #3 ✓ | `e2e/backdrop.spec.ts:79,86`; `:111-112` — `getKeyframes`, `offset` 0 e 1 com o mesmo `translate`; `:114` — a 47/48 do ciclo, `< 1vmax` do início | verified at b4d6bad | PASS. As novas asserções lêem os quadros-chave e uma amostra antes do fim; nenhuma das duas é tautológica. |
| C63 | e2e ✓ | `e2e/backdrop.spec.ts:127,132` | verified at b4d6bad | PASS |
| C64 | e2e #5 ✓ | `e2e/backdrop.spec.ts:154-155` — ≥ 5 períodos e atrasos distintos; `:156` — todos os pontos; `:162,167` | verified at b4d6bad | PASS |
| C65 | e2e ✓ | `e2e/backdrop.spec.ts:181,185` | verified at b4d6bad | PASS |
| C66 | e2e ✓ | `e2e/backdrop.spec.ts:210,216` | verified at b4d6bad | PASS |
| C67 | e2e ✓ | `e2e/parallax.spec.ts` (teste na linha 33) | carried from a0ad62b | PASS |
| C68 | e2e ✓ ✓ | `e2e/reduced-motion.spec.ts:187,229` | verified at b4d6bad | PASS |
| C69 | e2e ✓ | `e2e/cards.spec.ts:42,54-63` | carried from a0ad62b | PASS |
| C70 | e2e ✓ | `e2e/cards.spec.ts:114-117` | carried from a0ad62b | PASS |
| C71 | e2e #79 ✓, #77 ✓ | `e2e/offscreen.spec.ts:144-149` — `{hero:0,grid:0,lens:0,notebook:0}`; controle positivo em `:122-123` — `grid > 0` e `lens > 0` com a Hero na tela | verified at b4d6bad | PASS. Só o WebGL2 é instrumentado, o contexto que o R3F usa. |
| C72 | e2e ✓ | `e2e/offscreen.spec.ts:182` | verified at b4d6bad | PASS |
| C73 | `git diff --exit-code c625ce9 -- package.json package-lock.json`, exit 0 | diff vazio | verified at b4d6bad | PASS |
| C74 | e2e ✓ | `e2e/a11y.spec.ts:15,17,24` | verified at b4d6bad | PASS |
| C76 | e2e #2 ✓ | `e2e/a11y.spec.ts:34-35` — `hero-scene` `aria-hidden 'true'`; `:45` — `ariaSnapshot` de `#hero` igual a `['heading','paragraph','link','/url']`; código em `hero.tsx:47-50` | verified at b4d6bad | PASS |
| C75 | os quatro comandos | ver Gate | verified at b4d6bad | PASS |

## Lacuna declarada: critério 31, "com a cor do disco" (`verified at b4d6bad`)

**Aceita como declarada, com evidência só de código.**

- **Código:** `black-hole-mesh.tsx:30` (`LIGHT_BLEND = 0.4`), `:169-170`
  (`colors.mist.clone().lerp(colors.primary, LIGHT_BLEND)`) e `:240`
  (`<pointLight color={light} …>`). A luz é uma mistura das duas cores entre as quais o disco
  varia (`mist` → `primary`, medido em C49), então corresponde a "a cor do disco".
- **Por que não há prova em pixels:** a justificativa (o vidro já é azul saturado, então a tinta da
  luz não aparece nos pixels) é plausível. Não testei.
- **Por que não é exceção em branco:** a lacuna nomeia um único elemento (a cor da luz). A outra
  metade do critério 31, o lado voltado mais claro, segue provada em C60.

## `Swept` (`carried from a0ad62b`)

Nenhuma das restrições citadas foi tocada: `hero-scene.tsx` e `glitch-text.tsx` estão fora do diff
da correção.

## Política de testes e injeção de falhas (`carried from a0ad62b`)

Não há `## Test policy`, e a injeção de falhas não faz parte do perfil `light`.

## Gate (`verified at b4d6bad`)

- `npx tsc --noEmit`: exit 0
- `npm run lint`: exit 0
- `npm test`: exit 0, 40 passed, 0 failed
- `npm run test:e2e`: exit 0, **119 passed**, 0 failed (8,0 min), uma execução completa

## Lacunas, por prioridade

1. **C23 PARCIAL.** O teste novo "the logo still takes the pointer" (`e2e/hero.spec.ts:189-202`)
   esconde com `visibility: hidden` a malha, a lente e o texto antes do `elementFromPoint`. Por
   isso não consegue falhar se uma dessas camadas tomar o ponteiro do `logo`, que é justamente o
   que o check afirma. Correção estreita: fazer o hit test depois de restaurar a visibilidade, ou
   localizar o `logo` numa página separada do teste de clique.
2. **C7 PASS\*.** O fechamento `1fr`→`0fr` continua sem asserção, embora a nota da rodada 2 diga que
   C7 foi tratado.
3. **C41 PASS\*.** "Apagam" vale para 90%, não para todo pixel do miolo. O 1 px do traço só está
   provado no código.
4. **Critério 31, cor da luz.** Lacuna declarada e aceita, com evidência de código
   (`black-hole-mesh.tsx:169-170,240`).
