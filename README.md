# SeguAlaFija · web-platform

Marketplace de seguros de **carro y moto** para Colombia. Es mobile-first: el
usuario responde un cuestionario, recibe una recomendación explicada, compara
aseguradoras y compra desde el celular con Wompi. La cuenta es opcional y sirve
para administrar pólizas, vehículos, recordatorios y ofertas de aseguradoras.

> **Demo:** SURA y Seguros Bolívar aparecen con su nombre real, pero sus planes,
> precios y condiciones son **simulados**.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # opcional: sin variables todo funciona en modo demo
npm run dev                  # http://localhost:3000
npm test                     # pruebas unitarias (vitest)
npm run lint && npm run typecheck
```

## Flujo para probar

1. `/cotizar/auto` → placa `ABC123` (moto: `ABC12D`). Los datos del vehículo son simulados.
   Con una placa que empiece por `ERR`, SURA falla y se muestran resultados parciales.
2. Resultados → comparar → "Lo quiero" → checkout sin cuenta → pasarela simulada.
3. Póliza emitida → "Guardarla en mi cuenta" → el código OTP aparece en pantalla en modo demo.
4. `/admin` (en desarrollo no pide contraseña): órdenes, campañas y bandeja de mensajes simulados.

## Arquitectura

| Carpeta | Contenido |
| --- | --- |
| `src/domain` | Modelo canónico (vehículo, oferta, cuestionario) y validaciones con zod |
| `src/insurers` | Contrato `InsurerAdapter`, agregador con timeouts y resultados parciales, adaptadores simulados |
| `src/recommendation` | Motor de puntaje (precio, cobertura, servicios) con explicaciones |
| `src/vehicles` | Consulta por placa simulada (RUNT/Fasecolda en producción) |
| `src/server` | Persistencia en memoria, órdenes, emisión, pagos (Wompi/simulado), OTP y recordatorios |
| `src/app` | Rutas Next.js: cotización, resultados, checkout, pago, póliza, cuenta, admin, legales |

Para agregar una aseguradora, implementa `InsurerAdapter` (`quote` + `issue`) y
regístrala en el agregador. Para agregar otra línea de seguro, extiende
`VehicleType` y el modelo de oferta.

### Pagos con Wompi

- Se usa Web Checkout con firma de integridad: `SHA256(referencia + centavos + moneda + secreto)`.
- Configura el webhook `https://<dominio>/api/webhooks/wompi`. Los eventos se validan con
  `WOMPI_EVENTS_SECRET` y se procesan de forma idempotente.
- La orden siempre se recotiza en el servidor, así que el cliente no puede alterar el precio.

### Limitaciones conocidas

- La persistencia es **en memoria** y se pierde al reiniciar. Siguiente paso: PostgreSQL (Supabase).
- Correo y WhatsApp están simulados: los mensajes van a la bandeja de `/admin`.
- Los textos legales son borradores y falta definir la figura de intermediación ante la SFC.

Ver el plan en [`docs/plan.md`](docs/plan.md).
