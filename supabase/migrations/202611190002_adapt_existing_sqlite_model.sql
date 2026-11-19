-- Migration corrective/adaptive. It is additive and preserves 202611190001.

alter table public.urbanizaciones
  add column if not exists legacy_sqlite_id bigint,
  add column if not exists fecha_plano text,
  add column if not exists src_epsg integer,
  add column if not exists lamina text;

create unique index if not exists urbanizaciones_legacy_sqlite_id_uidx
  on public.urbanizaciones(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

alter table public.manzanos
  add column if not exists legacy_sqlite_id bigint,
  add column if not exists codigo text;

create unique index if not exists manzanos_legacy_sqlite_id_uidx
  on public.manzanos(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

alter table public.lotes
  add column if not exists legacy_sqlite_id bigint,
  add column if not exists superficie_estimada_pdf_m2 numeric(14,2),
  add column if not exists superficie_m2 numeric(14,2),
  add column if not exists lado_1_m numeric(14,2),
  add column if not exists lado_2_m numeric(14,2),
  add column if not exists lado_3_m numeric(14,2),
  add column if not exists lado_4_m numeric(14,2),
  add column if not exists precio_lista numeric(14,2),
  add column if not exists moneda text,
  add column if not exists habilitado_para_venta boolean,
  add column if not exists matricula_ddrr text,
  add column if not exists codigo_catastral text,
  add column if not exists observaciones text,
  add column if not exists superficies_procedencia text,
  add column if not exists datos_origen text;

create unique index if not exists lotes_legacy_sqlite_id_uidx
  on public.lotes(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

alter table public.lotes
  alter column superficie_m2 drop not null,
  alter column precio_por_m2 drop not null,
  alter column precio_referencia_total drop not null;

alter table public.lote_lados
  add column if not exists legacy_sqlite_id bigint,
  add column if not exists orden integer,
  add column if not exists cota_plano_m numeric(14,2),
  add column if not exists longitud_estimada_pdf_m numeric(14,2),
  add column if not exists referencia text,
  add column if not exists longitud_procedencia text;

alter table public.lote_lados
  alter column direccion drop not null,
  alter column longitud_m drop not null;

create unique index if not exists lote_lados_legacy_sqlite_id_uidx
  on public.lote_lados(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

create unique index if not exists lote_lados_orden_uidx
  on public.lote_lados(lote_id, orden)
  where orden is not null;

create table if not exists public.areas_comunes (
  id uuid primary key default gen_random_uuid(),
  urbanizacion_id uuid not null references public.urbanizaciones(id),
  legacy_sqlite_id bigint,
  codigo text,
  tipo text not null,
  superficie_estimada_pdf_m2 numeric(14,2),
  superficie_procedencia text not null default 'estimada desde el contorno del PDF',
  created_at timestamptz not null default timezone('utc', now()),
  unique (urbanizacion_id, codigo)
);

create unique index if not exists areas_comunes_legacy_sqlite_id_uidx
  on public.areas_comunes(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

alter table public.areas_comunes enable row level security;

create table if not exists public.cuadro_plano (
  id bigint generated always as identity primary key,
  concepto text unique,
  superficie_m2 numeric(14,2),
  nota text
);

create table if not exists public.guia (
  id bigint generated always as identity primary key,
  tema text not null unique,
  indicacion text not null
);

alter table public.clientes
  add column if not exists legacy_sqlite_id bigint,
  add column if not exists nombre_completo text,
  add column if not exists tipo_documento text,
  add column if not exists numero_documento text;

create unique index if not exists clientes_legacy_sqlite_id_uidx
  on public.clientes(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

alter table public.ventas
  add column if not exists legacy_sqlite_id bigint,
  add column if not exists reserva_id uuid,
  add column if not exists cotizacion_id uuid,
  add column if not exists forma_pago text;

create unique index if not exists ventas_legacy_sqlite_id_uidx
  on public.ventas(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  legacy_sqlite_id bigint,
  lote_id uuid not null references public.lotes(id),
  cliente_id uuid not null references public.clientes(id),
  fecha_emision date,
  valida_hasta date,
  precio_total numeric(14,2),
  moneda text,
  forma_pago text,
  condiciones_pago text,
  estado text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists cotizaciones_legacy_sqlite_id_uidx
  on public.cotizaciones(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  legacy_sqlite_id bigint,
  lote_id uuid not null references public.lotes(id),
  cliente_id uuid not null references public.clientes(id),
  cotizacion_id uuid references public.cotizaciones(id),
  fecha_reserva date,
  vence_en date,
  monto_acordado numeric(14,2),
  moneda text,
  condiciones text,
  estado text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists reservas_legacy_sqlite_id_uidx
  on public.reservas(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

alter table public.ventas
  add constraint ventas_reserva_fk
  foreign key (reserva_id) references public.reservas(id),
  add constraint ventas_cotizacion_fk
  foreign key (cotizacion_id) references public.cotizaciones(id);

alter table public.pagos
  add column if not exists legacy_sqlite_id bigint,
  add column if not exists reserva_id uuid references public.reservas(id),
  add column if not exists numero_comprobante text,
  add column if not exists estado_original text;

alter table public.pagos
  alter column venta_id drop not null,
  alter column monto drop not null,
  alter column moneda drop not null,
  alter column medio_pago drop not null;

create unique index if not exists pagos_legacy_sqlite_id_uidx
  on public.pagos(legacy_sqlite_id)
  where legacy_sqlite_id is not null;

alter table public.ventas enable row level security;
alter table public.clientes enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.reservas enable row level security;
alter table public.cuadro_plano enable row level security;
alter table public.guia enable row level security;

create policy areas_comunes_owner_manage
  on public.areas_comunes for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy areas_comunes_public_read
  on public.areas_comunes for select
  to anon, authenticated using (true);

create policy cotizaciones_owner_manage
  on public.cotizaciones for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy reservas_owner_manage
  on public.reservas for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create or replace function public.is_lote_disponible(lote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select l.habilitado_para_venta is true
    and not exists (
      select 1
      from public.ventas v
      where v.lote_id = l.id
        and v.estado in ('vigente', 'totalmente_pagada')
    )
  from public.lotes l
  where l.id = lote_id
$$;

revoke all on function public.is_lote_disponible(uuid) from public;
grant execute on function public.is_lote_disponible(uuid) to anon, authenticated;
