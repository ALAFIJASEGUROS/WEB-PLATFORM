# SeguAlaFija · Plan de trabajo (preliminar)

Marketplace de seguros de **carro y moto** para **Colombia**, mobile-first, con
recomendación basada en cuestionario y compra desde el celular.

## Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Stack | Next.js (App Router) + TypeScript + Tailwind 4, desplegable en Vercel |
| Aseguradoras | Nombres reales (SURA, Seguros Bolívar) con planes y precios **simulados** |
| Pasarela | Wompi (Web Checkout + webhooks). Proveedor simulado mientras no haya llaves |
| Regulación | Simplificada para el MVP: consentimientos de habeas data, términos, retracto. La figura de intermediación (corredor/agencia) queda pendiente |
| Compra | Sin registro obligatorio. La cuenta es opcional y permite reclamar pólizas compradas como invitado |
| Persistencia | Repositorio en memoria detrás de interfaces; migrar a PostgreSQL (Supabase) |

## Épicas

| ID | Épica | Estado |
| --- | --- | --- |
| E01 | Fundaciones: repo, CI, sistema de diseño, accesibilidad | ✅ base |
| E02 | Agregador de aseguradoras: modelo canónico, adaptadores, mocks, timeouts y resultados parciales | ✅ |
| E03 | Cuestionario y motor de recomendación explicable | ✅ |
| E04 | Resultados, filtros y comparador | ✅ |
| E05 | Checkout sin registro: tomador, consentimientos, resumen | ✅ |
| E06 | Pagos con Wompi (abstracción de proveedor, webhooks, idempotencia) | ✅ simulado + Wompi sandbox |
| E07 | Emisión y entrega de póliza | ✅ simulada |
| E08 | Cuenta (OTP por correo), billetera de pólizas y vehículos, reclamación de compras | ✅ |
| E09 | Recordatorios (póliza, SOAT, tecnomecánica) y preferencias de notificación | ✅ |
| E10 | Centro de ofertas de aseguradoras con consentimiento de marketing | ✅ |
| E11 | Backoffice: ventas, campañas | ✅ básico |
| E12 | Legal, ayuda, SEO, analítica | ✅ base |

## Próximos pasos (después del MVP)

1. Base de datos real (Supabase) y envío de correos/WhatsApp (Resend / WhatsApp Business).
2. Llaves de Wompi sandbox → producción; conciliación de pagos.
3. Convenios y APIs reales de aseguradoras; consulta RUNT / Fasecolda.
4. Definir figura legal de intermediación ante la SFC y textos legales revisados por abogado.
5. Investigación completa (benchmark, regulación, pagos) para validar supuestos.
