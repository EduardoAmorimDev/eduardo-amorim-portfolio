# Landing page do portfólio — hero cinematográfico (Gargantua)

> Build this with **tlc-implement**. Every criterion below becomes a check with a proof, referenced
> by its number. Nothing under `Unresolved` gets settled while building.

## Intent

O hero parece datado ("cara de 2010", nas palavras do usuário):

- céu denso de estrelas com reflexos em cruz;
- logo de vidro azul saturado atrás de um título gigante centralizado;
- buraco negro reduzido a um anel de distorção quase invisível no canto.

Nada ali impacta quem abre o portfólio.

O hero vira uma cena cinematográfica com um buraco negro protagonista, no estilo de Gargantua:

- disco de acreção fino e luminoso, dobrado pela gravidade (arco por cima e por baixo da sombra);
- um lado mais brilhante pelo efeito Doppler;
- poucas estrelas finas, lenteadas ao redor;
- gradação de cor fria nas cores da marca, grão de filme e vinheta.

O texto fica à esquerda, em tipografia editorial.

6 critérios · 1 one-way door · 0 em aberto.

## Criteria

1. Sempre, a cena é um único shader de tela cheia que traça cada raio de luz na métrica de
   Schwarzschild (r_s = 1). Raios que caem em r < 1 são a sombra preta. Raios que cruzam o plano
   do disco entre r = 3 (ISCO) e r = 22 somam a luz do disco. Os demais mostram o céu na direção
   em que escaparam, então a lente sobre as estrelas e o anel de fótons saem da própria física.
2. Sempre, o disco é mais quente perto do centro: o brilho cai com o raio. O lado que se aproxima
   da câmera é mais claro e mais azul (Doppler: brilho ∝ D³). O disco gira no ritmo de Kepler,
   com velocidade angular ∝ r^-1,5.
3. Em telas largas, o buraco negro fica à direita e o texto à esquerda. Em telas em pé, o buraco
   negro fica na metade de cima e o texto embaixo.
4. Quando o mouse se move, a câmera gira até 3° na direção dele, amortecida. Quando a página rola
   pelo hero, a câmera se aproxima do buraco negro.
5. Sob `prefers-reduced-motion`, a cena fica parada: o disco não gira, a câmera não se move e o
   mouse não move a câmera.
6. Sempre, o hero não tem o logo de vidro, os ícones, a grade, a lente 2D do mouse nem o título
   em contorno. O título, o subtítulo e o CTA continuam sendo HTML real.

## Out of scope

- O texto definitivo do hero (continua lorem até decidirem).
- Os assets `public/models/glass/*.glb`, que podem voltar em outro lugar.
- Os testes do hero antigo: saem junto com os módulos que testam, e um e2e novo cobre o hero novo.
  Esse trabalho fica no passo de testes que o usuário pediu.

## Swept

- validation: n/a - só ponteiro e scroll.
- failure modes: existing - sem WebGL, o `<Canvas>` não desenha e o texto continua legível sobre
  o fundo preto da seção.
- idempotency and retry, authorization, concurrency, data lifecycle: n/a.
- external-dependency failure: n/a - nada vem da rede.
- state transitions: n/a.
- observability: n/a.

## Impact

| Front       | What changes                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| domain      | `Gargantua` (novo, `components/organisms/hero/gargantua.tsx`): a cena; shader em `gargantua-shader.ts` |
| domain      | módulos do hero antigo (campo, grade, lente, ícones de vidro, céu) saem do projeto                     |
| stored data | nothing to migrate                                                                                     |

## Decided

| Decision                                               | Shape                                                                              | Alternative rejected                                                                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| O buraco negro é um ray tracer em shader de tela cheia | `ShaderMaterial` num quad de tela cheia; integração do raio com `a = -1,5 h² r̂/r⁴` | malhas (esfera + discos + lente 2D, o hero de antes): a lente era uma aproximação desenhada à parte, e o disco não se dobrava como um disco real |

## Sources

- Conversa com o usuário (2026-11-03): "refatore a HERO. Quero que mantenha o buraco negro e a
  pegada astronomica, mas parece que está meio com cara de 2010... quero algo lindo e
  impcatante."
- Escolhas do usuário: "Gargantua cinematográfico" e "Remover do hero" (o logo de vidro).

## Unresolved

| #   | Kind | Question | Until answered |
| --- | ---- | -------- | -------------- |
| -   | -    | None     | -              |
