import type { LetterState } from './types';

export interface ShareOptions {
  brand: string;
  /** e.g. "#11" for a daily challenge or "Practice". */
  label: string;
  evaluations: readonly (readonly LetterState[])[];
  won: boolean;
  maxGuesses: number;
  hardMode: boolean;
  /** Practice hints used (shown as 💡n). */
  hints?: number;
  /** Colour-accessible palette: orange/blue instead of green/yellow. */
  highContrast: boolean;
  /** Use dark squares for absent letters (matches the dark theme). */
  darkSquares: boolean;
  url?: string;
}

/**
 * Builds the shareable text. Only submitted rows are included and the answer
 * is never part of the output.
 */
export function buildShareText(o: ShareOptions): string {
  const glyph: Record<LetterState, string> = {
    correct: o.highContrast ? '🟧' : '🟩',
    present: o.highContrast ? '🟦' : '🟨',
    absent: o.darkSquares ? '⬛' : '⬜',
  };
  const score = o.won ? `${o.evaluations.length}/${o.maxGuesses}` : `X/${o.maxGuesses}`;
  const hints = o.hints ? ` 💡${o.hints}` : '';
  const title = `${o.brand} ${o.label} ${score}${o.hardMode ? '*' : ''}${hints}`;
  const grid = o.evaluations.map((row) => row.map((s) => glyph[s]).join('')).join('\n');
  return [title, '', grid, ...(o.url ? ['', o.url] : [])].join('\n');
}

/** Share text for a Blitz run: one square per word, never the words themselves. */
export function buildBlitzShareText(o: {
  brand: string;
  solved: number;
  results: readonly boolean[];
  highContrast: boolean;
  darkSquares: boolean;
  url?: string;
}): string {
  const hit = o.highContrast ? '🟧' : '🟩';
  const miss = o.darkSquares ? '⬛' : '⬜';
  const squares = o.results.map((won) => (won ? hit : miss)).join('');
  const title = `${o.brand} Blitz ⚡ ${o.solved} ${o.solved === 1 ? 'word' : 'words'}`;
  return [title, ...(squares ? ['', squares] : []), ...(o.url ? ['', o.url] : [])].join('\n');
}
