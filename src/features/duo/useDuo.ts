import { useCallback, useEffect, useReducer } from 'react';
import { GAME } from '@/config/game';
import { createDuo, pickPracticeAnswer, submitDuo, type Dictionary, type DuoState, type GuessError } from '@/engine';
import { useServices } from '@/app/services';
import { useSettings } from '@/features/settings/SettingsContext';
import { revealDuration } from '@/features/game/useGameSession';
import { KEYS, duoSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

interface State {
  game: DuoState;
  number: number;
  input: string;
  revealing: boolean;
  rejection: { error: GuessError; nonce: number } | null;
  /** Set when a guess ends the game in this session (not on restore). */
  justCompleted: boolean;
}

type Action =
  | { type: 'type'; letter: string }
  | { type: 'delete' }
  | { type: 'submit'; dictionary: Dictionary; animate: boolean }
  | { type: 'reveal-done' }
  | { type: 'ack' }
  | { type: 'new'; game: DuoState; number: number };

const locked = (s: State) => s.game.status !== 'playing' || s.revealing;

export function duoReducer(s: State, a: Action): State {
  switch (a.type) {
    case 'type':
      if (locked(s) || s.input.length >= GAME.wordLength || !/^[a-z]$/.test(a.letter)) return s;
      return { ...s, input: s.input + a.letter };
    case 'delete':
      return locked(s) || !s.input ? s : { ...s, input: s.input.slice(0, -1) };
    case 'submit': {
      if (locked(s)) return s;
      const r = submitDuo(s.game, s.input, a.dictionary, GAME.wordLength);
      if (!r.ok) return { ...s, rejection: { error: r.error, nonce: (s.rejection?.nonce ?? 0) + 1 } };
      return { ...s, game: r.state, input: '', revealing: a.animate, justCompleted: r.state.status !== 'playing' };
    }
    case 'reveal-done':
      return s.revealing ? { ...s, revealing: false } : s;
    case 'ack':
      return s.justCompleted ? { ...s, justCompleted: false } : s;
    case 'new':
      return { game: a.game, number: a.number, input: '', revealing: false, rejection: null, justCompleted: false };
  }
}

/** Duo session, saved after every guess so it survives a refresh. */
export function useDuo(avoidAnswer: string) {
  const { store, dictionary, random } = useServices();
  const { reducedMotion } = useSettings();

  const makeGame = useCallback(
    (number: number): DuoState => {
      const first = pickPracticeAnswer(dictionary.answers, [avoidAnswer], random);
      const second = pickPracticeAnswer(dictionary.answers, [avoidAnswer, first], random);
      return createDuo(`duo-${number}`, [first, second]);
    },
    [dictionary, random, avoidAnswer],
  );

  const [state, dispatch] = useReducer(duoReducer, undefined, (): State => {
    const saved = readVersioned(store, KEYS.duo, duoSchema);
    const number = saved?.number ?? 1;
    return {
      game: saved?.game ?? makeGame(number),
      number,
      input: '',
      revealing: false,
      rejection: null,
      justCompleted: false,
    };
  });

  useEffect(() => {
    writeVersioned(store, KEYS.duo, duoSchema, { game: state.game, number: state.number });
  }, [store, state.game, state.number]);

  useEffect(() => {
    if (!state.revealing) return;
    const t = window.setTimeout(() => dispatch({ type: 'reveal-done' }), revealDuration(reducedMotion));
    return () => window.clearTimeout(t);
  }, [state.revealing, reducedMotion]);

  const type = useCallback((letter: string) => dispatch({ type: 'type', letter }), []);
  const remove = useCallback(() => dispatch({ type: 'delete' }), []);
  const submit = useCallback(
    () => dispatch({ type: 'submit', dictionary, animate: !reducedMotion }),
    [dictionary, reducedMotion],
  );
  const ack = useCallback(() => dispatch({ type: 'ack' }), []);
  const newGame = useCallback(
    () => dispatch({ type: 'new', game: makeGame(state.number + 1), number: state.number + 1 }),
    [makeGame, state.number],
  );

  return { state, type, remove, submit, ack, newGame };
}
