# Decisiones y contradicciones

## Stack y tecnología

- **Fuentes:** Jira CSV y el instructivo técnico.
- **Diferencia:** UH-17 menciona Flask y varias subtareas mencionan
  Postman/HTML; el instructivo exige Next.js, API REST y Vitest/Playwright.
- **Impacto:** Implementar Flask o Postman como solución independiente sería
  incompatible con el despliegue único solicitado.
- **Solución adoptada:** Next.js será la aplicación completa y las rutas
  `/api/v1/lotes` reemplazarán Flask. Postman se reemplaza por pruebas HTTP
  verificables en Vitest/Playwright.
- **Justificación:** Conserva las claves Jira sin reproducir una tecnología
  contraria al alcance autorizado.

## Precios

- **Fuentes:** Instructivo técnico y modelo Jira.
- **Diferencia:** No existe SQL ni documentos previos en el repositorio que
  permitan confirmar el significado histórico del campo `precio`.
- **Impacto:** No se debe convertir ni interpretar datos existentes por
  suposición.
- **Solución adoptada:** el modelo distingue `precio_por_m2`,
  `precio_referencia_total`, `precio_final` y `moneda`.
- **Justificación:** evita mezclar precio de catálogo con importe histórico
  pactado.

## Modelo SQLite existente

- **Fuentes:** `Huajojo_SQLite.sql`, migración PostgreSQL y CSV Jira.
- **Diferencia:** el SQL original usa IDs SQLite, campos reales y precios en
  centavos; la base PostgreSQL usa UUID y `NUMERIC(14,2)`.
- **Impacto:** una conversión directa sin correspondencia podría perder datos
  o cambiar precios históricos.
- **Solución adoptada:** añadir `legacy_sqlite_id`, conservar los valores nulos
  y dividir los campos `*_centavos` por 100 con precisión decimal.
- **Justificación:** permite importación idempotente sin reemplazar datos.

## Disponibilidad comercial

- Los 61 lotes tienen `habilitado_para_venta = NULL`.
- Se conserva como desconocido, no como verdadero ni falso.
- El catálogo público requiere que sea explícitamente verdadero y que no exista
  una venta vigente o totalmente pagada.
- La disponibilidad administrativa también considera bloqueante una reserva
  `vigente` sin vencimiento o con vencimiento no expirado. Es una regla
  conservadora para el catálogo; no implementa ni modifica el módulo de
  reservas.
- La migración inicial había definido accidentalmente `NOT NULL DEFAULT true`.
  La importación transaccional detectó ese conflicto y revirtió sin insertar
  datos. La migración `202611190003` elimina el default y permite `NULL`;
  ningún dato existente se borra ni se actualiza.

## Procedencia geométrica

- `superficie_estimada_pdf_m2`, `superficie_m2` y las longitudes estimadas
  proceden del contorno del PDF de agosto de 2025.
- No se presentan como medidas verificadas en campo.
- `cota_plano_m` se conserva por separado de la longitud estimada.

## Cotizaciones y reservas

- Las tablas se preservan estructuralmente, pero no cuentan como módulos Jira
  autorizados en Sprint 1 o Sprint 2.
- El SQL fuente no contiene filas actuales en clientes, cotizaciones, reservas,
  ventas ni pagos.

## Estados de venta

- **Solución adoptada:** `vigente`, `cancelada` y `totalmente_pagada`.
- **Justificación:** se necesita una venta vigente en el flujo y una venta
  totalmente pagada debe seguir bloqueando el lote.

## Sprint 2

- Los importes se reciben como cadenas decimales y se almacenan en
  `NUMERIC(14,2)`; no se reutilizan conversiones históricas de centavos.
- El saldo se calcula como precio final menos pagos válidos. No se persiste un
  saldo redundante ni se descuentan cuotas sin pago efectivo.
- Las operaciones de venta y pago usan locks transaccionales y restricciones
  PostgreSQL. Las claves idempotentes impiden pagos duplicados por reintento.
- Los datos del recibo se conservan en `pagos.recibo_datos` al confirmar el
  pago, de modo que una edición posterior del cliente o lote no altere el
  comprobante ya emitido.
- No se genera cronograma de cuotas, interés, multa ni distribución automática
  de pagos; no existe acuerdo Jira documentado para inventarlos.
- UH-55 no activa correo ni WhatsApp. La confirmación se muestra en pantalla.

## Sprint 1 y acceso

- La migración de Sprint 1 es aditiva y no cambia filas existentes. Antes de
  aplicarla, el dry-run remoto confirmó que la 004 era la única pendiente;
  después se verificaron de nuevo los conteos de la importación.
- El preflight encontró cero roles `owner`. La interfaz y APIs administrativas
  permanecen protegidas; la asignación debe realizarla una persona de confianza
  mediante el procedimiento administrativo, nunca desde la aplicación.
- Supabase CLI se ejecuta vía `npx`. Los scripts cargan `.env.local` y no
  muestran sus valores.
