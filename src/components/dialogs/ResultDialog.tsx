import { Clock3, House, RotateCcw, Share2, Shuffle } from 'lucide-react';
import { m } from 'motion/react';
import type { GameState, Stats } from '@/engine';
import { GAME } from '@/config/game';
import { StatsPanel } from '@/components/statistics/StatsPanel';
import { MiniBoard } from '@/components/home/MiniBoard';
import { Button } from '@/components/ui';
import { useSettings } from '@/features/settings/SettingsContext';
import { Dialog } from './Dialog';

const PRAISE = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great job!', 'Phew — got it!'];

interface ResultDialogProps {
  open: boolean;
  onClose: () => void;
  game: GameState;
  stats: Stats;
  /** Daily: today's dayIndex for the streak; Practice: undefined. */
  currentKey?: number;
  title: string;
  countdown?: string;
  onShare: () => void;
  onPractice?: () => void;
  onNewGame?: () => void;
  onHome?: () => void;
}

export function ResultDialog(props: ResultDialogProps) {
  const { open, onClose, game, stats, currentKey, title, countdown, onShare, onPractice, onNewGame, onHome } = props;
  const { reducedMotion } = useSettings();
  const won = game.status === 'won';

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-6 pt-2">
        <div className="flex items-center gap-5">
          <div className="min-w-0 flex-1">
            <m.p
              className="text-[1.75rem] leading-tight font-extrabold tracking-tight"
              initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.05 }}
              style={{ transformOrigin: 'left center' }}
            >
              {won ? (PRAISE[game.guesses.length - 1] ?? 'Solved!') : 'So close.'}
            </m.p>
            {won ? (
              <p className="mt-1 text-muted">
                You solved it in <strong className="text-text">{game.guesses.length}</strong> of {GAME.maxGuesses}{' '}
                {game.guesses.length === 1 ? 'guess' : 'guesses'}.
              </p>
            ) : (
              <p className="mt-1 text-muted">Every miss makes the next one easier.</p>
            )}
          </div>
          {won && <MiniBoard game={game} tile="size-3.5 rounded-[3px]" className="shrink-0" />}
        </div>

        {!won && (
          <div className="rounded-2xl bg-surface-2 p-4 text-center">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">The word was</p>
            <div className="mt-2 flex justify-center gap-1.5" aria-label={`The answer was ${game.answer.toUpperCase()}`}>
              {[...game.answer].map((l, i) => (
                <m.span
                  key={i}
                  className="tile size-11 text-xl!"
                  data-state="correct"
                  aria-hidden
                  initial={reducedMotion ? false : { rotateX: 90 }}
                  animate={{ rotateX: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
                >
                  {l}
                </m.span>
              ))}
            </div>
          </div>
        )}

        <StatsPanel
          stats={stats}
          currentKey={currentKey}
          highlight={won ? game.guesses.length : null}
          streakLabel={currentKey === undefined ? 'Win streak' : 'Streak'}
        />

        <div className="space-y-2">
          <Button variant="primary" onClick={onShare} className="min-h-12 w-full text-[0.95rem]">
            <Share2 className="size-4" aria-hidden /> Share result
          </Button>
          <div className="flex gap-2">
            {onNewGame && (
              <Button onClick={onNewGame} className="flex-1">
                <RotateCcw className="size-4" aria-hidden /> New word
              </Button>
            )}
            {onPractice && (
              <Button onClick={onPractice} className="flex-1">
                <Shuffle className="size-4" aria-hidden /> Play Practice
              </Button>
            )}
            {onHome && (
              <Button onClick={onHome} className="flex-1">
                <House className="size-4" aria-hidden /> Home
              </Button>
            )}
          </div>
          {countdown && (
            <p className="tabular flex items-center justify-center gap-1.5 pt-2 text-xs text-muted" aria-live="off">
              <Clock3 className="size-3.5" aria-hidden />
              Next puzzle in <span className="font-semibold text-text">{countdown}</span>
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
