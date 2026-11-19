import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-lg font-bold tracking-tight text-slate-900" href="/">Urbanización Guajojó</Link>
        <Link className="btn-secondary min-h-10 px-3 py-2 text-sm" href="/login">Acceso propietario</Link>
      </header>
      <section className="my-auto max-w-3xl py-20">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand">Trinidad · Beni · Bolivia</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Encuentra tu lote en Guajojó</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Consulta el catálogo de terrenos cuya habilitación comercial ha sido confirmada.
        </p>
        <Link className="btn-primary mt-8" href="/lotes">Ver lotes disponibles</Link>
      </section>
    </main>
  );
}
