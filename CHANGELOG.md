# Changelog

Todos los cambios relevantes de SeguAlaFija. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto usa
[versionamiento semántico](https://semver.org/lang/es/); ver
[docs/versionamiento.md](docs/versionamiento.md).

## [No publicado]
### Agregado
- Beneficio para empleados, fase 3 (panel de la empresa en `/empresas/[slug]/admin`):
  - Acceso con roles administrador y solo lectura; los asigna SeguAlaFija en la sección "Empresas" de `/admin`.
  - Resumen: inscritos, pendientes, invitados sin entrar, tramo actual y siguiente, y ahorro anual del equipo.
  - Bandeja para aprobar o rechazar vinculaciones una por una o en lote, con motivo; cada empleado recibe un correo.
  - Invitar empleados pegando una lista o subiendo un CSV (nombre, correo), con aviso de repetidos, inválidos y quienes ya estaban. Los invitados no cuentan para el tramo hasta que entran; al entrar quedan aprobados.
  - Configurar quién paga, el aporte del copago, el cierre de la inscripción y los planes habilitados.
  - Tabla de empleados (sin placa, fecha de nacimiento ni respuestas del cuestionario), reporte para nómina en CSV y bitácora de la empresa.
  - El portal del empleado enlaza el panel a quien lo administra, y los invitados ven "Aceptar la invitación".

### Agregado
- Beneficio para empleados, fase 2 (portal del empleado):
  - Portal `/empresas/[slug]` con el logo de la empresa: quién paga, planes disponibles, inscritos y avance hacia el siguiente tramo, y fecha de cierre de la inscripción.
  - Vinculación con el correo corporativo (dominio de la empresa) o con el código de la empresa (también por enlace `?codigo=`); queda pendiente de aprobación. Si la empresa invitó al correo, la vinculación se asocia a la cuenta.
  - Cotizar como empleado (`/cotizar/auto?empresa=…`): solo los planes que habilitó la empresa, con la tarifa del tramo actual y un aviso con el tramo siguiente. En resultados el botón es "Elegir este plan": la elección se guarda y se paga al cierre (fase 4).
  - El portal muestra el plan elegido, el precio estimado, la parte del empleado en copago y el precio cerca del siguiente tramo. "Mi cuenta" muestra el estado del beneficio.

### Cambiado
- Después de entrar con el código por correo, la redirección conserva parámetros simples de la ruta interna (p. ej. el código de la empresa).

### Corregido
- Dos enlaces internos a `/empresas` usaban `<a>` en vez de `Link`.

### Agregado
- Seguro como beneficio para empleados, fase 1 ([docs/empresas.md](docs/empresas.md)):
  - Página `/empresas` para captar empresas: cómo funciona, calculadora de ahorro por tramos, quién paga, preguntas frecuentes y formulario "Quiero el beneficio para mi empresa", que llega a la bandeja de oportunidades como "Beneficio empleados".
  - Sección "Empresas" en el admin: crear y editar empresas con logo, dominios de correo, código de vinculación, quién paga (empresa, empleado o copago), planes habilitados y tramos de precio; ver inscritos, pendientes, tramo actual y cuántos faltan para el siguiente.
  - Tarifa corporativa por tramos (simulados: 5 % desde 10 inscritos hasta 14 % desde 100) como regla del motor de descuentos. No se acumula con otras promociones de la aseguradora (gana la más favorable y, si empatan, la corporativa) y respeta el tope global.
  - Empresa de demostración "Andina Logística (demo)" con 18 inscritos y 4 pendientes.

### Agregado
- Retomar la cotización: el avance del cuestionario se guarda en el navegador por 7 días. Al volver aparece "Tienes una cotización sin terminar" con el vehículo y el paso, y las opciones Retomar o Empezar de nuevo. Se borra al terminar.
- Analítica del cuestionario: cada paso visto se registra (`paso_cuestionario`) y el embudo del admin muestra hasta qué paso llegan las sesiones y cuántas se pierden en cada uno. También se mide cuántos retoman (`cotizacion_retomada`).

### Agregado
- Resultados: "¿Qué ganas con el plan superior?" muestra el costo extra al año y al mes de cada salto de plan y lo que suma (coberturas, deducible, responsabilidad civil y asistencias).
- La vigencia del precio se ve en la tarjeta de cada oferta y en el resumen del checkout ("Precio válido hasta el 29 de noviembre").
- Si la emisión no sale al primer intento, el cliente recibe un solo correo avisando que el pago está aprobado y la póliza va en camino; la página de espera explica el tiempo normal, a qué correo llega y que no debe volver a pagar.

### Corregido
- El nombre del vehículo ya no repite la marca ("Mazda 2 2022" en lugar de "Mazda Mazda 2 2022") en resultados, perfil, checkout, póliza, correos y admin.
- Con una sola opción, los títulos dicen "1 opción"; si la aseguradora no responde y no hay más opciones, el aviso invita a intentar de nuevo en vez de decir "mostramos las demás".

### Cambiado
- Por ahora la plataforma solo ofrece Seguros Bolívar: cotización, resultados, condicionados, calificación, defensor del consumidor y textos del sitio. SURA queda definida en el código (inactiva) para reactivarla. El filtro por aseguradora en resultados solo aparece cuando hay más de una.
- La regla de descuento de ejemplo de SURA se reemplaza por "Tarifa digital Bolívar" (carros, 5 %).
- El indicador de afinidad muestra solo el puntaje dentro del círculo y la palabra "afinidad" debajo.

### Agregado
- Contrato de adaptador de aseguradoras v2 (`ADAPTER_CONTRACT_VERSION = 2.0.0`): `issue` devuelve un estado (`emitida`, `pendiente`, `requiere_inspeccion` o `rechazada`), más `getIssueStatus`, `getPolicyDocument`, `healthcheck` opcional y capacidades por aseguradora (vigencia de la cotización, emisión asíncrona, inspección, documento).
- Tests de contrato reutilizables (`src/insurers/contract.suite.ts`) que debe pasar todo adaptador, simulado o real.
- Adaptador HTTP de Seguros Bolívar con modos `mock`, `sandbox` y `prod` (`INSURER_BOLIVAR_MODE`): token OAuth2, clave de idempotencia, clasificación de errores y catálogos de coberturas. El formato de la API es provisional hasta recibir la especificación.
- Sandbox falso de Bolívar (`/api/sandbox/bolivar`, solo fuera de producción) para probar el modo sandbox de punta a punta.
- Resiliencia por aseguradora: timeout propio dentro de un presupuesto de 8 s, un reintento ante errores técnicos y circuit breaker.
- Panel "Salud de las aseguradoras" en `/admin`: estado del circuito, sonda de conexión, latencia p50/p95 y tasas de error, timeout y rechazo.
- La página de la póliza enlaza el documento que entrega la aseguradora (`/api/polizas/{id}/documento`), con la misma regla de acceso que la póliza.
- Plan de trabajo para integrar Seguros Bolívar ([docs/bolivar.md](docs/bolivar.md)) y épica HU-23 en el backlog.

### Cambiado
- Un rechazo de suscripción marca la orden en error de inmediato, sin agotar los reintentos. Una emisión pendiente se completa en el siguiente intento con la misma clave de idempotencia.
- La caché de cotizaciones guarda por aseguradora: si una falla, se conserva lo que respondieron las demás y solo se vuelve a consultar la que falló.
- Las aseguradoras simuladas aceptan placas de prueba `REC*` (rechazo) y `PEN*` (emisión pendiente).

### Corregido
- La cotización simulada no respetaba una señal de cancelación que ya llegaba abortada.

## [0.15.0] - 2026-10-13 · Sprint 13 (crecimiento, carro y moto)
### Agregado
- Páginas por marca y línea (`/seguros/carro/...`, `/seguros/moto/...`) con precio de referencia por año y ciudad, preguntas frecuentes con datos estructurados y acceso directo al cuestionario con el vehículo elegido.
- Calculadoras: costo de asegurar un carro o una moto sin placa, deducible y "¿todo riesgo o solo RC?".
- "Que me llamen" en resultados con franja horaria dentro de la Ley 2300 y autorización de contacto; bandeja de oportunidades en el admin con estados, notas, bitácora y exportación a CSV.
- Guardar la cotización por correo con un único recordatorio a las 24 horas si no hubo compra.
- Calificación de servicio de las aseguradoras (datos simulados) en cada oferta, en el comparador y en `/aseguradoras`.
- Programa de referidos: enlace de invitación en la cuenta, descuento para la persona invitada (regla "solo con código de invitación", editable en el admin) y bono para quien invita al aprobarse el pago, que se anula con retracto o reembolso.
- Cotización de flotas (`/flotas`): varias placas, la mejor opción por vehículo, total anual y solicitud de propuesta.
### Corregido
- En el celular, un enlace largo en la bandeja de salida del admin ensanchaba toda la página.

## [0.14.0] - 2026-10-13 · Sprint 12 (carro y moto)
### Agregado
- Admin de demostración en GitHub Pages (`/admin`): solo lectura, con datos simulados y deterministas, y las mismas vistas del admin real.
- Detalle de cada orden en el admin: datos de la compra y del tomador, historial de estados, emisión, consentimientos y aceptación. Acciones para reintentar una emisión fallida y registrar un reembolso (nuevo estado `reembolsada`, con correo al cliente y registro en la bitácora).
- Exportación a CSV de órdenes, PQR y eventos, lista para Excel en español (separador `;`, BOM y protección contra fórmulas). Requiere rol `admin` o `analista` y queda en la bitácora.
- Gráfico de recaudo diario de pólizas emitidas (últimos 30 días) con tooltip y vista de tabla, y barras de conversión por variante en los experimentos.
- Resultados en el celular: filtros y orden en un panel inferior, con filtros nuevos de deducible y precio máximo y botón para limpiarlos.
- Comparador apilado en el celular (una tarjeta por atributo) y opción "Solo diferencias".
- Glosario (`/glosario`) y ayudas emergentes en contexto para deducible y valor asegurado.
- "Afinar" en resultados: ajustar los pesos y el deducible aceptado y reordenar las mismas opciones sin volver al cuestionario ni volver a cotizar (evento `pesos_afinados`).
### Corregido
- El total del gráfico de recaudo y el KPI cuentan las mismas órdenes (pólizas emitidas).

## [0.13.0] - 2026-10-07 · Sprint 11 (carro y moto)
### Agregado
- Cilindraje de la moto: viene de la placa o del catálogo, se muestra en el cuestionario y en el resumen, ajusta la tarifa (más de 125 cc y más de 250 cc) y descarta los planes que no aseguran ese cilindraje (por ejemplo, Moto Básico hasta 250 cc), explicando por qué.
- En motos el hurto pesa más en la recomendación; la oferta explica si lo cubre o advierte si no.
- Valor asegurado ajustable hasta ±20% sobre el de referencia, con explicación de su efecto en el precio y en una pérdida total.
- Kit de pruebas con usuarios en `docs/pruebas-usuarios.md`.
### Cambiado
- Versión del algoritmo de recomendación 2026.10-3.

## [0.12.1] - 2026-10-07
### Corregido
- En tablet y escritorio, la tarjeta de la oferta recomendada se desarmaba (columnas montadas) porque la línea "Pago seguro con Wompi" ocupaba la misma celda de la grilla que el detalle. Ahora va dentro del bloque de botones y el detalle tiene su columna fija.
- Con el precio en el botón ("Comprar por $X"), el botón ya no se sale de la tarjeta en escritorio: la compra va arriba a todo el ancho y "Comparar" debajo.
- Prueba E2E en escritorio que verifica el diseño de la tarjeta.

## [0.12.0] - 2026-10-07 · Sprint 10
### Agregado
- Inicio con la placa desde la portada: "Escribe tu placa → Ver mis precios" detecta carro o moto, abre el cuestionario con el vehículo ya buscado y registra el origen.
- Botón fijo "Ver mis precios gratis" en el celular cuando el llamado principal de la portada sale de la pantalla.
- Línea de confianza junto al botón de la oferta recomendada: pago seguro con Wompi y 5 días hábiles para arrepentirse.
- Experimentos A/B de interfaz: la variante se asigna antes de pintar (sin parpadeo, también en la demo estática), se registra la exposición (`experimento_visto`) y /admin muestra resultados por variante con inicio de cotización, elección, pago y valor p. Experimentos iniciales: portada con tarjetas o con placa, y botón "Lo quiero" o "Comprar por $X".
### Cambiado
- Textos orientados al beneficio: "Ver mis precios" en lugar de "Cotizar" en la portada y "Gratis · Sin registro · Sin llamadas de vendedores · Pagas en línea".
- El panel de experimentos de /admin pasa a llamarse "Experimentos A/B" e incluye los de pesos y los de interfaz.

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

[No publicado]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.15.0...HEAD
[0.15.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.12.1...v0.13.0
[0.12.1]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/ALAFIJASEGUROS/WEB-PLATFORM/compare/v0.11.0...v0.12.0
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
