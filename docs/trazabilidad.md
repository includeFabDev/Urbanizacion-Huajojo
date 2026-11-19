# Trazabilidad

| Clave | Artefactos | Estado y evidencia |
|---|---|---|
| UH-1 Registrar lotes | Formularios y `POST /api/v1/lotes`; validación y RPC transaccional | Implementado; alta real E2E completada con lote QA separado y limpiado |
| UH-2 Consultar lotes | `GET /api/v1/lotes`, filtros, paginación, detalle y vista administrativa | Implementado; panel owner consultó los 61 lotes; cuenta sin rol recibió `403` sin datos |
| UH-3 Actualizar lotes | `PATCH /api/v1/lotes/[id]`, versión optimista y formulario de edición | Implementado; persistencia owner verificada y PATCH sin rol rechazado `403` sin cambios |
| UH-4 Consultar lotes disponibles públicamente | Catálogo y detalle público con filtros y RPC de lista segura | Implementado; E2E verificó publicación/exclusión; el estado inconsistente de los importados permanece sin corregir |
| UH-7 Registrar venta | UH-39–44; `POST /api/v1/ventas`, `SaleForm`, RPC `register_sale`, índice único activo | Implementado y aprobado en E2E QA; cliente/lote/venta probados con limpieza |
| UH-8 Consultar deuda/saldo | UH-45–49; `GET /api/v1/ventas/{id}/saldo`, RPC `admin_sale_detail`, pantalla de detalle | Implementado y aprobado sin pagos, con pagos parciales y totales |
| UH-9 Pago y recibo | UH-50–56; `POST /api/v1/ventas/{id}/pagos`, `GET /api/v1/pagos/{id}/recibo`, `jspdf`, instantánea `recibo_datos` | Implementado y aprobado; reintentos idempotentes y PDF regenerable sin duplicar pago |

La migración `202611190004_sprint1_lote_workflows.sql` agrega los campos de
versión y superficie verificada, y las funciones/RLS necesarias. Se confirmó
su posición después de 001–003 y su aplicación en desarrollo. No se usó reset,
importación repetida ni seed ficticio para cerrar el sprint.

## Evidencia de cierre

- E2E owner: login/logout, panel, listado de 61 lotes, alta/edición QA,
  persistencia, duplicado, publicación/exclusión y rechazo sin sesión.
- E2E sin rol: cuenta Auth efímera verificada sin fila en `user_roles`, panel
  restringido y `403` en APIs de listado, manzanos, detalle, alta y edición.
  La edición se intentó sobre un lote QA; el owner confirmó que no cambió y el
  cleanup lo eliminó. La cuenta temporal también se eliminó.
- Supabase de desarrollo: 1 urbanización, 4 manzanos, 61 lotes, 244 lados y
  6 áreas comunes; un rol `owner`, 61 habilitaciones `NULL` y cero publicados.
- Integridad: cero duplicados de lotes/lados, cero relaciones huérfanas y
  secuencias sincronizadas con los IDs máximos verificados.
- `npm test`: 6 aprobados; lint, build y las dos E2E aprobaron.
- `.env.local` está ignorado; escaneo local de fuentes sin patrones de
  credenciales. Git está inicializado en `main`, sin staging, commit, remoto
  ni push.
- El aviso de `Date.now()` de Next.js se resolvió al separar el acceso a sesión
  como request-time. Se conservan avisos no bloqueantes de Instant UI por el
  redirect anónimo esperado y por el segmento protegido que no se valida como
  instantáneo; no se deshabilitó la validación.

UH-55 pide notificar al propietario. No se implementó correo ni mensajería:
la confirmación visible en la interfaz cumple la confirmación operativa sin
crear un canal externo fuera del alcance técnico de esta solicitud.
No se modificaron estados de Jira ni se desplegó el proyecto.
