# Landing page do portfólio — Hero com céu de estrelas e um planeta: verificação

**Verdict**: FAIL (10/11 checks provados; C9 falha na letra, por causa fora do diff; uma lacuna de cobertura no critério 3)
**Profile**: light. Rodaram os passos 2, 3 e 5. Não rodam neste perfil: o passo 1 (comparação com as fontes vinculantes) e o passo 4 (injeção de falhas). A referência vinculante foi aberta mesmo assim, só para a nota de composição no fim; ela não é um check.
**Diff range**: abfa404..4e483a9. O código está em 2e47101, 3d42e14, 28256d8 e 4e483a9. d7fa6ea e 3f04568 só mudam `.tasks/` e `.checks/`.
**Round**: 1 - full
**Verifier**: subagente independente (autor != verificador)

Notas de contexto:

- **A árvore de trabalho corresponde ao HEAD.** `git status --short` veio vazio, e o HEAD é 4e483a9. O `next dev` em `:3000` (pid 458653, filho de 458641) roda com cwd neste repositório. A sonda mede, portanto, o código de 4e483a9.
- **Os testes do repositório não rodaram**, por decisão do usuário. Nenhum `npm test`, `test:e2e` ou suíte Playwright do repositório foi executado.
- **As provas ficam no scratchpad da sessão.** Não são versionadas e somem com a sessão. A pasta é `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/dd915a87-c9b1-4f2d-a920-78964382acd1/scratchpad/` (abaixo, `…/scratchpad/`):
  - `…/scratchpad/space/source.ts` e `…/scratchpad/space/probe.mjs`;
  - `…/scratchpad/perf/gpu.mjs` e `…/scratchpad/perf/scroll.mjs`.
- **Releituras próprias**, sem alterar o repositório, em `…/scratchpad/verifier-space/`:
  - `measure.mjs`: o fundo por coluna, as estrelas de destaque com janelas de ±3 e ±30 px, a borda do planeta na tela e os pixels quentes com o movimento ligado;
  - `stars.mjs`: as estrelas de destaque com o texto escondido no DOM, só no navegador, e as caixas do texto;
  - `lens.mjs`: a lente do título antes e depois do hover;
  - `at1800.mjs`: o que carrega na rolagem em y = 1800;
  - `radius.ts`: R e `holeBox` em cinco tamanhos;
  - capturas: `reduce.png`, `with-copy.png`, `no-copy.png`, `motion-a.png`, `motion-b.png`, `diff-near.png`.
- **As medidas de GPU variam de uma rodada para outra.** `gpu.mjs` rodou duas vezes e `scroll.mjs` também.

## Checks

| Check | Claim                                                                                                                                                                              | Proof run (HEAD 4e483a9)                                                                                                                                                             | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                 | Result                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| C1    | `h1`, `p`, `a[href="#contato"]` com os textos; `elementFromPoint` no centro de cada um devolve o próprio elemento; o hover no título acende `hero-lens`                            | `node probe.mjs` exit 0: `✔ copy is back, in front (DOM)` (`front: true`) e `✔ copy is back, in front (title lens) — lens px 427`                                                    | `probe.mjs:25`: `hit === el \|\| el.contains(hit)`. `:34`: `dom.h1 === 'Lorem ipsum dolor sit amet' && dom.a === '#contato' && dom.aText === 'Lorem ipsum dolor' && dom.front`. `:72`: `ink > 0`. A sonda não mede a linha de base antes do hover; a releitura (`lens.mjs`) mediu: 0 px antes e 522 depois. Código: `app/page.tsx:32` (`<HeroCopy />`).                                                                                  | PASS                                                            |
| C2    | 2000 ± 10% a 1440×900 e 390 ± 10% a 375×667; 1–2 px; ≥ 4 por célula de 120 px; 10–20% com tom; 10–20% cintilando, de 0,4 a 1, em 2–6 s                                             | `node --test source.ts` exit 0: `✔ stars` (50 sementes)                                                                                                                              | `source.ts:17`: `Math.abs(big.length - 2000) <= 200`. `:19`: `Math.abs(small.length - 390) <= 39`. `:20`: `s.size >= 1 && s.size <= 2`. `:23`: `n >= 4`. `:26` e `:29`: `>= 0.1 && <= 0.2`. `:31`: `s.period >= 2 && s.period <= 6`. `:34`: `g >= SPACE.twinkleLow - 1e-9 && g <= 1 + 1e-9`. `:38`: `SPACE.twinkleLow === 0.4`. A área sorteada (`source.ts:11`) é a mesma do componente (`space-sky.tsx`, `spread = (OVERSCAN − 1)/2`). | PASS. Achado 5.                                                 |
| C3    | núcleo 8/4/3, halo 80/32/14, raios 140/56/22; posições (80%; 22%), (78%; 62%), (80,5%; 74%); na tela, o pixel mais claro a ±30 px passa de 230                                     | `source.ts` `✔ bright stars`; `probe.mjs` `✔ bright stars shine — 242,247,255` ×3                                                                                                    | `source.ts:42-43`: `deepEqual(... [[8, 80, 140], [4, 32, 56], [3, 14, 22]])` e `[[0.8, 0.22], [0.78, 0.62], [0.805, 0.74]]`. `probe.mjs:41-42`: `brightest(px, fx * W, fy * H, 30)` e `p.every(v => v > 230)`. Na estrela média, o pixel que a sonda acha é uma letra do título (ver achado 3). Com o texto escondido (`stars.mjs`), a média passa sozinha: 7 px acima de 230, a (−11; +24).                                             | PASS no que o check diz. Achados 2 e 3.                         |
| C4    | com movimento, a parte dos pixels que muda > 12 níveis em 1 s é ≥ 3× maior em 1,6–3 R (\|dy\| > 0,9 R) que além de 6 R                                                             | `probe.mjs` `✔ the sky is lensed — near 0.2054 of 19469, far 0.0297 of 69027` (6,9×)                                                                                                 | `probe.mjs:66-68`: os dois anéis como no check e `near.share >= 3 * far.share`. R = 72 (`:64`) confere: `horizonRadius(1440, 900)` = 72,00 (`radius.ts`).                                                                                                                                                                                                                                                                                | PASS. Achado 4.                                                 |
| C5    | `background-image` do `#hero`: `linear-gradient` para baixo, de `rgb(0, 0, 0)` a `rgb(16, 17, 19)`                                                                                 | `probe.mjs` `✔ black to ink — linear-gradient(in oklab, rgb(0, 0, 0) 0%, rgb(16, 17, 19) 100%)`                                                                                      | `probe.mjs:35`: regex sobre `getComputedStyle(hero).backgroundImage`. O valor não traz direção, ou seja, o padrão `to bottom`. A regex não confere a direção; a releitura confere pela coluna x = 40: y 0 → 0,0,0; y 500 → 3,3,3; y 750 → 10,10,14. Código: `hero.tsx:42`.                                                                                                                                                               | PASS. Achado 7.                                                 |
| C6    | planeta depois do canvas e antes do texto; (720; 816) é `ink` ± 4; borda a 756 ± 6 no meio e ~6,4% da largura mais baixa nos cantos; linha clara com b > 200 a ±4 px de (720; 756) | `probe.mjs` `✔ the planet — order canvas 0 < planet 1 < copy 3; body 16,17,19; rim 204,213,239`; `source.ts` `✔ planet edge`                                                         | `probe.mjs:39`: `planetIndex > canvasIndex && copyIndex > planetIndex`, `Math.abs(v - [16, 17, 19][k]) <= 4` e `rim[2] > 200`. `source.ts:47`: `planetEdge(720, 1440, 900) − 756 < 1e-6`. `:49`: `                                                                                                                                                                                                                                       | corner/1440 − 0.0635                                            | < 0.002`. A sonda não mede os cantos na tela; a releitura mede: borda em y = 847 nos cantos (`planetEdge`dá 847,4) e em y = 779 em x = 360 (dá 778,6). Código:`hero-planet.tsx:36-37`. | PASS |
| C7    | `holeBox(...).bottom ≤ PLANET.top · h − 1,425 R` a 1440×900 e 375×667                                                                                                              | `source.ts` `✔ black hole stays above the planet`                                                                                                                                    | `source.ts:56-57`: `reach = Math.max(HOLE.halfHeight, HOLE.topHeight) * horizonRadius(w, h)` (1,425 R, `black-hole.ts:18`) e `box.bottom <= PLANET.top * h - reach + 1e-6`. Código: `black-hole-path.ts:60,65`. A releitura passa também a 800×360, 1280×500 e 1920×1080. O `max(y, …)` de `:65` só furaria com R > 0,26 h, e R ≈ 0,08 h.                                                                                                | PASS                                                            |
| C8    | sob movimento reduzido, nenhum pixel muda > 2 níveis em 1,5 s                                                                                                                      | `probe.mjs` `✔ still under reduced motion — pixels changed > 2: 0`                                                                                                                   | `probe.mjs:43-46`: espera 1500 ms e `moved === 0`, com o limiar `> 2` em todos os pixels de 1440×900.                                                                                                                                                                                                                                                                                                                                    | PASS                                                            |
| C9    | GPU ≤ 8 ms e 60 FPS na Hero; na rolagem, 60 FPS em todas as alturas, fora a primeira compilação do `next dev`                                                                      | `gpu.mjs` ×2: `GPU wait mean 5.40 ms … fps 59.8` e `5.10 ms … fps 60.0`. `scroll.mjs` ×2: `y 1800: fps 57 … longtasks 148 ms` e `fps 57 … longtasks 130 ms`; as outras alturas a 60. | A sonda não tem asserção; o veredito é a leitura dos números contra o check (`gpu.mjs:15`, `scroll.mjs:33`). A queda em y = 1800 se repete com o servidor já compilado. `at1800.mjs` mostra a causa: em y = 1800 entra o iframe do Kune (19 requisições a `kune-joaoeduardoajs-projects.vercel.app`), e vêm 6 tarefas longas de 55 a 72 ms. A Hero não desenha ali (`gpu 0.0 ms`). Não é a "primeira compilação".                        | FAIL na letra (parte da rolagem). Causa fora do diff. Achado 1. |
| C10   | `black-hole-mesh.tsx`, `package.json` e `package-lock.json` sem diff; nenhum pixel com r > b + 8; nada de `.png/.jpg/.webp/.glb/.gltf/.hdr/.ktx2`                                  | `git diff --exit-code abfa404 -- …`: vazio, exit 0. `probe.mjs` `✔ cool colours only — warm px 0`, `✔ nothing downloaded — none`                                                     | `probe.mjs:47-48`: `p[0] > p[2] + 8` conta, em todos os pixels. `:8`: regex das extensões, excluindo só `/models/laptop.glb`. `:49`: `downloads.length === 0`. A sonda mede os quentes só com movimento reduzido; a releitura, com movimento ligado, também dá 0. Nenhum `TextureLoader`, `useTexture`, `useGLTF` ou `url(` em `space-sky.tsx`, `hero-planet.tsx` ou `space.ts` (grep, exit 1).                                          | PASS                                                            |
| C11   | compila e passa no lint                                                                                                                                                            | `npx tsc --noEmit -p .` exit 0 ("No errors found"); `npm run lint` exit 0 ("No issues found")                                                                                        | saída dos comandos                                                                                                                                                                                                                                                                                                                                                                                                                       | PASS                                                            |

## Correções de medida durante o build

As três correções foram julgadas uma a uma. Nenhuma afrouxa um limite, e todas leem o critério da tarefa com fidelidade. A primeira, porém, deixou uma contaminação na prova.

1. **C3, janela de ±3 para ±30 px: fiel, com um defeito.**
   - **Por que é fiel.** O critério 3 fixa a posição "da Hero", ou seja, no céu. A lente (`bent-light.tsx`) desloca cada imagem pela deflexão e pelo termo de fluxo `uFlow²·(x, −y)/r²`.
   - **O deslocamento medido.** (−22; −12), (−11; +24) e (−8; +23) px, ~24,5 px cada. Bate com os "~20 px" do checklist e cabe em ±30 com ~5 px de folga.
   - **A janela de ±3 px de fato só acha o fundo.** Lidos ali: 21,22,39; 89,92,95; 7,8,9.
   - **A janela de 61×61 px ainda discrimina contra as estrelas pequenas.** Com o texto escondido, 0 de 120 janelas de céu comum têm um pixel acima de 230.
   - **O defeito.** Na estrela média, a janela alcança as letras do título "amet": 118 dos 125 pixels quentes são texto, e o pixel que a sonda devolve, em (+3; −30), é uma letra (achado 3).
2. **C1, só nós sem `aria-hidden`: fiel.** As cópias do `GlitchText` são `aria-hidden` (`glitch-text.tsx:125`, `hero-copy.tsx:27`), e o critério pede o texto que a pessoa lê, ou seja, o nome acessível.
3. **C10, exclusão de `laptop.glb`: fiel.**
   - O critério 10 limita a regra ao que é baixado "para o céu ou para o planeta".
   - O modelo é do caderno (`notebook/laptop.tsx:9`, `MODEL_URL = '/models/laptop.glb'`) e vem de `c359f26`, ancestral da base.
   - A exclusão é pelo caminho exato, então qualquer outro `.glb` ainda reprova.

## Notas

Achados, em ordem de peso.

1. **C9 falha na letra, e a exceção do checklist dá o nome errado à causa.**
   - **O que se mediu.** Em y = 1800, a rolagem fica em 57 FPS nas duas rodadas, com 130–148 ms de tarefas longas, e o servidor já estava compilado.
   - **A causa.** É a pré-carga do iframe do Kune, perto do `#notebook`. Ela é anterior a esta tarefa e não passa por nenhum arquivo do diff; a Hero não desenha nessa altura.
   - **O problema.** O check só exclui "a primeira compilação do `next dev`", que não é o que acontece.
   - **Quem decide.** O usuário escolhe entre duas saídas:
     - renegociar a exceção, para "fora o carregamento do iframe do Kune";
     - pedir a prova de que a queda já existia em `abfa404`. Não a rodei, para não criar worktree no repositório.
2. **Lacuna de cobertura no critério 3: "à direita do texto, fora da caixa dele" não tem check, e a tela não o cumpre.**
   - **O que falta.** A C3 cobre tamanhos e posições, mas não a cláusula de arranjo.
   - **O que a tela mostra.** Com o título de volta, ele vai até x = 1249 (pixels de letra) e a caixa do `h1` vai de 80 a 1360 × 278 a 559. As três estrelas ficam em x = 1112–1159 na tela, ou seja, sob a extensão horizontal do título, não à direita dele.
   - **A estrela média.**
     - No céu, fica em y = 558, dentro da caixa do `h1` por 1 px.
     - Na tela, fica em (1112; 580): 47 px abaixo da base de "amet" (y = 533). Seus raios de 56 px chegam a ~19 px das letras.
   - **Leitura.** Os números de posição foram propostos quando a Hero não tinha texto (Unresolved 2: "ajustam-se ao ver").
   - **Quem decide.** O usuário escolhe entre duas saídas:
     - mover a coluna;
     - aceitar a posição e reescrever a cláusula.
   - **Peso.** É uma questão de arranjo e, pelo protocolo, pesa como um rótulo errado.
3. **A prova de tela da C3 mede o título na estrela média.**
   - O pixel 242,247,255 que a sonda acha a ±30 px de (1123; 558) é uma letra do `h1`, em mist, e não a estrela.
   - A estrela passa por conta própria (releitura com o texto escondido), mas a prova, como está, passaria mesmo sem ela.
   - Para discriminar, a sonda deveria esconder o texto ou excluir a caixa dele.
   - A estrela pequena passa com só 2 px acima de 230, uma margem curta.
4. **A prova da C4 mistura o próprio disco com o céu curvado.**
   - **A contaminação.** No anel de 1,6–3 R com |dy| > 0,9 R entram a borda do disco animado e o brilho azul em volta do buraco negro (`diff-near.png`).
   - **O centro.** O estimador da sonda (`probe.mjs:63`) aceita qualquer pixel escuro com r > 12, e isso inclui o pé do gradiente (37 das 1044 amostras ficam entre 0,74 H e 0,8 H). O centro sai ~18 px fora do disco `ink`.
   - **A releitura.** Com o centro do disco `ink` e só |dy| > 1,6 R, que já está fora do disco e dos arcos, perto dá 0,181 e longe 0,029 (6,3×). O critério vale, mas a prova não isola o que afirma.
   - **O que nenhum check cobre.** A outra metade do critério 4: o arco esticado e a imagem espelhada. A lente é a de antes; o diff só tirou o MSAA e o tone mapping.
5. **A cintilação da C2 é provada na função TS, não no shader.**
   - `starGlow` (`space.ts`) é testada.
   - O shader repete a fórmula à parte: `space-sky.tsx:63`, `brightness * mix(uLow, 1.0, wave)`, com `uLow = SPACE.twinkleLow` (`:182`, `:289`). A fórmula bate, mas uma divergência futura não seria pega.
   - O tamanho desenhado é `size + 1` px com borda suave (`gl_PointSize = size + 1.0`), e a C2 prova o dado (1–2 px), não o sprite.
6. **Margens curtas.**
   - C9: o p95 de GPU fica em 8,7–9,6 ms, contra uma média de 5,1–5,4 ms; o limite é a média, 8 ms.
   - C3: estrela pequena com 2 px quentes; deslocamento de ~24,5 px numa janela de 30.
   - C6: rim com b = 239 contra 200.
7. **A regex da C5 não confere a direção.** O segundo padrão (`probe.mjs:35`) aceitaria `to top`. O valor está certo, e a direção foi conferida pela coluna de pixels.

## Composição (nota, não é check)

A captura (`…/scratchpad/verifier-space/reduce.png`) tem os elementos da referência:

- o céu preto coberto de estrelas finas;
- a coluna de três estrelas, uma grande, uma média e uma pequena, descendo rumo ao horizonte;
- o arco largo do planeta, com a linha clara na borda, a faixa colorida embaixo e o brilho fraco em cima, sobre um corpo quase preto.

As diferenças:

- **Decididas na tarefa:** a coluna à direita em vez de no centro; a atmosfera em `mist` e `primary` em vez de laranja e verde-azulado; um arco mais aberto que o da foto (6,4% da largura nos cantos).
- **Uma que a tarefa não pretendia** (achado 2): a coluna encosta no título, em vez de ficar à direita dele.

## Gate

- `node --test …/scratchpad/space/source.ts`: 4 passed, 0 failed (exit 0).
- `node …/scratchpad/space/probe.mjs`: 9 passed, 0 failed (exit 0).
- `node …/scratchpad/perf/gpu.mjs http://localhost:3000/ 1`, primeira rodada: média de GPU 5,40 ms, p95 9,60 ms, 59,8 fps.
- `node …/scratchpad/perf/gpu.mjs http://localhost:3000/ 1`, segunda rodada: média de GPU 5,10 ms, p95 8,70 ms, 60,0 fps.
- `node …/scratchpad/perf/scroll.mjs` ×2: 60 fps em todas as alturas, salvo y = 1800 (57 e 57; tarefas longas de 148 e 130 ms).
- `git diff --exit-code abfa404 -- components/organisms/hero/black-hole-mesh.tsx package.json package-lock.json`: exit 0.
- `npx tsc --noEmit -p .`: exit 0.
- `npm run lint`: exit 0.

Checks provados: 10/11 (C9 falha na letra). Não rodaram (perfil `light`): o passo 1 (fontes vinculantes) e a injeção de falhas.
