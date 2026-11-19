# Avance

## Estado actual

Se está preparando Sprint 2 (UH-7 a UH-9) en la rama local `sprint-2`, basada
en el commit existente de Sprint 1 `f678705`. No se creó otro commit ni se
publicó o desplegó el proyecto. El alcance de implementación se limita a
clientes mínimos, ventas, consulta de saldos, pagos y recibos; no incluye
documentos privados de compraventa, pasarelas ni notificaciones externas.

La migración `202611190005_sprint2_sales_payments_receipts.sql` fue aplicada
después de confirmar que 001–004 estaban aplicadas; el historial remoto quedó
en 001–005 y no se ejecutaron seeds ni reimportaciones. La migración incluye
validaciones RPC, límites de importes y la instantánea persistida del recibo.

## Bloqueo de integridad detectado antes de ejecutar Sprint 2

En las verificaciones remotas de solo lectura ejecutadas el 19/nov/2026:

- Se confirmó el conteo base: 1 urbanización, 4 manzanos, 61 lotes, 244 lados
  y 6 áreas comunes.
- Las relaciones no tienen huérfanos y no se detectaron duplicados de
  lotes/lados. Hay 0 clientes, ventas, pagos y cuotas antes de Sprint 2.
- Sin embargo, los 61 lotes importados tienen
  `habilitado_para_venta = true`; los 61 aparecen disponibles/publicados.
  `habilitado_para_venta IS NULL` cuenta 0.
- El archivo versionado `supabase/import_existing.sql` expresa `NULL` para
  habilitación en las filas importadas, y la documentación previa registraba
  61 valores desconocidos y cero publicados. La base actual contradice ambas
  evidencias.

No se actualizó ni sobrescribió ninguno de los 61 lotes. Se detuvo antes de
aplicar la migración o crear ventas/datos QA remotos. Se requiere investigar
la procedencia del cambio y acordar cómo resolverlo antes de continuar con
pruebas que dependan del proyecto de desarrollo. La discrepancia no se
presenta como resuelta.

## Implementación local de Sprint 2

- Se añadieron contratos Zod para clientes, ventas y pagos.
- Se añadieron servicios/repositorios y rutas administrativas para clientes,
  registro/listado/detalle de ventas, saldo, pagos e información de recibos.
- Se añadieron pantallas de registro, listado, detalle, consulta de saldo e
  historial; el PDF es regenerable desde los metadatos de recibo y no se
  persiste en el filesystem.
- La migración 005 agrega funciones RPC protegidas por `owner`, pagos
  atómicos/idempotentes, unicidad de recibos y un índice parcial de identidad
  de clientes. No modifica filas de lotes importados.
- Se añadieron pruebas unitarias de contratos y escenarios E2E QA que limpian
  únicamente filas etiquetadas. La discrepancia de habilitación se detectó en
  la verificación previa; las E2E posteriores se ejecutaron con filas QA
  separadas y sin modificar los lotes importados.
- No se añadió calendario de cuotas, intereses ni multas; no se crea pago
  inicial ni recibo al registrar una venta.

## Verificaciones locales ejecutadas

- `npm test`: 10 pruebas aprobadas (3 archivos).
- `npm run lint`: aprobado.
- `npm run build`: aprobado.
- E2E Sprint 2 owner: aprobada una vez corregido el selector de métricas.
  Verificó venta válida/no disponible, concurrencia, pagos parciales y totales,
  sobrepago, idempotencia y descarga PDF.
- E2E sin rol: aprobada. Las rutas cliente/venta/pago/recibo fueron añadidas
  y respondieron `403` para una cuenta autenticada sin owner.
- `.env.local` está ignorado y no está versionado; `.env.example` es el único
  archivo `.env*` versionado y contiene marcadores.
- Post-E2E: 61 lotes originales, 0 clientes, 0 ventas, 0 pagos y 0 cuotas;
  244 lados y 6 áreas comunes conservados.
- Migración 005 aplicada únicamente una vez; el historial remoto lista 001–005.
- No se hizo commit, push ni despliegue.

## Pendiente concreto

1. Resolver la discrepancia entre los 61 estados remotos `true/publicados` y
   el estado `NULL` previsto por el SQL de importación. No se alteró ningún lote.
2. Revisar manualmente el PDF generado y decidir si se requiere una firma o
   una copia auténtica; no se implementó almacenamiento de documentos.

Sprint 2 está implementado y verificado en desarrollo; no se desplegó a Vercel
ni se modificaron estados de Jira.

## Rediseño visual de formularios

- Se identificaron y rediseñaron acceso, catálogo y sus filtros, filtros
  administrativos, alta/edición de lotes, búsqueda de ventas, selección/alta
  mínima de clientes, registro de ventas y registro de pagos. No existe una
  pantalla independiente de clientes ni formularios modales.
- Los tokens claros y clases reutilizables están documentados en
  `src/app/globals.css` y `docs/arquitectura.md`. Se mantuvieron contratos,
  permisos, validaciones y lógica comercial.
- La E2E responsive capturó los formularios en 1280 px y 360 px y comprobó que
  no hubiera desbordamiento horizontal. Capturas locales: `test-results/ui-*.png`
  (archivos ignorados por Git).
- En el formulario de venta, “Revisar venta” permanece deshabilitado hasta
  seleccionar un cliente o elegir registrar uno nuevo; la apariencia atenuada
  es el estado deshabilitado previsto, no la ausencia de lotes. La lista de
  clientes existente está vacía y no se añadió ningún cliente para el diseño.
- No se modificaron datos ni se ejecutaron migraciones, importaciones o seeds.
  La discrepancia documentada de habilitación comercial remota permanece sin
  cambios.
