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
  code: string | null;
  label: string;
  unit: number;
  unitStr?: string; // prezzo editabile (righe libere)
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
  { id: "libero", label: "Libero" },
];

const TYPE_TAG: Record<ItemType, string> = {
  forfait: "FOR",
  ricambio: "RIC",
  pneumatico: "PNE",
  libero: "LIB",
};

function parseNum(s: string): number {
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
    return initialLines.map((r) => {
      const isFree = r.item_type === "libero";
      return {
        key: isFree
          ? `libero:${r.id}`
          : `${r.item_type}:${r.forfait_code}`,
        type: r.item_type,
        code: r.forfait_code,
        label: isFree
          ? r.description ?? ""
          : labelMap?.[`${r.item_type}:${r.forfait_code}`] ?? "",
        unit: Number(r.unit_price),
        unitStr: isFree
          ? String(r.unit_price).replace(".", ",")
          : undefined,
        quantity: String(r.quantity).replace(".", ","),
        parentForfait: r.parent_forfait,
      };
    });
  });

  const [activeTab, setActiveTab] = useState<ItemType>("forfait");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [freeDesc, setFreeDesc] = useState("");
  const [freeCode, setFreeCode] = useState("");
  const [freePrice, setFreePrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchSeq = useRef(0);
  const freeSeq = useRef(0);

  const createdAt = initialLines?.[0]?.created_at;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!editing || activeTab === "libero") {
      setResults([]);
      setSearching(false);
      return;
    }
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
      } else if (activeTab === "ricambio") {
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
    const key = `${type}:${item.code}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key
            ? { ...l, quantity: String((parseNum(l.quantity) || 0) + 1) }
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

  function usedCodes(): Set<string> {
    return new Set(
      lines.map((l) => l.code).filter((c): c is string => Boolean(c))
    );
  }

  function nextFreeCode(): string {
    const used = usedCodes();
    let n = 1;
    while (used.has(`LIB-${n}`)) n++;
    return `LIB-${n}`;
  }

  function addFreeLine() {
    const desc = freeDesc.trim();
    const price = parseNum(freePrice);
    if (!desc) {
      setError("Inserisci una descrizione per la riga libera.");
      return;
    }
    if (!isFinite(price) || price < 0) {
      setError("Prezzo non valido per la riga libera.");
      return;
    }
    const code = freeCode.trim() || nextFreeCode();
    if (usedCodes().has(code)) {
      setError(`Codice "${code}" già usato nel preventivo.`);
      return;
    }
    setError(null);
    const key = `libero:new:${++freeSeq.current}`;
    setLines((prev) => [
      ...prev,
      {
        key,
        type: "libero",
        code,
        label: desc,
        unit: price,
        unitStr: freePrice.trim(),
        quantity: "1",
        parentForfait: null,
      },
    ]);
    setFreeDesc("");
    setFreeCode("");
    setFreePrice("");
  }

  function patchLine(key: string, patch: Partial<CartLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => {
      const line = prev.find((l) => l.key === key);
      let next = prev.filter((l) => l.key !== key);
      // Se rimuovo un contenitore, i suoi articoli annidati tornano sfusi.
      if (line?.code) {
        next = next.map((l) =>
          l.parentForfait === line.code ? { ...l, parentForfait: null } : l
        );
      }
      return next;
    });
  }

  const unitOf = (l: CartLine) =>
    l.type === "libero" ? parseNum(l.unitStr ?? "") || 0 : l.unit;

  const topLevel = lines.filter((l) => !l.parentForfait);
  const childrenOf = (code: string | null) =>
    code ? lines.filter((l) => l.parentForfait === code) : [];
  // Contenitori disponibili per l'annidamento: forfait e righe libere di
  // primo livello (con codice).
  const parentCandidates = lines.filter(
    (l) =>
      !l.parentForfait && l.code && (l.type === "forfait" || l.type === "libero")
  );

  const net = lines
    .filter((l) => !l.parentForfait)
    .reduce((s, l) => s + unitOf(l) * (parseNum(l.quantity) || 0), 0);
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
      const q = parseNum(l.quantity);
      if (!isFinite(q) || q <= 0) {
        setError(`Quantità non valida per "${l.label || l.code}".`);
        return;
      }
      if (l.type === "libero") {
        if (!l.label.trim()) {
          setError("Una riga libera è senza descrizione.");
          return;
        }
        const u = parseNum(l.unitStr ?? "");
        if (!isFinite(u) || u < 0) {
          setError(`Prezzo non valido per "${l.label}".`);
          return;
        }
      }
    }
    setSaving(true);
    const supabase = createClient();
    const payloadLines = lines.map((l) =>
      l.type === "libero"
        ? {
            item_type: "libero",
            forfait_code: l.code,
            description: l.label.trim(),
            unit_price: unitOf(l),
            quantity: parseNum(l.quantity),
            parent_forfait: l.parentForfait,
          }
        : {
            item_type: l.type,
            forfait_code: l.code,
            quantity: parseNum(l.quantity),
            parent_forfait: l.parentForfait,
          }
    );

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
    const isFree = l.type === "libero";
    const hasChildren = l.code
      ? lines.some((x) => x.parentForfait === l.code)
      : false;
    const parentOptions = parentCandidates.filter((p) => p.key !== l.key);
    const showParent =
      editing && l.type !== "forfait" && !hasChildren && parentOptions.length > 0;
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
          {editing && isFree ? (
            <>
              <input
                value={l.label}
                onChange={(e) => patchLine(l.key, { label: e.target.value })}
                placeholder="Descrizione"
                className="w-full rounded border border-line bg-surface px-2 py-1 text-sm focus:border-brand-dark"
              />
              {l.code && (
                <p className="mt-0.5 font-mono text-[10px] text-muted">
                  {l.code}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="truncate text-ink" title={l.label}>
                {nested ? "↳ " : ""}
                {l.label || l.code}
              </p>
              {l.code && (
                <p className="font-mono text-[11px] text-muted">{l.code}</p>
              )}
            </>
          )}
        </div>

        {showParent && (
          <select
            value={l.parentForfait ?? ""}
            onChange={(e) =>
              patchLine(l.key, { parentForfait: e.target.value || null })
            }
            title="Annida in un forfait o in una voce libera"
            className="max-w-[7rem] shrink-0 rounded border border-line bg-surface px-1 py-1 text-[11px] text-ink focus:border-brand-dark"
          >
            <option value="">Sfuso</option>
            {parentOptions.map((p) => (
              <option key={p.key} value={p.code as string}>
                In: {p.code}
              </option>
            ))}
          </select>
        )}

        {/* Prezzo unitario */}
        {editing && isFree ? (
          <input
            type="text"
            inputMode="decimal"
            value={l.unitStr ?? ""}
            onChange={(e) => patchLine(l.key, { unitStr: e.target.value })}
            placeholder="€"
            className="w-20 shrink-0 rounded border border-line bg-surface px-2 py-1 text-right text-sm focus:border-brand-dark"
          />
        ) : (
          <span className="w-20 shrink-0 text-right text-xs text-muted tabular-nums">
            {formatEuro(unitOf(l))}
          </span>
        )}

        {/* Quantità */}
        {editing ? (
          <input
            type="text"
            inputMode="decimal"
            value={l.quantity}
            onChange={(e) => patchLine(l.key, { quantity: e.target.value })}
            className="w-14 shrink-0 rounded border border-line bg-surface px-2 py-1 text-center text-sm focus:border-brand-dark"
          />
        ) : (
          <span className="w-14 shrink-0 text-center text-sm text-ink tabular-nums">
            {l.quantity}
          </span>
        )}

        {/* Importo */}
        <span
          className={`w-20 shrink-0 text-right tabular-nums ${
            nested ? "text-xs text-muted line-through" : "font-medium text-ink"
          }`}
        >
          {formatEuro(unitOf(l) * (parseNum(l.quantity) || 0))}
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
        <div className="flex items-start justify-between gap-4 border-b-2 border-brand px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <div>
              <p className="font-display text-lg font-bold uppercase leading-tight tracking-tight text-ink">
                {shopName}
              </p>
              {shop?.User_Name && shop.User_Name !== shopName && (
                <p className="text-[11px] leading-tight text-ink/70">
                  {shop.User_Name}
                </p>
              )}
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
                {activeTab === "libero" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={freeDesc}
                      onChange={(e) => setFreeDesc(e.target.value)}
                      placeholder="Descrizione voce libera"
                      className={inputClass}
                    />
                    <input
                      value={freeCode}
                      onChange={(e) => setFreeCode(e.target.value)}
                      placeholder="Codice (opz.)"
                      title="Lascia vuoto per un codice automatico (LIB-n)"
                      className={`${inputClass} font-mono sm:w-32`}
                    />
                    <input
                      value={freePrice}
                      onChange={(e) => setFreePrice(e.target.value)}
                      inputMode="decimal"
                      placeholder="Prezzo €"
                      className={`${inputClass} sm:w-28`}
                    />
                    <button
                      onClick={addFreeLine}
                      className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink"
                    >
                      Aggiungi
                    </button>
                  </div>
                ) : (
                  <>
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
                          <p className="px-3 py-2 text-sm text-muted">
                            Ricerca…
                          </p>
                        )}
                        {!searching &&
                          results.map((item) => (
                            <button
                              key={item.code}
                              onClick={() => addItem(item, activeTab)}
                              className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-brand-tint"
                            >
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate text-ink"
                                  title={item.label}
                                >
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
                  </>
                )}
              </div>
            </div>
          )}

          <div className="rounded-md border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              <span className="w-8 shrink-0" />
              <span className="min-w-0 flex-1">Articolo</span>
              <span className="w-20 shrink-0 text-right">Prezzo</span>
              <span className="w-14 shrink-0 text-center">Q.tà</span>
              <span className="w-20 shrink-0 text-right">Importo</span>
              {editing && <span className="w-5 shrink-0" />}
            </div>
            {lines.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                {editing
                  ? "Aggiungi articoli dal catalogo o una voce libera."
                  : "Nessun articolo."}
              </p>
            ) : (
              <>
                {topLevel.map((top) => (
                  <div key={top.key}>
                    <DocLine l={top} nested={false} />
                    {childrenOf(top.code).map((c) => (
                      <DocLine key={c.key} l={c} nested />
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

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
