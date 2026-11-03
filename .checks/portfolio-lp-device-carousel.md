# Carrossel de dispositivos (smartphone → tablet → notebook)

Sources:

- `.tasks/portfolio-lp-device-carousel.md` - critérios 1-11, fases de `p`, respostas do usuário
- conversa (2026-11-03) - sem testes novos, tudo na `main`

Profile: `light` (sem declaração no `AGENTS.md`). Sem testes automatizados por decisão do usuário:
as provas são `tsc`, `eslint`, `next build` e uma sonda Playwright descartável (fora do repositório)
que tira screenshots e lê posições/estilos em pontos de `p`.

## Out of scope

- Testes novos ou ajustes nos e2e existentes que quebram (decisão do usuário).
- Persistir a trava entre cargas.

## Landing

Toca só `components/organisms/notebook/`. Reusa `<Html transform occlude="blending">`, a regra
`fit`, `useNearViewport`, `readColorToken` e o `ExtrudeGeometry` do three.

| One-way door                                            | Literal shape                                                                                                                                             | Alternative rejected                                                                                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smartphone e tablet em geometria de código              | `ExtrudeGeometry` de um retângulo arredondado (corpo) + `<Html transform>` com iframe, `DISTANCE_FACTOR` derivado da largura da tela como em `laptop.tsx` | `.glb` novo - não existe e exige ferramenta externa; `RoundedBox` do drei - amarra o raio do canto à espessura, celular fino sairia quase quadrado |
| Progresso amortecido uma vez para todos os dispositivos | `DeviceCarousel` amortece `progress` num ref compartilhado (`useFrame` prioridade -2); `Laptop` deixa de amortecer                                        | cada dispositivo amortecer o seu - os três sairiam de passo nas trocas                                                                             |

- Nothing else in this change is hard to reverse

## Checks

### S1 - Smartphone entra girando · 4 files · ~25 KB · ~8k

**C1** - Em `p = 0` só o smartphone aparece, menor e girado; em `p = 0,20` está no centro, de frente
Proof: sonda - screenshots em `p = 0` e `0,25` + `rotation`/`position` lidos do grupo

**C2** - A tela do smartphone mostra `SCREEN_URL` num iframe de 390 px de largura
Proof: sonda - `iframe[width="390"]` com `src` = `SCREEN_URL`

### S2 - Smartphone sai, tablet entra e gira · ~6k

**C3** - Em `p = 0,30 → 0,45` o smartphone sai pela esquerda e o tablet chega ao centro
Proof: sonda - screenshot em `p = 0,40` e `0,50`

**C4** - O tablet entra em 820 × 1180, gira 90° em Z em 0,45-0,55 e o iframe vira 1180 × 820, de pé
Proof: sonda - atributos do iframe do tablet em `p = 0,46` e `0,60` + screenshot

### S3 - Laptop entra e abre · ~6k

**C5** - Em `p = 0,55 → 0,70` o tablet sai pela esquerda e o laptop entra fechado pela direita
Proof: sonda - screenshot em `p = 0,62` e `0,70`

**C6** - Em `p = 1` o iframe do laptop tem opacidade ≥ 0,9
Proof: sonda - `getComputedStyle(iframe1280).opacity`

**C7** - Fora das trocas há exatamente um dispositivo visível
Proof: sonda - screenshots em `0,25`, `0,50`, `1`

### S4 - Trava e telas · ~4k

**C8** - Depois de `p = 1`, rolar para o topo da página e voltar mantém o laptop aberto no centro
Proof: sonda - screenshot em `p = 0,10` após ter passado por 1

**C9** - Antes de `p = 1`, rolar para cima volta a animação
Proof: sonda - screenshot em `p = 0,10` após ir até 0,60 (smartphone de volta)

**C10** - Recarregar recomeça em `p = 0`
Proof: existing - a trava vive num `useRef`, que nasce `false` a cada carga

**C11** - Em 390 × 844 cada dispositivo parado cabe inteiro na tela
Proof: sonda - screenshots no viewport 390 × 844 em `0,25`, `0,50`, `1`

**C12** - Tipos, lint e build passam
Proof: `npx tsc --noEmit && npm run lint && npm run build`

## Handoff

S1-S4 ≈ 24k, todos em `notebook/`: um agente só, sem handoff.

## Swept

- validation: n/a - só scroll, já limitado a 0..1
- failure modes: existing - `findParts` do laptop; geometria nova não tem arquivo
- idempotency: n/a - nada é gravado
- authorization: n/a - página pública
- concurrency: C8, C9 - trava monotônica
- data lifecycle: C10
- dependency failure: existing - iframe com fundo `bg-ink`
- state transitions: C1, C3, C5, C6, C8, C9
- observability: n/a - componente visual
