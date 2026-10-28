# Landing page do portfólio — só o buraco negro, disco vertical mais grosso em cima e ligado ao horizontal

Profile: `light` · handoff: `on`, um lote só. Base: `993200c`, direto na `main` por decisão do
usuário; sem push.

**Provas sem testes do repositório**, por decisão do usuário. As provas são scripts no
scratchpad da sessão, mais `tsc` e lint:

- pasta:
  `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/a43d5673-cd23-4c14-b639-6f8d61e3badb/scratchpad/joined/`;
- `source.ts`: node, lê o fonte e as constantes;
- `probe.mjs`: Playwright, sobre o build de produção em `:3200`, sob movimento reduzido. O
  buraco negro fica em repouso em (720, 288), com R = 96 px.

Sources:

- `.tasks/portfolio-lp-black-hole-joined-disk.md` — os 8 critérios (números entre parênteses).
- `.tasks/references/portfolio-lp-black-hole-joined-disk.png` — o formato; não vincula cores.

## Out of scope

- Testes; apagar os componentes que saem da Hero; mudar o disco horizontal — `Out of scope` da
  tarefa.

## Landing

Toca:

- `components/organisms/hero/hero-scene.tsx`: sai tudo que não é o buraco negro;
- `components/organisms/hero/black-hole-mesh.tsx`: o disco vertical;
- `components/organisms/hero/black-hole.ts`: as bordas do arco;
- `components/organisms/hero/black-hole-path.ts`: a caixa do caminho usa a borda maior.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

Decisões reversíveis, registradas antes do código:

- **Bordas do disco vertical:**
  - em `HOLE`: `halfHeight` (1,22, a borda de baixo) e `topHeight` (1,30, a borda de cima);
  - no shader: `outer = mix(1,22, 1,30, smoothstep(−0,2, 0,6, sen θ))`. Embaixo, onde
    sen θ ≤ −0,2 (θ de 191° a 349°), a borda fica exatamente 1,22.
- **Pés do arco (`foot`):** `foot = 1 − smoothstep(0,15, 0,42, |sen θ|)`, de 1 sobre a horizontal
  a 0 perto de 25°. A borda de fora cresce até 1,6 R conforme `foot`. Nessa faixa, o gás e o
  brilho passam ao do disco horizontal, lido no plano dele (raio e ângulo de `disk()`), com
  peso inteiro.
- **O canvas da constelação (`hero-lens`) fica:** o laço da Hero tira dele o tamanho. Sem título,
  ele não desenha nada.

## Checks

### S1 - Só o buraco negro · 1 file · ~2 KB

**C1** - Carregar `/` não pede nenhum `/models/glass/*.glb`; fora de 4,8 R do centro, nenhum
pixel da Hero passa de 8 níveis do fundo (1). Proof: `probe.mjs` › "only the black hole"

**C2** - `#hero` não tem `h1`, `p`, `a` nem texto, e o canvas `hero-lens` está todo
transparente (2). Proof: `probe.mjs` › "no text, no 2D drawing"

### S2 - Disco vertical mais grosso em cima · 2 files · ~15 KB

**C3** - No raio para cima, o disco vertical acaba a 1,30 R ±0,05 (último ponto com
luminância > 0,2 antes de 1,8 R) (3). Proof: `probe.mjs` › "thicker on top"

**C4** - No raio para baixo, ele acaba a 1,22 R ±0,05, e o fonte fixa a borda de baixo em
1,22 onde sen θ ≤ −0,2 (4). Proof: `probe.mjs` › "unchanged below" e `source.ts` › "bottom
edge stays 1.22"

### S3 - Ligado ao horizontal · 1 file · ~12 KB

**C5** - O fonte alarga os pés até 1,6 R onde |sen θ| < 0,42 e usa o gás do disco horizontal ali
(5). Proof: `source.ts` › "feet widen into the disk"

**C6** - Sobre a horizontal do centro, dos dois lados, de 1,05 R a 2 R, a luminância nunca cai
abaixo de 60% da luminância a 2 R (6). Proof: `probe.mjs` › "no dark gap at the sides"

**C7** - O gás do vertical e o do horizontal saem da mesma função `wisps`, com `uInnerTurn` e
`uOuterTurn` (7). Proof: `source.ts` › "both disks share the gas"

### Herdadas

**C8** - Nenhuma dependência nova; `WANDER` e `DISK` não mudam (8). Proof: `git diff
--exit-code 993200c -- package.json package-lock.json` e `source.ts` › "pace and horizontal disk
unchanged"

**C9** - Compila e passa no lint. Proof: `npx tsc --noEmit -p .` e `npm run lint`

## Handoff

~10k tokens: um lote só.

## Swept

- concurrency: C7 (mesmo `uTime` nos dois discos)
- o resto: not in scope (a tarefa os põe em n/a)
