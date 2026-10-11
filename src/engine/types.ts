/** Framework-independent game types. Everything here is JSON-serialisable. */

export type LetterState = 'correct' | 'present' | 'absent';

export type GameStatus = 'playing' | 'won' | 'lost';

/** daily/practice are solo; challenge/race are played against a friend. */
export type GameMode = 'daily' | 'practice' | 'challenge' | 'race';

/** The two single-player modes, which have their own statistics. */
export type SoloMode = 'daily' | 'practice';

export interface GameState {
  mode: GameMode;
  /**
   * Stable identifier of this puzzle: `daily-<dayIndex>` for daily challenges,
   * `practice-<n>` for practice games.
   */
  id: string;
  answer: string;
  guesses: string[];
  evaluations: LetterState[][];
  status: GameStatus;
  hardMode: boolean;
  /** Daily challenges only: days since the epoch (0 = challenge #1). */
  dayIndex: number | null;
}

export type GuessError =
  | { kind: 'game-over' }
  | { kind: 'incomplete' }
  | { kind: 'not-in-list' }
  | { kind: 'hard-mode'; message: string };

export type SubmitResult =
  | { ok: true; state: GameState; evaluation: LetterState[] }
  | { ok: false; error: GuessError };

export interface Dictionary {
  /** Possible answers, in schedule order. */
  readonly answers: readonly string[];
  /** True if `word` (already normalised) may be submitted as a guess. */
  isAccepted(word: string): boolean;
}
