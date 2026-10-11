/**
 * Picks a practice answer that avoids recently used answers and any words
 * explicitly excluded (e.g. today's daily answer, to avoid spoilers).
 */
export function pickPracticeAnswer(
  answers: readonly string[],
  avoid: Iterable<string>,
  random: () => number = Math.random,
): string {
  if (answers.length === 0) throw new Error('Answer list is empty');
  const avoidSet = new Set(avoid);
  const pool = answers.filter((w) => !avoidSet.has(w));
  const from = pool.length > 0 ? pool : answers;
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))]!;
}

/** Adds an answer to the recent list, keeping only the newest `limit` entries. */
export function rememberAnswer(recent: readonly string[], answer: string, limit: number): string[] {
  return [...recent.filter((w) => w !== answer), answer].slice(-limit);
}
