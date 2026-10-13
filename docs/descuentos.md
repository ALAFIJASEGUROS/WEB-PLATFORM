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
| Solo con código de invitación | La regla aplica únicamente si la persona llegó con un enlace de invitación válido (programa de referidos) |

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

## Medir el impacto
En el mismo panel, la tabla **Impacto en la conversión** muestra por regla:
- **Elegidas:** veces que alguien escogió una oferta con ese descuento.
- **Órdenes y pagadas.**
- **Conversión:** pagadas sobre elegidas.
- **Costo:** descuento otorgado en compras pagadas.
- **Prima cobrada.**

La fila "Sin descuento" sirve de referencia. Con analítica en memoria, los conteos se reinician con el servidor.

## Reglas iniciales (demo)
- Tarifa digital SURA: 5%, activa.
- Descuento motos Bolívar: 8% con tope de $60.000, solo motos, activa.
- Descuento por invitación: $25.000 a cargo de la plataforma, activa, solo con código de invitación.
- Bono de bienvenida SeguAlaFija: $30.000 a cargo de la plataforma, apagada.

Tope total inicial: 15%. La demo estática usa estas reglas fijas porque no tiene panel; allí cualquier código de
invitación con formato válido activa el descuento, porque no hay usuarios con los que validarlo.

## Programa de referidos
Quien tiene una póliza ve en su cuenta su enlace de invitación (`/?ref=CÓDIGO`). La persona invitada ve un aviso,
el código se guarda en su navegador por 30 días y, al cotizar y al comprar, el servidor lo valida: debe existir y
no puede ser de quien compra. Cuando se aprueba el pago, quien invitó gana un bono de $25.000 para su próxima
renovación; si la compra se retracta o se reembolsa, el bono se anula. El panel muestra compras, bonos y anulados.
Como el descuento y el bono los asume la plataforma, deben validarse con la figura de intermediación (HU-14.1).

## Pendiente
- Validar con un abogado los descuentos que asume la plataforma con su comisión, según la figura de
  intermediación que se adopte (HU-14.1).
- Cargar las tarifas especiales reales que acuerde cada aseguradora.
- Guardar la configuración en Supabase (hoy está en memoria y vuelve a los valores iniciales al reiniciar).
