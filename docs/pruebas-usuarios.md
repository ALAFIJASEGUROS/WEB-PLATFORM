# Kit de pruebas con usuarios (carro y moto)

Guía para hacer 15 a 24 sesiones moderadas, de 30 a 40 minutos cada una, con el prototipo. Lo ideal es remoto,
desde el celular de la persona y compartiendo pantalla.

## Objetivos
1. ¿Pueden cotizar sin ayuda empezando desde la portada (con placa o con las tarjetas)?
2. ¿Entienden por qué les recomendamos una opción, qué es el deducible y qué no cubre?
3. ¿Confían lo suficiente para pagar? ¿Qué les genera duda?
4. En motos, ¿el cuestionario refleja su uso real (trabajo, domicilios, plataformas)?

## Perfiles (5 a 8 personas por segmento)
| Segmento | Criterios | Cuidar |
| --- | --- | --- |
| Carro particular | 25–55 años, carro propio o financiado, renovó o compró póliza en los últimos 2 años | Mezcla de quienes compraron por banco, concesionario y por su cuenta |
| Moto para trabajo o transporte | Moto propia de 100–250 cc, la usa a diario | Al menos 2 sin seguro voluntario hoy (solo SOAT) |
| Domiciliario o plataformas | Trabaja con moto en domicilios o apps | Preguntar si su póliza actual cubre ese uso |

Varía la ciudad (Bogotá, Medellín, Cali y una intermedia) y el tipo de celular (Android de gama media).

## Antes de la sesión
- **Consentimiento:** autorización de tratamiento de datos y de grabación, con la finalidad (mejorar el producto),
  quién verá la grabación y cuánto tiempo se guarda. No pidas datos reales de cédula ni de tarjeta.
- **Ambiente:** la demo en GitHub Pages o el despliegue de prueba. Pide a la persona que use **su placa real** para
  cotizar; los precios son simulados. Para el pago, la pasarela es simulada.
- **Datos ficticios para la compra:** nombre "Prueba", cédula 1000000000, correo `prueba+<n>@ejemplo.com`,
  celular 3000000000.
- **Placas útiles:** cualquier placa válida funciona. `ERR…` simula que una aseguradora no responde y `EMI…` que la
  emisión falla la primera vez.

## Guion
**Introducción (3 min).** "Estamos probando la página, no a ti. Piensa en voz alta. No hay respuestas correctas."

| # | Tarea (léela tal cual) | Éxito si… | Observa |
| --- | --- | --- | --- |
| T1 | "Quieres saber cuánto te costaría asegurar tu carro/moto. Empieza desde esta página." | Llega a resultados sin ayuda | Si usa la placa o las tarjetas, dudas en el cuestionario, abandonos |
| T2 | "¿Cuál te recomendamos y por qué? Explícalo con tus palabras." | Menciona al menos una razón correcta | Si lee las razones, si entiende el puntaje de afinidad |
| T3 | "¿Qué tendrías que pagar tú si chocas? ¿Qué no cubre esta opción?" | Explica el deducible y una exclusión | Si encuentra el detalle y el condicionado |
| T4 | "Compara la recomendada con la más barata y elige." | Usa el comparador o el detalle | Qué fila decide la elección |
| T5 | "Compra la que elegiste." (con datos ficticios) | Llega a "¡Listo, ya estás asegurado!" | Dudas en las preguntas de conocimiento del cliente, en el código de aceptación y en el pago |
| T6 (moto) | "Si usaras la moto para domicilios, ¿cambia algo?" | Edita el uso en el resumen y ve los planes descartados | Si entiende por qué se descartan |
| T7 | "Tuviste un choque hoy. ¿Qué haces con esta página?" | Llega a la guía de siniestros | Ruta usada (póliza, ayuda, footer) |
| T8 (opcional) | "Registra la póliza que ya tienes subiendo el PDF." | Datos prellenados y confirmados | Confianza al subir documentos |

Después de cada tarea, pregunta: "Del 1 al 7, ¿qué tan fácil fue?" (SEQ) y "¿Qué esperabas que pasara?".

**Cierre (5 min).**
- ¿Comprarías aquí? ¿Qué te faltaría para hacerlo?
- ¿Qué fue lo más confuso?
- ¿Qué le cambiarías a la primera pantalla?
- En una frase, ¿qué hace SeguAlaFija?

## Métricas
- **Éxito por tarea:** completa / con ayuda / no completa.
- **Tiempo** a resultados (T1) y a compra (T5).
- **SEQ promedio** por tarea, con meta ≥ 5,5.
- **Comprensión:** % que explica bien el deducible (T3) y el porqué de la recomendación (T2).
- **Intención de compra:** respuesta del cierre (sí / tal vez / no) y el motivo.
- **Errores y abandonos**, con el paso donde ocurren.

## Registro (una fila por persona y tarea)
| Sesión | Segmento | Tarea | Resultado | Tiempo | SEQ | Problema observado | Cita textual | Severidad (1–4) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Severidad:
1. Cosmético.
2. Molesta pero sigue.
3. Se demora o necesita ayuda.
4. Bloquea o abandona.

## Después
1. Agrupar los problemas por pantalla y contar cuántas personas tuvo cada uno.
2. Priorizar por severidad × frecuencia y llevar los 5 principales al backlog (épica E13 o E19).
3. Cruzar con /admin (embudo, experimentos A/B): lo que se ve en las sesiones explica los números.
4. Repetir con 5 personas después de los cambios para confirmar la mejora.
