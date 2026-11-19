# Pruebas

## Resultados Sprint 1

- `npm test`: aprobado, 6 pruebas.
- `npm run lint`: aprobado.
- `npm run build`: aprobado.
- E2E owner: aprobada; login/logout, panel, consulta de 61 lotes,
  alta/edición QA, duplicado por manzano y publicación/exclusión.
- E2E sin rol: aprobada; panel denegado, APIs `403`, datos privados no
  consultados ni modificados.
- Los registros creados por las pruebas fueron limpiados.

## Resultados Sprint 2 verificados localmente

- `npm test`: 10 pruebas aprobadas en 3 archivos.
- `npm run lint`: aprobado.
- `npm run build`: aprobado.
- E2E owner Sprint 2: aprobada en una repetición real. Verificó venta válida,
  rechazo de lote no disponible, concurrencia de ventas, saldo inicial,
  pagos parciales y total, sobrepago, reintento idempotente, bloqueo del lote
  totalmente pagado y descarga PDF.
- E2E sin rol: aprobada con rutas Sprint 1 y Sprint 2. Las rutas administrativas
  del negocio respondieron `403`; el panel quedó restringido. La cuenta temporal
  fue eliminada.
- La ejecución posterior al cleanup confirmó 61 lotes, 0 clientes, 0 ventas,
  0 pagos y 0 cuotas, sin duplicados ni relaciones huérfanas.

## Migración remota y datos

- 001–005 aparecen aplicadas en el historial remoto tras la ejecución real de 005.
- 005 no incluyó seed ni reimportación.
- Se conservan 1 urbanización, 4 manzanos, 61 lotes importados, 244 lados y
  6 áreas comunes.
- La discrepancia de habilitación sigue pendiente: la base remota informa
  61 valores `true` y publicados, mientras el SQL de importación versionado
  registra `NULL`. Ninguna fila fue corregida ni sobrescrita durante Sprint 2.

## Pendientes

- Acordar la procedencia y corrección de los 61 estados remotos de habilitación.
- Revisar manualmente el PDF generado y su contenido identificado.
- La suite E2E sigue separada de los datos importados y limpia solo registros
  etiquetados por su marcador.

## Rediseño responsive de formularios

- E2E Sprint 2 con `E2E_CAPTURE_DESIGN=1`: aprobada; generó capturas de login,
  catálogo público, filtros administrativos, alta y edición de lotes, búsqueda
  de ventas, alta de venta y registro de pagos a 1280 px y 360 px.
- Cada captura esperó a que terminaran los estados de carga y comprobó que el
  ancho del documento no excediera el viewport. Las capturas son locales en
  `test-results/ui-*.png` y están ignoradas por Git.
- Revisión visual directa de login, catálogo, formularios de lotes, venta y
  pago en móvil/escritorio; sin desbordamientos observados. No se alteró el
  formato del PDF.
- La E2E verificó también el orden de foco por teclado del enlace de marca y el
  campo de correo en login. Las etiquetas de los campos fueron consultadas por
  sus nombres accesibles durante las E2E funcionales.
- Tras el rediseño: `npm test` (10 pruebas), `npm run lint`, `npm run build` y
  E2E propietario Sprint 1 aprobados. E2E sin rol quedó omitida en esta última
  pasada porque no estaban configuradas las variables temporales
  `E2E_NONOWNER_EMAIL` y `E2E_NONOWNER_PASSWORD`; no se declara como aprobada
  aquí.
- No se modificaron lotes importados ni se ejecutaron migraciones, importación
  o seed. Los registros QA creados por las E2E se limpiaron mediante sus
  pruebas.
