# Landing page do portfólio — buraco negro maior, de lado, inclinado e vagando; estrelas que esmaecem

Profile: `light` · handoff: `on`, um lote só. Base: `9028b05`, direto na `main`; sem push.

**Sem testes do repositório**, por decisão do usuário. As provas, pela preferência dele por
rapidez, são poucas:

- `source.ts`: `node --test` sobre as funções puras;
- uma captura da Hero e a sonda de GPU (`../perf/gpu.mjs`);
- `tsc` e lint.

Pasta:
`/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/dd915a87-c9b1-4f2d-a920-78964382acd1/scratchpad/wide/`.

Sources: `.tasks/portfolio-lp-black-hole-wide.md` — 11 critérios (número entre parênteses).
Respostas: 20° no sentido "/"; o fluxo continua horizontal; mesma velocidade.

## Landing

Toca `space.ts`, `space-sky.tsx`, `hero.tsx`, `hero-planet.tsx` (sai), `black-hole.ts`,
`black-hole-mesh.tsx`, `black-hole-path.ts`, `deflection.ts`, `bent-light.tsx` e
`use-hero-field.ts`.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

Decisões reversíveis:

- **Disco 2 vezes maior, com a mesma cara.** No shader, `LOOK_OUT = 4` e `look(r) = DISK_IN + (r −
DISK_IN) · (LOOK_OUT − DISK_IN) / (DISK_OUT − DISK_IN)`, um fator de ~2,4. Os arcos usam
  `arcLook`, com fator 2. Brilho, borda, cor, espessura dos filamentos e queda do arco usam esses
  raios; a geometria (raios, faixas, elipse dos pés) usa o raio real. O nome do primeiro rascunho,
  `GROWTH = 2`, foi trocado no build porque o disco cresceu de 4 a 8, mas a parte de dentro
  ficou em 1,15. Rejeitado: só trocar `DISK.outer` para 8. O brilho cai com `r^1,1` e a cor muda
  até 3,4 R, então a metade de fora sairia apagada e azul.
- **`THICK` 0,06 → 0,12, `FOOT_OUT` 1,6 → 2,15 e `SPAN` 5 → 9,5**, para acompanhar o disco.
- **Inclinação:** `DISK_POSE.slant = 20°`, passado ao `uRoll` do mesh. O fluxo da lente continua
  horizontal.
- **Lente radial:** com `FIELD.exponent = 0`, o shader escreve `share = 1.0`, porque `pow(0, 0)`
  é indefinido em GLSL.
- **Caminho:**
  - o início e o repouso ficam no canto superior esquerdo de `holeBox`;
  - as pernas passam a durar de 6 a 16 s (eram de 4 a 10). O salto máximo vai de ~67 a ~108 px,
    e a velocidade não muda;
  - cada waypoint é o mais próximo, entre 8 candidatos, de um alvo que gira pelos cantos da
    caixa (direito de cima, direito de baixo, esquerdo de baixo, esquerdo de cima). O alvo
    avança quando o centro chega a 15% da diagonal dele.

  Rejeitado: só alongar as pernas. O passeio continuaria aleatório em volta do ponto de partida.

- **Estrelas incandescentes:**
  - sprite de `size · 8 + 1` px: núcleo, halo `0,35·(1 − d/3s)²` e raios em cruz de 4 s nas
    estrelas com brilho acima de 0,672 (o quarto mais claro do sorteio);
  - o desbotamento `clamp(1 − y/H, 0, 1)` vale no vértice das estrelas e nas de destaque.

- **Saída rápida no shader do buraco negro**, decidida no build, quando a GPU foi a 7,5–8,4 ms
  com o quadrado 3,6 vezes maior. Onde r > 2,3 e o raio no plano da linha mais próxima passa de
  DISK_IN + 1,1·(DISK_OUT − DISK_IN) (8,69, onde as faixas de cima já apagaram; corrigido depois
  do Verifier, que achou o corte antigo, 8,4, cedo demais), o pixel só tem o brilho de fora (`uPrimary · glow`), e o resto é pulado.
  Depois disso: 6,4–6,7 ms. Rejeitado: diminuir o `SPAN`, que cortaria o brilho antes de ele
  sumir.

## Checks

### S1–S2 - Sem planeta; estrelas · 4 files · ~20 KB

**C1** - Não há `hero-planet` no código nem `PLANET` em `wanderBox` (1). Proof: `grep` vazio
**C2** - As estrelas pequenas e as de destaque são multiplicadas por `clamp(1 − y/H, 0, 1)`, e as
pequenas desenham halo e raios (2–3). Proof: `grep` nos shaders e a captura

### S3 - Buraco negro · 4 files · ~40 KB

**C3** - `DISK.outer` 8, `HOLE.topHeight` 1,8, `HOLE.halfHeight` 1,39. No shader, `LOOK_OUT` 4: o
disco lê a aparência do raio que tinha no disco de 4 R, um fator de ~2,4. Os arcos usam
`arcLook`, com fator 2, porque as faixas deles dobraram (4).
Proof: `source.ts` › "disks"
**C4** - `DISK_POSE.tilt` 7° e `slant` 20°, este no `uRoll` (5–6). Proof: `source.ts` › "pose" e a
captura (a borda direita do disco acima da esquerda)
**C5** - A partir do canto (±2 px), numa simulação de 300 s a 60 Hz em 1440×900 e em 375×667, o
caminho passa pelos quatro quadrantes. Nenhum segundo passa de 7,5 px (7–8). Proof: `source.ts`
› "path"

### S4 - Lente · 2 files · ~15 KB

**C6** - `FIELD.exponent` 0, `EINSTEIN.radius` 1,92 e `FLOW.radius` 1,92 (9–10). Proof:
`source.ts` › "lens"

### Herdadas

**C7** - GPU média ≤ 8 ms a 60 FPS; nenhum pixel quente; nenhuma dependência nova (11). Proof:
`gpu.mjs` e `git diff 9028b05 -- package.json`
**C8** - `tsc` e lint saem com 0.

## Handoff

~80 KB de leitura (~20k tokens): um lote só.

## Swept

- state transitions: C5
- o resto: not in scope (a tarefa os põe em n/a)
