# Despliegue de Sprint 1

El proyecto está preparado para desplegarse, pero aún no se publicó en GitHub
ni se desplegó en Vercel. Git se inicializó localmente en la rama `main`, sin
staging, commit ni remoto. No se deben incluir archivos
`.env.local`, credenciales ni artefactos de pruebas en el repositorio.

## 1. Revisar y subir el proyecto a GitHub

1. Crear en GitHub un repositorio **privado** vacío, sin README, licencia ni
   `.gitignore` inicial.
2. Desde PowerShell, en la carpeta del proyecto, revisar que `.env.local` esté
   ignorado:

   ```powershell
   git check-ignore -v .env.local
   git status --short --ignored .env.local
   ```

   Debe aparecer como ignorado (`!!`), no como archivo staged o untracked.
   `.gitignore` excluye `.env*` excepto `.env.example`, además de `node_modules`,
   `.next`, artefactos Playwright y `.vercel`.
3. Preparar y revisar el primer commit:

   ```powershell
   git add -A
   git diff --cached --check
   git status --short
   git diff --cached --name-only
   git diff --cached
   ```

   Confirmar visualmente que solo se agreguen archivos del proyecto, que
   `.env.local` y credenciales no estén en la lista, y que `.env.example`
   contenga únicamente marcadores. Si aparece algo sensible, quitarlo del
   staging antes de continuar y revisar el archivo fuente; no subirlo.
4. Crear el commit y conectar el repositorio privado (reemplazar el nombre de
   cuenta por el propio):

   ```powershell
   git commit -m "Prepare Sprint 1 for deployment"
   git remote add origin https://github.com/YOUR_GITHUB_ACCOUNT/Urbanizacion-Huajojo.git
   git push -u origin main
   ```

   El workspace actual no tiene commits ni remoto; estos comandos son pasos
   futuros y no se ejecutan durante esta preparación.

## 2. Importar en Vercel

1. En Vercel, elegir **Add New → Project → Import Git Repository**, autorizar
   GitHub y seleccionar el repositorio privado.
2. Configurar el directorio raíz como `./`, framework **Next.js**, comando de
   instalación `npm ci` y comando de build `npm run build`. Dejar el output
   directory predeterminado de Next.js.
3. No agregar comandos de migración, `supabase db push`, importación ni seed al
   build. Las migraciones ya aplicadas en desarrollo se gestionan por separado
   y este despliegue no debe modificar la base.
4. Antes del primer build, agregar solo estas variables de aplicación en los
   entornos **Production** y **Preview**, con el proyecto Supabase apropiado
   para cada entorno:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o la publishable key compatible)

   Next.js incorpora las variables `NEXT_PUBLIC_*` al bundle durante el build;
   configurarlas antes de crear cada despliegue y volver a desplegar después de
   cambiarlas. La clave anon/publishable no es un secreto: la seguridad de los
   datos depende de RLS y de la autorización del servidor.
5. No configurar en Vercel `SUPABASE_DB_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `E2E_OWNER_EMAIL`,
   `E2E_OWNER_PASSWORD` ni las variables temporales de pruebas. El código de
   la aplicación solo usa las dos variables `NEXT_PUBLIC_*`; las credenciales
   de base de datos, administrativas y E2E son locales.
6. Seleccionar `main` como rama de producción y revisar que Preview no apunte
   accidentalmente a la base de producción antes de habilitar despliegues de
   ramas.

## 3. Configurar autenticación en Supabase

En cada proyecto Supabase, abrir **Authentication → URL Configuration**:

1. Establecer **Site URL** en el origen HTTPS de producción, por ejemplo
   `https://YOUR_PRODUCTION_DOMAIN` (sin el sufijo de una URL temporal de
   Preview).
2. En **Redirect URLs**, agregar el origen exacto de producción. Para URLs de
   Preview, usar solo el patrón del equipo/proyecto, por ejemplo
   `https://*-YOUR_VERCEL_TEAM_SLUG.vercel.app/**`; no permitir dominios
   arbitrarios.
3. Si se prueba localmente, agregar `http://localhost:3031/**` solo al proyecto
   de desarrollo. Revisar y quitar URLs temporales o que ya no se utilicen.
4. El login actual es con correo y contraseña y no pasa un `redirectTo`
   explícito. Mantener el Site URL de producción correcto para los enlaces
   predeterminados de Auth (confirmación y recuperación futuras).

Supabase documenta el formato de patrones y Preview URLs en
[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Verificar el despliegue

Después de que Vercel termine el build y asigne el dominio:

1. Confirmar que el deployment esté **Ready**, que el log termine con
   `npm run build` exitoso y que no se ejecutaron migraciones ni seeds.
2. Abrir la URL de producción por HTTPS. Verificar la página pública, el
   catálogo y sus respuestas; no deben aparecer lotes sin habilitación
   confirmada.
3. Probar inicio de sesión con el owner autorizado y confirmar acceso al panel.
   Probar también una cuenta autenticada sin rol: debe ver acceso restringido,
   y las APIs administrativas deben responder `403`.
4. Cerrar sesión y confirmar que las rutas administrativas no entregan datos.
   Revisar en DevTools/red que no haya errores de Auth y en Vercel que no haya
   errores de servidor ni filtración de variables privadas.
5. Confirmar en Vercel → Settings → Environment Variables que solo estén las
   variables de aplicación necesarias; no mostrar ni copiar sus valores a
   logs, documentación o chat.

No ejecutar pruebas que creen/editen datos contra producción. Las E2E con
escrituras y cuentas temporales deben permanecer en el proyecto de desarrollo.
