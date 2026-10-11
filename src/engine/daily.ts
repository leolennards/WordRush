/**
 * Deterministic daily challenge scheduling. The day boundary is midnight UTC
 * so every player worldwide shares the same puzzle at the same moment.
 */
const MS_PER_DAY = 86_400_000;

function parseIsoDate(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Invalid ISO date: ${iso}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole UTC days between the epoch date and `now` (0 on the epoch day itself). */
export function dayIndexFor(now: Date, epochIso: string): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - parseIsoDate(epochIso)) / MS_PER_DAY);
}

/** Human-readable challenge number: #1 on the epoch day. */
export function challengeNumber(dayIndex: number): number {
  return dayIndex + 1;
}

/** The answer for a given day. Wraps around once the list is exhausted. */
export function dailyAnswer(dayIndex: number, answers: readonly string[]): string {
  if (answers.length === 0) throw new Error('Answer list is empty');
  const i = ((dayIndex % answers.length) + answers.length) % answers.length;
  return answers[i]!;
}

/** Start of the UTC day for a day index, as a Date. */
export function dateForDayIndex(dayIndex: number, epochIso: string): Date {
  return new Date(parseIsoDate(epochIso) + dayIndex * MS_PER_DAY);
}

/** Milliseconds until the next UTC midnight. */
export function msUntilNextDay(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

export function dailyGameId(dayIndex: number): string {
  return `daily-${dayIndex}`;
}
