create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'surveyor', 'legal_advisor');
create type public.sale_status as enum ('vigente', 'cancelada', 'totalmente_pagada');
create type public.payment_status as enum ('valido', 'anulado');

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.urbanizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ubicacion text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.manzanos (
  id uuid primary key default gen_random_uuid(),
  urbanizacion_id uuid not null references public.urbanizaciones(id),
  numero text not null,
  unique (urbanizacion_id, numero)
);

create table public.lotes (
  id uuid primary key default gen_random_uuid(),
  manzano_id uuid not null references public.manzanos(id),
  numero text not null,
  categoria text,
  superficie_m2 numeric(14,2) not null check (superficie_m2 > 0),
  precio_por_m2 numeric(14,2) not null check (precio_por_m2 >= 0),
  precio_referencia_total numeric(14,2) not null check (precio_referencia_total >= 0),
  moneda_referencia text not null default 'USD',
  habilitado_para_venta boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (manzano_id, numero)
);

create table public.lote_lados (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  direccion text not null,
  longitud_m numeric(14,2) not null check (longitud_m >= 0)
);

create table public.documentos_lote (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  nombre text not null,
  storage_path text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  identificacion text,
  telefono text,
  email text,
  direccion text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id),
  cliente_id uuid not null references public.clientes(id),
  tipo text not null check (tipo in ('contado', 'cuotas')),
  precio_final numeric(14,2) not null check (precio_final >= 0),
  moneda text not null,
  estado public.sale_status not null default 'vigente',
  fecha_venta timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index una_venta_vigente_por_lote
  on public.ventas(lote_id)
  where estado in ('vigente', 'totalmente_pagada');

create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  numero integer not null check (numero > 0),
  monto numeric(14,2) not null check (monto > 0),
  fecha_vencimiento date,
  moneda text not null,
  unique (venta_id, numero)
);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id),
  monto numeric(14,2) not null check (monto > 0),
  moneda text not null,
  medio_pago text not null,
  recibido_por uuid references auth.users(id),
  estado public.payment_status not null default 'valido',
  fecha_pago timestamptz not null default timezone('utc', now()),
  numero_recibo text unique,
  idempotency_key text unique
);

create table public.pago_cuotas (
  pago_id uuid not null references public.pagos(id) on delete cascade,
  cuota_id uuid not null references public.cuotas(id),
  monto_aplicado numeric(14,2) not null check (monto_aplicado > 0),
  primary key (pago_id, cuota_id)
);

create table public.documentos_venta (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  tipo text not null,
  storage_path text,
  created_at timestamptz not null default timezone('utc', now())
);

create index lotes_manzano_idx on public.lotes(manzano_id);
create index ventas_lote_idx on public.ventas(lote_id);
create index ventas_cliente_idx on public.ventas(cliente_id);
create index pagos_venta_idx on public.pagos(venta_id);

alter table public.user_roles enable row level security;
alter table public.urbanizaciones enable row level security;
alter table public.manzanos enable row level security;
alter table public.lotes enable row level security;
alter table public.lote_lados enable row level security;
alter table public.documentos_lote enable row level security;
alter table public.clientes enable row level security;
alter table public.ventas enable row level security;
alter table public.cuotas enable row level security;
alter table public.pagos enable row level security;
alter table public.pago_cuotas enable row level security;
alter table public.documentos_venta enable row level security;

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

grant execute on function public.current_user_role() to authenticated;

create function public.is_lote_disponible(lote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select l.habilitado_para_venta
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

create policy urbanizaciones_public_read
  on public.urbanizaciones for select
  to anon, authenticated using (true);

create policy manzanos_public_read
  on public.manzanos for select
  to anon, authenticated using (true);

create policy lotes_public_read
  on public.lotes for select
  to anon, authenticated
  using (public.is_lote_disponible(lotes.id));

create policy lote_lados_public_read
  on public.lote_lados for select
  to anon, authenticated
  using (public.is_lote_disponible(lote_lados.lote_id));

create policy owners_manage_urbanizaciones
  on public.urbanizaciones for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_manzanos
  on public.manzanos for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_lotes
  on public.lotes for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_lote_lados
  on public.lote_lados for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_documentos_lote
  on public.documentos_lote for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_clientes
  on public.clientes for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_ventas
  on public.ventas for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_cuotas
  on public.cuotas for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_pagos
  on public.pagos for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_pago_cuotas
  on public.pago_cuotas for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy owners_manage_documentos_venta
  on public.documentos_venta for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy own_role_read
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());
