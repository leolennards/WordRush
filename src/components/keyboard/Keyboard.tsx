import { memo, type ReactNode } from 'react';
import { keepFocus } from '@/lib/accessibility/keepFocus';
import { CornerDownLeft, Delete } from 'lucide-react';
import type { LetterState } from '@/engine';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const STATE_LABEL: Record<LetterState, string> = {
  correct: 'correct',
  present: 'in the word',
  absent: 'not in the word',
};

interface KeyboardProps {
  letterStates: Record<string, LetterState>;
  /** Duo/Quad: a state per word; overrides letterStates. */
  splitStates?: Record<string, (LetterState | undefined)[]>;
  onLetter: (letter: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  disabled?: boolean;
}

export const Keyboard = memo(function Keyboard({ letterStates, splitStates, onLetter, onDelete, onEnter, disabled }: KeyboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-1.5 px-1.5 select-none sm:gap-2" role="group" aria-label="Keyboard">
      {ROWS.map((row, r) => (
        <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
          {r === 1 && <div className="flex-[0.5]" aria-hidden />}
          {r === 2 && (
            <Key wide onClick={onEnter} label="Enter" disabled={disabled}>
              <span className="hidden text-[0.8rem] font-semibold min-[380px]:inline">Enter</span>
              <CornerDownLeft className="size-5 min-[380px]:hidden" aria-hidden />
            </Key>
          )}
          {[...row].map((letter) => {
            const state = splitStates ? undefined : letterStates[letter];
            const split = splitStates?.[letter];
            const label = split
              ? `${letter.toUpperCase()}, ${split
                  .map((s, k) => `word ${k + 1} ${s ? STATE_LABEL[s] : 'unknown'}`)
                  .join(', ')}`
              : state
                ? `${letter.toUpperCase()}, ${STATE_LABEL[state]}`
                : letter.toUpperCase();
            return (
              <Key
                key={letter}
                state={state}
                split={split}
                onClick={() => onLetter(letter)}
                label={label}
                disabled={disabled}
              >
                {letter.toUpperCase()}
              </Key>
            );
          })}
          {r === 2 && (
            <Key wide onClick={onDelete} label="Delete letter" disabled={disabled}>
              <Delete className="size-5" aria-hidden />
            </Key>
          )}
          {r === 1 && <div className="flex-[0.5]" aria-hidden />}
        </div>
      ))}
    </div>
  );
});

function Key(props: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  state?: LetterState;
  split?: (LetterState | undefined)[];
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`key flex h-[clamp(2.75rem,7.2dvh,3.6rem)] items-center justify-center text-[clamp(0.95rem,2.4dvh,1.15rem)] ${
        props.wide ? 'flex-[1.55]' : 'flex-1'
      } min-w-0`}
      data-state={props.state}
      data-split={props.split?.length}
      data-k0={props.split?.[0]}
      data-k1={props.split?.[1]}
      data-k2={props.split?.[2]}
      data-k3={props.split?.[3]}
      data-dead={props.split && props.split.every((s) => s === 'absent' || s === undefined) && props.split.some(Boolean) ? true : undefined}
      aria-label={props.label}
      aria-disabled={props.disabled || undefined}
      onMouseDown={keepFocus}
      onClick={() => {
        if (!props.disabled) props.onClick();
      }}
    >
      {props.children}
    </button>
  );
}
