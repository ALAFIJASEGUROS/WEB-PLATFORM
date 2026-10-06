# Investigación (corte 2026-10-06)

> **Alcance:** los 7 frentes terminaron. Este documento cubre **benchmark** y **regulación**; los
> otros cinco tienen su propio documento en [investigacion/](investigacion/) y se resumen en la
> sección 4. Las funcionalidades derivadas están en el [backlog](04-backlog.md), épica E17.
> Lo marcado **[no verificado]** viene de conocimiento general y hay que confirmarlo.

## 1. Benchmark competitivo

### Colombia
| Actor | Tipo | Notas | Estado |
| --- | --- | --- | --- |
| ComparaOnline | Comparador / intermediario | ~70% de ingresos por intermediación de autos en Colombia [B2] | Activo según prensa 2022 |
| Busqo | Comparador y venta de todo riesgo auto y hogar [B4] | | Sin verificar |
| Bancolombia (con Sufi y Willis) | Banco que cotiza y compara todo riesgo [B6] | | Activo |
| Nequi, Rappi, Seguros Falabella | Venden **SOAT** con datos mínimos [B7][B8] | | Activo 2024–2025 |
| Tú Primero | Insurtech de movilidad para población desatendida [B9] | | Sin verificar |
| ComparaLatam, Rastreator, Comparabien | Comparadores citados [B1][B10] | | Sin verificar |

**Patrones observados**
- El flujo arranca con "¿tienes la placa?": con placa se autocompletan los datos, sin placa se piden manualmente [B1].
- El SOAT se compra en pocos pasos y es la puerta de entrada de mayor frecuencia.
- La venta digital reduce hasta un 70% el costo de distribución, lo que vuelve rentables las motos y los vehículos antiguos [B9].

### Referente global: Jerry (EE. UU.)
Es una agencia con licencia. El cuestionario toma menos de 2 minutos y compara en tiempo real. Permite comprar y cambiar de póliza, y **vigila las tarifas para avisar cuándo conviene re-cotizar**. Gana por comisión, sin costo para el usuario [B11][B12].

### Matriz (V = verificado, P = probable)
| Función | ComparaOnline | Bancolombia | Nequi/Rappi | Jerry | SeguAlaFija hoy |
| --- | --- | --- | --- | --- | --- |
| Cotización online | V | V | V | V | ✅ simulada |
| Consulta por placa | P | P | V | n/a | ✅ simulada |
| Comparación lado a lado | V | V | – | V | ✅ hasta 3 |
| Recomendación personalizada | P | – | – | P | ✅ explicable (prioridad única) |
| Compra online | P | V | V | V | ✅ Wompi / simulada |
| Cuenta y gestión de pólizas | P | V | V | V | ✅ |
| Recordatorios y re-cotización | P | P | P | V | ✅ recordatorios · ❌ re-cotización |
| Asesor humano / chat | P | P | – | P | ❌ |

### Modelos de negocio
1. Comisión de intermediación (exige figura vigilada por la SFC).
2. Lead-gen pagado por la aseguradora: es el camino más rápido sin emisión vía API.
3. Mensajes patrocinados a usuarios con consentimiento.
4. Alianzas embebidas con bancos o fintech.

**Implicaciones**
- El diferencial es la **recomendación explicable**, y conviene evolucionar a prioridades ponderadas en lugar de una sola.
- El SOAT puede funcionar como gancho.
- La re-cotización al renovar justifica tener cuenta.

## 2. Marco regulatorio

| Figura | Qué permite | Encaje |
| --- | --- | --- |
| Sociedad corredora (EOSF) | Comparar y colocar pólizas de varias aseguradoras, cobrando comisión | Es la ideal, pero la más costosa **[no verificado: montos]** |
| Agencia o agente | Promover pólizas de las aseguradoras con convenio | Camino rápido para el MVP |
| Corresponsalía digital / uso de red (Dto. 1297/2022) | La aseguradora comercializa en una plataforma no vigilada, con contrato que reparte responsabilidades | Modelo embebido recomendado para el MVP [R3] |
| Sandbox SFC (Dto. 1234/2020) | Licencia temporal para probar modelos innovadores | Alternativa para el recomendador [R1][R2] |

**Implicaciones para el producto**
- **Ley 1328 de 2009:**
  - Información cierta y comparación homogénea.
  - Ficha de producto con exclusiones, prima total con IVA y condicionado.
  - Transparencia sobre la comisión.
  - Defensor del Consumidor Financiero y SAC **[no verificado: texto vigente]**.
- **Retracto (Ley 1480, art. 47):** aplica a ventas a distancia [R6][R7]. Falta confirmar cómo se aplica a seguros y cómo se devuelve la prima.
- **Ley 2300 de 2023:** contacto de L–V 7:00–19:00 y sábados 8:00–15:00, sin domingos ni festivos, máximo un contacto al día y solo por canales autorizados [R4][R5]. ✅ El horario ya está implementado; faltan festivos y el tope diario.
- **Habeas data (Ley 1581/2012):**
  - Consentimientos separados y no premarcados (emisión, recordatorios, marketing de terceros).
  - Prueba de cada consentimiento (fecha, versión del texto, IP).
  - Registro en el RNBD y canal de consultas y reclamos.
- **SARLAFT:** campos de conocimiento del cliente por aseguradora (PEP, ocupación) y consulta de listas a través de la aseguradora.
- **Firma electrónica (Ley 527/1999):** aceptación trazable con OTP y log inmutable.
- **SOAT:** tarifa regulada e igual en todas las compañías, así que no se compara por cobertura. En motos hay alta siniestralidad y riesgo de restricciones.
- **RUNT y Fasecolda:** acceso solo por convenio o licencia; no hacer scraping.

**Recomendación:** para el MVP, usar corresponsalía digital con cada aseguradora o aliarse con un intermediario autorizado. No recaudar primas por cuenta propia sin concepto jurídico.

## 3. Riesgos principales
- Intermediar sin figura autorizada por la SFC.
- Usar marcas reales con datos simulados: ya se mitigó con avisos de "Demo" en toda la app, pero sigue siendo un riesgo.
- Sesgo percibido por la comisión: se mitiga con la página *Cómo funciona* y con la comisión fuera del puntaje.
- Dependencia de que existan APIs de las aseguradoras; si no, el modelo cae en lead-gen manual.
- Acceso restringido a RUNT y Fasecolda.

## 4. Frentes complementarios (resumen)

| Frente | Documento | Implicaciones principales |
| --- | --- | --- |
| Pagos | [payments.md](investigacion/payments.md) | Abstraer la pasarela (`PaymentProvider`) para no depender solo de Wompi y sumar PayU como respaldo. Máquina de estados de pago y de póliza con transiciones monótonas. Emitir solo con el webhook, nunca con el redirect. Priorizar Nequi, PSE, Daviplata, Bancolombia y QR/Bre-B en móvil. Recaudo directo o *split* por aseguradora para evitar el 4x1000 y el riesgo de recaudar primas sin figura. Avisos de mora: la mora termina el contrato (art. 1068 C. Co.). |
| Recomendador | [recommender.md](investigacion/recommender.md) | Separar **elegibilidad** (filtros duros: uso en plataformas, domicilios, prenda del banco) del **puntaje**. Subpuntajes 0–100 por dimensión, empate técnico y etiquetas "Mejor para ti", "Mejor precio" y "Mejor cobertura". Guardar versión del algoritmo, pesos y posiciones de cada recomendación. Página pública con la metodología y declarar cuántas aseguradoras se comparan. Riesgo de que se considere asesoría: definir la figura legal. |
| Integraciones | [integrations.md](investigacion/integrations.md) | No hay APIs públicas: cada aseguradora exige convenio. Contrato de adaptador v2 (idempotencia en la emisión, estado de emisión, documento, *healthcheck*, vigencia de la cotización). Emisión asíncrona con *outbox* y reintentos, y revalidar el precio antes de pagar. RUNT y Fasecolda solo vía proveedor autorizado y con consentimiento. **Recomienda reemplazar las marcas reales de los mocks por aseguradoras ficticias.** |
| UX | [ux.md](investigacion/ux.md) | Quitar claims sin respaldo (ahorros, número de aseguradoras). Bloque de precio normalizado (prima, IVA, total, cuota, deducible en % y SMMLV). Resumen editable al final del cuestionario, estados de carga parciales, comparador apilado en móvil, CTA *sticky* sin tapar el foco. PWA instalable con íconos PNG. Pruebas con 5–8 usuarios por segmento. |
| Cuenta | [account.md](investigacion/account.md) | Cuenta sombra por documento tras la compra y reclamación con OTP en el canal usado. Login por WhatsApp/SMS además de correo. Centro de preferencias (tipo × canal) con los transaccionales no desactivables. Motor de reglas de mensajes (Ley 2300 y RNE). Tablas configurables de pico y placa e impuesto. Guía de siniestros por aseguradora y revocación asistida. |

**Decisiones que dependen del negocio:** figura de intermediación (agencia, corredor o corresponsal
digital), quién recauda la prima y si se mantienen las marcas reales en el prototipo.

## Fuentes
- [B1] Portafolio, comprar seguro de carro: https://www.portafolio.co/economia/finanzas/lo-que-debe-saber-antes-de-comprar-un-seguro-para-su-carro-529941
- [B2] La República, ComparaOnline 2022: https://www.larepublica.co/finanzas/comparaonline-fintech-del-mercado-de-seguros-estima-ventas-por-1-billon-en-2022-3408313
- [B3] La República, ComparaOnline adquiere empresa: https://www.larepublica.co/empresas/comparaonline-adquiere-empresa-en-colombia-y-proyecta-explosivo-crecimiento-en-ventas-2769090
- [B4] Busqo: https://bouncewatch.com/company/busqo
- [B6] Bancolombia todo riesgo: https://www.bancolombia.com/personas/seguros/online/todo-riesgo-carros
- [B7] Portafolio, SOAT en Nequi/Rappi/Falabella: https://www.portafolio.co/mis-finanzas/ahorro/asi-puede-comprar-el-soat-en-plataformas-como-nequi-rappi-o-seguros-falabella-621789
- [B8] Valora Analitik, SOAT con Nequi o Rappi: https://www.valoraanalitik.com/2024/01/17/soat-en-colombia-se-puede-adquirir-con-rappi-o-nequi/
- [B9] Portafolio, digitalizar seguros de carros: https://www.portafolio.co/economia/finanzas/digitalizar-seguro-de-carros-ya-no-es-tema-marginal-643207
- [B10] ComparaLatam: https://comparalatam.com/co/seguro/particular/auto/
- [B11] Jerry, cómo funciona: https://jerry.ai/car-insurance/how-jerry-works/
- [B12] Motley Fool, reseña de Jerry: https://www.fool.com/money/insurance/auto/jerry-review/
- [R1] Valora Analitik, Dto. 1234/2020: https://www.valoraanalitik.com/colombia-da-un-paso-m-s-hacia-innovaci-n-tecnol-gica-financiera/
- [R2] Asuntos Legales, sandbox regulatorio: https://www.asuntoslegales.com.co/consultorio/sandbox-regulatorio-reflexiones-sobre-el-decreto-1234-de-2020-3198817
- [R3] Asuntos Legales, corresponsalía digital y uso de red: https://www.asuntoslegales.com.co/consultorio/open-finance-corresponsalia-digital-y-uso-de-red-3502166
- [R4] Ley 2300 de 2023 (MinTIC): https://normograma.mintic.gov.co/docs/pdf/ley_2300_2023.pdf
- [R5] Ley 2300 de 2023 (DIAN): https://normograma.dian.gov.co/dian/compilacion/docs/ley_2300_2023.htm
- [R6] SIC, excepciones al retracto: https://sedeelectronica.sic.gov.co/sites/default/files/normatividad/102018/Rad18_18185219excepcionesDerRetracto.PDF
- [R7] SIC, concepto sobre retracto: https://cdn.actualicese.com/normatividad/2016/Conceptos/C16062808-16.pdf
- [R8] Brigard Urrutia, finanzas abiertas y seguros: https://www.bu.com.co/es/insights/noticias/regulacion-sobre-finanzas-abiertas-y-la-industria-aseguradora
