import { memo } from 'react';
import { GAME, TIMING } from '@/config/game';
import type { GameState, LetterState } from '@/engine';

type TileState = LetterState | 'tbd' | 'empty' | 'hint';
type TileAnim = 'pop' | 'flip' | 'bounce' | undefined;

const STATE_LABEL: Record<TileState, string> = {
  correct: 'correct',
  present: 'in the word, wrong spot',
  absent: 'not in the word',
  tbd: 'not submitted',
  empty: 'empty',
  hint: 'hint, not typed yet',
};

interface BoardProps {
  game: GameState;
  input: string;
  revealingRow: number | null;
  /** Non-zero shakes the current row; a new value restarts the animation. */
  shakeKey: number;
  /** Bounce the winning row once its reveal has finished. */
  celebrate: boolean;
}

export function Board({ game, input, revealingRow, shakeKey, celebrate }: BoardProps) {
  const rows = Array.from({ length: GAME.maxGuesses }, (_, r) => r);
  const currentRow = game.status === 'playing' ? game.guesses.length : -1;
  const winningRow = game.status === 'won' ? game.guesses.length - 1 : -1;
  // Hinted letters are shown as ghosts in the row being typed.
  const hintLetters = (game.hints ?? []).map((i) => [i, game.answer[i]!] as const);
  const hintKey = hintLetters.map(([i, l]) => `${i}${l}`).join('');

  return (
    <div className="board" role="grid" aria-label="Game board" aria-rowcount={GAME.maxGuesses}>
      {rows.map((r) => {
        const submitted = game.guesses[r];
        const letters = submitted ?? (r === currentRow ? input : '');
        return (
          <Row
            // Re-keying the current row restarts its shake animation.
            key={r === currentRow && shakeKey ? `${r}-${shakeKey}` : r}
            index={r}
            letters={letters}
            evaluation={submitted ? game.evaluations[r] : undefined}
            mode={
              r === revealingRow ? 'reveal' : r === winningRow && celebrate && revealingRow === null ? 'win' : 'static'
            }
            shake={shakeKey > 0 && r === currentRow}
            active={r === currentRow}
            hints={r === currentRow ? hintKey : ''}
          />
        );
      })}
    </div>
  );
}

interface RowProps {
  index: number;
  letters: string;
  evaluation: readonly LetterState[] | undefined;
  mode: 'static' | 'reveal' | 'win';
  shake: boolean;
  active: boolean;
  /** Pairs of position + letter, e.g. "0s3e" (a string so memo can compare it). */
  hints: string;
}

const Row = memo(function Row({ index, letters, evaluation, mode, shake, active, hints }: RowProps) {
  const ghosts = new Map<number, string>();
  for (let k = 0; k + 1 < hints.length; k += 2) ghosts.set(Number(hints[k]), hints[k + 1]!);
  const cells = Array.from({ length: GAME.wordLength }, (_, i) => i);
  const description = evaluation
    ? `${[...letters].map((l, i) => `${l.toUpperCase()} ${STATE_LABEL[evaluation[i] ?? 'absent']}`).join(', ')}`
    : letters
      ? `${letters.toUpperCase()} (typing)`
      : 'empty';

  return (
    <div
      className="board-row"
      role="row"
      aria-rowindex={index + 1}
      aria-label={`Row ${index + 1}: ${description}`}
      aria-current={active ? 'true' : undefined}
      data-shake={shake ? 'true' : undefined}
    >
      {cells.map((i) => {
        const typed = letters[i] ?? '';
        const ghost = !typed && !evaluation ? ghosts.get(i) : undefined;
        const letter = typed || ghost || '';
        const state: TileState = evaluation?.[i] ?? (typed ? 'tbd' : ghost ? 'hint' : 'empty');
        let anim: TileAnim;
        let delay = 0;
        if (mode === 'reveal') {
          anim = 'flip';
          delay = i * TIMING.flipStagger;
        } else if (mode === 'win') {
          anim = 'bounce';
          delay = i * 90;
        } else if (state === 'tbd') {
          anim = 'pop';
        }
        return (
          <div
            key={i}
            role="gridcell"
            className="tile"
            data-state={state}
            data-anim={anim}
            style={delay ? { animationDelay: `${delay}ms` } : undefined}
            aria-label={letter ? `${letter.toUpperCase()}, ${STATE_LABEL[state]}` : 'empty'}
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
});
