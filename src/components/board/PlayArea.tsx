import type { ReactNode } from 'react';
import type { GameSession } from '@/features/game/useGameSession';
import { useSettings } from '@/features/settings/SettingsContext';
import { Celebration } from '@/components/layout/Celebration';
import { Keyboard } from '@/components/keyboard/Keyboard';
import { Board } from './Board';
import type { useGameScreen } from '@/features/game/useGameScreen';

interface PlayAreaProps {
  active: GameSession;
  screen: ReturnType<typeof useGameScreen>;
  /** Shown above the board (e.g. a live opponent strip). */
  top?: ReactNode;
  /** Replaces the keyboard once the game is over. */
  endPanel?: ReactNode;
  /** Overlay on the board (e.g. a race countdown). */
  overlay?: ReactNode;
  /** Disable the on-screen keyboard (e.g. before a race starts). */
  keyboardDisabled?: boolean;
  celebrationSeed?: number;
  /** Show the end panel even if this player's own game is still going (e.g. the race ended). */
  forceEnd?: boolean;
}

/** The board + keyboard column shared by every game screen. */
export function PlayArea({
  active,
  screen,
  top,
  endPanel,
  overlay,
  keyboardDisabled,
  celebrationSeed = 1,
  forceEnd = false,
}: PlayAreaProps) {
  const { reducedMotion } = useSettings();
  const { game, input, revealingRow } = active.session;
  const over = (game.status !== 'playing' && revealingRow === null) || forceEnd;

  return (
    <>
      {top}
      <div className="board-area relative min-h-0 flex-1 px-3 py-2 sm:py-4">
        <div className="flex h-full items-center justify-center">
          <Board
            game={game}
            input={input}
            revealingRow={revealingRow}
            shakeKey={screen.shakeKey}
            celebrate={screen.celebrating}
          />
        </div>
        {screen.celebrating && !reducedMotion && <Celebration seed={celebrationSeed} />}
        {overlay}
      </div>
      <div className="safe-bottom pt-1 sm:pb-5">
        {over && endPanel ? (
          endPanel
        ) : (
          <Keyboard
            letterStates={screen.letterStates}
            onLetter={screen.onLetter}
            onDelete={active.remove}
            onEnter={active.submit}
            disabled={game.status !== 'playing' || keyboardDisabled}
          />
        )}
      </div>
    </>
  );
}
