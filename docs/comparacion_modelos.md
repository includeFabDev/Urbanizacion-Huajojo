# Comparación de modelos: SQLite existente y PostgreSQL objetivo

## Resumen de la fuente SQLite

La base adjunta contiene 1 urbanización, 4 manzanos, 61 lotes, 244 registros de
lados, 6 áreas comunes, 7 filas de cuadro plano y 14 indicaciones de guía.
No contiene filas en clientes, cotizaciones, reservas, ventas ni pagos.

## Tablas

| SQLite | PostgreSQL | Resultado |
|---|---|---|
| urbanizaciones | urbanizaciones | Estructura ampliada con procedencia; conserva IDs en `legacy_sqlite_id` |
| manzanos | manzanos | Conserva código original y `legacy_sqlite_id` |
| lotes | lotes | Conserva ambos tipos de superficie y medidas; añade procedencia |
| lote_lados | lote_lados | Conserva orden, cotas, longitudes estimadas y IDs heredados |
| areas_comunes | areas_comunes | Tabla nueva necesaria para conservar las 6 áreas |
| clientes | clientes | Ampliada para importación posterior; cero filas fuente |
| cotizaciones | cotizaciones | Tabla conservada; fuera de módulos de Sprint 1/2 |
| reservas | reservas | Tabla conservada; fuera de módulos autorizados |
| ventas | ventas | Conservada y relacionada con reserva/cotización |
| pagos | pagos | Conservada; las cuotas se mantienen separadas |
| cuadro_plano | cuadro_plano | Tabla de consulta/procedencia |
| guia | guia | Referencia de procedencia |

## Columnas y conversiones

- `precio_lista_centavos -> lotes.precio_lista`: dividir entre 100.
- `precio_total_centavos -> cotizaciones.precio_total`: dividir entre 100.
- `monto_acordado_centavos -> reservas.monto_acordado`: dividir entre 100.
- `precio_final_centavos -> ventas.precio_final`: dividir entre 100.
- `monto_centavos -> pagos.monto`: dividir entre 100.
- Los campos monetarios usan `NUMERIC(14,2)`. Los valores fuente `NULL`
  siguen siendo `NULL`; no se convierten a cero.
- Superficies y longitudes siguen en metros o metros cuadrados con dos decimales
  como representación PostgreSQL.

## Relaciones

Se conservan:

- urbanización -> manzanos -> lotes -> lados.
- urbanización -> áreas comunes.
- lote/cliente -> cotización -> reserva -> venta.
- reserva o venta -> pago.

La migración conserva identificadores SQLite mediante `legacy_sqlite_id` y
únicos respectivos. Las claves primarias nuevas son UUID, salvo tablas de
referencia simples.

## Restricciones

- Número único por manzano.
- Orden único por lote y lado.
- Códigos únicos de manzano.
- Una venta vigente o totalmente pagada por lote mediante índice único parcial.
- Pago de SQLite conserva la restricción XOR conceptual entre reserva y venta.
  El modelo final puede hacer que el vínculo de venta sea opcional hasta importar.

## Datos

No se usa el seed de demostración para reemplazar datos. La importación usa
`ON CONFLICT` y verificaciones de existencia. Las relaciones se recrean
mediante búsquedas por `legacy_sqlite_id`.

Se ajustan secuencias después de importar para:

```sql
select setval(pg_get_serial_sequence('public.cuadro_plano','id'),
  coalesce(max(id), 1), max(id) is not null)
from public.cuadro_plano;

select setval(pg_get_serial_sequence('public.guia','id'),
  coalesce(max(id), 1), max(id) is not null)
from public.guia;
```

El archivo de importación actualiza las secuencias dentro de la misma
transacción y valida los conteos solicitados antes de confirmar. Usa
`ON CONFLICT DO NOTHING`: no sobrescribe registros existentes y la transacción
falla si los conteos o mapeos heredados no quedan completos.

## Alcance de cotizaciones y reservas

El SQL conserva tablas de cotizaciones y reservas porque contienen información
preexistente. No se implementan interfaces, APIs ni flujos para ellas en los
dos primeros sprints. Las tablas quedan disponibles únicamente para
preservación y futuras migraciones autorizadas.
