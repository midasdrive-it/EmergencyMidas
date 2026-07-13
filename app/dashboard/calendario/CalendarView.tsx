"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  dayKeyOf,
  dayLabel,
  timeOf,
  todayIsoDate,
  weekDays,
  weekLabel,
} from "@/lib/dates";
import type { Appointment, ShopDetails, ShopOption } from "@/lib/types";

function shiftWeek(mondayIso: string, deltaWeeks: number): string {
  const [y, m, d] = mondayIso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return format(addDays(base, deltaWeeks * 7), "yyyy-MM-dd");
}

function formatPhone(n: number | null): string | null {
  if (!n) return null;
  const s = String(n);
  if (s.length === 10) return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
  return s;
}

export default function CalendarView({
  isAdmin,
  shops,
  activeShopId,
  shopDetails,
  mondayIso,
  appointments,
}: {
  isAdmin: boolean;
  shops: ShopOption[];
  activeShopId: string | null;
  shopDetails: ShopDetails | null;
  mondayIso: string;
  appointments: Appointment[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  const today = todayIsoDate();
  const days = useMemo(() => weekDays(mondayIso), [mondayIso]);

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) map.set(day, []);
    for (const appt of appointments) {
      const key = dayKeyOf(appt.date_appointment);
      const list = map.get(key);
      if (list) list.push(appt);
    }
    return map;
  }, [appointments, days]);

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const q = query.trim().toLowerCase();
    const map = new Map<string, Appointment[]>();
    for (const [day, list] of grouped) {
      map.set(
        day,
        list.filter(
          (a) =>
            (a.customer_name ?? "").toLowerCase().includes(q) ||
            (a.number_plate ?? "").toLowerCase().includes(q)
        )
      );
    }
    return map;
  }, [grouped, query]);

  function pushParams(next: { shop?: string | null; week?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.shop !== undefined) {
      if (next.shop) params.set("shop", next.shop);
      else params.delete("shop");
    }
    if (next.week !== undefined) {
      if (next.week) params.set("week", next.week);
      else params.delete("week");
    }
    router.push(`/dashboard/calendario?${params.toString()}`);
  }

  const totalWeek = appointments.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Intestazione officina */}
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
            {shopDetails?.User_Name ?? "Nessuna officina selezionata"}
          </p>
          {shopDetails && (
            <p className="text-sm text-muted">
              {shopDetails.Address ? `${shopDetails.Address}, ` : ""}
              {shopDetails.Town}
              {shopDetails.Province ? ` (${shopDetails.Province})` : ""}
            </p>
          )}
        </div>

        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Vista amministratore — officina:</span>
            <select
              value={activeShopId ?? ""}
              onChange={(e) => pushParams({ shop: e.target.value })}
              className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-rust"
            >
              {shops.map((s) => (
                <option key={s.User_ID} value={s.User_ID}>
                  {s.User_Name ?? s.User_ID} {s.Town ? `— ${s.Town}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Navigazione settimana + ricerca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => pushParams({ week: shiftWeek(mondayIso, -1) })}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-rust hover:text-rust"
          >
            ← Sett. prec.
          </button>
          <button
            onClick={() => pushParams({ week: todayIsoDate() })}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper transition hover:bg-rust"
          >
            Oggi
          </button>
          <button
            onClick={() => pushParams({ week: shiftWeek(mondayIso, 1) })}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-rust hover:text-rust"
          >
            Sett. succ. →
          </button>
          <span className="ml-1 font-display text-lg uppercase tracking-wide text-ink">
            {weekLabel(mondayIso)}
          </span>
          <span className="rounded-full bg-line px-2 py-0.5 text-xs font-medium text-ink/70">
            {totalWeek} app.
          </span>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca targa o cliente in questa settimana…"
          className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-rust sm:w-72"
        />
      </div>

      {/* Giorni della settimana */}
      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const list = filtered.get(day) ?? [];
          const isToday = day === today;
          return (
            <div
              key={day}
              className={`overflow-hidden rounded-lg border ${
                isToday ? "border-rust" : "border-line"
              } bg-surface`}
            >
              <div
                className={`flex items-center justify-between px-4 py-2.5 ${
                  isToday ? "bg-rust text-paper" : "bg-paper text-ink"
                }`}
              >
                <p className="font-display text-base font-semibold uppercase tracking-wide">
                  {dayLabel(day)}
                  {isToday && (
                    <span className="ml-2 text-xs font-body font-normal normal-case tracking-normal opacity-80">
                      Oggi
                    </span>
                  )}
                </p>
                <span
                  className={`text-xs font-medium ${
                    isToday ? "text-paper/80" : "text-muted"
                  }`}
                >
                  {list.length} appuntament{list.length === 1 ? "o" : "i"}
                </span>
              </div>

              {list.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">
                  Nessun appuntamento.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {list.map((appt, i) => {
                    const confirmed = (appt.CONFIRMED ?? "").toUpperCase() === "Y";
                    const phone = formatPhone(appt.mobile_phone);
                    return (
                      <li
                        key={`${appt.date_appointment}-${i}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span
                          className={`h-8 w-1 shrink-0 rounded-full ${
                            confirmed ? "bg-signal-green" : "bg-signal-amber"
                          }`}
                          title={confirmed ? "Confermato" : "Da confermare"}
                        />
                        <span className="w-14 shrink-0 font-mono text-sm font-semibold text-ink">
                          {timeOf(appt.date_appointment)}
                        </span>

                        {appt.number_plate && (
                          <span className="plate-badge shrink-0">
                            <span className="plate-badge__cap">I</span>
                            <span className="plate-badge__num">
                              {appt.number_plate}
                            </span>
                          </span>
                        )}

                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                          {appt.customer_name || "—"}
                        </span>

                        {appt.type_vehicle && (
                          <span className="hidden shrink-0 rounded bg-paper px-1.5 py-0.5 text-[11px] uppercase text-muted sm:inline">
                            {appt.type_vehicle}
                          </span>
                        )}
                        {appt.type_rdv && (
                          <span className="hidden shrink-0 rounded bg-paper px-1.5 py-0.5 text-[11px] uppercase text-muted sm:inline">
                            {appt.type_rdv}
                          </span>
                        )}

                        {phone && (
                          <a
                            href={`tel:${phone.replace(/\s/g, "")}`}
                            className="shrink-0 font-mono text-xs text-muted hover:text-rust"
                          >
                            {phone}
                          </a>
                        )}

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            confirmed
                              ? "bg-signal-greenBg text-signal-green"
                              : "bg-signal-amberBg text-signal-amber"
                          }`}
                        >
                          {confirmed ? "Confermato" : "Da confermare"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
