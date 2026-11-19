"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

const availabilityLabel = {
  disponible: "Disponible",
  vendido: "Vendido",
  reservado: "Reservado",
  no_habilitado: "No habilitado",
  sin_confirmar: "Sin confirmar",
};

export default function AdminLoteDetail({ loteId }) {
  const [lote, setLote] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/api/v1/lotes/${loteId}`)
      .then((result) => {
        if (active) setLote(result.data);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [loteId]);

  if (errorMessage) return <p className="rounded-lg bg-red-50 p-4 text-red-800" role="alert">{errorMessage}</p>;
  if (!lote) return <p className="text-slate-600" role="status">Cargando detalle del lote…</p>;

  const area = lote.superficie_verificada_m2 ?? lote.superficie_estimada_pdf_m2 ?? lote.superficie_m2;
  const price = lote.precio_referencia_total ?? lote.precio_lista;
  const currency = lote.moneda_referencia ?? lote.moneda;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">{lote.urbanizacion_nombre} · {lote.manzano_codigo}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Lote {lote.numero}</h1>
          <p className="mt-1 text-slate-600">{lote.urbanizacion_ubicacion ?? "Ubicación sin informar"}</p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href={`/panel/lotes/${lote.id}/editar`}>Editar lote</Link>
      </div>
      <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Data label="Categoría" value={lote.categoria ?? "Sin informar"} />
        <Data label="Superficie actual" value={area == null ? "Sin informar" : `${area} m²`} />
        <Data label="Superficie verificada" value={lote.superficie_verificada_m2 == null ? "Sin informar" : `${lote.superficie_verificada_m2} m²`} />
        <Data label="Procedencia de superficie" value={lote.superficie_verificada_m2 != null ? "Verificada por propietario" : lote.superficies_procedencia ?? "Sin informar"} />
        <Data label="Precio por m²" value={lote.precio_por_m2 == null ? "Sin informar" : `${currency ?? "Moneda sin informar"} ${lote.precio_por_m2}`} />
        <Data label="Precio total de referencia" value={price == null ? "Sin informar" : `${currency ?? "Moneda sin informar"} ${price}`} />
        <Data label="Habilitación comercial" value={lote.habilitado_para_venta == null ? "Sin confirmar" : lote.habilitado_para_venta ? "Habilitado" : "No habilitado"} />
        <Data label="Disponibilidad calculada" value={availabilityLabel[lote.disponibilidad] ?? "Sin informar"} />
        <Data label="Observaciones internas" value={lote.observaciones ?? "Sin informar"} />
      </dl>
      {lote.superficie_estimada_pdf_m2 != null ? (
        <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Estimación original del plano PDF: {lote.superficie_estimada_pdf_m2} m². Se conserva aunque exista una superficie verificada.
        </p>
      ) : null}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Lados y procedencia</h2>
        {lote.lados.length ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr><th className="px-3 py-2">Orden</th><th className="px-3 py-2">Cota de plano</th><th className="px-3 py-2">Longitud</th><th className="px-3 py-2">Procedencia</th></tr>
              </thead>
              <tbody>
                {lote.lados.map((side) => (
                  <tr className="border-t border-slate-100" key={side.orden}>
                    <td className="px-3 py-2">{side.orden}</td>
                    <td className="px-3 py-2">{side.cota_plano_m == null ? "Sin informar" : `${side.cota_plano_m} m`}</td>
                    <td className="px-3 py-2">{side.longitud_m == null ? "Sin informar" : `${side.longitud_m} m`}</td>
                    <td className="px-3 py-2">{side.longitud_procedencia ?? (side.longitud_estimada_pdf_m == null ? "Sin informar" : "Longitud estimada del PDF")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-slate-600">No hay lados registrados.</p>}
      </section>
    </article>
  );
}

function Data({ label, value }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{value}</dd></div>;
}
