# Changelog

Todos los cambios relevantes de SeguAlaFija. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto usa
[versionamiento semántico](https://semver.org/lang/es/); ver
[docs/versionamiento.md](docs/versionamiento.md).

## [No publicado]

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

[No publicado]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/releases/tag/v0.1.0
