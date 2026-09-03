export type IsoDate = string; // YYYY-MM-DD

/**
 * Extract the local ISO date (YYYY-MM-DD) from a Date. Uses the local timezone
 * of the runtime, which is exactly what we want for daily-stable recommendations
 * (the day flips when the user's clock flips, not at UTC midnight).
 */
export function toIsoDate(d: Date = new Date()): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: IsoDate, b: IsoDate): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  const A = Date.UTC(ay, am - 1, ad);
  const B = Date.UTC(by, bm - 1, bd);
  return Math.round((B - A) / 86_400_000);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Returns the ISO date of Monday of the week containing `iso`. */
export function startOfWeek(iso: IsoDate): IsoDate {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(iso, diff);
}
