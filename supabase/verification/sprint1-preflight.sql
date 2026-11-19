select jsonb_build_object(
  'urbanizaciones', (select count(*) from public.urbanizaciones),
  'manzanos', (select count(*) from public.manzanos),
  'lotes', (select count(*) from public.lotes),
  'lote_lados', (select count(*) from public.lote_lados),
  'areas_comunes', (select count(*) from public.areas_comunes),
  'owner_roles', (select count(*) from public.user_roles where role = 'owner'),
  'enabled_public', (select count(*) from public.lotes where habilitado_para_venta is true and public.is_lote_disponible(id)),
  'unknown_enablement', (select count(*) from public.lotes where habilitado_para_venta is null),
  'reservation_rows', (select count(*) from public.reservas),
  'policies', (
    select jsonb_agg(jsonb_build_object('table', tablename, 'name', policyname, 'command', cmd))
    from pg_policies
    where schemaname = 'public'
      and tablename in ('lotes', 'lote_lados', 'manzanos', 'urbanizaciones', 'user_roles')
  )
) as sprint1_preflight;
