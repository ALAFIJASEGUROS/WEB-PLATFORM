# Plan de trabajo: integración con Seguros Bolívar

> Creado el 2026-11-14. Es la primera aseguradora real (HU-02.5). Las historias nuevas se registran como
> épica **HU-23** en el [backlog](04-backlog.md).

## Punto de partida

- Bolívar existe solo como **mock**, con la marca real y tarifas inventadas (`src/insurers/mock/insurers.ts`).
- No tiene un portal de APIs público: el acceso es B2B y se consigue con un convenio
  ([integraciones](investigacion/integrations.md)).
- Ya está hecho: el contrato `InsurerAdapter` con `idempotencyKey`, el fan-out con resultados parciales, la
  revalidación del precio (HU-17.3), la emisión asíncrona con outbox y reintentos (HU-17.4), y el KYC por
  aseguradora.
- Sigue en memoria: la persistencia y la caché (HU-09.6, depende de Supabase).

## Dos frentes en paralelo

El frente **comercial y legal** (C) depende de Bolívar. El **técnico** (T) avanza sin esperar: así, cuando
llegue el sandbox, solo faltará implementar el adaptador real.

## Fase 0: preparación (semanas 1–2, del 16 al 27 de noviembre)

| # | Tarea | Frente | Responsable | Entregable |
|---|---|---|---|---|
| 0.1 | Decidir la figura de intermediación: agencia, corredor o corresponsalía digital (HU-14.1) | C | Negocio y legal | Decisión escrita |
| 0.2 | Identificar el contacto comercial de canales digitales o intermediarios en Bolívar y agendar la primera reunión | C | Negocio | Reunión agendada |
| 0.3 | Preparar el **cuestionario técnico** para Bolívar (ver anexo) | T | Tecnología | Documento enviado antes de la reunión |
| 0.4 | Decidir qué hacer con el mock mientras no haya convenio: renombrarlo a una aseguradora ficticia o mantenerlo con el aviso "precio simulado" (HU-17.12) | C | Negocio | Decisión escrita y aplicada |
| 0.5 | ✅ **Adaptador v2**: añadir `getIssueStatus`, `getPolicyDocument`, `healthcheck` y capacidades (`quoteTtl`, `requiresInspection`, `asyncIssue`, ciudades, años y tipos admitidos) | T | Tecnología | PR con la interfaz y los mocks actualizados |
| 0.6 | ✅ **Tests de contrato** compartidos que todo adaptador debe pasar (cotiza, rechaza, timeout, idempotencia de la emisión) | T | Tecnología | Suite en Vitest |

**Criterio de salida:** reunión con Bolívar agendada, cuestionario enviado y adaptador v2 en `main`.

## Fase 1: convenio y diseño de la integración (semanas 3–6, del 30 de noviembre al 23 de diciembre)

| # | Tarea | Frente | Responsable | Entregable |
|---|---|---|---|---|
| 1.1 | Primera reunión: presentar la plataforma (la demo de GitHub Pages sirve) y el modelo de negocio | C | Negocio | Acta con los próximos pasos |
| 1.2 | Negociar el convenio: comisión, productos (carro y moto), uso de marca y condicionados, quién recauda (HU-17.14) y SLA | C | Negocio y legal | Convenio o carta de intención |
| 1.3 | Pedir el acceso técnico: sandbox, credenciales, especificación (OpenAPI o WSDL) y catálogo de coberturas | C | Tecnología | Credenciales de sandbox |
| 1.4 | ✅ Esqueleto de `src/insurers/bolivar/`: cliente HTTP, configuración por variables de entorno y *feature flag* `INSURER_BOLIVAR_MODE=mock\|sandbox\|prod` | T | Tecnología | PR; el modo `mock` se comporta igual que hoy |
| 1.5 | ✅ Timeout, un reintento solo ante errores técnicos y circuit breaker **por aseguradora** en `aggregator.ts` | T | Tecnología | PR con pruebas |
| 1.6 | ✅ Observabilidad por aseguradora: latencia p95 y tasas de error, timeout y rechazo en `/admin`, con logs sin PII | T | Tecnología | Panel de salud |

**Criterio de salida:** convenio o carta de intención firmados y credenciales de sandbox recibidas.
**Riesgo principal:** que el convenio se demore. El frente técnico (1.4–1.6) no depende de él.

## Fase 2: integración en sandbox (semanas 7–10, de enero; arranca cuando hay sandbox)

| # | Tarea | Responsable | Entregable |
|---|---|---|---|
| 2.1 | Autenticación (OAuth2 client-credentials o mTLS, según lo que pidan) y secretos en Vercel | Tecnología | Conexión a sandbox OK |
| 2.2 | `quote`: mapear `QuoteRequest` al payload de Bolívar y su respuesta a `Offer` | Tecnología | Cotización real en sandbox |
| 2.3 | Catálogo de equivalencias: coberturas y servicios de Bolívar frente a `CoverageKey` y `ServiceKey`, con versión | Tecnología y negocio | Tabla revisada por negocio |
| 2.4 | KYC: reemplazar los campos simulados por los SARLAFT que exige Bolívar | Tecnología | `kycFields` reales |
| 2.5 | `issue` y `getIssueStatus`: emisión con `idempotencyKey = orderId`, más polling o webhook firmado | Tecnología | Póliza emitida en sandbox |
| 2.6 | `getPolicyDocument`: guardar el PDF de la póliza y el condicionado con hash y versión | Tecnología | Descarga desde "Mis seguros" |
| 2.7 | Casos de inspección, rechazo de suscripción y vehículos no asegurables | Tecnología | Mensajes claros en la UI |
| 2.8 | Pasar los tests de contrato y una suite E2E contra el sandbox (cotizar → pagar → emitir) | Tecnología | CI en verde |

**Criterio de salida:** el flujo completo funciona en sandbox y los tests de contrato pasan.

## Fase 3: certificación y piloto (semanas 11–14, de febrero)

| # | Tarea | Responsable | Entregable |
|---|---|---|---|
| 3.1 | Certificación técnica con Bolívar (si la exigen) y paso a credenciales de producción | Tecnología | Aprobación de Bolívar |
| 3.2 | Validar tarifas: comparar 20–30 cotizaciones de la plataforma con el cotizador de Bolívar | Negocio | Diferencia ≤ 1 % o explicada |
| 3.3 | Textos legales: términos, tratamiento de datos (Ley 1581) y figura de intermediario visible | Legal | Textos publicados |
| 3.4 | Piloto cerrado con `INSURER_BOLIVAR_MODE=prod` para un grupo pequeño (equipo y referidos) | Negocio y tecnología | 10–20 pólizas reales emitidas |
| 3.5 | Runbook de operación: emisión fallida, reembolso, póliza sin PDF y contactos en Bolívar | Operaciones | Documento en `docs/` |
| 3.6 | Abrir al público y retirar el mock de Bolívar | Todos | Release |

**Criterio de salida:** pólizas reales emitidas sin intervención manual y conciliación de recaudo cuadrada.

## Cómo está construido el adaptador

| Archivo | Qué hace |
|---|---|
| `src/insurers/bolivar/config.ts` | Lee el modo y las credenciales del entorno (ver `.env.example`) |
| `src/insurers/bolivar/schema.ts` | Formato de los mensajes de la API. **Es un supuesto**: se reemplaza con la especificación de Bolívar |
| `src/insurers/bolivar/mapping.ts` | Traducción al modelo canónico y catálogos de coberturas y asistencias (también supuestos) |
| `src/insurers/bolivar/adapter.ts` | Cliente HTTP: token OAuth2 en caché y renovado ante 401, clave de idempotencia en la emisión, errores técnicos (red, 5xx, 429) separados de los de integración (4xx, formato inesperado) |
| `src/insurers/bolivar/fake-sandbox.ts` | Sandbox falso con el formato supuesto, para los tests y para `/api/sandbox/bolivar` en local |
| `src/insurers/active.ts` | Registro de aseguradoras activas: Bolívar usa el mock o la API según `INSURER_BOLIVAR_MODE` |

**Cuando llegue la especificación real:** ajustar `schema.ts` y `mapping.ts`, apuntar las variables de entorno al
sandbox de Bolívar y correr `describeAdapterContract` contra él. Si pasa, se puede activar `INSURER_BOLIVAR_MODE=sandbox`
en un preview.

**Para probar en local el modo sandbox con el sandbox falso:** usar las variables de ejemplo de `.env.example` y correr
`npm run dev`. Las placas `ERR*`, `REC*`, `PEN*` e `INS*` fuerzan un error técnico, un rechazo, una emisión pendiente y una
inspección. La salud de cada aseguradora se ve en `/admin` → "Salud de las aseguradoras".

**Limitaciones conocidas:**
- El circuit breaker y las métricas viven en memoria por instancia; se compartirán cuando exista Postgres (HU-09.6).
- Una emisión que pide inspección se reintenta como pendiente y, si no se resuelve en 5 intentos, la orden pasa a error.
  Falta un flujo para agendar la inspección con el cliente; se diseña cuando Bolívar explique su proceso.
- `getPolicyDocument` está en el contrato, pero "Mis seguros" todavía no lo usa (HU-23.8).

## Dependencias externas

| Dependencia | Bloquea | Estado |
|---|---|---|
| Figura legal (HU-14.1) | Convenio (1.2) | Pendiente |
| Convenio y sandbox de Bolívar | Toda la fase 2 | Pendiente |
| Supabase (HU-09.6) | Guardar pólizas, documentos y auditoría de payloads en producción (2.6, 3.4) | Pendiente |
| Llaves de Wompi en producción (HU-07.2) | Piloto (3.4) | Pendiente |
| RUNT y Fasecolda (HU-03.5, HU-03.6) | Cotizar con valor comercial real, si Bolívar no lo calcula | Por confirmar con Bolívar |

## Anexo: cuestionario técnico para Bolívar

1. **Acceso:** ¿REST o SOAP? ¿Hay sandbox? ¿OpenAPI o WSDL? ¿Autenticación con OAuth2, mTLS o llave? ¿Exigen IP fija en lista blanca?
2. **Cotización:** ¿qué datos mínimos piden (placa, código Fasecolda, cédula, ciudad, uso)? ¿Calculan ellos el valor comercial? ¿Cuánto dura una cotización? ¿Cuál es la latencia típica y el límite de peticiones?
3. **Productos:** ¿qué planes de carro y moto se pueden comercializar por canal digital? ¿Catálogo de coberturas, deducibles y asistencias con códigos?
4. **Emisión:** ¿síncrona o asíncrona? ¿Webhook o consulta de estado? ¿Aceptan una clave de idempotencia? ¿Cuándo exigen inspección y cómo se agenda?
5. **Documentos:** ¿entregan el PDF de la póliza por API? ¿Versión del condicionado?
6. **SARLAFT:** ¿qué campos de conocimiento del cliente exigen y quién valida las listas restrictivas?
7. **Recaudo:** ¿la plataforma recauda y transfiere, o se paga directamente a Bolívar? ¿Financiación en cuotas?
8. **Operación:** SLA, ventanas de mantenimiento, contacto técnico y escalamiento ante incidentes.
9. **Marca:** ¿se puede usar logo, nombre y condicionados? ¿Hay un manual de marca para intermediarios?
