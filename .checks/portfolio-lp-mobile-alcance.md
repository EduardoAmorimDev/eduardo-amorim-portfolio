# Landing page do portfólio — Alcance estável no celular

Sources:

- `.tasks/portfolio-lp-mobile-alcance.md` - a task, 7 critérios.

## Out of scope

- Globo e hero; páginas como imagem - a task.

## Landing

Toca `lib/use-static-page.ts` (a cópia congela animações), `notebook/stages.ts` (`restRenderScale`),
`handheld.tsx` e `laptop.tsx` (escala fixa e `zIndexRange` constante em touch), `scaled-page.tsx`
(`data-scale`) e `notebook.tsx` (DPR fixo em touch, sem `AdaptiveDpr`). Reaproveita `useFinePointer`.

- Nada aqui é difícil de reverter

## Checks

### S1 - Alcance estável · 7 files · ~9k

**C1** - Os brilhos dentro de cada iframe têm `animation-name: none`
Proof: `npx playwright test e2e/mobile.spec.ts -g "the device pages hold still"`

**C2** - Em touch, cada página tem um único `data-scale` numa passada para baixo e para cima, igual a `restRenderScale`
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch each device page keeps one scale"`
Proof: `node --test components/organisms/notebook/stages.test.ts` (`restRenderScale`)

**C3** - Em touch, com a CPU 6× mais lenta, o canvas do Alcance tem um único tamanho de buffer numa passada, com razão de 1,25
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch the alcance canvas never resizes"`

**C4** - Em touch, o `z-index` de cada página assume um único valor numa passada
Proof: `npx playwright test e2e/mobile.spec.ts -g "on touch the device pages keep their stacking"`

**C5** - O recorte do celular e do tablet tem `border-radius` 0
Proof: `npx playwright test e2e/mobile.spec.ts -g "the handheld glass keeps square corners"`

**C6** - A passagem no desktop difere no máximo 5%
Proof: `npx playwright test e2e/notebook.spec.ts -g "the stage hands over to the real page"`

**C7** - `e2e/mobile.spec.ts` inteiro passa
Proof: `npx playwright test e2e/mobile.spec.ts`

## Swept

- Ver a task; nada novo.
