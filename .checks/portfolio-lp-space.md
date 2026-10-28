# Landing page do portfólio — Hero com céu de estrelas e um planeta

Profile: `light` · handoff: `on`, um lote só. Base: `abfa404`, direto na `main` por decisão do
usuário; sem push.

**Sem testes do repositório**, por decisão do usuário: nenhum roda e nenhum é escrito. As provas
são scripts no scratchpad da sessão, mais `tsc` e lint:

- pasta:
  `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/dd915a87-c9b1-4f2d-a920-78964382acd1/scratchpad/space/`;
- `source.ts`: `node --test`. Importa `space.ts` e `black-hole-path.ts` e roda as funções puras;
- `probe.mjs`: Playwright sobre o `next dev` em `:3000`, numa janela de 1440×900, com
  `deviceScaleFactor` 1. Lê o DOM, a rede e os pixels;
- `../perf/gpu.mjs` e `../perf/scroll.mjs`: as sondas de GPU e de rolagem já usadas.

**Refeito em 2026-10-28**, junto com a tarefa: a primeira versão (galáxias, nebulosas, cometas e
asteroides) foi descartada pelo usuário antes de qualquer commit de código.

Sources:

- `.tasks/portfolio-lp-space.md` — os 10 critérios (número entre parênteses). Os valores padrão
  de Unresolved 2–3 valem.
- `.tasks/references/portfolio-lp-space-planet.png` — **vinculante para a composição**,
  transcrita na tarefa.

## Out of scope

- Testes; texto real; galáxias, nebulosas, cometas e asteroides; lente sobre o planeta — `Out of
scope` da tarefa.

## Landing

Toca:

- `app/page.tsx`: volta o `<HeroCopy />`;
- `components/organisms/hero/space.ts` (novo, puro): os números das estrelas e do planeta, e o
  sorteio das estrelas;
- `components/organisms/hero/space-sky.tsx` (novo): o céu parado e as estrelas que cintilam;
- `components/organisms/hero/hero-planet.tsx` (novo): o planeta, em HTML;
- `components/organisms/hero/hero.tsx`: o gradiente e o planeta;
- `components/organisms/hero/hero-scene.tsx`: monta o céu;
- `components/organisms/hero/black-hole-path.ts`: o caminho fica acima do planeta;
- `components/organisms/hero/bent-light.tsx`: o alvo sem MSAA e sem tone mapping.

Reusa:

- `BEHIND_LAYER` e a lente;
- `readColorToken`, `prefersReducedMotion` e `onReducedMotionChange`;
- as classes de token do Tailwind (`to-ink`, `bg-ink`) e `rgb(from var(--color-…))`, como no
  `globals.css`.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

Decisões reversíveis, registradas antes do código ou na hora em que o build as forçou:

- **Céu parado, pintado uma vez** (estrelas de destaque e estrelas que não cintilam) num
  `WebGLRenderTarget` a 1 texel por CSS px, cobrindo a área da lente (`OVERSCAN` = 2). Ele é
  repintado só quando a Hero muda de tamanho.
  - Na camada de trás, é um quad em espaço de recorte que só lê a textura.
  - As estrelas que cintilam (15%) são um `Points` desenhado a cada quadro.
  - Rejeitado: refazer o shader a cada quadro.
- **Textura do céu sRGB de 8 bits** (`colorSpace: SRGBColorSpace`). Medido no build:
  - meio-float evita os degraus nos brilhos fracos, mas lia o dobro de bytes a cada quadro. A
    espera de GPU foi a 8,65 ms; em sRGB de 8 bits, ficou em 5,5–5,7 ms;
  - RGBA8 linear mostrava o halo da estrela grande como um disco de borda dura.
- **Halo como (1 − r/R)⁴**, que chega a 0 no raio sem degrau. Uma gaussiana, vista em sRGB,
  virava um disco chapado com borda.
- **Alvo da lente sem MSAA** (`samples: 0`, eram 4). O MSAA existia para as bordas finas do
  vidro, que saiu da Hero.
- **Lente sem tone mapping** (`toneMapped={false}`): o ACES do renderer desbotaria `primary` e
  `mist`. O buraco negro já desenha sem tone mapping.
- **Planeta em HTML**, à frente do canvas e atrás do texto: um círculo com `radial-gradient`
  (corpo `ink`, faixa `primary` e linha `mist` na borda, em px) e um `box-shadow` `primary`
  para o brilho de fora. Rejeitado: pô-lo no céu, porque a lente o curvaria, e o planeta está
  mais perto que o buraco negro.
- **Caminho acima do planeta:** em `wanderBox`, `bottom = max(top, min(height − y, PLANET.top ·
height − reach))`.

## Checks

### S1 - Título, subtítulo e CTA · 2 files · ~5 KB

**C1** - O `#hero` tem:

- um `h1` "Lorem ipsum dolor sit amet", um `p` e um `a[href="#contato"]` "Lorem ipsum dolor";
- no centro de cada um, `elementFromPoint` devolve o próprio elemento ou um filho dele;
- com o mouse sobre o título, o canvas `hero-lens` passa a ter pixels desenhados.

(1). Proof: `probe.mjs` › "copy is back, in front"

### S2 - Céu de estrelas · 2 files · ~14 KB

**C2** - Estrelas:

- dentro de uma Hero de 1440×900, 2000 ± 10%; numa de 375×667, 390 ± 10%;
- de 1 a 2 px cada;
- toda célula de 120×120 px com pelo menos 4;
- 10 a 20% puxadas para `primary` ou `steel`;
- 10 a 20% cintilando, com brilho de 0,4 a 1 e período de 2 a 6 s.

(2). Proof: `source.ts` › "stars"

**C3** - As três estrelas de destaque têm:

- núcleo de 8, 4 e 3 px;
- halo de 80, 32 e 14 px;
- raios de 140, 56 e 22 px;
- posições (90%; 20%), (92%; 56%) e (90,5%; 72%), à direita da caixa do texto.

Na tela, a 1440×900:

- a posição de cada uma no céu fica fora da caixa do texto do `h1`, do `p` e do `a`, a 20 px
  ou mais dela. A caixa é medida pelos glifos (`Range.getBoundingClientRect`), porque o
  elemento `h1` ocupa toda a largura do contêiner, até x = 1360;
- o pixel mais claro a ±30 px de cada posição passa de 230 nos três canais (2–3). Proof:
  `source.ts` › "bright stars" e `probe.mjs` › "bright stars shine"

**C4** - Com o movimento ligado, em duas capturas a 1 s de intervalo, a parte dos pixels que
muda mais de 12 níveis é pelo menos 3 vezes maior perto do buraco negro que longe dele:

- perto: a coroa de 1,6 a 3 R, fora do disco e do brilho dele (|dy| > 1,6 R);
- longe: além de 6 R, fora do planeta e do texto.

Isso mostra o céu curvado seguindo o buraco negro (4). Proof: `probe.mjs` › "the sky is lensed"

### S3 - Gradiente · 1 file · ~2 KB

**C5** - O `background-image` do `#hero` é um `linear-gradient` sem direção ou com `to bottom`,
de `rgb(0, 0, 0)` a `rgb(16, 17, 19)` (5). Proof: `probe.mjs` › "black to ink"

### S4 - Planeta · 3 files · ~12 KB

**C6** - O planeta:

- o `[data-testid="hero-planet"]` vem depois do canvas da cena e antes do texto;
- na tela, o pixel a (720; 0,84·900 + 60) é `ink` ± 4;
- a borda passa por y = 0,84·900 ± 6 no meio e fica ~6,4% da largura mais baixa nos cantos
  (`planetEdge`);
- na borda há uma linha clara: o pixel mais claro a ±4 px de (720; 756) passa de 200 em b.

(6). Proof: `probe.mjs` › "the planet" e `source.ts` › "planet edge"

**C7** - Em 1440×900 e 375×667, `holeBox(...).bottom` ≤ `PLANET.top · height − 1,425 · R` (7).
Proof: `source.ts` › "black hole stays above the planet"

### S5 - Movimento reduzido e desempenho · 2 files

**C8** - Sob movimento reduzido, duas capturas a 1,5 s de intervalo são iguais: nenhum pixel
muda mais de 2 níveis (8). Proof: `probe.mjs` › "still under reduced motion"

**C9** - Espera média de GPU ≤ 8 ms e 60 FPS na Hero. Na rolagem, 60 FPS em todas as alturas,
fora a primeira compilação do `next dev` (9). Proof: `node ../perf/gpu.mjs` e `node
../perf/scroll.mjs`

### Herdadas

**C10** - `black-hole-mesh.tsx`, `package.json` e `package-lock.json` sem diff contra `abfa404`.
Na Hero, nenhum pixel com r > b + 8. Ao carregar, nenhuma requisição `.png`, `.jpg`, `.webp`,
`.glb`, `.gltf`, `.hdr` ou `.ktx2` (10). Proof: `git diff --exit-code abfa404 -- …`;
`probe.mjs` › "cool colours only" e "nothing downloaded"

**C11** - Compila e passa no lint. Proof: `npx tsc --noEmit -p .` e `npm run lint`

## Correções de medida durante o build

Nenhum limite mudou. Três medidas da sonda liam a coisa errada:

- **C3, janela de ±3 px para ±30 px.** A lente desloca a imagem de cada estrela de onde ela está
  no céu: a 6 R do buraco negro, ~20 px. O critério 3 da tarefa fixa a posição no céu, não na
  tela. Com ±3 px, a sonda achava o fundo.
- **C1, texto do `h1`.** O `GlitchText` desenha cópias `aria-hidden`. A sonda passou a ler só os
  nós que não são `aria-hidden`, que dão o nome acessível.
- **C10, `laptop.glb`.** É o modelo do caderno, baixado desde `c359f26`. O critério 10 fala do
  que é baixado para o céu e o planeta, então a sonda o exclui pelo caminho.

## Rodada 1 do Verifier: FAIL, e o que mudou

- **Critério 3 sem check e violado.** A coluna a ~80% caía dentro da caixa do título. As
  posições passaram para 90%, 92% e 90,5%, fora da caixa, e a C3 ganhou a verificação da caixa.
  Com isso, a prova da estrela média deixa de ler as letras do título.
- **C4 apertada:** o perto passou a excluir |dy| ≤ 1,6 R, como na releitura do Verifier.
- **C5 apertada:** a regex agora recusa qualquer direção que não seja `to bottom`.
- **C9:** a rolagem cai a 57 FPS em y = 1800 por causa do `iframe` do Kune no caderno
  (`laptop.tsx`, `notebook-scene.tsx`), que este diff não toca. A exceção escrita ("a primeira
  compilação do `next dev`") nomeia a causa errada. Está levado ao usuário.

## Handoff

~35 KB de leitura (~9k tokens): um lote só.

## Swept

- external-dependency failure: C10
- failure modes: existing - sem WebGL, ficam o texto, o gradiente e o planeta
- o resto: not in scope (a tarefa os põe em n/a)
