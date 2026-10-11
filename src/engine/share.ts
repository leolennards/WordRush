import type { LetterState } from './types';

export interface ShareOptions {
  brand: string;
  /** e.g. "#11" for a daily challenge or "Practice". */
  label: string;
  evaluations: readonly (readonly LetterState[])[];
  won: boolean;
  maxGuesses: number;
  hardMode: boolean;
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
  const title = `${o.brand} ${o.label} ${score}${o.hardMode ? '*' : ''}`;
  const grid = o.evaluations.map((row) => row.map((s) => glyph[s]).join('')).join('\n');
  return [title, '', grid, ...(o.url ? ['', o.url] : [])].join('\n');
}
