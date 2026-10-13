import type { SurvivalRun } from './survival';
import { MULTI, type MultiMode, type MultiState } from './multi';
import type { LetterState } from './types';

export interface ShareOptions {
  brand: string;
  /** e.g. "#11" for a daily challenge or "Practice". */
  label: string;
  evaluations: readonly (readonly LetterState[])[];
  won: boolean;
  maxGuesses: number;
  hardMode: boolean;
  /** Practice hints used (shown in the title). */
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
  const hints = o.hints ? ` (${o.hints} ${o.hints === 1 ? 'hint' : 'hints'})` : '';
  const title = `${o.brand} ${o.label} ${score}${o.hardMode ? '*' : ''}${hints}`;
  const grid = o.evaluations.map((row) => row.map((s) => glyph[s]).join('')).join('\n');
  return [title, '', grid, ...(o.url ? ['', o.url] : [])].join('\n');
}

/** Share text for a Blitz run: one square per word, never the words themselves. */
export function buildBlitzShareText(o: {
  brand: string;
  /** Defaults to "Blitz"; e.g. "Daily Rush #3". */
  label?: string;
  solved: number;
  results: readonly boolean[];
  highContrast: boolean;
  darkSquares: boolean;
  url?: string;
}): string {
  const hit = o.highContrast ? '🟧' : '🟩';
  const miss = o.darkSquares ? '⬛' : '⬜';
  const squares = o.results.map((won) => (won ? hit : miss)).join('');
  const title = `${o.brand} ${o.label ?? 'Blitz'}: ${o.solved} ${o.solved === 1 ? 'word' : 'words'}`;
  return [title, ...(squares ? ['', squares] : []), ...(o.url ? ['', o.url] : [])].join('\n');
}

/** Share text for Duo/Quad: the grids side by side, never the words. */
export function buildMultiShareText(o: {
  brand: string;
  mode: MultiMode;
  state: MultiState;
  highContrast: boolean;
  darkSquares: boolean;
  url?: string;
}): string {
  const glyph: Record<LetterState, string> = {
    correct: o.highContrast ? '🟧' : '🟩',
    present: o.highContrast ? '🟦' : '🟨',
    absent: o.darkSquares ? '⬛' : '⬜',
  };
  const { state } = o;
  const blank = '\u2003'.repeat(5);
  const row = (words: LetterState[][][], r: number) =>
    words.map((rowsK) => (rowsK[r] ? rowsK[r].map((s) => glyph[s]).join('') : blank)).join(' ');
  // Quad shares as two pairs of boards, one pair under the other.
  const groups = o.mode === 'quad' ? [state.evaluations.slice(0, 2), state.evaluations.slice(2)] : [state.evaluations];
  const lines = groups.flatMap((g, i) => [
    ...(i > 0 ? [''] : []),
    ...Array.from({ length: Math.max(...g.map((x) => x.length)) }, (_, r) => row(g, r)),
  ]);
  const max = state.maxGuesses;
  const score = state.status === 'won' ? `${state.guesses.length}/${max}` : `X/${max}`;
  return [`${o.brand} ${MULTI[o.mode].name} ${score}`, '', ...lines, ...(o.url ? ['', o.url] : [])].join('\n');
}

/** Share text for a Survival run: one square per word, never the words. */
export function buildSurvivalShareText(o: {
  brand: string;
  run: SurvivalRun;
  highContrast: boolean;
  darkSquares: boolean;
  url?: string;
}): string {
  const hit = o.highContrast ? '🟧' : '🟩';
  const miss = o.darkSquares ? '⬛' : '⬜';
  const squares = o.run.words.map((w) => (w.won ? hit : miss)).join('');
  const title = `${o.brand} Survival: ${o.run.score} ${o.run.score === 1 ? 'word' : 'words'}`;
  return [title, ...(squares ? ['', squares] : []), ...(o.url ? ['', o.url] : [])].join('\n');
}
