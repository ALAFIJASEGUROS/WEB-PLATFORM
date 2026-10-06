# Cómo agregar una línea de seguro

Hoy hay dos líneas disponibles, **carro** y **moto**. Las próximas (SOAT, hogar y viaje) ya están declaradas en `src/domain/lines.ts` con estado `proximamente` y aparecen en `/cotizar`.

## Pasos

1. **Registrar la línea.** En `src/domain/lines.ts`, cambia su `status` a `disponible`. Así aparece en `/cotizar` y en las rutas estáticas de `/cotizar/[tipo]`.

2. **Modelo del bien asegurado.** Hoy `Vehicle` describe el riesgo. Para hogar o viaje, define el tipo equivalente (por ejemplo `Property` o `Trip`) y amplía `QuoteRequest` con una unión discriminada por línea, en `src/domain/types.ts` y `schemas.ts`.

3. **Cuestionario.** Crea el wizard de la línea (puedes basarte en `QuoteWizard`) con sus preguntas de riesgo. Las preguntas de prioridad y de pesos se reutilizan tal cual.

4. **Coberturas y servicios.** Agrega las claves de la línea a `COVERAGE_KEYS`/`SERVICE_KEYS`, o crea un catálogo por línea, y define sus etiquetas en `labels.ts`. El motor de puntaje (`src/recommendation/scoring.ts`) trabaja sobre la oferta normalizada; ajusta los pesos de cobertura por línea en `coverageWeights`.

5. **Adaptadores.** Cada aseguradora declara en `supports` qué líneas cubre, y en `regulatory` su figura contractual y los campos KYC. El agregador solo consulta a las aseguradoras que soportan la línea pedida.

6. **Pruebas.** Agrega pruebas unitarias de tarifa y puntaje para la línea, y una prueba E2E de su flujo de compra. La auditoría de accesibilidad incluye automáticamente las páginas nuevas si las agregas a `PAGES` en `e2e/accesibilidad.spec.ts`.

## Caso especial: SOAT
- La tarifa la fija la regulación y la cobertura es igual en todas las compañías, así que no aplica el puntaje por cobertura. La comparación se hace por servicio y precio total.
- Requiere validar la placa contra el RUNT a través de un proveedor autorizado (ver HU-03.6), por lo que depende de un tercero.
