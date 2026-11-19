import sqlite3
from decimal import Decimal
from pathlib import Path

source = Path(r"C:\Users\LENOVO\Downloads\Huajojo_SQLite.sql")
output = Path(r"C:\Users\LENOVO\source\repos\Urbanizacion-Huajojo\supabase\import_existing.sql")

db = sqlite3.connect(":memory:")
db.executescript(source.read_text(encoding="utf-8-sig"))

def sql_text(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"

def sql_num(value):
    return "NULL" if value is None else str(value)

def sql_bool(value):
    if value is None:
        return "NULL"
    return "true" if value == 1 else "false"

def cents_to_decimal(value):
    if value is None:
        return None
    return format(Decimal(value) / Decimal(100), ".2f")

lines = [
    "-- Importación idempotente de datos existentes.",
    "-- Conserva IDs SQLite mediante columnas legacy_sqlite_id.",
    "-- El script no crea datos ficticios ni publica lotes sin habilitación confirmada.",
    "begin;",
]

urbanizacion = db.execute("select * from urbanizaciones").fetchall()
for row in urbanizacion:
    lines.append(
        "insert into public.urbanizaciones "
        "(legacy_sqlite_id,nombre,ubicacion,fecha_plano,src_epsg,lamina) values "
        f"({row[0]},{sql_text(row[1])},{sql_text(row[2])},{sql_text(row[3])},{sql_num(row[4])},{sql_text(row[5])}) "
        "on conflict do nothing;"
    )

for row in db.execute("select * from manzanos"):
    lines.append(
        "insert into public.manzanos "
        "(legacy_sqlite_id,urbanizacion_id,codigo,numero) "
        "select "
        f"{row[0]}, u.id,{sql_text(row[2])},{sql_text(row[2])} "
        f"from public.urbanizaciones u where u.legacy_sqlite_id={row[1]} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from lotes"):
    (
        legacy_id, manzano_id, numero, categoria, superficie_estimada,
        superficie, lado1, lado2, lado3, lado4, precio_centavos,
        moneda, habilitado, matricula, catastral, observaciones,
    ) = row
    precio = cents_to_decimal(precio_centavos)
    lines.append(
        "insert into public.lotes "
        "(legacy_sqlite_id,manzano_id,numero,categoria,"
        "superficie_estimada_pdf_m2,superficie_m2,lado_1_m,lado_2_m,lado_3_m,lado_4_m,"
        "precio_lista,moneda,habilitado_para_venta,matricula_ddrr,codigo_catastral,"
        "observaciones,superficies_procedencia,datos_origen) "
        "select "
        f"{legacy_id}, m.id,{numero},{sql_text(categoria)},"
        f"{sql_num(superficie_estimada)},{sql_num(superficie)},{sql_num(lado1)},{sql_num(lado2)},"
        f"{sql_num(lado3)},{sql_num(lado4)},{'NULL' if precio is None else sql_num(precio)},"
        f"{sql_text(moneda)},{sql_bool(habilitado)},{sql_text(matricula)},"
        f"{sql_text(catastral)},{sql_text(observaciones)},"
        "'estimada desde el contorno del PDF',"
        "'Huajojo_SQLite(1).sql; superficies estimadas del plano PDF de agosto de 2025' "
        f"from public.manzanos m where m.legacy_sqlite_id={manzano_id} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from lote_lados"):
    legacy_id, lote_id, orden, cota, longitud_estimada, referencia = row
    lines.append(
        "insert into public.lote_lados "
        "(legacy_sqlite_id,lote_id,orden,cota_plano_m,longitud_estimada_pdf_m,referencia,"
        "longitud_m,longitud_procedencia) "
        "select "
        f"{legacy_id},l.id,{orden},{sql_num(cota)},{sql_num(longitud_estimada)},"
        f"{sql_text(referencia)},{sql_num(longitud_estimada)},"
        "'estimada desde el PDF; cota_plano_m conservada como dato de procedencia' "
        f"from public.lotes l where l.legacy_sqlite_id={lote_id} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from areas_comunes"):
    lines.append(
        "insert into public.areas_comunes "
        "(legacy_sqlite_id,urbanizacion_id,codigo,tipo,superficie_estimada_pdf_m2,"
        "superficie_procedencia) "
        "select "
        f"{row[0]},u.id,{sql_text(row[2])},{sql_text(row[3])},{sql_num(row[4])},"
        "'estimada desde el contorno del PDF' "
        f"from public.urbanizaciones u where u.legacy_sqlite_id={row[1]} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from clientes"):
    lines.append(
        "insert into public.clientes "
        "(legacy_sqlite_id,nombre,nombre_completo,telefono,email,tipo_documento,numero_documento) values "
        f"({row[0]},{sql_text(row[1])},{sql_text(row[1])},{sql_text(row[2])},{sql_text(row[3])},"
        f"{sql_text(row[4])},{sql_text(row[5])}) "
        "on conflict do nothing;"
    )

for row in db.execute("select * from cotizaciones"):
    _, lote_id, cliente_id, fecha, hasta, total_centavos, moneda, forma, condiciones, estado = row
    total = cents_to_decimal(total_centavos)
    lines.append(
        "insert into public.cotizaciones "
        "(legacy_sqlite_id,lote_id,cliente_id,fecha_emision,valida_hasta,precio_total,"
        "moneda,forma_pago,condiciones_pago,estado) "
        "select "
        f"{row[0]},l.id,c.id,{sql_text(fecha)},{sql_text(hasta)},"
        f"{'NULL' if total is None else sql_num(total)},{sql_text(moneda)},"
        f"{sql_text(forma)},{sql_text(condiciones)},{sql_text(estado)} "
        f"from public.lotes l,public.clientes c "
        f"where l.legacy_sqlite_id={lote_id} and c.legacy_sqlite_id={cliente_id} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from reservas"):
    _, lote_id, cliente_id, cotizacion_id, fecha, vence, monto_centavos, moneda, condiciones, estado = row
    monto = cents_to_decimal(monto_centavos)
    lines.append(
        "insert into public.reservas "
        "(legacy_sqlite_id,lote_id,cliente_id,cotizacion_id,fecha_reserva,vence_en,"
        "monto_acordado,moneda,condiciones,estado) "
        "select "
        f"{row[0]},l.id,c.id,"
        f"{'NULL' if cotizacion_id is None else 'co.id'},"
        f"{sql_text(fecha)},{sql_text(vence)},"
        f"{'NULL' if monto is None else sql_num(monto)},{sql_text(moneda)},"
        f"{sql_text(condiciones)},{sql_text(estado)} "
        f"from public.lotes l,public.clientes c "
        f"{'' if cotizacion_id is None else 'left join public.cotizaciones co on co.legacy_sqlite_id=' + str(cotizacion_id)} "
        f"where l.legacy_sqlite_id={lote_id} and c.legacy_sqlite_id={cliente_id} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from ventas"):
    _, lote_id, cliente_id, reserva_id, cotizacion_id, fecha, total_centavos, moneda, forma, estado = row
    total = cents_to_decimal(total_centavos)
    lines.append(
        "insert into public.ventas "
        "(legacy_sqlite_id,lote_id,cliente_id,reserva_id,cotizacion_id,"
        "fecha_venta,precio_final,moneda,forma_pago,tipo,estado) "
        "select "
        f"{row[0]},l.id,c.id,"
        f"{'NULL' if reserva_id is None else 'r.id'},"
        f"{'NULL' if cotizacion_id is None else 'co.id'},"
        f"{sql_text(fecha)},{'NULL' if total is None else sql_num(total)},"
        f"{sql_text(moneda)},{sql_text(forma)},"
        "'contado',"
        f"{sql_text('vigente' if estado in ('vigente','activa',None) else estado)} "
        f"from public.lotes l,public.clientes c "
        f"{'' if reserva_id is None else 'left join public.reservas r on r.legacy_sqlite_id=' + str(reserva_id)} "
        f"{'' if cotizacion_id is None else 'left join public.cotizaciones co on co.legacy_sqlite_id=' + str(cotizacion_id)} "
        f"where l.legacy_sqlite_id={lote_id} and c.legacy_sqlite_id={cliente_id} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from pagos"):
    _, reserva_id, venta_id, fecha, monto_centavos, moneda, medio, comprobante, estado = row
    monto = cents_to_decimal(monto_centavos)
    lines.append(
        "insert into public.pagos "
        "(legacy_sqlite_id,reserva_id,venta_id,fecha_pago,monto,moneda,medio_pago,"
        "numero_comprobante,estado_original,estado) "
        "select "
        f"{row[0]},"
        f"{'NULL' if reserva_id is None else 'r.id'},"
        f"{'NULL' if venta_id is None else 'v.id'},"
        f"{sql_text(fecha)},{'NULL' if monto is None else sql_num(monto)},"
        f"{sql_text(moneda)},{sql_text(medio)},{sql_text(comprobante)},"
        f"{sql_text(estado)},"
        f"{sql_text('anulado' if estado == 'anulado' else 'valido')} "
        f"{'' if reserva_id is None else 'from public.reservas r'}"
        f"{'' if reserva_id is not None or venta_id is None else 'from public.ventas v'}"
        f"{' where r.legacy_sqlite_id=' + str(reserva_id) if reserva_id is not None else ''}"
        f"{' where v.legacy_sqlite_id=' + str(venta_id) if reserva_id is None and venta_id is not None else ''} "
        "on conflict do nothing;"
    )

for row in db.execute("select * from cuadro_plano"):
    lines.append(
        "insert into public.cuadro_plano (concepto,superficie_m2,nota) values "
        f"({sql_text(row[0])},{sql_num(row[1])},{sql_text(row[2])}) "
        "on conflict do nothing;"
    )

for row in db.execute("select * from guia"):
    lines.append(
        "insert into public.guia (tema,indicacion) values "
        f"({sql_text(row[0])},{sql_text(row[1])}) "
        "on conflict do nothing;"
    )

lines.extend([
    "do $$",
    "declare",
    "  missing integer;",
    "  invalid_count integer;",
    "begin",
    "  select count(*) into missing",
    "  from public.lotes l",
    "  where l.legacy_sqlite_id is not null",
    "    and not exists (",
    "      select 1 from public.manzanos m where m.id=l.manzano_id",
    "    );",
    "  if missing <> 0 then",
    "    raise exception 'Importacion incompleta: % lotes sin manzano', missing;",
    "  end if;",
    "  if (select count(*) from public.urbanizaciones) <> 1",
    "    or (select count(*) from public.manzanos) <> 4",
    "    or (select count(*) from public.lotes) <> 61",
    "    or (select count(*) from public.lote_lados) <> 244",
    "    or (select count(*) from public.areas_comunes) <> 6 then",
    "    raise exception 'Conflicto: conteos finales no coinciden con la fuente SQLite';",
    "  end if;",
    "  if (select count(*) from public.urbanizaciones where legacy_sqlite_id is not null) <> 1",
    "    or (select count(*) from public.manzanos where legacy_sqlite_id is not null) <> 4",
    "    or (select count(*) from public.lotes where legacy_sqlite_id is not null) <> 61",
    "    or (select count(*) from public.lote_lados where legacy_sqlite_id is not null) <> 244",
    "    or (select count(*) from public.areas_comunes where legacy_sqlite_id is not null) <> 6 then",
    "    raise exception 'Conflicto: IDs de origen no importados íntegramente';",
    "  end if;",
    "  select count(*) into invalid_count from public.lotes",
    "    where legacy_sqlite_id is not null and habilitado_para_venta is not null;",
    "  if invalid_count <> 0 then",
    "    raise exception 'Conflicto: habilitacion comercial fue alterada';",
    "  end if;",
    "  select count(*) into invalid_count from public.lotes l",
    "    where l.legacy_sqlite_id is not null and public.is_lote_disponible(l.id);",
    "  if invalid_count <> 0 then",
    "    raise exception 'Conflicto: un lote no confirmado aparece disponible';",
    "  end if;",
    "  select count(*) into invalid_count",
    "  from public.lotes l left join public.manzanos m on m.id=l.manzano_id",
    "  where l.legacy_sqlite_id is not null and m.id is null;",
    "  if invalid_count <> 0 then",
    "    raise exception 'Importacion incompleta: relaciones de manzanos invalidas';",
    "  end if;",
    "  select count(*) into invalid_count",
    "  from public.lote_lados ll left join public.lotes l on l.id=ll.lote_id",
    "  where ll.legacy_sqlite_id is not null and l.id is null;",
    "  if invalid_count <> 0 then",
    "    raise exception 'Importacion incompleta: relaciones de lados invalidas';",
    "  end if;",
    "  perform setval(pg_get_serial_sequence('public.cuadro_plano','id'),",
    "    coalesce((select max(id) from public.cuadro_plano), 1),",
    "    exists(select 1 from public.cuadro_plano));",
    "  perform setval(pg_get_serial_sequence('public.guia','id'),",
    "    coalesce((select max(id) from public.guia), 1),",
    "    exists(select 1 from public.guia));",
    "end;",
    "$$;",
    "commit;",
])

output.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"generated {output}")
