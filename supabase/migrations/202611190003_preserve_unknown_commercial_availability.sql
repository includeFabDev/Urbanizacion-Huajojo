alter table public.lotes
  alter column habilitado_para_venta drop default,
  alter column habilitado_para_venta drop not null;
