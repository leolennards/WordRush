import { GAME } from '@/config/game';
import type { GameState, LetterState } from '@/engine';

const FILL: Record<LetterState, string> = {
  correct: 'bg-correct',
  present: 'bg-present',
  // Lighter than the board's absent tile so it stays visible on cards in both themes.
  absent: 'bg-subtle',
};

/**
 * A tiny, spoiler-free picture of a game: colours only, no letters.
 * Unused rows show as faint outlines.
 */
export function MiniBoard({
  game,
  className = '',
  tile = 'size-[0.8rem] rounded-[3px]',
}: {
  game: GameState;
  className?: string;
  /** Size/shape classes for each square. */
  tile?: string;
}) {
  return (
    <div
      className={`grid gap-[3px] ${className}`}
      style={{ gridTemplateRows: `repeat(${GAME.maxGuesses}, 1fr)` }}
      role="img"
      aria-label={
        game.guesses.length === 0
          ? 'No guesses yet'
          : `${game.guesses.length} of ${GAME.maxGuesses} guesses used`
      }
    >
      {Array.from({ length: GAME.maxGuesses }, (_, r) => (
        <div key={r} className="flex gap-[3px]">
          {Array.from({ length: GAME.wordLength }, (_, i) => {
            const state = game.evaluations[r]?.[i];
            return (
              <span
                key={i}
                className={`${tile} ${state ? FILL[state] : 'border border-border-strong/70'}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
