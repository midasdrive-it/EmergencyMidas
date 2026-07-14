import LoginButton from "./LoginButton";
import EmailPasswordForm from "./EmailPasswordForm";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-3 h-20 w-20" />
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
            gestionale non è raggiungibile.
          </p>

          <EmailPasswordForm />

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs uppercase tracking-widest text-muted">
              oppure
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <LoginButton />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Strumento riservato ai punti vendita e allo staff Midas Italia.
        </p>
      </div>
    </main>
  );
}
