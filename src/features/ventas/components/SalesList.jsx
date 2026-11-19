"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";

export default function SalesList() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: "1", page_size: "100" });
    if (search) params.set("q", search);
    apiRequest(`/api/v1/ventas?${params}`)
      .then((result) => {
        if (!active) return;
        setSales(result.data);
        setTotal(result.meta.total);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof ApiClientError ? caught.message : "No se pudieron cargar las ventas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, search]);

  function submitSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const nextSearch = query.trim();
    if (nextSearch === search) {
      setRefreshKey((current) => current + 1);
    } else {
      setSearch(nextSearch);
    }
  }

  function clearSearch() {
    setQuery("");
    setLoading(true);
    setError("");
    if (search) setSearch("");
    else setRefreshKey((current) => current + 1);
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Administración</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Ventas</h1>
          <p className="mt-2 text-sm text-slate-600">{total} ventas registradas</p>
        </div>
        <Link className="btn-primary" href="/panel/ventas/nueva">
          Registrar venta
        </Link>
      </header>

      <form className="form-card grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end" onSubmit={submitSearch}>
        <label className="form-label min-w-0">
          Buscar venta, cliente, lote o manzano
          <input
            className="form-control"
            id="sales-search"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
          />
        </label>
        <button className="btn-primary" type="submit">
          Buscar
        </button>
        <button className="btn-secondary" onClick={clearSearch} type="button">
          Limpiar
        </button>
      </form>

      {loading ? <p role="status">Cargando ventas…</p> : null}
      {error ? <p className="form-alert" role="alert">{error}</p> : null}
      {!loading && !error && sales.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No hay ventas que coincidan con la búsqueda.</p>
      ) : null}
      {!loading && sales.length > 0 ? (
        <>
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Fecha / venta</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Pagado</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-emerald-800 underline" href={`/panel/ventas/${sale.id}`}>
                      {new Date(sale.fecha_venta).toLocaleDateString()}
                    </Link>
                    <div className="text-xs text-slate-500">{sale.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3">{sale.cliente.nombre}</td>
                  <td className="px-4 py-3">{sale.lote.manzano.codigo || sale.lote.manzano.numero} · {sale.lote.numero}</td>
                  <td className="px-4 py-3">{sale.precio_final} {sale.moneda}</td>
                  <td className="px-4 py-3">{sale.total_pagado} {sale.moneda}</td>
                  <td className="px-4 py-3 font-semibold">{sale.saldo_pendiente} {sale.moneda}</td>
                  <td className="px-4 py-3">{sale.estado === "totalmente_pagada" ? "Pagada" : sale.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">
          {sales.map((sale) => (
            <article className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 shadow-sm" key={sale.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link className="font-semibold text-brand underline underline-offset-2" href={`/panel/ventas/${sale.id}`}>
                    Venta {sale.id.slice(0, 8)}
                  </Link>
                  <p className="mt-1 break-words text-sm text-slate-600">{sale.cliente.nombre}</p>
                </div>
                <span className="business-status business-status-unknown">
                  {sale.estado === "totalmente_pagada" ? "Pagada" : sale.estado === "cancelada" ? "Cancelada" : "Vigente"}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Data label="Fecha" value={new Date(sale.fecha_venta).toLocaleDateString()} />
                <Data label="Lote / manzano" value={`${sale.lote.manzano.codigo || sale.lote.manzano.numero} · ${sale.lote.numero}`} />
                <Data label="Precio" value={`${sale.precio_final} ${sale.moneda}`} />
                <Data label="Pagado" value={`${sale.total_pagado} ${sale.moneda}`} />
                <Data label="Saldo" value={`${sale.saldo_pendiente} ${sale.moneda}`} />
              </dl>
            </article>
          ))}
        </div>
        </>
      ) : null}
    </section>
  );
}

function Data({ label, value }) {
  return <div className="min-w-0"><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 break-words font-medium text-slate-800">{value}</dd></div>;
}
