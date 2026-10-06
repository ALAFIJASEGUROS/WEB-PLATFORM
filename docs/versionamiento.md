# Política de versionamiento

## Esquema
Se usa [versionamiento semántico](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

| Parte | Cuándo sube | Ejemplo |
| --- | --- | --- |
| **MAYOR** | Cambio incompatible para usuarios o integraciones: cambia el contrato `InsurerAdapter`, el formato de los webhooks o una variable de entorno obligatoria | 1.0.0 → 2.0.0 |
| **MENOR** | Funcionalidad nueva compatible (normalmente un sprint) | 0.5.0 → 0.6.0 |
| **PARCHE** | Correcciones sin funcionalidad nueva | 0.6.0 → 0.6.1 |

**Fase 0.x:** mientras no haya venta real, el producto se mantiene en `0.x`. En esta fase un cambio incompatible sube la versión MENOR y se marca en el changelog como **Cambiado** con la advertencia en negrilla (por ejemplo, `ADMIN_PASSWORD` → `ADMIN_EMAILS` en 0.6.0).
**1.0.0** se publica con el primer despliegue que venda pólizas reales: persistencia en base de datos, correo real, Wompi en producción y figura legal definida.

Las versiones preliminares usan sufijos: `0.7.0-rc.1` para candidatas a release y `0.7.0-beta.1` para pruebas con usuarios.

## Fuente de verdad
- La versión vive en `package.json` (y `package-lock.json`). No se escribe a mano en ningún otro lugar.
- `CHANGELOG.md` debe tener una sección `## [X.Y.Z]` para la versión de `package.json`. Lo verifica una prueba automática (`src/version.test.ts`), así que la CI falla si se sube la versión sin documentarla.
- Los cambios en curso se anotan en `## [No publicado]` dentro del mismo PR que los introduce.

## Proceso de release
1. En el PR del sprint, mover lo de "No publicado" a una nueva sección `## [X.Y.Z] - AAAA-MM-DD` y actualizar los enlaces de comparación al final del changelog.
2. Subir la versión con `npm version X.Y.Z --no-git-tag-version`, que actualiza `package.json` y el lock.
3. Hacer merge a `main` con la CI en verde.
4. Etiquetar el commit de merge: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
5. Crear el release en GitHub con el texto del changelog.

## Control visual del despliegue
Cada build inyecta, desde `build-env.mjs`, la siguiente información:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_APP_VERSION` | Versión de `package.json` |
| `NEXT_PUBLIC_COMMIT_SHA` | Commit corto. Viene de `VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA` o `git rev-parse` |
| `NEXT_PUBLIC_BUILD_DATE` | Fecha y hora del build (UTC) |
| `NEXT_PUBLIC_DEPLOY_TARGET` | `servidor`, `pages` o `vercel-<entorno>` |

El footer muestra `vX.Y.Z · <commit> · <destino>`, y al pasar el cursor se ve la fecha del build. Para verificar un despliegue, compara el commit del footer con el último commit de `main` o del PR desplegado.

## Ramas
| Rama | Rol | Reglas |
| --- | --- | --- |
| `main` | Producción. Cada push publica la demo en GitHub Pages; los releases se etiquetan aquí (`vX.Y.Z`) | Solo recibe merges por PR desde la rama de desarrollo, con la CI en verde (lint, typecheck, pruebas unitarias, build y E2E con accesibilidad) |
| `claude/funny-albattani-3b14tk` | Desarrollo (*develop*). Aquí se integra el trabajo de cada sprint | Se mantiene sincronizada con `main` después de cada merge |

Flujo: desarrollo en la rama *develop* → PR hacia `main` → CI en verde → merge → tag del release.

> La rama *develop* figura hoy como rama por defecto en GitHub porque fue la primera en subirse. Los PR deben abrirse siempre con `main` como base.
