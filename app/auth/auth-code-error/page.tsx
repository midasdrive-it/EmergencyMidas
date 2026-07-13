import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold uppercase text-ink">
        Accesso non riuscito
      </h1>
      <p className="mt-3 max-w-sm text-sm text-ink/80">
        Non è stato possibile completare l&apos;accesso con Google. Riprova
        oppure contatta l&apos;amministratore se il problema persiste.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink"
      >
        Torna al login
      </Link>
    </main>
  );
}
