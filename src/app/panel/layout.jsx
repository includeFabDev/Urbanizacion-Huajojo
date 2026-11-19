import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import LogoutButton from "@/features/auth/components/LogoutButton";
import { getOwnerPageAccess } from "@/server/auth/page-access";

export default function PanelLayout({ children }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-6 py-16" role="status">Verificando acceso…</main>}>
      <OwnerPanel>{children}</OwnerPanel>
    </Suspense>
  );
}

async function OwnerPanel({ children }) {
  await connection();
  const access = await getOwnerPageAccess();
  if (access.status === "unauthenticated") redirect("/login");

  if (access.status !== "owner") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Acceso restringido</h1>
        <p className="mt-3 text-slate-600">
          {access.status === "forbidden"
            ? "Tu cuenta no tiene asignado el rol propietario."
            : "No fue posible verificar tu rol. Intenta nuevamente más tarde."}
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link className="font-bold tracking-tight text-slate-900" href="/panel/lotes">
            Panel del propietario
          </Link>
          <nav aria-label="Navegación del panel" className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-soft hover:text-brand" href="/panel/lotes">
              Lotes
            </Link>
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-soft hover:text-brand" href="/panel/ventas">
              Ventas
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
