select jsonb_build_object(
  'urbanizaciones', (select count(*) from public.urbanizaciones),
  'manzanos', (select count(*) from public.manzanos),
  'lotes', (select count(*) from public.lotes),
  'lote_lados', (select count(*) from public.lote_lados),
  'areas_comunes', (select count(*) from public.areas_comunes),
  'imported_urbanizaciones', (select count(*) from public.urbanizaciones where legacy_sqlite_id is not null),
  'imported_manzanos', (select count(*) from public.manzanos where legacy_sqlite_id is not null),
  'imported_lotes', (select count(*) from public.lotes where legacy_sqlite_id is not null),
  'imported_lados', (select count(*) from public.lote_lados where legacy_sqlite_id is not null),
  'imported_areas', (select count(*) from public.areas_comunes where legacy_sqlite_id is not null),
  'unknown_commercial_enablement', (select count(*) from public.lotes where legacy_sqlite_id is not null and habilitado_para_venta is null),
  'unexpectedly_available', (select count(*) from public.lotes l where l.legacy_sqlite_id is not null and public.is_lote_disponible(l.id)),
  'orphan_lotes', (select count(*) from public.lotes l left join public.manzanos m on m.id = l.manzano_id where l.legacy_sqlite_id is not null and m.id is null),
  'orphan_lados', (select count(*) from public.lote_lados ll left join public.lotes l on l.id = ll.lote_id where ll.legacy_sqlite_id is not null and l.id is null),
  'duplicate_lotes', (select count(*) from (select manzano_id, numero from public.lotes group by manzano_id, numero having count(*) > 1) d),
  'duplicate_lados', (select count(*) from (select lote_id, orden from public.lote_lados group by lote_id, orden having count(*) > 1) d),
  'cuadro_sequence', (select jsonb_build_object(
    'last_value', s.last_value,
    'is_called', s.is_called,
    'max_id', (select max(id) from public.cuadro_plano)
  ) from public.cuadro_plano_id_seq s),
  'guia_sequence', (select jsonb_build_object(
    'last_value', s.last_value,
    'is_called', s.is_called,
    'max_id', (select max(id) from public.guia)
  ) from public.guia_id_seq s)
) as verification;
