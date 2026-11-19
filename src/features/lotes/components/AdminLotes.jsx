"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

const PAGE_SIZE = 20;

const availabilityLabel = {
  disponible: "Disponible",
  vendido: "Vendido",
  reservado: "Reservado",
  no_habilitado: "No habilitado",
  sin_confirmar: "Sin confirmar",
};

export default function AdminLotes() {
  const [manzanos, setManzanos] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    manzano_id: "",
    disponibilidad: "",
    categoria: "",
    area_min: "",
    area_max: "",
    precio_min: "",
    precio_max: "",
    order_by: "manzano",
  });
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (search) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const result = await apiRequest(`/api/v1/lotes?${search}`);
      setItems(result.data);
      setMeta(result.meta);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/api/v1/manzanos")
      .then((result) => {
        if (active) setManzanos(result.data);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      });
    apiRequest("/api/v1/lotes?page=1&page_size=20&order_by=manzano&order=asc")
      .then((result) => {
        if (!active) return;
        setItems(result.data);
        setMeta(result.meta);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function makeQuery(page = 1) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      order_by: filters.order_by,
      order: "asc",
    });
    for (const key of ["q", "manzano_id", "disponibilidad", "categoria", "area_min", "area_max", "precio_min", "precio_max"]) {
      if (filters[key]) params.set(key, filters[key]);
    }
    return params.toString();
  }

  function submitFilters(event) {
    event.preventDefault();
    const next = makeQuery();
    setQuery(next);
    load(next);
  }

  function changeFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  const areaFor = (lot) =>
    lot.superficie_verificada_m2 ??
    lot.superficie_estimada_pdf_m2 ??
    lot.superficie_m2;
  const priceFor = (lot) => lot.precio_referencia_total ?? lot.precio_lista;
  const currencyFor = (lot) => lot.moneda_referencia ?? lot.moneda;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Administración · inventario
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Lotes</h1>
          <p className="mt-2 text-sm text-slate-600">
            {meta.total} registros · la habilitación y la disponibilidad se muestran por separado.
          </p>
        </div>
        <Link
          className="btn-primary"
          href="/panel/lotes/nuevo"
        >
          Registrar lote
        </Link>
      </div>

      <form className="form-card grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submitFilters}>
        <label className="form-label">
          Buscar lote o manzano
          <input className="form-control" onChange={(event) => changeFilter("q", event.target.value)} value={filters.q} />
        </label>
        <label className="form-label">
          Manzano
          <select className="form-control" onChange={(event) => changeFilter("manzano_id", event.target.value)} value={filters.manzano_id}>
            <option value="">Todos</option>
            {manzanos.map((item) => <option key={item.id} value={item.id}>{item.codigo}</option>)}
          </select>
        </label>
        <label className="form-label">
          Disponibilidad
          <select className="form-control" onChange={(event) => changeFilter("disponibilidad", event.target.value)} value={filters.disponibilidad}>
            <option value="">Todas</option>
            {Object.entries(availabilityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="form-label">
          Categoría
          <select className="form-control" onChange={(event) => changeFilter("categoria", event.target.value)} value={filters.categoria}>
            <option value="">Todas</option>
            <option value="REGULAR">Regular</option>
            <option value="VIS">VIS</option>
          </select>
        </label>
        <FilterField label="Área mínima (m²)" onChange={(value) => changeFilter("area_min", value)} value={filters.area_min} />
        <FilterField label="Área máxima (m²)" onChange={(value) => changeFilter("area_max", value)} value={filters.area_max} />
        <FilterField label="Precio total mínimo" onChange={(value) => changeFilter("precio_min", value)} value={filters.precio_min} />
        <FilterField label="Precio total máximo" onChange={(value) => changeFilter("precio_max", value)} value={filters.precio_max} />
        <label className="form-label">
          Ordenar por
          <select className="form-control" onChange={(event) => changeFilter("order_by", event.target.value)} value={filters.order_by}>
            <option value="manzano">Manzano y número</option>
            <option value="numero">Número</option>
            <option value="area">Superficie</option>
            <option value="precio">Precio total</option>
          </select>
        </label>
        <div className="form-actions sm:col-span-2 lg:col-span-4">
          <button className="btn-primary" type="submit">Aplicar filtros</button>
          <button
            className="btn-secondary"
            onClick={() => {
              const cleared = { q: "", manzano_id: "", disponibilidad: "", categoria: "", area_min: "", area_max: "", precio_min: "", precio_max: "", order_by: "manzano" };
              setFilters(cleared);
              const initial = "page=1&page_size=20&order_by=manzano&order=asc";
              setQuery(initial);
              load(initial);
            }}
            type="button"
          >
            Limpiar
          </button>
        </div>
      </form>

      {errorMessage ? <p className="form-alert" role="alert">{errorMessage}</p> : null}
      {loading ? <p className="text-slate-600" role="status">Cargando lotes…</p> : null}
      {!loading && !errorMessage && items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No se encontraron lotes con los filtros seleccionados.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((lot) => (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={lot.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{lot.manzano_codigo}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Lote {lot.numero}</h2>
                <p className="mt-1 text-sm text-slate-600">{lot.categoria ?? "Categoría sin informar"} · {lot.urbanizacion_nombre}</p>
              </div>
              <span className={`business-status ${statusClass(lot.disponibilidad)}`}>
                {availabilityLabel[lot.disponibilidad] ?? "Sin informar"}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Data label="Superficie" value={areaFor(lot) == null ? "Sin informar" : `${areaFor(lot)} m²`} />
              <Data label="Precio total de referencia" value={priceFor(lot) == null ? "Sin informar" : `${currencyFor(lot) ?? "Moneda sin informar"} ${priceFor(lot)}`} />
              <Data label="Precio por m²" value={lot.precio_por_m2 == null ? "Sin informar" : `${currencyFor(lot) ?? "Moneda sin informar"} ${lot.precio_por_m2}`} />
              <Data label="Habilitación comercial" value={lot.habilitado_para_venta == null ? "Sin confirmar" : lot.habilitado_para_venta ? "Habilitado" : "No habilitado"} />
            </dl>
            <Link className="mt-5 inline-block text-sm font-semibold text-brand underline underline-offset-2 hover:text-brand-hover" href={`/panel/lotes/${lot.id}`}>
              Ver detalle →
            </Link>
          </article>
        ))}
      </div>

      {!loading && meta.total_pages > 1 ? (
        <div className="flex items-center justify-between">
          <button
            className="btn-secondary min-h-10 px-3 py-2 text-sm"
            disabled={meta.page <= 1}
            onClick={() => load(makeQuery(meta.page - 1))}
            type="button"
          >Anterior</button>
          <p className="text-sm text-slate-600">Página {meta.page} de {meta.total_pages}</p>
          <button
            className="btn-secondary min-h-10 px-3 py-2 text-sm"
            disabled={meta.page >= meta.total_pages}
            onClick={() => load(makeQuery(meta.page + 1))}
            type="button"
          >Siguiente</button>
        </div>
      ) : null}
      {query ? <span className="sr-only" aria-live="polite">Filtros aplicados</span> : null}
    </section>
  );
}

function FilterField({ label, onChange, value }) {
  return (
    <label className="form-label">
      {label}
      <input className="form-control" inputMode="decimal" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function statusClass(status) {
  if (status === "disponible") return "business-status-available";
  if (status === "reservado") return "business-status-reserved";
  if (status === "vendido") return "business-status-sold";
  return "business-status-unknown";
}

function Data({ label, value }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 font-medium text-slate-800">{value}</dd></div>;
}
