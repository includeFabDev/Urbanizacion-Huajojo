# API REST

Las rutas de Sprint 1 están bajo `/api/v1`.

## Administración (requiere sesión y rol `owner`)

- `GET /lotes`: búsqueda, filtros por manzano, disponibilidad, categoría,
  superficie y precio; orden y paginación.
- `POST /lotes`: crea un lote y, opcionalmente, sus cuatro longitudes en una
  transacción. La habilitación comercial puede permanecer `null`.
- `GET /lotes/[id]`: detalle administrativo, procedencia y lados.
- `PATCH /lotes/[id]`: actualización parcial con control de versión optimista.
- `GET /manzanos`: manzanos para formularios administrativos.

## Catálogo público

- `GET /public/manzanos`: códigos para filtrar.
- `GET /public/lotes`: catálogo paginado y filtrable; solo incluye lotes con
  habilitación confirmada y disponibilidad efectiva.
- `GET /public/lotes/[id]`: detalle público; un lote no disponible responde
  `404`.

La respuesta pública es una lista explícita de campos comerciales y no incluye
observaciones ni datos personales. Los montos se envían como cadenas decimales
con moneda. La superficie y las longitudes indican su procedencia y no se
presentan como medidas verificadas cuando son estimadas o están pendientes de
verificación.

Los endpoints de clientes, ventas, cuotas, pagos y recibos aún no se
implementan: quedan fuera de UH-1 a UH-4.
