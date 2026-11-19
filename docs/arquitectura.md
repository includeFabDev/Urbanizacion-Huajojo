# Arquitectura

Aplicación única Next.js con App Router y JavaScript.

```text
Interfaz
  -> Cliente HTTP
  -> API REST /api/v1
  -> Servicios
  -> Repositorios
  -> Supabase PostgreSQL
```

Supabase Auth administra sesiones; las políticas RLS protegen el catálogo y
las tablas privadas. La asignación de roles se administra fuera de formularios
editables por el usuario.

Módulos implementados para Sprint 1:

- `src/lib/supabase/` para clientes browser y servidor.
- `src/server/` para autorización de owner, servicios y repositorios.
- `src/features/lotes/` para formularios, listado administrativo y catálogo
  público.
- `src/app/api/v1/` para endpoints REST de registro, consulta, actualización y
  consulta pública de lotes.
- `supabase/migrations/` para el modelo y flujos SQL; la migración 004 de Sprint
  1 está aplicada en desarrollo.
- `tests/unit/` para Vitest. Las pruebas E2E y las pruebas positivas de
  administración requieren configurar un owner de confianza.

## Módulos Sprint 2

- `src/features/ventas/` contiene schemas, formularios, detalle y descarga PDF.
- `src/app/api/v1/{clientes,ventas,pagos}/` expone las operaciones REST
  administrativas.
- `src/server/services/ventas.js` conserva la lógica de aplicación y
  `src/server/repositories/ventas.js` realiza las llamadas RPC.
- `202611190005_sprint2_sales_payments_receipts.sql` añade las RPC owner,
  transacciones, idempotencia, secuencia de recibos e instantánea JSON.
- RLS y `current_user_role()` permanecen como controles de negocio; las RPC
  también revalidan `owner`, límites y datos directamente.

## Sistema visual de formularios

- La paleta clara se centraliza en `src/app/globals.css` como variables CSS:
  fondo cálido, superficies blancas, verde bosque, arena decorativa, texto,
  bordes y foco. `color-scheme: light` evita que la preferencia del dispositivo
  aplique superficies oscuras.
- Las clases reutilizables `.form-card`, `.form-section`, `.form-label`,
  `.form-control`, `.field-help`, `.field-error`, `.form-alert`,
  `.form-actions` y `.btn-*` unifican campos, errores, avisos y acciones.
- Formularios existentes inspeccionados: acceso propietario; alta/edición de
  lotes; filtros públicos y administrativos de lotes; búsqueda de ventas;
  cliente mínimo embebido en alta de venta; alta de venta y registro de pagos.
  No hay una pantalla independiente de gestión de clientes ni formularios en
  modales; las confirmaciones actuales usan el diálogo nativo.
