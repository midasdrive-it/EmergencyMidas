import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow, ShopOption } from "@/lib/types";
import QuotesView from "./QuotesView";

export const dynamic = "force-dynamic";

export default async function PreventiviPage({
  searchParams,
}: {
  searchParams: { shop?: string };
}) {
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

  // Selettore officina per gli admin senza officina propria.
  let shops: ShopOption[] = [];
  if (isAdmin && !myShopId) {
    const { data } = await supabase
      .from("customers")
      .select("User_ID, User_Name, Town")
      .order("User_Name", { ascending: true });
    shops = data ?? [];
  }

  // Officina attiva: la propria per gli utenti officina, quella selezionata
  // per gli admin.
  const activeShopId: string | null =
    (myShopId as string | null) ||
    (isAdmin ? searchParams.shop ?? null : null);

  let quoteRows: QuoteRow[] = [];
  if (activeShopId) {
    const { data: rows } = await supabase
      .from("util_shop_quotes")
      .select(
        "quote_id, shop_id, vehicle_plate, forfait_code, quantity, unit_price, line_price, created_at"
      )
      .eq("shop_id", activeShopId)
      .order("created_at", { ascending: false });
    quoteRows = (rows ?? []) as QuoteRow[];
  }

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

  // Un utente officina crea sempre per sé (shop_id lato server); un admin
  // crea per l'officina selezionata.
  const canCreate = Boolean(myShopId) || (Boolean(isAdmin) && Boolean(activeShopId));
  const createShopId = myShopId ? null : activeShopId;

  return (
    <QuotesView
      isAdmin={Boolean(isAdmin)}
      shops={shops}
      activeShopId={activeShopId}
      canCreate={canCreate}
      createShopId={createShopId}
      rows={quoteRows}
      labelMap={labelMap}
    />
  );
}
