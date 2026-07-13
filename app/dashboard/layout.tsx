import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return email;
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = (parts.length >= 2 ? [parts[0], parts[1]] : [local])
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return letters.slice(0, 2) || "?";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email ?? "";
  const name = displayNameFromEmail(email);
  const initials = initialsFromEmail(email);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-brand text-ink">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-brand">
                M
              </span>
              <div className="leading-tight">
                <p className="font-display text-xl font-bold uppercase tracking-tight">
                  Midas Backup Officina
                </p>
                <p className="text-xs text-ink/70">
                  Consultazione appuntamenti del punto vendita
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs text-ink/70">Benvenuto,</p>
                <p className="text-sm font-semibold">{name}</p>
              </div>
              <span
                title={email}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper"
              >
                {initials}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
