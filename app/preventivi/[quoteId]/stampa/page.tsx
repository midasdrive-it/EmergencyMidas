import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/money";
import type { QuoteRow } from "@/lib/types";
import Logo from "@/components/Logo";
import PrintToolbar from "./PrintToolbar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { quoteId: string };
}) {
  const quoteId = decodeURIComponent(params.quoteId);
  // Sostituisce il titolo di pagina (mostrato dal browser nell'intestazione
  // di stampa al posto di "Emergency Midas").
  return { title: `Preventivo ${quoteId}` };
}

const VAT_RATE = 0.22;

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function StampaPreventivoPage({
  params,
}: {
  params: { quoteId: string };
}) {
  const quoteId = decodeURIComponent(params.quoteId);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("util_shop_quotes")
    .select(
      "id, quote_id, shop_id, vehicle_plate, item_type, forfait_code, description, parent_forfait, quantity, unit_price, line_price, created_at"
    )
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  const lines = (rows ?? []) as QuoteRow[];

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold uppercase text-ink">
          Preventivo non trovato
        </h1>
        <p className="mt-3 text-sm text-muted">
          Il preventivo richiesto non esiste o non è accessibile.
        </p>
      </main>
    );
  }

  const shopId = lines[0].shop_id;
  const { data: shop } = await supabase
    .from("customers")
    .select(
      'User_ID, User_Name, Legal_Name, Address, Town, Province, Postal_Code, VAT_Code, Mail'
    )
    .eq("User_ID", shopId)
    .maybeSingle();

  // Etichette articoli per tipo.
  const labelMap: Record<string, string> = {};
  const byType = (t: string) =>
    Array.from(
      new Set(
        lines
          .filter((l) => l.item_type === t)
          .map((l) => l.forfait_code)
          .filter((c): c is string => Boolean(c))
      )
    );

  const forfaitCodes = byType("forfait");
  if (forfaitCodes.length > 0) {
    const { data } = await supabase
      .from("util_forfait_fixed")
      .select("code_reference, label_reference")
      .in("code_reference", forfaitCodes);
    for (const f of data ?? [])
      labelMap[`forfait:${f.code_reference}`] = f.label_reference ?? "";
  }
  const tireCodes = byType("pneumatico");
  if (tireCodes.length > 0) {
    const { data } = await supabase
      .from("util_prix_sale_tires")
      .select("reference, libelle")
      .in("reference", tireCodes);
    for (const t of data ?? [])
      labelMap[`pneumatico:${t.reference}`] = t.libelle ?? "";
  }
  const partCodes = byType("ricambio");
  if (partCodes.length > 0) {
    const { data } = await supabase
      .from("util_prix_sale_parts")
      .select("reference, description")
      .in("reference", partCodes);
    for (const p of data ?? [])
      labelMap[`ricambio:${p.reference}`] = p.description ?? "";
  }

  const labelOf = (l: QuoteRow) =>
    l.item_type === "libero" || l.item_type === "sconto"
      ? l.description ?? ""
      : labelMap[`${l.item_type}:${l.forfait_code}`] ?? "";

  const topLevel = lines.filter((l) => !l.parent_forfait);
  const childrenOf = (code: string) =>
    lines.filter((l) => l.parent_forfait === code);

  const net = topLevel.reduce((s, l) => s + Number(l.line_price), 0);
  const vat = net * VAT_RATE;
  const gross = net + vat;

  const plate = lines[0].vehicle_plate;
  const shopName = shop?.Legal_Name || shop?.User_Name || shopId;

  function Row({ line, nested }: { line: QuoteRow; nested: boolean }) {
    return (
      <tr className={nested ? "text-muted" : "text-ink"}>
        <td className="border-b border-line py-1.5 pr-2 align-top font-mono text-[11px]">
          {nested ? "↳ " : ""}
          {line.forfait_code ?? ""}
        </td>
        <td className="border-b border-line py-1.5 pr-2 align-top">
          {labelOf(line) || "—"}
        </td>
        <td className="border-b border-line py-1.5 pr-2 text-right align-top tabular-nums">
          {line.item_type === "sconto" ? "—" : Number(line.quantity)}
        </td>
        <td className="border-b border-line py-1.5 pr-2 text-right align-top tabular-nums">
          {formatEuro(line.unit_price)}
        </td>
        <td className="border-b border-line py-1.5 text-right align-top tabular-nums">
          {nested ? (
            <span className="line-through">{formatEuro(line.line_price)}</span>
          ) : (
            <span className="font-medium">{formatEuro(line.line_price)}</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <main className="mx-auto max-w-3xl bg-surface px-6 py-8 text-ink sm:px-10">
      <PrintToolbar />

      {/* Intestazione */}
      <div className="print-exact flex items-start justify-between gap-6 border-b-2 border-brand pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Logo className="h-9 w-9 print-exact" />
            <div>
              <span className="block font-display text-xl font-bold uppercase tracking-tight">
                {shopName}
              </span>
              {shop?.User_Name && shop.User_Name !== shopName && (
                <span className="block text-xs text-ink/70">
                  {shop.User_Name}
                </span>
              )}
            </div>
          </div>
          <div className="text-xs leading-relaxed text-ink/80">
            {shop?.Address && <p>{shop.Address}</p>}
            <p>
              {[shop?.Postal_Code, shop?.Town].filter(Boolean).join(" ")}
              {shop?.Province ? ` (${shop.Province})` : ""}
            </p>
            {shop?.VAT_Code && <p>P. IVA {shop.VAT_Code}</p>}
            {shop?.Mail && <p>{shop.Mail}</p>}
          </div>
        </div>

        <div className="text-right">
          <p className="font-display text-2xl font-bold uppercase tracking-tight">
            Preventivo
          </p>
          <p className="mt-1 font-mono text-xs text-muted">{quoteId}</p>
          <p className="mt-1 text-xs text-ink/80">
            {formatDateTime(lines[0].created_at)}
          </p>
          <p className="mt-2 text-sm">
            <span className="text-muted">Veicolo: </span>
            <span className="font-mono font-semibold">{plate}</span>
          </p>
        </div>
      </div>

      {/* Righe */}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="border-b-2 border-line py-1.5 pr-2 font-semibold">
              Codice
            </th>
            <th className="border-b-2 border-line py-1.5 pr-2 font-semibold">
              Descrizione
            </th>
            <th className="border-b-2 border-line py-1.5 pr-2 text-right font-semibold">
              Q.tà
            </th>
            <th className="border-b-2 border-line py-1.5 pr-2 text-right font-semibold">
              Prezzo
            </th>
            <th className="border-b-2 border-line py-1.5 text-right font-semibold">
              Importo
            </th>
          </tr>
        </thead>
        <tbody>
          {topLevel.flatMap((line) => [
            <Row key={`t-${line.id}`} line={line} nested={false} />,
            ...(line.forfait_code
              ? childrenOf(line.forfait_code).map((child) => (
                  <Row key={`c-${child.id}`} line={child} nested />
                ))
              : []),
          ])}
        </tbody>
      </table>

      {/* Totali */}
      <div className="mt-6 flex justify-end">
        <table className="text-sm">
          <tbody className="tabular-nums">
            <tr>
              <td className="py-1 pr-8 text-muted">Imponibile</td>
              <td className="py-1 text-right font-medium">{formatEuro(net)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-8 text-muted">IVA (22%)</td>
              <td className="py-1 text-right font-medium">{formatEuro(vat)}</td>
            </tr>
            <tr className="border-t-2 border-line">
              <td className="py-1.5 pr-8 font-display text-base font-bold uppercase">
                Totale
              </td>
              <td className="py-1.5 text-right font-display text-base font-bold">
                {formatEuro(gross)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Firme */}
      <div className="mt-16 grid grid-cols-2 gap-10 break-inside-avoid">
        <div className="pt-14">
          <div className="border-t border-ink pt-1.5 text-xs text-ink/80">
            Firma addetto Midas
          </div>
        </div>
        <div className="pt-14">
          <div className="border-t border-ink pt-1.5 text-xs text-ink/80">
            Firma Cliente
          </div>
        </div>
      </div>

      <p className="mt-8 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
        Preventivo indicativo, valido salvo verifica e disponibilità. Prezzi in
        Euro. L&apos;IVA è calcolata in via approssimativa al 22%. Gli articoli
        inclusi in un forfait (prezzo barrato) sono compresi nel prezzo del
        forfait stesso.
        <br />
        Documento prodotto utilizzando un software di backup, a causa di
        un&apos;indisponibilità temporanea del gestionale ufficiale EMidas.
      </p>
    </main>
  );
}
