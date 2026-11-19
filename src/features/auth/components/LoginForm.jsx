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
    <form className="form-stack" onSubmit={submit}>
      <label className="form-label">
        Correo electrónico <span className="required-mark" aria-hidden="true">*</span>
        <span className="sr-only"> obligatorio</span>
        <input
          autoComplete="email"
          className="form-control"
          id="login-email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="form-label">
        Contraseña <span className="required-mark" aria-hidden="true">*</span>
        <span className="sr-only"> obligatorio</span>
        <input
          autoComplete="current-password"
          className="form-control"
          id="login-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {errorMessage ? (
        <p className="form-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        className="btn-primary w-full"
        disabled={pending}
        type="submit"
      >
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
