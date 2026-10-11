import { Dumbbell, RotateCcw, Share2 } from 'lucide-react';
import { m } from 'motion/react';
import type { GameState, Stats } from '@/engine';
import { GAME } from '@/config/game';
import { StatsPanel } from '@/components/statistics/StatsPanel';
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
}

export function ResultDialog(props: ResultDialogProps) {
  const { open, onClose, game, stats, currentKey, title, countdown, onShare, onPractice, onNewGame } = props;
  const { reducedMotion } = useSettings();
  const won = game.status === 'won';
  const heading = won ? (PRAISE[game.guesses.length - 1] ?? 'Solved!') : 'So close!';

  return (
    <Dialog open={open} onClose={onClose} title={title} hideTitle>
      <div className="space-y-6 pt-1">
        <div className="text-center">
          <m.p
            className="text-3xl font-extrabold tracking-tight"
            initial={reducedMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
          >
            {heading}
          </m.p>
          <p className="mt-1 text-sm text-muted">{title}</p>
          {won ? (
            <p className="mt-3">
              You solved it in <strong>{game.guesses.length}</strong> {game.guesses.length === 1 ? 'guess' : 'guesses'}.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <p>The word was</p>
              <div className="flex justify-center gap-1.5" aria-label={`The answer was ${game.answer.toUpperCase()}`}>
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
              <p className="text-sm text-muted">Every miss makes the next one easier.</p>
            </div>
          )}
        </div>

        <StatsPanel stats={stats} currentKey={currentKey} highlight={won ? game.guesses.length : null} streakLabel={currentKey === undefined ? 'Win streak' : 'Current streak'} />

        {countdown && (
          <div className="rounded-xl bg-surface-2 py-3 text-center">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Next challenge in</p>
            <p className="tabular mt-0.5 text-2xl font-bold" aria-live="off">
              {countdown}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={onShare} className="col-span-2 sm:col-span-1">
            <Share2 className="size-4" aria-hidden /> Share result
          </Button>
          {onNewGame && (
            <Button onClick={onNewGame} className="col-span-2 sm:col-span-1">
              <RotateCcw className="size-4" aria-hidden /> New word
            </Button>
          )}
          {onPractice && (
            <Button onClick={onPractice} className="col-span-2 sm:col-span-1">
              <Dumbbell className="size-4" aria-hidden /> Play Practice
            </Button>
          )}
        </div>
        <p className="sr-only">Maximum {GAME.maxGuesses} guesses.</p>
      </div>
    </Dialog>
  );
}
