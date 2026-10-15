/**
 * Limited-time shop items: on sale only between two calendar dates (UTC),
 * every year. Once bought they're yours to keep all year round.
 */
export interface Season {
  name: string;
  /** [month 1–12, day] the item goes on sale. */
  from: [number, number];
  /** [month 1–12, day] the last day it's on sale (may be in the next year). */
  to: [number, number];
}

export const HALLOWEEN: Season = { name: 'Halloween', from: [10, 1], to: [11, 7] };
export const WINTER: Season = { name: 'Winter', from: [12, 1], to: [1, 10] };

const md = (m: number, d: number) => m * 100 + d;

export function inSeason(s: Season, date: Date): boolean {
  const now = md(date.getUTCMonth() + 1, date.getUTCDate());
  const from = md(...s.from);
  const to = md(...s.to);
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

/** Whole days left on sale, counting today (0 when not on sale). */
export function seasonDaysLeft(s: Season, date: Date): number {
  if (!inSeason(s, date)) return 0;
  const year = date.getUTCFullYear();
  const today = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
  let end = Date.UTC(year, s.to[0] - 1, s.to[1]);
  if (end < today) end = Date.UTC(year + 1, s.to[0] - 1, s.to[1]);
  return Math.round((end - today) / 86_400_000) + 1;
}
