"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatEuro } from "@/lib/money";
import type { Forfait } from "@/lib/types";

type Line = {
  code: string;
  label: string;
  unit: number;
  quantity: number;
};

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-dark";

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
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Forfait[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchSeq = useRef(0);

  // Ricerca forfait con debounce su codice o descrizione.
  useEffect(() => {
    const q = search.replace(/[,()*%:]/g, " ").trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("util_forfait_fixed")
        .select("code_reference, label_reference, price")
        .or(`code_reference.ilike.*${q}*,label_reference.ilike.*${q}*`)
        .not("price", "is", null)
        .order("code_reference")
        .limit(20);
      if (seq !== searchSeq.current) return; // risultato obsoleto
      setResults((data as Forfait[]) ?? []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addForfait(f: Forfait) {
    const unit = Number(f.price ?? 0);
    setLines((prev) => {
      const existing = prev.find((l) => l.code === f.code_reference);
      if (existing) {
        return prev.map((l) =>
          l.code === f.code_reference ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          code: f.code_reference,
          label: f.label_reference ?? "",
          unit,
          quantity: 1,
        },
      ];
    });
    setSearch("");
    setResults([]);
  }

  function setQuantity(code: string, value: string) {
    const n = Math.max(1, Math.floor(Number(value) || 1));
    setLines((prev) =>
      prev.map((l) => (l.code === code ? { ...l, quantity: n } : l))
    );
  }

  function removeLine(code: string) {
    setLines((prev) => prev.filter((l) => l.code !== code));
  }

  const total = lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);

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
        quantity: l.quantity,
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
        className="my-8 w-full max-w-2xl rounded-lg border border-line bg-surface shadow-lg"
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

        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Targa */}
          <div className="flex flex-col gap-1">
            <label htmlFor="plate" className="text-xs font-medium text-muted">
              Targa veicolo
            </label>
            <input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ES. AB123CD"
              className={`${inputClass} font-mono uppercase sm:w-56`}
            />
          </div>

          {/* Ricerca forfait */}
          <div className="flex flex-col gap-1">
            <label htmlFor="forfait" className="text-xs font-medium text-muted">
              Aggiungi forfait (cerca per codice o descrizione)
            </label>
            <div className="relative">
              <input
                id="forfait"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Es. CLE_010403 oppure “pulizia fap”"
                className={inputClass}
                autoComplete="off"
              />
              {(searching || results.length > 0) && (
                <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-lg">
                  {searching && (
                    <p className="px-3 py-2 text-sm text-muted">Ricerca…</p>
                  )}
                  {!searching &&
                    results.map((f) => (
                      <button
                        key={f.code_reference}
                        onClick={() => addForfait(f)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-brand-tint"
                      >
                        <span className="w-32 shrink-0 font-mono text-xs text-ink">
                          {f.code_reference}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-ink">
                          {f.label_reference}
                        </span>
                        <span className="shrink-0 font-medium text-ink">
                          {formatEuro(f.price)}
                        </span>
                      </button>
                    ))}
                  {!searching && results.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted">
                      Nessun forfait trovato.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Linee */}
          <div className="rounded-md border border-line">
            <div className="flex items-center gap-3 border-b border-line bg-paper px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span className="w-32 shrink-0">Codice</span>
              <span className="min-w-0 flex-1">Descrizione</span>
              <span className="w-16 shrink-0 text-center">Q.tà</span>
              <span className="w-24 shrink-0 text-right">Prezzo</span>
              <span className="w-24 shrink-0 text-right">Totale</span>
              <span className="w-6 shrink-0" />
            </div>

            {lines.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                Nessuna linea. Cerca un forfait qui sopra per aggiungerlo.
              </p>
            ) : (
              lines.map((l) => (
                <div
                  key={l.code}
                  className="flex items-center gap-3 border-b border-line px-3 py-2 text-sm last:border-b-0"
                >
                  <span className="w-32 shrink-0 font-mono text-xs text-ink">
                    {l.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {l.label}
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={l.quantity}
                    onChange={(e) => setQuantity(l.code, e.target.value)}
                    className="w-16 shrink-0 rounded border border-line bg-surface px-2 py-1 text-center text-sm focus:border-brand-dark"
                  />
                  <span className="w-24 shrink-0 text-right text-muted">
                    {formatEuro(l.unit)}
                  </span>
                  <span className="w-24 shrink-0 text-right font-medium text-ink">
                    {formatEuro(l.unit * l.quantity)}
                  </span>
                  <button
                    onClick={() => removeLine(l.code)}
                    aria-label="Rimuovi linea"
                    className="w-6 shrink-0 text-muted transition hover:text-rust"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {error && <p className="text-sm text-rust">{error}</p>}
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
