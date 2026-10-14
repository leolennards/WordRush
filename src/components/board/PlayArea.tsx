import { useMemo, type ReactNode } from 'react';
import { fibPosition, fibRows } from '@/engine';
import type { GameSession } from '@/features/game/useGameSession';
import { useSettings } from '@/features/settings/SettingsContext';
import { Celebration } from '@/components/layout/Celebration';
import { Keyboard } from '@/components/keyboard/Keyboard';
import { submitStateFor } from '@/components/keyboard/submit';
import { useServices } from '@/app/services';
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
  const { game: truth, input, revealingRow } = active.session;
  const over = (truth.status !== 'playing' && revealingRow === null) || forceEnd;
  // Fibber: show the lying rows while playing; once over, show the truth and mark the lies.
  const liar = !!truth.mods?.includes('liar');
  const game = useMemo(
    () => (liar && truth.status === 'playing' ? { ...truth, evaluations: fibRows(truth.id, truth.evaluations) } : truth),
    [liar, truth],
  );
  const { dictionary } = useServices();
  const submit = submitStateFor(input, (w) => dictionary.isAccepted(w));
  const lies = useMemo(
    () =>
      liar && truth.status !== 'playing'
        ? truth.evaluations
            .map((e, r) => fibPosition(truth.id, r, e))
            .map((p, r) => (p === null ? '' : `${r}:${p}`))
            .filter(Boolean)
            .join(',')
        : '',
    [liar, truth],
  );

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
            lies={lies}
            inputInvalid={submit === 'unknown'}
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
            input={input}
            submit={submit}
            disabled={game.status !== 'playing' || keyboardDisabled}
          />
        )}
      </div>
    </>
  );
}
