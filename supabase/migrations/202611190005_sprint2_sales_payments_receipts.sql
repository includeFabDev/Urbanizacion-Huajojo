begin;

alter table public.pagos
  add column if not exists recibo_datos jsonb;

create unique index if not exists clientes_identificacion_uidx
  on public.clientes (lower(btrim(identificacion)))
  where nullif(btrim(identificacion), '') is not null;

create sequence if not exists public.recibo_numero_seq;
revoke all on sequence public.recibo_numero_seq from public, anon, authenticated;

create or replace function public.list_sale_clients(
  p_search text default null,
  p_limit integer default 25
)
returns table (item jsonb)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid limit';
  end if;

  return query
  select jsonb_build_object(
    'id', c.id,
    'nombre', c.nombre,
    'identificacion', c.identificacion,
    'telefono', c.telefono,
    'email', c.email
  )
  from public.clientes c
  where p_search is null
    or c.nombre ilike '%' || p_search || '%'
    or coalesce(c.identificacion, '') ilike '%' || p_search || '%'
    or coalesce(c.telefono, '') ilike '%' || p_search || '%'
    or coalesce(c.email, '') ilike '%' || p_search || '%'
  order by c.nombre, c.id
  limit p_limit;
end;
$$;

create or replace function public.create_sale_client(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_client_id uuid;
  v_name text;
  v_identification text;
  v_email text;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid client data';
  end if;
  v_name := nullif(btrim(p_input->>'nombre'), '');
  v_identification := nullif(btrim(p_input->>'identificacion'), '');
  v_email := nullif(btrim(p_input->>'email'), '');
  if v_name is null or length(v_name) > 160
    or length(coalesce(v_identification, '')) > 80
    or length(coalesce(p_input->>'telefono', '')) > 40
    or length(coalesce(v_email, '')) > 254
    or (v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or length(coalesce(p_input->>'direccion', '')) > 240 then
    raise exception using errcode = '22023', message = 'invalid client data';
  end if;

  insert into public.clientes (nombre, identificacion, telefono, email, direccion)
  values (
    v_name,
    v_identification,
    nullif(btrim(p_input->>'telefono'), ''),
    nullif(btrim(p_input->>'email'), ''),
    nullif(btrim(p_input->>'direccion'), '')
  )
  returning id into v_client_id;
  return v_client_id;
end;
$$;

create or replace function public.register_sale(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lot_id uuid;
  v_client_id uuid;
  v_sale_id uuid;
  v_lot public.lotes%rowtype;
  v_name text;
  v_identification text;
  v_price numeric;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or nullif(p_input->>'lote_id', '') is null
    or (p_input->>'lote_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or nullif(p_input->>'precio_final', '') is null
    or (p_input->>'precio_final') !~ '^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$'
    or nullif(p_input->>'fecha_venta', '') is null
    or (p_input->>'fecha_venta') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception using errcode = '22023', message = 'invalid sale data';
  end if;
  v_lot_id := (p_input->>'lote_id')::uuid;
  v_price := (p_input->>'precio_final')::numeric;
  if (p_input ? 'cliente_id') = (p_input ? 'cliente') then
    raise exception using errcode = '22023', message = 'exactly one customer is required';
  end if;
  if p_input->>'tipo' is null
    or (p_input->>'tipo') not in ('contado', 'cuotas')
    or nullif(btrim(p_input->>'forma_pago'), '') is null
    or length(p_input->>'forma_pago') > 120
    or v_price <= 0
    or p_input->>'moneda' is null
    or (p_input->>'moneda') !~ '^[A-Z]{3}$'
    or nullif(p_input->>'fecha_venta', '') is null then
    raise exception using errcode = '22023', message = 'invalid sale data';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_lot_id::text, 0));
  select * into v_lot
  from public.lotes
  where id = v_lot_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'lot not found';
  end if;
  if v_lot.habilitado_para_venta is not true
    or exists (
      select 1 from public.ventas v
      where v.lote_id = v_lot_id
        and v.estado in ('vigente', 'totalmente_pagada')
    )
    or exists (
      select 1 from public.reservas r
      where r.lote_id = v_lot_id
        and lower(coalesce(r.estado, '')) = 'vigente'
        and (r.vence_en is null or r.vence_en >= current_date)
    ) then
    raise exception using errcode = 'P0001', message = 'LOT_NOT_AVAILABLE';
  end if;

  if p_input ? 'cliente_id' then
    v_client_id := (p_input->>'cliente_id')::uuid;
    perform 1 from public.clientes where id = v_client_id for key share;
    if not found then
      raise exception using errcode = 'P0002', message = 'client not found';
    end if;
  else
    v_name := nullif(btrim(p_input#>>'{cliente,nombre}'), '');
    v_identification := nullif(btrim(p_input#>>'{cliente,identificacion}'), '');
    if v_name is null or length(v_name) > 160
      or length(coalesce(v_identification, '')) > 80
      or length(coalesce(p_input#>>'{cliente,telefono}', '')) > 40
      or length(coalesce(p_input#>>'{cliente,email}', '')) > 254 then
      raise exception using errcode = '22023', message = 'invalid client data';
    end if;

    insert into public.clientes (nombre, identificacion, telefono, email, direccion)
    values (
      v_name,
      v_identification,
      nullif(btrim(p_input#>>'{cliente,telefono}'), ''),
      nullif(btrim(p_input#>>'{cliente,email}'), ''),
      nullif(btrim(p_input#>>'{cliente,direccion}'), '')
    )
    returning id into v_client_id;
  end if;

  insert into public.ventas (
    lote_id, cliente_id, tipo, precio_final, moneda, estado, fecha_venta, forma_pago
  ) values (
    v_lot_id,
    v_client_id,
    p_input->>'tipo',
    v_price,
    p_input->>'moneda',
    'vigente',
    ((p_input->>'fecha_venta')::date::timestamp at time zone 'UTC'),
    btrim(p_input->>'forma_pago')
  )
  returning id into v_sale_id;
  return v_sale_id;
end;
$$;

create or replace function public.admin_sale_detail(p_sale_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sale public.ventas%rowtype;
  v_paid numeric(14,2);
  v_balance numeric(14,2);
  v_detail jsonb;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;

  select * into v_sale from public.ventas where id = p_sale_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'sale not found';
  end if;
  if exists (
    select 1 from public.pagos p
    where p.venta_id = v_sale.id
      and p.estado = 'valido'
      and (p.moneda is distinct from v_sale.moneda or p.monto is null)
  ) then
    raise exception using errcode = 'P0001', message = 'SALE_PAYMENT_DATA_INCONSISTENT';
  end if;

  select coalesce(sum(p.monto), 0)::numeric(14,2)
    into v_paid
  from public.pagos p
  where p.venta_id = v_sale.id and p.estado = 'valido';
  if v_paid > v_sale.precio_final then
    raise exception using errcode = 'P0001', message = 'SALE_BALANCE_INCONSISTENT';
  end if;
  v_balance := v_sale.precio_final - v_paid;

  select jsonb_build_object(
    'id', v_sale.id,
    'tipo', v_sale.tipo,
    'precio_final', v_sale.precio_final::text,
    'moneda', v_sale.moneda,
    'estado', v_sale.estado::text,
    'fecha_venta', v_sale.fecha_venta,
    'forma_pago', v_sale.forma_pago,
    'total_pagado', v_paid::text,
    'saldo_pendiente', v_balance::text,
    'cliente', jsonb_build_object(
      'id', c.id,
      'nombre', c.nombre,
      'identificacion', c.identificacion,
      'telefono', c.telefono,
      'email', c.email
    ),
    'lote', jsonb_build_object(
      'id', l.id,
      'numero', l.numero,
      'manzano', jsonb_build_object('id', m.id, 'codigo', m.codigo, 'numero', m.numero),
      'urbanizacion', u.nombre
    ),
    'pagos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'monto', p.monto::text,
        'moneda', p.moneda,
        'medio_pago', p.medio_pago,
        'fecha_pago', p.fecha_pago,
        'estado', p.estado::text,
        'numero_recibo', p.numero_recibo,
        'recibido_por', p.recibido_por,
        'recibido_por_email', au.email
      ) order by p.fecha_pago, p.id)
      from public.pagos p
      left join auth.users au on au.id = p.recibido_por
      where p.venta_id = v_sale.id
    ), '[]'::jsonb)
  )
  into v_detail
  from public.clientes c
  join public.lotes l on l.id = v_sale.lote_id
  join public.manzanos m on m.id = l.manzano_id
  join public.urbanizaciones u on u.id = m.urbanizacion_id
  where c.id = v_sale.cliente_id;

  return v_detail;
end;
$$;

create or replace function public.admin_list_sales(
  p_search text default null,
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
  if p_limit is null or p_limit < 1 or p_limit > 100
    or p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'invalid pagination';
  end if;

  return query
  with filtered as (
    select v.id, v.fecha_venta, c.nombre, l.numero, m.codigo
    from public.ventas v
    join public.clientes c on c.id = v.cliente_id
    join public.lotes l on l.id = v.lote_id
    join public.manzanos m on m.id = l.manzano_id
    where p_search is null
      or v.id::text ilike '%' || p_search || '%'
      or c.nombre ilike '%' || p_search || '%'
      or coalesce(c.identificacion, '') ilike '%' || p_search || '%'
      or l.numero ilike '%' || p_search || '%'
      or coalesce(m.codigo, '') ilike '%' || p_search || '%'
  ),
  page as (
    select f.id, f.fecha_venta
    from filtered f
    order by f.fecha_venta desc, f.id
    limit p_limit offset p_offset
  ),
  page_with_empty as (
    select p.id from page p
    union all
    select null::uuid where not exists (select 1 from page)
  )
  select case when p.id is null then null else public.admin_sale_detail(p.id) end,
    (select count(*) from filtered)
  from page_with_empty p;
end;
$$;

create or replace function public.register_sale_payment(
  p_sale_id uuid,
  p_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sale public.ventas%rowtype;
  v_existing public.pagos%rowtype;
  v_payment_id uuid;
  v_idempotency_key text := p_input->>'idempotency_key';
  v_amount numeric;
  v_paid numeric(14,2);
  v_balance numeric(14,2);
  v_payment_date timestamptz;
  v_receipt_number text;
  v_receipt_data jsonb;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or v_idempotency_key is null
    or v_idempotency_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or length(v_idempotency_key) > 100
    or nullif(p_input->>'monto', '') is null
    or (p_input->>'monto') !~ '^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$'
    or nullif(btrim(p_input->>'medio_pago'), '') is null
    or length(p_input->>'medio_pago') > 80
    or p_input->>'moneda' is null
    or (p_input->>'moneda') !~ '^[A-Z]{3}$'
    or nullif(p_input->>'fecha_pago', '') is null
    or (p_input->>'fecha_pago') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception using errcode = '22023', message = 'invalid payment data';
  end if;
  v_amount := (p_input->>'monto')::numeric;
  if v_amount <= 0 then
    raise exception using errcode = '22023', message = 'invalid payment data';
  end if;
  v_payment_date := ((p_input->>'fecha_pago')::date::timestamp at time zone 'UTC');

  perform pg_advisory_xact_lock(hashtextextended(v_idempotency_key, 1));
  select * into v_existing
  from public.pagos
  where idempotency_key = v_idempotency_key;
  if found then
    if v_existing.venta_id = p_sale_id
      and v_existing.monto = v_amount
      and v_existing.moneda = p_input->>'moneda'
      and v_existing.medio_pago = btrim(p_input->>'medio_pago')
      and v_existing.fecha_pago = v_payment_date then
      return v_existing.id;
    end if;
    raise exception using errcode = '23505', message = 'IDEMPOTENCY_KEY_REUSED';
  end if;

  select * into v_sale
  from public.ventas
  where id = p_sale_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'sale not found';
  end if;
  if v_sale.estado = 'cancelada' then
    raise exception using errcode = 'P0001', message = 'SALE_NOT_PAYABLE';
  end if;
  if p_input->>'moneda' is distinct from v_sale.moneda then
    raise exception using errcode = 'P0001', message = 'PAYMENT_CURRENCY_MISMATCH';
  end if;
  if exists (
    select 1 from public.pagos p
    where p.venta_id = v_sale.id
      and p.estado = 'valido'
      and (p.moneda is distinct from v_sale.moneda or p.monto is null)
  ) then
    raise exception using errcode = 'P0001', message = 'SALE_PAYMENT_DATA_INCONSISTENT';
  end if;

  select coalesce(sum(p.monto), 0)::numeric(14,2)
    into v_paid
  from public.pagos p
  where p.venta_id = v_sale.id and p.estado = 'valido';
  v_balance := v_sale.precio_final - v_paid;
  if v_balance <= 0 or v_amount > v_balance then
    raise exception using errcode = 'P0001', message = 'PAYMENT_EXCEEDS_BALANCE';
  end if;

  v_receipt_number := 'REC-' ||
    to_char(v_payment_date at time zone 'UTC', 'YYYYMMDD') || '-' ||
    lpad(nextval('public.recibo_numero_seq')::text, 8, '0');
  select jsonb_build_object(
    'numero', v_receipt_number,
    'fecha', v_payment_date,
    'concepto', 'Pago de venta de lote ' || l.numero,
    'monto', v_amount::text,
    'moneda', v_sale.moneda,
    'medio_pago', btrim(p_input->>'medio_pago'),
    'estado', 'valido',
    'cliente', c.nombre,
    'lote', l.numero,
    'manzano', coalesce(m.codigo, m.numero),
    'urbanizacion', u.nombre,
    'receptor', coalesce(au.email, auth.uid()::text, 'No disponible'),
    'copia_firmada', false
  )
  into v_receipt_data
  from public.clientes c
  join public.lotes l on l.id = v_sale.lote_id
  join public.manzanos m on m.id = l.manzano_id
  join public.urbanizaciones u on u.id = m.urbanizacion_id
  left join auth.users au on au.id = auth.uid()
  where c.id = v_sale.cliente_id;

  if v_receipt_data is null then
    raise exception using errcode = 'P0002', message = 'sale details not found';
  end if;

  insert into public.pagos (
    venta_id, monto, moneda, medio_pago, recibido_por,
    estado, fecha_pago, numero_recibo, idempotency_key, recibo_datos
  ) values (
    p_sale_id, v_amount, p_input->>'moneda', btrim(p_input->>'medio_pago'),
    auth.uid(), 'valido', v_payment_date, v_receipt_number, v_idempotency_key,
    v_receipt_data
  )
  returning id into v_payment_id;

  if v_paid + v_amount = v_sale.precio_final then
    update public.ventas
    set estado = 'totalmente_pagada'
    where id = p_sale_id;
  end if;
  return v_payment_id;
end;
$$;

create or replace function public.admin_payment_receipt(p_payment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_receipt jsonb;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'owner role required';
  end if;

  select case
    when p.recibo_datos is not null then
      jsonb_set(p.recibo_datos, '{id}', to_jsonb(p.id), true)
    else
      jsonb_build_object(
        'id', p.id,
        'numero', p.numero_recibo,
        'fecha', p.fecha_pago,
        'concepto', 'Pago de venta de lote ' || l.numero,
        'monto', p.monto::text,
        'moneda', p.moneda,
        'medio_pago', p.medio_pago,
        'estado', p.estado::text,
        'cliente', c.nombre,
        'lote', l.numero,
        'manzano', coalesce(m.codigo, m.numero),
        'urbanizacion', u.nombre,
        'receptor', coalesce(au.email, p.recibido_por::text, 'No disponible'),
        'copia_firmada', false
      )
  end
  into v_receipt
  from public.pagos p
  join public.ventas v on v.id = p.venta_id
  join public.clientes c on c.id = v.cliente_id
  join public.lotes l on l.id = v.lote_id
  join public.manzanos m on m.id = l.manzano_id
  join public.urbanizaciones u on u.id = m.urbanizacion_id
  left join auth.users au on au.id = p.recibido_por
  where p.id = p_payment_id;

  if v_receipt is null then
    raise exception using errcode = 'P0002', message = 'receipt not found';
  end if;
  return v_receipt;
end;
$$;

revoke all on table public.clientes, public.ventas, public.cuotas,
  public.pagos, public.pago_cuotas, public.documentos_venta
  from public, anon, authenticated;

revoke all on function public.list_sale_clients(text, integer) from public, anon, authenticated;
revoke all on function public.create_sale_client(jsonb) from public, anon, authenticated;
revoke all on function public.register_sale(jsonb) from public, anon, authenticated;
revoke all on function public.admin_sale_detail(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_sales(text, integer, integer) from public, anon, authenticated;
revoke all on function public.register_sale_payment(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.admin_payment_receipt(uuid) from public, anon, authenticated;

grant execute on function public.list_sale_clients(text, integer) to authenticated;
grant execute on function public.create_sale_client(jsonb) to authenticated;
grant execute on function public.register_sale(jsonb) to authenticated;
grant execute on function public.admin_sale_detail(uuid) to authenticated;
grant execute on function public.admin_list_sales(text, integer, integer) to authenticated;
grant execute on function public.register_sale_payment(uuid, jsonb) to authenticated;
grant execute on function public.admin_payment_receipt(uuid) to authenticated;

commit;
