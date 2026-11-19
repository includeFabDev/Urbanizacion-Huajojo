import { Suspense } from "react";
import Link from "next/link";
import LoteForm from "@/features/lotes/components/LoteForm";

export default function EditLotePage({ params }) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <Suspense fallback={<p className="text-slate-600" role="status">Cargando lote…</p>}>
        {params.then(({ id }) => <EditLoteContent id={id} />)}
      </Suspense>
    </main>
  );
}

function EditLoteContent({ id }) {
  return (
    <>
      <Link className="text-sm font-semibold text-emerald-800" href={`/panel/lotes/${id}`}>← Volver al detalle</Link>
      <h1 className="mb-6 mt-4 text-3xl font-bold text-slate-900">Editar lote</h1>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <LoteForm loteId={id} />
      </section>
    </>
  );
}
