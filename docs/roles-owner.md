# Alta administrativa y rol `owner`

La aplicación inicia sesión con Supabase Auth y valida en el servidor que la
fila `public.user_roles` de la sesión tenga `role = 'owner'`. La clave primaria
de `user_roles` es `user_id`, referenciada a `auth.users(id)`. La política
RLS existente permite leer solo la fila del usuario autenticado; no hay una
política de autoasignación para insertar o cambiar roles. Los endpoints
administrativos vuelven a verificar el rol y las funciones SQL de escritura
también lo exigen.

## Crear el usuario

1. En el Dashboard del proyecto Supabase de desarrollo, abrir
   **Authentication → Users** y crear/invitar la cuenta con el correo que
   controlas. La aplicación usa inicio con correo y contraseña.
2. Confirma la dirección mediante el mecanismo de Supabase; usa una contraseña
   única y activa MFA para la cuenta administrativa si está disponible.
3. Copia el UUID de esa fila de usuario. No copies contraseñas ni claves al
   repositorio, a logs o al chat.
4. En **SQL Editor**, con una sesión administrativa de confianza, abre
   `supabase/verification/assign-owner-template.sql`, reemplaza ambas
   apariciones de `<AUTH_USER_UUID>` por el UUID recién copiado y ejecuta el
   script.
5. Si el usuario no existe o ya tiene cualquier fila de rol, el script aborta
   sin sobrescribirla. Revisa el resultado de la consulta final: debe mostrar
   solo el UUID esperado y `owner`.

No ejecutar el SQL desde el navegador, consola de la aplicación o una cuenta
de usuario normal. No usar `UPSERT`, triggers de alta Auth ni formularios que
permitan autoasignarse roles. La clave `anon/publishable` no sirve para esta
asignación.

## Datos de E2E locales

Cuando el owner esté listo, añade localmente a `.env.local` las variables
`E2E_OWNER_EMAIL` y `E2E_OWNER_PASSWORD` para que Playwright pueda iniciar
sesión. No las compartas ni las agregues a Vercel o Git. Ejecuta
`npm run test:e2e`; el test crea un lote con observación única
`SPRINT1-QA-DO-NOT-IMPORT-…`, comprueba el rechazo de duplicados, edición y
publicación, y termina dejándolo deshabilitado y fuera del catálogo. No cambia
los lotes importados.

El test deja ese lote identificado y deshabilitado en la base de desarrollo
como evidencia; escoge un número libre en el rango 900000–999999 para ese
manzano. No ejecutar pruebas E2E contra producción.
