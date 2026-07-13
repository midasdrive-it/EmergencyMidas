import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow } from "@/lib/types";
import QuotesView from "./QuotesView";

export const dynamic = "force-dynamic";

export default async function PreventiviPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: isAdmin }, { data: myShopId }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("get_customer_id"),
  ]);

  if (!isAdmin && !myShopId) {
    redirect("/access-denied");
  }

  let query = supabase
    .from("util_shop_quotes")
    .select(
      "quote_id, shop_id, vehicle_plate, forfait_code, quantity, unit_price, line_price, created_at"
    )
    .order("created_at", { ascending: false });

  // Gli utenti officina vedono i propri preventivi; un admin senza officina
  // collegata vede i più recenti (in sola lettura), scoperti dalla RLS.
  if (myShopId) {
    query = query.eq("shop_id", myShopId);
  } else {
    query = query.limit(500);
  }

  const { data: rows } = await query;
  const quoteRows = (rows ?? []) as QuoteRow[];

  // Etichette dei forfait per la visualizzazione delle linee.
  const codes = Array.from(new Set(quoteRows.map((r) => r.forfait_code)));
  const labelMap: Record<string, string> = {};
  if (codes.length > 0) {
    const { data: forfaits } = await supabase
      .from("util_forfait_fixed")
      .select("code_reference, label_reference")
      .in("code_reference", codes);
    for (const f of forfaits ?? []) {
      labelMap[f.code_reference] = f.label_reference ?? "";
    }
  }

  return (
    <QuotesView
      canCreate={Boolean(myShopId)}
      isAdmin={Boolean(isAdmin)}
      rows={quoteRows}
      labelMap={labelMap}
    />
  );
}
