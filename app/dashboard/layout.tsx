import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import TabsNav from "@/components/TabsNav";

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

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rust" />
            <div className="leading-none">
              <p className="font-display text-xl font-bold uppercase tracking-tight">
                Midas Backup Officina
              </p>
              <p className="mt-0.5 text-xs text-paper/60">{user.email}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl bg-surface">
        <TabsNav />
        <div className="px-4 py-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
