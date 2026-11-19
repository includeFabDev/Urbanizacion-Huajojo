# Pruebas

## Resultados

- `npm test`: 6 pruebas aprobadas.
- `npm run lint`: aprobado.
- `npm run build`: compilación de producción aprobada.
- `npm run test:e2e -- --workers=1`: la E2E de owner aprobada; la prueba
  separada de cuenta sin rol aparece omitida en esta ejecución porque requiere
  el aprovisionamiento temporal de una cuenta.
- `npm run test:e2e:nonowner`: 1 prueba aprobada. El script creó una cuenta
  Auth temporal confirmada, verificó que no tuviera fila en `user_roles`,
  ejecutó la prueba y eliminó la cuenta sin cambiar el rol owner.

## Flujos E2E de owner

- Rechazo de la API administrativa sin sesión y redirección del panel al
  inicio de sesión.
- Inicio de sesión, acceso al panel y consulta de los 61 lotes.
- Registro de un lote de prueba etiquetado, edición y persistencia.
- Rechazo de número duplicado dentro del mismo manzano.
- Inclusión en el catálogo al habilitar la disponibilidad y exclusión al
  deshabilitarla.
- Cierre de sesión y rechazo posterior del acceso al panel.
- Limpieza del lote QA sin modificar filas importadas.

## Flujos E2E sin rol owner

La prueba inició sesión con la cuenta temporal sin rol y verificó:

- El panel muestra acceso restringido y no revela el listado de 61 lotes ni
  enlaces administrativos.
- `GET /api/v1/lotes`, `GET /api/v1/manzanos`,
  `GET /api/v1/lotes/{id}`, `POST /api/v1/lotes` y
  `PATCH /api/v1/lotes/{id}` responden `403` con código `FORBIDDEN` y sin
  objeto `data`.
- El GET y PATCH sobre un lote privado de prueba también responden `403`.
  Después, el owner verificó que la observación y versión de ese lote seguían
  iguales; solo el lote QA fue eliminado.
- La cuenta temporal Auth fue eliminada por el script incluso después de la
  prueba; el owner de desarrollo no se modificó.

Tras la limpieza, Supabase confirmó 1 urbanización, 4 manzanos, 61 lotes,
244 lados, 6 áreas comunes, 61 habilitaciones `NULL`, cero lotes públicos,
cero duplicados y cero huérfanos. Las secuencias verificadas coinciden con los
IDs máximos.

## Mensajes Next.js y límites

El aviso anterior de `Date.now()` al prerenderizar el panel dejó de aparecer
tras marcar el acceso protegido como trabajo de request con `connection()`.
Siguen apareciendo durante E2E avisos de Instant UI: la validación anónima
encuentra el `NEXT_REDIRECT` intencional hacia login, y el segmento del panel
no se valida como instantáneo. La funcionalidad está verificada y no se
desactivó la validación para silenciar estos avisos; la optimización de
navegación instantánea queda pendiente.

No se ejecutaron pruebas contra producción ni se desplegó. Sprint 2 no se
inició.
