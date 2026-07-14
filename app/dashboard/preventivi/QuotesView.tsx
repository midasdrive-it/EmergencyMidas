"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { QuoteRow, ShopHeader, ShopOption } from "@/lib/types";
import { formatEuro } from "@/lib/money";
import QuoteModal from "./QuoteModal";

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
    if (!row.parent_forfait) g.total += Number(row.line_price);
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

type ModalState =
  | { kind: "create" }
  | { kind: "view"; group: QuoteGroup }
  | null;

export default function QuotesView({
  isAdmin,
  shops,
  activeShopId,
  canCreate,
  createShopId,
  shop,
  rows,
  labelMap,
}: {
  isAdmin: boolean;
  shops: ShopOption[];
  activeShopId: string | null;
  canCreate: boolean;
  createShopId: string | null;
  shop: ShopHeader | null;
  rows: QuoteRow[];
  labelMap: Record<string, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modal, setModal] = useState<ModalState>(null);

  const groups = useMemo(() => groupQuotes(rows), [rows]);
  const showAdminSelector = isAdmin && shops.length > 0;

  function selectShop(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("shop", id);
    else params.delete("shop");
    router.push(`/dashboard/preventivi?${params.toString()}`);
  }

  function afterSave() {
    setModal(null);
    router.refresh();
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
              onClick={() => setModal({ kind: "create" })}
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
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="hidden items-center gap-3 border-b border-line bg-paper px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:flex">
            <span className="w-28 shrink-0">Veicolo</span>
            <span className="min-w-0 flex-1">Numero</span>
            <span className="w-40 shrink-0">Data</span>
            <span className="w-24 shrink-0 text-right">Totale</span>
            <span className="w-20 shrink-0" />
          </div>

          {groups.map((g) => (
            <div
              key={g.quoteId}
              className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5"
            >
              <span className="plate-badge w-fit shrink-0 px-1 font-mono text-sm font-semibold sm:w-28">
                {g.vehiclePlate}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">
                {g.quoteId}
              </span>
              <span className="w-40 shrink-0 text-xs text-muted">
                {formatDateTime(g.createdAt)}
              </span>
              <span className="w-24 shrink-0 text-left font-medium text-ink sm:text-right">
                {formatEuro(g.total)}
              </span>
              <div className="shrink-0 sm:w-20 sm:text-right">
                <button
                  onClick={() => setModal({ kind: "view", group: g })}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand-dark hover:bg-brand-tint"
                >
                  Apri
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.kind === "create" && (
        <QuoteModal
          mode="create"
          shopId={createShopId}
          shop={shop}
          onClose={() => setModal(null)}
          onSaved={afterSave}
        />
      )}
      {modal?.kind === "view" && (
        <QuoteModal
          mode="view"
          shopId={createShopId}
          shop={shop}
          quoteId={modal.group.quoteId}
          initialLines={modal.group.lines}
          labelMap={labelMap}
          onClose={() => setModal(null)}
          onSaved={afterSave}
        />
      )}
    </div>
  );
}
