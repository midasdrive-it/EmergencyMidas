"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "reset";

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-dark";

export default function EmailPasswordForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError("Email o password non corretti.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    setLoading(false);
    if (error) {
      setError("Invio non riuscito. Riprova.");
      return;
    }
    setNotice(
      "Se l'indirizzo è collegato a un account, riceverai un'email con il link per impostare la password."
    );
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
  }

  if (mode === "reset") {
    return (
      <form onSubmit={handleReset} className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-ink/80">
          Inserisci la tua email: ti invieremo un link per impostare o
          reimpostare la password. Funziona anche se finora hai usato solo
          l&apos;accesso con Google.
        </p>
        <div className="flex flex-col gap-1">
          <label htmlFor="reset-email" className="text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="nome@officina.it"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-md bg-ink px-6 py-3 font-body text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink disabled:opacity-60"
        >
          {loading ? "Invio in corso…" : "Invia link per la password"}
        </button>
        {notice && <p className="text-sm text-signal-green">{notice}</p>}
        {error && <p className="text-sm text-rust">{error}</p>}
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className="mt-1 text-center text-sm font-medium text-ink underline underline-offset-2 hover:text-brand-dark"
        >
          Torna all&apos;accesso
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-xs font-medium text-muted">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="nome@officina.it"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-xs font-medium text-muted">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full rounded-md bg-ink px-6 py-3 font-body text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink disabled:opacity-60"
      >
        {loading ? "Accesso in corso…" : "Accedi"}
      </button>
      {error && <p className="text-sm text-rust">{error}</p>}
      <button
        type="button"
        onClick={() => switchMode("reset")}
        className="text-center text-sm font-medium text-ink underline underline-offset-2 hover:text-brand-dark"
      >
        Password dimenticata? Impostala qui
      </button>
    </form>
  );
}
