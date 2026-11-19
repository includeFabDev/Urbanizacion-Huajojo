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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link className="font-bold text-slate-900" href="/panel/lotes">
            Panel del propietario
          </Link>
          <nav aria-label="Navegación del panel" className="flex items-center gap-4">
            <Link className="text-sm text-slate-700 hover:text-emerald-800" href="/panel/lotes">
              Lotes
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
