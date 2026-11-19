alter table public.lotes
  add column if not exists version integer not null default 1,
  add column if not exists superficie_verificada_m2 numeric(14,2),
  add column if not exists superficie_verificada_por uuid references auth.users(id),
  add column if not exists superficie_verificada_en timestamptz;

alter table public.lotes
  add constraint lotes_superficie_verificada_positive
  check (superficie_verificada_m2 is null or superficie_verificada_m2 > 0);

create or replace function public.touch_lote_version()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger lotes_touch_version
before update on public.lotes
for each row execute function public.touch_lote_version();

create or replace function public.estado_disponibilidad_lote(p_lote_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when exists (
      select 1 from public.ventas v
      where v.lote_id = l.id
        and v.estado in ('vigente', 'totalmente_pagada')
    ) then 'vendido'
    when l.habilitado_para_venta is null then 'sin_confirmar'
    when l.habilitado_para_venta is false then 'no_habilitado'
    when exists (
      select 1 from public.reservas r
      where r.lote_id = l.id
        and lower(coalesce(r.estado, '')) = 'vigente'
        and (r.vence_en is null or r.vence_en >= current_date)
    ) then 'reservado'
    else 'disponible'
  end
  from public.lotes l
  where l.id = p_lote_id
$$;

revoke all on function public.estado_disponibilidad_lote(uuid) from public, anon, authenticated;

create or replace function public.is_lote_disponible(lote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.estado_disponibilidad_lote(lote_id) = 'disponible'
$$;

revoke all on function public.is_lote_disponible(uuid) from public;
grant execute on function public.is_lote_disponible(uuid) to anon, authenticated;

revoke select on public.lotes from anon, authenticated;
grant select (
  id, manzano_id, numero, categoria, superficie_m2,
  superficie_estimada_pdf_m2, superficie_verificada_m2,
  superficies_procedencia, precio_por_m2, precio_referencia_total,
  moneda_referencia, precio_lista, moneda, habilitado_para_venta
) on public.lotes to anon, authenticated;

revoke select on public.lote_lados from anon, authenticated;
grant select (
  lote_id, orden, cota_plano_m, longitud_m,
  longitud_estimada_pdf_m, longitud_procedencia
) on public.lote_lados to anon, authenticated;

revoke select on public.manzanos from anon, authenticated;
grant select (id, urbanizacion_id, codigo, numero)
  on public.manzanos to anon, authenticated;

revoke select on public.urbanizaciones from anon, authenticated;
grant select (id, nombre, ubicacion)
  on public.urbanizaciones to anon, authenticated;

create or replace function public.admin_list_lotes(
  p_search text default null,
  p_manzano_id uuid default null,
  p_disponibilidad text default null,
  p_categoria text default null,
  p_area_min numeric default null,
  p_area_max numeric default null,
  p_precio_min numeric default null,
  p_precio_max numeric default null,
  p_order_by text default 'manzano',
  p_order_ascending boolean default true,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (item jsonb, total_count bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;

  if p_limit < 1 or p_limit > 100 or p_offset < 0
    or p_order_by not in ('manzano', 'numero', 'area', 'precio') then
    raise exception using errcode = '22023', message = 'invalid query parameters';
  end if;

  return query
  with filtered as (
    select l.*, m.codigo as manzano_codigo, m.numero as manzano_numero,
      u.nombre as urbanizacion_nombre, u.ubicacion as urbanizacion_ubicacion,
      public.estado_disponibilidad_lote(l.id) as disponibilidad,
      coalesce(l.superficie_verificada_m2, l.superficie_m2) as superficie_actual
    from public.lotes l
    join public.manzanos m on m.id = l.manzano_id
    join public.urbanizaciones u on u.id = m.urbanizacion_id
    where
      (p_manzano_id is null or l.manzano_id = p_manzano_id)
      and (
        p_search is null
        or l.numero ilike '%' || p_search || '%'
        or m.codigo ilike '%' || p_search || '%'
        or m.numero ilike '%' || p_search || '%'
      )
      and (p_categoria is null or l.categoria = p_categoria)
      and (p_disponibilidad is null or public.estado_disponibilidad_lote(l.id) = p_disponibilidad)
      and (p_area_min is null or coalesce(l.superficie_verificada_m2, l.superficie_m2) >= p_area_min)
      and (p_area_max is null or coalesce(l.superficie_verificada_m2, l.superficie_m2) <= p_area_max)
      and (p_precio_min is null or coalesce(l.precio_referencia_total, l.precio_lista) >= p_precio_min)
      and (p_precio_max is null or coalesce(l.precio_referencia_total, l.precio_lista) <= p_precio_max)
  ),
  page_rows as (
    select f.*,
      jsonb_build_object(
        'id', f.id,
        'manzano_id', f.manzano_id,
        'manzano_codigo', f.manzano_codigo,
        'manzano_numero', f.manzano_numero,
        'urbanizacion_nombre', f.urbanizacion_nombre,
        'urbanizacion_ubicacion', f.urbanizacion_ubicacion,
        'numero', f.numero,
        'categoria', f.categoria,
        'superficie_m2', f.superficie_m2,
        'superficie_estimada_pdf_m2', f.superficie_estimada_pdf_m2,
        'superficie_verificada_m2', f.superficie_verificada_m2,
        'superficie_actual_m2', f.superficie_actual,
        'superficies_procedencia', f.superficies_procedencia,
        'precio_por_m2', f.precio_por_m2::text,
        'precio_referencia_total', f.precio_referencia_total::text,
        'precio_lista', f.precio_lista::text,
        'moneda_referencia', f.moneda_referencia,
        'moneda', f.moneda,
        'habilitado_para_venta', f.habilitado_para_venta,
        'disponibilidad', f.disponibilidad,
        'observaciones', f.observaciones,
        'version', f.version,
        'updated_at', f.updated_at
      ) as json_item
    from filtered f
    order by
      case when p_order_by = 'manzano' and p_order_ascending then f.manzano_codigo end asc,
      case when p_order_by = 'manzano' and not p_order_ascending then f.manzano_codigo end desc,
      case when p_order_by = 'manzano' and p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else 2147483647 end
      end asc,
      case when p_order_by = 'manzano' and not p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else -1 end
      end desc,
      case when p_order_by = 'numero' and p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else 2147483647 end
      end asc,
      case when p_order_by = 'numero' and not p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else -1 end
      end desc,
      case when p_order_by = 'area' and p_order_ascending then f.superficie_actual end asc nulls last,
      case when p_order_by = 'area' and not p_order_ascending then f.superficie_actual end desc nulls last,
      case when p_order_by = 'precio' and p_order_ascending then coalesce(f.precio_referencia_total, f.precio_lista) end asc nulls last,
      case when p_order_by = 'precio' and not p_order_ascending then coalesce(f.precio_referencia_total, f.precio_lista) end desc nulls last,
      f.manzano_codigo asc, f.id asc
    limit p_limit offset p_offset
  )
  select p.json_item, (select count(*) from filtered)
  from page_rows p;
end;
$$;

create or replace function public.admin_get_lote(p_lote_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;

  select jsonb_build_object(
    'id', l.id,
    'manzano_id', l.manzano_id,
    'manzano_codigo', m.codigo,
    'manzano_numero', m.numero,
    'urbanizacion_id', u.id,
    'urbanizacion_nombre', u.nombre,
    'urbanizacion_ubicacion', u.ubicacion,
    'numero', l.numero,
    'categoria', l.categoria,
    'superficie_m2', l.superficie_m2,
    'superficie_estimada_pdf_m2', l.superficie_estimada_pdf_m2,
    'superficie_verificada_m2', l.superficie_verificada_m2,
    'superficies_procedencia', l.superficies_procedencia,
    'precio_por_m2', l.precio_por_m2::text,
    'precio_referencia_total', l.precio_referencia_total::text,
    'precio_lista', l.precio_lista::text,
    'moneda_referencia', l.moneda_referencia,
    'moneda', l.moneda,
    'habilitado_para_venta', l.habilitado_para_venta,
    'disponibilidad', public.estado_disponibilidad_lote(l.id),
    'observaciones', l.observaciones,
    'version', l.version,
    'updated_at', l.updated_at,
    'lados', coalesce((
      select jsonb_agg(jsonb_build_object(
        'orden', ll.orden,
        'cota_plano_m', ll.cota_plano_m,
        'longitud_m', ll.longitud_m,
        'longitud_estimada_pdf_m', ll.longitud_estimada_pdf_m,
        'longitud_procedencia', ll.longitud_procedencia
      ) order by ll.orden)
      from public.lote_lados ll where ll.lote_id = l.id
    ), '[]'::jsonb)
  ) into result
  from public.lotes l
  join public.manzanos m on m.id = l.manzano_id
  join public.urbanizaciones u on u.id = m.urbanizacion_id
  where l.id = p_lote_id;

  return result;
end;
$$;

create or replace function public.public_list_lotes(
  p_search text default null,
  p_manzano_id uuid default null,
  p_categoria text default null,
  p_area_min numeric default null,
  p_area_max numeric default null,
  p_precio_min numeric default null,
  p_precio_max numeric default null,
  p_order_by text default 'manzano',
  p_order_ascending boolean default true,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (item jsonb, total_count bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_limit < 1 or p_limit > 100 or p_offset < 0
    or p_order_by not in ('manzano', 'numero', 'area', 'precio') then
    raise exception using errcode = '22023', message = 'invalid query parameters';
  end if;

  return query
  with filtered as (
    select l.id, l.manzano_id, l.numero, l.categoria,
      l.superficie_m2, l.superficie_estimada_pdf_m2,
      l.superficie_verificada_m2, l.superficies_procedencia,
      l.precio_por_m2, l.precio_referencia_total, l.precio_lista,
      l.moneda_referencia, l.moneda,
      coalesce(l.superficie_verificada_m2, l.superficie_m2) as area_actual,
      coalesce(l.precio_referencia_total, l.precio_lista) as total_price,
      m.codigo as manzano_codigo, m.numero as manzano_numero,
      u.nombre as urbanizacion_nombre, u.ubicacion as urbanizacion_ubicacion
    from public.lotes l
    join public.manzanos m on m.id = l.manzano_id
    join public.urbanizaciones u on u.id = m.urbanizacion_id
    where public.is_lote_disponible(l.id)
      and (p_manzano_id is null or l.manzano_id = p_manzano_id)
      and (
        p_search is null
        or l.numero ilike '%' || p_search || '%'
        or m.codigo ilike '%' || p_search || '%'
        or m.numero ilike '%' || p_search || '%'
      )
      and (p_categoria is null or l.categoria = p_categoria)
      and (p_area_min is null or coalesce(l.superficie_verificada_m2, l.superficie_m2) >= p_area_min)
      and (p_area_max is null or coalesce(l.superficie_verificada_m2, l.superficie_m2) <= p_area_max)
      and (p_precio_min is null or coalesce(l.precio_referencia_total, l.precio_lista) >= p_precio_min)
      and (p_precio_max is null or coalesce(l.precio_referencia_total, l.precio_lista) <= p_precio_max)
  ),
  page_rows as (
    select f.*,
      jsonb_build_object(
        'id', f.id,
        'manzano_id', f.manzano_id,
        'manzano_codigo', f.manzano_codigo,
        'manzano_numero', f.manzano_numero,
        'urbanizacion_nombre', f.urbanizacion_nombre,
        'urbanizacion_ubicacion', f.urbanizacion_ubicacion,
        'numero', f.numero,
        'categoria', f.categoria,
        'superficie_m2', f.superficie_m2,
        'superficie_estimada_pdf_m2', f.superficie_estimada_pdf_m2,
        'superficie_verificada_m2', f.superficie_verificada_m2,
        'superficie_actual_m2', f.area_actual,
        'superficies_procedencia', f.superficies_procedencia,
        'precio_por_m2', f.precio_por_m2::text,
        'precio_referencia_total', f.precio_referencia_total::text,
        'precio_lista', f.precio_lista::text,
        'moneda_referencia', f.moneda_referencia,
        'moneda', f.moneda,
        'disponibilidad', 'disponible'
      ) as json_item
    from filtered f
    order by
      case when p_order_by = 'manzano' and p_order_ascending then f.manzano_codigo end asc,
      case when p_order_by = 'manzano' and not p_order_ascending then f.manzano_codigo end desc,
      case when p_order_by = 'manzano' and p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else 2147483647 end
      end asc,
      case when p_order_by = 'manzano' and not p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else -1 end
      end desc,
      case when p_order_by = 'numero' and p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else 2147483647 end
      end asc,
      case when p_order_by = 'numero' and not p_order_ascending then
        case when f.numero ~ '^[0-9]{1,9}$' then f.numero::integer else -1 end
      end desc,
      case when p_order_by = 'area' and p_order_ascending then f.area_actual end asc nulls last,
      case when p_order_by = 'area' and not p_order_ascending then f.area_actual end desc nulls last,
      case when p_order_by = 'precio' and p_order_ascending then f.total_price end asc nulls last,
      case when p_order_by = 'precio' and not p_order_ascending then f.total_price end desc nulls last,
      f.manzano_codigo asc, f.id asc
    limit p_limit offset p_offset
  )
  select p.json_item, (select count(*) from filtered)
  from page_rows p;
end;
$$;

create or replace function public.create_lote(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
  side jsonb;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;

  if p_input ? 'superficie_m2' and p_input->>'superficie_m2' is not null
    and (p_input->>'superficie_m2')::numeric <= 0 then
    raise exception using errcode = '22023', message = 'surface must be positive';
  end if;

  insert into public.lotes (
    manzano_id, numero, categoria, superficie_m2, superficies_procedencia,
    precio_por_m2, precio_referencia_total, moneda_referencia,
    habilitado_para_venta, observaciones
  ) values (
    (p_input->>'manzano_id')::uuid,
    p_input->>'numero',
    p_input->>'categoria',
    (p_input->>'superficie_m2')::numeric,
    case when p_input->>'superficie_m2' is null then null
      else 'Informada por propietario; pendiente de verificacion' end,
    (p_input->>'precio_por_m2')::numeric,
    (p_input->>'precio_referencia_total')::numeric,
    p_input->>'moneda_referencia',
    (p_input->>'habilitado_para_venta')::boolean,
    p_input->>'observaciones'
  ) returning id into new_id;

  if p_input ? 'lados' and jsonb_typeof(p_input->'lados') = 'array' then
    for side in select value from jsonb_array_elements(p_input->'lados')
    loop
      insert into public.lote_lados (
        lote_id, orden, longitud_m, longitud_procedencia
      ) values (
        new_id,
        (side->>'orden')::integer,
        (side->>'longitud_m')::numeric,
        'Informada por propietario; pendiente de verificacion'
      );
    end loop;
  end if;

  return new_id;
end;
$$;

create or replace function public.update_lote(
  p_lote_id uuid,
  p_expected_version integer,
  p_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_id uuid;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;

  if p_input ? 'superficie_verificada_m2'
    and p_input->>'superficie_verificada_m2' is not null
    and (p_input->>'superficie_verificada_m2')::numeric <= 0 then
    raise exception using errcode = '22023', message = 'verified surface must be positive';
  end if;

  update public.lotes l set
    manzano_id = case when p_input ? 'manzano_id' then (p_input->>'manzano_id')::uuid else l.manzano_id end,
    numero = case when p_input ? 'numero' then p_input->>'numero' else l.numero end,
    categoria = case when p_input ? 'categoria' then p_input->>'categoria' else l.categoria end,
    superficie_verificada_m2 = case
      when p_input ? 'superficie_verificada_m2' then (p_input->>'superficie_verificada_m2')::numeric
      else l.superficie_verificada_m2 end,
    superficie_verificada_por = case
      when p_input ? 'superficie_verificada_m2' then
        case when p_input->>'superficie_verificada_m2' is null then null else auth.uid() end
      else l.superficie_verificada_por end,
    superficie_verificada_en = case
      when p_input ? 'superficie_verificada_m2' then
        case when p_input->>'superficie_verificada_m2' is null then null else now() end
      else l.superficie_verificada_en end,
    precio_por_m2 = case when p_input ? 'precio_por_m2' then (p_input->>'precio_por_m2')::numeric else l.precio_por_m2 end,
    precio_referencia_total = case when p_input ? 'precio_referencia_total' then (p_input->>'precio_referencia_total')::numeric else l.precio_referencia_total end,
    moneda_referencia = case when p_input ? 'moneda_referencia' then p_input->>'moneda_referencia' else l.moneda_referencia end,
    habilitado_para_venta = case when p_input ? 'habilitado_para_venta' then (p_input->>'habilitado_para_venta')::boolean else l.habilitado_para_venta end,
    observaciones = case when p_input ? 'observaciones' then p_input->>'observaciones' else l.observaciones end
  where l.id = p_lote_id and l.version = p_expected_version
  returning l.id into updated_id;

  if updated_id is null then
    if not exists (select 1 from public.lotes where id = p_lote_id) then
      raise exception using errcode = 'P0002', message = 'lot not found';
    end if;
    raise exception using errcode = '40001', message = 'lot was changed by another user';
  end if;

  return updated_id;
end;
$$;

revoke all on function public.admin_list_lotes(text, uuid, text, text, numeric, numeric, numeric, numeric, text, boolean, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_get_lote(uuid) from public, anon, authenticated;
revoke all on function public.public_list_lotes(text, uuid, text, numeric, numeric, numeric, numeric, text, boolean, integer, integer) from public, anon, authenticated;
revoke all on function public.create_lote(jsonb) from public, anon, authenticated;
revoke all on function public.update_lote(uuid, integer, jsonb) from public, anon, authenticated;

grant execute on function public.admin_list_lotes(text, uuid, text, text, numeric, numeric, numeric, numeric, text, boolean, integer, integer) to authenticated;
grant execute on function public.admin_get_lote(uuid) to authenticated;
grant execute on function public.public_list_lotes(text, uuid, text, numeric, numeric, numeric, numeric, text, boolean, integer, integer) to anon, authenticated;
grant execute on function public.create_lote(jsonb) to authenticated;
grant execute on function public.update_lote(uuid, integer, jsonb) to authenticated;
