# Descuentos y tarifas especiales

Las tarifas especiales y los descuentos se configuran sin tocar código, desde **/admin → Descuentos y
tarifas especiales**. El motor está en `src/domain/discounts.ts` y la configuración del servidor en
`src/server/discounts.ts`.

## Qué se puede parametrizar

**Configuración general (apetito de descuento)**
- Interruptor general: apaga todos los descuentos de una vez.
- Descuento total máximo (%): lo máximo que puede bajar una prima sumando todas las reglas.

**Cada regla**
| Campo | Para qué sirve |
| --- | --- |
| Aseguradora | Una en particular o todas (`*`) |
| Nombre visible | Lo que ve el usuario en la oferta, p. ej. "Tarifa digital SURA" |
| Quién lo asume | `aseguradora` (tarifa especial que nos da) o `plataforma` (sale de nuestra comisión) |
| Tipo y magnitud | Porcentaje (hasta 50%) o valor fijo en pesos (hasta $5.000.000) |
| Tope en pesos | Máximo de descuento de la regla |
| Aplica a | Carros, motos o ambos; y, si se quiere, solo ciertos planes |
| Vigencia | Fechas desde y hasta (inclusive) |
| Activa | Prender o apagar la regla sin borrarla |

## Cómo se combinan
1. Se toman las reglas activas, vigentes y que aplican a la oferta.
2. De cada fuente se usa **solo la más favorable**: dos reglas de la aseguradora no se acumulan.
3. Las de distinta fuente (aseguradora + plataforma) **sí se suman**, hasta el tope total.
4. Si se supera el tope, se recorta primero lo que asume la plataforma.
5. Los descuentos se expresan en miles de pesos; el precio final es el de lista menos los descuentos, y se
   recalculan el IVA y la cuota mensual.

El precio con descuento es el que entra al puntaje de recomendación y el que se cobra. El checkout vuelve a
cotizar en el servidor con las reglas vigentes: si una regla se apagó entre la cotización y la compra, se le
muestra al usuario el precio nuevo y se le pide confirmar. Cada orden guarda el detalle de los descuentos
aplicados, y cada cambio en el panel queda en la bitácora de auditoría.

## Reglas iniciales (demo)
- Tarifa digital SURA: 5%, activa.
- Descuento motos Bolívar: 8% con tope de $60.000, solo motos, activa.
- Bono de bienvenida SeguAlaFija: $30.000 a cargo de la plataforma, apagada.

Tope total inicial: 15%. La demo estática usa estas reglas fijas porque no tiene panel.

## Pendiente
- Validar con un abogado los descuentos que asume la plataforma con su comisión, según la figura de
  intermediación que se adopte (HU-14.1).
- Cargar las tarifas especiales reales que acuerde cada aseguradora.
- Guardar la configuración en Supabase (hoy está en memoria y vuelve a los valores iniciales al reiniciar).
