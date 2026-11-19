import Link from "next/link";
import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10 sm:px-8">
      <Link className="text-sm font-semibold text-brand hover:text-brand-hover" href="/">
        ← Urbanización Guajojó
      </Link>
      <section className="form-card mt-6 overflow-hidden border-t-4 border-t-brand">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
          Acceso de propietario
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ingresa con tu cuenta asignada. El rol propietario se valida en el servidor.
        </p>
        <div className="mt-7">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
