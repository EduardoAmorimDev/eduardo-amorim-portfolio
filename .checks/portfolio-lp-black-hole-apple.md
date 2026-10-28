# Landing page do portfólio — lente em forma de maçã e Hero parada

Profile: `light` · handoff: `on`, um lote só. Base da feature: `8642951` (o commit da tarefa),
direto na `main` por decisão do usuário; sem push.

**Provas sem testes do repositório.** O usuário decidiu: "não faça testes nem rode os antigos".
As provas são scripts fora do repositório, no scratchpad da sessão
(`/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/a43d5673-cd23-4c14-b639-6f8d61e3badb/scratchpad/apple/`),
mais `tsc` e lint:

- `math.ts`: node, sobre os módulos puros;
- `probe.mjs`: Playwright, sobre o build de produção em `:3200`.

Sources:

- `.tasks/portfolio-lp-black-hole-apple.md` — os 11 critérios; os números entre parênteses são
  os critérios dela.
- `.tasks/references/portfolio-lp-black-hole-poles.png` e
  `.tasks/references/portfolio-lp-black-hole-lensing.png` — o formato, sem números.

## Out of scope

- Testes; linhas de campo desenhadas; conteúdo novo atrás do buraco negro; voltar com o texto;
  a luz do buraco negro — `Out of scope` da tarefa.

## Landing

Toca estes arquivos, todos em `components/organisms/hero/` exceto o último:

- `deflection.ts`: o raio da linha de campo e o anel de 1,6;
- `bent-light.tsx`: o shader usa ρ;
- `use-hero-field.ts` e `black-hole-path.ts`: horizonte fixo;
- `glass-elements.tsx`: ícones parados;
- `app/page.tsx`: sem `HeroCopy`.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

- Nada é difícil de reverter: nada persiste, nenhuma dependência nova.

Decisões reversíveis, registradas antes do código:

- **`sourceRadiusAt(r, φ, bend)`** em `deflection.ts` dá β = r − bend·α(ρ), com
  ρ = r / sen²φ e β = r quando sen²φ = 0. O shader faz a mesma conta, com sen²φ = (dy/|d|)²,
  e lê α pela tabela existente em ρ.
- **Horizonte fixo:** `horizonRadius(width, height)`, sem `sheetScale`, no laço e na caixa do
  caminho.
- **Ícones parados:** `GlassElement` perde o `useFrame` e os handlers de ponteiro; a pose fica a
  de `GLASS_LAYOUT`. `motionTarget` e `MOTION` ficam no módulo, sem uso na Hero.

## Checks

### S1 - Só o buraco negro se move · 1 file · ~8 KB · ~2k

**C1** - Sob movimento reduzido, dois quadros com 1 s de intervalo, com o ponteiro passando
sobre o `logo` entre eles, têm a caixa do `logo` (x 1080–1290, y 0–220) igual, a até 6 níveis
por canal (1, 2). Proof: `probe.mjs` › "icons hold still under the pointer"

### S2 - Lente em forma de maçã · 2 files · ~18 KB · ~5k

**C2** - `sourceRadiusAt` dá: o anel em 1,60 / 1,34 / 1,04 raio a 90° / 60° / 45°, ±3%; nenhum
anel fora da sombra a 30°; e θ₊ a 90° de 198 / 262 / 507 px, a 45° de 153 / 228 / 491 px e a 0°
de 96 / 192 / 476 px, para d = 96 / 192 / 476, ±4 px (3, 4, 5). Proof: `math.ts` › "apple lens"

**C3** - O shader de `bent-light.tsx` faz a mesma conta: ρ = θ / sen²φ, com sen²φ = (dy/|d|)²,
e β = θ − K·α(ρ) (3). Proof: `math.ts` › "shader follows the field line" (lê o fonte)

**C4** - Sob movimento reduzido, a sombra continua
redonda: a região escura medida tem largura e altura a ±4 px uma da outra (6). Proof:
`probe.mjs` › "the shadow stays round"

### S3 - Tamanho fixo · 2 files · ~25 KB · ~6k

**C5** - Em movimento, a largura da sombra medida em 3 instantes, com 4 s entre eles, não varia
mais que 4 px (7). Proof: `probe.mjs` › "the horizon keeps its size as it wanders"

### S4 - Hero sem texto · 1 file · ~2 KB · ~1k

**C6** - `#hero` não tem `h1`, `p` nem `a` (8). Proof: `probe.mjs` › "no copy in the hero"

### Regras herdadas

**C7** - A velocidade continua entre 5 e 15 px/s (9). Proof: `math.ts` › "pace unchanged"

**C8** - Nenhuma dependência nova (11). Proof: `git diff --exit-code 8642951 -- package.json
package-lock.json`

**C9** - Compila e passa no lint. Proof: `npx tsc --noEmit -p .` e `npm run lint`

## Handoff

~14k tokens de leitura: um lote só.

## Swept

- validation: not in scope - nenhuma entrada
- failure modes: existing - `Suspense`
- idempotency: not in scope
- authorization: not in scope - página pública
- concurrency: existing - a lente e a sombra leem o mesmo `hole`
- data lifecycle: not in scope
- dependency failure: not in scope
- state transitions: not in scope - nada alterna
- observability: not in scope - sem telemetria
