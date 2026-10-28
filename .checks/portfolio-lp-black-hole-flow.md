# Landing page do portfólio — dipolo mais aberto, fluxo em volta do buraco negro e texto atrás

Profile: `light` · handoff: `on`, um lote só. Base: `0bd0f9e` (o commit da tarefa), direto na
`main` por decisão do usuário; sem push.

**Provas sem testes do repositório**, por decisão do usuário. As provas são scripts no
scratchpad da sessão, mais `tsc` e lint:

- pasta:
  `/tmp/claude-1000/-home-joao-eduardo-Documents-personal-eduardo-amorim-portfolio/a43d5673-cd23-4c14-b639-6f8d61e3badb/scratchpad/flow/`;
- `math.ts`: node, sobre os módulos puros e o fonte;
- `probe.mjs`: Playwright, sobre o build de produção em `:3200`.

Sources:

- `.tasks/portfolio-lp-black-hole-flow.md` — os 12 critérios (números entre parênteses).
- `.tasks/references/portfolio-lp-black-hole-brick-ring.png` — o problema da curva fechada.

## Out of scope

- Testes; desenhar linhas de campo ou fluxo; texto real; animar o fluxo — `Out of scope` da
  tarefa.

## Landing

Toca estes arquivos:

- `components/organisms/hero/deflection.ts`: o fator |sen φ|^0,5, o fluxo e o ponto lido;
- `components/organisms/hero/bent-light.tsx`: o shader corrigido, com o fluxo;
- `components/organisms/hero/behind-text.tsx`, novo: a parede de texto;
- `components/organisms/hero/hero-scene.tsx`: monta a parede de texto.

| One-way door | Literal shape | Alternative rejected |
| ------------ | ------------- | -------------------- |
| None         | -             | -                    |

Decisões reversíveis, registradas antes do código:

- **`behindPoint(x, y, bend)`** em `deflection.ts` dá o ponto lido. Recebe x para a direita e y
  para cima, em raios do horizonte, e soma:
  - a lente de dipolo, radial, com ρ = r / |sen φ|^0,5;
  - o fluxo a²·(x, −y)/r², com a = `FLOW.radius` = 1,6.

  O shader faz a mesma conta com y para baixo, onde o fluxo tem a mesma forma (o conjugado
  troca o sinal de y nos dois casos). O ângulo vem de `y² / r²`, nunca de `pow` com base
  negativa.

- **A parede de texto é um plano com `CanvasTexture`**, na camada de trás, a z = −4, com o dobro
  da vista nessa profundidade.
  - O canvas tem o dobro da Hero em CSS px, e por isso 1 px do canvas é 1 px da tela nessa
    profundidade.
  - É desenhado depois de `document.fonts.ready`, com a `font-family` calculada do `body`.
  - `fog={false}`, para manter os 40%.

  Rejeitado: a `Text` do drei, que busca uma fonte num CDN.

## Checks

### S1 - Nada some acima · 2 files · ~12 KB · ~3k

**C1** - `behindPoint` é espelhado na horizontal: para r de 1,05 a 8 e φ de 5° a 175°, o ponto
lido de (x, −y) é o espelho do de (x, y), a 10⁻⁹ (1). Proof: `math.ts` › "mirror symmetric"

**C2** - O shader não usa `pow` com base que possa ser negativa: o ângulo sai de um quadrado
(1). Proof: `math.ts` › "no pow of a signed value"

**C3** - Sob movimento reduzido, o `cursor`, acima da linha do centro do buraco negro, aparece:
mais de 300 pixels fora do fundo na caixa dele (1). Proof: `probe.mjs` › "the icon above
shows"

### S2 e S3 - Dipolo aberto e fluxo · 2 files · ~12 KB · ~3k

**C4** - O fator de ângulo é |sen φ|^0,5: 0,84 a 45° e 0,59 a 20°, ±0,01 (2). Proof: `math.ts` ›
"field factor"

**C5** - A soma cruza o centro a 2,17 / 1,83 / 1,43 R a 90° / 60° / 45°, ±3%, e não cruza
fora da sombra a 30° (4). Proof: `math.ts` › "where it crosses the centre"

**C6** - A 90°, d = 96 / 192 / 476 / 700 px aparecem a 258 / 320 / 548 / 752 px, ±4 px (5).
Proof: `math.ts` › "above and below"

**C7** - A 0°, d = 476 / 700 px aparecem a 420 / 665 px, ±4 px, e nenhum pixel sobre o eixo,
de 1 a 6 R, lê um ponto a menos de 3,2 R (6). Proof: `math.ts` › "at the poles"

**C8** - O shader soma o fluxo: `uFlow * uFlow * vec2(q.x, -q.y) / (theta * theta)` (3). Proof:
`math.ts` › "shader adds the flow"

### S4 - Texto atrás · 2 files · ~4 KB · ~1k

**C9** - Sob movimento reduzido, há texto pela Hero inteira: em pelo menos 10 das 12 faixas de
1440×75 px longe do buraco negro (fora de 300 px do centro), mais de 200 pixels ficam acima do
fundo em 8 níveis (7). Proof: `probe.mjs` › "text wall shows"

**C10** - O texto é lorem, fica numa textura (sem nó de texto no DOM da Hero) e está dentro do
canvas `aria-hidden` (8). Proof: `probe.mjs` › "text is not in the DOM"

**C11** - Sob movimento reduzido, duas capturas com 1 s de intervalo são iguais, a até 6 níveis,
longe do buraco negro (9). Proof: `probe.mjs` › "text holds still"

### Herdadas

**C12** - Nenhuma dependência nova (12). Proof: `git diff --exit-code 0bd0f9e -- package.json
package-lock.json`

**C13** - Compila e passa no lint. Proof: `npx tsc --noEmit -p .` e `npm run lint`

## Handoff

~8k tokens: um lote só.

## Swept

- validation / idempotency / authorization / data lifecycle / state transitions / observability:
  not in scope (a tarefa os põe em n/a)
- failure modes: C1–C3 (NaN acima do centro)
- concurrency: existing - a lente e a sombra leem o mesmo `hole`
- dependency failure: C12 (nada de CDN)
