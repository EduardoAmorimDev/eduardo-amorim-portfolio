# Landing page do portfólio — Hero cósmica e refinamentos: verificação

**Veredito**: FAIL
**Perfil**: `light` (o `AGENTS.md` do repositório não declara perfil)
**Intervalo do diff**: `c625ce9..a0ad62b` (branch `main`), todos os checks C1–C75
**Rodada**: 1, completa (`verified at a0ad62b`)
**Verificador**: subagente independente (autor != verificador), somente leitura

Placar: **70 de 75 checks provados** (60 PASS, 10 PASS com ressalva de precisão). Os outros 5 se
dividem em 2 FAIL (C32 e C75) e 3 PARCIAL (C17, C54 e C62), com parte da afirmação sem asserção que
a decida. Há ainda 1 critério da tarefa que o código não cumpre e que nenhum check cobre: o 42, no
trecho do buraco negro (ver Lacunas, item 2).

## Passos do verify.md neste perfil

| Passo | Rodou | Observação |
|---|---|---|
| 1. Checklist × fontes binding | não | Não há fonte binding. As referências visuais estão marcadas como "estilo, não binding" (checklist, linha 14), e os valores que decidem algo estão nos critérios da tarefa. Mesmo assim, comparei cada check com o critério que cita (pedido do orquestrador); o resultado está em Lacunas. |
| 2. Rodar todas as provas | sim | Comandos em Gate. |
| 3. Asserção, não presença | sim | Uma linha por check na tabela. Não há `Coverage` nem `Test policy` no checklist, então não houve join a recalcular nem linhas de política a julgar. O `Swept` foi conferido no código (ver abaixo). |
| 4. Injeção de falhas | não | Não faz parte do perfil `light`. |
| 5. Relatório | sim | Este arquivo. |

## Fontes binding

| Fonte | Aberta | Contradição | Sem cobertura |
|---|---|---|---|
| — | n/a: nenhuma fonte binding | — | — |

## Checks

Provas e2e: uma execução completa de `npm run test:e2e` em `a0ad62b` (116 passed, 1 failed). Cada
teste citado aparece individualmente no log como executado. Provas de unidade: `npm test` (40/40),
todos os nomes citados aparecem como `✔`.

Legenda: **PASS** = a asserção decide o valor do checklist. **PASS\*** = provado, mas com lacuna de
precisão anotada. **PARCIAL** = parte da afirmação sem asserção que a decida. **FAIL** = prova
vermelha em HEAD.

| Check | Afirmação | Prova executada | Evidência (`arquivo:linha` — asserção) | Resultado |
|---|---|---|---|---|
| C1 | textos com `cursor: default` e `user-select: none` | e2e #61 ✓ | `e2e/interaction.spec.ts:16,22` — `cursor === 'default' && userSelect === 'none'`; `expect(wrong).toEqual([])` | PASS |
| C2 | clique triplo em `#sobre p` não seleciona | e2e #62 ✓ | `e2e/interaction.spec.ts:30` — `expect(getSelection().toString()).toBe('')` | PASS |
| C3 | controles e descendentes com `cursor: pointer` | e2e #63 ✓ | `e2e/interaction.spec.ts:40-48` — `[control, ...control.querySelectorAll('*')]`, `cursor === 'pointer'`, `expect(found.wrong).toEqual([])` | PASS |
| C4 | hover muda o fundo ou o texto de cada controle | e2e #64 ✓ | `e2e/interaction.spec.ts:70` — `expect(hovered).not.toEqual(rest)` ({color, backgroundColor}) | PASS |
| C5 | hover em `h1`/`h2` por 1 s não liga glitch | e2e #36 ✓ | `e2e/glitch.spec.ts:117-123` — `['#hero h1', '#cases h2']`, `runFor(1000)`, `expect(log).toEqual([])` | PASS |
| C6 | abrir: `grid-template-rows` 0fr→1fr, opacidade 0→1, `+` 0→45°, 300 ms `ease-out`, por hover, clique, Enter e toque | e2e #23 ✓, #30 ✓ (toque) | `e2e/faq.spec.ts:156-168` — `duration).toBe(300)`, `easing).toBe('ease-out')`, opacidade `'0'`→`'1'`, `rotate` `to '45deg'`; `:188-192` — altura mínima `< 1` e intermediária. Toque: `:343-351` | PASS\*: `0fr`/`1fr` e o `rotate` de origem 0 não são asseridos (`null`, `:157,159`); o crescimento é provado pela altura. O toque é provado por um teste que o checklist não nomeia. |
| C7 | fechar: 1fr→0fr, opacidade 1→0, `+` a 0°, 300 ms `ease-out`; no meio, `open` e altura > 0 | e2e #24 ✓ | `e2e/faq.spec.ts:228-229` — `middle.open).toBe(true)`, `middle.height).toBeGreaterThan(0)`; `:241-243` — duração 300, `ease-out`, opacidade `to '0'`; `:246` — `['0deg','none']).toContain(back?.to)` | PASS\*: `1fr`→`0fr` não é asserido (`null`, `:233`) |
| C8 | movimento reduzido: sem transição, estado final de imediato | e2e #90 ✓ | `e2e/reduced-motion.spec.ts:138,141` — `expect(await animations()).toEqual([])` | PASS\*: "de imediato" não tem prazo (`toHaveJSProperty` espera até 5 s, `:136,140`); só o hover é exercitado |
| C9 | regras 20–26 continuam; `closing` em até 300 ms | e2e #19–22, #25–29, #31 ✓ | `e2e/faq.spec.ts:84-85` — `elapsed` ≥ 0 e `toBeLessThanOrEqual(300)`; demais: `:29`, `:43-46`, `:54`, `:260`, `:274`, `:290`, `:301-305`, `:333-337`, `:358-362` | PASS |
| C10 | espera = `5000 + 7000 × r` | unit ✔ | `lib/glitch.test.ts:64-65` — `burstWait(0) == 5000`, `burstWait(1) ≈ 12000`; `:69-70` — linear; `:73` — `[5000, 12000)` | PASS |
| C11 | 1ª rajada 5–12 s após entrar; a seguinte 5–12 s após o fim | e2e #33 ✓ | `e2e/glitch.spec.ts:70-71`, `:75-76` — `toBeGreaterThanOrEqual(5000)` / `toBeLessThanOrEqual(12000)` | PASS |
| C12 | dois títulos sorteiam esperas próprias | e2e #34 ✓ | `e2e/glitch.spec.ts:96-97` — `expect(starts[0]).not.toBe(starts[1])` | PASS |
| C13 | entrar, hover e clique: nenhuma rajada em 4,9 s | e2e #35 ✓ | `e2e/glitch.spec.ts:107-112` — `runFor(500)` + `runFor(4400)`; `expect(log).toEqual([])` | PASS |
| C14 | `BURST` ≤ 3 quadros + 1 limpo, ≤ 300 ms, cópias 1–3 px, sem tremor | unit ✔ ✔ | `lib/glitch.test.ts:25-31` — `withCopies.length <= 3`, `BURST.length == withCopies+1`, `last.copies == null`, `last.at <= 300`; `:41-50` — chaves só `['at','copies']`, `1 <= |x| <= 3` | PASS |
| C15 | rajada real: ≤ 3 quadros distintos, ≤ 3 px, título com `transform: none` | e2e #38 ✓ | `e2e/glitch.spec.ts:197` — `distinct.size <= 3`; `:199` — `heading).toEqual({inline:'', computed:'none'})`; `:204-205` — 1 ≤ x ≤ 3 | PASS |
| C16 | < 50% na tela: nenhuma rajada em 15 s | e2e #37 ✓ | `e2e/glitch.spec.ts:135,140-141` — 40% visível, `runFor(15_000)`, `log).toEqual([])` | PASS |
| C17 | movimento reduzido: nenhuma rajada em 15 s na tela | e2e #86 ✓ | `e2e/reduced-motion.spec.ts:23,67,69` — `GLITCH_WAIT_MS = 13_000` por título; `expect(log).toEqual([])` | PARCIAL: a prova cobre 13 s, não os 15 s do check (13 s ainda passam da espera máxima de 12 s) |
| C18 | centros a ≤ 2 px do centro da janela; subtítulo abaixo do `h1`, CTA abaixo do subtítulo (1440×900 e 375×667) | e2e #57 ✓, #58 ✓ | `e2e/hero.spec.ts:90-93` — `|centro − width/2| <= 2`; `:97-102` — `subtitle.top >= title.bottom`, `cta.top >= subtitle.bottom` | PASS |
| C19 | centro vertical do `h1` entre 40% e 55% | e2e #57 ✓, #58 ✓ | `e2e/hero.spec.ts:94-96` — `middle >= height*0.4`, `<= height*0.55` (a Hero tem `h-svh`) | PASS |
| C20 | `h1`, subtítulo e CTA cabem na primeira tela | e2e #96 ✓, #97 ✓ | `e2e/sections.spec.ts:56-58` — `inside({0,0,...viewport})).toBe(true)` | PASS. A prova é anterior ao diff, mas mede as caixas em tempo de execução, então vale para o novo layout. |
| C21 | só `logo.glb` é requisitado | e2e #55 ✓ | `e2e/hero.spec.ts:56` — `expect([...models]).toEqual(['logo'])` | PASS |
| C22 | pixels do `logo` não cruzam a caixa do `h1` nem a do CTA | e2e #59 ✓ | `e2e/hero.spec.ts:136,146-148` — `count > 500`; `crosses).toBe(false)` | PASS\*: a exclusão em volta do buraco negro (`:23,125-128`, x 480–960, y 178–398) cobre ~7 px do `h1` (medido: `h1` em y 390,6–446,6). Mede só o repouso sob movimento reduzido, enquanto o critério 15 diz "sempre". |
| C23 | `logo` inclina para o ponteiro e cresce 1,06× no hover | unit ✔ ✔ | `glass-motion.test.ts:54-55` — `rotationX == -parallaxTilt`, `rotationY == parallaxTilt`; `:63` — `scale == MOTION.hoverScale`, fixado em `1.06` em `:38` | PASS |
| C24 | canvas da malha = caixa da Hero (±1); quatro cantos com tinta | e2e #56 ✓, #43 ✓ | `e2e/hero.spec.ts:67-68` — `|grid[side] − hero[side]| <= 1`; `e2e/hero-grid.spec.ts:161` — `inked > 0` em cada canto de 64 px | PASS |
| C25 | no alto ≤ 0,8× o espaço de baixo; 48 px (±0,5) no meio | e2e #44 ✓ | `e2e/hero-grid.spec.ts:187-189` — `top <= 0.8*bottom`; `:191-195` — `>10` gaps, `|gap−48| <= 0.5` | PASS |
| C26 | geometria de perspectiva a 30°: retas, 48 px no meio, convergindo | unit ✔ | `grid-motion.test.ts:27` — `|gap−48| < 1e-9`; `:30-33` — `top <= 0.8*bottom`; `:38` — inclinação igual nas duas metades | PASS\*: o 30° não é fixado. A razão ≤ 0,8 aceita qualquer inclinação ≥ ~19,5° (em 30° ela vale 0,694). |
| C27 | > 180 px do ponteiro e > 280 px do buraco negro: ≤ 1 px da reta | e2e #47 ✓ | `e2e/hero-grid.spec.ts:130,133-136` — `lines > 20`; `|x − line.at(y)| <= 1` | PASS (com a mesma premissa frágil de `HOLE_DRIFT` descrita em C32) |
| C28 | fora dos raios, deslocamento exatamente 0 | unit ✔ | `grid-motion.test.ts:55-59` — `deepEqual(..., {x:0,y:0})` a `raio + 1e-6` | PASS |
| C29 | ponteiro a ½ e a ¼ do vão: as vizinhas se curvam na direção dele; a mais próxima desvia 6–20 px | e2e #48 ✓ | `e2e/hero-grid.spec.ts:261-264` — sinais "na direção"; `:272` — a outra `> 1`; `:275-276` — `>= 6`, `<= 20` | PASS |
| C30 | horizontais dentro de 180 px se curvam para baixo | e2e #49 ✓ | `e2e/hero-grid.spec.ts:298` — `now − y > least`; `:301` — `sagging >= 4` | PASS |
| C31 | após salto de 96 px: em 150 ms, vizinhas 6–20 px, diferença ≤ 1,5; igual 2 s depois | e2e #50 ✓ | `e2e/hero-grid.spec.ts:320,327-330` — `[150, 2000]`; `>= 6`, `<= 20`; `|left−right| <= 1.5` | PASS |
| C32 | 800 ms após sair: nenhuma linha fora do poço do buraco negro desvia > 1 px | e2e #51 **✘** | `e2e/hero-grid.spec.ts:352` → `:136`: `Expected <= 1, Received 1.455867` ("line near 408px at 392px") | **FAIL**. Passou 6 de 6 vezes isolado, então é intermitente. Causa provável: a exclusão supõe o buraco negro a ≤ 40 px do repouso (`HOLE_DRIFT`, `:33`), mas o teste avança ~1,75 s de relógio (300+50+300+800 ms), e a até 60 px/s ele pode se afastar ~105 px. O ponto (408, 392) fica a 329 px do repouso, dentro do alcance de um buraco negro que tenha andado ≥ 49 px na direção dele. |
| C33 | poço do buraco negro: na direção do centro, ≤ 48 px, nada além de 280, nunca passa do centro | unit ✔ | `grid-motion.test.ts:81` — `size <= 48`; `:87` — `now < before`; `:91` — `along >= 0`; `:59` — 0 além de 280 | PASS |
| C34 | verticais a até 280 px se curvam para o centro | e2e #45 ✓ | `e2e/hero-grid.spec.ts:221-222` — `pulled > 1`, `<= 48.5` | PASS |
| C35 | alfa 0 dentro do horizonte | e2e #46 ✓ | `e2e/hero-grid.spec.ts:231-232` — `distance < 47` → `alphaAt).toBe(0)` | PASS (só a posição de repouso) |
| C36 | movimento reduzido: duas leituras com 2 s e mouse varrendo são idênticas | e2e #87 ✓ | `e2e/reduced-motion.spec.ts:93` — `Buffer.from(after).equals(before)).toBe(true)` | PASS |
| C37 | malha só em `#hero`, `pointer-events: none`; ponto aberto na cena 3D; `h1` e CTA respondem a `elementFromPoint` | e2e #52 ✓ | `e2e/hero-grid.spec.ts:359-363` — `#hero` e `pointer-events none`; `:382` — `{scene:true,title:true,cta:true}` | PASS\*: o check diz "o ponto no meio da Hero", mas o teste usa (200, 450). O meio (720, 450) cai no `h1` (medido: x 272–1168, y 390–446). O hover no `logo` (critério 23) não é exercitado. |
| C38 | anel a ≤ 2 px do ponteiro após 100 ms, raio 120 ±1,5, `mist`, alfa ≤ 0,3 | e2e #65 ✓ | `e2e/lens.spec.ts:137-140` — centro `<= 2`, `|radius−120| <= 1.5`; `:143` — `alpha <= 0.3*255+1`; `:147-149` — distância a `mist` | PASS |
| C39 | 6–10 estrelas de 2–4 px de caixa; nenhuma tinta fora do raio | e2e #66 ✓ | `e2e/lens.spec.ts:164` — `outside.length).toBe(0)` (> 122 px); `:171-172` — 6..10; `:180` — `side <= 4` | PASS\*: o mínimo de 2 px (`STAR_BOX.min`, `:27`) é declarado e nunca asserido. O tamanho mínimo fica provado só no modelo (C40). |
| C40 | estrelas 2–3 px, linhas 1 px, deriva ≤ 10 px/s dentro do círculo | unit ✔ | `lens.test.ts:28` — `lineWidth <= 1`; `:31,33` — 6..10 e `2 <= size <= 3`; `:41-42` — `speed <= 10` e dentro do raio | PASS |
| C41 | dentro da lente, miolo apagado (< 0,3) e traço `mist`; fora, aceso | e2e #67 ✓ | `e2e/lens.spec.ts:231-238` — `share(inside, lum<0.3) > 0.9`, `share(outside, lum>0.6) > 0.95`; `:245` — `stroke > 50` | PASS\*: o traço é provado por luminância > 0,5, não pela cor `mist` nem pela largura de 1 px (o código usa `-webkit-text-stroke: 1px var(--color-mist)`, `app/globals.css:142`). "Apagam" vale para 90% dos pixels, não para todos. |
| C42 | nome acessível do `h1` = texto, uma vez; contorno fora, `aria-hidden` | e2e #1 ✓ | `e2e/a11y.spec.ts:17` — `aria-hidden 'true'`; `:24` — `toHaveAccessibleName(text)`; `:28` — `#hero h1 [data-lens]` count 0 | PASS |
| C43 | 300 ms após sair: canvas transparente e contorno com raio 0 | e2e #68 ✓ | `e2e/lens.spec.ts:258` — `isBlank).toBe(true)`; `:262` — `clipPath).toMatch(/^circle\(0px /)` | PASS |
| C44 | toque e caneta não abrem a lente | e2e #69 ✓ | `e2e/lens.spec.ts:268-280` — `pointerType` touch/pen; `isBlank).toBe(true)` | PASS |
| C45 | movimento reduzido: mouse não abre a lente | e2e #88 ✓ | `e2e/reduced-motion.spec.ts:101` — `isBlank).toBe(true)` | PASS |
| C46 | nenhum `HeroLight`/`lightDrift`/`light-drift` | `! grep -rnE "HeroLight\|lightDrift\|light-drift" components app lib e2e`, exit 0 | nenhum resultado | PASS |
| C47 | horizonte `ink` com 86–106 px | e2e #7 ✓ | `e2e/black-hole.spec.ts:91-94` — `|side − 96| <= 9.6` (largura e altura) | PASS |
| C48 | anel a até 8 px da borda, luminância > 0,5 fora da faixa do disco | e2e #8 ✓ | `e2e/black-hole.spec.ts:111,120-123` — `reach −1..8`; `brightest > 0.5` | PASS |
| C49 | disco: acende dentro do horizonte; 340–460 px; ≤ 30 px a 150 px | e2e #9 ✓ | `e2e/black-hole.spec.ts:143` — `isLit).toBe(true)`; `:145-146` — 340..460; `:152-154` — `<= 30` | PASS (o trecho aceso é medido só na metade central do horizonte, `:139-140`) |
| C50 | brilho logo acima e logo abaixo do horizonte, na coluna do centro | e2e #10 ✓ | `e2e/black-hole.spec.ts:174-179` — `peak(over) > 0.1`, `peak(under) > 0.1` | PASS |
| C51 | todo pixel aceso com azul ≥ vermelho e ≥ verde − 2 | e2e #11 ✓ | `e2e/black-hole.spec.ts:194-195` — `b >= r`, `b >= g−2`; `:197` — `lit > 2000` | PASS (o gradiente `mist`→`primary` do critério 28 não é coberto; ver Lacunas) |
| C52 | 96 px em 1440×900; encolhe como os ícones; 375×667 a ±10% | unit ✔, e2e #13 ✓ | `black-hole.test.ts:21` — `2*horizonRadius(1440,900) ≈ 96`; `:30-33` — `96*iconFit*(h/900)`; `e2e/black-hole.spec.ts:239-241` — `|width − expected| <= 10%` | PASS |
| C53 | velocidade entre 20 e 60 px/s, nunca para | unit ✔ | `black-hole-path.test.ts:57` — `wander.speed` 20..60; `:60-61` — corda `>= 19.4`, `<= 60` | PASS |
| C54 | trechos de 4–10 s; a direção muda entre trechos | unit ✔ | `black-hole-path.test.ts:80-81` — `since` 4..10 (±1 quadro); `:93` — `assert.notEqual(headings[i], headings[i-1])` | PARCIAL: comparar dois ângulos em ponto flutuante com `notEqual` não discrimina (qualquer ruído passa). A mudança de direção não fica provada. |
| C55 | nenhum quadro move mais de 4 px, nem com quadros longos | unit ✔ | `black-hole-path.test.ts:104,106` — `dt` 4–504 ms; `moved <= 4` | PASS |
| C56 | corpo inteiro a 10% dentro da Hero, em 1440×900 e 375×667 | unit ✔ | `black-hole-path.test.ts:120-123` — as quatro bordas com `MARGIN = 0.1` | PASS |
| C57 | cada carga sorteia um caminho novo; na página, ≥ 30 px em 2 s | unit ✔, e2e #14 ✓ | `black-hole-path.test.ts:142` — `> 20` entre sementes; `e2e/black-hole.spec.ts:252-254` — `>= 30`. O código sorteia com `Math.random` (`use-hero-field.ts:89`) | PASS |
| C58 | movimento reduzido: a ≤ 4 px de (50%, 32%) e parado em 2 s | e2e #89 ✓ | `e2e/reduced-motion.spec.ts:109-112` — `<= 4` de (720, 288); `:115-117` — `<= 1` | PASS |
| C59 | disco dá ≥ 1 volta a cada 20 s em todo raio; padrão muda em 1 s | unit ✔, e2e #15 ✓ | `black-hole.test.ts:41` — `diskTurnSeconds(r) <= 20`; `e2e/black-hole.spec.ts:304` — `least > 12` | PASS |
| C60 | metade do `logo` voltada para o buraco negro mais clara | e2e #12 ✓ | `e2e/black-hole.spec.ts:220-222` — `facing > away * 1.05` | PASS |
| C61 | cópia da Hero por cima de todo canvas: `elementFromPoint` e > 5% dos pixels | e2e #60 ✓, #96 ✓ | `e2e/hero.spec.ts:167` — `[true,true,true]`; `e2e/sections.spec.ts:60-63` — `paintedShare > 0.05` | PASS |
| C62 | brilhos: animação infinita, 30–45 s, primeiro quadro = último, ≤ 8vmax | e2e #2 ✓ | `e2e/backdrop.spec.ts:79-81` — duração 30k..45k, `Infinity`; `:86` — `<= 8*vmax`; `:88` — `values[0] == values.at(-1)` | PARCIAL: `:88` é tautológico. Com iterações infinitas, `currentTime = duration` cai no início da iteração seguinte, então sempre repete o primeiro valor. O caminho fechado só se vê no código (`app/globals.css:60-62`, `0%, 100%`). |
| C63 | opacidade com 8–12 s, ±0,1 em volta da atual | e2e #3 ✓ | `e2e/backdrop.spec.ts:101-107` — duração 8k..12k; `min ≈ base−0.1`, `max ≈ base+0.1` | PASS |
| C64 | cada ponto cintila 0,25–1, período 3–8 s; ≥ 5 períodos e atrasos distintos | e2e #4 ✓ | `e2e/backdrop.spec.ts:128-129` — `>= 5` distintos; `:136-141` — 3k..8k, `≈0.25`, `≈1` | PASS\*: "cada ponto" é medido em 6 pontos (`slice(0, 6)`, `:130`). Pelo código, todos os períodos ficam em [3, 8) (`parallax-field.tsx:71`). |
| C65 | anéis 0,95–1,05 em 12 s | e2e #5 ✓ | `e2e/backdrop.spec.ts:155,158-159` | PASS |
| C66 | formas do meio giram ±6° em 14 s e continuam flutuando | e2e #6 ✓ | `e2e/backdrop.spec.ts:178,184,187-192` | PASS |
| C67 | parallax 0,2×, 0,5× e 1,3× | e2e #83 ✓ | `e2e/parallax.spec.ts` (`test` na linha 33) — `|moved − speed*scrolled| <= 4` | PASS (prova anterior ao diff; serve como regressão) |
| C68 | movimento reduzido: fundo sem animação; parallax parado | e2e #91 ✓, #92 ✓ | `e2e/reduced-motion.spec.ts:166` — `moving).toEqual([])`; `:205-208` — `<= 1` | PASS |
| C69 | 18 cards com fundo `mist`/0,05, blur 16 px, borda 1 px `mist`/0,1, filete interno `mist`/0,2 | e2e #17 ✓ | `e2e/cards.spec.ts:42` — `toHaveLength(18)`; `:54-63` — os quatro valores | PASS (a contagem é 18 no total, não por seção) |
| C70 | brilho `steel` atrás do card: luminância ≥ 0,01 maior | e2e #18 ✓ | `e2e/cards.spec.ts:114-117` — `lit − dark >= 0.01` | PASS |
| C71 | fora da tela: WebGL e canvas 2D com 0 chamadas, em `#sobre` e em `#faq` | e2e #77 ✓ | `e2e/offscreen.spec.ts:139-144` — `{hero:0,grid:0,lens:0,notebook:0}` | PASS\*: nenhum teste mostra o contador da malha acima de 0 com a Hero na tela (sem controle positivo para `grid`/`lens`), e só `WebGL2RenderingContext` é instrumentado (`:52`) |
| C72 | 2 s fora: horizonte volta a ≤ 12 px | e2e #79 ✓ | `e2e/offscreen.spec.ts:175-177` — `<= 12` | PASS |
| C73 | nenhuma dependência nova | `git diff --exit-code c625ce9 -- package.json package-lock.json`, exit 0 | diff vazio | PASS |
| C74 | `hero-grid`, `hero-lens`, contorno e cópias com `aria-hidden`; cada `h1`/`h2` lido uma vez | e2e #1 ✓ | `e2e/a11y.spec.ts:15,17` — `count > 0` e `aria-hidden 'true'` para os quatro seletores; `:24` — nome acessível | PASS (o check é mais fraco que o critério 42; ver Lacunas, item 2) |
| C75 | tsc, lint, `npm test` e `test:e2e` passam | os quatro comandos | `npm run test:e2e`: **exit 1, 116 passed, 1 failed** | **FAIL** |

## `Swept` conferido no código

| Linha | Restrição citada | No código |
|---|---|---|
| failure modes: `logo` que não carrega, existing | `Suspense` sem fallback; malha, lente e buraco negro seguem | `hero-scene.tsx:26-30`: `BlackHole` fica fora do `<Suspense fallback={null}>`, que envolve só `GlassElements`. Malha e lente são canvas 2D fora da cena. Confere. |
| concurrency and ordering | a próxima rajada só é armada no fim da anterior | `glitch-text.tsx:84`: `if (last) arm()`; `lib/glitch.ts:93`: `requestBurst` recusa durante a rajada. Confere. |

## Política de testes e injeção de falhas

Não há `## Test policy` no checklist, e a injeção de falhas não faz parte do perfil `light`. Nenhum
dos dois rodou.

## Gate

- `npx tsc --noEmit`: exit 0, sem erros
- `npm run lint`: exit 0, sem problemas
- `npm test`: exit 0, 40 passed, 0 failed
- `npm run test:e2e`: **exit 1, 116 passed, 1 failed** (`e2e/hero-grid.spec.ts:334`, "the well fades within 800ms after the pointer leaves", 7,5 min)
- Nova execução isolada: `npx playwright test e2e/hero-grid.spec.ts -g "the well fades|stay straight|pulls the nearest|follows the pointer" --repeat-each 6`, com 24 passed. Isso confirma que a falha é intermitente, não determinística, mas um verde isolado não substitui a suíte vermelha em HEAD.

## Lacunas, por prioridade

1. **C32 e C75 em FAIL.** A suíte e2e completa sai vermelha em `a0ad62b`. O teste de C32 parte de
   uma premissa errada: supõe o buraco negro a ≤ 40 px do repouso, mas avança ~1,75 s de relógio a
   até 60 px/s. A mesma premissa (`HOLE_DRIFT`) aparece em C27, C29 e C31, que somam 0,6 s, 0,9 s e
   2,75 s de relógio. Os três passaram aqui, mas podem falhar do mesmo jeito.
2. **O critério 42 não é cumprido para o buraco negro, e nenhum check o cobre.** O critério manda
   deixar "o buraco negro" fora da árvore de acessibilidade. C74 lista só a malha, a lente, o
   contorno e as cópias do glitch. Medi no Chromium (CDP `Accessibility.getFullAXTree`): o canvas
   WebGL da Hero, onde o buraco negro é desenhado, aparece com papel `Canvas` e `ignored: false`, e
   nem ele nem seus dois `div` ancestrais têm `aria-hidden` (`hero.tsx:47-56`).
3. **C54 PARCIAL.** A mudança de direção é "provada" por `notEqual` entre floats, que não
   discrimina.
4. **C62 PARCIAL.** "Primeiro quadro igual ao último" tem uma asserção tautológica. Só a leitura do
   CSS sustenta a afirmação.
5. **C17 PARCIAL.** O teste prova 13 s; o check afirma 15 s.
6. **Partes de critérios sem check** (o check é mais fraco que o critério que cita):
   - critério 28: disco "`mist` no miolo, indo a `primary` na borda" (C51 prova só a ausência de
     tons quentes);
   - critério 25: estrelas e linhas "em `mist`" (nenhuma asserção de cor);
   - critério 26: traço "de 1 px em `mist`" (C41 usa luminância);
   - critério 31: luz "com a cor do disco";
   - critério 23: o hover no `logo` continua funcionando (C37 testa só `elementFromPoint` num ponto
     aberto);
   - critério 15: "sempre" (C22 mede só o repouso).
7. **Lacunas de precisão nos checks já provados:**
   - C26: 30° não fixado;
   - C6/C7: `0fr`/`1fr` não asseridos;
   - C39: mínimo de 2 px não asserido;
   - C8: "de imediato" sem prazo;
   - C64: 6 pontos de N;
   - C22: a exclusão cobre ~7 px do `h1`;
   - C37: a redação fala do "meio da Hero", que cai no `h1`;
   - C71: sem controle positivo para os contadores 2D.
