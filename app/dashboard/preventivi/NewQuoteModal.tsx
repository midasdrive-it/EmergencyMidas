"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatEuro } from "@/lib/money";
import type { Forfait, ItemType, Part, Tire } from "@/lib/types";

type CatalogItem = { code: string; label: string; unit: number };

type CartLine = {
  key: string;
  type: ItemType;
  code: string;
  label: string;
  unit: number;
  quantity: number;
  parentForfait: string | null;
};

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

export default function NewQuoteModal({
  shopId,
  onClose,
  onCreated,
}: {
  shopId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [plate, setPlate] = useState("");
  const [activeTab, setActiveTab] = useState<ItemType>("forfait");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchSeq = useRef(0);

  // Ricerca nel listino della scheda attiva, con debounce.
  useEffect(() => {
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
        // Match sul codice (reference) OPPURE tutti i token nella descrizione.
        const tokens = raw.split(/\s+/).filter(Boolean);
        const codeQ = raw.replace(/\s+/g, "");
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
      } else if (activeTab === "ricambio") {
        // Match sul codice (reference) OPPURE tutti i token nella descrizione.
        const tokens = raw.split(/\s+/).filter(Boolean);
        const codeQ = raw.replace(/\s+/g, "");
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
  }, [search, activeTab]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addItem(item: CatalogItem, type: ItemType) {
    const key = keyOf(type, item.code);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + 1 } : l
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
          quantity: 1,
          parentForfait: null,
        },
      ];
    });
  }

  function setQuantity(key: string, value: string) {
    const n = Math.max(1, Math.floor(Number(value) || 1));
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity: n } : l))
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
      // Se rimuovo un forfait, i suoi annidati tornano sfusi.
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

  // Totale: solo righe di primo livello (gli annidati sono coperti dal forfait).
  const total = lines
    .filter((l) => !l.parentForfait)
    .reduce((sum, l) => sum + l.unit * l.quantity, 0);

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
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_quote", {
      p_vehicle_plate: plate.trim(),
      p_lines: lines.map((l) => ({
        forfait_code: l.code,
        item_type: l.type,
        quantity: l.quantity,
        parent_forfait: l.parentForfait,
      })),
      p_shop_id: shopId,
    });
    if (error) {
      setSaving(false);
      setError(error.message || "Salvataggio non riuscito. Riprova.");
      return;
    }
    onCreated();
  }

  function renderCartLine(l: CartLine, nested: boolean) {
    return (
      <div
        key={l.key}
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

        {l.type !== "forfait" && forfaitLines.length > 0 && (
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

        <input
          type="number"
          min={1}
          step={1}
          value={l.quantity}
          onChange={(e) => setQuantity(l.key, e.target.value)}
          className="w-14 shrink-0 rounded border border-line bg-surface px-2 py-1 text-center text-sm focus:border-brand-dark"
        />

        <span
          className={`w-20 shrink-0 text-right ${
            nested
              ? "text-xs text-muted line-through"
              : "font-medium text-ink"
          }`}
        >
          {formatEuro(l.unit * l.quantity)}
        </span>

        <button
          onClick={() => removeLine(l.key)}
          aria-label="Rimuovi"
          className="w-5 shrink-0 text-muted transition hover:text-rust"
        >
          ✕
        </button>
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
        aria-label="Nuovo preventivo"
        className="my-8 w-full max-w-4xl rounded-lg border border-line bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-ink">
            Nuovo preventivo
          </h2>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:bg-paper hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex flex-col gap-1 sm:max-w-xs">
            <label htmlFor="plate" className="text-xs font-medium text-muted">
              Targa veicolo
            </label>
            <input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ES. AB123CD"
              className={`${inputClass} font-mono uppercase`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Carrello preventivo */}
            <div className="flex flex-col rounded-md border border-line">
              <div className="border-b border-line bg-paper px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Preventivo
              </div>
              <div className="max-h-[46vh] overflow-y-auto">
                {lines.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted">
                    Aggiungi articoli dal catalogo a destra.
                  </p>
                ) : (
                  <>
                    {forfaitLines.map((f) => (
                      <div key={f.key}>
                        {renderCartLine(f, false)}
                        {childrenOf(f.code).map((c) => renderCartLine(c, true))}
                      </div>
                    ))}
                    {looseLines.map((l) => renderCartLine(l, false))}
                  </>
                )}
              </div>
            </div>

            {/* Catalogo con schede */}
            <div className="flex flex-col rounded-md border border-line">
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
                      ? "Cerca marca o misura, es. “michelin 205 55 16”"
                      : "Cerca ricambio per descrizione…"
                  }
                  className={inputClass}
                  autoComplete="off"
                />
                <div className="mt-2 max-h-[38vh] overflow-y-auto">
                  {searching && (
                    <p className="px-1 py-2 text-sm text-muted">Ricerca…</p>
                  )}
                  {!searching &&
                    results.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => addItem(item, activeTab)}
                        className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition hover:bg-brand-tint"
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
                  {!searching &&
                    search.trim().length >= 2 &&
                    results.length === 0 && (
                      <p className="px-1 py-2 text-sm text-muted">
                        Nessun risultato.
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-rust">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-wide text-muted">
              Totale (IVA escl.)
            </span>
            <span className="font-display text-xl font-bold text-ink">
              {formatEuro(total)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-dark hover:bg-brand-tint disabled:opacity-60"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink disabled:opacity-60"
            >
              {saving ? "Salvataggio…" : "Salva preventivo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
