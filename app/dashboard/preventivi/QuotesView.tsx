"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { QuoteRow, ShopOption } from "@/lib/types";
import { formatEuro } from "@/lib/money";
import NewQuoteModal from "./NewQuoteModal";

type QuoteGroup = {
  quoteId: string;
  vehiclePlate: string;
  createdAt: string;
  shopId: string;
  lines: QuoteRow[];
  total: number;
};

function groupQuotes(rows: QuoteRow[]): QuoteGroup[] {
  const map = new Map<string, QuoteGroup>();
  for (const row of rows) {
    let g = map.get(row.quote_id);
    if (!g) {
      g = {
        quoteId: row.quote_id,
        vehiclePlate: row.vehicle_plate,
        createdAt: row.created_at,
        shopId: row.shop_id,
        lines: [],
        total: 0,
      };
      map.set(row.quote_id, g);
    }
    g.lines.push(row);
    g.total += Number(row.line_price);
  }
  return Array.from(map.values());
}

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

export default function QuotesView({
  isAdmin,
  shops,
  activeShopId,
  canCreate,
  createShopId,
  rows,
  labelMap,
}: {
  isAdmin: boolean;
  shops: ShopOption[];
  activeShopId: string | null;
  canCreate: boolean;
  createShopId: string | null;
  rows: QuoteRow[];
  labelMap: Record<string, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);

  const groups = useMemo(() => groupQuotes(rows), [rows]);
  const showAdminSelector = isAdmin && shops.length > 0;

  function selectShop(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("shop", id);
    else params.delete("shop");
    router.push(`/dashboard/preventivi?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
            Preventivi
          </p>
          <p className="text-sm text-muted">
            Crea e consulta i preventivi dell&apos;officina.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {showAdminSelector && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Officina:</span>
              <select
                value={activeShopId ?? ""}
                onChange={(e) => selectShop(e.target.value)}
                className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand-dark"
              >
                <option value="">— seleziona —</option>
                {shops.map((s) => (
                  <option key={s.User_ID} value={s.User_ID}>
                    {s.User_Name ?? s.User_ID} {s.Town ? `— ${s.Town}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {canCreate && (
            <button
              onClick={() => setModalOpen(true)}
              className="self-start rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink sm:self-auto"
            >
              + Nuovo preventivo
            </button>
          )}
        </div>
      </div>

      {isAdmin && !activeShopId ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            Seleziona un&apos;officina per consultare e creare i preventivi.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            Nessun preventivo ancora.
            {canCreate ? " Crea il primo con “Nuovo preventivo”." : ""}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div
              key={g.quoteId}
              className="overflow-hidden rounded-lg border border-line bg-surface"
            >
              <div className="flex flex-col justify-between gap-1 border-b border-line bg-paper px-4 py-2.5 sm:flex-row sm:items-center">
                <div className="flex items-baseline gap-3">
                  <span className="plate-badge font-mono text-sm font-semibold">
                    {g.vehiclePlate}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {g.quoteId}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {formatDateTime(g.createdAt)}
                </span>
              </div>

              <div className="divide-y divide-line">
                {g.lines.map((l) => (
                  <div
                    key={l.forfait_code}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                  >
                    <span className="w-32 shrink-0 font-mono text-xs text-ink">
                      {l.forfait_code}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {labelMap[l.forfait_code] ?? "—"}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {Number(l.quantity)} × {formatEuro(l.unit_price)}
                    </span>
                    <span className="w-20 shrink-0 text-right font-medium text-ink">
                      {formatEuro(l.line_price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-2.5">
                <span className="text-xs uppercase tracking-wide text-muted">
                  Totale (IVA escl.)
                </span>
                <span className="font-display text-lg font-bold text-ink">
                  {formatEuro(g.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <NewQuoteModal
          shopId={createShopId}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
