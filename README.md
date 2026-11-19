# Urbanización Guajojó

Aplicación universitaria para comercialización y seguimiento de pagos de lotes.

## Requisitos

- Node.js 24 recomendado.
- Cuenta y proyecto de Supabase.
- npm.

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure las variables públicas de Supabase en `.env.local`. No use
`SUPABASE_SERVICE_ROLE_KEY` en código de navegador.

## Migraciones

Las migraciones de PostgreSQL están en `supabase/migrations/`. El seed de
demostración está identificado como datos de ejemplo en `supabase/seed.sql`.
La importación del SQL existente no usa el seed: `npm run db:import` carga
explícitamente `.env.local`, valida el estado y ejecuta la transacción
idempotente de `supabase/import_existing.sql`. No registra los valores de
configuración. El historial y aplicación de migraciones se consultan con
`scripts/supabase-deploy.ps1 -Action status`; no uses `db reset`.

## Comprobaciones

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Las pruebas E2E requieren navegador Playwright y, para flujos privados,
credenciales de un usuario propietario configuradas en el entorno.

## Sprint 1

UH-1 a UH-4 están implementadas en la aplicación. La migración
`202611190004_sprint1_lote_workflows.sql` debe aplicarse después de revisar el
dry-run con `scripts/supabase-deploy.ps1 -Action dry-run`; no ejecutes `db
reset`. Las APIs administrativas requieren que una persona de confianza asigne
el rol `owner` fuera de la aplicación.

Consulta [la guía de alta owner](docs/roles-owner.md) para crear el usuario
administrativo de forma segura, ejecutar las pruebas E2E locales y verificar
el alta del rol sin habilitar autoasignación.
