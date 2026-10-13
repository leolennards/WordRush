import { m } from 'motion/react';
import { BookOpen, House, RotateCcw, Share2, Shuffle, Trophy } from 'lucide-react';
import type { GameState } from '@/engine';
import { CountUp } from '@/components/progress/CountUp';

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
  /** XP earned by this game, once recorded. */
  xp?: number;
  /** Opens the answer's meaning. */
  onMeaning?: () => void;
}

// Icon over label on narrow phones (four buttons fit), side by side from 440px.
const secondary =
  'inline-flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 px-1 py-1.5 text-[0.72rem] font-semibold whitespace-nowrap transition hover:bg-surface-3 active:scale-[0.98] min-[440px]:flex-row min-[440px]:gap-1.5 min-[440px]:px-2 min-[440px]:text-sm';

/** Shown in place of the keyboard once a game is over, so there is always a clear next step. */
export function GameOverPanel({ game, countdown, onResults, onShare, onHome, onPractice, onNewGame, xp, onMeaning }: GameOverPanelProps) {
  const won = game.status === 'won';
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[30rem] px-3"
      aria-label="Game over"
      role="region"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-md sm:p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 pl-1">
            <p className="flex items-center gap-2 font-bold">
              {won ? `Solved in ${game.guesses.length}!` : `The word was ${game.answer.toUpperCase()}`}
              {xp ? (
                <m.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.2 }}
                  className="tabular rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent"
                >
                  <CountUp value={xp} prefix="+" suffix=" XP" />
                </m.span>
              ) : null}
            </p>
            <p className="tabular text-xs text-muted">
              {countdown ? (
                <>
                  Next puzzle in <span className="font-semibold text-text">{countdown}</span>
                </>
              ) : won ? (
                'Nicely played.'
              ) : (
                'Shake it off and try another.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-ink-text shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          >
            <Share2 className="size-4" aria-hidden /> Share
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onResults} className={secondary}>
            <Trophy className="size-4" aria-hidden /> Results
          </button>
          {onMeaning && (
            <button type="button" onClick={onMeaning} className={secondary} aria-label={`Meaning of ${game.answer.toUpperCase()}`}>
              <BookOpen className="size-4" aria-hidden /> Meaning
            </button>
          )}
          {onNewGame && (
            <button type="button" onClick={onNewGame} className={secondary}>
              <RotateCcw className="size-4" aria-hidden /> New word
            </button>
          )}
          {onPractice && (
            <button type="button" onClick={onPractice} className={secondary}>
              <Shuffle className="size-4" aria-hidden /> Practice
            </button>
          )}
          <button type="button" onClick={onHome} className={secondary}>
            <House className="size-4" aria-hidden /> Home
          </button>
        </div>
      </div>
    </m.div>
  );
}
