# Changelog

Todos los cambios relevantes de SeguAlaFija. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto usa
[versionamiento semántico](https://semver.org/lang/es/); ver
[docs/versionamiento.md](docs/versionamiento.md).

## [No publicado]

## [0.11.0] - 2026-10-07 · Sprint 9
### Agregado
- Impacto de los descuentos en `/admin`: por cada regla (y sin descuento, para comparar), veces que se eligió, órdenes, compras pagadas, conversión, descuento otorgado y prima cobrada.
- Experimentos A/B de pesos del recomendador: asignación estable por sesión anónima, sin tocar elegibilidad ni precio ni a quien ajustó sus pesos. En `/admin`, resultados por variante (elegida la recomendada, fue a pagar, compró, conversión y valor p) y botón para iniciar o detener. Guía en `docs/experimentos.md`.
- Registro de pólizas externas desde el PDF: se leen aseguradora, número, plan, vigencia, placa y prima para que el usuario los confirme. El archivo no se guarda; los PDF escaneados (sin texto) se completan a mano.
- Prima anual opcional al registrar una póliza externa.
### Cambiado
- Los eventos `oferta_elegida` y `checkout_enviado` llevan los descuentos de la oferta, y `resultados_vistos` la variante del experimento.

## [0.10.0] - 2026-10-07 · Sprint 8
### Agregado
- Motor de descuentos y tarifas especiales: reglas por aseguradora que se prenden y apagan, con fuente (la aseguradora o la plataforma), porcentaje o valor fijo, tope en pesos, tipo de vehículo, planes y vigencia.
- Configuración general en `/admin`: interruptor de todos los descuentos y descuento total máximo (apetito de descuento). Los cambios rigen en la siguiente cotización y quedan en la bitácora.
- La oferta muestra el precio de lista tachado y el nombre del descuento; el detalle, el comparador y el checkout muestran cada descuento. La orden guarda los descuentos aplicados.
- Guía en `docs/descuentos.md`.
### Cambiado
- El desglose de precio (IVA y cuota mensual) se calcula en un solo lugar (`src/domain/pricing.ts`).

## [0.9.0] - 2026-10-06 · Sprint 7
### Agregado
- Registro de pasarelas (`configuredProviders`, `PAYMENT_PROVIDER`) y webhook genérico `/api/webhooks/<pasarela>`. Cada orden y cuota se consulta con la pasarela con la que se creó. Guía en `docs/pasarelas.md`.
- Centro de preferencias en el perfil: qué tipo de mensaje (compras y pagos, vencimientos, sugerencias de ahorro) llega por correo o WhatsApp. Los transaccionales no se pueden apagar y los mensajes guardan su tipo.
- Guía de siniestros (`/siniestros`): qué hacer en un choque o un hurto, documentos y contacto por aseguradora, enlazada desde la póliza, la ayuda y el footer.
- App instalable: íconos PNG (192, 512 y maskable), ícono para iOS, service worker que solo guarda archivos estáticos y página sin conexión.
### Cambiado
- La pasarela simulada solo existe si no hay una real configurada.
- `channels` del usuario se reemplaza por `preferences` (tipo × canal).
### Corregido
- Contraste AA del texto sobre fondo coral (nuevo token `coral-ink`).

## [0.8.0] - 2026-10-06 · Sprint 6
### Agregado
- Elegibilidad antes del puntaje: se descartan los planes que no aceptan el uso declarado (por ejemplo, domicilios o plataformas) o que no cumplen lo que exige el banco si el vehículo está financiado. Los resultados muestran cuáles quedaron por fuera y por qué, y el checkout los rechaza.
- Empate técnico: si las dos mejores opciones quedan a menos de 2 puntos se marca como empate y se recomienda la más económica.
- Versión del algoritmo de recomendación en cada cotización y en *Cómo funciona*.
- Resumen editable al final del cuestionario, con "Editar" por sección.
- Máquina de estados de la orden con transiciones monótonas e historial.
- Emisión asíncrona con reintentos (1, 2, 4 y 8 minutos), clave de idempotencia por orden y alerta al cliente y a los administradores si falla tras 5 intentos. La conciliación diaria procesa los reintentos pendientes.
- Revalidación del precio en el checkout: si la tarifa cambió desde la cotización, se muestra el precio nuevo y se pide confirmar.
- Avisos de mora: la cuota vencida se avisa una vez (respetando la Ley 2300) explicando la terminación por mora del art. 1068 del Código de Comercio, y "Mis seguros" muestra la póliza en mora.
### Cambiado
- El precio se puntúa frente a la opción más barata (curva relativa) en lugar de la escala mínimo–máximo, para que diferencias pequeñas no muevan el ranking.
- La financiación pasa de penalización a requisito.
### Documentación
- Investigación completa de pagos, recomendador, integraciones, UX y cuenta en `docs/investigacion/`, resumida en `docs/01-investigacion.md`.
- Épica E17 del backlog con las funcionalidades derivadas y Sprint 6 sugerido.

## [0.7.0] - 2026-10-06 · Sprint 5
### Agregado
- Metadatos regulatorios por aseguradora: figura contractual y campos de conocimiento del cliente (`regulatory` en `InsurerAdapter`).
- Checkout con preguntas SARLAFT según la aseguradora (ocupación, ingresos, PEP), validadas también en el servidor.
- Aceptación de condiciones con un código enviado al correo antes de pagar, con evidencia (fecha, IP, navegador). La pasarela solo se habilita tras aceptar.
- Conciliación de pagos: panel en `/admin` y cron diario (`/api/cron/conciliacion`) que reporta pagos atascados, órdenes sin aceptar y errores de emisión.
- Registro de líneas de seguro (`src/domain/lines.ts`) con SOAT, hogar y viaje como "próximamente", y guía en `docs/nuevas-lineas.md`.
### Cambiado
- `POST /api/ordenes` ya no devuelve la URL de pago: devuelve los datos para la aceptación. El pago se obtiene en `POST /api/ordenes/aceptar`.
- Flujo de ramas documentado: la rama de desarrollo → PR → `main`.

## [0.6.0] - 2026-10-06 · Sprint 4
### Agregado
- Caché de cotizaciones de 15 minutos. La clave usa solo los datos que cambian la tarifa.
- Compartir una cotización por enlace o WhatsApp. El enlace no lleva la placa y la fecha de nacimiento se reduce al año.
- Re-cotización al renovar: a 45 días del vencimiento, si hay una opción con al menos la misma cobertura y 5% o más de ahorro, se muestra en la cuenta y en el recordatorio.
- `/pqr`: peticiones, quejas y reclamos con número de radicado, plazo de 15 días hábiles y gestión en `/admin`. Incluye sección del Defensor del Consumidor Financiero.
- Bitácora de auditoría de las acciones del panel de administración.
- Auditoría de accesibilidad con axe (WCAG 2.2 AA, modo claro y oscuro) en las pruebas E2E.
- Versión, commit y destino del build visibles en el footer.
- `CHANGELOG.md`, política de versionamiento y documento de estado del proyecto.
### Cambiado
- Acceso a `/admin` con el código por correo y la variable `ADMIN_EMAILS` (roles `admin` y `analista`). **Reemplaza a `ADMIN_PASSWORD`.**
- El despacho de recordatorios ahora es asíncrono.
### Corregido
- Contraste del verde (textos y badges), del botón de WhatsApp y del texto de la placa.

## [0.5.0] - 2026-10-06 · Sprint 3
### Agregado
- Prioridades ponderadas: tres controles que suman 100%.
- Ficha de la oferta con exclusiones, prima sin IVA más IVA del 19% y condicionado por plan.
- Evidencia versionada de cada consentimiento (fecha, IP, navegador y origen).
- Derecho de retracto en 5 días hábiles desde la póliza.
- Festivos de Colombia (Ley Emiliani) y un solo contacto diario agrupado en los recordatorios.
- Selector de tema claro, oscuro o sistema.
- Pruebas E2E con Playwright en la CI.
### Seguridad
- `/api/eventos` rechaza `pago_aprobado` (solo lo registra el servidor) y limita el tamaño de lo que recibe.
- Un solo intento de pago activo por cuota, para evitar dobles cobros.
### Corregido
- Contraste AA de los botones primarios, cuota pendiente por PSE, header tras iniciar sesión, recaudo con cuotas y campo de placa.

## [0.4.0] - 2026-10-06 · Investigación y diseño
### Agregado
- Investigación (benchmark y regulación) y backlog por épicas en `docs/`.
- Campo de placa con apariencia colombiana, panel lateral del cuestionario y de resultados en escritorio, y sección educativa en la home.

## [0.3.0] - 2026-10-06 · Iteración 2
### Agregado
- Preguntas de kilometraje y conductores, pago mensual en 12 cuotas, analítica del embudo, modo oscuro y sesión en el header.

## [0.2.0] - 2026-10-06 · MVP comprable
### Agregado
- Checkout sin registro, pagos con Wompi y pasarela simulada, emisión de póliza, cuenta con código por correo, billetera de pólizas y vehículos, recordatorios (Ley 2300), centro de ofertas y panel de administración.
- Demo estática en GitHub Pages.

## [0.1.0] - 2026-10-06 · Base
### Agregado
- Cotización por placa, motor de recomendación explicable, adaptadores simulados de SURA y Seguros Bolívar, resultados y comparador.

[No publicado]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/releases/tag/v0.1.0
