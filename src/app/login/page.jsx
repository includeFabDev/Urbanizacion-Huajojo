import Link from "next/link";
import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <Link className="text-sm font-semibold text-emerald-800" href="/">
        ← Urbanización Guajojó
      </Link>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Acceso de propietario
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa con tu cuenta asignada. El rol propietario se valida en el servidor.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
