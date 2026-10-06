# Sistema de recomendación

> Investigación del 2026-10-06 con búsqueda web. Lo marcado como no verificado debe confirmarse antes de usarse en producción.


# Sistema de recomendación por cuestionario: seguros de auto y moto (SeguAlaFija)

> Fecha de corte: 2026-10-06. Algunas fuentes no se pudieron abrir porque el proxy de red las bloqueó: el informe de EIOPA, el PDF de Santander y el Decreto 2123 en ramajudicial. En esos casos cito lo que mostraba el resultado de búsqueda y lo marco como **[no verificado en el texto completo]**. Las cifras y los umbrales que propongo para el scoring son **parámetros de diseño configurables**. No salen del mercado y no deben presentarse al usuario como datos.

---

## 1. Resumen ejecutivo

1. **Arquitectura recomendada para el MVP.** Proponemos tres capas que se pueden explicar al usuario:
   - **(a) Filtros duros de elegibilidad.** Una oferta que no cumple queda fuera, y le explicamos al usuario por qué.
   - **(b) Puntaje multiatributo aditivo**, tipo MAUT/SMART, con funciones de valor normalizadas de 0 a 100 por dimensión.
   - **(c) Pesos derivados de las respuestas**, sin pedir comparaciones por pares.

   AHP es la técnica clásica de selección de pólizas [21]. Sus comparaciones por pares crecen como n(n−1)/2 y eso agrega demasiada fricción en un celular. Conviene reservarlo para calibrar internamente los pesos base con expertos o actuarios, no para preguntárselo al usuario.
2. **Explicabilidad desde el primer día.** El modelo aditivo permite descomponer el puntaje en contribuciones por dimensión y generar mensajes como "Te recomendamos X porque…". La literatura advierte que explicar modelos multiatributo cuantitativos no es trivial y que se necesitan varias estrategias según qué tan reñida esté la decisión [22]. Por eso proponemos plantillas para tres casos: ganador claro, empate técnico y trade-off.
3. **Regulación y transparencia.** El punto más delicado es el regulatorio.
   - En Colombia, intermediar seguros está reservado a corredores, agencias y agentes, y a canales autorizados como el uso de red o los corresponsales [6][5].
   - La Ley 1328 de 2009 impone el principio de información "cierta, suficiente y oportuna" frente al consumidor financiero [3].
   - Un "mejor para ti" personalizado puede interpretarse como **asesoría**. El modelo de negocio (agencia o corredor propio, alianza con un intermediario o lead-gen para las aseguradoras) determina qué obligaciones de asesoría y revelación aplican. Hay que validarlo con un abogado antes del lanzamiento.
   - Como guía de buenas prácticas internacionales, EIOPA (2014) pide revelar la cobertura de mercado, los criterios de ranking, las relaciones comerciales y el significado de etiquetas como "best buy" [1][2].
4. **Cold start.** Al inicio no hay datos de conversión, así que el sistema arranca 100 % basado en reglas y pesos, y registra desde el día 1 los eventos necesarios (impresiones con su posición, clics, compras). Así se puede evolucionar después a A/B testing de presets de pesos, y más adelante a learning-to-rank o bandits contextuales con guardarraíles [19][20].
5. **Tres trampas del dominio** que el cuestionario debe capturar:
   - **Uso comercial** (plataformas, domicilios en moto): las pólizas personales suelen excluirlo [9][10].
   - **Vehículo financiado con prenda**: el banco exige beneficiario oneroso, coberturas mínimas y cláusulas de revocación [13][14].
   - **Valor del vehículo según la Guía de Valores Fasecolda**, que es el estándar del mercado para suscribir y para indemnizar [7][8].

---

## 2. Métodos evaluados y decisión

| Método | Qué es | Pros | Contras | Decisión |
|---|---|---|---|---|
| Ponderación simple (SAW/SMART) | Σ wₖ·Sₖ con Sₖ normalizado | Simple, explicable, rápido de iterar | Supone independencia entre atributos | **MVP** |
| MAUT con funciones de valor no lineales | Utilidad por atributo (p. ej. rendimientos decrecientes del límite de RCE) | Captura saturación y aversión al deducible | Hay que calibrar las curvas | **MVP**: curvas por tramos sencillas |
| AHP / Fuzzy AHP | Pesos a partir de comparaciones por pares | Riguroso; en la literatura sobre autos la prima resulta el criterio de mayor peso [21] | Demasiada fricción en móvil | **Solo interno**, para calibrar los pesos base |
| Filtros duros vs. blandos | Elegibilidad (excluye) vs. preferencia (pondera) | Evita recomendar pólizas inválidas | Requiere un catálogo de reglas por aseguradora | **MVP** |
| Elicitación por "presupuesto de 100 puntos" o arrastrar para ordenar | El usuario reparte su importancia entre criterios | Pesos explícitos | Agrega fricción y no todos la entienden | **V1** como modo "Afinar" opcional |
| Learning-to-rank / bandits contextuales | Aprende de las conversiones | Mejora con escala y resuelve el cold start de ítems nuevos [19][20] | Necesita volumen, riesgo de sesgo hacia lo más rentable | **V2/Futuro** |

---

## 3. Riesgos regulatorios, de sesgo y transparencia (insumo para backlog)

- **Asesoría o intermediación regulada.** El Decreto 2555 de 2010 define a los corredores como sociedades cuyo objeto exclusivo es ofrecer seguros y promover su celebración y renovación, y distingue tres figuras: corredores, agencias y agentes [6].
  - El Decreto 2123 de 2018 modificó el 2555 en materia de comercialización de seguros. Exige idoneidad y profesionalismo a quienes informan y asesoran, armoniza el **uso de red** y lista los ramos aptos para corresponsales [5]. Según el resumen consultado, en esa lista aparecen "Responsabilidad civil" y "Accidentes personales", pero **no** el "todo riesgo autos". **[No verificado en el texto completo]**
  - Requisito: definir la figura jurídica antes de cobrar comisiones o emitir.
- **Deber de información.** La Ley 1328/2009 exige información clara, transparente, comprensible, veraz y oportuna [3]. Para la recomendación eso implica:
  - mostrar exclusiones, deducibles y condiciones generales antes del pago;
  - una ficha "lo que NO cubre";
  - un enlace al clausulado.
- **Comisiones y patrocinios.**
  - Separar visual y técnicamente los espacios patrocinados del ranking.
  - Publicar una página "Cómo ordenamos" con criterios, pesos base y lista de aseguradoras comparadas, siguiendo las buenas prácticas de EIOPA [1][2].
  - La SIC sanciona la publicidad engañosa y exige identificar el contenido pagado [18].
  - Requisito: **la comisión nunca es una variable del score**, y se audita.
- **Datos personales y perfilamiento.** La SIC ha señalado que las herramientas de IA están sujetas a la Ley 1581/2012 (finalidad, transparencia, seguridad) [17].
  - Hace falta autorización explícita para usar las respuestas del cuestionario con fines de recomendación y para compartirlas con aseguradoras.
  - Hay que separar el consentimiento de marketing del de cotización.
- **Sesgos.**
  - (i) Sesgo de posición: el primer resultado convierte más aunque no sea el mejor.
  - (ii) Sesgo de catálogo: con solo 2 aseguradoras simuladas, "mejor" es relativo, así que hay que decirlo.
  - (iii) Proxy discriminatorio: ciudad y edad son legítimas para la tarifa de la aseguradora, pero **nuestro** ranking no debe introducir penalizaciones propias por género, estrato u otros atributos sensibles. No preguntar género.
  - (iv) Sesgo de popularidad o rentabilidad cuando se pase a ML.
- **Calidad de servicio.** La SFC publica estadísticas mensuales de quejas por entidad vigilada desde 2006 [15]. La Circular Externa 37 de 2018 adoptó un formato específico de "experiencia del consumidor financiero con el sector asegurador" [16]. Son una fuente objetiva y pública para la dimensión "Respaldo de la aseguradora". Hay que normalizar las quejas por volumen de pólizas y declarar la fecha del dato.

---

## 4. Cuestionario propuesto

**Principios de UX móvil**
- Una pregunta por pantalla, con barra de progreso por etapas: Vehículo → Uso → Tú → Prioridades.
- Siempre visibles un botón "No sé" y un "¿Por qué te preguntamos esto?".
- Autocompletar desde la placa (RUNT u otro proveedor, a validar) y desde el código Fasecolda, que tiene 8 dígitos (marca, tipología y consecutivo) [8].
- **Modo Exprés**: entre 8 y 10 toques hasta ver resultados. **Modo Afinar**: preguntas opcionales en la pantalla de resultados que reordenan en vivo. El reordenamiento en vivo reduce el abandono porque el usuario ve valor antes del esfuerzo.
- Las preguntas condicionales se muestran solo si aplican.

### 4.1 Auto (carro)

Leyenda: **[E]** Exprés, **[A]** Afinar (opcional).

**Bloque Vehículo**

| # | Pregunta | Por qué | Control móvil | Efecto en el scoring |
|---|---|---|---|---|
| A1 [E] | Placa (o marca/línea/modelo/versión) | Identifica la referencia Fasecolda y su valor comercial [7] | Input de placa con teclado alfanumérico y fallback a selects en cascada con búsqueda | Define el valor asegurado y la elegibilidad por antigüedad o tipo; es la entrada de la cotización |
| A2 [E] | Confirma el valor: "Tu carro vale aprox. $X según Fasecolda" | El valor asegurado manda en la prima y la indemnización | Tarjeta con valor y botón "Es correcto / Ajustar ±" (slider ±10 %, a validar con aseguradoras) | Alimenta el ajuste de pesos: vehículo de alto valor sube el peso de cobertura |
| A3 [E] | ¿Está financiado o tiene prenda? | El banco exige beneficiario oneroso y coberturas mínimas [13][14] | Sí/No; si es Sí, select del banco | **Filtro duro**: solo ofertas que cumplan la plantilla de requisitos de ese banco; sube el peso de cobertura |
| A4 [A] | ¿Tiene accesorios o blindaje? | Requieren amparo y declaración específicos | Toggle más campo de valor | Filtro duro si el usuario los quiere asegurados |

**Bloque Uso**

| # | Pregunta | Por qué | Control móvil | Efecto en el scoring |
|---|---|---|---|---|
| A5 [E] | ¿Para qué lo usas? Particular, trabajo propio, plataformas (transporte de pasajeros) | Las pólizas personales suelen excluir el uso comercial o lucrativo [9][10] | Chips de selección única con iconos | **Filtro duro**: con "plataformas" solo pasan productos que cubran ese uso; si no hay ninguno, se muestra un estado vacío honesto |
| A6 [A] | ¿Cuántos km recorres al mes? | Exposición al riesgo; algunas aseguradoras tienen planes por km | Chips por rangos (<500 / 500–1.500 / >1.500 / No sé) | Aumenta el peso de servicios (grúa, asistencia en viaje) si el kilometraje es alto; habilita productos por km |
| A7 [A] | ¿Dónde lo parqueas de noche? Garaje cerrado, parqueadero pago, calle | Riesgo de hurto | Chips | Sube el peso de los amparos de hurto si es calle; puede ser variable de tarifa |
| A8 [E] | Ciudad de circulación | Tarifa, red de talleres y asistencia | Autocompletar con lista DANE | Filtro duro de cobertura geográfica; subscore de red de talleres en la ciudad (V1) |

**Bloque Tú**

| # | Pregunta | Por qué | Control móvil | Efecto en el scoring |
|---|---|---|---|---|
| A9 [E] | ¿Quién lo maneja normalmente? Yo / otra persona / varios; edad del conductor habitual | Suscripción y tarifa | Chips más fecha de nacimiento (se reutiliza la del tomador) | Elegibilidad por edad mínima o máxima del producto |
| A10 [E] | En los últimos 3 años, ¿cuántas reclamaciones hiciste? 0 / 1 / 2+ / No sé | Elegibilidad y recargos | Chips | Filtro duro si el producto exige 0 siniestros; aviso de que el precio puede cambiar al emitir |

**Bloque Prioridades**

| # | Pregunta | Por qué | Control móvil | Efecto en el scoring |
|---|---|---|---|---|
| A11 [E] | **¿Qué es lo más importante para ti?** Pagar menos / estar muy protegido / tener servicios extra / balance | Pregunta principal para derivar pesos | 4 tarjetas grandes de selección única; opción "Ordenar mis 3 prioridades" (drag) en Afinar | Define el **preset de pesos** (tabla 5.3) |
| A12 [E] | Si tienes un choque pequeño, ¿qué prefieres? Pagar menos mensualidad aunque deba poner más dinero en el arreglo / pagar algo más y poner poco o nada | Mide la tolerancia al deducible en lenguaje simple, sin usar la palabra "deducible" | 2 tarjetas más "No sé" | Ajusta el peso del deducible y la curva de su función de valor |
| A13 [A] | ¿Qué servicios valoras? Carro de reemplazo, grúa, conductor elegido, asistencia jurídica, gastos de transporte, accidentes personales, cobertura de pérdidas parciales | Personaliza la dimensión de servicios | Multiselección de chips (máx. 3 "imprescindibles", marcados con estrella) | Los seleccionados pesan ×2 dentro de servicios; los imprescindibles son un **filtro blando**: penalización fuerte, no exclusión |
| A14 [A] | ¿Qué tipo de protección buscas? Solo lo obligatorio más RC / básico (pérdidas totales) / completo (también parciales) / No sé | Evita comparar planes de niveles distintos | Chips con explicación corta | Filtra el nivel de plan; "No sé" muestra los tres niveles con su etiqueta |

### 4.2 Moto

Se reutilizan A1–A3 y A8–A12 con texto adaptado. Cambios y preguntas propias:

| # | Pregunta | Por qué | Control | Efecto |
|---|---|---|---|---|
| M1 [E] | Cilindraje (se autocompleta desde la placa o Fasecolda) | Muchas aseguradoras restringen o recargan por cilindraje o tipo | Chips (<125 cc / 125–250 / 250–500 / >500) | Filtro duro de elegibilidad |
| M2 [E] | ¿Usas la moto para domicilios, mensajería o plataformas? No / A veces / Es mi trabajo | El uso comercial suele estar excluido en motos [9][10] | Chips | **Filtro duro**: con "A veces" o "Es mi trabajo" solo pasan productos que cubran ese uso; sube el peso de accidentes personales y de la moto de reemplazo o lucro cesante si existe |
| M3 [A] | ¿Dónde la parqueas? Igual que A7 | Hurto, riesgo dominante en motos | Chips | Sube el peso de hurto |
| M4 [A] | ¿Llevas parrillero con frecuencia? | Accidentes personales o RC frente a ocupantes | Sí/No | Sube el peso de accidentes personales para ocupantes |
| M5 [E] | Prioridad | Igual que A11 | | Preset de pesos. Se espera más sensibilidad a precio: según La República, solo 3 de cada 100 motos tienen todo riesgo [11] (fecha del dato no verificada) |

**Recuento.** Exprés auto: A1, A2, A3, A5, A8, A9, A10, A11 y A12, es decir 9 pantallas, varias de un solo toque. Exprés moto: 8–9 pantallas. Los datos personales del prototipo actual (nombre, documento) **no** deben pedirse antes de ver resultados. Se piden al emitir, y solo lo mínimo que exija la cotización real de la API.

---

## 5. Modelo de scoring

### 5.1 Pipeline

```
respuestas → perfil normalizado (UserProfile)
          → cotizaciones de N aseguradoras (adapters) → Offer normalizada (sección 6)
          → [1] Elegibilidad (filtros duros) → descartadas con motivo
          → [2] Subscores Sₖ ∈ [0,100] por dimensión
          → [3] Pesos wₖ derivados del perfil (Σw = 1)
          → [4] Score = Σ wₖ·Sₖ − penalizaciones blandas
          → [5] Umbrales, desempate y etiquetas
          → [6] Explicación (contribuciones)
```

### 5.2 Dimensiones y funciones de valor (normalización de pólizas heterogéneas)

Antes de normalizar, toda oferta se mapea a una **taxonomía canónica de amparos** (sección 6). La recomendación solo usa campos canónicos.

**S_precio**, sobre la prima anual total con impuestos y en COP.

`S_precio = 100 · exp(−k · (P / P_min − 1))`, con k ≈ 2 (parámetro). Una oferta 25 % más cara que la más barata obtiene ≈ 61; una que cuesta el doble, ≈ 14. Esta fórmula es estable con pocas ofertas, mientras que min-max lleva todo a 0/100 cuando solo hay 2. Si hay financiación de prima, se usa el costo total financiado.

**S_cobertura**, como suma ponderada de amparos con funciones de valor por tramos.
- **RCE (límite)**: curva cóncava por tramos de límite (tramos configurables en COP o SMMLV), con saturación.
- **Pérdida total por daños y por hurto**: 0 o 1, más % de valor asegurado (100 % del valor Fasecolda = 1).
- **Pérdida parcial por daños y por hurto**: 0 o 1. El umbral PT/PP suele fijarse en 75 % del valor asegurado [12]. Se guarda como campo porque varía.
- **Eventos de la naturaleza o terremoto, amparo patrimonial, accidentes personales del conductor (valor), asistencia jurídica**.
- Pesos internos de cada amparo: tabla configurable, calibrada con un experto (AHP interno).

**S_deducible**: función de valor decreciente sobre el **costo esperado de bolsillo** en un siniestro parcial típico.

`D_ef = max(deducible_min_COP, deducible_% · siniestro_ref)`, donde siniestro_ref es un parámetro por tipo y valor de vehículo. El resultado se normaliza contra la mejor oferta.

Si A12 = "poner poco o nada", la curva se vuelve más empinada (más aversión).

**S_servicios**: `Σ_s v_s · m_s / Σ v_s`.
- m_s es el nivel del servicio normalizado. Por ejemplo, días de carro de reemplazo / días_ref; eventos de conductor elegido por año / ref; km de grúa / ref; ilimitado = 1.
- v_s = 2 si el usuario lo marcó en A13 y 1 en otro caso.

**S_respaldo** (calidad de la aseguradora): quejas SFC por cada 10.000 pólizas del ramo autos [15][16], percentil invertido, más calificación de solvencia si se obtiene. Su peso es bajo y fijo. Se muestra al usuario con fecha del dato.

**Penalizaciones blandas**
- −15 por cada servicio "imprescindible" que falte (parámetro).
- −10 si el plan es de un nivel distinto al pedido en A14.
- Tope total: −30.

### 5.3 Pesos derivados de las respuestas (presets iniciales, a calibrar)

| Prioridad (A11) | precio | cobertura | deducible | servicios | respaldo |
|---|---|---|---|---|---|
| Pagar menos | 0,45 | 0,20 | 0,10 | 0,10 | 0,15 |
| Muy protegido | 0,15 | 0,40 | 0,15 | 0,10 | 0,20 |
| Servicios extra | 0,20 | 0,20 | 0,10 | 0,35 | 0,15 |
| Balance / No sé | 0,30 | 0,28 | 0,12 | 0,15 | 0,15 |

**Ajustes multiplicativos** (después se renormaliza a Σ = 1):
- Financiado (A3): cobertura ×1,3.
- Valor del vehículo en el cuartil alto o antigüedad ≤ 3 años: cobertura ×1,2.
- Vehículo de bajo valor o con más de 15 años (umbral a validar): precio ×1,2.
- A12 "poner poco": deducible ×1,5. A12 "pagar menos": precio ×1,2.
- Parqueo en calle (A7/M3): sube el peso interno de hurto dentro de cobertura.
- Uso laboral o plataformas: servicios ×1,2, con más peso interno para vehículo de reemplazo y accidentes personales.
- km altos: sube el peso interno de grúa y asistencia en viaje.
- Modo Afinar con ranking explícito de 3 prioridades: se reemplaza el preset por pesos de rank-order centroid (ROC). Por ejemplo, para 3 criterios: 0,61 / 0,28 / 0,11. Es un método estándar de pesos a partir de un orden y se combina con los ajustes.

### 5.4 Score final, umbrales y desempate

`Score(o) = E(o) · clamp(Σ wₖ·Sₖ(o) − Pen(o), 0, 100)`, con E ∈ {0,1}.

**Umbrales**
- Se muestran todas las elegibles.
- La etiqueta **"Mejor para ti"** solo se asigna si el score es ≥ 60 (parámetro).
- Si la ventaja sobre la segunda es < 3 puntos, se declara un **empate técnico**: "Estas dos son muy parecidas para ti; la diferencia es…".

**Desempate determinista**, en este orden:
1. menor costo de bolsillo esperado (prima + deducible ponderado);
2. mayor S_cobertura;
3. mayor S_respaldo;
4. orden alfabético estable.

Nunca se desempata por comisión ni por patrocinio.

**Etiquetas**, calculadas solo sobre las elegibles y con un mínimo de calidad para que no sean engañosas:
- **Mejor para ti**: el máximo Score.
- **Mejor precio**: la menor prima entre las ofertas del **mismo nivel de plan** (A14 o nivel inferido) y con S_cobertura ≥ piso. Así se evita que una RC sola "gane" contra un todo riesgo.
- **Mejor cobertura**: el máximo S_cobertura; si hay empate, gana el menor deducible.
- **Más servicios**: el máximo S_servicios (opcional).
- Una oferta puede tener varias etiquetas.
- **"Patrocinado"** es un slot aparte, rotulado y fuera del ranking (EIOPA pide explicar etiquetas tipo "best buy" y revelar relaciones comerciales [1][2]).

### 5.5 Explicabilidad

- **Contribución por dimensión**: `c_k = w_k · (S_k(o) − mean_k)`. Se muestran los 2 mayores aportes positivos ("porque…") y el mayor negativo ("ten en cuenta…"). Ejemplo: "Te la recomendamos porque **tu prioridad es estar protegido** y es la que tiene **menor deducible en choques pequeños** y **carro de reemplazo 10 días**. Ten en cuenta: cuesta $X más al año que la más barata".
- **Motivos de exclusión**: "No mostramos 1 oferta de [Aseguradora] porque no cubre uso en plataformas".
- **"Cambiar mis prioridades"**: chips en la parte superior de los resultados que reordenan en vivo y muestran la sensibilidad del ranking.
- **Página pública "Cómo recomendamos"**: dimensiones, presets de pesos, fuentes de datos con fecha, número de aseguradoras y productos comparados, y declaración de que la comisión no influye.
- **Versionado**: cada recomendación guarda `algo_version`, pesos, subscores y la oferta exacta, para auditoría y quejas. Respalda el deber de información [3].

---

## 6. Modelo de datos normalizado de una oferta

```ts
// Catálogo
Insurer { id, legalName, nit, sfcCode, logoUrl, complaintsRate?: {value, per10kPolicies, period, source:'SFC'}, active }
Product { id, insurerId, lineOfBusiness: 'AUTO'|'MOTO', planTier: 'RC'|'BASICO_PT'|'COMPLETO',
          name, termsUrl /*clausulado*/, version, validFrom, validTo,
          eligibility: EligibilityRule[] }
EligibilityRule { field: 'vehicleAgeYears'|'usage'|'cityCode'|'insuredValue'|'cc'|'driverAge'|'claims3y'|'lienBank'|...,
                  op: 'in'|'notIn'|'lte'|'gte'|'between', value, reasonText }

// Petición normalizada
QuoteRequest { id, vehicle: { plate?, fasecoldaCode, brand, line, model, year, cc?, bodyType,
                              fasecoldaValue, insuredValue, accessoriesValue?, armored? },
               usage: 'PARTICULAR'|'TRABAJO'|'PLATAFORMA_PASAJEROS'|'DOMICILIOS',
               kmPerMonthBand?, nightParking?: 'GARAJE'|'PARQUEADERO'|'CALLE',
               cityDaneCode, driver: { birthDate, isPolicyholder }, claims3y?: 0|1|2,
               lien?: { bankId } , consentIds[] }

// Oferta normalizada (salida del adapter de cada aseguradora)
Offer {
  id, quoteRequestId, insurerId, productId, planTier, externalQuoteId, quotedAt, expiresAt,
  source: 'API'|'SIMULATED', rawPayloadRef,          // trazabilidad / auditoría
  price: { netPremium, taxes:{ iva, otros? }, totalAnnual, currency:'COP',
           installments?: [{ n, amount, financingRate?, totalCost }] },
  insuredValue, insuredValuePctFasecolda,
  coverages: Coverage[],         // taxonomía canónica
  deductibles: Deductible[],
  assistances: Assistance[],
  exclusionsHighlights: string[], // 'uso comercial', 'conductor <18', ...
  lienCompliance?: { bankId, compliant: boolean, missing: string[] },
  commercial: { commissionPct?, sponsored: boolean }   // NUNCA entra al score; solo revelación/auditoría
}
Coverage { code: 'RCE'|'PT_DANOS'|'PP_DANOS'|'PT_HURTO'|'PP_HURTO'|'TERREMOTO_NAT'|'AMPARO_PATRIMONIAL'
                 |'AP_CONDUCTOR'|'AP_OCUPANTES'|'ASIST_JURIDICA'|'GASTOS_TRANSPORTE'|'ACCESORIOS'|...,
           included: boolean, limit?: { amount?, smmlv?, pctInsuredValue?, unlimited? },
           sublimits?, ptThresholdPct? /* p.ej. 75 */, notes, sourceClause? }
Deductible { appliesTo: CoverageCode, pct?, minAmount?, minSmmlv?, fixedAmount? }
Assistance { code: 'GRUA'|'CARRO_TALLER'|'CONDUCTOR_ELEGIDO'|'VEHICULO_REEMPLAZO'|'ASIST_VIAJE'|'CERRAJERIA'|...,
             included, eventsPerYear?|'UNLIMITED', days?, kmLimit?, radiusKm?, conditions }

// Resultado de recomendación (persistido)
Recommendation { id, quoteRequestId, algoVersion, weights:{...}, presetId, abVariant?,
                 items:[{ offerId, eligible, exclusionReasons[], subscores:{price,coverage,deductible,services,backing},
                          penalties[], score, rank, labels[], explanation:{ pros[], cons[] } }],
                 createdAt }
// Eventos para ML/A-B: impression(rank, label), detail_view, compare_add, checkout_start, purchase, cancel_30d
```

**Notas de normalización**
- Montos en COP enteros. Cuando un límite venga en SMMLV, se guarda también el valor del año de cotización.
- El IVA sobre primas de autos se guarda desglosado. **Hay que confirmar la tarifa vigente con cada aseguradora.**
- Las aseguradoras que no informen un campo quedan con `unknown`, distinto de `false`. En el scoring, `unknown` recibe el valor del percentil 25 y se muestra "Por confirmar". Así no se castiga ni se premia la falta de datos.
- Los requisitos del banco (beneficiario oneroso, cláusula de no revocación sin aviso, coberturas mínimas, renovación 30 días antes) se modelan como plantilla `LienRequirement` por banco [13][14]. **No verifiqué el texto completo de Santander 2026.**

---

## 7. Evolución hacia ML y experimentación

| Fase | Qué | Condición de entrada | Guardarraíles |
|---|---|---|---|
| 0 (MVP) | Reglas + MAUT + presets | Ninguna | Logging completo de impresiones con posición |
| 1 (V1) | A/B de presets de pesos, del orden de preguntas, de Exprés vs. Afinar y del copy de las explicaciones | ~cientos de conversiones por variante (calcular el tamaño de muestra en su momento) | Métricas guardia: tasa de cancelación a 30 días, quejas, satisfacción post-compra |
| 2 (V2) | Calibración de pesos con regresión logística o choice models (logit condicional) sobre las elecciones reales | Datos de elección con varias ofertas visibles | Corregir el sesgo de posición (propensity/IPS); prohibido usar la comisión como feature |
| 3 (Futuro) | Learning-to-rank o bandits contextuales (LinUCB/Thompson) con exploración acotada [19][20] | Volumen alto y catálogo con más de 5 aseguradoras | Elegibilidad dura intocable; la exploración solo reordena dentro de un margen de score; la explicación sigue derivándose del modelo aditivo; auditoría de equidad por ciudad y edad |

**Métrica objetivo** sugerida: una combinación de conversión y "recomendación aceptada" (si compró la que estaba en el top 1), sin degradar la tasa de cancelación ni las quejas.

---

## 8. Cambios concretos frente al prototipo actual

- La preferencia de selección única (precio/cobertura/equilibrio/no sé) pasa a ser el preset de A11, sumado a A12 (deducible) y A13 (servicios) en Afinar.
- Las preguntas de nombre y documento se mueven al checkout.
- Hoy los filtros de resultados no funcionan. Se reemplazan por chips de prioridad que reordenan y por filtros de nivel de plan y de servicios imprescindibles.
- Se agregan etiquetas calculadas, explicación por tarjeta y una sección de motivos de exclusión.
- La comparación de hasta 3 debe usar la taxonomía canónica, fila por fila, incluyendo deducibles y exclusiones.
- El prototipo nombra 5 aseguradoras reales con datos inventados. Para el MVP simulado conviene usar **aseguradoras ficticias**, o datos aprobados por cada aseguradora, para no publicar información falsa sobre marcas reales.


## Funcionalidades sugeridas

| Prioridad | Funcionalidad | Descripción |
| --- | --- | --- |
| MVP | Cuestionario Exprés adaptativo (auto/moto) | Un flujo de 8 a 10 pantallas, una pregunta por pantalla, con progreso por etapas (Vehículo, Uso, Tú, Prioridades). Autocompleta desde la placa y el código Fasecolda, muestra preguntas condicionales solo cuando aplican, incluye 'No sé' y '¿Por qué preguntamos?', y deja los datos personales para el checkout. |
| MVP | Motor de elegibilidad (filtros duros) | Reglas por producto según uso comercial o plataformas, domicilios en moto, antigüedad, cilindraje, ciudad, edad del conductor, siniestros, valor asegurado y requisitos del banco cuando hay prenda. Cada oferta descartada lleva un motivo legible. |
| MVP | Scoring multiatributo con pesos derivados | Subscores de 0 a 100 en precio (curva exponencial relativa), cobertura (taxonomía canónica con curvas por tramos), deducible (costo de bolsillo esperado), servicios (ponderados por la elección del usuario) y respaldo (quejas SFC). Presets de pesos por prioridad, ajustes por perfil y penalizaciones blandas. |
| MVP | Etiquetas y desempate | Etiquetas 'Mejor para ti', 'Mejor precio' (dentro del mismo nivel de plan y con un piso de cobertura) y 'Mejor cobertura'. Empate técnico si la diferencia es menor a 3 puntos y desempate determinista que nunca usa la comisión. El slot 'Patrocinado' va separado y rotulado. |
| MVP | Explicación de la recomendación | Un bloque 'Te la recomendamos porque…' y 'Ten en cuenta…' generado a partir de las contribuciones por dimensión, con motivos de exclusión y un enlace al clausulado y a las exclusiones destacadas. |
| MVP | Modelo de oferta normalizada y adapters por aseguradora | Esquema Offer, Coverage, Deductible y Assistance con códigos canónicos, valores unknown, trazabilidad del payload crudo, origen API o simulado y versión del producto. Un adapter por aseguradora, empezando por 2 simuladas. |
| MVP | Página pública 'Cómo recomendamos' | Explica criterios, pesos base, aseguradoras y número de productos comparados, fecha de los datos, modelo de ingresos y declaración de que la comisión no influye en el ranking. |
| MVP | Persistencia y auditoría de recomendaciones | Guardar la versión del algoritmo, los pesos, los subscores, las ofertas mostradas y su posición en cada recomendación. |
| V1 | Modo Afinar con reordenamiento en vivo | Preguntas opcionales en la pantalla de resultados (servicios valorados, imprescindibles, nivel de plan, km, parqueo) y ordenamiento de 3 prioridades con pesos ROC, que reordenan al instante. |
| V1 | Plantillas de requisitos de bancos (prenda) | Requisitos mínimos por banco (beneficiario oneroso, coberturas, cláusulas de revocación) con verificación de cumplimiento por oferta y generación del documento de endoso. |
| V1 | Dimensión de respaldo con datos SFC | Ingesta periódica de las estadísticas de quejas de la SFC y del formato de experiencia del sector asegurador, normalizadas por volumen, con la fecha visible. |
| V1 | Experimentación A/B | Feature flags para presets de pesos, orden de preguntas, copy de explicaciones y Exprés vs. Afinar, con métricas guardia de cancelación a 30 días y quejas. |
| V2 | Calibración de pesos con modelos de elección | Logit condicional o regresión sobre las elecciones reales, con corrección del sesgo de posición, para recalibrar los presets. |
| Futuro | Learning-to-rank / bandits contextuales con guardarraíles | Reordenamiento aprendido dentro de márgenes del score base, con elegibilidad intocable, sin la comisión como feature y con auditoría de equidad. |

## Riesgos

- Que el 'Mejor para ti' personalizado se considere asesoría o intermediación de seguros regulada (Decreto 2555/2010, Decreto 2123/2018, Ley 1328/2009). Hay que definir la figura jurídica (agencia o corredor propio, alianza con un intermediario o lead-gen) antes de cobrar comisiones o emitir.
- Conflicto de interés: que la comisión o el patrocinio influya en el ranking, abierta o veladamente. Puede llevar a sanciones de la SIC por publicidad engañosa y a pérdida de confianza. Mitigación: excluir la comisión del score, auditarlo y rotular el patrocinio aparte.
- Recomendar una póliza que no cubre el uso real (plataformas, domicilios en moto) o que no cumple los requisitos del banco con prenda, lo que lleva a siniestros no pagados y quejas.
- Normalización incorrecta de pólizas heterogéneas (sublímites, umbrales PT/PP, deducibles mínimos en SMMLV, campos no informados) que distorsione el ranking.
- Sesgo de catálogo: con solo 2 aseguradoras simuladas, 'mejor' es relativo y puede inducir a error si no se declara la cobertura de mercado.
- Uso de nombres de aseguradoras reales con datos simulados o inventados en el prototipo, con riesgo reputacional y legal.
- Precio indicativo distinto del precio de emisión (siniestralidad, inspección), que frustra al usuario. Hay que marcar el precio como 'sujeto a validación' cuando aplique.
- Tratamiento de datos personales y perfilamiento sin autorización adecuada (Ley 1581/2012), y transferencia de respuestas a aseguradoras sin consentimiento específico.
- Sesgo de posición y de popularidad al pasar a ML; posible discriminación indirecta por ciudad o edad introducida por el ranking propio.
- Datos de quejas SFC desactualizados o mal normalizados que castiguen injustamente a una aseguradora.

## Preguntas abiertas

- ¿Qué figura jurídica tendrá SeguAlaFija: agencia o corredor propio, alianza con un intermediario vigilado o generador de leads para las aseguradoras? Esto define si el 'Mejor para ti' puede presentarse como recomendación personalizada.
- ¿El modelo de ingresos será comisión por póliza, fee por lead o patrocinio? ¿Aceptan publicar que la comisión no influye en el ranking y someterlo a auditoría?
- ¿Las 2 aseguradoras simuladas del MVP deben ser ficticias o hay un acuerdo con aseguradoras reales para usar su nombre y sus datos?
- ¿Se incluirán productos para uso en plataformas o domicilios desde el MVP? Si ninguna aseguradora simulada los ofrece, ¿qué se muestra (estado vacío o derivación a un asesor)?
- ¿Se cubrirán solo planes 'todo riesgo' o también RC/básico (y el SOAT como producto aparte)?
- ¿Hay un proveedor para consultar los datos del vehículo por placa (RUNT u otro) y licencia de uso de la Guía de Valores Fasecolda?
- ¿Qué bancos priorizar para las plantillas de requisitos de vehículos con prenda?
- ¿Quién calibrará los pesos internos de amparos y los parámetros (k de precio, siniestro de referencia para el deducible, umbrales)? ¿Hay un experto o actuario disponible?
- ¿Se quiere ofrecer un camino 'hablar con un asesor humano' desde los resultados (WhatsApp o llamada) para casos complejos?
- ¿Qué métrica de éxito prioriza el negocio: conversión, recomendación aceptada o retención y renovación?

## Fuentes

1. [EIOPA - Report on Good Practices on Comparison Websites (2014) [no se pudo abrir: el proxy bloqueó el dominio; se cita por resumen de búsqueda]](https://register.eiopa.europa.eu/Publications/Reports/Report_on_Good_Practices_on_Comparison_Websites.pdf)
2. [William Fry - Good practices for insurance comparison websites](https://www.williamfry.com/knowledge/good-practices-for-insurance-comparison-websites/)
3. [Ley 1328 de 2009 (normograma MinTIC)](https://normograma.mintic.gov.co/mintic/docs/pdf/ley_1328_2009.pdf)
4. [Asuntos Legales - El deber de información en bancaseguros](https://www.asuntoslegales.com.co/analisis/german-andres-cajamarca-2716867/el-deber-de-informacion-en-bancaseguros-2741813)
5. [Decreto 2123 de 2018 (normativa Colpensiones)](https://normativa.colpensiones.gov.co/compilacion/docs/decreto_2123_2018.htm)
6. [Concepto SFC sobre intermediarios de seguros / agencias colocadoras (Ámbito Jurídico)](https://ambitojuridico.com/sites/default/files/BancoMedios/Archivos/cpto-102090-13.doc)
7. [Fasecolda - Informe final Guía de Valores](https://fasecolda.com/cms/wp-content/uploads/2019/08/informe_final_guia_de_valores1.pdf)
8. [C3 Care Car Center - Todo sobre el código Fasecolda](https://www.c3carecarcenter.com/blog/todo-sobre-el-codigo-fasecolda-guia-para-automovilistas/)
9. [Carroya - ¿Cómo elegir un Seguro Todo Riesgo para Motos?](https://www.carroya.com/noticias/node/5120)
10. [Valora Analitik - Seguro todo riesgo de motos en Colombia](https://www.valoraanalitik.com/seguro-todo-riesgo-motos-colombia-cuenta-esto/)
11. [La República - Solo tres de cada 100 motos tienen un seguro todo riesgo](https://www.larepublica.co/finanzas/solo-tres-de-cada-100-motos-tienen-un-seguro-todo-riesgo-2600639)
12. [Portafolio - Ventajas del seguro todo riesgo](https://www.portafolio.co/economia/finanzas/son-ventajas-seguro-riesgo-184638)
13. [Rankia - Seguros: qué es beneficiario oneroso](https://www.rankia.co/blog/mejores-seguros-colombia/4343884-seguros-que-beneficiario-oneroso)
14. [Santander - Términos y condiciones seguros asociados al crédito de vehículo 2026 [no se pudo abrir: el proxy bloqueó el dominio]](https://www.santander.com.co/recursos/archivos/terminos-y-condiciones-de-los-seguros-asociados-al-credito-vehiculo-2026.pdf)
15. [Superintendencia Financiera - Quejas contra entidades vigiladas, información estadística mensual](https://www.superfinanciera.gov.co/publicaciones/11130)
16. [Circular Externa 37 de 2018 SFC](https://normograma.com/keralty/compilacion/docs/circular_superfinanciera_0037_2018.htm)
17. [Holland & Knight - La privacidad entra en la era de la IA (2026)](https://www.hklaw.com/es/news/intheheadlines/2026/08/la-privacidad-entra-en-la-era-de-la-ia)
18. [Asuntos Legales - Reglas de la SIC para influenciadores (publicidad pagada)](https://www.asuntoslegales.com.co/consumidor/las-reglas-que-plantea-la-superintendencia-de-industria-y-comercio-para-los-influencers-3062632)
19. [Cold-start Problems in Recommendation Systems via Contextual-bandit Algorithms (arXiv 1405.7544)](https://ar5iv.labs.arxiv.org/html/1405.7544)
20. [BanditRank: Learning to Rank Using Contextual Bandits (arXiv 1910.10410)](https://arxiv.org/pdf/1910.10410)
21. [Selección de póliza de seguro de motor con Spherical Fuzzy AHP / CoCoSo (JSIR)](https://or.niscpr.res.in/index.php/JSIR/article/view/4302)
22. [A general framework for explaining the results of a multi-attribute preference model (Artificial Intelligence, vol. 363)](https://www.datalearner.com/academic/journal-papers/0004-3702/volumes-and-issues/363/paper-detail/68861)
