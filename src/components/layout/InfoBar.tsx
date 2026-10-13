import type { ReactNode } from 'react';
import { Lightbulb, RotateCcw, SlidersHorizontal, Trophy } from 'lucide-react';
import type { GameState } from '@/engine';
import { keepFocus } from '@/lib/accessibility/keepFocus';

interface InfoBarProps {
  heading: string;
  subheading: string;
  game: GameState;
  /** Mode switch, shown here on small screens (it lives in the header on larger ones). */
  modeSwitch: ReactNode;
  onResults: () => void;
  onNewGame?: () => void;
  /** Practice: reveal a letter. `hintsLeft` 0 disables it. */
  onHint?: () => void;
  hintsLeft?: number;
  /** Practice: open the mods panel; `modsOn` is the number active on this word. */
  onMods?: () => void;
  modsOn?: number;
  staleAction?: { label: string; onClick: () => void };
}

const chip =
  'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors hover:bg-surface-3';

/** One compact row above the board, aligned to the board's width. */
export function InfoBar({ heading, subheading, game, modeSwitch, onResults, onNewGame, onHint, hintsLeft = 0, onMods, modsOn = 0, staleAction }: InfoBarProps) {
  const finished = game.status !== 'playing';
  const tools = !!(onMods || onHint || onNewGame);
  return (
    <div className="mx-auto flex w-full max-w-[26rem] flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 pt-3 pb-1 sm:flex-nowrap sm:pt-5">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">{heading}</h2>
        <p className="tabular truncate text-xs text-muted">{subheading}</p>
      </div>
      {/* Mode switch: top right on phones (it lives in the header on larger screens). */}
      <div className="shrink-0 sm:hidden">{modeSwitch}</div>
      {/* Tools: their own row on phones, so the title never gets squeezed. */}
      <div className={`flex shrink-0 items-center gap-1.5 ${tools ? 'w-full sm:w-auto' : ''} max-sm:empty:hidden`}>
        {staleAction && (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={staleAction.onClick}
            className={`${chip} bg-ink text-ink-text hover:bg-ink hover:opacity-90`}
          >
            {staleAction.label}
          </button>
        )}
        {finished && (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={onResults}
            className={`${chip} bg-surface-2`}
            aria-label="Show results"
          >
            <Trophy className="size-3.5" aria-hidden /> <span className="hidden min-[400px]:inline">Results</span>
          </button>
        )}
        {onMods && (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={onMods}
            className={`${chip} relative ${modsOn > 0 ? 'bg-accent/15 text-accent hover:bg-accent/20' : 'bg-surface-2'}`}
            aria-label={modsOn > 0 ? `Mods, ${modsOn} on` : 'Mods'}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Mods
            {modsOn > 0 && (
              <span className="tabular grid size-4 place-items-center rounded-full bg-accent text-[0.65rem] text-accent-ink">{modsOn}</span>
            )}
          </button>
        )}
        {onHint && !finished && (
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={onHint}
            disabled={hintsLeft === 0}
            className={`${chip} bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-surface-2`}
            aria-label={hintsLeft > 0 ? `Hint, ${hintsLeft} left` : 'No hints left'}
          >
            <Lightbulb className="size-3.5 text-present" aria-hidden />
            Hint
            <span className="tabular text-muted">{hintsLeft}</span>
          </button>
        )}
        {onNewGame && !finished && (
          <button type="button" onMouseDown={keepFocus} onClick={onNewGame} className={`${chip} bg-surface-2`}>
            <RotateCcw className="size-3.5" aria-hidden /> New word
          </button>
        )}
      </div>
    </div>
  );
}
