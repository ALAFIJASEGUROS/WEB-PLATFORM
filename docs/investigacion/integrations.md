# Integraciones con aseguradoras y arquitectura

> Investigación del 2026-10-06 con búsqueda web. Lo marcado como no verificado debe confirmarse antes de usarse en producción.

## 0. Antes de empezar: el repositorio ya no está vacío

El contexto dice que `alafijaseguros/web-platform` está vacío. Eso ya no es cierto. En `/home/user/WEB-PLATFORM` hay una app en **Next.js 16.3.8 + React 19.2 + Tailwind 4 + zod**, versión `0.6.0`, con deploy en Vercel (`vercel.json` con crons) y una demo estática en GitHub Pages. Las recomendaciones de este frente parten de ese código, no de cero:

| Ya existe | Archivo | Lo que le falta (va al backlog) |
|---|---|---|
| Contrato `InsurerAdapter` con `quote`, `issue`, `supports` y `regulatory` (KYC SARLAFT y figura contractual) | `src/insurers/adapter.ts` | `issue` no recibe una clave de idempotencia. No hay `getIssueStatus` ni emisión asíncrona. No hay `getDocument` (PDF), `version` del contrato ni `healthcheck` |
| Fan-out con `Promise.allSettled`, timeout de 4 s y resultados parciales | `src/insurers/aggregator.ts` | El timeout es el mismo para todas. No hay reintentos, circuit breaker, métricas por aseguradora ni clasificación de errores (rechazo de suscripción, error técnico o timeout) |
| Caché de cotizaciones de 15 min con clave por variables de tarifa | `src/insurers/cache.ts` | Vive en memoria (`globalThis`), así que cada instancia serverless tiene la suya y se pierde en cada deploy. Si una sola aseguradora falla, no se guarda nada; convendría cachear por aseguradora |
| `validUntil` en la oferta (15 días en el mock) | `src/insurers/mock/tariff.ts` | No se revalida el precio antes de cobrar. La caché dura 15 min y la vigencia 15 días, y nada las concilia |
| Webhook de Wompi idempotente y conciliación diaria | `src/server/orders.ts`, `reconciliation.ts` | `issuePolicy()` llama a `adapter.issue()` de forma síncrona dentro del flujo de pago. Un timeout de la aseguradora deja el pago aprobado sin póliza y sin cola de reintento |
| Persistencia | `src/server/db.ts` | Está en memoria. El propio `docs/estado.md` lo marca como bloqueado (HU-09.6) |
| Mocks con **nombres reales** (SURA y Bolívar) y precios simulados | `src/insurers/mock/insurers.ts` | El pedido habla de "aseguradoras ficticias". Usar marcas reales con tarifas inventadas es un riesgo legal y de confianza (ver Riesgos) |

## 1. Qué tan públicas son las APIs de las aseguradoras en Colombia

**Hallazgo central:** no encontré ninguna aseguradora colombiana con un portal de desarrolladores público y autoservicio para cotizar y emitir pólizas de autos. El acceso es B2B y siempre pasa por un convenio.

- **Comercializar exige figura de intermediario.** La intermediación de seguros está reservada a corredores, agencias y agentes [10][11]. Las plataformas digitales (comparadores, agregadores) necesitan contratos de agencia o corretaje con las aseguradoras, y ahí se fijan las condiciones de distribución digital [10]. La SFC ha dicho que las agencias de seguros no están bajo su vigilancia directa, mientras que los corredores sí lo están [10]. El costo regulatorio cambia según la figura que se elija: decisión de negocio y legal.
- **El mercado confirma que la integración depende de alianzas.** Seguro Canguro dice cotizar "todas las aseguradoras del país en segundos" gracias a alianzas con **13 compañías del ramo**, con inspección, firma, financiación y pago 100 % digitales [5]. Quálitas Colombia (especializada en autos) lo sumó como intermediario digital [4]. Busqo cotiza por placa con propuestas en tiempo real y apoyo de asesor [6]. Que existan no prueba que haya APIs públicas: muestra que se llega por convenio comercial.
- **Estado por aseguradora** (no verificado en fuentes primarias porque varios dominios estaban bloqueados; hay que confirmarlo con cada área comercial):

| Aseguradora | Lo que encontré | Qué pedir en el convenio |
|---|---|---|
| SURA | Habla de economía de APIs y open insurance. SURA Brasil tiene un hub de integración con gestión de APIs (Sensedia) [8]. Nada público para intermediarios en Colombia | Clave de intermediario, sandbox, especificación OpenAPI, SLA |
| Seguros Bolívar | No encontré un portal de APIs público [9] | Ídem |
| HDI Seguros (antes Liberty) | **Verificado:** HDI International (Grupo Talanx) cerró la compra de Liberty Seguros en Colombia el **1 de marzo de 2024**. Las pólizas continúan bajo HDI, que quedó como **2.ª aseguradora en autos** [1][2] | En la UI, Liberty debe aparecer como HDI |
| Seguros Mundial | Dice haber emitido más de **1,8 millones de pólizas** (sobre todo SOAT) a través de aliados tecnológicos [7]. Es una señal de apertura a integraciones | Candidato temprano para un piloto |
| Quálitas | Monorramo autos, ya trabaja con intermediarios digitales [4] | Candidato temprano |
| Allianz, Mapfre, AXA Colpatria | Solo cotizadores web para el público. No hallé APIs documentadas [12] | Convenio |
| Previsora, Equidad, SBS, Seguros del Estado | No encontré información sobre APIs. **Sin verificar** | Convenio |

- **Plataformas de infraestructura (alternativa o atajo):**
  - **Transfiriendo** (Colombia, más de 20 años, mayor volumen de transacciones SOAT): lanzó una plataforma para aseguradoras e intermediarios que integra cotización, emisión, facturación, recaudo y conciliación en autos, SOAT y otros ramos [3][13].
  - **Sekure** (Bogotá): plataforma cloud para que aseguradoras y corredores diseñen y distribuyan productos digitales [14].
  - **Guro** (Medellín): se presenta como la infraestructura tecnológica del sector asegurador [15].
  - **Gangkhar**: orquestación de embedded insurance para LatAm, ronda semilla de US$4,25 M en marzo de 2026 [16].
  - **123Seguro**: plataforma modular basada en API, multipaís [17].

  Ninguno publica qué aseguradoras de autos en Colombia tiene integradas por API. Hay que preguntarlo en una RFP. Si alguno ya las tiene, reduce N integraciones a una sola, a cambio de margen y de dependencia del proveedor.
- **Open insurance regulado (novedad de 2026):** el **Decreto 0368 de 2026** (vigente desde el 10 de abril de 2026) volvió **obligatorias** las finanzas abiertas para todas las entidades vigiladas por la SFC, **aseguradoras incluidas** [18][19]. Reemplaza el esquema voluntario del Decreto 1297 de 2022. Cada estándar da hasta **12 meses** para cumplir desde que se expide. La SFC tenía en consulta, hasta el 10 de agosto de 2026, un proyecto de Circular Externa 10 de 2026 [20]. Habrá un directorio oficial de participantes [19]. Al corte no se sabe si los estándares incluirán cotización y emisión o solo datos del consumidor (pólizas vigentes). Lo segundo ya sirve para que el usuario importe su "conjunto total de seguros" a su cuenta, con su consentimiento.

## 2. Datos del vehículo e identidad

| Necesidad | Fuente oficial | Proveedores encontrados | Notas para el producto |
|---|---|---|---|
| Datos por placa (marca, línea, modelo, clase, servicio, estado, VIN) | **RUNT**. Para empresas ofrece consulta uno a uno en su web o integración por web service/API, previo contrato y propuesta económica. Si quien consulta no es el titular, el RUNT le pide al titular autorización expresa por correo [21] | **Verifik**: `GET /v2/co/runt/vehiculo` con placa **y documento del propietario** [22][23]. **Truora**: check de tipo vehículo (país CO, placa y opcionalmente documento) que devuelve propietario, multas, SOAT y PEP. Es asíncrono [24] | Si el proveedor exige el documento del propietario, la "cotización solo con placa" se rompe. Hay que diseñar un flujo con placa y cédula, o un respaldo con marca, línea, modelo y año |
| Valor comercial y código Fasecolda | **Guía de Valores Fasecolda**: código de 8 dígitos (marca, tipo, consecutivo) [25] | **Verifik**: `GET /v2/co/fasecolda/values-by-code` [25] | Fasecolda prohíbe en sus términos el uso no autorizado de su información [26]. Hay que contratar una licencia o un proveedor autorizado. **Nada de scraping** |
| Identidad (cédula, PPT) | Registraduría | Verifik: validación de nombre contra número, estado del documento y fechas [27] | El nombre debe coincidir con el documento antes de emitir |
| Listas restrictivas, PEP y SARLAFT | Listas ONU, OFAC y otras | Truora incluye listas internacionales y PEP en Colombia [24]. Verifik anuncia AML [27], pero no verifiqué la cobertura de OFAC | La aseguradora suele hacer su propio SARLAFT. El agregador debería prefiltrar y guardar evidencia |
| Proveedor "Apitude" | No encontré evidencia de un proveedor con ese nombre para RUNT en Colombia | — | Se descarta salvo que alguien lo confirme |

## 3. Arquitectura recomendada del agregador

Ya existe la base hexagonal (dominio, adaptadores y agregador). Esto es lo que hay que añadir:

1. **Contrato de adaptador v2**
   - Métodos `quote`, `issue`, `getIssueStatus` y `getPolicyDocument`, más un `healthcheck` opcional.
   - Metadatos de capacidades: `supportsAsyncIssue`, `requiresInspection`, ciudades y años admitidos, tipos de vehículo y `quoteTtl`.
   - Versión semántica del contrato y tests de contrato compartidos que todo adaptador debe pasar.
2. **Modelo canónico**
   - Ya existen `Vehicle`, `Offer`, `CoverageKey` y `ServiceKey`. Faltan: `fasecoldaCode`, el id de cotización de la aseguradora (`externalQuoteId`), `validUntil` real, desglose de prima e IVA, deducibles por cobertura, estado de emisión (`pendiente` / `emitida` / `rechazada` / `requiere_inspección`) y `rawPayload` guardado para auditoría.
   - Catálogo de equivalencias por aseguradora (sus códigos de cobertura frente a los `CoverageKey`).
3. **Fan-out resiliente**
   - Timeout configurable por aseguradora y presupuesto total de unos 6–8 s.
   - Respuesta progresiva por streaming (Server Components con Suspense o SSE): mostrar las ofertas a medida que llegan.
   - **Un** reintento con backoff y jitter solo ante errores técnicos idempotentes (5xx o red). Nunca ante un rechazo de suscripción.
   - **Circuit breaker** por aseguradora con estado compartido (Redis o Postgres, no en memoria): abierto, se omite y se muestra "no disponible".
4. **Caché y vigencia del precio**
   - Caché compartida (Redis/Upstash o una tabla en Postgres), **por aseguradora**, para no perder lo que sí respondió.
   - TTL igual a `min(quoteTtl de la aseguradora, política interna)`.
   - Antes de cobrar, **revalidar** la cotización (re-quote o `validate`). Si el precio cambió, avisar al usuario.
   - Persistir cada cotización con id propio para poder compartir el enlace y medir el embudo.
5. **Idempotencia y emisión asíncrona**
   - `Idempotency-Key = orderId` en `issue`. Tabla `issuance_attempts` con estado.
   - La emisión sale del webhook de pago hacia una **cola** (outbox pattern: el pago aprobado escribe un evento en la misma transacción).
   - Un worker emite, hace polling de `getIssueStatus` o recibe el webhook de la aseguradora, reintenta con dead-letter queue y alerta a operaciones.
   - Si la emisión falla definitivamente, el usuario entra en un flujo de reembolso o gestión manual.
6. **Documentos**
   - La póliza PDF y el condicionado se descargan y guardan en object storage privado (Supabase Storage, S3 o Vercel Blob).
   - Se entregan con URLs firmadas de corta duración. Se guardan hash y versión del condicionado aceptado.
7. **Observabilidad**
   - Trazas OpenTelemetry por aseguradora: latencia p50/p95, tasa de error, de timeout y de rechazo.
   - Sentry para errores y PostHog para el embudo (ya previstos en el backlog, HU-01.5 y HU-12.4).
   - Logs sin PII (enmascarar cédula y placa).
   - Panel de salud por aseguradora en `/admin`.
8. **Seguridad de integraciones**
   - Secretos por aseguradora en un gestor de secretos; mTLS u OAuth2 client-credentials según lo que pida cada una.
   - Firma HMAC en webhooks entrantes.
   - Auditoría de payloads, conforme a la Ley 1581 y al registro RNBD.
9. **Simulador (sandbox propio)**
   - Al menos dos aseguradoras **ficticias** (por ejemplo "Aseguradora Andina" y "Cóndor Seguros"), cada una con su propio formato de payload, para probar de verdad la capa de mapeo.
   - Tarifa por reglas: valor Fasecolda × tasa por edad, ciudad, uso y siniestros.
   - Latencia configurable con distribución aleatoria. Errores inyectables (500, timeout, rechazo por suscripción, inspección requerida).
   - Emisión asíncrona con webhook diferido. Escenarios activables por placa, que ya existe con `ERR*`, o por cabecera.
   - Servirlo como servicio HTTP separado (por ejemplo una ruta `/sandbox/*` o un contenedor) para que el adaptador use `fetch` real y no una función local.

## 4. Stack técnico: opciones con pros y contras

El equipo ya migró del prototipo Vite a **Next.js 16 (App Router)** en Vercel. El `AGENTS.md` advierte que esta versión trae cambios incompatibles y pide leer `node_modules/next/dist/docs/`.

| Capa | Opción | Pros | Contras |
|---|---|---|---|
| Web/SSR | **Next.js 16 (actual)** | Ya está construida. SSR y SEO para landings, Server Actions, streaming de resultados, encaja con Vercel | Cambios frecuentes entre versiones. Lógica de backend mezclada con la UI si no se separa |
| Web/SSR | React Router 7 (modo framework) | Cercano al prototipo de Figma Make (que ya usaba RR7), loaders y actions simples, despliegue más portable | Reescribir lo ya hecho en Next. Ecosistema de Vercel menos integrado |
| Backend del agregador | Dentro de Next (route handlers y módulos `server-only`, como hoy) | Un solo deploy, rápido para un MVP | Las funciones serverless tienen límites de duración. Workers y colas quedan incómodos. Se acopla al runtime del frontend |
| Backend del agregador | Servicio aparte en **NestJS** o **Fastify** (Node/TS) | Workers de emisión de larga duración, colas, mTLS hacia aseguradoras, IP fija para listas blancas (muchas aseguradoras la exigen; **sin verificar** por compañía) | Más infraestructura (Fly, Render, Railway o AWS) y más costo operativo. NestJS es más pesado; Fastify más liviano pero con menos estructura |
| BD | **PostgreSQL en Supabase** | Postgres administrado con auth, storage y RLS. **Supabase Queues (pgmq)** da una cola durable dentro de Postgres [28] | Dependencia del proveedor. Hay que revisar residencia de datos: la región debe ser compatible con la transferencia internacional que permite la Ley 1581 |
| BD | Postgres en Neon o RDS | Más control | Auth, storage y colas por separado |
| Colas | Supabase Queues (pgmq) | Sin otra pieza de infraestructura, con la transaccionalidad del outbox | El polling corre a cargo del worker |
| Colas | Vercel Queues | Nativo de Vercel | **En beta pública desde el 27 de febrero de 2026.** No encontré fecha de GA [29] |
| Colas | Upstash QStash/Redis, BullMQ, SQS | Maduros; Redis sirve también para la caché y el circuit breaker | Una pieza más |
| Auth | Supabase Auth (OTP por correo y WhatsApp) frente a la OTP propia actual | Menos código propio y rate limiting incluido | La OTP actual ya cumple el flujo de compra como invitado |
| Hosting | Vercel (front) + worker aparte | Previews por PR y CDN | IP de salida no fija salvo add-ons o un proxy |

## 5. Secuencia sugerida

1. Elegir la figura de intermediación (agencia o corredor) y firmar convenio con una o dos aseguradoras abiertas a lo digital (por ejemplo Quálitas, Mundial, HDI o SURA), o contratar un orquestador (Transfiriendo, Sekure, Guro) previa due diligence.
2. Mientras tanto: simulador de aseguradoras ficticias, adaptador v2, Postgres, cola y outbox.
3. Proveedor de RUNT y Fasecolda autorizado (Verifik o Truora, o convenio directo con el RUNT) con un flujo de consentimiento del titular.
4. Prepararse para los estándares de open insurance del Decreto 0368 de 2026 (importar pólizas a la cuenta).

**Advertencia:** varias páginas oficiales (SFC, docs de Verifik y Truora, Portafolio, Forbes) estaban bloqueadas por el proxy de red. Los datos de esas fuentes salen de los extractos del buscador y hay que volver a verificarlos antes de comprometerlos contractualmente.

## Funcionalidades sugeridas

| Prioridad | Funcionalidad | Descripción |
| --- | --- | --- |
| MVP | Contrato de adaptador v2 (InsurerAdapter) | Extender src/insurers/adapter.ts con idempotencyKey en issue, getIssueStatus, getPolicyDocument, healthcheck, metadatos de capacidades (quoteTtl, requiresInspection, asyncIssue) y versión del contrato; suite de tests de contrato que todo adaptador debe pasar |
| MVP | Simulador de 2+ aseguradoras ficticias | Servicio HTTP de sandbox con nombres ficticios, payloads distintos por aseguradora, tarifa por reglas (valor Fasecolda, edad, ciudad, uso, siniestros), latencia aleatoria, errores inyectables (5xx, timeout, rechazo, inspección) y emisión asíncrona con webhook diferido |
| MVP | Reemplazar marcas reales en mocks | Cambiar SURA y Bolívar simuladas (src/insurers/mock/insurers.ts) por aseguradoras ficticias hasta tener convenio |
| MVP | Fan-out resiliente con streaming | Timeout por aseguradora, presupuesto global, un reintento con backoff y jitter solo en errores técnicos, circuit breaker con estado compartido y ofertas mostradas a medida que llegan (Suspense/SSE) |
| MVP | Caché compartida por aseguradora y revalidación de precio | Mover la caché en memoria a Redis o Postgres, cachear por aseguradora (para no perder respuestas parciales), TTL según la vigencia de cada aseguradora, revalidar la cotización antes del pago y avisar si cambió el precio |
| MVP | Emisión asíncrona con outbox y cola | El pago aprobado escribe un evento outbox; un worker emite con Idempotency-Key=orderId, hace polling o recibe webhook, reintenta con dead-letter queue, alerta y escala a reembolso o gestión manual |
| MVP | Persistencia PostgreSQL | Tablas de cotizaciones, ofertas, órdenes, intentos de emisión, pólizas, documentos y auditoría de payloads (sin PII en logs) |
| V1 | Almacenamiento de póliza PDF y condicionado | Descargar y guardar documentos en storage privado con URLs firmadas, hash y versión del condicionado aceptado |
| V1 | Consulta por placa con proveedor autorizado | Integrar RUNT vía proveedor (Verifik/Truora) o convenio directo; flujo con placa y cédula del propietario más consentimiento; respaldo manual con marca, línea, modelo y año |
| V1 | Valor comercial con código Fasecolda | Licencia o proveedor autorizado de la Guía de Valores; guardar fasecoldaCode en el modelo canónico |
| V1 | Validación de identidad y listas restrictivas | Validar cédula o PPT contra la Registraduría vía proveedor y prefiltrar listas ONU/OFAC/PEP antes de emitir, guardando evidencia |
| V1 | Observabilidad por aseguradora | OpenTelemetry, Sentry y panel /admin con latencia p95, tasa de error, de timeout y de rechazo por aseguradora, más estado del circuit breaker |
| V1 | Catálogo de mapeo de coberturas por aseguradora | Tabla configurable que traduce los códigos de cada aseguradora a CoverageKey y ServiceKey con versionado |
| V2 | Adaptador vía orquestador insurtech | Evaluar un adaptador único hacia Transfiriendo, Sekure o Guro que exponga varias aseguradoras |
| Futuro | Importar pólizas vía open insurance | Cuando la SFC expida los estándares del Decreto 0368 de 2026, permitir al usuario con consentimiento traer sus pólizas vigentes a 'Mis seguros' |
| V2 | Worker o servicio backend separado | Servicio Node (Fastify/NestJS) con IP de salida fija para emisión, colas y mTLS hacia aseguradoras |

## Riesgos

- No hay APIs públicas de cotización y emisión: cada integración requiere convenio comercial y figura de intermediario (agencia o corredor). Sin convenio, el modelo cae en generación de leads o gestión manual.
- Regulatorio: comercializar sin figura de intermediación habilitada; la elección entre agencia y corredor cambia supervisión, pólizas de responsabilidad y requisitos ante la SFC.
- Los mocks actuales usan marcas reales (SURA, Bolívar) con precios inventados: riesgo de publicidad engañosa o reclamo de marca.
- Pago aprobado sin póliza emitida: hoy issue es síncrono, sin idempotencia ni cola; un timeout puede dejar al cliente cobrado y sin cobertura.
- La caché en memoria y el estado no compartido en serverless dan precios inconsistentes entre instancias y se pierden en cada deploy.
- Cobrar un precio vencido: la caché dura 15 min, la vigencia simulada 15 días y no se revalida antes del pago.
- RUNT y Fasecolda: acceso solo por contrato o licencia; los proveedores (p. ej. Verifik) piden placa y documento del propietario, lo que rompe la promesa de 'solo con la placa'; el scraping está prohibido.
- Protección de datos (Ley 1581): consultar RUNT por un tercero exige autorización del titular; la residencia de datos en Supabase/Vercel fuera de Colombia requiere revisión de transferencia internacional; los logs no deben llevar PII.
- Dependencia de proveedores en beta: Vercel Queues seguía en beta pública (desde febrero de 2026) sin fecha de GA confirmada.
- Latencia y disponibilidad heterogénea de las aseguradoras degradan la UX si no hay streaming, circuit breaker ni resultados parciales.
- Cambios frecuentes y breaking en Next.js 16 (advertencia del AGENTS.md); riesgo de mantenimiento si el backend vive acoplado al frontend.
- Varias fuentes oficiales no se pudieron leer (proxy bloqueó SFC, Verifik, Truora y otros); hay datos basados en extractos del buscador que deben reverificarse.

## Preguntas abiertas

- ¿Qué figura de intermediación se usará (agencia, corredor, alianza con un corredor existente) y quién la tramita?
- ¿Con qué aseguradoras hay conversaciones comerciales hoy? ¿Alguna ya ofreció sandbox o API?
- ¿Se acepta un orquestador insurtech (Transfiriendo, Sekure, Guro) a cambio de margen y dependencia, o se prefieren integraciones directas?
- ¿Se pueden renombrar las aseguradoras simuladas a marcas ficticias en la demo pública?
- ¿La cotización debe poder hacerse solo con placa o es aceptable pedir también la cédula del propietario?
- ¿Presupuesto mensual para consultas RUNT, Fasecolda y validación de identidad (cobro por consulta)?
- ¿Si la emisión falla después del pago, la política es reembolso automático, reintento manual u ofrecer otra aseguradora?
- ¿Qué tiempo máximo de espera de resultados es aceptable para el usuario móvil (p. ej. 8 s)?
- ¿El backend se mantiene dentro de Next.js en Vercel o se aprueba un servicio aparte con IP fija?
- ¿Hay restricción de residencia de datos o región de hosting que deba cumplirse?
- ¿Se quiere incorporar desde ya el roadmap de open insurance (Decreto 0368 de 2026) para importar pólizas del usuario?

## Fuentes

1. [HDI International concluyó el proceso de adquisición de Liberty Seguros en Colombia, Chile y Ecuador (Forbes Colombia)](https://forbes.co/actualidad/hdi-international-concluyo-el-proceso-de-adquisicion-de-liberty-seguros-en-colombia-chile-y-ecuador)
2. [HDI consolidó sus operaciones luego de finalizar la adquisición de Liberty Seguros (La República)](https://www.larepublica.co/finanzas/hdi-consolido-sus-operaciones-luego-de-finalizar-con-la-adquisicion-de-liberty-seguros-3971005)
3. [Inteligencia artificial entra a la venta de seguros en Colombia con nuevos canales digitales integrados (Portafolio)](https://www.portafolio.co/tecnologia/inteligencia-artificial-entra-a-la-venta-de-seguros-en-colombia-con-nuevos-canales-digitales-integrados-495340)
4. [Quálitas suma a Seguro Canguro a su red de intermediarios (Portafolio)](https://www.portafolio.co/tecnologia/la-compania-qualitas-apuesta-por-la-digitalizacion-y-suma-a-seguro-canguro-a-su-red-de-intermediarios-491878)
5. [Seguro Canguro prevé cerrar 2025 con 21.000 pólizas (La Nota Económica)](https://lanotaeconomica.com.co/movidas-empresarial/seguro-canguro-preve-cerrar-2025-con-21-000-polizas-y-un-crecimiento-de-25-en-medio-de-la-contraccion-del-mercado-automotor/)
6. [Busqo, la herramienta para asesorarse sobre seguros en Colombia (Portafolio)](https://www.portafolio.co/negocios/empresas/busqo-la-herramienta-para-asesorarse-sobre-seguros-en-colombia-502467)
7. [Del sector asegurador tradicional al ecosistema inteligente - Seguros Mundial (La Nota Económica)](https://lanotaeconomica.com.co/movidas-empresarial/del-sector-asegurador-tradicional-al-ecosistema-inteligente/)
8. [Seguros SURA Brasil - Strategic Integration Hub (Sensedia)](https://sensedia.com/customer-story/seguros-sura-brasil-drives-new-products-with-a-strategic-integration-hub)
9. [Insurance carriers build API partner portals (Fern)](https://buildwithfern.com/post/insurance-carriers-build-api-partner-portals.md)
10. [Consideraciones de la SFC sobre las agencias de seguros (Brigard Urrutia)](https://www.bu.com.co/es/insights/noticias/consideraciones-de-la-sfc-sobre-las-agencias-de-seguros)
11. [Intermediarios de Seguros (Superintendencia Financiera)](https://www.superfinanciera.gov.co/publicaciones/18643)
12. [Listado Compañías de Seguros Colombianas (Banco W / ban100)](https://www.ban100.com.co/sites/default/files/2026-01/Listado-Compañías-de-Seguros-Colombianas.pdf)
13. [Transfiriendo busca expandir su oferta a Panamá y Uruguay (Portafolio)](https://www.portafolio.co/negocios/empresas/transfiriendo-buscan-expandir-su-oferta-a-panama-y-uruguay-586788)
14. [Sekure (Dealroom)](https://app.dealroom.co/companies/sekure)
15. [Guro, empresa colombiana cerebro tecnológico del sector asegurador (El Colombiano)](https://www.elcolombiano.com/informes-comerciales/las-marcas-hablan/guro-empresa-colombiana-cerebro-tecnologico-sector-asegurador-KI34873988)
16. [Gangkhar raises $4.25 million seed round (Accion)](https://www.accion.org/news/gangkhar-raises-4-25-million-seed-round-to-scale-embedded-insurance-across-latin-america/)
17. [123Seguro (Qorus)](https://www.qorusglobal.com/innovations/30550-123seguro)
18. [Decreto 0368 de 2026 (compilación normativa Colpensiones)](https://normativa.colpensiones.gov.co/compilacion/docs/decreto_0368_2026.htm)
19. [Minhacienda reglamentó el sistema de finanzas abiertas en Colombia (INCP)](https://incp.org.co/publicaciones/infoincp-publicaciones/informacion-para-empresas/entorno/financiero/2026/04/minhacienda-reglamento-el-sistema-de-finanzas-abiertas-en-colombia/)
20. [SFC trabaja en hitos para implementar finanzas abiertas obligatorias (Superfinanciera)](https://www.superfinanciera.gov.co/publicaciones/10116156/sfc-trabaja-en-hitos-requeridos-para-implementar-modelo-de-finanzas-abiertas-obligatorias-cesar-ferrari/)
21. [RUNT - comunicación sobre servicios de consulta para empresas](https://www.runt.gov.co/sites/default/files/documentos/Saliente_CSR2.2025.55224.pdf)
22. [Verifik - Vehicle Validation by License Plate in RUNT](https://docs.verifik.co/vehicle-validation/colombia/runt-vehicle-by-plate)
23. [Verifik - Faster Vehicle Verification in Colombia](https://verifik.co/en/a-faster-way-to-validate-vehicle-data-by-plate-number-in-colombia/)
24. [Truora - Use the Check Type Vehicle](https://dev.truora.com/guides/check_type_vehicle_guide/)
25. [Verifik - Vehicle Values by Code - Fasecolda](https://docs.verifik.co/vehicle-validation/colombia-fasecolda-vehicle-by-code/)
26. [Fasecolda - Términos de uso y condiciones](https://fasecolda.com/cms/wp-content/uploads/2024/06/3.-Terminos-de-uso-y-condiciones.pdf)
27. [Verifik - Colombian Citizen identity](https://docs.verifik.co/identity/colombia/)
28. [Supabase Queues (docs)](https://supabase.com/docs/guides/queues)
29. [Vercel Queues status (Statusfield) / beta pública feb 2026](https://statusfield.com/services/vercel/queues)
