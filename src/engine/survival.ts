/** Survival: solve word after word. A miss costs a life; a quick solve earns one back. */
export const SURVIVAL = {
  lives: 3,
  maxLives: 3,
  /** Solving in this many guesses or fewer restores a life. */
  quickSolve: 3,
} as const;

export interface SurvivalWord {
  answer: string;
  won: boolean;
  guesses: number;
}

export interface SurvivalRun {
  /** Identifies the run (start time in ms). */
  id: number;
  score: number;
  lives: number;
  words: SurvivalWord[];
  /** Id of the last word counted, so a word is never counted twice. */
  lastWordId: string | null;
}

export const startSurvival = (now: number): SurvivalRun => ({
  id: now,
  score: 0,
  lives: SURVIVAL.lives,
  words: [],
  lastWordId: null,
});

export const survivalOver = (run: SurvivalRun) => run.lives <= 0;

/** Pure: records a finished word. Ignores a word that was already counted. */
export function finishSurvivalWord(run: SurvivalRun, wordId: string, word: SurvivalWord): SurvivalRun {
  if (run.lastWordId === wordId || survivalOver(run)) return run;
  const lives = word.won
    ? Math.min(SURVIVAL.maxLives, run.lives + (word.guesses <= SURVIVAL.quickSolve ? 1 : 0))
    : run.lives - 1;
  return { ...run, score: run.score + (word.won ? 1 : 0), lives, words: [...run.words, word], lastWordId: wordId };
}
