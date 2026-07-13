import { addDays, format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const ROME_TZ = "Europe/Rome";

/** Restituisce la data (yyyy-MM-dd, ora Roma) di oggi. */
export function todayIsoDate(): string {
  return formatInTimeZone(new Date(), ROME_TZ, "yyyy-MM-dd");
}

/** Dato un giorno qualsiasi (yyyy-MM-dd), restituisce il lunedì della stessa settimana. */
export function mondayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const localNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = localNoon.getUTCDay(); // 0 = domenica
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(localNoon, diff);
  return format(monday, "yyyy-MM-dd");
}

/** I 7 giorni (yyyy-MM-dd) della settimana che inizia il lunedì dato. */
export function weekDays(mondayIso: string): string[] {
  const [y, m, d] = mondayIso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(base, i), "yyyy-MM-dd")
  );
}

/** Range UTC [start, end) da interrogare su Supabase per la settimana Roma-locale. */
export function weekUtcRange(mondayIso: string): { startUtc: string; endUtc: string } {
  const start = fromZonedTime(`${mondayIso}T00:00:00`, ROME_TZ);
  const [y, m, d] = mondayIso.split("-").map(Number);
  const mondayNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const nextMonday = format(addDays(mondayNoon, 7), "yyyy-MM-dd");
  const end = fromZonedTime(`${nextMonday}T00:00:00`, ROME_TZ);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}

/** Chiave giorno (yyyy-MM-dd, ora Roma) di un timestamp ISO/UTC. */
export function dayKeyOf(isoTimestamp: string): string {
  return formatInTimeZone(parseISO(isoTimestamp), ROME_TZ, "yyyy-MM-dd");
}

/** Orario HH:mm (ora Roma) di un timestamp ISO/UTC. */
export function timeOf(isoTimestamp: string): string {
  return formatInTimeZone(parseISO(isoTimestamp), ROME_TZ, "HH:mm");
}

/** Etichetta leggibile per un giorno, es. "Lunedì 25 maggio". */
export function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const label = format(date, "EEEE d MMMM", { locale: it });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Etichetta breve per la settimana, es. "25 – 31 maggio 2026". */
export function weekLabel(mondayIso: string): string {
  const days = weekDays(mondayIso);
  const [y1, m1, d1] = days[0].split("-").map(Number);
  const [y2, m2, d2] = days[6].split("-").map(Number);
  const start = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
  const end = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));
  const sameMonth = m1 === m2 && y1 === y2;
  const startFmt = format(start, sameMonth ? "d" : "d MMM", { locale: it });
  const endFmt = format(end, "d MMM yyyy", { locale: it });
  return `${startFmt} – ${endFmt}`;
}
