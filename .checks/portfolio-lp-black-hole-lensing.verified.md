# Landing page do portfólio — lente gravitacional real do buraco negro sobre a malha · Verificação

**Verdict**: PASS
**Profile**: `light` (o `AGENTS.md` do repositório não declara perfil). Rodaram: o passo 2 (todas
as provas, em `e4ec322`), o passo 3 (cada asserção em `file:line`, mais a releitura dos `Swept`
em `existing`) e o passo 5 (este relatório). Não rodaram por exigência do perfil: o passo 1
(checklist contra fontes vinculantes, só em `ui`), o recálculo do `Coverage`, os veredictos de
`Test policy` e a injeção de falhas (só em `standard` e `ui`).
**Diff range**: `5bb2888..e4ec322`
**Round**: 1 - full
**Verifier**: sub-agente independente (autor != verificador)

## Resumo

- 24 de 24 checks provados em `e4ec322`. Cada prova nomeada existe, rodou e passou, uma a uma na
  saída: 7 testes de unidade, 16 testes e2e numa invocação só, e o `git diff` do C24.
- Nenhuma reexecução foi necessária: nenhum teste falhou por tempo nem por navegador fechado.
- Os checks de comportamento novo (C1–C12, C15, C16, C20) caem em testes que este diff criou:
  `deflection.test.ts` e `e2e/deflection.spec.ts`, ambos novos. Os checks de regra herdada (C13,
  C14, C17–C19, C21–C23) caem em testes anteriores. O diff só tocou neles a chamada de
  `showSceneOnly` e um limite de tempo. Como esses checks afirmam que algo "continua", isso basta.
- As ressalvas abaixo não derrubam nenhum check. São fraquezas de precisão: em alguns testes, o
  valor esperado não pode ser lido na própria asserção.

## Fontes vinculantes

Nenhuma fonte está marcada como vinculante para uma interface. Em `light`, o passo 1 não roda.

## Checks · verified at `e4ec322`

Provas:

- unidade: `node --test components/organisms/hero/deflection.test.ts`, exit 0, 7/7;
- e2e: uma invocação, `npx playwright test e2e/deflection.spec.ts e2e/hero-grid.spec.ts
  e2e/hero.spec.ts e2e/black-hole.spec.ts e2e/offscreen.spec.ts -g "<alternância dos 16 nomes>"`,
  exit 0, 16/16;
- C24: `git diff --exit-code 5bb2888 -- package.json package-lock.json`, exit 0.

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | α(b) exata: 0,00200 / 0,0203 / 0,2361 / 1,719 / 6,51 rad, ±1% | unidade, ✔ "the deflection is Schwarzschild's exact integral" | `components/organisms/hero/deflection.test.ts:70` - `near(actual, angle, angle * EXACT_SLACK)`, com a tabela literal em `:15-21` e `EXACT_SLACK = 0.01` em `:22` | PASS |
| C2 | 2/b em b = 10⁴; −ln(b/b_c − 1) − 0,4002 em b_c·1,0001; ±0,5% | unidade, ✔ "the deflection meets the weak and strong field limits" | `deflection.test.ts:80` - `near(weak, 2 / far, (2 / far) * LIMIT_SLACK)`; `:84-85` - `near(actual, strong, strong * LIMIT_SLACK)`, com `STRONG_FIELD = log(216(7 − 4√3)) − π` (≈ −0,4002) em `:25` e `LIMIT_SLACK = 0.005` | PASS |
| C3 | `Infinity` em b_c e em 2 | unidade, ✔ "a ray at or inside the critical impact is captured" | `deflection.test.ts:92-93` - `assert.equal(deflection(CRITICAL_IMPACT), Infinity)` e `assert.equal(deflection(2), Infinity)` | PASS |
| C4 | fonte branca: nada dentro de 0,97 raio muda mais que 6 níveis | e2e, ✓ `deflection.spec.ts:320` | `e2e/deflection.spec.ts:332-334` - `expect(worst).toBeLessThanOrEqual(INSIDE_LEVELS)`, com `INSIDE_SHARE = 0.97` e `INSIDE_LEVELS = 6` em `:27-28`. Ressalva R4 | PASS |
| C5 | θ₊ = 238/298/530/737 px, ±4, horizonte de 96 | unidade, ✔ "at rest a point appears farther out, on its own side" | `deflection.test.ts:100` - `near(outer, image, IMAGE_SLACK_PX)`, tabela literal em `:28-33`, `HORIZON_PX = 96` em `:26`, `REST_LIFT = 0.5` em `:27` | PASS |
| C6 | na tela, círculo de raio d aparece a θ₊(d) ±4 (para baixo em 96/192/476; diagonal em 700) | e2e, ✓ `deflection.spec.ts:337` | `deflection.spec.ts:367-370` - `expect(Math.abs(found - expected)).toBeLessThanOrEqual(IMAGE_SLACK_PX)`; `expected = outerImage(distance / hole.radius, bend) * hole.radius` (`:357`); as direções estão em `:345-350`. Ressalva R2 | PASS |
| C7 | θ₋ = 160/139/111 px, ±4 | unidade, ✔ "at rest a point also appears mirrored inside the Einstein ring" | `deflection.test.ts:110` - `near(inner, image, IMAGE_SLACK_PX)`, tabela literal em `:34-38` | PASS |
| C8 | o mesmo círculo também a θ₋(d) do lado oposto, ±4, para 96/192/476 | e2e, ✓ `deflection.spec.ts:374` | `deflection.spec.ts:407-410` - `expect(Math.abs(found - expected)).toBeLessThanOrEqual(IMAGE_SLACK_PX)`; `expected = innerImage(...) * hole.radius` (`:396-397`); faixas de 8/12/40 px e direções em `:384-388`. Ressalvas R2 e R3 | PASS |
| C9 | anel 1,0/1,61/2,0/2,25/2,42 raios nas subidas 0…1, ±3% | unidade, ✔ "the Einstein ring follows the lift as a thin lens does" | `deflection.test.ts:120` - `near(actual, radius, radius * RING_SLACK)`, tabela literal em `:40-46`, `RING_SLACK = 0.03` | PASS |
| C10 | em movimento: 2 raios ±6 px no início; θ₊ de K(1) ±4% aos 6 s | e2e, ✓ `deflection.spec.ts:502` | `deflection.spec.ts:517-520` - `Math.abs(low.circle.radius - CIRCLE_RADII * low.hole.radius) <= ON_GRID_SLACK_PX` (2 e 6 literais em `:62` e `:36`); `:525-528` - `Math.abs(high.circle.radius - expected) / expected <= RISEN_SLACK` (0,04), com `expected = outerImage(2, bendAt(1)) * radius`. Ressalva R5 | PASS |
| C11 | θ₊ − d cai a cada px de 1 a 900; 142/106/54/37 ±4 | unidade, ✔ "the shift falls off smoothly with distance, with no edge" | `deflection.test.ts:130` - `near(actual, shift, IMAGE_SLACK_PX)` (tabela literal em `:48-53`); `:137` - `assert.ok(shift < previous)` para `distance` de 1 a `FARTHEST_PX = 900` | PASS |
| C12 | opacidade 0,5; ponto longe com luminância relativa entre 0,18 e 0,26 | e2e, ✓ `deflection.spec.ts:414` | `deflection.spec.ts:421` - `expect(opacity).toBe(GRID_OPACITY)` (0,5); `:428-429` - luminância `>= HALF_WAY.min` e `<= HALF_WAY.max` ({0.18, 0.26} em `:30`); `:422-425` exige o ponto a mais de 5 raios do buraco negro. `FAR_POINT` (100, 800) fica fora de `LOGO_REGION` por construção, sem asserção | PASS |
| C13 | horizontal pelo centro desce 60 a 120 px na subida 0,5 | e2e, ✓ `hero-grid.spec.ts:430` | `e2e/hero-grid.spec.ts:465-466` - `nearest.sink` `>= HOLE_SINK.min` e `<= HOLE_SINK.max`, `HOLE_SINK = { min: 60, max: 120 }` em `:39`. Lê o contexto 2D da fonte, que fica sem lente | PASS |
| C14 | o poço continua enfraquecendo com a subida | e2e, ✓ `hero-grid.spec.ts:702` (2,1 min) | `hero-grid.spec.ts:755-758` - `expect(low / high).toBeGreaterThanOrEqual(RISEN_RATIO)`, `RISEN_RATIO = 1.5` em `:45`. Ressalva R6 | PASS |
| C15 | antes do 1º quadro: visível, 0,5; depois `hidden` e a malha pela lente | e2e, ✓ `deflection.spec.ts:475` | `deflection.spec.ts:486-489` - `toEqual({ visibility: 'visible', opacity: GRID_OPACITY })` com o relógio em 0; `:491` - `.toBe('hidden')` após 1500 ms; `:495-499` - luminância (cheia − vazia) no ponto longe `> HALF_WAY.min` | PASS |
| C16 | `logo` onde o layout o projeta (0,62 / 0,74 a z = 0), ±15 px | e2e, ✓ `deflection.spec.ts:432` | `deflection.spec.ts:468-471` - `Math.hypot(seen − expected) <= LOGO_SLACK_PX` (15, `:31`), com a âncora 0,62/0,74 literal em `:458-462` | PASS |
| C17 | o texto continua por cima da cena | e2e, ✓ `hero.spec.ts:229` | `e2e/hero.spec.ts:243` - `expect(hits).toEqual([true, true, true])` (`elementFromPoint` em h1, p, a). Teste anterior, não tocado | PASS |
| C18 | anel de fótons fino, claro, colado ao horizonte | e2e, ✓ `black-hole.spec.ts:172` | `e2e/black-hole.spec.ts:196` - `expect(at(peak)).toBeGreaterThan(RING_MIN)` (0,5); `:210-212` - `outer - inner <= RING_THIN_PX * grown` (4). Teste anterior; mudou só o helper `showSceneOnly` (Ressalva R7) | PASS |
| C19 | a metade próxima do disco passa à frente do horizonte | e2e, ✓ `black-hole.spec.ts:242` | `black-hole.spec.ts:262` - `expect(lit).toBeGreaterThanOrEqual(rows / 2)`. Teste anterior (Ressalva R7) | PASS |
| C20 | em movimento, centro da imagem do círculo a até 1 px do centro do horizonte, em 3 instantes | e2e, ✓ `deflection.spec.ts:531` | `deflection.spec.ts:558-561` - `Math.hypot(offset.x, offset.y) <= CENTRE_SLACK_PX` (1, `:32`), em 3 amostras (`:539`), medido contra `data-drawn-hole`; `:553-556` - horizonte nos pixels `<= HORIZON_BOX_PX` (2) desse ponto. Ressalva R1 | PASS |
| C21 | fora da tela, 0 draw calls | e2e, ✓ `offscreen.spec.ts:145` | `e2e/offscreen.spec.ts:150-155` - `expect(await drawsNow(page)).toEqual({ hero: 0, grid: 0, lens: 0, notebook: 0 })` em `#sobre` e `#faq`. Teste anterior, não tocado | PASS |
| C22 | o buraco negro volta a até 12 px de onde parou | e2e, ✓ `offscreen.spec.ts:168` | `offscreen.spec.ts:186-188` - `... <= RESUMED_PX`, `RESUMED_PX = 12` em `:24`. O diff só trocou a chamada para `showSceneOnly(page, { stopped: true })` (`:172`) | PASS |
| C23 | o `logo` não cruza o `<h1>` nem o CTA | e2e, ✓ `hero.spec.ts:168` (instância 1440x900) | `hero.spec.ts:201` - `expect(crosses).toBe(false)` para título e CTA, sem ponteiro e nos 4 cantos; `:191` - `logo.count > 500` | PASS |
| C24 | nenhuma dependência nova | `git diff --exit-code 5bb2888 -- package.json package-lock.json`, exit 0, saída vazia | o próprio comando | PASS |

## Ressalvas (não derrubam checks; ordenadas por peso)

- **R1 · C20 não compara direto com o horizonte na tela.** A asserção de 1 px
  (`e2e/deflection.spec.ts:558-561`) mede o centro da imagem contra `data-drawn-hole`. Esse é o
  ponto em que o laço da malha desenhou o recorte do horizonte
  (`components/organisms/hero/use-hero-field.ts:223`, gravado pelo `arc` interceptado em
  `deflection.spec.ts:137-140`). O horizonte achado nos pixels só fica preso a até 2 px desse
  ponto (`:553-556`). Pelas asserções sozinhas, a distância entre a lente e o horizonte na tela
  fica provada a até 3 px, não a 1.
  - O que fecha o 1 px é o código. O horizonte (`black-hole-mesh.tsx:232`) e o centro da lente
    (`bent-light.tsx:144` e `:177`) leem o mesmo `hole.current`, cada um no seu `useFrame` do
    mesmo quadro do R3F. Por construção, os dois centros coincidem.
  - A decisão está registrada no `Landing` do checklist e se justifica: a caixa inteira do
    horizonte erra até meio px, mais o recorte do disco. Ainda assim, ela troca a referência que
    o check nomeia.
  - Aceito como prova do check, porque a asserção discrimina: uma lente fora do centro desloca o
    círculo ajustado. Fica registrada como lacuna de precisão.
- **R2 · C6 e C8: o valor esperado não pode ser lido na asserção.** O esperado vem de
  `outerImage`/`innerImage`/`bendAt` em produção, multiplicados pelo raio medido do horizonte
  (`deflection.spec.ts:357` e `:396-397`).
  - Os números do checklist não aparecem no e2e. Esses números estão fixados por C5 e C7, com
    96 px de horizonte (`deflection.test.ts:28-38`).
  - Recalculei: θ₊ = 237,78 / 297,86 / 529,76 / 737,36 px e θ₋ = 160,25 / 139,41 / 111,16 px.
    Todos ficam dentro de ±0,5 px da tabela.
  - O e2e não afirma que o raio medido seja 96. Ele escala com o raio medido, o que é coerente
    com o critério 5 da tarefa ("tudo escala com o horizonte").
  - A combinação é sólida. Um `bendAt` errado cai nas provas de unidade. Uma tabela ou um shader
    que divirjam de `bendAt` caem nas provas de tela.
- **R3 · C8: d = 476 lido à direita e com faixas largas.** O check não fixa a direção ("do lado
  oposto"), ao contrário do C6 ("para baixo"). Com um círculo inteiro, ler à direita mede a
  imagem espelhada do ponto da esquerda, o que atende à redação.
  - As faixas de 8/12/40 px não são literalmente "o mesmo círculo" de traço 3 do C6, mas o raio
    é o mesmo.
  - Medi o viés do centro da faixa: 0,009 / 0,014 / 0,041 px. A espessura da imagem fica em
    ~2,1 px. A tolerância de ±4 px não se alarga. Aceito.
- **R4 · C4: a asserção compara com a captura vazia, não com o `ink`.** A redação do check diz
  "se afasta do `ink`". O teste compara fonte cheia contra fonte vazia, pixel a pixel
  (`deflection.spec.ts:330`).
  - Dentro do horizonte, a metade próxima do disco passa à frente (C19). A leitura literal
    contra o `ink` falharia ali por um motivo alheio à lente.
  - O teste mede a intenção ("nada atrás aparece") e é mais certo que a redação. Lacuna de
    precisão no checklist, não no teste.
- **R5 · C10: o checklist não dá o número de θ₊ na subida 1.** O check diz só "θ₊ de K(1)".
  - O teste deriva de `bendAt(1)`, que C9 fixa indiretamente (anel a 2,42 raios na subida 1).
  - O valor é 3,51 raios do horizonte, conferido com `outerImage(2, bendAt(1))` = 3,5102.
  - Que a subida esteja perto de 0 aos 100 ms e perto de 1 aos 6 s vem de constantes do teste
    (`deflection.spec.ts:37-42`), sem asserção. Uma subida errada, porém, faria o raio medido
    divergir do esperado, então a asserção ainda discrimina.
- **R6 · C14 não traz número.** O check diz só que o poço continua enfraquecendo. O teste herda
  a barra de 1,5× (`RISEN_RATIO`, `hero-grid.spec.ts:45`) da tarefa
  `portfolio-lp-black-hole-scale`. Lacuna de precisão menor.
- **R7 · C18 e C19 rodam sem malha atrás.** `showSceneOnly` agora zera a opacidade da malha
  (`e2e/page-helpers.ts`, diff desta feature). Por isso o passe da lente desenha com opacidade 0
  nesses testes. Eles provam que anel e disco continuam como antes, que é o que os checks
  afirmam.
  - A parte do critério 11 da tarefa que diz "desenhados por cima da malha distorcida" não tem
    check. Isso é questão de cobertura do checklist contra a tarefa, que em `light` não é passo
    deste verificador.
  - Fica como observação, junto com estas partes do critério 9 sem check: "sem WebGL" e "nunca
    um quadro sem malha nem com a malha duas vezes".

## Swept

Nenhuma linha de `Swept` resolve em `existing`: `grep -n -i "existing"` no checklist sai vazio
(exit 1). As linhas apontam para checks (C15, C20, C21) ou são `not in scope`, que é política
aprovada.

## Diff

`git diff 5bb2888..HEAD --stat`: 14 arquivos, +1316 −25.

- Testes novos: `components/organisms/hero/deflection.test.ts` e `e2e/deflection.spec.ts`.
- Testes anteriores tocados só na chamada de `showSceneOnly(page, { stopped: true })`:
  `e2e/black-hole.spec.ts` (4 testes) e `e2e/offscreen.spec.ts:172`.
- O limite do teste "the black hole grows and shrinks as it rises" subiu para 60 s
  (`black-hole.spec.ts:494`, `test.setTimeout(60_000)`). Nenhuma asserção do teste mudou, e ele
  não é prova de nenhum check desta feature.

## Faults injected

Não rodou: em `light`, a injeção de falhas não é exigida.

## Gate

- `node --test components/organisms/hero/deflection.test.ts` - 7 passed, 0 failed.
- `npx playwright test e2e/deflection.spec.ts e2e/hero-grid.spec.ts e2e/hero.spec.ts
  e2e/black-hole.spec.ts e2e/offscreen.spec.ts -g "<16 nomes>"` - 16 passed, 0 failed (3,9 min,
  1 worker, build de produção novo).
- `git diff --exit-code 5bb2888 -- package.json package-lock.json` - exit 0.
