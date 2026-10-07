# Estado del proyecto · v0.11.0 (2026-10-07)

Resumen ejecutivo de lo construido y lo pendiente. El detalle por historia está en el
[backlog](04-backlog.md) y el historial de cambios en el [CHANGELOG](../CHANGELOG.md).

## Cómo verlo
- **Demo estática:** https://alafijaseguros.github.io/WEB-PLATFORM/. Se publica desde `main`. Sin servidor: la compra, la póliza y "Mis seguros" se simulan en el navegador.
- **Versión completa:** `npm run dev` (ver README). Incluye cuenta, admin, PQR, recordatorios y pagos.
- **Versión desplegada:** visible en el footer (`vX.Y.Z · commit · destino`).

## Lo hecho

| Área | Qué funciona | Cómo se verifica |
| --- | --- | --- |
| Cotización | Placa colombiana o marca, línea y año. Cuestionario de 5 pasos (uso, parqueo, kilometraje, conductores, financiación, prioridad o pesos, deducible, servicios, siniestros) | E2E de compra |
| Aseguradoras | Adaptadores simulados de SURA y Seguros Bolívar detrás de `InsurerAdapter`. Agregador con timeouts y resultados parciales. Caché de 15 min | Pruebas unitarias del agregador y la caché |
| Recomendación | Elegibilidad (uso y financiación) antes del puntaje, puntaje de afinidad (precio relativo, cobertura, servicios) con pesos editables, empate técnico, explicaciones y versión del algoritmo. Página "Cómo funciona" | Pruebas de puntaje y E2E |
| Resultados | Descuentos y tarifas especiales con precio de lista tachado, recomendación destacada, filtros, comparador de 3 con "Mejor" por fila, ficha con exclusiones, IVA y condicionado. Compartir por enlace o WhatsApp | E2E y axe |
| Compra | Checkout sin registro, revalidación del precio, preguntas SARLAFT por aseguradora, aceptación con código por correo, consentimientos separados con evidencia, Wompi (Web Checkout + webhook firmado) detrás de un registro de pasarelas, o pasarela simulada, pago anual o 12 cuotas | Pruebas de órdenes y E2E |
| Póliza | Estados de orden monótonos, emisión asíncrona con reintentos e idempotencia, certificado imprimible, retracto en 5 días hábiles | Pruebas de emisión y retracto |
| Cuenta | Acceso con código por correo, reclamación de compras como invitado, billetera de pólizas y vehículos (con lectura de pólizas en PDF), pago de cuotas, sugerencia de renovación con ahorro | Pruebas y E2E |
| Comunicaciones | Centro de preferencias por tipo de mensaje y canal. Recordatorios de póliza, SOAT, tecnomecánica y cuotas, y avisos de mora (Ley 2300: horario, festivos, un contacto al día). Centro de ofertas con consentimiento | Pruebas de recordatorios |
| Atención | Guía de siniestros por aseguradora. PQR con radicado y plazo de 15 días hábiles. Sección del Defensor del Consumidor Financiero | Pruebas de PQR |
| Administración | Descuentos por aseguradora (prender, apagar, magnitud, tope, vigencia y tope global) y su impacto en la conversión, experimentos A/B de pesos con valor p, roles `admin` y `analista` por correo, órdenes, recaudo, conciliación de pagos, embudo de conversión, campañas, PQR, bitácora y bandeja de mensajes | Pruebas de roles |
| Calidad | CI con lint, typecheck, 75 pruebas unitarias, build, 31 E2E con auditoría de accesibilidad (WCAG 2.2 AA, claro y oscuro) | GitHub Actions |
| Diseño | Mobile-first, app instalable (PWA) con página sin conexión, modo oscuro con selector, tokens de color con contraste AA, versión visible en el footer | axe |

## Lo pendiente

### Bloqueado por terceros (requiere cuentas, llaves o convenios)
| Tema | Historia | Qué se necesita |
| --- | --- | --- |
| Persistencia real | HU-09.6 | Proyecto de Supabase/PostgreSQL. Hoy los datos están **en memoria** y se pierden al reiniciar |
| Correo real | HU-10.5, HU-08.1 | Cuenta de Resend y dominio verificado. Hoy el código de acceso se muestra en pantalla |
| Pagos reales | HU-07.2, HU-07.4 | Llaves de Wompi sandbox y luego producción. Tokenización para débito automático |
| Aseguradoras reales | HU-02.5 | Convenio y API de al menos una aseguradora |
| Datos del vehículo | HU-03.5, HU-03.6 | Licencia de la Guía Fasecolda y proveedor autorizado de RUNT |
| WhatsApp | HU-10.4 | Cuenta de WhatsApp Business API |
| Monitoreo | HU-01.5, HU-12.4 | Sentry y PostHog |
| Legal | HU-14.1, HU-14.2, HU-14.4 | Figura de intermediación ante la SFC, textos revisados por un abogado y registro en el RNBD |
| Defensor del Consumidor | HU-14.3 | Datos oficiales de contacto de cada aseguradora |
| Marca | HU-13.6 | Logos oficiales con autorización |
| Tarifas especiales | HU-18.4, HU-18.5 | Tarifas acordadas con cada aseguradora y validación legal de los descuentos que salen de la comisión |

### Solo código (siguientes candidatos)
- Habilitar una nueva línea (hogar o viaje) siguiendo [nuevas-lineas.md](nuevas-lineas.md). SOAT depende del RUNT.

### Investigación
Los 7 frentes terminaron (ver [01-investigacion.md](01-investigacion.md) y [investigacion/](investigacion/)). De ahí salen las historias de la épica E17 del backlog; los Sprints 6 y 7 implementaron las de solo código. Quedan pendientes las pruebas con usuarios reales.

## Riesgos conocidos
- **Datos en memoria:** no apto para usuarios reales hasta tener Supabase.
- **Marcas reales con datos simulados:** toda la app muestra avisos de "Demo", pero se requiere autorización antes de operar.
- **Sin figura legal:** no se puede cobrar ni intermediar de verdad hasta definirla.
- **Integración con Wompi sin probar:** la firma y los nombres de parámetros salen de la documentación conocida y deben validarse en sandbox.
