"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      router.replace("/panel/lotes");
      router.refresh();
    } catch {
      setErrorMessage("No se pudo iniciar sesión. Revisa tus datos e inténtalo nuevamente.");
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-medium text-slate-700">
        Correo electrónico
        <input
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Contraseña
        <input
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {errorMessage ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
