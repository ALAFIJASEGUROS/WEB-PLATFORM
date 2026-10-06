# Pagos en Colombia

> Investigación del 2026-10-06 con búsqueda web. Lo marcado como no verificado debe confirmarse antes de usarse en producción.

# Pasarelas y medios de pago en Colombia para comprar pólizas desde el celular

**Fecha de corte: 2026-10-06.** Varias fuentes primarias (docs.wompi.co, corporate.payu.com, banrep.gov.co, valoraanalitik y otras) **no se pudieron abrir con WebFetch**, porque el proxy de red las bloqueó. Lo que sigue se apoya en los fragmentos indexados por el buscador. Las tarifas son **tarifas estándar publicadas o reportadas, antes de IVA (19%)**. Antes de firmar con cualquier proveedor hay que confirmarlas con un cotizador o contrato. Las marcas indican el nivel de verificación:
- (V): visto en una fuente primaria o en su fragmento indexado.
- (S): fuente secundaria.
- (NV): no verificado.

---

## 1. Panorama del mercado (lo que cambia el diseño del checkout)

- **Los medios alternativos ya dominan.** En Wompi, las transferencias, billeteras y QR mueven el **90% del volumen transaccional** (S) [10]. Para un público móvil, el checkout debe abrir con **PSE, Nequi, Daviplata, Botón Bancolombia y Bre-B**, no con la tarjeta.
- **Bre-B ya es infraestructura masiva.** Entró en operación masiva el **6-oct-2025** (V) [18][24]. A los seis meses (abril de 2026) tenía **más de 34,6 millones de usuarios, más de 103 millones de llaves y entre 638 y 670 millones de transacciones por más de COP 100–105 billones** (V) [20][21].
- **Débito automático por Bre-B.** Desde mayo–julio de 2026 se reporta el primer débito automático recurrente sobre llaves Bre-B, lanzado por la fintech **DRUO** (S) [22][23]. Las aseguradoras aparecen de forma explícita como caso de uso. Es una alternativa emergente para cobrar primas mensuales sin tarjeta.

## 2. Comparativo de pasarelas

| Pasarela | Medios en Colombia | Recurrencia / tokenización | Split / dispersión | Webhooks / sandbox / SDK | Tarifa estándar aprox. | Notas |
|---|---|---|---|---|---|---|
| **Wompi** (Bancolombia / Grupo Cibest) | Tarjeta crédito/débito, PSE, Nequi, Botón y transferencia Bancolombia, QR Bancolombia, **Daviplata** (botón directo), "Compra y Paga Después Bancolombia" (BNPL), corresponsales y efectivo Bancolombia (V/S) [4][9] | **Fuentes de pago** (payment sources) con **tarjeta o cuenta Nequi** tokenizada; el token de Nequi se aprueba en la app y solo existe por API (V) [2] | **"Pagos a terceros"** (payouts) por API o en el panel, en lote, programados y recurrentes (V) [6]. Es una dispersión posterior al recaudo, **no un split atómico** en el momento del cobro (NV). Anuncian dispersión hacia cuentas Bre-B (S) [9][10] | Eventos `transaction.updated`, `nequi_token.updated` y `bancolombia_transfer_token.updated`, firmados con checksum en `X-Event-Checksum` (V) [3]. Sandbox con datos de prueba, p. ej. Nequi 3991111111 aprobado (V) [5]. Widget/Web Checkout, API REST, SDK PHP oficial; SDK Flutter comunitario (S) | **2,65% + COP 700 + IVA** por transacción aprobada (S) [7]. Se reportó una **rebaja del QR al 1%** en sep-2026 (S) [8] | Banco detrás, liquidez rápida, ecosistema más grande para pago móvil |
| **PayU Latam** | Tarjetas, PSE, Nequi, Botón Bancolombia, QR interoperable/**Bre-B**, efectivo/pago referenciado (V) [1] | Tokenización y Pagos Recurrentes (planes, suscripciones), que PayU presenta como aptos para "pólizas" (S) | Sin split marketplace confirmado para Colombia (NV) | Página de confirmación (callback) y sandbox. No se pudo abrir la documentación (NV) | **3,29% + COP 300 + IVA**. Mínimo COP 450 en PSE, Nequi, Botón Bancolombia y QR/Bre-B; mínimo COP 9.900 en pago referenciado; mínimo COP 570 en Nequi y otros medios de efectivo (V) [1] | Muy usado por aseguradoras y retail; dashboard antifraude |
| **ePayco** (Davivienda desde oct-2024) | Más de 22 medios: tarjetas, PSE, Daviplata, Nequi, efectivo, PayPal (S) | "Suscripciones 2.0" y cobro automatizado de facturas (S) | **"Pagos Divididos"** (mayo de 2026): reparte el recaudo entre varios beneficiarios **sin duplicar el 4x1000**, con liquidación en tiempo real (S) [11] | API, plugins, sandbox (NV) | **2,99% + COP 900 + IVA** en modelo agregador (S) [12] | El **único split nativo local** confirmado. Relevante si se recauda para varias aseguradoras |
| **Mercado Pago** | Tarjetas, PSE (en Checkout API vía Orders desde mayo de 2026), efectivo, saldo MP (V/S) [14] | Suscripciones (preapproval) (NV para Colombia) | **Split marketplace** en Checkout Pro: primero se descuenta la comisión de MP y luego la del marketplace (V) [13] | Webhooks, sandbox, SDK JS/React/móvil (V/S) | Reportada en **3,29% + COP 800 + IVA** con liberación inmediata; otras fuentes dan cifras distintas por medio (**NV**, solo fuentes secundarias) [33] | El split está bien documentado. Hay fricción de marca por ser marketplace de terceros |
| **Kushki** | Tarjetas, PSE y **PSE Avanza** (registro de cuenta con OTP), Efecty (V) [15][16] | Tokenización **PCI DSS nivel 1**, **3DS 2.2**, suscripciones con reintentos automáticos, cuotas (S) [15] | Sin split confirmado (NV) | API documentada (api-docs.kushkipagos.com), SDK (V) | No publica tarifa; hay que negociarla (NV) | Vigilada por la SFC según su propio sitio (S). Enfocada en empresas medianas y grandes |
| **Openpay (BBVA)** | Tarjetas, PSE, efectivo, links de pago, suscripciones, marketplaces (S) [17] | Suscripciones, tokenización (S) | Menciona "pagos a terceros/marketplace" (S) | API y SDK (NV) | Sin tarifa web verificada (NV) | Menor tracción reportada que Wompi o PayU |
| **dLocal** | Tarjetas, PSE, **Bre-B integrado vía una sola API** (S) [18][19] | Tokenización (NV para Colombia) | Payouts (NV) | API empresarial (S) | Negociada (NV) | Orientada a comercios internacionales; poco sentido para una startup local |
| **Bold** | Datáfono, links de pago, tarjetas, Nequi; más de 550.000 comercios (S) [34] | No se halló API de recurrencia (NV) | No | Limitado para ecommerce a medida (NV) | Sin tarifa API verificada | Más útil como POS o link que como pasarela embebida |
| **Treli** (orquestador de recurrencia) | Se apoya en Wompi, ePayco, PayU, Openpay, Stripe, Placetopay y Paymentsway (V) [25] | Suscripciones, débito automático Nequi y **"Daviplata recurrente"** (V) [25][26] | No es pasarela | Portal de autoservicio y facturación | SaaS (NV) | Puede reemplazar construir el motor de recurrencia propio en V1 |
| **DRUO** (Bre-B / A2A) | Débito automático de cuentas por llave Bre-B (S) [23] | **Débito recurrente con autorización única** (S) | — | NV | NV | Futuro: cuotas mensuales sin tarjeta |

**Medios clave, uno por uno**
- **Nequi**: Wompi (también tokenizable), PayU, ePayco, Kushki (NV).
- **Daviplata**: Wompi (botón directo) y ePayco.
- **Bre-B**:
  - **Cobro:** PayU (QR interoperable/Bre-B), dLocal y EBANX (vía QR, sin URL de redirección) [32].
  - **Pagos salientes:** Wompi anunció dispersión a cuentas Bre-B. No se confirmó si Wompi ya ofrece **cobro** con Bre-B en ecommerce (NV).
- **3DS**: lo declara Kushki (3DS 2.2). En Wompi y PayU la autenticación de tarjeta depende del emisor (NV).
- **PCI DSS**: todas las pasarelas citadas operan como proveedores certificados. La plataforma debe **usar campos alojados, widget o redirección** para entrar en el **SAQ A**:
  - Desde enero de 2025, la nueva condición de elegibilidad del SAQ A exige que el sitio "no sea susceptible a ataques de scripts".
  - En la práctica eso significa inventario y autorización de scripts (6.4.3) y monitoreo de cambios en la página de pago (11.6.1), **incluso cuando el pago va en un iframe** (V) [30].

## 3. Bre-B: estado y cómo integrarlo

- **Qué es.** Es el sistema de pagos inmediatos del Banco de la República:
  - Transferencias de cuenta a cuenta en menos de 20 segundos, 24/7/365.
  - Pago con **llaves** (celular, documento, correo o código de comercio) y **QR interoperable** en comercios (V) [18][21].
  - Persona a comercio permitido hasta un tope por operación (aprox. **COP 11.552.000** en 2025, expresado en UVB) (S) [24].
- **Costo.** Tarifa promocional **COP 0 durante los primeros 3 años**. Después, aprox. COP 3,23 por cada punta. La asumen las entidades participantes, no el usuario final (S) [24]. Ojo: **la pasarela sí puede cobrarle al comercio su propia comisión** por cobros Bre-B. PayU, por ejemplo, aplica el mínimo de COP 450 (V) [1].
- **Hoja de ruta 2026.**
  - QR generado por personas naturales en el 2S-2026.
  - Regulación para pagos entre empresas, recaudos y nómina.
  - **Débitos automáticos recurrentes con autorización única**, con DRUO como primer actor (S) [20][22][23].
- **Cómo integrarlo.** Un comercio **no se conecta directamente** al Banco de la República: participan bancos, SEDPE y proveedores de servicios de pago. La ruta práctica es **a través de la pasarela** (PayU, dLocal, Wompi según disponibilidad):
  1. La pasarela genera un **QR o llave dinámica** con referencia y monto.
  2. El usuario paga desde la app de su banco o billetera.
  3. La confirmación llega por **webhook**.

  En celular, el reto de experiencia es que el usuario **no puede escanear su propia pantalla**. Hay que ofrecer:
  - "copiar llave o código";
  - deep link a la app bancaria, si la pasarela lo soporta;
  - descarga del QR.

## 4. Modelos de cobro de pólizas

| Modelo | Cómo funciona | Implicaciones para el producto |
|---|---|---|
| **Contado anual** | Un solo pago con tarjeta, PSE, billetera o Bre-B | El más simple para el MVP. Emisión inmediata tras la confirmación |
| **Pago mensual (débito recurrente)** | Tarjeta o Nequi tokenizado (Wompi), recurrencia de PayU o Kushki, Treli, débito Bre-B (DRUO) | Tiene el riesgo del **art. 1068 del Código de Comercio**: la **mora termina automáticamente** el contrato y el pago tardío no lo rehabilita [28]. Hace falta un motor de reintentos, avisos previos y alertas de mora. El art. 1066 fija que, salvo pacto en contrario, la prima se paga dentro del mes siguiente a la entrega de la póliza [28] |
| **Financiación por la aseguradora** | Productos propios como "Financia Ya" de Liberty: cuota inicial ≥30%, mínimo COP 300.000, solo pólizas revocables (S; no se pudo confirmar la vigencia) | La plataforma solo cobra la cuota inicial o redirige. La aseguradora asume el crédito |
| **Financiación por financieras** | Financieras de primas (vinculadas a la aseguradora o externas; el esquema viene de la Resolución 420 de 1993 según literatura académica) o BNPL ("Compra y Paga Después Bancolombia" vía Wompi) [9] | Permite cuotas sin que la plataforma asuma riesgo de crédito. Exige divulgar tasa e intereses al consumidor |
| **Pago directo a la aseguradora** | La plataforma redirige o incrusta el checkout de la aseguradora, y esta paga una comisión a la plataforma | **Mínimo riesgo regulatorio y contable.** La plataforma no toca la prima, factura solo su comisión y la conciliación depende de los reportes de la aseguradora |
| **Recaudo por el intermediario** | La plataforma cobra la prima y la traslada a la aseguradora | Según doctrina de la SFC [27]:<ul><li>las **agencias** de seguros tienen derecho legal a la facultad de recaudo;</li><li>en los **agentes** esa facultad es **discrecional** de la aseguradora;</li><li>quien recauda debe **trasladar** los dineros en el plazo pactado.</li></ul>Implica figura de intermediario (agencia o corredor) **inscrito y vigilado por la SFC**, ingresos para terceros en contabilidad (la prima no es ingreso propio), **GMF 4x1000** al dispersar, conciliación, factura electrónica solo por la comisión y obligaciones de SARLAFT |

**Recomendación regulatoria.** El MVP debería usar **"pago directo a la aseguradora" o recaudo en cuenta de la aseguradora**. Hay dos esquemas posibles:
- Cada aseguradora como comercio en la pasarela.
- Split, con la prima hacia la aseguradora y la comisión hacia SeguAlaFija.

El recaudo propio solo debería considerarse cuando la figura de intermediario esté resuelta con abogados. El Decreto 1692 de 2020 (sistemas de pago de bajo valor y adquirencia) define el marco de los actores de pago. La plataforma **no** debe actuar como adquirente o agregador propio [31].

## 5. Arquitectura de pagos recomendada para el MVP (datos simulados)

1. **Puerto `PaymentProvider` (abstracción).**
   - Operaciones: `createCheckout`, `getTransaction`, `refund`, `tokenize/createPaymentSource`, `chargeRecurring`, `parseWebhook` y `verifySignature`.
   - Adaptadores: `MockProvider` (MVP), `WompiAdapter`, `PayUAdapter`, `EpaycoAdapter`.
   - Ruteo por medio de pago y aseguradora (`routing rules`), de modo que cada aseguradora pueda tener su propio comercio o credenciales (subcuentas).
2. **Modelo de datos.**
   - Entidades: `Order` (cotización elegida, póliza, tomador), `PaymentIntent`, `PaymentAttempt` (con el ID externo), `PaymentEvent` (webhook crudo e inmutable), `Payout`/`Settlement` (prima hacia la aseguradora y comisión) y `PaymentSource` (token, nunca el PAN).
   - El dinero se guarda en **centavos y COP como entero**. Registrar IVA y comisiones por separado.
3. **Máquina de estados.** El flujo principal es `CREATED → PENDING → APPROVED | DECLINED | VOIDED | ERROR | EXPIRED`. Desde `APPROVED` puede pasar a `REFUNDED` o `CHARGEBACK`. Para la póliza: `QUOTED → PAYMENT_PENDING → PAID → ISSUING → ISSUED | ISSUE_FAILED (→ refund)`.
   - PSE, Bre-B y Nequi tienen estados **PENDING asíncronos**.
   - **Nunca** se emite con el redirect del navegador; solo con el webhook o una consulta de servidor a servidor.
4. **Idempotencia.**
   - `Idempotency-Key` por intento, del lado de la plataforma.
   - Referencia única por intento, enviada a la pasarela.
   - Deduplicación de webhooks por ID de evento más estado.
   - Upsert transaccional. Las transiciones de estado son monótonas: no se puede volver de `APPROVED` a `PENDING`.
5. **Webhooks.**
   - Verificar la firma, p. ej. el checksum de Wompi.
   - Responder 200 rápido y procesar en cola.
   - Reintentos con backoff y DLQ.
   - **Job de conciliación por sondeo** para pagos que sigan `PENDING` más de N minutos.
6. **Conciliación.** Diaria, cruzando tres fuentes: transacciones internas, reporte de la pasarela (liquidaciones y comisiones) y emisiones o reportes de la aseguradora. Las diferencias se muestran en un panel de administración.
7. **Recurrencia (V1).**
   - Scheduler de cuotas, reintentos (p. ej. días 0, 2 y 5).
   - Avisos previos por correo, WhatsApp o push.
   - Alerta de **riesgo de terminación por mora** antes del vencimiento contractual.
   - Actualización del medio de pago desde la cuenta del usuario.
8. **Seguridad y cumplimiento.**
   - Widget o campos alojados, nunca el PAN en servidores propios (SAQ A).
   - CSP estricta e inventario de scripts en la página de checkout.
   - Secretos en un gestor de secretos.
   - Registros sin datos sensibles.
   - Consentimiento de Habeas Data (Ley 1581) separado del pago.
9. **Mock realista para el MVP.**
   - `MockProvider` con escenarios configurables: aprobado, rechazado, pendiente → aprobado tras X s, timeout, webhook duplicado, webhook fuera de orden.
   - Pantallas de PSE, Nequi (push) y QR Bre-B simuladas.
   - Así se prueban la idempotencia y la máquina de estados antes de conectar la pasarela real.
   - Datos de prueba basados en la documentación del sandbox de Wompi [5].

**Primera pasarela recomendada: Wompi**, por cuatro razones:
- La mejor cobertura de medios móviles: Nequi, Daviplata, Bancolombia y QR.
- Tokenización de Nequi y tarjeta para cuotas.
- Webhooks firmados y sandbox público.
- Tarifa estándar competitiva, más la rebaja reportada al 1% en QR.

**Segunda pasarela: PayU**, como respaldo. Aporta Bre-B y pago referenciado ya listados, presencia en aseguradoras y redundancia.

**Evaluar ePayco** si se confirma que el modelo requiere split atómico prima/comisión. **Evaluar Treli o DRUO** para la recurrencia en V1/V2.

## Funcionalidades sugeridas

| Prioridad | Funcionalidad | Descripción |
| --- | --- | --- |
| MVP | Capa de abstracción de pagos (PaymentProvider) con MockProvider | Interfaz única (crear checkout, consultar, reembolsar, tokenizar, cobrar recurrente, validar webhook) con un adaptador simulado que modela aprobado, rechazado, pendiente asíncrono, timeout y webhooks duplicados o fuera de orden. |
| MVP | Máquina de estados de transacción y de póliza | Estados CREATED/PENDING/APPROVED/DECLINED/EXPIRED/REFUNDED/CHARGEBACK y QUOTED/PAYMENT_PENDING/PAID/ISSUING/ISSUED/ISSUE_FAILED, con transiciones monótonas y emisión solo tras confirmación de servidor a servidor. |
| MVP | Idempotencia y procesamiento de webhooks | Idempotency-Key por intento, referencia única por pasarela, deduplicación de eventos, verificación de firma (p. ej. X-Event-Checksum de Wompi), cola con reintentos y DLQ, y sondeo de pendientes. |
| MVP | Checkout móvil mobile-first con medios locales | Selector que prioriza Nequi, PSE, Daviplata, Botón Bancolombia, QR/Bre-B y tarjeta, con widget alojado de la pasarela. Para QR en celular: copiar llave o código, deep link a la app bancaria y descarga del QR. |
| V1 | Integración real con Wompi (pasarela principal) | Adaptador Wompi: Web Checkout o widget, eventos transaction.updated, sandbox y fuentes de pago con tarjeta o Nequi. |
| V1 | Adaptador PayU como pasarela secundaria y ruteo por medio de pago | Segundo proveedor con QR/Bre-B y pago referenciado, con reglas de ruteo y failover por medio de pago o aseguradora. |
| V1 | Recaudo por aseguradora (multi-comercio / subcuentas) | Configurar credenciales o comercio por aseguradora para que la prima llegue directo a ella y la comisión de SeguAlaFija se liquide aparte, por split (ePayco o Mercado Pago) o por facturación de comisión. |
| V1 | Conciliación diaria y panel de administración de pagos | Cruce de transacciones internas, reportes y liquidaciones de la pasarela y emisiones de la aseguradora, con alertas de diferencias, reembolsos y contracargos. |
| V1 | Pago mensual recurrente con tokenización | Cuotas con tarjeta o Nequi tokenizado (Wompi) o con un orquestador (Treli). Incluye scheduler, reintentos, avisos previos y gestión del medio de pago desde Mis Seguros. |
| V1 | Alertas de mora y riesgo de terminación automática | Notificaciones (correo, WhatsApp, push) antes y después de cada fallo de cobro, explicando que la mora termina el contrato y que el pago tardío no lo rehabilita. |
| V2 | Opciones de financiación de prima | Mostrar financiación de la aseguradora (p. ej. productos tipo 'Financia Ya') o BNPL (Compra y Paga Después Bancolombia vía Wompi) con la tasa transparente. |
| Futuro | Débito automático vía Bre-B | Cuotas mensuales por débito con autorización única sobre llave Bre-B, mediante DRUO u otro proveedor que lo habilite. |
| MVP | Cumplimiento PCI DSS SAQ A en la página de pago | Solo campos alojados o widget, CSP estricta, inventario y autorización de scripts y monitoreo de cambios en la página de checkout. |

## Riesgos

- Riesgo regulatorio: si SeguAlaFija recauda primas sin figura de intermediario inscrito o sin facultad de recaudo otorgada por la aseguradora, queda expuesta a la SFC. Además, la prima recaudada genera obligación de traslado y debe contabilizarse como ingreso para terceros.
- Carga de 4x1000 (GMF) y descuadres contables si se recauda la prima y luego se dispersa a cada aseguradora, en lugar de usar split o recaudo directo.
- Terminación automática por mora (art. 1068 C. Co.) en pagos mensuales: un fallo de débito no gestionado deja al usuario sin cobertura y genera reclamos reputacionales.
- Pagos asíncronos (PSE, Nequi, Bre-B) mal manejados: emitir con el redirect del navegador produce pólizas sin pago, o cobros sin póliza y dobles cobros si no hay idempotencia.
- Tarifas no verificadas en fuente primaria (el proxy bloqueó varias). Las cifras de Mercado Pago, ePayco y la rebaja de QR de Wompi vienen de fuentes secundarias y pueden haber cambiado al 2026-10-06.
- Dependencia de un solo proveedor (lock-in). Hay que mitigarlo con la abstracción de proveedor y una segunda pasarela.
- Experiencia de usuario con QR Bre-B en celular: el usuario no puede escanear su propia pantalla, y si no hay deep link o copia de llave cae la conversión.
- Ataques de skimming por scripts en la página de checkout (Magecart). PCI DSS 4.0.1 exige controlar los scripts aunque el pago vaya en iframe.
- Contracargos y fraude con tarjeta en primas de alto valor. Requiere 3DS o antifraude de la pasarela y una política clara de reembolsos y revocación.
- Plazos de emisión de la aseguradora: si el pago se aprueba pero la API de emisión falla, hace falta un flujo de reembolso automático o de reintento de emisión.
- Funcionalidades Bre-B de débito recurrente y QR de personas todavía en despliegue (2026); su disponibilidad vía pasarelas no está confirmada.

## Preguntas abiertas

- ¿SeguAlaFija operará como agencia o corredor de seguros inscrito ante la SFC, o como un comparador o generador de leads que deriva la venta a la aseguradora? Esto define si puede recaudar primas.
- ¿El dinero de la prima debe llegar directo a cada aseguradora (comercio propio de cada una) o se acepta recaudo centralizado con dispersión posterior?
- ¿Cómo se monetiza la plataforma: comisión de la aseguradora, fee al usuario, o publicidad o contacto de aseguradoras? ¿La comisión se descuenta por split o se factura aparte?
- ¿El MVP incluye pago mensual o solo contado anual? ¿Hay acuerdos de financiación con aseguradoras o financieras?
- ¿Qué medios de pago son imprescindibles en el lanzamiento (Nequi, Daviplata, PSE, tarjeta, Bre-B, efectivo)? ¿Se acepta efectivo o corresponsal pese a la emisión diferida?
- ¿Hay preferencia o relación comercial existente con algún banco (Bancolombia, Davivienda, BBVA) que incline la elección de pasarela?
- ¿La compra sin login debe permitir guardar el medio de pago (tokenización) o solo las cuentas registradas podrán tener cuotas recurrentes?
- ¿Qué pasa si la aseguradora rechaza la emisión después del pago (inspección del vehículo, SARLAFT)? ¿Reembolso automático o gestión manual?
- ¿Se incluirá el SOAT (pago de contado, regulado aparte) en el alcance de carros y motos?
- ¿Quién asume las comisiones de la pasarela y el IVA: la plataforma, la aseguradora o el usuario?

## Fuentes

1. [PayU - Tarifas estándar de procesamiento de pagos (Colombia)](https://corporate.payu.com/?p=36826)
2. [Wompi Docs - Fuentes de pago (Colombia)](https://docs.wompi.co/en/docs/colombia/fuentes-de-pago/)
3. [Wompi Docs - Eventos (webhooks)](https://docs.wompi.co/en/docs/colombia/eventos/)
4. [Wompi Docs - Métodos de pago](https://docs.wompi.co/en/docs/colombia/metodos-de-pago/)
5. [Wompi Docs - Datos de prueba en Sandbox](https://docs.wompi.co/en/docs/colombia/datos-de-prueba-en-sandbox/)
6. [Wompi Docs - Activación pagos a terceros](https://docs.wompi.co/en/docs/colombia/activacion-pagos-a-terceros/)
7. [Wompi Docs - Plugin Jumpseller (tarifa)](https://docs.wompi.co/en/docs/colombia/jumpseller-plugin/)
8. [Descubre.vc - Wompi lanza pagos sin contacto y reduce tarifas (sep-2026)](https://www.descubre.vc/noticia/wompi-lanza-pagos-sin-contacto-desde-celulares-y-reduce-tarifas-en-colombia-2026-09-30)
9. [Bancolombia - Wompi anuncia dos nuevos métodos de pago](https://www.bancolombia.com/acerca-de/sala-prensa/noticias/productos-servicios/nuevos-metodos-de-pagos-wompi)
10. [ABC Economía - Wompi procesó 50 billones en 2025](https://abceconomia.co/2026/02/04/wompi-proceso-50-billones-en-2025-y-acelera-expansion/)
11. [Descubre.vc - ePayco lanza Pagos Divididos (may-2026)](https://www.descubre.vc/noticia/epayco-lanza-pagos-divididos-para-optimizar-el-flujo-de-caja-en-colombia-2026-05-19)
12. [Capterra - ePayco pricing](https://www.capterra.co.uk/software/1034370/epayco)
13. [Mercado Pago Developers Colombia - Integrar marketplace (Checkout Pro)](https://www.mercadopago.com.co/developers/en/docs/checkout-pro-preferences/how-tos/integrate-marketplace.md)
14. [Mercado Pago Developers Colombia - Changelog](https://www.mercadopago.com.co/developers/en/changelog)
15. [Kushki - Colombia](https://kushkipagos.com/markets/colombia)
16. [Kushki Soporte - PSE y PSE Avanza](https://soporte.kushkipagos.com/hc/en-us/articles/1500010819081-PSE-and-PSE-Avanza-payments-through-Kushki)
17. [Portafolio - La nueva plataforma del BBVA de pago de comercio electrónico (Openpay)](https://www.portafolio.co/negocios/empresas/la-nueva-plataforma-del-bbva-de-pago-de-comercio-electronico-541445)
18. [dLocal - Bre-B's launch: a payment team's guide](https://www.dlocal.com/blog/markets-and-consumers/bre-bs-launch-a-payment-teams-guide-to-colombias-new-real-time-payment-rail/)
19. [dLocal - Bre-B payments](https://dlocal.com/payments/bre-b)
20. [Banco de la República - Seis meses de Bre-B, 34 millones de usuarios](https://banrep.gov.co/es/noticias/seis-meses-bre-b-acumula-34-millones-usuarios)
21. [Forbes Colombia - Bre-B superó 670 millones de transacciones](https://forbes.co/2026/04/13/economia-y-finanzas/bre-b-supero-670-millones-de-transacciones-y-105-billones-en-sus-primeros-seis-meses/)
22. [Valora Analitik - Débitos automáticos con llaves Bre-B](https://www.valoraanalitik.com/debitos-automaticos-con-llaves-bre-b/)
23. [Descubre.vc - DRUO habilita pagos recurrentes automáticos en Bre-B (jul-2026)](https://www.descubre.vc/noticia/druo-habilita-los-primeros-pagos-recurrentes-autom-ticos-en-el-sistema-bre-b-de-colombia-2026-07-22)
24. [Infobae - Costo de las transferencias con Bre-B en los próximos 3 años](https://www.infobae.com/colombia/2024/10/16/este-sera-el-costo-de-las-transferencias-en-los-proximos-3-anos-con-nuevo-sistema-de-pagos-del-banco-de-la-republica/)
25. [Treli - Cómo funcionan los métodos de pago](https://intercom.help/treli/es/articles/10929424-como-funcionan-los-metodos-de-pago-en-treli-explicacion-detallada)
26. [Treli - Cómo funciona Daviplata recurrente](https://intercom.help/treli/es/articles/14355256-como-funciona-daviplata-recurrente)
27. [Superintendencia Financiera - Conceptos: Intermediarios de seguros](https://www.superfinanciera.gov.co/publicaciones/18410)
28. [Superintendencia Financiera - Contrato de seguro. Terminación automática del contrato](https://www.superfinanciera.gov.co/publicaciones/15031)
30. [Report URI - PCI DSS 4.0.1 SAQ A and client-side security FAQ](https://blog.report-uri.com/pci-dss-4-0-1-saq-a-and-client-side-security-a-plain-english-faq/)
31. [Función Pública - Decreto 1692 de 2020](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=153787)
32. [EBANX Docs - Bre-B Colombia](https://docs.ebanx.com/docs/pay-in/processing/payment-methods/country-specific/colombia/breb)
33. [Tiendanube - Mercado Pago para tiendas online: guía 2026](https://www.tiendanube.com/blog/claves-para-tu-comercio-como-funciona-mercado-pago/)
34. [Valora Analitik - Bold revela estrategia 2025](https://www.valoraanalitik.com/?p=426820)
