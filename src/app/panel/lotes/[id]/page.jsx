import { Suspense } from "react";
import Link from "next/link";
import AdminLoteDetail from "@/features/lotes/components/AdminLoteDetail";

export default function AdminLotePage({ params }) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <Link className="text-sm font-semibold text-emerald-800" href="/panel/lotes">← Volver a lotes</Link>
      <Suspense fallback={<p className="mt-5 text-slate-600" role="status">Cargando lote…</p>}>
        {params.then(({ id }) => <div className="mt-5"><AdminLoteDetail loteId={id} /></div>)}
      </Suspense>
    </main>
  );
}
