# Experimentos A/B

Los experimentos prueban otros pesos para una prioridad del cuestionario y miden si cambian las compras. Se definen
en `src/recommendation/experiments.ts` y se inician o detienen desde **/admin → Experimentos del recomendador**.

## Reglas (guardarraíles)
- Solo cambian los **pesos de una prioridad**, es decir, el orden de las ofertas. Nunca la elegibilidad, el precio ni los
  descuentos, y la comisión nunca es un factor.
- Si la persona ajustó sus propios pesos, el experimento no la toca.
- Cada sesión anónima cae siempre en la misma variante (hash estable del id de sesión). No se usan datos personales.
- Solo corre un experimento a la vez: el primero activo de la lista.

## Medición
- **Exposición:** la sesión vio resultados con la variante (`resultados_vistos` lleva `variante`).
- Para cada variante se mide qué porcentaje eligió la oferta recomendada, cuántas sesiones fueron a pagar y cuántas
  compraron (`pago_aprobado`, que registra el servidor).
- **Valor p:** prueba z de dos proporciones contra el control. No concluyas antes de 100 sesiones por variante; con
  menos, el panel lo advierte.

## Crear un experimento
1. Agrega un objeto a `WEIGHT_EXPERIMENTS` con un `id` nuevo (no reutilices ids: la asignación depende de él), la
   pregunta, las variantes con su `split` (que sume 100) y los `priorityWeights` de cada variante distinta del control.
2. Detén el anterior en /admin y despliega.
3. Si una variante gana, pásala a `PRIORITY_WEIGHTS` en `src/recommendation/scoring.ts` y sube `ALGORITHM_VERSION`.

## Pendiente
- Con analítica en memoria, los resultados se pierden al reiniciar. Con PostHog o Supabase (HU-01.5, HU-09.6) quedan
  persistentes y se pueden cruzar con retractos y quejas como métricas de control.

## Experimentos de interfaz
Prueban textos y diseño de los llamados a la acción. Se definen en `UI_EXPERIMENTS` (mismo archivo) y se activan o
desactivan en el código.

- **Sin parpadeo:** un script en `<head>` asigna la variante antes de pintar y marca `<html data-x-<id>="<variante>">`.
  Cada variante del HTML lleva `data-xv="<id>:<variante>"` y el CSS generado oculta las demás. Sin JavaScript se ve el
  control.
- **En componentes del cliente**, `useUiVariant(id)` devuelve la variante.
- **Exposición:** `useExperimentExposure(id)` registra `experimento_visto` una vez por sesión.
- **Resultados:** en /admin, por variante: inició cotización, eligió oferta, eligió la recomendada, fue a pagar, compró,
  conversión y valor p.

Experimentos iniciales:
| Id | Pregunta | Variantes |
| --- | --- | --- |
| `portada-cta-1` | ¿Empezar con la placa en la portada aumenta las cotizaciones? | Tarjetas Carro/Moto (control) · Campo de placa |
| `boton-oferta-1` | ¿Mostrar el precio en el botón aumenta las compras? | "Lo quiero" (control) · "Comprar por $X" |
