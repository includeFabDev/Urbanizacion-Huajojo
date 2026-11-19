select jsonb_build_object(
  'urbanizaciones', (select count(*) from public.urbanizaciones),
  'manzanos', (select count(*) from public.manzanos),
  'lotes', (select count(*) from public.lotes),
  'lote_lados', (select count(*) from public.lote_lados),
  'areas_comunes', (select count(*) from public.areas_comunes),
  'clientes', (select count(*) from public.clientes),
  'ventas', (select count(*) from public.ventas),
  'pagos', (select count(*) from public.pagos),
  'cuotas', (select count(*) from public.cuotas),
  'ventas_activas_por_lote_duplicadas', (
    select count(*) from (
      select lote_id from public.ventas
      where estado in ('vigente', 'totalmente_pagada')
      group by lote_id having count(*) > 1
    ) duplicate_active_sales
  ),
  'duplicados_identificacion_cliente', (
    select count(*) from (
      select lower(btrim(identificacion))
      from public.clientes
      where nullif(btrim(identificacion), '') is not null
      group by lower(btrim(identificacion))
      having count(*) > 1
    ) duplicate_client_ids
  ),
  'lotes_importados', (
    select count(*) from public.lotes where legacy_sqlite_id is not null
  ),
  'habilitacion_importada_true', (
    select count(*) from public.lotes
    where legacy_sqlite_id is not null and habilitado_para_venta is true
  ),
  'habilitacion_importada_false', (
    select count(*) from public.lotes
    where legacy_sqlite_id is not null and habilitado_para_venta is false
  ),
  'habilitacion_importada_null', (
    select count(*) from public.lotes
    where legacy_sqlite_id is not null and habilitado_para_venta is null
  ),
  'estado_importado_disponible', (
    select count(*) from public.lotes
    where legacy_sqlite_id is not null
      and public.estado_disponibilidad_lote(id) = 'disponible'
  ),
  'estado_importado_sin_confirmar', (
    select count(*) from public.lotes
    where legacy_sqlite_id is not null
      and public.estado_disponibilidad_lote(id) = 'sin_confirmar'
  ),
  'lotes_publicados', (
    select count(*) from public.lotes where public.is_lote_disponible(id)
  )
) as sprint2_preflight;
