import { m } from 'motion/react';
import { Dumbbell, House, RotateCcw, Share2, Trophy } from 'lucide-react';
import type { GameState } from '@/engine';

interface GameOverPanelProps {
  game: GameState;
  countdown?: string;
  onResults: () => void;
  onShare: () => void;
  onHome: () => void;
  /** Daily: switch to Practice. */
  onPractice?: () => void;
  /** Practice: start another word. */
  onNewGame?: () => void;
}

const btn =
  'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.98]';

/** Shown in place of the keyboard once a game is over, so there is always a clear next step. */
export function GameOverPanel({ game, countdown, onResults, onShare, onHome, onPractice, onNewGame }: GameOverPanelProps) {
  const won = game.status === 'won';
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[34rem] px-3"
      aria-label="Game over"
      role="region"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <p className="text-center font-bold">
          {won ? `Solved in ${game.guesses.length}! 🎉` : `The word was ${game.answer.toUpperCase()}`}
        </p>
        {countdown && (
          <p className="tabular mt-0.5 text-center text-sm text-muted">
            Next challenge in <strong className="text-text">{countdown}</strong>
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onShare} className={`${btn} bg-accent text-accent-ink hover:brightness-105`}>
            <Share2 className="size-4" aria-hidden /> Share
          </button>
          <button type="button" onClick={onResults} className={`${btn} bg-surface-2 hover:bg-surface-3`}>
            <Trophy className="size-4" aria-hidden /> Results
          </button>
          {onNewGame && (
            <button type="button" onClick={onNewGame} className={`${btn} bg-surface-2 hover:bg-surface-3`}>
              <RotateCcw className="size-4" aria-hidden /> New word
            </button>
          )}
          {onPractice && (
            <button type="button" onClick={onPractice} className={`${btn} bg-surface-2 hover:bg-surface-3`}>
              <Dumbbell className="size-4" aria-hidden /> Practice
            </button>
          )}
          <button type="button" onClick={onHome} className={`${btn} bg-surface-2 hover:bg-surface-3`}>
            <House className="size-4" aria-hidden /> Home
          </button>
        </div>
      </div>
    </m.div>
  );
}
