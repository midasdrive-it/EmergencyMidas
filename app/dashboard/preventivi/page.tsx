import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow, ShopHeader, ShopOption } from "@/lib/types";
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
        "id, quote_id, shop_id, vehicle_plate, item_type, forfait_code, description, parent_forfait, quantity, unit_price, line_price, created_at"
      )
      .eq("shop_id", activeShopId)
      .order("created_at", { ascending: false });
    quoteRows = (rows ?? []) as QuoteRow[];
  }

  // Etichette degli articoli per la visualizzazione, per tipo. La chiave è
  // "<item_type>:<codice>" per evitare collisioni fra listini diversi.
  const labelMap: Record<string, string> = {};

  const forfaitCodes = Array.from(
    new Set(
      quoteRows
        .filter((r) => r.item_type === "forfait")
        .map((r) => r.forfait_code)
        .filter((c): c is string => Boolean(c))
    )
  );
  if (forfaitCodes.length > 0) {
    const { data: forfaits } = await supabase
      .from("util_forfait_fixed")
      .select("code_reference, label_reference")
      .in("code_reference", forfaitCodes);
    for (const f of forfaits ?? []) {
      labelMap[`forfait:${f.code_reference}`] = f.label_reference ?? "";
    }
  }

  const tireCodes = Array.from(
    new Set(
      quoteRows
        .filter((r) => r.item_type === "pneumatico")
        .map((r) => r.forfait_code)
        .filter((c): c is string => Boolean(c))
    )
  );
  if (tireCodes.length > 0) {
    const { data: tires } = await supabase
      .from("util_prix_sale_tires")
      .select("reference, libelle")
      .in("reference", tireCodes);
    for (const t of tires ?? []) {
      labelMap[`pneumatico:${t.reference}`] = t.libelle ?? "";
    }
  }

  const partCodes = Array.from(
    new Set(
      quoteRows
        .filter((r) => r.item_type === "ricambio")
        .map((r) => r.forfait_code)
        .filter((c): c is string => Boolean(c))
    )
  );
  if (partCodes.length > 0) {
    const { data: parts } = await supabase
      .from("util_prix_sale_parts")
      .select("reference, description")
      .in("reference", partCodes);
    for (const p of parts ?? []) {
      labelMap[`ricambio:${p.reference}`] = p.description ?? "";
    }
  }

  // Dati officina attiva per l'intestazione (stile PDF) del modale.
  let shop: ShopHeader | null = null;
  if (activeShopId) {
    const { data } = await supabase
      .from("customers")
      .select(
        'User_ID, User_Name, Legal_Name, Address, Town, Province, Postal_Code, VAT_Code, Mail'
      )
      .eq("User_ID", activeShopId)
      .maybeSingle();
    shop = (data as ShopHeader) ?? null;
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
      shop={shop}
      rows={quoteRows}
      labelMap={labelMap}
    />
  );
}
