"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function CustomerAccess() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const runLoginRedirect = async () => {
    await fetch("/api/portal/login-event", { method: "POST" });
    window.location.assign("/portal");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase não configurado no ambiente.");
      setLoading(false);
      return;
    }

    let { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      const provisionResponse = await fetch("/api/portal/provision-auth-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (provisionResponse.ok) {
        const retryLogin = await supabase.auth.signInWithPassword({ email, password });
        loginError = retryLogin.error ?? null;
      }
    }

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const ensureProfileResponse = await fetch("/api/portal/ensure-profile", { method: "POST" });
    if (!ensureProfileResponse.ok) {
      const ensureData = (await ensureProfileResponse.json()) as { error?: string };
      setError(ensureData.error ?? "Login feito, mas seu perfil do portal ainda não foi criado.");
      setLoading(false);
      return;
    }

    await runLoginRedirect();
    setMessage("Login realizado com sucesso.");
    setLoading(false);
  };

  return (
    <section className="section-padding bg-slate-50">
      <div className="container-shell">
        <div className="mx-auto max-w-md rounded-[32px] bg-white p-8 shadow-soft">
          <h1 className="text-center text-3xl font-bold text-slate-900">Acesso do Portal</h1>
          <p className="mt-3 text-center text-sm text-slate-500">Apenas administradores e funcionários acessam o portal.</p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <input className="form-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" required />
            <input className="form-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required />

            <button type="submit" className="legacy-button" disabled={loading}>
              {loading ? "Processando..." : "Entrar"}
            </button>
          </form>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        </div>
      </div>
    </section>
  );
}
