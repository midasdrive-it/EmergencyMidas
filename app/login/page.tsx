import LoginButton from "./LoginButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-1.5 w-14 items-center justify-center rounded-full bg-rust" />
          <h1 className="font-display text-5xl font-bold uppercase tracking-tight text-ink">
            Midas
          </h1>
          <p className="mt-1 font-display text-lg uppercase tracking-[0.2em] text-muted">
            Backup Officina
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-8 shadow-sm">
          <p className="mb-6 text-center text-sm leading-relaxed text-ink/80">
            Consulta gli appuntamenti della tua officina anche quando il
            gestionale non è raggiungibile. Accedi con l&apos;account Google
            aziendale del punto vendita.
          </p>
          <LoginButton />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Strumento riservato ai punti vendita e allo staff Midas Italia.
        </p>
      </div>
    </main>
  );
}
