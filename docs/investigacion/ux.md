# Auditoría UX y mobile-first

> Investigación del 2026-10-06 con búsqueda web. Lo marcado como no verificado debe confirmarse antes de usarse en producción.

# Auditoría UX/UI del prototipo (Figma Make) y mejores prácticas mobile-first para comprar seguros

> **Antes de empezar:** el contexto del encargo dice que el repositorio `alafijaseguros/web-platform` está vacío. **Ya no lo está.** En `/home/user/WEB-PLATFORM` hay una app en **Next.js 16.3.8 + React 19.2 + Tailwind 4**, en la versión **v0.7.0 (2026-10-06)**. Tiene cotizador de 5 pasos, pesos de prioridad, comparador, checkout como invitado, Wompi simulado, cuenta, recordatorios, PQR, admin, modo oscuro y auditoría axe WCAG 2.2 AA en E2E (ver `docs/estado.md` y `CHANGELOG.md`).
> Esta auditoría trabaja sobre el **código del prototipo de Figma Make** (leído por MCP: Home, QuotationFlow, Results, Comparator, InsuranceDetail, MyInsurances, Login, Success, Header, Footer, BottomNav, index.css, data/insurances.ts). En cada punto marco si el repo actual **ya lo resuelve (✅ repo)**, si **lo resuelve en parte (🟡)** o si **falta (⬜)**. Eso lo saqué de la lectura del código y de la documentación, **no de una revisión visual de la app desplegada**: falta verificarlo en pantalla.

---

## 1. Resumen ejecutivo
El prototipo es visualmente agradable: paleta fresca, tono cercano y buen uso de tarjetas. Pero es una **maqueta de marketing, no un flujo transaccional**. Los problemas más graves:
1. **No hay compra.** "Elegir este seguro" lleva directo a `/success`, que siempre muestra "Auto Bolívar Plus · Activa", sea cual sea el producto elegido.
2. **El diferencial (recomendación) no existe.** La preferencia del paso 3 no se usa: el orden "relevancia" devuelve `0` y los badges están fijos en los datos.
3. **Contradicciones legales y de marca.** La marca es "Aseguu" y no SeguAlaFija. La FAQ dice *"Aseguu no vende seguros directamente… la contratación se hace con la aseguradora"*, lo que contradice la compra en la plataforma. Las cifras ("+20 aseguradoras", "Ahorra hasta 30%", "5 min") no tienen sustento y hay solo 5 aseguradoras con datos ficticios. El footer afirma "Intermediario autorizado por la SFC" sin que exista esa figura. Todo esto es riesgo de publicidad engañosa (Estatuto del Consumidor, Ley 1480 de 2011) y de uso indebido de la condición de vigilado: la SFC publica alertas periódicas de "falsos vigilados" [1][2].
4. **Accesibilidad por debajo de AA** en la mayoría de los colores de acción (detalle en §4).
5. **Varias rutas rotas:** `/ayuda`, `/perfil`, `/poliza/:id`, los enlaces del footer a Salud, Hogar, Vida, Viajes y Mascotas, y todos los legales que apuntan a `/`.

---

## 2. Hallazgos por pantalla

| # | Pantalla | Hallazgo | Severidad | Estado en el repo |
|---|---|---|---|---|
| 1 | Global | Marca "Aseguu" en logo, FAQ, footer y Success. Hay que renombrar a SeguAlaFija | Alta | ✅ repo (`Logo.tsx`, manifest "SeguAlaFija") |
| 2 | Home | FAQ contradice el modelo de negocio (no vende o sí vende) | Alta | ⬜ revisar el copy con el área legal cuando se defina la figura (HU-14.1) |
| 3 | Home | Cifras y claims sin respaldo (+20 aseguradoras, 30% de ahorro, 100% gratuito). La tarjeta flotante "Seguro activado" sugiere una compra que no ocurrió | Alta | ⬜ verificar el copy actual |
| 4 | Home | Dos CTAs que compiten en el hero ("Comparar" y "Cómo funciona") con el mismo peso visual. Además, 3 CTAs amarillos a lo largo de la página con el mismo texto | Media | 🟡 |
| 5 | Home | La franja de aseguradoras usa nombres en texto con `cursor-pointer` pero sin acción (affordance falsa) | Baja | 🟡 (logos oficiales dependen de autorización, HU-13.6) |
| 6 | Home | El acordeón de FAQ no tiene `aria-expanded` ni `aria-controls` | Media | Verificar |
| 7 | Cotizar paso 1 | El título "Empecemos por tu carro" y "placa de tu carro" aparecen también en el flujo de **moto** | Media | Verificar |
| 8 | Cotizar paso 1 | El placeholder "ABC-123" lleva guion. Las placas colombianas son ABC123 (carro) y ABC12D (moto). No hay `maxLength`, patrón ni `autocapitalize` | Media | ✅ repo (`PlateInput` con apariencia de placa, HU-13.1) |
| 9 | Cotizar paso 1 | Marca en un select de 8 marcas fijas, modelo y versión en texto libre. Sin código Fasecolda no se puede tarifar ni mostrar el valor asegurado [12] | Alta | 🟡 (lookup simulado; la Guía Fasecolda depende de licencia) |
| 10 | Cotizar paso 2 | `<label>` sin `htmlFor` ni `id` (inputs sin nombre accesible). Sin `autocomplete` (`name`, `bday`), sin tipo de documento (CC, CE, PA), sin `inputMode="numeric"` en el documento | Alta | ✅ repo en checkout (`autoComplete`, `inputMode`, `aria-invalid`) |
| 11 | Cotizar paso 2 | La ciudad sale de un select de 7 ciudades. Debe ser un autocompletar sobre los municipios DANE (la tarifa depende de la ciudad de circulación) | Media | Verificar |
| 12 | Cotizar paso 2 | El aviso de datos personales es solo informativo. Falta la **autorización previa, expresa e informada** exigida por la Ley 1581 de 2012 [13], con su finalidad y el enlace a la política | Alta | ✅ repo (consentimientos separados con evidencia) |
| 13 | Cotizar paso 3 | Pregunta de **opción única** (precio, cobertura, equilibrio, no sé). No cubre "servicios complementarios" ni permite ponderar | Alta | ✅ repo (`WeightSliders`, 3 pesos que suman 100%) |
| 14 | Cotizar paso 4 | La tarjeta queda **vacía** ("Listo para buscar" sin resumen). Debería mostrar un resumen editable de los datos | Media | Verificar |
| 15 | Cotizar | Todo vive en `useState`: al recargar o volver se pierde el progreso. Sin validación inline: el botón deshabilitado al 40% de opacidad no explica qué falta | Alta | ✅ repo (sessionStorage en `quote-store.ts`) |
| 16 | Cotizar | El loader dura 2,5 s fijos y no maneja aseguradoras lentas, caídas ni resultados parciales | Media | ✅ repo (agregador con timeouts y resultados parciales) |
| 17 | Resultados | La preferencia se ignora: "relevancia" no ordena. Los badges están fijos en los datos | Crítica | ✅ repo (`scoring.ts`) |
| 18 | Resultados | Los filtros abren selects con una sola opción ("Todos"): controles falsos | Alta | ✅ repo (filtros) |
| 19 | Resultados | El precio mensual no es igual al anual dividido por 12 (89.000 × 12 = 1.068.000 frente a 980.000) y no se explica (¿contado o financiado? ¿IVA?) | Alta | ✅ repo (prima + IVA 19%, anual o 12 cuotas) |
| 20 | Resultados | Chips "RC / Daños / Hurto": jerga y siglas sin explicar. El estado ✓ o — depende del color mint (#2ECCB3) sobre mint-light, que tiene contraste 1,86:1 | Alta | 🟡 |
| 21 | Resultados | La barra de comparación aparece solo con ≥2 seleccionados (con 1 no hay feedback). Se fija en `bottom-16` encima del BottomNav y puede tapar el foco (WCAG 2.4.11) [5] | Media | Verificar |
| 22 | Comparador | En móvil usa scroll horizontal con columnas de 140 px y la columna de etiquetas **no queda fija**. No resalta diferencias ni el "mejor" por fila. No se puede quitar un ítem | Alta | 🟡 ("Mejor" por fila ✅. Falta verificar el patrón móvil) |
| 23 | Comparador | Mapas de colores por aseguradora duplicados e inconsistentes (`INSURER_COLORS` en Comparator y en Detail, más `insurerColor` en los datos). En Detail faltan LB y AZ. Liberty queda en amarillo con texto blanco | Media | ✅ repo (`InsurerLogo` centralizado) |
| 24 | Detalle | Un id inválido cae en `ALL_INSURANCES[0]` y muestra un producto equivocado en vez de un 404 | Media | ✅ repo (`not-found.tsx`) |
| 25 | Detalle | Los botones "Documentos" (condicionado, tabla, reclamación) no hacen nada. El condicionado es información clave para la decisión | Alta | ✅ repo (`/condicionado/[aseguradora]/[plan]`) |
| 26 | Detalle | La explicación del deducible está bien escrita, pero falta mostrar el **deducible mínimo en SMMLV** (forma usual en Colombia) y el valor asegurado | Media | Verificar |
| 27 | Detalle | "Elegir este seguro" lleva a `/success` sin checkout, sin pago, sin aceptación de condiciones y sin SARLAFT | Crítica | ✅ repo (checkout, aceptación por código, Wompi o simulado) |
| 28 | Success | El contenido está fijo en el código (póliza, producto, vigencia "Hasta 1 Oct 2026", que ya vence). Dice "Activa" sin que haya pago | Alta | ✅ repo (`/pago/resultado` con estados) |
| 29 | Mis seguros | "Hola, Carlos 👋" y "Buenos días" fijos. Fechas de 2025 vencidas. "Al día ✓" es ambiguo. Enlace a `/poliza/:id` inexistente. Sin recordatorios de SOAT, tecnomecánica ni renovación | Alta | ✅ repo (`/cuenta/*`, recordatorios) |
| 30 | Login | Email y contraseña sin `autocomplete`, sin labels asociados, "Olvidaste tu contraseña" y "Crea una gratis" sin acción. "Bienvenido" con género. Sin opción de seguir como invitado | Media | ✅ repo (código por correo, `one-time-code`, compatible con WCAG 3.3.8) |
| 31 | BottomNav | Enlaces a `/ayuda` y `/perfil` rotos. Etiqueta de 10 px en gray-400 (2,54:1). Sin `aria-current` ni `safe-area-inset` | Media | ✅ repo (11 px, `aria-current`, `pb-safe`, se oculta en checkout) |
| 32 | Header | El botón hamburguesa no tiene `aria-expanded`. En móvil hay doble navegación (menú y BottomNav) | Baja | Verificar |
| 33 | Footer | Enlaces a líneas fuera de alcance (Salud, Hogar…) que dan 404. Legales a `/`. Texto `white/40` sobre navy (2,91:1). "© 2025" | Media | 🟡 (líneas "próximamente" en `lines.ts`) |
| 34 | Global | Emojis como iconos (🚗 🏍️ 🛡️ ⭐ 👋 🔍) sin `aria-hidden`: un lector de pantalla los lee ("automóvil") y se ven distinto según el SO | Media | ✅ repo (lucide-react) |
| 35 | Global | Estilos inline con hex fijos (unos 150 `style={{…}}`), tokens definidos en `@theme` pero casi sin usar, y sombras con 8 o más variantes | Media | ✅ repo (tokens semánticos) |
| 36 | Rendimiento | Imágenes de Unsplash enlazadas directamente (hero 1200×700 y tarjetas 800×700) sin `srcset`, `width/height`, `loading` ni `fetchpriority`: afectan LCP y CLS. Google Fonts con `@import` dentro del CSS y 5 pesos (cadena que bloquea el render) | Media | ✅ fuentes (`next/font`). Imágenes: verificar (no hay `next/image` en uso) |
| 37 | Movimiento | `animate-spin-slow` y `animate-pulse-scale` infinitos, sin `prefers-reduced-motion` | Baja | ✅ repo |

---

## 3. Arquitectura de información y flujo
**El prototipo:** Home → Categoría → Cotizar (4 pasos) → Resultados → Comparar o Detalle → Success. Faltan checkout, pago, póliza, cuenta real, recordatorios, ofertas, ayuda y legales.

**Recomendaciones de flujo (mobile-first):**
- **Entrada por placa como "camino feliz".** En Colombia los comparadores consultan los datos del vehículo en el RUNT a partir de la placa [10][11], y la aseguradora debe consultar el RUNT para expedir el SOAT [11]. Si hay un proveedor autorizado, la placa precarga marca, línea, modelo y servicio. El camino manual (marca → línea → año → versión, con código Fasecolda) queda como alternativa.
- **Una pregunta por pantalla** en el cuestionario de prioridades, con la explicación de **por qué se pregunta** junto al campo. Baymard recomienda poner la ayuda justo donde surge la duda [6] (✅ repo HU-13.2).
- **Resultados con la "Recomendación para ti" destacada** y, debajo, la lista completa. El porqué en lenguaje simple ("Te la recomendamos porque priorizaste cobertura: incluye hurto parcial y deducible del 5%"). Aviso visible de que es una recomendación según tus respuestas y no una asesoría (riesgo regulatorio, INV-4).
- **Checkout en 3 pasos** (Tomador y asegurado → Revisión y aceptación → Pago), sin crear cuenta. La cuenta se ofrece **después** del pago ("Guarda tu póliza y recibe recordatorios").
- **Cumplir WCAG 3.3.7 (entrada redundante).** Lo que ya se capturó en la cotización (nombre, documento, fecha de nacimiento, ciudad) debe llegar prellenado al checkout [5].

---

## 4. Accesibilidad (WCAG 2.2 AA)
**Contrastes medidos** con la fórmula de luminancia relativa de WCAG sobre los hex del prototipo:

| Combinación (prototipo) | Ratio | AA texto normal (4,5) | Propuesta | Ratio propuesta |
|---|---|---|---|---|
| Texto blanco sobre CTA `#3EA6FF` | **2,59** | ❌ | `#1565C0` (ya en el repo) o `#1A65C0` | ≈5,7 |
| Link `#3EA6FF` sobre blanco | 2,59 | ❌ | `#1A65C0` | 5,73 |
| `#3EA6FF` sobre `#EBF5FF` (badge "Mayor cobertura") | 2,35 | ❌ | `#1A65C0` sobre `#EBF5FF` | 5,19 |
| Mint `#2ECCB3` sobre `#E6FAF7` (chips ✓, "Activa") | **1,86** | ❌ | `#0B7A6B` sobre `#E6FAF7` | 4,83 |
| `#D4A017` sobre `#FFF8E7` (badge "Buen equilibrio") | 2,24 | ❌ | `#8A6100` sobre `#FFF8E7` | 5,23 |
| slate-400 `#94A3B8` sobre blanco (metadatos, "/mes") | 2,56 | ❌ | slate-600 `#475569` | 7,58 |
| Coral `#FF7B7A` sobre blanco (iconos de exclusión) | 2,51 | ❌ (3:1 para no-texto) | `#B42318` | 6,57 |
| gray-400 en BottomNav | 2,54 | ❌ | `--color-muted` `#5B6B84` | (repo) |
| `white/40` sobre navy (footer legal) | 2,91 | ❌ | `white/70` | 5,75 |
| Navy sobre amarillo `#FFC857` | 6,53 | ✅ | se mantiene | — |
| Navy sobre blanco | 10,04 | ✅ | se mantiene | — |

**Otros incumplimientos en el prototipo:**
- **1.3.1 y 4.1.2:** labels sin asociar. Las tarjetas de opción del paso 3 son `<button>` sin `role="radiogroup"` ni `radio` ni `aria-checked`. Al acordeón le falta `aria-expanded`.
- **1.3.5 Identificar el propósito de la entrada:** sin `autocomplete` (`name`, `bday`, `email`, `tel-national`, `one-time-code`) [9].
- **2.4.7 y 2.4.13:** `focus:outline-none` con solo un cambio de borde de gray-100 a blue-400. El foco no es visible con teclado (✅ repo: `:focus-visible` con outline de 3 px).
- **2.4.11 Foco no oculto:** el header sticky, el BottomNav, la barra de comparación y el CTA sticky se apilan abajo (BottomNav + CTA ≈ 140 px). Hace falta `scroll-padding-bottom` y `scroll-padding-top` equivalentes [5].
- **2.5.8 Tamaño del objetivo:** mínimo 24×24 CSS px [4]. Se recomienda **44×44** para los controles principales en móvil. En riesgo: los chips del orden (`px-3 py-1.5 text-xs` ≈ 28 px de alto), "Limpiar" en la barra de comparación y los enlaces del footer.
- **3.3.1 y 3.3.3:** no hay mensajes de error ni sugerencias. El CTA deshabilitado no explica qué falta. Mejor dejarlo habilitado y validar al enviar, enfocando el primer error y usando un resumen con `aria-live`.
- **Emojis como iconos:** hay que cambiarlos por SVG con `aria-hidden` o con etiqueta.
- **Texto pequeño:** uso extendido de `text-xs` (12 px) para información crítica (precio anual, deducible). Mínimo recomendado: 14 px para datos de decisión y 16 px en inputs (evita el zoom automático de iOS).

---

## 5. Sistema de diseño: estado y deuda
- El prototipo define tokens en `@theme` (`--color-navy`, `--color-blue`…), pero **los componentes no los usan**: hex inline, 8 o más sombras distintas, radios mezclados (`rounded-xl`, `2xl`, `3xl`, `full`) sin una regla, y 4 estilos de botón primario.
- **El repo ya tiene** tokens semánticos con contraste AA y modo oscuro (`brand`, `brand-fill`, `mint`, `sun-ink`, `ink`, `muted`, `line`, `canvas`, `surface`) y primitivas en `src/components/ui.tsx` (`Button`, `ButtonLink`, `Card`, `Badge`, `Field`, `inputClass`, `InsurerLogo`, `SimulatedDataNotice`).
- **Brechas del repo frente a un sistema completo:** escala tipográfica, espaciado, elevación, z-index y movimiento como tokens. Faltan componentes de estado (Skeleton, EmptyState, ErrorState, Toast, Alert), un patrón de formulario completo (FieldError, Hint, ErrorSummary), RadioCard y CheckboxCard, Stepper, StickyActionBar, BottomSheet o Drawer (filtros en móvil), Accordion, Tooltip o Popover accesible, PriceBlock, CoverageList, TrustBar y PolicyCard.

### Propuesta de tokens (manteniendo la identidad del prototipo)
**Primitivos (marca):** navy-900 `#082D6E`, navy-700 `#0B3D91`, blue-700 `#1565C0`, blue-600 `#1A65C0`, blue-400 `#3EA6FF` (decorativo e ilustración, **nunca texto ni fondo de texto blanco**), blue-50 `#EBF5FF`, mint-700 `#0B7A6B`, mint-400 `#2ECCB3` (decorativo), mint-50 `#E6FAF7`, sun-400 `#FFC857`, sun-800 `#8A6100`, sun-50 `#FFF8E7`, coral-700 `#B42318`, coral-400 `#FF7B7A` (decorativo), coral-50 `#FFF0F0`, neutrales slate-50…900, bg `#FAFAF7` o `#F7F8FA`.

**Semánticos:**
- `color.action.primary.bg` = blue-700 y `color.action.primary.fg` = white.
- `color.action.secondary` = borde navy-700 y texto navy-700.
- `color.action.accent` = sun-400 con texto navy-700. Reservado al CTA de máxima conversión, uno por vista.
- `color.text.{default=#10213F, muted=#5B6B84 (≥4,5), inverse, link=blue-600}`.
- `color.feedback.{success=mint-700, warning=sun-800, danger=coral-700, info=blue-600}`, cada uno con su versión `-soft`.
- `color.coverage.{included=success, excluded=danger, partial=warning}`. Siempre acompañado de **icono y texto**, nunca solo de color.
- `color.border.{default, strong, focus=blue-600}`, `color.surface.{canvas, raised, sunken, overlay}`.

**Tipografía:** Plus Jakarta Sans vía `next/font` (✅ repo), con 3 pesos (500, 600, 800) y `font-variant-numeric: tabular-nums` en precios. Escala móvil a escritorio: `display 32→48/1.1`, `h1 28→36`, `h2 22→28`, `h3 18→20`, `body 16/1.5`, `body-sm 14/1.45`, `caption 12/1.4` (solo metadatos no críticos), `price-lg 28/1 extrabold tabular`.

**Espaciado:** base 4 px (`0,1,2,3,4,5,6,8,10,12,16,20` × 4). Gutter móvil de 16 px y de escritorio de 24 px. Ancho máximo de lectura de 720 px y de listas de 1200 px.

**Radios:** `sm 8` (chips, inputs pequeños), `md 12` (inputs y botones de formulario), `lg 20` (tarjetas, igual al `--radius-card` del repo), `xl 28` (hero y bottom sheet), `pill 999` (CTA y badges). Regla: botones en forma de píldora e inputs con `md`, no ambos con píldora.

**Elevación:** `e0` (borde de 1 px), `e1` (tarjeta), `e2` (tarjeta seleccionada o hover), `e3` (sticky bar, sheet), `e4` (modal). Sustituye las 8 variantes inline.

**z-index:** `base 0`, `sticky-cta 30`, `bottom-nav 40`, `header 50`, `sheet 60`, `toast 70`, `modal 80`.

**Movimiento:** `fast 120ms`, `base 200ms`, `slow 320ms`, `ease-out-standard`. Todo dentro de `prefers-reduced-motion` (✅ repo).

**Tamaños táctiles:** `touch.min 44px` (CTA, radio cards, tabs, ítems de BottomNav) y `touch.dense 32px` con el espaciado de 2.5.8 [4].

### Componentes base propuestos (por prioridad)
1. **Formulario:** `Field` (label, hint, error, contador), `TextInput` (variantes `plate`, `document`, `phone`, `currency`), `Select`, `Combobox` (municipios DANE, marca y línea), `DateInput` (día/mes/año separados o nativo con `bday`), `RadioCardGroup`, `CheckboxCard`, `WeightSliders`/`PriorityRanker`, `ConsentCheckbox` (texto legal versionado), `OtpInput`, `ErrorSummary`.
2. **Navegación y estructura:** `Header`, `BottomNav` (4 ítems), `Stepper` (paso X de N más título de la siguiente sección), `StickyActionBar` (CTA primario y resumen de precio, con `safe-area`), `BottomSheet` (filtros y orden en móvil), `Breadcrumb` (escritorio), `Tabs` (cuenta).
3. **Ofertas:** `OfferCard` (logo, plan, PriceBlock, 3 coberturas clave, badge de recomendación, "por qué", CTA, checkbox Comparar), `RecommendationHero`, `PriceBlock` (prima total con IVA, cuota mensual, "IVA incluido", financiación), `CoverageList` (incluye / no incluye / parcial con icono y texto), `DeductibleExplainer`, `CompareTray` (miniaturas y contador 1/3), `CompareTable` (columna de etiquetas fija y "Mejor" por fila) y `CompareStack` (móvil: una tarjeta por atributo con las 2 o 3 opciones apiladas).
4. **Estados:** `Skeleton` (tarjetas de oferta), `ProgressiveLoader` ("Consultando SURA ✓ · Bolívar…"), `EmptyState`, `ErrorState` (con reintento y contacto), `PartialResultsBanner`, `Toast`, `Alert`, `DemoBanner` (✅ `SimulatedDataNotice`).
5. **Confianza y cumplimiento:** `TrustBar` (figura legal y NIT, logo "Vigilado SFC" **solo si aplica**, Defensor del Consumidor Financiero, pago seguro), `InsurerLogo` (oficial con autorización), `LegalFooter`, `DocumentLink` (PDF con tamaño y fecha), `PolicyCard`, `ReminderItem`, `OfferMessage` (patrocinado, con su etiqueta).

---

## 6. Mejores prácticas mobile-first aplicables

### Formularios móviles
- **Teclados adecuados:** Baymard encontró que el 54% de los sitios móviles no invoca el teclado optimizado para teléfono, código postal o tarjeta, y que la autocorrección y la capitalización automática se descuidan en el 79% y el 27% de los sitios [6][7]. Aplicar: documento con `inputMode="numeric"` (salvo PA), celular con `type="tel"`, `inputMode="numeric"` y `autocomplete="tel-national"`, placa con `autocapitalize="characters"`, `autocorrect="off"` y `spellcheck="false"`, OTP con `autocomplete="one-time-code"` [9].
- **Validación inline al salir del campo** (no mientras se escribe), con un mensaje específico ("La placa debe tener 3 letras y 3 números") y un resumen de errores al enviar.
- **Guardado de progreso:** sessionStorage para el invitado (✅ repo). Opcionalmente, enlace "Continuar después" por correo o WhatsApp, con consentimiento.
- **Inputs de 16 px o más,** un campo por fila en móvil y etiquetas siempre visibles (no solo placeholder).
- **Fecha de nacimiento:** el `type="date"` nativo es cómodo en Android pero lento para fechas lejanas en algunos navegadores. Alternativa: tres campos numéricos (DD/MM/AAAA) con `autocomplete="bday-day"`, etc.

### Checkout de seguros en móvil
- Resumen fijo y colapsable arriba (plan, aseguradora, prima con IVA, vigencia) y CTA sticky abajo con el monto exacto ("Pagar $1.166.200").
- **Orden de los pasos:** datos del tomador y asegurado → del vehículo (prellenado) → preguntas SARLAFT de la aseguradora (✅ repo) → revisión con enlaces al condicionado → aceptación (OTP, ✅ repo) → pago.
- **Medios de pago locales:** tarjeta, PSE, Nequi o billeteras, y **Bre-B**. El sistema de pagos inmediatos del Banco de la República empezó a operar el 6 de octubre de 2025 con llaves y QR interoperables [14][15], así que es una opción por evaluar con la pasarela (INV-3). *El dato de adopción que citan los medios puede estar desactualizado.*
- **Retracto visible:** Ley 1480 y Ley 2439 de 2024 (comercio electrónico: reembolso en máximo 15 días calendario) [16]. *Falta confirmar con el área legal cómo aplica a pólizas de seguro.* El repo ya maneja retracto en 5 días hábiles.
- **Comprobante:** número de orden, estado del pago (pendiente, aprobado, rechazado) con autorrefresco (✅ repo), descarga del certificado y "Guárdalo en tu cuenta".

### Comparación en pantallas pequeñas
- Baymard documenta que los usuarios tienen **serias dificultades** con los comparadores, tanto para seleccionar como para leer las especificaciones. Los problemas típicos son specs con formatos inconsistentes y la falta de explicaciones en lenguaje común [8].
- **Patrón recomendado en móvil:** limitar a **2 en vista primaria** (3 con scroll), con la **columna de atributos fija** o, mejor, una **lista apilada por atributo** (cada fila muestra el valor de cada opción con logo pequeño) [17][18], más un toggle "Solo diferencias" y "Mejor" por fila.
- Normalizar los datos (deducible en % y en SMMLV mínimo, RC en millones, días de vehículo de reemplazo) en el `InsurerAdapter` para que la comparación sea posible.

### Sticky CTAs y navegación
- Un solo CTA sticky por vista. Ocultar el BottomNav en el cotizador, el checkout y el pago (✅ repo en checkout y pago; **sugerido también en `/cotizar/[tipo]`**). Calcular `scroll-padding-bottom` para no tapar el foco (2.4.11) [5].

### PWA
- Para Chromium, el manifest debe incluir `name` o `short_name`, `start_url`, `display` e **iconos de 192 y 512 px**. MDN también menciona un service worker con manejador `fetch` [19]. *Este último requisito puede haber cambiado en versiones recientes de Chrome: verificar con Lighthouse.*
- El repo tiene `manifest.ts`, pero **solo con un `icon.svg` "any" y sin service worker registrado.** Hay que agregar los PNG de 192 y 512 (y uno *maskable*) y un SW mínimo (página offline y caché de assets). No conviene cachear cotizaciones ni datos personales.

### Confianza (fintech e insurtech LatAm)
- Mostrar **quién vende y bajo qué figura**: razón social, NIT, figura (agencia, corredor o corresponsal; HU-14.1) y enlace a la consulta de entidades vigiladas de la SFC. **El logo "Vigilado SFC" solo se usa si la entidad realmente es vigilada**: la SFC alerta sobre "falsos vigilados" [1][2][3]. *No pude verificar el texto exacto de la Circular Básica Jurídica sobre ubicación y tamaño del logo (la fuente estaba bloqueada). Pendiente para el área legal.*
- Defensor del Consumidor Financiero de cada aseguradora (✅ repo, `DefensorInfo`), PQR (✅), condicionado descargable (✅) e IVA desglosado (✅).
- **Transparencia de la recomendación:** explicar cómo se ordena, declarar si hay comisiones o posiciones patrocinadas y marcar como "Patrocinado" cualquier oferta pagada.
- **Comunicaciones comerciales** dentro de los horarios de la Ley 2300 de 2023: L-V 7:00-19:00, sábados 8:00-15:00, nada en domingos ni festivos, con un límite de contacto [20]. (✅ repo en recordatorios: verificar que también aplique al "centro de ofertas".)
- Evitar el microcopy que promete resultados ("Ya estás más tranquilo" antes de pagar, "Ahorra hasta 30%") salvo que esté respaldado por datos propios con metodología publicada.

### Rendimiento
- Imágenes con `next/image` (AVIF o WebP, `sizes`, `priority` solo en el LCP) y alojadas en un dominio propio. Para el hero, preferir ilustración SVG o una foto propia (además evita depender de Unsplash).
- La fuente ya está optimizada con `next/font` (✅). Limitar a 3 pesos.
- Presupuesto sugerido para móvil 4G: LCP < 2,5 s, CLS < 0,1, INP < 200 ms (umbrales de Core Web Vitals; *conviene confirmarlos en web.dev al definir los SLO*).

---

## 7. Mapa de pantallas completo propuesto

| Área | Ruta (sugerida o existente en el repo) | Propósito | Estado en el repo |
|---|---|---|---|
| **Marketing** | `/` | Propuesta de valor, entrada por placa, cómo funciona, aseguradoras, educación, FAQ | ✅ |
| | `/como-funciona` | Metodología del recomendador y modelo de negocio (comisiones) | ✅ |
| | `/seguros/carro`, `/seguros/moto` (SEO) | Landing por línea y guía de coberturas | ⬜ |
| | `/aseguradoras` y `/aseguradoras/[id]` | Ficha de cada aseguradora: Defensor, calificación, canales de siniestro | ⬜ |
| | `/blog` o `/aprende` | Glosario (deducible, RC, SMMLV, pérdida parcial y total) | ⬜ (sección educativa ✅) |
| **Cotización** | `/cotizar` | Selector carro o moto (y futuras líneas "Próximamente") | ✅ |
| | `/cotizar/[tipo]` (pasos) | Placa o manual → uso y conductor → datos personales y consentimiento → prioridades (pesos) → preferencias (deducible, servicios) → resumen | ✅ (verificar el paso de resumen) |
| | `/cotizar/[tipo]/cargando` | Loader progresivo por aseguradora y resultados parciales | ✅ (en el wizard o resultados) |
| **Resultados** | `/resultados` | Recomendación destacada, lista, filtros y orden (bottom sheet), compartir | ✅ |
| | `/resultados/sin-resultados` (estado) | Vacío o error: ajustar datos, contactar asesor | Verificar |
| | `/comparar` | Comparador de 2 o 3 con "Mejor" por fila y modo de diferencias | ✅ (falta patrón móvil apilado) |
| | `/oferta/[id]` o modal | Ficha: coberturas, exclusiones, deducible, asistencias, IVA, documentos | ✅ |
| | `/condicionado/[aseguradora]/[plan]` | Condicionado general y clausulado | ✅ |
| **Compra** | `/checkout` (1/3) | Tomador, asegurado y vehículo (prellenado) | ✅ |
| | `/checkout` (2/3) | SARLAFT y revisión | ✅ |
| | `/checkout` (3/3) aceptación | OTP de aceptación de condiciones con evidencia | ✅ |
| | `/pago` → pasarela | Wompi (tarjeta, PSE, Nequi), Bre-B por evaluar | ✅ simulado |
| | `/pago/resultado` | Aprobado, pendiente, rechazado o expirado, con reintento | ✅ |
| | `/poliza/[id]` | Confirmación, certificado, próximos pasos, crear cuenta | ✅ |
| **Cuenta** | `/ingresar` | Acceso con código por correo (sin contraseña) | ✅ (LoginForm) |
| | `/cuenta` | Resumen: pólizas activas, próximos vencimientos, acciones | ✅ |
| | `/cuenta/seguros` y `/cuenta/seguros/[id]` | Billetera de pólizas (compradas aquí o externas), vehículos, pago de cuotas, siniestro (enlace a la aseguradora) | ✅ (subir PDF externo: HU-09.4 ⬜) |
| | `/cuenta/recordatorios` | Póliza, SOAT, tecnomecánica, cuotas, pico y placa (futuro); canal y horario | ✅ |
| | `/cuenta/ofertas` | Comunicaciones de aseguradoras con consentimiento y opción de baja | ✅ |
| | `/cuenta/perfil` | Datos, consentimientos (ver y revocar), descarga de mis datos, borrar cuenta | 🟡 (revocación y portabilidad: verificar) |
| | `/cuenta/renovaciones` | Re-cotización a 45 días del vencimiento | ✅ (en cuenta) |
| **Ayuda** | `/ayuda` | FAQ, cómo reclamar un siniestro por aseguradora, contacto, WhatsApp | ✅ (WhatsApp Business ⬜) |
| | `/pqr` | Peticiones, quejas y reclamos con radicado | ✅ |
| | `/defensor` (o sección) | Defensor del Consumidor Financiero por aseguradora | ✅ (sección) |
| **Legales** | `/legal/terminos`, `/legal/privacidad`, `/legal/datos` (autorización Ley 1581), `/legal/cookies`, `/legal/retracto`, `/legal/figura-legal` (intermediación y comisiones) | Cumplimiento | 🟡 (borradores, HU-14.2) |
| **Sistema** | `404`, `500`, `offline` (PWA), mantenimiento | Estados globales | 404 ✅, offline ⬜ |
| **Admin** | `/admin` | Órdenes, conciliación, PQR, campañas, embudo | ✅ |

---

## 8. Lista priorizada de mejoras de diseño
**P0 (antes de cualquier prueba con usuarios):**
1. Eliminar los claims no verificables y el "Vigilado o intermediario autorizado" hasta tener la figura legal. Copy coherente con la compra en plataforma.
2. Contraste AA en CTAs, badges, chips de cobertura y textos secundarios (tabla §4). En el repo, revalidar con axe tras cada cambio.
3. Formularios accesibles: labels asociados, `autocomplete`, `inputMode`, errores inline y resumen, foco visible, sin CTA deshabilitado mudo.
4. Recomendación explicable en resultados y "Mejor" por fila en el comparador.
5. Checkout real como invitado, con estados de pago (ya en el repo: hacerle QA visual móvil).

**P1:**
6. Comparador móvil en lista apilada por atributo, con columna fija, solo diferencias y bandeja de comparación visible desde el primer ítem.
7. Filtros y orden en bottom sheet con conteo de resultados en vivo.
8. Loader progresivo por aseguradora, resultados parciales, skeletons y estados vacío o error con salida.
9. Normalizar la presentación del precio (prima + IVA, total anual, cuota y costo de financiación) y del deducible (% y mínimo en SMMLV).
10. Iconografía unificada (lucide) sin emojis. Logos oficiales con autorización.
11. PWA instalable: iconos PNG de 192, 512 y maskable, SW con página offline. Ocultar el BottomNav en el cotizador.
12. Imágenes optimizadas o ilustraciones propias. Retirar el hotlink a Unsplash.

**P2:**
13. Ayuda contextual: glosario en popover accesible, "¿Por qué te pedimos esto?" en cada campo, chat o WhatsApp.
14. Guardar la cotización y retomarla por enlace. Compartir (✅).
15. Personalización de la cuenta (saludo según la hora, sin datos fijos), resumen de vencimientos y una línea de tiempo de la póliza.
16. Pruebas de usabilidad moderadas con 5 a 8 usuarios por segmento (carro, moto de trabajo o domicilios) y pruebas A/B de copy y pesos (INV-6, HU-04.4).

---

## 9. Limitaciones de esta auditoría
- Análisis estático del código del prototipo y lectura del código y la documentación del repo. **No se hizo una revisión visual ni una prueba con lector de pantalla de la app desplegada.**
- No se pudo leer el texto oficial de la SFC sobre el uso del logo "Vigilado" (el dominio de la fuente secundaria estaba bloqueado por el proxy). Sigue como pregunta abierta.
- Las cifras de Baymard provienen de sus estudios de e-commerce, no de seguros en particular. Los datos de adopción de Bre-B son de prensa y pueden estar desactualizados.

## Funcionalidades sugeridas

| Prioridad | Funcionalidad | Descripción |
| --- | --- | --- |
| MVP | Saneamiento de copy, marca y claims | Reemplazar 'Aseguu' por SeguAlaFija en todas partes. Eliminar cifras no respaldadas (+20 aseguradoras, 'Ahorra hasta 30%', '5 min') y la tarjeta 'Seguro activado' del hero. Alinear la FAQ con la compra en plataforma. Retirar 'Intermediario autorizado por la SFC' y el logo Vigilado hasta tener la figura legal |
| MVP | Paleta con contraste AA y tokens semánticos | Mover los colores de acción a blue-700/600 (#1565C0/#1A65C0), mint-700 #0B7A6B, sun-800 #8A6100, coral-700 #B42318 y muted #5B6B84. Dejar #3EA6FF, #2ECCB3 y #FF7B7A solo como decorativos. Prohibir hex inline (lint) |
| MVP | Kit de formulario accesible | Field con label asociado, hint y error. ErrorSummary con aria-live. Variantes TextInput (placa, documento, celular, moneda). autocomplete e inputMode correctos. Validación al salir del campo. Inputs de 16 px o más. Sin CTA deshabilitado sin explicación |
| MVP | RadioCardGroup y WeightSliders accesibles | Tarjetas de opción con role radiogroup, radio y aria-checked, más los controles de pesos (precio, cobertura, servicios) que suman 100%, con texto alternativo para lector de pantalla |
| MVP | Resumen editable al final del cuestionario | Último paso con todos los datos y 'Editar' por sección, en lugar de la tarjeta vacía del prototipo |
| MVP | Recomendación explicable en resultados | Tarjeta 'Recomendada para ti' con el porqué en lenguaje simple según los pesos. Aviso de que no es asesoría. Divulgación de comisiones o patrocinio |
| MVP | Loader progresivo y estados de resultados | Skeletons, progreso por aseguradora, banner de resultados parciales, estado vacío y estado de error con reintento y contacto |
| MVP | PriceBlock normalizado | Prima sin IVA + IVA 19% = total anual, cuota mensual y costo de financiación, con números tabulares. Deducible en % y mínimo en SMMLV |
| V1 | Comparador móvil apilado | Vista por atributo con columna fija o lista apilada, 'Solo diferencias', 'Mejor' por fila, quitar ítems y bandeja de comparación visible desde el primer seleccionado |
| V1 | Filtros y orden en bottom sheet | Filtros funcionales (aseguradora, coberturas incluidas, deducible, rango de precio) con conteo en vivo y 'Limpiar'. En escritorio, panel lateral |
| MVP | StickyActionBar y reglas de apilamiento | Un CTA sticky por vista con safe-area. Ocultar el BottomNav en cotizador, checkout y pago. scroll-padding para no tapar el foco. Escala de z-index en tokens |
| V1 | TrustBar y footer legal | Razón social, NIT, figura de intermediación, enlace a la consulta de vigilados de la SFC (y logo solo si aplica), Defensor del Consumidor Financiero, PQR, medios de pago y enlaces legales reales |
| MVP | Iconografía unificada sin emojis | Set lucide con aria-hidden o etiqueta. Logos oficiales de aseguradoras con autorización y fallback de iniciales con contraste AA |
| V1 | PWA instalable con página offline | Iconos PNG de 192, 512 y maskable en el manifest. Service worker mínimo con página offline y caché de assets estáticos (sin datos personales ni cotizaciones) |
| V1 | Optimización de imágenes y medios | Reemplazar el hotlink de Unsplash por assets propios o ilustraciones, usando next/image con sizes, priority en el LCP y dimensiones explícitas |
| V1 | Entrada por placa con autocompletado del vehículo | Placa → datos del vehículo (proveedor RUNT autorizado) y código Fasecolda para el valor asegurado, con alternativa manual en Combobox de marca, línea, año y versión |
| V1 | Ayuda contextual y glosario | '¿Por qué te pedimos esto?' en cada campo, popovers accesibles para deducible, RC, SMMLV y pérdida parcial o total, y enlace a WhatsApp o asesor |
| V2 | Guardar y retomar la cotización | Enviar un enlace para continuar después (correo o WhatsApp, con consentimiento) además de sessionStorage |
| V2 | Panel de cuenta personalizado | Saludo según la hora, próximos vencimientos (póliza, SOAT, tecnomecánica, cuotas), línea de tiempo de la póliza y carga de pólizas externas |
| V2 | Biblioteca de componentes documentada | Catálogo (Storybook o página interna) de tokens y componentes, con pruebas axe por componente y en claro y oscuro |
| V1 | Pruebas de usabilidad móviles | 5 a 8 usuarios por segmento (carro, moto de trabajo o domicilios) sobre cotización, comparación y checkout. Métricas: tiempo a cotizar, comprensión del deducible, confianza |

## Riesgos

- Usar el logo 'Vigilado SFC' o la frase 'Intermediario autorizado' sin tener la figura legal: la SFC publica listas de 'falsos vigilados' y hay riesgo sancionatorio y reputacional
- Claims de ahorro o cobertura sin metodología ('Ahorra hasta 30%', '+20 aseguradoras') pueden configurar publicidad engañosa según el Estatuto del Consumidor (Ley 1480 de 2011)
- Mostrar marcas reales de aseguradoras con datos simulados sin autorización (el repo ya muestra avisos de Demo, pero se necesita permiso antes de operar)
- Que la recomendación se interprete como asesoría profesional, con obligaciones de intermediario. Requiere avisos y definir la figura (INV-4, HU-14.1)
- Contraste y semántica insuficientes si se migran estilos del prototipo sin pasar por los tokens del repo (regresión de accesibilidad)
- La apilación de elementos sticky (header, BottomNav, CTA, barra de comparación) puede tapar contenido y foco en pantallas pequeñas (WCAG 2.4.11)
- La PWA no es instalable en Chromium con el manifest actual (solo SVG, sin SW). Verificar con Lighthouse
- Las comunicaciones del centro de ofertas fuera de los horarios o del límite de frecuencia de la Ley 2300 de 2023 pueden generar sanciones de la SIC
- El hotlink a Unsplash en el prototipo crea dependencia externa, problemas de licencia de uso comercial y peor LCP
- La desactualización del encargo (dice que el repo está vacío y ya va en v0.7.0) puede causar trabajo duplicado. Hay que reconciliar backlog y auditoría

## Preguntas abiertas

- ¿Qué figura de intermediación se va a usar (agencia, corredor, corresponsal o red)? Define el copy de la FAQ, el footer, el uso del logo Vigilado y la TrustBar
- ¿Se mantiene la identidad visual del prototipo (navy, blue, mint, yellow, coral, Plus Jakarta Sans) con los ajustes de contraste propuestos, o hay un rebranding de SeguAlaFija en curso?
- ¿El CTA de máxima conversión será amarillo con texto navy (6,53:1) o azul sólido? Conviene definir un único color de acción primaria
- ¿Se publicará cómo se ordenan las recomendaciones y si hay comisiones o posiciones patrocinadas? ¿Cómo se etiquetarán las ofertas pagadas?
- ¿Qué datos mínimos se piden antes de mostrar precios (documento y fecha de nacimiento) frente a mostrar un rango sin datos personales? Afecta la conversión y el consentimiento
- ¿Se ofrecerá Bre-B como medio de pago desde el MVP o solo tarjeta, PSE y Nequi vía la pasarela?
- ¿Hay presupuesto para fotografía o ilustración propia que reemplace Unsplash?
- ¿El comparador debe soportar 3 opciones en móvil o se limita a 2 en vista primaria?
- ¿Se autoriza el uso de logos oficiales de las aseguradoras simuladas o se usan marcas ficticias en la demo?
- ¿Qué segmentos priorizar en las pruebas con usuarios (moto de trabajo o domicilios frente a carro particular)?
- ¿Se aplica el retracto a la póliza voluntaria vendida a distancia en los términos que maneja el repo (5 días hábiles)? Validar con el área legal frente a la Ley 1480 y la Ley 2439 de 2024

## Fuentes

1. [SFC – Falsos vigilados 2024](https://www.superfinanciera.gov.co/publicaciones/10115501/falsos-vigilados-2024/)
2. [SFC – Falsos vigilados 2023](https://www.superfinanciera.gov.co/publicaciones/10115074/falsos-vigilados-2023/)
3. [SFC – No se deje engañar: firmas que aseguran ser vigiladas sin serlo](https://www.superfinanciera.gov.co/publicaciones/10095824/no-se-deje-enganar-estas-seis-firmas-aseguran-ser-vigiladas-por-la-superintendencia-financiera-sin-serlo-10095824/)
4. [W3C – Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
5. [Deque – WCAG 2.2 Updates (2.4.11, 3.3.7, 3.3.8)](https://dequeuniversity.com/resources/wcag-2.2)
6. [Baymard – Mobile touch keyboards](https://baymard.com/blog/mobile-touch-keyboards)
7. [Baymard Labs – Touch keyboard types](https://baymard.com/labs/touch-keyboard-types)
8. [Baymard – Comparison tool (benchmark)](https://baymard.com/ecommerce-product-lists/benchmark/page-types/comparison-tool)
9. [Orange – The HTML autocomplete attribute: practical guide](https://a11y-guidelines.orange.com/en/articles/autocomplete-attribute/)
10. [Colombia Tramita – Cómo cotizar seguro de vehículo en línea](https://colombiatramita.co/vehiculos/cotizar-seguro-vehiculo-linea/)
11. [RUNT – Resolución 4170 de 2016 (expedición y consulta del SOAT)](https://runt.gov.co/sites/default/files/normas/Resoluci%C3%B3n%204170%20de%202016%20MT%20Reglamentaci%C3%B3n%20para%20expedici%C3%B3n%20y%20consulta%20del%20SOAT.pdf)
12. [C3 Care Car Center – Código Fasecolda](https://www.c3carecarcenter.com/blog/todo-sobre-el-codigo-fasecolda-guia-para-automovilistas/)
13. [Ley 1581 de 2012 (texto)](https://normas.cra.gov.co/gestor/docs/ley_1581_2012.htm)
14. [El País – Entra en operación Bre-B](https://www.elpais.com.co/servicios/desde-este-lunes-entra-en-operacion-bre-b-el-nuevo-sistema-de-pagos-instantaneos-del-banco-de-la-republica-0634.html)
15. [El Heraldo – Llaves Bre-B desde el 6 de octubre](https://www.elheraldo.co/economia/2025/09/19/las-llaves-de-bre-b-del-banco-de-la-republica-empezaran-su-funcion-oficial-desde-el-6-de-octubre/)
16. [Forvis Mazars – Ley 2439 de 2024 (consumidor de comercio electrónico)](https://www.forvismazars.com/co/es/insights/nuestras-publicaciones/tax-legal/ley-2439-de-2024)
17. [UX Movement – Stacked lists for mobile tables](https://uxmovement.com/mobile/stacked-lists-the-best-pattern-to-display-mobile-tables/)
18. [Foolproof – Making product comparison work on mobile](https://foolproof.co.uk/journal/making-product-comparison-work-on-mobile)
19. [MDN – Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_Installable)
20. [Actualícese – Así es la ley Dejen de Fregar (Ley 2300 de 2023)](https://actualicese.com/asi-es-la-ley-dejen-de-fregar/)
