"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-dark";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le due password non coincidono.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Impostazione non riuscita. Riprova o richiedi un nuovo link.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-1.5 w-14 items-center justify-center rounded-full bg-brand" />
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink">
            Imposta password
          </h1>
        </div>

        <div className="rounded-lg border border-line bg-surface p-8 shadow-sm">
          {!ready ? (
            <p className="text-center text-sm text-muted">Caricamento…</p>
          ) : done ? (
            <p className="text-center text-sm text-signal-green">
              Password aggiornata. Ti stiamo portando alla dashboard…
            </p>
          ) : !hasSession ? (
            <div className="text-center">
              <p className="text-sm leading-relaxed text-ink/80">
                Il link non è più valido o è scaduto. Torna al login e richiedi
                un nuovo link per impostare la password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink"
              >
                Torna al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <p className="mb-2 text-sm leading-relaxed text-ink/80">
                Scegli una nuova password per il tuo account. Potrai usarla
                insieme all&apos;email per accedere.
              </p>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="new-password"
                  className="text-xs font-medium text-muted"
                >
                  Nuova password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Almeno 8 caratteri"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="confirm-password"
                  className="text-xs font-medium text-muted"
                >
                  Conferma password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  placeholder="Ripeti la password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-md bg-ink px-6 py-3 font-body text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink disabled:opacity-60"
              >
                {loading ? "Salvataggio…" : "Salva password"}
              </button>
              {error && <p className="text-sm text-rust">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
