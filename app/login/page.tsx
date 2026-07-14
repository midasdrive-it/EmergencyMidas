import LoginButton from "./LoginButton";
import EmailPasswordForm from "./EmailPasswordForm";
import Logo from "@/components/Logo";
import EcgLine from "@/components/EcgLine";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-3 h-20 w-20" />
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-ink">
            <span className="block text-rust">Emergency</span>
            <span className="block">Midas</span>
          </h1>
          <EcgLine className="mx-auto mt-3 h-6 w-48 text-rust" />
          <p className="mt-2 font-display text-sm uppercase tracking-[0.25em] text-muted">
            Sistema di backup
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
