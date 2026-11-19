import { Suspense } from "react";
import Link from "next/link";
import LoteForm from "@/features/lotes/components/LoteForm";

export default function EditLotePage({ params }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="text-slate-600" role="status">Cargando lote…</p>}>
        {params.then(({ id }) => <EditLoteContent id={id} />)}
      </Suspense>
    </main>
  );
}

function EditLoteContent({ id }) {
  return (
    <>
      <Link className="text-sm font-semibold text-brand hover:text-brand-hover" href={`/panel/lotes/${id}`}>← Volver al detalle</Link>
      <h1 className="mb-6 mt-4 text-3xl font-bold text-slate-900">Editar lote</h1>
      <section className="form-card">
        <LoteForm loteId={id} />
      </section>
    </>
  );
}
