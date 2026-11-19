import sqlite3
from pathlib import Path

source = Path(r"C:\Users\LENOVO\Downloads\Huajojo_SQLite.sql")
db = sqlite3.connect(":memory:")
db.executescript(source.read_text(encoding="utf-8-sig"))

counts = {}
for table in (
    "urbanizaciones", "manzanos", "lotes", "lote_lados",
    "areas_comunes", "clientes", "cotizaciones", "reservas",
    "ventas", "pagos", "cuadro_plano", "guia",
):
    counts[table] = db.execute(
        f"select count(*) from {table}"
    ).fetchone()[0]

assert counts["urbanizaciones"] == 1
assert counts["manzanos"] == 4
assert counts["lotes"] == 61
assert counts["lote_lados"] == 244
assert counts["areas_comunes"] == 6
assert counts["clientes"] == counts["cotizaciones"] == 0
assert counts["reservas"] == counts["ventas"] == counts["pagos"] == 0
assert db.execute(
    "select count(*) from lotes where habilitado_para_venta is null"
).fetchone()[0] == 61
assert db.execute("pragma foreign_key_check").fetchall() == []
assert db.execute(
    "select count(*) from ("
    "select manzano_id,numero,count(*) n from lotes "
    "group by manzano_id,numero having n>1)"
).fetchone()[0] == 0
assert db.execute(
    "select count(*) from ("
    "select lote_id,orden,count(*) n from lote_lados "
    "group by lote_id,orden having n>1)"
).fetchone()[0] == 0

print(counts)
