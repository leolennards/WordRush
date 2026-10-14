import { memo, type ReactNode } from 'react';
import { keepFocus } from '@/lib/accessibility/keepFocus';
import { AnimatePresence, m } from 'motion/react';
import { ArrowRight, Ban, Delete } from 'lucide-react';
import { GAME } from '@/config/game';
import type { LetterState } from '@/engine';

import type { SubmitState } from './submit';

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
  /** Submits the typed word (only offered for a real word). */
  onEnter: () => void;
  /** Letters typed in the current row, to drive the Submit button. */
  input: string;
  submit: SubmitState;
  disabled?: boolean;
}

export const Keyboard = memo(function Keyboard({
  letterStates,
  splitStates,
  onLetter,
  onDelete,
  onEnter,
  input,
  submit,
  disabled,
}: KeyboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-1.5 px-1.5 select-none sm:gap-2" role="group" aria-label="Keyboard">
      {ROWS.map((row, r) => (
        <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
          {r === 1 && <div className="flex-[0.5]" aria-hidden />}
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
          {r === 2 && <div className="flex-[0.5]" aria-hidden />}
        </div>
      ))}
      <SubmitButton state={disabled ? 'short' : submit} filled={input.length} onSubmit={onEnter} disabled={disabled} />
    </div>
  );
});

/**
 * One wide button under the keyboard. Greyed out (with a letter counter) until
 * the row is full, then "Submit" for a real word, or "Not a real word" — which
 * can't be pressed — for anything else.
 */
function SubmitButton({
  state,
  filled,
  onSubmit,
  disabled,
}: {
  state: SubmitState;
  filled: number;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const ready = state === 'ready' && !disabled;
  return (
    <button
      type="button"
      className="submit-key relative mx-auto flex h-[clamp(2.6rem,6.4dvh,3.25rem)] w-full max-w-[34rem] items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-key)] text-[0.95rem] font-bold"
      data-state={state}
      disabled={!ready}
      aria-disabled={!ready}
      aria-label={state === 'ready' ? 'Submit' : state === 'unknown' ? 'Not a real word' : `Submit (${filled} of ${GAME.wordLength} letters)`}
      onMouseDown={keepFocus}
      onClick={() => {
        if (ready) onSubmit();
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {state === 'unknown' ? (
          <m.span
            key="unknown"
            className="inline-flex items-center gap-2"
            initial={{ x: 0 }}
            animate={{ x: [10, -6, 4, 0] }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.35 }}
          >
            <Ban className="size-4" aria-hidden /> Not a real word
          </m.span>
        ) : state === 'ready' ? (
          <m.span
            key="ready"
            className="inline-flex items-center gap-2"
            initial={{ y: 6, scale: 0.92 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ type: 'spring', stiffness: 600, damping: 26 }}
          >
            Submit <ArrowRight className="size-4" aria-hidden />
          </m.span>
        ) : (
          <m.span key="short" className="inline-flex items-center gap-2.5" exit={{ opacity: 0, transition: { duration: 0.08 } }}>
            Submit
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: GAME.wordLength }, (_, i) => (
                <span key={i} className={`size-1.5 rounded-full transition-colors ${i < filled ? 'bg-current' : 'bg-current/25'}`} />
              ))}
            </span>
          </m.span>
        )}
      </AnimatePresence>
    </button>
  );
}

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
      className={`key flex h-[clamp(2.6rem,6.6dvh,3.4rem)] items-center justify-center text-[clamp(0.95rem,2.4dvh,1.15rem)] ${
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
