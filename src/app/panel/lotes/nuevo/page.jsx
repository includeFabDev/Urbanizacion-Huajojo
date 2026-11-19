import Link from "next/link";
import LoteForm from "@/features/lotes/components/LoteForm";

export default function NewLotePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <Link className="text-sm font-semibold text-brand hover:text-brand-hover" href="/panel/lotes">← Volver a lotes</Link>
      <h1 className="mb-6 mt-4 text-3xl font-bold text-slate-900">Registrar lote</h1>
      <section className="form-card">
        <LoteForm />
      </section>
    </main>
  );
}
