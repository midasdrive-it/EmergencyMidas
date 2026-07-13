import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function AccessDeniedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold uppercase text-ink">
        Nessuna officina collegata
      </h1>
      <p className="mt-3 max-w-md text-sm text-ink/80">
        L&apos;account <span className="font-medium">{user.email}</span> ha
        effettuato l&apos;accesso correttamente, ma non risulta associato a
        nessun punto vendita Midas. Contatta l&apos;amministratore per
        collegare la tua officina a questo strumento.
      </p>
      <div className="mt-6">
        <SignOutButton className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-rust" />
      </div>
    </main>
  );
}
