select jsonb_build_object(
  'urbanizaciones', (select count(*) from public.urbanizaciones),
  'manzanos', (select count(*) from public.manzanos),
  'lotes', (select count(*) from public.lotes),
  'lote_lados', (select count(*) from public.lote_lados),
  'areas_comunes', (select count(*) from public.areas_comunes),
  'cotizaciones', (select count(*) from public.cotizaciones),
  'reservas', (select count(*) from public.reservas),
  'ventas', (select count(*) from public.ventas),
  'pagos', (select count(*) from public.pagos),
  'matching_legacy_ids', (
    (select count(*) from public.urbanizaciones where legacy_sqlite_id = 1) +
    (select count(*) from public.manzanos where legacy_sqlite_id between 1 and 4) +
    (select count(*) from public.lotes where legacy_sqlite_id between 1 and 61) +
    (select count(*) from public.lote_lados where legacy_sqlite_id between 1 and 244) +
    (select count(*) from public.areas_comunes where legacy_sqlite_id between 1 and 6)
  )
) as preflight;
