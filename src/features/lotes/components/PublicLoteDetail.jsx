"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

export default function PublicLoteDetail({ loteId }) {
  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/api/v1/public/lotes/${loteId}`)
      .then((result) => {
        if (active) setLote(result.data);
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
  }, [loteId]);

  if (loading) return <main className="mx-auto max-w-4xl px-6 py-12" role="status">Cargando detalle…</main>;
  if (errorMessage || !lote) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="rounded-lg bg-amber-50 p-4 text-amber-900" role="alert">
          {errorMessage || "Este lote no está disponible en el catálogo."}
        </p>
        <Link className="mt-5 inline-block font-semibold text-emerald-800" href="/lotes">← Volver al catálogo</Link>
      </main>
    );
  }

  const area = lote.superficie_verificada_m2 ?? lote.superficie_estimada_pdf_m2 ?? lote.superficie_m2;
  const price = lote.precio_referencia_total ?? lote.precio_lista;
  const currency = lote.moneda_referencia ?? lote.moneda;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10 sm:px-8">
      <Link className="text-sm font-semibold text-emerald-800" href="/lotes">← Catálogo público</Link>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          {lote.urbanizacion.nombre} · {lote.manzano.codigo}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Lote {lote.numero}</h1>
        <p className="mt-2 text-slate-600">{lote.urbanizacion.ubicacion}</p>
        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <Data label="Categoría" value={lote.categoria ?? "Sin informar"} />
          <Data label="Superficie" value={area == null ? "Sin informar" : `${area} m²`} />
          <Data label="Precio por m²" value={lote.precio_por_m2 == null ? "Sin informar" : `${currency ?? "Moneda sin informar"} ${lote.precio_por_m2}`} />
          <Data label="Precio total de referencia" value={price == null ? "Sin informar" : `${currency ?? "Moneda sin informar"} ${price}`} />
        </dl>
        {area != null && lote.superficie_verificada_m2 == null ? (
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {lote.superficie_estimada_pdf_m2 != null
              ? "La superficie publicada es una estimación del contorno del plano PDF y no una medición definitiva verificada."
              : lote.superficies_procedencia ?? "La superficie informada está pendiente de verificación."}
          </p>
        ) : null}
        {lote.lados.length ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Medidas registradas</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {lote.lados.map((side) => {
                const length = side.longitud_m ?? side.longitud_estimada_pdf_m;
                if (length == null) return null;
                return (
                  <li className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700" key={side.orden}>
                    Lado {side.orden}: {length} m
                    {" · "}
                    {side.longitud_procedencia ??
                      (side.longitud_estimada_pdf_m != null
                        ? "Longitud estimada del plano PDF"
                        : "Longitud informada, pendiente de verificación")}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Data({ label, value }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>;
}
