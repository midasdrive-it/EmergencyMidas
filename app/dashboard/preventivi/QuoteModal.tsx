"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatEuro } from "@/lib/money";
import Logo from "@/components/Logo";
import type { Forfait, ItemType, Part, QuoteRow, ShopHeader, Tire } from "@/lib/types";

type CatalogItem = { code: string; label: string; unit: number };

type CartLine = {
  key: string;
  type: ItemType;
  code: string;
  label: string;
  unit: number;
  quantity: string;
  parentForfait: string | null;
};

const VAT_RATE = 0.22;

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-dark";

const TABS: { id: ItemType; label: string }[] = [
  { id: "forfait", label: "Forfait" },
  { id: "ricambio", label: "Ricambi" },
  { id: "pneumatico", label: "Pneumatici" },
];

const TYPE_TAG: Record<ItemType, string> = {
  forfait: "FOR",
  ricambio: "RIC",
  pneumatico: "PNE",
};

function keyOf(type: ItemType, code: string) {
  return `${type}:${code}`;
}

function parseQty(s: string): number {
  return Number(String(s).replace(",", "."));
}

export default function QuoteModal({
  mode,
  shopId,
  shop,
  quoteId,
  initialLines,
  labelMap,
  onClose,
  onSaved,
}: {
  mode: "create" | "view";
  shopId: string | null;
  shop: ShopHeader | null;
  quoteId?: string;
  initialLines?: QuoteRow[];
  labelMap?: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(mode === "create");
  const [plate, setPlate] = useState(
    mode === "create" ? "" : initialLines?.[0]?.vehicle_plate ?? ""
  );
  const [lines, setLines] = useState<CartLine[]>(() => {
    if (mode === "create" || !initialLines) return [];
    return initialLines.map((r) => ({
      key: keyOf(r.item_type, r.forfait_code),
      type: r.item_type,
      code: r.forfait_code,
      label: labelMap?.[`${r.item_type}:${r.forfait_code}`] ?? "",
      unit: Number(r.unit_price),
      quantity: String(r.quantity).replace(".", ","),
      parentForfait: r.parent_forfait,
    }));
  });

  const [activeTab, setActiveTab] = useState<ItemType>("forfait");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  const createdAt = initialLines?.[0]?.created_at;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!editing) return;
    const raw = search.replace(/[,()*%:]/g, " ").trim();
    if (raw.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const tokens = raw.split(/\s+/).filter(Boolean);
      const codeQ = raw.replace(/\s+/g, "");
      let items: CatalogItem[] = [];

      if (activeTab === "forfait") {
        const { data } = await supabase
          .from("util_forfait_fixed")
          .select("code_reference, label_reference, price")
          .or(`code_reference.ilike.*${raw}*,label_reference.ilike.*${raw}*`)
          .not("price", "is", null)
          .order("code_reference")
          .limit(20);
        items = ((data as Forfait[]) ?? []).map((f) => ({
          code: f.code_reference,
          label: f.label_reference ?? "",
          unit: Number(f.price ?? 0),
        }));
      } else if (activeTab === "pneumatico") {
        const descCond =
          tokens.length > 1
            ? `and(${tokens.map((t) => `libelle.ilike.*${t}*`).join(",")})`
            : `libelle.ilike.*${tokens[0]}*`;
        const { data } = await supabase
          .from("util_prix_sale_tires")
          .select("reference, libelle, prix_vente")
          .not("prix_vente", "is", null)
          .neq("prix_vente", "")
          .neq("prix_vente", "0")
          .or(`reference.ilike.*${codeQ}*,${descCond}`)
          .limit(20);
        items = ((data as Tire[]) ?? []).map((t) => ({
          code: t.reference,
          label: t.libelle ?? "",
          unit: Number(t.prix_vente ?? 0),
        }));
      } else {
        const descCond =
          tokens.length > 1
            ? `and(${tokens.map((t) => `description.ilike.*${t}*`).join(",")})`
            : `description.ilike.*${tokens[0]}*`;
        const { data } = await supabase
          .from("util_prix_sale_parts")
          .select("reference, description, pv")
          .not("pv", "is", null)
          .gt("pv", 0)
          .or(`reference.ilike.*${codeQ}*,${descCond}`)
          .limit(20);
        items = ((data as Part[]) ?? []).map((p) => ({
          code: p.reference,
          label: p.description ?? "",
          unit: Number(p.pv ?? 0),
        }));
      }

      if (seq !== searchSeq.current) return;
      setResults(items);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, activeTab, editing]);

  function addItem(item: CatalogItem, type: ItemType) {
    const key = keyOf(type, item.code);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key
            ? { ...l, quantity: String(parseQty(l.quantity) + 1 || 1) }
            : l
        );
      }
      return [
        ...prev,
        {
          key,
          type,
          code: item.code,
          label: item.label,
          unit: item.unit,
          quantity: "1",
          parentForfait: null,
        },
      ];
    });
  }

  function setQuantity(key: string, value: string) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity: value } : l))
    );
  }

  function setParent(key: string, parent: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, parentForfait: parent || null } : l
      )
    );
  }

  function removeLine(key: string) {
    setLines((prev) => {
      const line = prev.find((l) => l.key === key);
      let next = prev.filter((l) => l.key !== key);
      if (line?.type === "forfait") {
        next = next.map((l) =>
          l.parentForfait === line.code ? { ...l, parentForfait: null } : l
        );
      }
      return next;
    });
  }

  const forfaitLines = lines.filter((l) => l.type === "forfait");
  const looseLines = lines.filter(
    (l) => l.type !== "forfait" && !l.parentForfait
  );
  const childrenOf = (code: string) =>
    lines.filter((l) => l.parentForfait === code);

  const net = lines
    .filter((l) => !l.parentForfait)
    .reduce((s, l) => s + l.unit * (parseQty(l.quantity) || 0), 0);
  const vat = net * VAT_RATE;
  const gross = net + vat;

  const shopName = shop?.Legal_Name || shop?.User_Name || shopId || "Officina";

  async function handleSave() {
    setError(null);
    if (plate.trim().length === 0) {
      setError("Inserisci la targa del veicolo.");
      return;
    }
    if (lines.length === 0) {
      setError("Aggiungi almeno una linea al preventivo.");
      return;
    }
    for (const l of lines) {
      const q = parseQty(l.quantity);
      if (!isFinite(q) || q <= 0) {
        setError(`Quantità non valida per ${l.code}.`);
        return;
      }
    }
    setSaving(true);
    const supabase = createClient();
    const payloadLines = lines.map((l) => ({
      forfait_code: l.code,
      item_type: l.type,
      quantity: parseQty(l.quantity),
      parent_forfait: l.parentForfait,
    }));

    const { error } =
      mode === "create" || !quoteId
        ? await supabase.rpc("create_quote", {
            p_vehicle_plate: plate.trim(),
            p_lines: payloadLines,
            p_shop_id: shopId,
          })
        : await supabase.rpc("update_quote", {
            p_quote_id: quoteId,
            p_vehicle_plate: plate.trim(),
            p_lines: payloadLines,
          });

    if (error) {
      setSaving(false);
      setError(error.message || "Salvataggio non riuscito. Riprova.");
      return;
    }
    onSaved();
  }

  function DocLine({ l, nested }: { l: CartLine; nested: boolean }) {
    return (
      <div
        className={`flex items-center gap-2 border-b border-line px-3 py-2 text-sm last:border-b-0 ${
          nested ? "bg-paper/50 pl-6" : ""
        }`}
      >
        <span className="shrink-0 rounded bg-line px-1 py-0.5 text-[9px] font-semibold tracking-wide text-muted">
          {TYPE_TAG[l.type]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-ink" title={l.label}>
            {nested ? "↳ " : ""}
            {l.label || l.code}
          </p>
          <p className="font-mono text-[11px] text-muted">{l.code}</p>
        </div>

        {editing && l.type !== "forfait" && forfaitLines.length > 0 && (
          <select
            value={l.parentForfait ?? ""}
            onChange={(e) => setParent(l.key, e.target.value)}
            title="Annida in un forfait"
            className="max-w-[7rem] shrink-0 rounded border border-line bg-surface px-1 py-1 text-[11px] text-ink focus:border-brand-dark"
          >
            <option value="">Sfuso</option>
            {forfaitLines.map((f) => (
              <option key={f.code} value={f.code}>
                In: {f.code}
              </option>
            ))}
          </select>
        )}

        {editing ? (
          <input
            type="text"
            inputMode="decimal"
            value={l.quantity}
            onChange={(e) => setQuantity(l.key, e.target.value)}
            className="w-16 shrink-0 rounded border border-line bg-surface px-2 py-1 text-center text-sm focus:border-brand-dark"
          />
        ) : (
          <span className="w-16 shrink-0 text-center text-sm text-ink tabular-nums">
            {l.quantity}
          </span>
        )}

        <span className="hidden w-20 shrink-0 text-right text-xs text-muted tabular-nums sm:block">
          {formatEuro(l.unit)}
        </span>

        <span
          className={`w-20 shrink-0 text-right tabular-nums ${
            nested ? "text-xs text-muted line-through" : "font-medium text-ink"
          }`}
        >
          {formatEuro(l.unit * (parseQty(l.quantity) || 0))}
        </span>

        {editing && (
          <button
            onClick={() => removeLine(l.key)}
            aria-label="Rimuovi"
            className="w-5 shrink-0 text-muted transition hover:text-rust"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Preventivo"
        className="my-8 w-full max-w-3xl rounded-lg border border-line bg-surface shadow-lg"
      >
        {/* Intestazione stile documento */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-brand px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <div>
              <p className="font-display text-lg font-bold uppercase leading-tight tracking-tight text-ink">
                {shopName}
              </p>
              <p className="text-[11px] leading-tight text-muted">
                {[shop?.Postal_Code, shop?.Town].filter(Boolean).join(" ")}
                {shop?.Province ? ` (${shop.Province})` : ""}
                {shop?.VAT_Code ? ` · P.IVA ${shop.VAT_Code}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold uppercase tracking-tight text-ink">
              Preventivo
            </p>
            {quoteId && (
              <p className="font-mono text-[11px] text-muted">{quoteId}</p>
            )}
            {createdAt && (
              <p className="text-[11px] text-muted">
                {new Intl.DateTimeFormat("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  timeZone: "Europe/Rome",
                }).format(new Date(createdAt))}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          {/* Targa */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Veicolo
            </span>
            {editing ? (
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="TARGA"
                className={`${inputClass} w-40 font-mono uppercase`}
              />
            ) : (
              <span className="plate-badge px-1 font-mono text-sm font-semibold">
                {plate}
              </span>
            )}
          </div>

          {/* Aggiungi articoli (solo in modifica) */}
          {editing && (
            <div className="mb-4 rounded-md border border-line">
              <div className="flex border-b border-line">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearch("");
                      setResults([]);
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-brand-tint text-ink"
                        : "text-muted hover:bg-paper hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeTab === "forfait"
                      ? "Cerca codice o descrizione…"
                      : activeTab === "pneumatico"
                      ? "Cerca codice, marca o misura…"
                      : "Cerca codice o descrizione ricambio…"
                  }
                  className={inputClass}
                  autoComplete="off"
                />
                {(searching || results.length > 0) && (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded border border-line">
                    {searching && (
                      <p className="px-3 py-2 text-sm text-muted">Ricerca…</p>
                    )}
                    {!searching &&
                      results.map((item) => (
                        <button
                          key={item.code}
                          onClick={() => addItem(item, activeTab)}
                          className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-brand-tint"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-ink" title={item.label}>
                              {item.label}
                            </p>
                            <p className="font-mono text-[11px] text-muted">
                              {item.code}
                            </p>
                          </div>
                          <span className="shrink-0 font-medium text-ink">
                            {formatEuro(item.unit)}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Righe */}
          <div className="rounded-md border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              <span className="w-8 shrink-0" />
              <span className="min-w-0 flex-1">Articolo</span>
              <span className="w-16 shrink-0 text-center">Q.tà</span>
              <span className="hidden w-20 shrink-0 text-right sm:block">
                Prezzo
              </span>
              <span className="w-20 shrink-0 text-right">Importo</span>
              {editing && <span className="w-5 shrink-0" />}
            </div>
            {lines.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                {editing
                  ? "Aggiungi articoli dal catalogo qui sopra."
                  : "Nessun articolo."}
              </p>
            ) : (
              <>
                {forfaitLines.map((f) => (
                  <div key={f.key}>
                    <DocLine l={f} nested={false} />
                    {childrenOf(f.code).map((c) => (
                      <DocLine key={c.key} l={c} nested />
                    ))}
                  </div>
                ))}
                {looseLines.map((l) => (
                  <DocLine key={l.key} l={l} nested={false} />
                ))}
              </>
            )}
          </div>

          {/* Totali */}
          <div className="mt-4 flex justify-end">
            <table className="text-sm tabular-nums">
              <tbody>
                <tr>
                  <td className="py-0.5 pr-8 text-muted">Imponibile</td>
                  <td className="py-0.5 text-right font-medium">
                    {formatEuro(net)}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-8 text-muted">IVA (22%)</td>
                  <td className="py-0.5 text-right font-medium">
                    {formatEuro(vat)}
                  </td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-1 pr-8 font-display text-base font-bold uppercase">
                    Totale
                  </td>
                  <td className="py-1 text-right font-display text-base font-bold">
                    {formatEuro(gross)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {error && <p className="mt-3 text-sm text-rust">{error}</p>}
        </div>

        {/* Footer azioni */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-dark hover:bg-brand-tint disabled:opacity-60"
          >
            {editing && mode === "create" ? "Annulla" : "Chiudi"}
          </button>

          <div className="flex items-center gap-2">
            {!editing && quoteId && (
              <>
                <a
                  href={`/preventivi/${encodeURIComponent(quoteId)}/stampa`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-dark hover:bg-brand-tint"
                >
                  Stampa PDF
                </a>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink"
                >
                  Modifica
                </button>
              </>
            )}
            {editing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink disabled:opacity-60"
              >
                {saving
                  ? "Salvataggio…"
                  : mode === "create"
                  ? "Salva preventivo"
                  : "Salva modifiche"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
