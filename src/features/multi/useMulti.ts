import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { GAME } from '@/config/game';
import {
  MULTI,
  createMulti,
  pickPracticeAnswer,
  submitMulti,
  type Dictionary,
  type GuessError,
  type MultiMode,
  type MultiState,
} from '@/engine';
import { useServices } from '@/app/services';
import { useSettings } from '@/features/settings/SettingsContext';
import { revealDuration } from '@/features/game/useGameSession';
import { KEYS, multiSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

interface State {
  game: MultiState;
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
  | { type: 'new'; game: MultiState; number: number };

const locked = (s: State) => s.game.status !== 'playing' || s.revealing;

export function multiReducer(s: State, a: Action): State {
  switch (a.type) {
    case 'type':
      if (locked(s) || s.input.length >= GAME.wordLength || !/^[a-z]$/.test(a.letter)) return s;
      return { ...s, input: s.input + a.letter };
    case 'delete':
      return locked(s) || !s.input ? s : { ...s, input: s.input.slice(0, -1) };
    case 'submit': {
      if (locked(s)) return s;
      const r = submitMulti(s.game, s.input, a.dictionary, GAME.wordLength);
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

/** Duo or Quad session, saved after every guess so it survives a refresh. */
export function useMulti(mode: MultiMode, avoidAnswer: string) {
  const { store, dictionary, random } = useServices();
  const { reducedMotion } = useSettings();
  const config = MULTI[mode];
  const key = mode === 'duo' ? KEYS.duo : KEYS.quad;
  const schema = useMemo(() => multiSchema(config.words, config.maxGuesses), [config]);

  const makeGame = useCallback(
    (number: number): MultiState => {
      const answers: string[] = [];
      for (let i = 0; i < config.words; i++) {
        answers.push(pickPracticeAnswer(dictionary.answers, [avoidAnswer, ...answers], random));
      }
      return createMulti(`${mode}-${number}`, answers, config.maxGuesses);
    },
    [dictionary, random, avoidAnswer, mode, config],
  );

  const [state, dispatch] = useReducer(multiReducer, undefined, (): State => {
    const saved = readVersioned(store, key, schema);
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
    writeVersioned(store, key, schema, { game: state.game, number: state.number });
  }, [store, key, schema, state.game, state.number]);

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
