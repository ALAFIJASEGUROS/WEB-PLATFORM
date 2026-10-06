# Cómo agregar una pasarela de pago

El checkout, la conciliación, los cobros de cuotas y los webhooks solo dependen de la interfaz
`PaymentProvider` (`src/server/payments.ts`). Hoy hay dos adaptadores: **Wompi** y la **pasarela
simulada**, que solo existe cuando no hay ninguna real configurada (así no puede aprobar cobros en
producción).

## Pasos

1. **Adaptador.** Implementa `PaymentProvider`:
   - `id` y `label`: identificador corto (por ejemplo `payu`) y nombre visible.
   - `createCheckout(order, baseUrl)`: devuelve la URL del checkout alojado de la pasarela. Usa
     `order.reference` como referencia única y `order.amountInCents` como monto. La URL de regreso
     debe ser `/pago/resultado?ref=<referencia>&t=<token>`.
   - `fetchTransaction(id)`: consulta el estado de una transacción y lo normaliza a `PaymentUpdate`
     (`APPROVED`, `DECLINED`, `VOIDED`, `ERROR`, `PENDING`). La usan la página de resultado y la
     conciliación diaria.
   - `parseWebhook(body, headers)`: valida la firma del evento y lo normaliza. Devuelve `null` si
     la firma no es válida. El `eventId` debe ser único por evento, para la idempotencia.
2. **Registro.** Agrégalo en `configuredProviders()` solo si sus variables de entorno están
   completas, en el orden de preferencia.
3. **Selección.** `PAYMENT_PROVIDER=<id>` elige la pasarela para los cobros nuevos. Las órdenes y
   cuotas guardan con qué pasarela se crearon y siempre se consultan con esa, aunque la
   predeterminada cambie.
4. **Webhook.** Configura en el panel de la pasarela la URL `https://<dominio>/api/webhooks/<id>`.
   Para Wompi sigue siendo `/api/webhooks/wompi`.
5. **Pruebas.** Agrega pruebas de firma (válida y alterada) y de normalización de estados, como
   las de Wompi en `src/server/server.test.ts`.

## Pendiente (requiere terceros)
- Segunda pasarela real (PayU u otra) con QR/Bre-B y pago referenciado: necesita cuenta y llaves.
- Recaudo por aseguradora (split o comercio propio): depende de la figura legal (HU-17.14).
- Tokenización para cobro recurrente de cuotas (HU-07.4).
