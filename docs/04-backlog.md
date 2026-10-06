# Backlog

**Estado:** ✅ Hecho · 🟡 Parcial · ⬜ Pendiente.
**Prioridad (MoSCoW):** M = Must · S = Should · C = Could.
**Release:** MVP = demo funcional · V1 = venta real · V2 = crecimiento.
**Puntos:** Fibonacci. **Dep:** depende de un tercero o de una decisión.

Los criterios de aceptación van en formato verificable. Las historias ✅ conservan los criterios que ya cumplen las pruebas o la verificación E2E.

---

## E01 · Fundaciones
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-01.1 | Como equipo quiero un repo Next.js + TS + Tailwind con CI (lint, typecheck, tests, build) | ✅ | M | MVP | 3 |
| HU-01.2 | Como usuario quiero una interfaz accesible (WCAG 2.2 AA: foco visible, labels, objetivos táctiles de 44 px o más, reduced motion) | ✅ | M | MVP | 5 |
| HU-01.3 | Como equipo quiero tokens de diseño y modo oscuro | ✅ | S | MVP | 3 |
| HU-01.4 | Como equipo quiero pruebas E2E automatizadas (Playwright) en CI | ✅ | S | V1 | 5 |
| HU-01.5 | Como equipo quiero monitoreo de errores (Sentry) | ⬜ Dep | S | V1 | 2 |

**HU-01.2 · Criterios**
- Lighthouse Accessibility ≥ 95 en `/`, `/cotizar/auto`, `/resultados` y `/checkout`.
- Navegación completa con teclado.
- Contraste AA en los modos claro y oscuro.

## E02 · Agregador de aseguradoras
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-02.1 | Como plataforma quiero un contrato `InsurerAdapter` (`quote` + `issue`) y un modelo canónico de oferta | ✅ | M | MVP | 5 |
| HU-02.2 | Como usuario quiero ver resultados aunque una aseguradora falle o tarde | ✅ | M | MVP | 3 |
| HU-02.3 | Como equipo quiero mocks realistas de 2 aseguradoras con tarifas, latencias y errores | ✅ | M | MVP | 5 |
| HU-02.4 | Como equipo quiero metadatos regulatorios por adaptador (figura contractual, productos habilitados, campos KYC) | ⬜ | S | V1 | 3 |
| HU-02.5 | Como plataforma quiero integrar la API real de la primera aseguradora | ⬜ Dep | M | V1 | 13 |
| HU-02.6 | Como plataforma quiero caché de cotizaciones con la vigencia del precio | ✅ | C | V1 | 3 |

**HU-02.2 · Criterios**
- Con timeout por aseguradora, si una falla se muestran las demás más un aviso.
- Lo cubre la prueba `quoteAll` con resultados parciales y timeout.

## E03 · Vehículo y cuestionario
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-03.1 | Como usuario quiero cotizar con mi placa y, si no la tengo, con marca, línea y año | ✅ | M | MVP | 3 |
| HU-03.2 | Como usuario quiero responder preguntas sobre el uso, el parqueo, el kilometraje, quién maneja y si está financiado | ✅ | M | MVP | 3 |
| HU-03.3 | Como usuario quiero indicar mi prioridad (precio, cobertura, servicios o equilibrio) | ✅ | M | MVP | 2 |
| HU-03.4 | Como usuario quiero **ponderar** mis prioridades (repartir 100 puntos o usar sliders) en lugar de elegir una sola | ✅ | S | V1 | 5 |
| HU-03.5 | Como equipo quiero un catálogo con código Fasecolda (marca, línea, versión, valor) | ⬜ Dep | S | V1 | 5 |
| HU-03.6 | Como plataforma quiero consultar la placa en RUNT a través de un proveedor autorizado | ⬜ Dep | S | V1 | 8 |
| HU-03.7 | Como usuario quiero que mi progreso se guarde si cierro la pestaña | ✅ | C | MVP | 1 |

**HU-03.4 · Criterios**
- Hay 3 sliders que suman 100%.
- El puntaje usa esos pesos.
- La explicación menciona los pesos.
- La prioridad única sigue disponible como atajo.

## E04 · Motor de recomendación
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-04.1 | Como usuario quiero un puntaje de afinidad y la razón de la recomendación | ✅ | M | MVP | 5 |
| HU-04.2 | Como usuario quiero avisos cuando una opción no me conviene (financiación, deducible, hurto) | ✅ | M | MVP | 2 |
| HU-04.3 | Como usuario quiero saber cómo se calcula y que la comisión no influye | ✅ | M | MVP | 2 |
| HU-04.4 | Como equipo quiero A/B testing de los pesos con datos de conversión | ⬜ | C | V2 | 8 |
| HU-04.5 | Como usuario quiero que me avisen cuando aparezca una opción mejor al renovar (re-cotización) | ✅ | S | V1 | 5 |

## E05 · Resultados y comparador
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-05.1 | Como usuario quiero ver la recomendación destacada y ordenar y filtrar el resto | ✅ | M | MVP | 3 |
| HU-05.2 | Como usuario quiero comparar hasta 3 opciones, con lo mejor de cada fila marcado | ✅ | M | MVP | 3 |
| HU-05.3 | Como usuario quiero una ficha completa con exclusiones, prima con IVA y enlace al condicionado (Ley 1328) | ✅ | M | V1 | 5 |
| HU-05.4 | Como usuario de escritorio quiero un panel con mi perfil y los filtros al lado de los resultados | ✅ | S | MVP | 3 |
| HU-05.5 | Como usuario quiero compartir mi cotización por enlace o WhatsApp | ✅ | C | V1 | 3 |

## E06 · Checkout sin registro
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-06.1 | Como usuario quiero comprar sin crear cuenta, con datos del tomador validados | ✅ | M | MVP | 5 |
| HU-06.2 | Como usuario quiero autorizaciones separadas y no premarcadas | ✅ | M | MVP | 2 |
| HU-06.3 | Como plataforma quiero guardar evidencia de cada consentimiento (fecha, versión del texto, IP) | ✅ | M | V1 | 3 |
| HU-06.4 | Como usuario quiero aceptar las condiciones con OTP (firma electrónica trazable) | ⬜ | S | V1 | 5 |
| HU-06.5 | Como aseguradora quiero capturar campos KYC/SARLAFT configurables | ⬜ Dep | M | V1 | 5 |

## E07 · Pagos (Wompi)
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-07.1 | Como plataforma quiero una abstracción de pasarela con estados, webhooks e idempotencia | ✅ | M | MVP | 5 |
| HU-07.2 | Como usuario quiero pagar con PSE, tarjeta o Nequi vía Wompi | 🟡 Dep | M | MVP | 3 |
| HU-07.3 | Como usuario quiero pagar mensual en 12 cuotas y pagar cada cuota desde mi cuenta | ✅ | S | MVP | 5 |
| HU-07.4 | Como usuario quiero débito automático de las cuotas (tokenización Wompi) | ⬜ Dep | S | V1 | 8 |
| HU-07.5 | Como equipo quiero conciliación diaria de pagos | ⬜ | S | V1 | 5 |

**HU-07.2 · Criterios**
- Con llaves sandbox, un pago aprobado emite la póliza.
- Un webhook con firma inválida responde 401.

## E08 · Emisión y póliza
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-08.1 | Como usuario quiero que la póliza se emita al pagar y llegue a mi correo | 🟡 Dep (Resend) | M | MVP | 3 |
| HU-08.2 | Como usuario quiero ver e imprimir mi póliza sin cuenta (enlace con token) | ✅ | M | MVP | 2 |
| HU-08.3 | Como usuario quiero ejercer el retracto con un plazo visible | ✅ | M | V1 | 5 |
| HU-08.4 | Como usuario quiero una guía de siniestros por aseguradora | 🟡 | S | V1 | 3 |

## E09 · Cuenta y billetera
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-09.1 | Como usuario quiero entrar con un código por correo, sin contraseña | ✅ (código en pantalla hasta tener Resend) | M | MVP | 3 |
| HU-09.2 | Como comprador invitado quiero que mis pólizas aparezcan al crear la cuenta | ✅ | M | MVP | 3 |
| HU-09.3 | Como usuario quiero registrar pólizas y vehículos de otros canales | ✅ | S | MVP | 3 |
| HU-09.4 | Como usuario quiero subir el PDF de una póliza y que se lean sus datos | ⬜ | C | V2 | 8 |
| HU-09.5 | Como usuario quiero ver mi sesión en el header | ✅ | C | MVP | 1 |
| HU-09.6 | Como plataforma quiero persistencia real (Supabase/PostgreSQL) | ⬜ Dep | M | V1 | 8 |

## E10 · Recordatorios y notificaciones
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-10.1 | Como usuario quiero recordatorios de renovación, SOAT, tecnomecánica y cuotas | ✅ | M | MVP | 3 |
| HU-10.2 | Como plataforma quiero respetar el horario de la Ley 2300 | ✅ | M | MVP | 2 |
| HU-10.3 | Como plataforma quiero excluir festivos y limitar a un contacto al día por usuario | ✅ | S | V1 | 3 |
| HU-10.4 | Como usuario quiero recibir avisos por WhatsApp | ⬜ Dep | S | V1 | 5 |
| HU-10.5 | Como plataforma quiero envío real de correos (Resend) | ⬜ Dep | M | V1 | 3 |

## E11 · Ofertas de aseguradoras
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-11.1 | Como usuario quiero ver ofertas solo si las autorizo, y retirar ese permiso | ✅ | M | MVP | 2 |
| HU-11.2 | Como admin quiero crear y pausar campañas segmentadas por tipo de vehículo | ✅ | S | MVP | 3 |
| HU-11.3 | Como aseguradora quiero un portal propio para publicar campañas y ver métricas | ⬜ | C | V2 | 13 |

## E12 · Backoffice y analítica
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-12.1 | Como admin quiero ver órdenes, recaudo y pólizas por aseguradora | ✅ | S | MVP | 3 |
| HU-12.2 | Como equipo quiero un embudo de conversión anónimo por paso | ✅ | S | MVP | 3 |
| HU-12.3 | Como equipo quiero roles de admin y auditoría | ✅ | S | V1 | 5 |
| HU-12.4 | Como equipo quiero exportar a PostHog | ⬜ Dep | C | V1 | 2 |

## E13 · Diseño visual
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-13.1 | Como usuario quiero que el campo de placa se parezca a una placa colombiana | ✅ | C | MVP | 1 |
| HU-13.2 | Como usuario de escritorio quiero que el cuestionario explique por qué se pregunta cada cosa | ✅ | S | MVP | 2 |
| HU-13.3 | Como usuario quiero una sección educativa sobre qué cubre un seguro | ✅ | S | MVP | 2 |
| HU-13.4 | Como usuario quiero tarjetas de oferta más compactas en escritorio | ✅ | S | MVP | 2 |
| HU-13.5 | Como usuario quiero un selector manual de tema (claro / oscuro / sistema) | ✅ | C | V1 | 1 |
| HU-13.6 | Como marca quiero logos oficiales de las aseguradoras con autorización | ⬜ Dep | S | V1 | 1 |

## E14 · Legal y cumplimiento
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-14.1 | Como plataforma quiero definir la figura de intermediación (corresponsalía, agencia o corredor) | ⬜ Dep | M | V1 | — |
| HU-14.2 | Como usuario quiero términos, política de datos y retracto revisados por un abogado | 🟡 (borradores) | M | V1 | 3 |
| HU-14.3 | Como plataforma quiero un canal de PQR y el enlace al Defensor del Consumidor Financiero | ✅ | M | V1 | 3 |
| HU-14.4 | Como plataforma quiero el registro en el RNBD (SIC) | ⬜ Dep | M | V1 | — |

## E15 · Investigación pendiente
| ID | Tema | Estado |
| --- | --- | --- |
| INV-1 | Benchmark competitivo | ✅ parcial (ver 01-investigacion) |
| INV-2 | Regulación | ✅ parcial |
| INV-3 | Pasarelas en Colombia: tarifas de Wompi, recurrencia, Bre-B | ⬜ |
| INV-4 | Recomendador: métodos de ponderación y riesgo de considerarlo asesoría | ⬜ |
| INV-5 | APIs de aseguradoras y proveedores de RUNT | ⬜ |
| INV-6 | Auditoría UX con usuarios reales | ⬜ |
| INV-7 | Canales y costos de WhatsApp y SMS | ⬜ |

## E16 · Extensibilidad
| ID | Historia | Estado | Prio | Rel | Pts |
| --- | --- | --- | --- | --- | --- |
| HU-16.1 | Como plataforma quiero agregar líneas nuevas (hogar, viaje) sin rehacer el núcleo | ⬜ | C | V2 | 13 |
| HU-16.2 | Como usuario quiero comprar el SOAT (gancho de entrada) | ⬜ Dep | S | V1 | 8 |

---

## Sprint 3 (completado)
HU-03.4 (prioridades ponderadas), HU-05.3 (ficha completa), HU-06.3 (evidencia de consentimiento),
HU-08.3 (retracto), HU-10.3 (festivos y tope diario), HU-13.5 (selector de tema), HU-01.4 (E2E en CI),
más las correcciones de la revisión automática del PR #1 (eventos falsificables, doble cobro de cuotas,
contraste en modo oscuro, cuota pendiente, header tras login, recaudo de cuotas).

## Sprint 4 (completado)
HU-02.6 (caché de cotizaciones), HU-05.5 (compartir cotización), HU-04.5 (re-cotización al renovar),
HU-12.3 (roles de admin por correo y bitácora), HU-14.3 (PQR con radicado y Defensor),
HU-01.2 (auditoría automática con axe, WCAG 2.2 AA, modo claro y oscuro).

## Próximo sprint sugerido
Con lo que queda solo de código casi agotado, lo siguiente depende de terceros: Supabase (HU-09.6),
Resend (HU-10.5), llaves de Wompi sandbox (HU-07.2) y convenio con una aseguradora (HU-02.5).
De código quedan HU-02.4 (metadatos regulatorios por adaptador), HU-07.5 (conciliación),
HU-04.4 (A/B de pesos) y HU-16.1 (nuevas líneas de seguro).

## Bloqueados por terceros
- Supabase (HU-09.6)
- Resend (HU-10.5, HU-08.1)
- Llaves de Wompi (HU-07.2, HU-07.4)
- Aseguradoras (HU-02.5)
- RUNT y Fasecolda (HU-03.5, HU-03.6)
- Figura legal (HU-14.1)
