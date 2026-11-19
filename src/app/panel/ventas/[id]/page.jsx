import { Suspense } from "react";
import SaleDetail from "@/features/ventas/components/SaleDetail";

export default function SalePage({ params }) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <Suspense fallback={<p className="text-slate-600" role="status">Cargando venta…</p>}>
        {params.then(({ id }) => <SaleDetail saleId={id} />)}
      </Suspense>
    </main>
  );
}
