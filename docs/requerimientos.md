# Requerimientos y trazabilidad Jira

Fuente principal: `Jira.csv`. Las relaciones padre-hijo y las claves se
conservaron sin modificar Jira.

## Sprint 1

| Historia | Estado Jira | Subtareas |
|---|---|---|
| UH-1 Registrar lotes | En revisión | UH-14, UH-15, UH-16, UH-17, UH-18, UH-19, UH-20 |
| UH-2 Consultar lotes | Por hacer | UH-21, UH-22, UH-23, UH-24, UH-25, UH-26, UH-27, UH-28 |
| UH-3 Actualizar lotes | Por hacer | UH-29, UH-30, UH-31, UH-32, UH-33 |
| UH-4 Consultar lotes disponibles públicamente | Por hacer | UH-34, UH-35, UH-36, UH-37, UH-38 |

## Sprint 2

| Historia | Estado Jira | Subtareas |
|---|---|---|
| UH-7 Registrar venta | Por hacer | UH-39, UH-40, UH-41, UH-42, UH-43, UH-44 |
| UH-8 Consultar deuda o saldo | Por hacer | UH-45, UH-46, UH-47, UH-48, UH-49 |
| UH-9 Emitir y consultar recibo | Por hacer | UH-50, UH-51, UH-52, UH-53, UH-54, UH-55, UH-56 |

## Criterios existentes encontrados

- UH-21: mostrar urbanización, manzano, número, categoría, superficie,
  precio, moneda y disponibilidad; permitir búsqueda por número y filtro por
  manzano/disponibilidad; detalle desde el listado.
- UH-21: disponible si está habilitado y no tiene venta vigente. Si existe una
  venta vigente, prevalece el estado vendido; no habilitado se muestra como
  no habilitado.
- UH-21: no coincidencias: “No se encontraron lotes con los filtros
  seleccionados”. La consulta no modifica registros.

No se encontraron criterios de aceptación explícitos para las demás historias
en las columnas disponibles del CSV. Las reglas adicionales de este proyecto
provienen del instructivo y se documentan como requisitos funcionales, no como
criterios originales de Jira.
