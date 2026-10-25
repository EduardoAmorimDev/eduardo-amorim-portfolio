# Landing page do portfólio — Verificação

**Verdict**: PASS
**Profile**: light (o `AGENTS.md` do repositório não declara perfil)
**Diff range**: c359f26..17184f3 (`git rev-parse HEAD` = `17184f3e812c137d7637ad8dd2c567b4e2f5bdcf`)
**Round**: 2 - scoped (rodada 1 em `fcf3d04`: FAIL, 49/51; correção `fcf3d04..17184f3`, 6 commits: `38d74ff`, `ec0d90c`, `1a73f2e`, `f0660ca`, `d8776b9`, `17184f3`)
**Verifier**: sub-agente independente (author != verifier), somente leitura

`git status --porcelain` no início e no fim: `?? .checks/` e `?? .tasks/`. Nada mudou, exceto
este arquivo dentro de `.checks/`. O `next dev` do usuário (PID 16312, porta 3000) não foi tocado.
A porta 3100 foi liberada pelo próprio Playwright ao terminar.

Resumo: 52 de 52 checks provados (C1–C52). Todas as provas rodaram verdes em `17184f3`. Os
achados 1–5 e 7 da rodada 1 estão resolvidos. Do achado 6, os blocos de mais de 5 linhas foram
resolvidos e o conflito do JSDoc segue escalado ao usuário (nota). O achado 8 continua como notas
menores, sem mudança.

## Escopo da rodada 2

- Diff da correção (`git diff fcf3d04..HEAD --stat`): 9 arquivos, +191 −110.
- Arquivos de teste com mudança de comportamento:
  - `e2e/glitch.spec.ts`: C24 nos dois temas.
  - `e2e/hero-grid.spec.ts`: C26 nos dois temas; C31 com alvo exato.
  - `e2e/hero-light.spec.ts`: C52 novo.
  - `lib/glitch.test.ts`: C22 com literais.
- `e2e/sections.spec.ts`: só o comentário de `:21-23` mudou; os números de linha não se moveram.
- Fontes de produção: `glitch-text.tsx`, `grid-motion.ts`, `parallax-field.tsx` e
  `media-preferences.ts`. Só comentários JSDoc mudaram (conferido no diff); nenhuma linha
  executável mudou.
- Passo 3 refeito para:
  - checks renegociados: C31, C32, C33, C34 e C52;
  - checks pedidos: C22, C24 e C26;
  - todo check cujo arquivo de teste a correção tocou: C18–C25 (`glitch.spec.ts`), C26–C31
    (`hero-grid.spec.ts`), C32–C34, C37 e C52 (`hero-light.spec.ts`), C22 (`glitch.test.ts`).
    As citações desses arquivos foram atualizadas.
- O resto vem marcado `carried from fcf3d04`. As provas, porém, rodaram de novo em `17184f3`.

## Passos que não rodam no perfil `light`

- Passo 1 (fontes binding): não roda. O checklist não marca nenhuma fonte como binding (sem Figma). Os checks renegociados também não têm fonte binding para comparar.
- Recomputação do join `Coverage`: não roda no `light`. Mesmo assim, a linha "temas × superfície" foi conferida contra o achado 4 (ver Achados da rodada 1).
- Veredito das linhas de `Test policy`: não roda; o checklist não tem essa seção e o perfil é `light`.
- Injeção de falhas (passo 4): não roda no `light`.

## Provas executadas em `17184f3`

| Alvo | Comando | Resultado |
|---|---|---|
| e2e (suíte inteira, uma invocação) | `npx playwright test --reporter=list` | 52 passed (2.7 min), exit 0 |
| unit (4 arquivos nomeados) | `node --test --test-reporter=spec lib/parallax.test.ts lib/glitch.test.ts components/organisms/laptop-hero/grid-motion.test.ts components/organisms/laptop-hero/glass-motion.test.ts` | 40/40 pass, exit 0 (+1 em relação à rodada 1: `the rate limit is 3 changes per 1000 ms`) |
| unit (suíte completa) | `npm test` | 46/46 pass, exit 0 |
| C35 | `git diff c359f26 -- components/organisms/laptop-hero/laptop.tsx \| grep -E '^[-+].*(STRAIGHTEN\|OPEN\|POWER_ON) = '; test $? -eq 1` | grep sem resultado, exit 0 |
| C36 | `git diff --quiet c359f26 -- components/organisms/laptop-hero/glass-motion.ts components/organisms/laptop-hero/glass-motion.test.ts` | exit 0 |
| C50 | `npx tsc --noEmit` · `npm run lint` · `npm run build` | exit 0 nos três (build: "Compiled successfully") |

Títulos `-g`: os 48 títulos e2e do checklist casam com testes da saída. Nenhum título fica sem
teste e nenhum teste fica órfão. 52 testes = 48 títulos + 4 duplicações por tema:

| Check | Execuções |
|---|---|
| C24 | `light backdrop ›` e `dark backdrop ›`, `glitch.spec.ts:188` |
| C26 | `light grid ›` e `dark grid ›`, `hero-grid.spec.ts:81` |
| C40 | `dark scene ›` e `light scene ›`, `theme.spec.ts:201` |
| C41 | `dark scene ›` e `light scene ›`, `theme.spec.ts:206` |

C52 aparece como `light scheme › light scheme shows a primary-tinted halo against white`
(`hero-light.spec.ts:156`). C31 aparece como `grid never takes the pointer from the 3D canvas`
(`hero-grid.spec.ts:188`).

## Checks

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | `<main>` com 9 `<section>` na ordem dada | e2e ✓ (`sections.spec.ts:70`) | `e2e/sections.spec.ts:75` — `expect(ids).toEqual(SECTION_IDS)` (lista literal em `:5-15`) | PASS — carried from fcf3d04 (linhas inalteradas) |
| C2 | cada seção exceto hero tem `<h2>` e parágrafo lorem | e2e ✓ | `sections.spec.ts:82` — `toHaveCount(1)`; `:84-87` — contagem lorem `toBeGreaterThan(0)` | PASS — carried from fcf3d04 |
| C3 | 1440×900, rolagem 0: h1, subtítulo e CTA inteiros na viewport e sobre o canvas | e2e ✓ | `sections.spec.ts:31` `scrollY` `toBe(0)`; `:59` `inside(viewport)` `toBe(true)`; `:62` `inside(canvas)` `toBe(true)`; `:63-66` `paintedShare > 0.05`; viewport `:92` | PASS — carried from fcf3d04 (o comentário de `:21-23` agora é verdadeiro, ver Achado 7) |
| C4 | o mesmo em 375×667 | e2e ✓ | mesmas asserções de `:31-66`; viewport `:97` | PASS — carried from fcf3d04 |
| C5 | CTA do hero rola até `#contato` | e2e ✓ | `sections.spec.ts:104-113` — `expect.poll(top >= 0 && top < innerHeight).toBe(true)` | PASS — carried from fcf3d04 |
| C6 | `#contato`: h2, parágrafo lorem e botão CTA | e2e ✓ | `sections.spec.ts:119-121` — três `toHaveCount(1)` | PASS — carried from fcf3d04 |
| C7 | 6 logos | e2e ✓ | `sections.spec.ts:128` — `expect(logos).toHaveCount(6)` | PASS — carried from fcf3d04 |
| C8 | foto e 2 parágrafos lorem | e2e ✓ | `sections.spec.ts:139-141` | PASS — carried from fcf3d04 |
| C9 | 6 cards com ícone, título e texto | e2e ✓ | `sections.spec.ts:149`, `:151-153` | PASS — carried from fcf3d04 |
| C10 | 3 cases com imagem, título, texto e 3 tags | e2e ✓ | `sections.spec.ts:162`, `:164-170` | PASS — carried from fcf3d04 |
| C11 | 6 etapas `01`–`06`, de Discovery a Deploy | e2e ✓ | `sections.spec.ts:179`, `:180-187`, `:189-190` | PASS — carried from fcf3d04 |
| C12 | 3 depoimentos com texto, nome, cargo e avatar | e2e ✓ | `sections.spec.ts:201`, `:203-208` | PASS — carried from fcf3d04 |
| C13 | 5 perguntas fechadas | e2e ✓ | `sections.spec.ts:215`, `:217`, `:219` | PASS — carried from fcf3d04 |
| C14 | abre e fecha | e2e ✓ | `sections.spec.ts:229` `toBeVisible()`; `:232` `toBeHidden()` | PASS — carried from fcf3d04 |
| C15 | 0,2× / 0,5× / 1,3× ±4 px | unit ✓; e2e ✓ | `parallax.spec.ts:41`, `:48-51` (`SPEEDS` em `:10`); `lib/parallax.test.ts:15` | PASS — carried from fcf3d04 |
| C16 | barras borradas perto das bordas | e2e ✓ | `parallax.spec.ts:90`, `:93-98` | PASS — carried from fcf3d04 |
| C17 | octaedro e cubo arredondado com brilho | e2e ✓ | `parallax.spec.ts:109`, `:114-117` | PASS — carried from fcf3d04 (nota do Achado 8) |
| C18 | entrada na viewport: uma rajada ≤ 600 ms | e2e ✓ (`glitch.spec.ts:62`) | `e2e/glitch.spec.ts:42` — `expect(bursts).toHaveLength(1)`; `:46` — `burst.end - burst.start` `toBeLessThanOrEqual(MAX_BURST_MS)` | PASS — verified at 17184f3 (linhas inalteradas; o diff do arquivo começa em `:181`) |
| C19 | hover: uma rajada ≤ 600 ms | e2e ✓ (`:77`) | mesmas asserções de `glitch.spec.ts:42`, `:46` | PASS — verified at 17184f3 |
| C20 | sem repetição por 6 s | e2e ✓ (`:89`) | `glitch.spec.ts:97` — `expect(await log.jsonValue()).toEqual([])`; `:98` — `data-glitch` `'off'` | PASS — verified at 17184f3 |
| C21 | escuro: cópias `primary` e `mist`, ≤ 4 px na horizontal, `clip-path` ≠ none | e2e ✓ (`:104`, `dark scheme ›`) | `glitch.spec.ts:102` `colorScheme: 'dark'`; `:146` `toHaveLength(2)`; `:148` cores = `{primary, mist}`; `:154` `clipPath` `not.toBe('none')`; `:158-159` `0 < x <= MAX_SHIFT_PX` | PASS — verified at 17184f3 |
| C22 | ≤ 3 mudanças em qualquer janela de 1 s | unit `lib/glitch.test.ts` ✓ (inclui o novo `the rate limit is 3 changes per 1000 ms`) | `lib/glitch.test.ts:16-17` — `MAX_CHANGES = 3`, `WINDOW_MS = 1000`; `:59-60` — `assert.equal(GLITCH.maxChangesPerWindow, MAX_CHANGES)`, `assert.equal(GLITCH.windowMs, WINDOW_MS)`; `:130` e `:139` — `maxChangesInAnyWindow(changes) <= MAX_CHANGES` (janela `WINDOW_MS`, `:39`) | PASS — verified at 17184f3. Os literais 3 e 1000 agora estão no teste; mudar a constante do módulo derruba `:59-60`. Só nível unit, como o checklist define |
| C23 | cópias `aria-hidden`, nome acessível único | e2e ✓ (`:168`) | `glitch.spec.ts:171` — 9 títulos; `:178` — `toHaveAttribute('aria-hidden', 'true')`; `:179` — `toHaveAccessibleName(text)` | PASS — verified at 17184f3 |
| C24 | fora do hero: malha de 1 px, células de 80 px, alpha ≤ 0,06 | e2e ✓✓ (`light backdrop ›` e `dark backdrop ›`, `:188`) | `glitch.spec.ts:184-186` — `for (const scheme of ['light', 'dark'])` + `test.use({ colorScheme: scheme })`; `:203` `gridTop >= heroBottom - 1`; `:218` `toMatch(/^80px( 80px)?$/)`; `:227` `toMatch(/ 1px, rgba\(0, 0, 0, 0\) 1px\)$/)`; `:235-236` `alpha * style.opacity` `> 0` e `<= 0.06` | PASS — verified at 17184f3 (as mesmas asserções nos dois temas) |
| C25 | dois brilhos radiais, `primary` e `steel` | e2e ✓ (`:243`) | `glitch.spec.ts:246` `toHaveCount(2)`; `:261-264` — por cor: `toBeDefined()`, `/^radial-gradient\(/`, `blur > 0` | PASS — verified at 17184f3 (linhas atualizadas, eram `:236`, `:251-254`) |
| C26 | ponteiro fora: linhas retas a cada 48 px | unit `grid-motion.test.ts` ✓; e2e ✓✓ (`light grid ›` e `dark grid ›`, `:81`) | `hero-grid.spec.ts:77-79` — loop `['light', 'dark']` + `test.use({ colorScheme: scheme })`; `:94` `lines.length > 2`; `:96-99` — diferença entre linhas `toBeCloseTo(SPACING, 2)`, `SPACING = 48` (`:16`); `:102-104` `maxShift(line) <= STILL` (0,05, `:25`); unit `grid-motion.test.ts:23` (`GRID.spacing === 48`), `:27`, `:38` | PASS — verified at 17184f3 (e2e); unit carried from fcf3d04 (arquivo de teste intocado) |
| C27 | linhas a ≤ 160 px deslocam > 0 e ≤ 12 px | unit ✓; e2e ✓ (`:109`) | `hero-grid.spec.ts:120` `near` `toHaveLength(12)`; `:123` `shift > STILL`; `:124-126` `shift <= MAX_SHIFT + SLACK` (12 + 0,5, `:18`, `:22`); unit `grid-motion.test.ts:43-44,48-49` | PASS — verified at 17184f3 (folga de 0,5 px no e2e, Achado 8) |
| C28 | linhas a > 160 px seguem retas | e2e ✓ (`:130`) | `hero-grid.spec.ts:135-138` — curvatura perto `> 1`; `:140` `far.length > 0`; `:141-142` `maxShift(line) <= STILL` | PASS — verified at 17184f3 |
| C29 | 800 ms após parar, tudo reto | unit ✓; e2e ✓ (`:145`) | `hero-grid.spec.ts:152` curvado antes (`> 1`); `:154` `waitSince(page, 'lastMove', SETTLE_MS)` (800, `:19`); `:155-156` `<= STILL`; unit `grid-motion.test.ts:79`, `:89` | PASS — verified at 17184f3 |
| C30 | 800 ms após sair, tudo reto | e2e ✓ (`:159`) | `hero-grid.spec.ts:179` curvado antes; `:183` `waitSince(page, 'leftAt', SETTLE_MS)`; `:184-185` `<= STILL` | PASS — verified at 17184f3 |
| C31 | (renegociado) malha com `pointer-events: none`; o alvo no centro do hero é exatamente `canvas.parentElement` do canvas WebGL do R3F, não a malha | e2e ✓ (`:188`) | `hero-grid.spec.ts:191` — `expect(grid).toHaveCSS('pointer-events', 'none')`; `:198-201` — `elementFromPoint` no centro do hero (limitado ao meio da viewport); `:202-205` — `holder = webgl[0]?.parentElement`, com `webgl` = canvases da cena com contexto `webgl2`; `:215` — `expect(hit.webgl).toBe(1)`; `:216` — `expect(hit.onGrid).toBe(false)`; `:217` — `expect(hit.isHolder).toBe(true)`, com `isHolder: !!holder && target === holder` (`:210`) | PASS — verified at 17184f3. A igualdade estrita resolve o Achado 1: um overlay `<Html>` dentro da cena não passa mais |
| C32 | (renegociado) escuro: pixel mais claro da metade de cima ≥ 0,9, acima do laptop; a 40 px, entre 0,15 e 0,9 | e2e ✓ (`hero-light.spec.ts:77`) | `hero-light.spec.ts:29` — `test.use({ colorScheme: 'dark' })` no nível do arquivo; `:86` — `core.luminance` `toBeGreaterThanOrEqual(CORE_MIN)` (0,9, `:16`); `:87-90` — cada pixel de pico `point.y` `toBeLessThan(laptopTop)`; `:92-102` — 16 amostras a `HALO.distance` 40 px (`:17`), `halo` `toBeGreaterThan(0.15)` e `toBeLessThan(0.9)` | PASS — verified at 17184f3 |
| C33 | (renegociado) escuro: piso sob a luz mais claro que o lado oposto | e2e ✓ (`:106`) | `hero-light.spec.ts:29` escuro; `:123-126` — `Math.abs(light.x - middle)` `toBeGreaterThan(100)`; `:127-129` — `meanLuminance(below)` `toBeGreaterThan(meanLuminance(far))` | PASS — verified at 17184f3 |
| C34 | (renegociado) escuro: lado do laptop voltado para a luz mais claro | e2e ✓ (`:132`) | `hero-light.spec.ts:29` escuro; `:148-150` — `meanLuminance(facing)` `toBeGreaterThan(meanLuminance(opposite))` | PASS — verified at 17184f3 |
| C35 | `STRAIGHTEN`/`OPEN`/`POWER_ON` sem mudança | comando ✓ | grep vazio sobre o diff de `laptop.tsx`; `test $? -eq 1` exit 0 | PASS — verified at 17184f3 |
| C36 | `glass-motion.ts` e o teste dele sem mudança, e os testes passam | `git diff --quiet` exit 0; `glass-motion.test.ts` ✓ | diff vazio; testes `✔` na saída spec | PASS — verified at 17184f3 |
| C37 | rolar o hero até o fim: iframe com `opacity` ≥ 0,9 | e2e ✓ (`:192`) | `hero-light.spec.ts:195-203` — `expect.poll(… Number(getComputedStyle(frame).opacity))` `.toBeGreaterThanOrEqual(0.9)` | PASS — verified at 17184f3 (linhas atualizadas, eram `:132-140`) |
| C38 | escuro: fundo `rgb(16, 17, 19)`, texto `rgb(242, 247, 255)` | e2e ✓ (`theme.spec.ts:151`) | `theme.spec.ts:57-58`; literais em `:17-18` | PASS — carried from fcf3d04 |
| C39 | claro: fundo branco, texto `ink` | e2e ✓ (`:160`) | `theme.spec.ts:57-58` com `THEMES.light`, `:19-22` | PASS — carried from fcf3d04 |
| C40 | céu = fundo do tema, ±3 | e2e ✓✓ (`:201`) | `theme.spec.ts:71-75` — `channelGap(...)` `toBeLessThanOrEqual(3)` | PASS — carried from fcf3d04 |
| C41 | névoa e piso no fundo do tema | e2e ✓✓ (`:206`) | `theme.spec.ts:95-98`, `:106-110`, `:120-123` | PASS — carried from fcf3d04 |
| C42 | claro: cópias `primary` e `steel` | e2e ✓ (`:167`) | `theme.spec.ts:174`, `:176-177` | PASS — carried from fcf3d04 |
| C43 | claro: malhas em `steel` | e2e ✓ (`:181`) | `theme.spec.ts:184`, `:192-193` | PASS — carried from fcf3d04 |
| C44 | troca ao vivo repinta as seções | e2e ✓ (`:228`) | `theme.spec.ts:231-237` | PASS — carried from fcf3d04 |
| C45 | troca ao vivo repinta a cena 3D | e2e ✓ (`:240`) | `theme.spec.ts:252`, `:257`, `:266-269`, `:273` | PASS — carried from fcf3d04 |
| C46 | movimento reduzido: sem glitch | e2e ✓ | `reduced-motion.spec.ts:71`, `:73` | PASS — carried from fcf3d04 |
| C47 | movimento reduzido: malha reta | e2e ✓ | `reduced-motion.spec.ts:89-92` | PASS — carried from fcf3d04 |
| C48 | movimento reduzido: parallax parado | e2e ✓ | `reduced-motion.spec.ts:123-134` | PASS — carried from fcf3d04 |
| C49 | movimento reduzido: laptop liga | e2e ✓ | `reduced-motion.spec.ts:143-151` | PASS — carried from fcf3d04 |
| C50 | tipos, lint e build sem erros | `tsc` · `lint` · `build` ✓ | exit 0 nos três em `17184f3` | PASS — verified at 17184f3 |
| C51 | nenhuma requisição e2e sai de localhost | e2e ✓ (`fixtures.spec.ts:6`) | `e2e/fixtures.spec.ts:24`, `:25`, `:27` | PASS — carried from fcf3d04 |
| C52 | (novo) claro: média de (azul − vermelho) ≥ 20 no anel de 40 px em volta do centro da luz; ≤ 3 no céu longe da luz e dos ícones | e2e ✓ (`hero-light.spec.ts:156`, `light scheme ›`) | `hero-light.spec.ts:154` — `test.use({ colorScheme: 'light' })`; `:166-167` — medição após `emulateMedia({ colorScheme: 'light' })` + `gotoHero`; `:175-177` — `meanLuminance(pixels, SKY)` `toBeGreaterThan(WHITE_SKY)` (0,95); `:178-184` — 32 amostras a `TINT.ring` 40 px (`:21`); `:185` — `meanTint(pixels, ring)` `toBeGreaterThanOrEqual(TINT.min)` (20); `:186-188` — `meanTint(pixels, boxPoints(SKY))` `toBeLessThanOrEqual(TINT.skyMax)` (3); `meanTint` (`:60-67`) = média de `b - r` em 0–255 via `pixelAt` (arredonda as coordenadas, `page-helpers.ts:124`) | PASS — verified at 17184f3 (notas N1 e N2) |

## Achados da rodada 1 — estado

| # | Achado | Estado em `17184f3` |
|---|---|---|
| 1 | C31 aceitava qualquer descendente da cena | **Resolvido.** O claim foi renegociado pelo usuário. A asserção virou `target === webgl[0].parentElement` (`hero-grid.spec.ts:205`, `:209`, `:217`) e exige exatamente um canvas WebGL (`:215`) |
| 2 | C32 provado só no escuro, sem nomear o tema | **Resolvido.** C32–C34 foram renegociados para o tema escuro (checklist, S3). O tema claro ganhou C52, que roda e passa |
| 3 | C33–C34 medidos só no escuro | **Resolvido** pela mesma renegociação (`hero-light.spec.ts:29`) |
| 4 | A linha `Coverage` dizia "dark C24 + C26", mas os dois rodavam no claro | **Resolvido.** C24 (`glitch.spec.ts:184-186`) e C26 (`hero-grid.spec.ts:77-79`) rodam em `light` e `dark`, com o mesmo corpo e as mesmas asserções. A saída mostra 4 execuções verdes (#7, #8, #10, #11) |
| 5 | C22 comparava com constantes do próprio módulo | **Resolvido.** Os literais estão em `lib/glitch.test.ts:16-17`. `:59-60` prendem `GLITCH.maxChangesPerWindow`/`windowMs` a 3/1000, e as asserções de janela usam `MAX_CHANGES`/`WINDOW_MS` (`:39`, `:64`, `:130`, `:139`). Continua só nível unit, como o checklist define |
| 6 | Cinco blocos de comentário com mais de 5 linhas | **Resolvido** para o limite de linhas: os cinco blocos têm 5 linhas, contando os marcadores. `glitch-text.tsx:26-30`, `grid-motion.ts:40-44` e `:55-59`, `parallax-field.tsx:131-135`, `media-preferences.ts:25-29`. O JSDoc sem `why:`/`hazard:`/`invariant:` é o conflito já escalado ao usuário (nota N3) |
| 7 | Comentário `hazard:` falso em `e2e/sections.spec.ts:21-23` | **Resolvido.** Agora é `why:` e diz que a cena segue o tema (ink no escuro, branco no claro), o que C40/C41 provam. Diz também que o check fixa o escuro para não depender do padrão do navegador, o que bate com `:25` |
| 8 | Lacunas menores de amostragem (C17–C21, C27 com folga de 0,5 px, C32 metade da viewport) | Sem mudança; carried from fcf3d04, como notas sem peso de FAIL |

## Comentários adicionados em `fcf3d04..17184f3` (constituição XIII)

Todos os comentários de linha adicionados estão em inglês, têm ≤ 5 linhas e abrem com `why:` ou
`invariant:`:

- `lib/glitch.test.ts:14-15`
- `e2e/hero-light.spec.ts:22-23`, `:159-160` e `:169`
- `e2e/hero-grid.spec.ts:85-86` (movido) e `:213-214`
- `e2e/glitch.spec.ts:215` e `:226` (movidos)
- `e2e/sections.spec.ts:21-23`

Nenhuma falha.

## Notas (sem peso de FAIL)

- **N1 — C52 localiza a luz no tema escuro.** `hero-light.spec.ts:161-164` acha o centro da luz
  pelo pixel mais claro no escuro e mede o anel no claro. A premissa, explicada em `:159-160`, é
  que a cena projeta a luz no mesmo ponto nos dois temas. Ela é razoável, porque o tema muda cores
  e não geometria, mas não é afirmada pelo teste.
- **N2 — o "céu longe da luz e dos ícones" é uma caixa fixa.** `SKY` (`hero-light.spec.ts:24`,
  x 620–900, y 20–260) foi escolhida para 1440×900. A guarda é a própria asserção: `:175-177`
  exige céu branco (> 0,95), e um ícone colorido dentro da caixa empurraria a média de `b - r`
  acima de 3.
- **N3 — JSDoc (conflito já escalado pelo usuário).** O diff da correção adiciona ou reescreve
  blocos `/** */` que não abrem com `why:`/`hazard:`/`invariant:`:
  - `e2e/hero-light.spec.ts:59` e `:69`;
  - as cinco reescritas do Achado 6: `glitch-text.tsx:26`, `grid-motion.ts:40` e `:55`,
    `parallax-field.tsx:131`, `media-preferences.ts:25`.

  Fica listado como nota, não como falha.

## Gate

- `npx playwright test --reporter=list` — 52 passed, 0 failed (exit 0)
- `npm test` — 46 passed, 0 failed
- `node --test` nos 4 arquivos nomeados — 40 passed, 0 failed
- C35 / C36 — exit 0
- `npx tsc --noEmit` · `npm run lint` · `npm run build` — exit 0

Veredito PASS: 52/52 checks provados em `17184f3`. Cada check tem `file:line` e uma asserção que
comprova o claim, e todo título `-g` casa com um teste que rodou e passou.
