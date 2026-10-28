# Landing page do portfólio — disco vertical nas cores do horizontal

Profile: `light` · handoff: `on`, um lote só. Base: `72d42a9`, direto na `main` por decisão do
usuário; sem push.

**Sem testes do repositório**, por decisão do usuário: nenhum teste roda e nenhum é escrito no
repositório. As provas são uma sonda de tela no scratchpad da sessão, mais `tsc` e lint:

- pasta:
  `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/dd915a87-c9b1-4f2d-a920-78964382acd1/scratchpad/colors/`;
- `probe.mjs`: Playwright sobre o `next dev` em `:3000`, numa janela de 1440×900, sob movimento
  reduzido. O buraco negro fica em repouso em (720, 288), com R = 72 px. Lê os pixels da tela;
- **parte azul** = b / (r + g + b) em sRGB, **descontada a cor do fundo** (`ink`, #101113).
  Onde o gás tem vãos, a sonda lê o pixel mais claro numa janela de ±3° no mesmo raio. Nas
  linhas, lê o pixel mais claro a ±1 px.
- **Medida renegociada com o usuário durante o build (2026-10-28).** Os limites não mudaram.
  Na tela, C3, C4 e C6 falhavam por pouco e só em pixels quase apagados: 0,54 contra 0,55 a
  1,22 R; a ordem de cor na ponta roxa; um degrau de 0,07 contra 0,05. Nesses pixels, a cor do
  fundo se mistura e puxa a parte azul para 0,35. Opção escolhida pelo usuário, "Mudar a medida":
  - descontar o fundo;
  - janela de ±1 px em vez de ±2 px;
  - o degrau da C4 medido entre médias de 3 pontos (0,1 R), porque os filamentos fazem a cor
    oscilar de um pixel para outro.

Sources:

- `.tasks/portfolio-lp-black-hole-disk-colors.md` — os 8 critérios (número entre parênteses).
- `.tasks/references/portfolio-lp-black-hole-disk-colors.jpeg` — **vinculante para as ligações**:
  as três linhas, transcritas no critério 2.

## Out of scope

- Testes; mudar o disco horizontal; mudar o brilho em volta — `Out of scope` da tarefa.

## Landing

Toca só `components/organisms/hero/black-hole-mesh.tsx`, o shader. Reusa `diskGas`, `beam`, a
regra de cor do horizontal (`mix(uMist, uPrimary, smoothstep(DISK_IN, DISK_OUT - 0.6, ρ))`) e
as constantes de `HOLE` e `DISK`.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

Decisões reversíveis, registradas antes do código:

- **Faixas da metade de cima.** Cada faixa t ∈ [0, 1] é a imagem do anel do horizontal de raio
  ρ(t) = 1,15 + 2,85·t no plano. A altura da faixa em x é a norma p = 6 de duas curvas:
  - o círculo de raio rA(t) = 1,05 + 0,375·t (o arco de cima);
  - a elipse lean·√(ρ(t)² − x²) (a metade de trás do horizontal).

  Com p = 6, a curva fica acima das duas onde elas se cruzam, como as linhas desenhadas. Os
  valores (x; y em R) estão a menos de 0,1 R das três linhas:

  | Faixa      | Linha    | x = 0,9 | x = 1,45 | Extremo     |
  | ---------- | -------- | ------- | -------- | ----------- |
  | azul       | roxa     | —       | —        | (1,9; 0,79) |
  | azul claro | ciano    | 1,01    | 0,68     | —           |
  | branca     | vermelha | 0,72    | 0,28     | —           |

  Cada pixel acha o seu t por bissecção (12 passos), porque a altura cresce com t. Rejeitada a
  mistura das duas curvas por ângulo: a 36°, a faixa ciano ficava 0,15 R abaixo da linha.

- **Cor e gás das faixas.**
  - A cor vem de ρ(t), pela mesma regra de cor do horizontal.
  - O gás vem de `diskGas(ρ(t), …)`. O ângulo é θ onde o círculo domina e o ângulo no plano onde
    a elipse domina. A mistura usa e = smoothstep(0,35, 0,65, elipse⁶ / (círculo⁶ + elipse⁶)).
  - Brilho = `heat(ρ)` · gás · `beam`, com metade da luz em cima e a luz inteira onde a elipse
    domina. Ali a faixa e a metade de trás do horizontal se juntam por `max`, não por soma, para
    a junção não estourar em branco.
- **Metade de baixo.**
  - A geometria e o gás ficam como hoje (`outer`, `foot`, `FOOT_OUT`).
  - A cor vai para `primary`: `below = smoothstep(0,1, 0,34, −sen θ)`, que vale 1 de 200° a 340°.
  - Perto dos lados, a cor parte da cor do horizontal naquele pixel, para não haver costura na
    linha do meio.
- **Anel de fótons:** a largura da gaussiana é `mix(0.028, 0.020, below)`.

## Checks

### S1 - Em cima, as cores do horizontal · 1 file · ~14 KB

**C1** - Em θ = 90°, a parte azul é ≤ 0,40 a 1,08 R, fica entre 0,42 e 0,55 a 1,25 R e é ≥ 0,55
a 1,35 R (1). Proof: `probe.mjs` › "top colours"

**C2** - Em θ = 90°, de 1,08 R a 1,35 R, a parte azul nunca cai mais de 0,02 de um passo de
0,01 R para o próximo (1). Proof: `probe.mjs` › "top order"

### S2 - Nos lados, cada faixa entra no horizontal pela parte de mesma cor · mesmo arquivo

**C3** - Cada faixa segue a sua linha: ao longo de cada uma das três linhas da referência, nos
dois lados e de 0,05 em 0,05 R, a parte azul fica a ±0,10 do valor no ponto onde a linha encontra
o horizontal. Nesses pontos, a ordem é vermelha < ciano ≤ roxa (2). Proof: `probe.mjs` › "bands
follow the lines"

Correção antes do código: a primeira versão da C3 fixava limites por linha (azul claro de 0,40 a
0,60). A captura de hoje mostra que o horizontal, no fim da linha ciano, tem 0,60–0,63. Esse
limite contradizia o critério 3 da tarefa.

**C4** - Ao longo das mesmas linhas, de um ponto ao próximo, a parte azul muda menos de 0,05,
inclusive na junção com o horizontal (3). Proof: `probe.mjs` › "no colour step"

**C5** - No fonte, as faixas de cima tiram o gás de `diskGas` no raio ρ(t) do plano, que é o
raio em que entram no horizontal. Esse raio fixa o período (`wisps` → `uInnerTurn` e
`uOuterTurn`) (4). Proof: `grep -n "diskGas(rho" components/organisms/hero/black-hole-mesh.tsx`
mostra as duas leituras.

### S3 - Embaixo, azul escuro com uma linha fina branca · mesmo arquivo

**C6** - De θ = 240° a 300°, de 1,10 R a 1,22 R, todo pixel tem parte azul ≥ 0,55 e nenhum canal
acima de 160 (5). Proof: `probe.mjs` › "dark blue below"

**C7** - No fonte, a largura do anel é `mix(0.028, 0.020, below)`, e `below` vale 1 de 200° a
340° (6). Proof: `grep -n "0.020" components/organisms/hero/black-hole-mesh.tsx`

**C8** - De θ = 240° a 300°, os pixels brancos (os três canais ≥ 200) ficam todos entre 1,00 R e
1,07 R (7). Proof: `probe.mjs` › "white only in the ring"

### Herdadas

**C9** - O disco horizontal não muda: `disk()`, `DISK`, `DISK_POSE` e `diskColor` ficam iguais a
`72d42a9`. Nenhuma dependência entra (8). Proof: `git diff 72d42a9 -- package.json
package-lock.json components/organisms/hero/black-hole.ts` vazio, e o diff do mesh não toca
`disk()` nem a linha `diskColor`.

**C10** - Na tela, só aparecem tons frios: em todo pixel, r ≤ b + 8 (8, "cool blues only").
Proof: `probe.mjs` › "cool blues only"

**C11** - Compila e passa no lint. Proof: `npx tsc --noEmit -p .` e `npm run lint`

## Handoff

~14 KB de leitura (~4k tokens): um lote só.

## Swept

- concurrency: C5 (mesmo `uTime` e mesmo raio, portanto mesmo período)
- o resto: not in scope (a tarefa os põe em n/a)
