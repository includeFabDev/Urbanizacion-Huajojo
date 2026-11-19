"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

const PAGE_SIZE = 12;
const INITIAL_FILTERS = {
  q: "",
  manzano_id: "",
  categoria: "",
  area_min: "",
  area_max: "",
  precio_min: "",
  precio_max: "",
};

export default function PublicCatalog() {
  const [manzanos, setManzanos] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (page = 1, values = INITIAL_FILTERS) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        order_by: "manzano",
        order: "asc",
      });
      for (const [key, value] of Object.entries(values)) {
        if (value) params.set(key, value);
      }
      const result = await apiRequest(`/api/v1/public/lotes?${params}`);
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
    const params = new URLSearchParams({
      page: "1",
      page_size: String(PAGE_SIZE),
      order_by: "manzano",
      order: "asc",
    });
    Promise.all([
      apiRequest("/api/v1/public/manzanos"),
      apiRequest(`/api/v1/public/lotes?${params}`),
    ])
      .then(([manzanoResult, lotesResult]) => {
        if (!active) return;
        setManzanos(manzanoResult.data);
        setItems(lotesResult.data);
        setMeta(lotesResult.meta);
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

  function change(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    load(1, filters);
  }

  function clear() {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    load(1, INITIAL_FILTERS);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <Link className="text-sm font-semibold text-emerald-800" href="/">Urbanización Guajojó</Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-emerald-800">Catálogo público</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Lotes disponibles</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Urbanización ubicada en Trinidad, Beni. Solo se muestran lotes con habilitación comercial confirmada.
        </p>
      </header>

      <form className="mb-7 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
        <label className="text-sm font-medium text-slate-700">
          Buscar lote o manzano
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" onChange={(event) => change("q", event.target.value)} value={filters.q} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Manzano
          <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" onChange={(event) => change("manzano_id", event.target.value)} value={filters.manzano_id}>
            <option value="">Todos</option>
            {manzanos.map((item) => <option key={item.id} value={item.id}>{item.codigo}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Categoría
          <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" onChange={(event) => change("categoria", event.target.value)} value={filters.categoria}>
            <option value="">Todas</option>
            <option value="REGULAR">Regular</option>
            <option value="VIS">VIS</option>
          </select>
        </label>
        <FilterField label="Superficie mínima (m²)" onChange={(value) => change("area_min", value)} value={filters.area_min} />
        <FilterField label="Superficie máxima (m²)" onChange={(value) => change("area_max", value)} value={filters.area_max} />
        <FilterField label="Precio mínimo" onChange={(value) => change("precio_min", value)} value={filters.precio_min} />
        <FilterField label="Precio máximo" onChange={(value) => change("precio_max", value)} value={filters.precio_max} />
        <div className="flex items-end gap-2">
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" type="submit">Buscar</button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" onClick={clear} type="button">Limpiar</button>
        </div>
      </form>

      {errorMessage ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{errorMessage}</p> : null}
      {loading ? <p className="py-12 text-center text-slate-600" role="status">Cargando catálogo…</p> : null}
      {!loading && !errorMessage && items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No se encontraron lotes con los filtros seleccionados.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((lot) => {
          const area = lot.superficie_verificada_m2 ?? lot.superficie_estimada_pdf_m2 ?? lot.superficie_m2;
          const total = lot.precio_referencia_total ?? lot.precio_lista;
          const currency = lot.moneda_referencia ?? lot.moneda;
          return (
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" key={lot.id}>
              <div className="h-1.5 bg-emerald-800" />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{lot.urbanizacion_nombre} · {lot.manzano_codigo}</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Lote {lot.numero}</h2>
                <p className="mt-1 text-sm text-slate-600">{lot.categoria ?? "Categoría sin informar"}</p>
                <dl className="mt-5 space-y-3 text-sm">
                  <Data label="Superficie" value={area == null ? "Sin informar" : `${area} m²`} />
                  {area != null && lot.superficie_verificada_m2 == null ? (
                    <p className="text-xs text-amber-800">{surfaceProvenance(lot)}</p>
                  ) : null}
                  <Data label="Precio total de referencia" value={total == null ? "Sin informar" : `${currency ?? "Moneda sin informar"} ${total}`} />
                  {lot.precio_por_m2 != null ? <Data label="Precio por m²" value={`${currency ?? "Moneda sin informar"} ${lot.precio_por_m2}`} /> : null}
                </dl>
                <Link className="mt-5 inline-flex font-semibold text-emerald-800 hover:underline" href={`/lotes/${lot.id}`}>Ver características y medidas →</Link>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && meta.total_pages > 1 ? (
        <div className="mt-8 flex items-center justify-between">
          <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={meta.page <= 1} onClick={() => load(meta.page - 1, appliedFilters)} type="button">Anterior</button>
          <p aria-live="polite" className="text-sm text-slate-600">Página {meta.page} de {meta.total_pages}</p>
          <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={meta.page >= meta.total_pages} onClick={() => load(meta.page + 1, appliedFilters)} type="button">Siguiente</button>
        </div>
      ) : null}
    </main>
  );
}

function surfaceProvenance(lot) {
  if (lot.superficie_estimada_pdf_m2 != null) {
    return "Superficie estimada desde el plano PDF; pendiente de verificación.";
  }
  return lot.superficies_procedencia ?? "Superficie informada, pendiente de verificación.";
}

function FilterField({ label, onChange, value }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" inputMode="decimal" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function Data({ label, value }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold text-slate-900">{value}</dd></div>;
}
