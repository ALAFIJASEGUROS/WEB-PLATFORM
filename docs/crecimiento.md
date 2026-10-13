# Crecimiento: tráfico, conversión y nuevos segmentos

Mejoras de solo código para carro y moto (versión 0.15.0). Lo que depende de terceros se indica en cada punto.

## Atraer tráfico
- **Páginas por marca y línea** (`/seguros/carro/mazda/mazda-2`): precio de referencia por año y por ciudad,
  preguntas frecuentes con datos estructurados (FAQPage) y un botón que abre el cuestionario con la marca y la
  línea ya elegidas (`?marca=…&modelo=…&origen=seo`). Se generan en la compilación desde el catálogo y están en el
  sitemap. Cuando el catálogo venga de la guía de valores (HU-03.6), se generan solas para todos los modelos.
- **Calculadoras** (`/calculadoras`): cuánto cuesta asegurar un carro o una moto sin dar la placa, cuánto se paga
  de deducible y si conviene todo riesgo o solo responsabilidad civil. El salario mínimo de referencia es editable
  porque cambia cada año.

## Convertir a quien no compra en línea
- **"Que me llamen"** en resultados: nombre, celular, franja horaria dentro de la Ley 2300 de 2023 y autorización
  de contacto versionada como evidencia. Llega a la bandeja **Oportunidades** del admin con la cotización a la mano;
  allí se marca como contactada, vendida o perdida (queda en la bitácora) y se exporta a CSV.
- **Guardar la cotización por correo**: con autorización, se envía el enlace y, si a las 24 horas no hay una compra
  con ese correo, un único recordatorio en horario permitido. El panel muestra cuántas se guardaron, cuántas
  recibieron recordatorio y cuántas terminaron en compra. Requiere Resend para enviar correos reales (HU-10.5).
- **Calificación de las aseguradoras** (`/aseguradoras`): quejas por cada 10.000 pólizas, días para pagar un
  siniestro y reclamaciones pagadas, llevados a una nota de 1 a 5 con umbrales públicos. Se muestra en cada
  oferta y en el comparador, sin cambiar el orden de la recomendación. **Los datos son simulados**: hay que
  cargarlos de los informes de la Superintendencia Financiera y de Fasecolda antes de operar.

## Multiplicar el alcance
- **Referidos**: ver [descuentos.md](descuentos.md#programa-de-referidos).

## Nuevos segmentos
- **Flotas** (`/flotas`): hasta 30 placas (carros y motos) en una sola cotización con la mejor opción por vehículo
  y el total anual; la empresa pide la propuesta y llega como oportunidad de tipo flota. Las condiciones por
  volumen se negocian con cada aseguradora.

## Eventos de analítica nuevos
`llamada_solicitada`, `cotizacion_guardada`, `flota_cotizada`, `referido_llego` (y `origen=seo` al iniciar la
cotización desde una página por marca).
