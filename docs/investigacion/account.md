# Cuenta, retención y comunicaciones

> Investigación del 2026-10-06 con búsqueda web. Lo marcado como no verificado debe confirmarse antes de usarse en producción.


# Frente: cuenta de usuario, retención y comunicación con aseguradoras y empresas

> Fecha de corte: 2026-10-06. Varias fuentes primarias (Función Pública, DIAN, SIC, Meta for Developers) no se pudieron abrir desde este entorno porque el proxy las bloquea. En esos casos usé el resultado del buscador o una fuente secundaria, y lo marco con **(verificar)**. Tarifas y calendarios cambian a menudo, así que hay que revalidarlos antes de lanzar.

## 0. Contexto de mercado

- Según cifras de Fasecolda recogidas en prensa, solo **entre 11,7 % y 12,2 % del parque automotor** (~21,2 M de vehículos) tiene seguro voluntario. Sin contar motos, la penetración es del **27 %** (hace seis años era 31 %). En 2025 hubo ~2,48 M de vehículos asegurados [32][33]. Para la retención importa este dato: la **tasa de renovación de la póliza voluntaria de autos en 2024 fue ~73 %** (cifra citada en resultados de búsqueda, **verificar** en el informe original de Fasecolda) [33].
- **Implicación de producto:** el usuario de motos casi nunca tiene seguro voluntario, pero siempre tiene SOAT y debe hacer RTM. Los recordatorios obligatorios (SOAT, RTM, impuesto, licencia) son la puerta de entrada y la razón para crear cuenta. Desde ahí se puede vender el seguro voluntario.

---

## 1. Compra sin registro y reclamación de la cuenta (guest checkout y account claiming)

### Evidencia
- Baymard (2025): **19 %** de los compradores abandona el carrito cuando se exige crear cuenta (es la 4.ª causa). En otra encuesta la cifra llega a 26 %. Además, **62 %** de los sitios no pone "comprar como invitado" como la opción más visible [12].
- Para cotizar un seguro ya hay que pedir nombre, documento, fecha de nacimiento, celular y email. Por eso la "cuenta" puede existir de forma **implícita** (cuenta sombra) sin que el usuario tenga que hacer nada.

### Diseño recomendado
| Paso | Comportamiento |
|---|---|
| Cotización | Se crea un `lead` con un identificador anónimo (cookie o dispositivo). Todavía no hay cuenta. |
| Pago aprobado | Se crea una **cuenta sombra** con clave natural `tipo_doc + num_doc`. El celular y el email verificados quedan como factores de acceso. La póliza se asocia al **tomador** (documento), no al email. |
| Página de éxito | Botón "Activa tu billetera de seguros" con OTP al celular, que ya viene precargado. Un solo paso, sin contraseña. |
| Email o WhatsApp de confirmación | Mensaje *utility* con la póliza en PDF y un **enlace mágico de un solo uso** (vence en 24–72 h) para reclamar la cuenta. |
| Reclamación posterior | Si alguien entra con otro email o celular pero con el mismo documento, **no se fusiona automáticamente**: hay que verificar con OTP el canal registrado en la compra, o pasar por soporte con validación de identidad. Así se evita que alguien se apropie de la cuenta conociendo solo un número de cédula. |
| Fusión de cuentas | Herramienta en el backoffice con registro de auditoría para unir duplicados (por ejemplo, dos emails con el mismo documento). |

### Autenticación sin contraseña
- **OTP por WhatsApp (plantilla *authentication*).** Meta exige un botón de "copiar código" o de autocompletar con un toque. El autocompletado de uno o cero toques **solo funciona en Android** y requiere app nativa (validación del hash de firma). En la web el usuario siempre verá "copiar código" [10]. Es la opción más barata y la que mejor llega en Colombia (ver costos abajo).
- **OTP por SMS** como respaldo. Usar `autocomplete="one-time-code"` y la **WebOTP API** en Android/Chrome.
- **Enlaces mágicos por email**, útiles para la reclamación diferida y para escritorio.
- **Passkeys (WebAuthn).** FIDO Passkey Index (oct-2025): éxito de inicio de sesión de 93 % frente a 63 % con otros métodos, −73 % de tiempo de login y −81 % de incidentes de soporte [11]. Recomendación: ofrecer "crear passkey" **después** del primer login con OTP. No conviene como método inicial.
- **Login social** (Google y Apple). Prioridad baja. En seguros pesa más el documento de identidad que la identidad social. Sirve en escritorio, pero obliga a vincular el documento de todas formas.
- **Contraseña:** no se recomienda. Si se ofrece, que sea opcional.

### Costos de mensajería (orden de magnitud; **verificar** tarifas vigentes)
| Canal | Costo aproximado | Notas |
|---|---|---|
| WhatsApp *authentication* y *utility* | ~USD 0,0008 por mensaje entregado en Colombia (fuente secundaria). Meta subió las tarifas de *utility* y *authentication* para Colombia desde el 1-oct-2025 [4][5] | Cobro por mensaje desde el 1-jul-2025. Las plantillas *utility* enviadas dentro de la ventana de 24 h de servicio son **gratis** [4][5]. **Verificar** en la tabla oficial de Meta, que no se pudo abrir desde aquí. |
| WhatsApp *marketing* | ~USD 0,0125 por mensaje (fuente secundaria) [5] | Unas 15 veces más caro que *utility*. |
| SMS A2P (Twilio) | USD 0,0592 por mensaje, más USD 0,001 por mensaje fallido [6] | Agregadores locales: promedio ponderado ~USD 0,0335 [7]. Conviene un proveedor local con código corto. |
| Email | Marginal | Requiere SPF, DKIM y DMARC; ver §3. |

**Riesgo de SMS:** la CRC indica que 97 % del fraude actual llega por SMS [8]. Está implementando validación de remitentes y formatos registrados para mensajes desde códigos cortos [9] **(verificar el número de resolución y su vigencia)**. El OTP por SMS será más lento de habilitar y tiene peor reputación, otra razón para que WhatsApp sea el canal principal.

---

## 2. Gestión de pólizas (billetera)

### Funcionalidades
1. **Billetera de pólizas** que reúne las compradas en SeguAlaFija (con datos estructurados vía API de la aseguradora) y las **externas** (subidas a mano o por PDF).
   - Externas: subir PDF → OCR o LLM extrae aseguradora, número, vigencia, placa, prima y coberturas → el usuario confirma los campos. Etiquetarlas como "Póliza externa – datos ingresados por ti".
   - SOAT: se puede leer el estado por placa en la consulta ciudadana del RUNT, que pide placa y documento del propietario [17]. **No encontré una API pública del RUNT para terceros.** La integración tendría que hacerse por convenio o con proveedores autorizados. No hacer *scraping*.
2. **Mis vehículos:** placa, marca, línea, modelo, ciudad de circulación (para pico y placa), fecha de matrícula (para calcular la RTM), propietario y conductor habitual.
3. **Documentos:** carátula y condicionado de la póliza, certificado de pago, tarjeta de propiedad (opcional) y licencia. Cifrados en reposo, con URLs firmadas de corta duración. Son datos personales, así que aplica Ley 1581.
4. **Pagos y cuotas:** plan de pagos, estado (al día, en mora), enlace para pagar la cuota y recordatorio. **Riesgo:** en Colombia el no pago de la prima puede producir la terminación automática del contrato (Código de Comercio, art. 1068, **verificar** el texto). El recordatorio de cuota es un servicio de retención crítico, no un extra.
5. **Renovaciones:** 45, 30, 15 y 7 días antes del vencimiento. **Recotizar automáticamente** con las aseguradoras conectadas y mostrar "tu póliza actual frente a las mejores 3 alternativas" según el perfil de prioridades guardado en el cuestionario. Si la aseguradora lo permite, ofrecer **renovación en un clic**.
6. **Reportar siniestro:** guía paso a paso (seguridad → fotos → datos del tercero → croquis o tránsito → llamar a la línea), con **botón para llamar** y **enlace de WhatsApp** de cada aseguradora, tomados del catálogo del backoffice. Las líneas (#624 Mapfre, etc.) **no deben quedar fijas en el código**: hay que verificarlas con cada aseguradora y mostrar la fecha de la última verificación. Más adelante, seguimiento del estado del siniestro vía API.
7. **Cancelación o revocación.** El tomador puede revocar el seguro **en cualquier momento** con aviso escrito. La devolución de la prima no devengada se calcula con la **tarifa de corto plazo** (C. Co. art. 1071) [13][14]. La plataforma debe permitir solicitar la revocación, enviarla a la aseguradora y llevar el seguimiento.
8. **Retracto (5 días hábiles, Ley 1480 art. 47) en ventas a distancia** [15]. Hay que confirmar con un abogado si aplica a seguros vendidos en línea, porque los productos financieros tienen régimen especial (Ley 1328 de 2009) [16]. Si aplica, el reembolso debe hacerse en máximo 30 días calendario y sin descuentos [15]. **Pregunta abierta clave.**

---

## 3. Recordatorios

### Reglas de negocio (para el motor de recordatorios)
| Recordatorio | Regla | Fuente |
|---|---|---|
| Póliza voluntaria | Fecha fin de vigencia; avisos a 45/30/15/7/1 días | Datos de la póliza |
| SOAT | Vigencia anual. Desde el 24-mar-2025 se necesita SOAT vigente para hacer la RTM | [20] |
| RTM | **Particulares (no motos):** primera revisión al **5.º año** desde la matrícula (Ley 2294 de 2023, PND, que modificó los 6 años del Decreto 019/2012). **Motos y servicio público:** a los **2 años**. Después, cada año | [18] |
| Multas | El Consejo de Estado frenó los comparendos "automáticos" basados solo en el RUNT (sin prueba de que el vehículo circulaba). Útil para el contenido, pero no se debe usar como argumento para no renovar | [19] |
| Licencia de conducción (particular) | 10 años si el conductor es menor de 60; 5 años entre 60 y 80; 1 año si es mayor de 80 | [21] |
| Pico y placa | Lo define cada ciudad y cambia cada semestre o por eventos. **Bogotá 2026:** particulares de 6:00 a 21:00, L-V; en días impares circulan placas terminadas en 1-5 y en días pares las terminadas en 6-0 [22]. **Medellín, 2.º semestre 2026 (desde el 3-ago):** L 5-8, M 1-4, X 0-2, J 3-6, V 7, de 5:00 a 20:00. En carros cuenta el último dígito y en motos el **primero** [23] | Tabla de configuración por ciudad en el backoffice, editable por operaciones. No hay API oficial unificada. |
| Impuesto vehicular | Calendario por departamento. **Bogotá 2026:** 10 % de descuento hasta el 16-may y pago sin descuento hasta el 27-jun [24]. **Antioquia:** descuento hasta el 25-abr [25] | Tabla anual por departamento en el backoffice. |
| Cuotas | Fecha de cada cuota del plan de pagos | Pasarela o aseguradora |

### Canales y preferencias
- Canales: **WhatsApp *utility*** (principal), **email**, **push web**, SMS (respaldo).
- **Push web en iOS** solo funciona si el sitio está **instalado en la pantalla de inicio** (PWA con manifest, iOS 16.4+) y el permiso se pide tras una acción del usuario [31]. Hay que hacer el sitio instalable y explicar ese paso.
- Centro de preferencias por **tipo de mensaje × canal**: transaccionales (no se pueden desactivar), recordatorios (sí se pueden) y marketing (opt-in). También frecuencia, horario preferido y silencio por vehículo.
- Email: SPF, DKIM y DMARC, **baja en un clic (RFC 8058)** procesada en 2 días y tasa de spam por debajo de 0,3 %. Gmail y Yahoo lo exigen a quienes envían más de 5.000 correos al día [30].

### Cumplimiento de la Ley 2300 de 2023 ("Dejen de fregar")
- Se aplica a entidades vigiladas por la SFC y a cobranzas. **También** a cualquier proveedor que envíe mensajes publicitarios por SMS, apps de mensajería, email o llamadas [1][2].
- **Horario para publicidad:** L-V de 7:00 a 19:00 y sábados de 8:00 a 15:00. **Nunca domingos ni festivos** [1].
- Contacto solo por los **canales que el consumidor autorizó**. Máximo un contacto al día y no por varios canales en la misma semana. La redacción exacta de la regla de frecuencia aplica a la gestión de cobranza y hay que confirmar con un abogado cómo se interpreta para publicidad [1][2].
- Obligación de consultar el **Registro de Números Excluidos (RNE) de la CRC** antes de enviar SMS o llamadas comerciales [2][35].
- La SIC dio instrucciones sobre la ley (Circular Externa 01 de 2024) [3] **(verificar el contenido completo)**.
- **Requisito técnico:** un "policy engine" central por el que pasa todo mensaje saliente. Clasifica el mensaje (transaccional, recordatorio o publicitario), aplica horario y festivos de Colombia, consulta el límite de frecuencia por usuario, valida los canales autorizados y el RNE, y deja un log probatorio. Los recordatorios de interés del usuario (vencimiento del SOAT) deben quedar clasificados como **no publicitarios**, pero si incluyen una oferta ("renueva con X con 10 % de descuento") pasan a ser **publicitarios**. Hay que separar las plantillas.

---

## 4. Comunicaciones de aseguradoras y empresas hacia el usuario

### Marco
- **Habeas data (Ley 1581/2012 y Decreto 1377/2013, compilado en el DUR 1074/2015):** autorización previa, expresa e informada **por finalidad**. Los datos solo pueden usarse para la finalidad autorizada [27]. La SIC tiene una **Guía de tratamiento de datos para marketing y publicidad** y la Circular Externa 005/2020 pide aplicarla [26].
- **Compartir datos con una aseguradora para enviar una oferta** es una *transferencia o transmisión* que requiere autorización específica. Recomendación: **no entregar datos a los anunciantes**. La segmentación se hace dentro de SeguAlaFija ("clean room" interno) y la aseguradora solo recibe métricas agregadas y los leads de usuarios que pidieron explícitamente que los contacten.
- **Rol regulatorio de la plataforma:** si se vende el seguro de una aseguradora a través de la plataforma de un tercero no vigilado, ese tercero se considera **corresponsal digital** de la aseguradora (Decreto 1297 de 2022, que modificó el Decreto 2555/2010) [28][29]. La otra vía es constituirse como **agencia o corredor de seguros**. Esto define quién puede promover productos, cómo se cobra comisión y quién responde por la publicidad. La SFC tiene doctrina sobre programas publicitarios de intermediarios [34]. **Decisión estratégica abierta.**

### Funcionalidades
1. **Centro de ofertas y novedades** en la cuenta: un feed con etiqueta visible **"Publicidad" / "Patrocinado por X"**, separado de los recordatorios. Cada pieza muestra "por qué ves esto" (por ejemplo, "porque tu SOAT vence en 20 días").
2. **Consentimientos granulares** guardados como **registros versionados** (texto exacto de la política, fecha, canal, IP o dispositivo). Opciones: (a) términos y política de datos, obligatorio; (b) recordatorios, (c) ofertas de SeguAlaFija, (d) ofertas de aliados con segmentación, (e) contacto directo de una aseguradora específica. Cada una se puede revocar en un clic.
3. **Portal de anunciantes (self-service o gestionado):** crear una campaña (creatividad, segmento según atributos permitidos: tipo de vehículo, ciudad, mes de vencimiento, prioridad del cuestionario), presupuesto, calendario, **flujo de aprobación** (revisión legal y de marca de SeguAlaFija) y reporte agregado con umbral mínimo de audiencia (por ejemplo, 50 o más) para evitar reidentificar a alguien.
4. **Modelo de negocio para anunciantes:** CPM o patrocinio fijo en el centro de ofertas; **CPL** por lead calificado con consentimiento (e) y entrega por API o CSV; *featured listing* en resultados **marcado como patrocinado y sin alterar el orden por relevancia**, para no comprometer la neutralidad del recomendador; y contenido de marca (guías de siniestros). Aliados no aseguradores posibles: CDA, talleres, financieras, concesionarios. **Riesgo:** pagar por posición en el ranking puede verse como publicidad engañosa (Ley 1480) y destruye la confianza.

---

## 5. Backoffice o admin interno

| Módulo | Contenido mínimo |
|---|---|
| Catálogo | Aseguradoras (logo, NIT, líneas de siniestro, WhatsApp, fecha de verificación), productos, coberturas normalizadas (RC, PTD, PPD, hurto, asistencia, etc.), deducibles, conectores de API y su estado (mock o real) |
| Leads | Cotizaciones con el embudo, la fuente (UTM) y el estado. Asignación a asesores para el seguimiento humano, cumpliendo la Ley 2300 |
| Ventas y pólizas | Emisiones, número de póliza, prima, estado, documentos y endosos |
| Comisiones | Tabla de comisión por aseguradora, producto y ramo; comisión esperada frente a la cobrada |
| Conciliación | Cruce entre pasarela, aseguradora y comisión; manejo de diferencias, reversos y revocaciones (devolución de la prima de corto plazo y el *clawback* de la comisión) |
| Soporte | Tickets por usuario o póliza, plantillas de respuesta, fusión de cuentas, ejercicio de derechos de habeas data (consulta y reclamo, con plazos legales) y PQRS |
| Configuración de reglas | Pico y placa por ciudad, calendario de impuesto por departamento, festivos y horarios de la Ley 2300 |
| Campañas | Aprobación de campañas de anunciantes y lista de supresión |
| Métricas | Dashboards de KPIs (§6) |
| Seguridad | RBAC (operaciones, finanzas, soporte, partner, admin), auditoría de accesos a datos personales y 2FA obligatorio |

---

## 6. KPIs del producto

**Adquisición y conversión (por paso del embudo)**
- Visita → inicio de cotización → vehículo identificado (placa) → datos personales → cuestionario de prioridades → resultados vistos → detalle o comparación → checkout iniciado → pago aprobado → póliza emitida.
- Tasa de compra (pólizas emitidas / cotizaciones completas), tasa de aprobación de pago, tiempo hasta cotizar y tiempo hasta comprar, % de compras en móvil.
- CAC por canal = gasto / pólizas nuevas. CAC/LTV, donde LTV = comisión anual × años esperados de vida (según la renovación).

**Cuenta y retención**
- % de compradores invitados que reclaman la cuenta (meta inicial: 40 % o más en 30 días; **hipótesis a validar**).
- % de usuarios con 1 o más vehículos registrados, recordatorios activos, pólizas externas cargadas y passkey creada.
- **Tasa de renovación** frente al referente del sector (~73 %) [33], tasa de recaptura (pólizas externas que pasan a comprarse en la plataforma), *cross-sell* (SOAT → voluntario, carro → moto).
- Usuarios activos mensuales de la billetera y retención por cohortes en los días 30, 90 y 365.

**Comunicaciones**
- Entrega, apertura y clic por canal; costo por mensaje y por renovación lograda; tasa de opt-out y de quejas de spam (por debajo de 0,3 %) [30]; **cero incidentes de incumplimiento** de la Ley 2300.
- Anunciantes: ingreso por usuario activo, CTR del centro de ofertas, leads entregados y aceptados.

**Operación**
- Diferencias de conciliación (% y días para resolverlas), comisión cobrada frente a la esperada, tiempo de primera respuesta en soporte, tiempo de respuesta a solicitudes de habeas data.


## Funcionalidades sugeridas

| Prioridad | Funcionalidad | Descripción |
| --- | --- | --- |
| MVP | Compra como invitado con cuenta sombra por documento | Comprar sin registrarse. Al aprobarse el pago se crea una cuenta implícita con clave tipo+número de documento y el celular y email verificados. |
| MVP | Reclamación de cuenta con OTP o enlace mágico | CTA en la página de éxito y en el mensaje de confirmación para activar la billetera con OTP al celular de la compra o un enlace mágico de un solo uso (24-72 h). Sin fusión automática por documento. |
| MVP | Login sin contraseña (OTP por WhatsApp, SMS de respaldo, email) | Plantilla de autenticación de WhatsApp con botón de copiar código, SMS con WebOTP y autocomplete one-time-code, y enlace mágico por email. |
| V1 | Passkeys opcionales | Ofrecer crear una passkey después del primer login con OTP. |
| V2 | Login social (Google/Apple) | Alternativa de acceso que exige vincular el documento. |
| MVP | Billetera de pólizas | Lista de pólizas (compradas y externas) con estado, vigencia, coberturas, documentos y acciones. |
| V1 | Carga de pólizas externas por PDF con extracción automática | Subir un PDF y, con OCR o LLM, extraer aseguradora, número, vigencia, placa y prima, con confirmación del usuario. |
| MVP | Mis vehículos | Placa, marca, línea, modelo, ciudad, fecha de matrícula, propietario y conductor. Alimenta los recordatorios de RTM y pico y placa. |
| MVP | Motor de recordatorios vehiculares | Póliza voluntaria, SOAT, RTM (5 años para particulares, 2 para motos y público, luego anual), licencia (10/5/1 años según edad), impuesto por departamento, cuotas y pico y placa por ciudad. |
| MVP | Tablas configurables de pico y placa, impuesto y festivos | El backoffice mantiene las reglas por ciudad y departamento con vigencias, ya que cambian cada semestre o año. |
| MVP | Centro de preferencias de comunicación | Matriz de tipo de mensaje × canal, frecuencia, horario y silencio por vehículo. Los transaccionales no se pueden desactivar. |
| MVP | Policy engine de mensajes salientes (cumplimiento de Ley 2300) | Clasifica el mensaje, aplica el horario (L-V 7-19, sáb 8-15, nunca domingos ni festivos), límites de frecuencia, canales autorizados, consulta al RNE y log probatorio. |
| V1 | Renovación con recotización automática | A 45/30/15/7 días del vencimiento: recotizar en todas las aseguradoras, comparar con la póliza actual según las prioridades del usuario y ofrecer renovar en un clic. |
| V1 | Pagos y cuotas con recordatorio | Plan de pagos, estado, enlace de pago y aviso de mora. |
| MVP | Guía de siniestros por aseguradora | Paso a paso, botón de llamada y WhatsApp con contactos verificados y fechados desde el catálogo. Seguimiento del siniestro vía API en el futuro. |
| V1 | Revocación y retracto asistidos | Solicitud de revocación (art. 1071 C. Co., devolución de prima a corto plazo) y retracto si aplica, con envío a la aseguradora y seguimiento. |
| V1 | Push web (PWA instalable) | Manifest, service worker y flujo de instalación en iOS para poder enviar push. |
| MVP | Consentimientos versionados y gestión de habeas data | Registro de cada autorización por finalidad con versión del texto, y flujo de consultas, reclamos y supresión. |
| V1 | Centro de ofertas con publicidad marcada | Feed separado de los recordatorios, con etiqueta 'Patrocinado' y explicación de 'por qué ves esto'. |
| V2 | Portal de anunciantes con campañas y aprobación | Las aseguradoras y aliados crean campañas con segmentos permitidos, presupuesto y flujo de aprobación, y reciben reportes agregados con umbral mínimo de audiencia. |
| V1 | Entrega de leads con consentimiento explícito | Solo se envían a la aseguradora los usuarios que pidieron ser contactados por ella, vía API o CSV, con trazabilidad. |
| MVP | Backoffice: catálogo de aseguradoras y productos | CRUD de aseguradoras, productos, coberturas normalizadas, conectores de API (mock o real) y contactos de siniestro. |
| MVP | Backoffice: leads, ventas y pólizas | Embudo, estados, documentos y asignación a asesores. |
| V1 | Backoffice: comisiones y conciliación | Tablas de comisión, cruce entre pasarela, aseguradora y comisión, diferencias, reversos y clawback. |
| V1 | Backoffice: soporte, fusión de cuentas y auditoría | Tickets, PQRS, fusión de duplicados, RBAC y logs de acceso a datos personales. |
| V1 | Dashboards de KPIs | Embudo por paso, tasa de compra, CAC/LTV, reclamación de cuenta, renovación, cohortes y métricas de mensajería. |
| Futuro | Integración del SOAT y la RTM vía RUNT o proveedor autorizado | Leer automáticamente las vigencias por placa mediante convenio, sin scraping. |

## Riesgos

- Regulatorio: definir si SeguAlaFija opera como corresponsal digital (Decreto 1297/2022), agencia o corredor de seguros. Esto condiciona la venta, la comisión, la publicidad y si aplica la Ley 2300 en su régimen de entidades vigiladas.
- Incumplir la Ley 2300 de 2023 (horarios, canales autorizados, RNE) al enviar ofertas o recordatorios con contenido comercial puede traer quejas y sanciones de la SIC o la SFC.
- Habeas data: compartir datos con aseguradoras o anunciantes sin autorización específica por finalidad. Además, la falta de pruebas de consentimiento versionadas.
- Que alguien se apropie de una cuenta reclamándola solo con el número de documento. Se mitiga exigiendo OTP en el canal usado en la compra.
- Costos y entrega de OTP: las tarifas de Meta cambian (Colombia subió las de utility y authentication en oct-2025). El SMS sufre fraude y nueva regulación de la CRC sobre códigos cortos y remitentes, que puede retrasar la puesta en marcha.
- Push web en iOS requiere instalar la PWA, así que su alcance real puede ser bajo.
- Datos de reglas (pico y placa, impuesto, festivos, contactos de siniestro) desactualizados: recordatorios erróneos que dañan la confianza.
- Pólizas externas mal extraídas del PDF que llevan a recordatorios o comparaciones equivocadas.
- Retracto o revocación: obligaciones de reembolso y clawback de comisiones que afectan el flujo de caja y la conciliación. La aplicabilidad del retracto a seguros online no está resuelta.
- La publicidad pagada o los listados destacados pueden percibirse como sesgo del recomendador (publicidad engañosa, Ley 1480) y erosionar la confianza.
- Dependencia del RUNT: sin API pública, la automatización del SOAT y la RTM depende de convenios o de que el usuario ingrese los datos.
- Muchos datos de este análisis vienen de fuentes secundarias porque las primarias (Meta, Función Pública, SIC) no estaban accesibles: hay que revalidar tarifas y normas antes del lanzamiento.

## Preguntas abiertas

- ¿Con qué figura legal operará SeguAlaFija: corresponsal digital de cada aseguradora, agencia o corredor? ¿Ya hay asesoría legal o un aliado intermediario?
- ¿El retracto de 5 días hábiles se ofrecerá como política propia aunque su aplicación legal a seguros online sea discutible? ¿Quién asume el costo?
- ¿Quién emite y cobra: la aseguradora (con redirección o API de emisión) o SeguAlaFija como recaudador? Esto afecta la conciliación y las cuotas.
- ¿El canal principal de OTP y recordatorios será WhatsApp Business API? ¿Ya hay un BSP (Twilio, Infobip, 360dialog, un proveedor local) y un número verificado?
- ¿Se venderá también el SOAT en la plataforma o solo se recordará? Es el gancho de adquisición más masivo, sobre todo en motos.
- ¿Qué ciudades se priorizan para pico y placa e impuesto en el MVP (Bogotá, Medellín, Cali, Barranquilla)?
- ¿El modelo de ingresos incluye publicidad o leads de aseguradoras y aliados (CDA, talleres, financieras)? ¿Se permitirán listados patrocinados en los resultados o solo en el centro de ofertas?
- ¿Qué nivel de verificación de identidad se exige para reclamar la cuenta y para la fusión manual en soporte?
- ¿Se aceptará la carga de pólizas externas desde el MVP o en V1? ¿Hay presupuesto para OCR o LLM?
- ¿Cuáles son las metas iniciales de KPIs (conversión de cotización a compra, % de cuentas reclamadas, renovación) y el presupuesto de CAC?
- ¿Hay interés y presupuesto para buscar un convenio con el RUNT o un proveedor autorizado de consulta vehicular?

## Fuentes

1. [Ley 2300 de 2023 (Normograma MinTIC, PDF)](https://normograma.mintic.gov.co/docs/pdf/ley_2300_2023.pdf)
2. [Forvis Mazars - Conozca la Ley 2300 de 2023 o Ley 'Dejen de fregar'](https://www.forvismazars.com/co/es/acerca-de-nosotros/noticias-publicaciones-y-media/nuestras-noticias-y-publicaciones/actualidad-juridica-y-tributaria/2024/conozca-la-ley-2300-de-2023)
3. [SIC Circular Externa 01 de 2024 - Instrucciones frente a la Ley 2300 (Cerlatam)](https://www.cerlatam.com/normatividad/sic-circular-externa-01-de-2024/)
4. [Meta - Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing)
5. [Message Central - WhatsApp Business API pricing 2026](https://www.messagecentral.com/blog/whatsapp-business-api-pricing-2026)
6. [Twilio SMS pricing Colombia](https://www.twilio.com/sms/pricing/co)
7. [Sent.dm - Colombia SMS pricing](https://sent.dm/resources/colombia-sms-pricing)
8. [Portafolio - Los mensajes de texto no mueren (2025)](https://www.portafolio.co/tecnologia/los-mensajes-de-texto-no-mueren-asi-se-mantienen-vigentes-en-2025-638661)
9. [CRC - Normatividad sobre SMS y códigos cortos (resolución, verificar número)](https://www.crcom.gov.co/sites/default/files/normatividad/00008293.pdf)
10. [360dialog - Zero-Tap Authentication Templates (WhatsApp)](https://docs.360dialog.com/docs/waba-messaging/template-messaging/authentication-templates/zero-tap-authentication-templates)
11. [FIDO Alliance - Passkey Index (oct 2025)](https://fidoalliance.org/fido-alliance-launches-passkey-index-revealing-significant-passkey-uptake-and-business-benefits/)
12. [Baymard - Current state of checkout UX](https://baymard.com/blog/current-state-of-checkout-ux)
13. [Código de Comercio (Normograma Cancillería, PDF)](https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/pdf/codigo_comercio_pr033.pdf)
14. [Superfinanciera - Doctrina: Contrato de Seguro](https://www.superfinanciera.gov.co/publicaciones/18375)
15. [Asuntos Legales - Todo lo que debe saber sobre el derecho al retracto](https://www.asuntoslegales.com.co/consumidor/todo-lo-que-debe-saber-sobre-el-derecho-al-retracto-y-mire-en-que-situaciones-aplica-3785770)
16. [Ley 1328 de 2009 (régimen de protección al consumidor financiero)](https://normas.cra.gov.co/Gestor/Docs/ley_1328_2009.htm)
17. [RUNT - Consulta de vehículos por placa](https://www.runt.gov.co/actores/ciudadano/consulta-de-vehiculos-por-placa)
18. [RUNT - Norma sobre plazos de revisión técnico-mecánica (PND Ley 2294)](https://www.runt.gov.co/sites/default/files/normas/20234000000637_51460.pdf)
19. [RCN Radio - Conductores evitarían multa por SOAT o tecnomecánica bajo esta condición](https://newsroom.rcnradio.com/colombia/conductores-en-colombia-evitarian-multa-por-soat-o-tecnomecanica-bajo-esta-condicion)
20. [Claro Sports - Sin SOAT vigente no podrás hacer revisión técnico-mecánica](https://www.clarosports.com/colombia/actualidad-co/sin-soat-vigente-no-podras-hacer-revision-tecnico-mecanica-y-esta-seria-la-multa-economica/)
21. [Noticias RCN - Quiénes deben renovar la licencia de conducción](https://www.noticiasrcn.com/colombia/quienes-deben-renovar-su-licencia-de-conduccion-en-colombia-386919)
22. [Alcaldía de Bogotá - Pico y placa 6 al 12 de julio 2026](https://bogota.gov.co/mi-ciudad/movilidad/consulta-el-pico-y-placa-en-bogota-del-6-al-12-de-julio-2026)
23. [Blu Radio - Rotación pico y placa Medellín segundo semestre 2026](https://www.bluradio.com/regiones/antioquia/asi-rotara-la-medida-de-pico-y-placa-en-medellin-durante-segundo-semestre-de-2026-rg10)
24. [Noticias RCN - Fechas impuesto de vehículos Bogotá 2026](https://www.noticiasrcn.com/economia/fechas-para-impuesto-predial-y-de-vehiculos-en-bogota-2026-978274)
25. [Canal Trece - Impuesto vehicular 2026: fechas y descuentos](https://canaltrece.com.co/noticias/impuesto-vehicular-2026-fechas-descuento-pago/)
26. [SIC Circular Externa 005 de 2020](https://normas.cra.gov.co/Gestor/docs/circular_superindustria_0005_2020.htm)
27. [Decreto 1377 de 2013 (reglamenta Ley 1581 de 2012)](https://cajica.gov.co/anterior/juridica/Decreto%201377%20de%202013-Reglamenta%20Ley%201581%20de%202012.pdf)
28. [Superfinanciera - Boletín Jurídico No. 104](https://www.superfinanciera.gov.co/publicaciones/10113931/normativa/normativa-general/boletin-juridico-superintendencia-financiera/boletin-juridico-no--10113931/)
29. [Asuntos Legales - Open finance, corresponsalía digital y uso de red](https://www.asuntoslegales.com.co/consultorio/open-finance-corresponsalia-digital-y-uso-de-red-3502166)
30. [AWS Messaging Blog - Bulk sender changes at Yahoo and Gmail](https://aws.amazon.com/cn/blogs/messaging-and-targeting/an-overview-of-bulk-sender-changes-at-yahoo-gmail/)
31. [OneSignal - Web push for iOS](https://documentation.onesignal.com/docs/web-push-for-ios)
32. [La República - Solo 12,2 % de los vehículos cuentan con seguro voluntario](https://www.larepublica.co/finanzas/solo-12-2-de-todos-los-vehiculos-en-colombia-cuentan-con-un-seguro-voluntario-4083629)
33. [Fasecolda - Comunicado cifras 2026](https://www.fasecolda.com/wp-content/uploads/COMUNICADO-2026-CIFRAS-FINAL.pdf)
34. [Superfinanciera - Boletín jurídico: seguros, intermediarios, programas publicitarios](https://www.superfinanciera.gov.co/publicaciones/10099001/normativanormativa-generalboletin-juridico-superintendencia-financieraboletin-juridico-numero-seguros-intermediarios-proteccion-al-consumidor-financiero-programas-publicitarios-10099001/)
35. [Portafolio - Cómo evitar llamadas y mensajes de spam (Registro de Números Excluidos CRC)](https://www.portafolio.co/tendencias/sociales/como-evitar-que-le-sigan-llegando-llamadas-y-mensajes-de-spam-a-su-celular-604205)
