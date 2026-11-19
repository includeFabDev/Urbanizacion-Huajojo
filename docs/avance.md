# Avance

## Etapa actual

Sprint 1 (UH-1 a UH-4) está implementado y verificado en el proyecto Supabase
de desarrollo. No se inició Sprint 2 ni se desplegó el proyecto.

Las migraciones 001–004 están aplicadas en el orden previsto. Se consultó el
historial y el dry-run antes de aplicar la migración 004; no se usó reset ni
se cargó el seed ficticio.

## Datos de desarrollo preservados

La verificación remota posterior a las pruebas confirmó:

- 1 urbanización, 4 manzanos, 61 lotes, 244 lados y 6 áreas comunes.
- Los 61 lotes importados mantienen habilitación comercial `NULL`; no hay
  lotes publicados.
- Cero lotes o lados duplicados y cero relaciones huérfanas.
- Los IDs importados se conservan; las secuencias verificadas están
  sincronizadas con sus IDs máximos.
- No se modificaron los 61 lotes importados ni se cargaron datos de seed.

Las E2E usaron lotes QA etiquetados y separados de los importados. Los
registros temporales se eliminaron, y las verificaciones posteriores
confirmaron que los conteos originales se conservaron.

## Trabajo de Sprint 1

- Registro, consulta, filtros, paginación, detalle y edición de lotes.
- Validación de números únicos por manzano y escritura segura de los lados.
- Catálogo público limitado a lotes con habilitación explícita y disponibilidad
  efectiva; `NULL` no se interpreta como disponible.
- Inicio/cierre de sesión y autorización de operaciones administrativas por rol
  `owner`.
- Procedencia de superficies y longitudes estimadas conservada, sin
  presentarlas como medidas verificadas.
- Se conserva el modelo existente de cotizaciones y reservas; no se
  implementan sus flujos fuera del alcance de Sprint 1.

## Verificación real

- E2E owner: aprobada; login/logout, panel y consulta de los 61 lotes, alta y
  edición QA, persistencia, rechazo de duplicado, publicación/exclusión pública
  y rechazo sin sesión.
- E2E autenticada sin rol: aprobada con cuenta Auth temporal. La cuenta fue
  verificada sin rol `owner` y eliminada al finalizar. El panel mostró acceso
  restringido sin datos privados; los endpoints administrativos de listado,
  manzanos y detalle, y los intentos POST/PATCH respondieron `403`. El PATCH
  apuntó a un lote QA temporal; el owner confirmó que no cambió y el test lo
  eliminó. No se alteró el rol owner existente.
- Preflight final: un rol `owner`, 61 lotes con habilitación desconocida y cero
  publicados; conteos finales iguales a los importados.
- Integridad: cero duplicados y huérfanos; secuencias sincronizadas con los
  IDs máximos verificados.
- `npm test`: 6 pruebas aprobadas; `npm run lint` y `npm run build` aprobados.
- `.env.local` está ignorado y el escaneo local de archivos fuente fuera de
  archivos `.env*`, dependencias y builds no encontró patrones de secretos.
- Git se inicializó localmente en `main`. No hay staging, commit, remoto ni
  push; no se publicó ningún archivo. La preparación de Vercel está en
  `docs/despliegue.md`.

## Pendientes y límites conocidos

- Next.js ya no informa el uso inestable de `Date.now()` al prerenderizar el
  panel. Durante las E2E aún informa que el redirect esperado de una sesión
  anónima interrumpe la validación de instant UI y que el segmento del panel
  no se puede validar como navegación instantánea. La ruta requiere comprobar
  sesión/rol por solicitud; los flujos autenticados y restringidos pasan. Se
  conservaron las validaciones activas y no se ocultó el aviso con una
  configuración de exclusión.
- Subir el repositorio privado a GitHub e importar/configurar en Vercel son
  pasos futuros; no se conectó GitHub ni se desplegó.
- Sprint 2 permanece sin iniciar.
