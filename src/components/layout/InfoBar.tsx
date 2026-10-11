import { CheckCircle2, CircleX, RotateCcw, Trophy } from 'lucide-react';
import type { GameState } from '@/engine';
import { GAME } from '@/config/game';
import { keepFocus } from '@/lib/accessibility/keepFocus';

interface InfoBarProps {
  heading: string;
  subheading: string;
  game: GameState;
  countdown?: string;
  onResults: () => void;
  onNewGame?: () => void;
  staleAction?: { label: string; onClick: () => void };
}

function StatusChip({ game }: { game: GameState }) {
  if (game.status === 'won') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-correct/15 px-2.5 py-1 text-xs font-semibold text-text">
        <CheckCircle2 className="size-3.5 text-correct" aria-hidden /> Solved in {game.guesses.length}
      </span>
    );
  }
  if (game.status === 'lost') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-xs font-semibold">
        <CircleX className="size-3.5 text-muted" aria-hidden /> Not solved
      </span>
    );
  }
  return (
    <span className="tabular rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
      {game.guesses.length === 0 ? 'Not started' : `Guess ${game.guesses.length + 1} of ${GAME.maxGuesses}`}
    </span>
  );
}

export function InfoBar({ heading, subheading, game, countdown, onResults, onNewGame, staleAction }: InfoBarProps) {
  const finished = game.status !== 'playing';
  return (
    <div className="mx-auto flex w-full max-w-[34rem] items-center justify-between gap-3 px-4 py-2">
      <div className="min-w-0">
        <h2 className="truncate text-[0.95rem] leading-tight font-bold">{heading}</h2>
        <p className="tabular truncate text-xs text-muted">
          {subheading}
          {finished && countdown && <> · Next in {countdown}</>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {staleAction ? (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={staleAction.onClick}
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
          >
            {staleAction.label}
          </button>
        ) : (
          <StatusChip game={game} />
        )}
        {finished && (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={onResults}
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Show results"
            title="Results"
          >
            <Trophy className="size-4" aria-hidden />
          </button>
        )}
        {onNewGame && (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={onNewGame}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-surface-2"
          >
            <RotateCcw className="size-3.5" aria-hidden /> New word
          </button>
        )}
      </div>
    </div>
  );
}
