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
