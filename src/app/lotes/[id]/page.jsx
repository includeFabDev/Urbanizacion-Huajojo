import { Suspense } from "react";
import PublicLoteDetail from "@/features/lotes/components/PublicLoteDetail";

export default function PublicLotePage({ params }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl px-6 py-12" role="status">Cargando detalle…</main>}>
      {params.then(({ id }) => <PublicLoteDetail loteId={id} />)}
    </Suspense>
  );
}
