# API REST

Las rutas de negocio están bajo `/api/v1`. Los importes se reciben y devuelven
como cadenas decimales en unidades monetarias (`NUMERIC(14,2)`), sin repetir
conversiones de centavos. Las respuestas de lectura usan `{ "data": ... }`;
los errores usan `{ "error": { "code", "message", "details?" } }`.

## Clientes mínimos (requiere sesión y rol `owner`)

- `GET /clientes?q=&limit=`: busca por nombre, identificación, teléfono o
  correo. `limit` admite 1–100 y el valor predeterminado es 25.
- `POST /clientes`: registra nombre y, opcionalmente, identificación, teléfono,
  correo y dirección. Una identificación no vacía es única sin distinguir
  mayúsculas ni espacios exteriores.

Los clientes no tienen un estado comercial. La creación conjunta de un cliente
y su venta ocurre en la misma transacción de base de datos.

## Ventas (requiere sesión y rol `owner`)

- `GET /ventas?q=&page=&page_size=`: listado con búsqueda y metadatos de
  paginación.
- `POST /ventas`: crea una venta. El cuerpo requiere `lote_id`, exactamente
  uno entre `cliente_id` y `cliente`, `tipo` (`contado` o `cuotas`),
  `precio_final`, moneda de tres letras, `forma_pago` y `fecha_venta`.
- `GET /ventas/{id}`: detalle de venta, cliente, lote, precio, pagos válidos y
  saldo.
- `GET /ventas/{id}/saldo`: precio final, total pagado, saldo, moneda e
  historial de pagos.
- `GET /ventas/{id}/pagos`: historial de pagos.
- `POST /ventas/{id}/pagos`: registra la recepción confirmada por el
  propietario. El cuerpo requiere clave `idempotency_key` UUID, importe
  positivo, moneda, medio de pago y fecha. Responde `201` con la venta
  recalculada y el recibo persistido.
- `GET /pagos/{id}/recibo`: devuelve los datos persistidos del recibo para
  visualizarlo o regenerar el PDF.

La creación de venta comprueba en PostgreSQL que el lote esté habilitado,
disponible y sin reserva vigente; una restricción parcial impide dos ventas
vigentes por lote. Una venta totalmente pagada sigue bloqueándolo. La
disponibilidad se calcula; no se modifica una columna de estado del lote ni se
crea un estado del cliente.

El saldo es `precio_final - SUM(pagos válidos)`. Cuotas programadas no reducen
el saldo; no se genera un cronograma, plazo, interés ni multa. No se registra
un pago inicial automáticamente al crear la venta.

El registro del pago bloquea la venta y vuelve a calcular el saldo en una
transacción. La clave idempotente y el número de recibo son únicos en la base
de datos. Un reintento con los mismos datos devuelve el mismo pago y recibo;
usar la misma clave para datos distintos responde `409`.

## Recibos

El recibo identifica número, fecha, cliente, lote/manzano, urbanización,
concepto, importe/moneda, medio, receptor y estado del pago. La API conserva
los metadatos con el pago; la interfaz genera un PDF descargable de nuevo a
partir de esa respuesta. El PDF se marca como documento electrónico y no como
copia firmada. No se persiste en el disco local de Vercel ni se envía por
correo o WhatsApp.

## Errores relevantes

- `401 UNAUTHENTICATED`: falta sesión.
- `403 FORBIDDEN`: sesión sin rol `owner`.
- `404 NOT_FOUND`: venta, cliente o recibo no encontrado.
- `409 LOT_NOT_AVAILABLE`: lote no habilitado o ya vendido/reservado.
- `409 SALE_CONFLICT`: ya existe una venta vigente para el lote.
- `409 PAYMENT_EXCEEDS_BALANCE`: importe mayor al saldo.
- `409 IDEMPOTENCY_CONFLICT`: clave idempotente reutilizada con otros datos.
- `422 INVALID_INPUT` / `PAYMENT_CURRENCY_MISMATCH`: contrato o moneda
  incompatible.

## Catálogo público y lotes (Sprint 1)

- `GET /lotes`, `POST /lotes`, `GET /lotes/{id}`, `PATCH /lotes/{id}` y
  `GET /manzanos`: administración; requiere sesión y rol `owner`.
- `GET /public/manzanos`, `GET /public/lotes` y
  `GET /public/lotes/{id}`: catálogo público; solo incluye disponibilidad
  confirmada y efectiva.

Las superficies y longitudes estimadas indican su procedencia y no se
presentan como medidas verificadas.

## Estado de despliegue

Las rutas y contratos de Sprint 2 están implementados en el árbol de trabajo.
La migración `202611190005_sprint2_sales_payments_receipts.sql` permanece
pendiente de aplicación y las pruebas E2E no se ejecutaron: la verificación
actual de Supabase detectó habilitación `true` para los 61 lotes importados,
en conflicto con el SQL fuente y el estado esperado. No se modificó la base.
