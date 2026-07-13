"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={
        className ??
        "rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-rust hover:text-rust disabled:opacity-60"
      }
    >
      {loading ? "Uscita…" : "Esci"}
    </button>
  );
}
