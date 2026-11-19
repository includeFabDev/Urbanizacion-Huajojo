"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function signOut() {
    setPending(true);
    setErrorMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.replace("/login");
      router.refresh();
    } catch {
      setErrorMessage("No se pudo cerrar sesión. Inténtalo nuevamente.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        disabled={pending}
        onClick={signOut}
        type="button"
      >
        {pending ? "Cerrando…" : "Cerrar sesión"}
      </button>
      {errorMessage ? <p className="mt-1 text-xs text-red-700" role="alert">{errorMessage}</p> : null}
    </div>
  );
}
