import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { GAME } from '@/config/game';
import {
  LADDER,
  LadderGraph,
  ladderNextStep,
  makeLadder,
  submitLadder,
  type Dictionary,
  type LadderError,
  type LadderState,
} from '@/engine';
import { useServices } from '@/app/services';
import { KEYS, ladderSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

interface State {
  game: LadderState;
  number: number;
  input: string;
  rejection: { error: LadderError; nonce: number } | null;
  /** A hinted next word, shown as ghost letters until the player types. */
  hintWord: string | null;
  justCompleted: boolean;
}

type Action =
  | { type: 'type'; letter: string }
  | { type: 'delete' }
  | { type: 'submit'; dictionary: Dictionary }
  | { type: 'hint'; word: string }
  | { type: 'ack' }
  | { type: 'new'; game: LadderState; number: number };

export function ladderReducer(s: State, a: Action): State {
  const locked = s.game.status !== 'playing';
  switch (a.type) {
    case 'type':
      if (locked || s.input.length >= GAME.wordLength || !/^[a-z]$/.test(a.letter)) return s;
      return { ...s, input: s.input + a.letter };
    case 'delete':
      return locked || !s.input ? s : { ...s, input: s.input.slice(0, -1) };
    case 'submit': {
      if (locked) return s;
      const r = submitLadder(s.game, s.input, a.dictionary);
      if (!r.ok) return { ...s, rejection: { error: r.error, nonce: (s.rejection?.nonce ?? 0) + 1 } };
      return { ...s, game: r.state, input: '', hintWord: null, justCompleted: r.state.status !== 'playing' };
    }
    case 'hint':
      if (locked || s.game.hints >= LADDER.maxHints) return s;
      return { ...s, game: { ...s.game, hints: s.game.hints + 1 }, hintWord: a.word, input: '' };
    case 'ack':
      return s.justCompleted ? { ...s, justCompleted: false } : s;
    case 'new':
      return { game: a.game, number: a.number, input: '', rejection: null, hintWord: null, justCompleted: false };
  }
}

// The graph is the same for every ladder: build it once per word list.
const graphs = new WeakMap<readonly string[], LadderGraph>();
function graphFor(words: readonly string[]): LadderGraph {
  let g = graphs.get(words);
  if (!g) {
    g = new LadderGraph(words);
    graphs.set(words, g);
  }
  return g;
}

/** Word Ladder session, saved after every move. */
export function useLadder() {
  const { store, dictionary, random } = useServices();
  const graph = useMemo(() => graphFor(dictionary.answers), [dictionary]);

  const makeGame = useCallback(
    (number: number) => makeLadder(`ladder-${number}`, graph, dictionary.answers, random),
    [graph, dictionary, random],
  );

  const [state, dispatch] = useReducer(ladderReducer, undefined, (): State => {
    const saved = readVersioned(store, KEYS.ladder, ladderSchema);
    const number = saved?.number ?? 1;
    return { game: saved?.game ?? makeGame(number), number, input: '', rejection: null, hintWord: null, justCompleted: false };
  });

  useEffect(() => {
    writeVersioned(store, KEYS.ladder, ladderSchema, { game: state.game, number: state.number });
  }, [store, state.game, state.number]);

  const type = useCallback((letter: string) => dispatch({ type: 'type', letter }), []);
  const remove = useCallback(() => dispatch({ type: 'delete' }), []);
  const submit = useCallback(() => dispatch({ type: 'submit', dictionary }), [dictionary]);
  const ack = useCallback(() => dispatch({ type: 'ack' }), []);
  const hint = useCallback(() => {
    const word = ladderNextStep(state.game, graph);
    if (word) dispatch({ type: 'hint', word });
    return word;
  }, [state.game, graph]);
  const newGame = useCallback(
    () => dispatch({ type: 'new', game: makeGame(state.number + 1), number: state.number + 1 }),
    [makeGame, state.number],
  );
  /** A shortest path from the start, for the result screen. */
  const bestPath = useMemo(() => graph.path(state.game.start, state.game.target) ?? [], [graph, state.game.start, state.game.target]);

  return { state, type, remove, submit, ack, hint, newGame, bestPath };
}
