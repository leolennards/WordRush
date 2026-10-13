import { useCallback, useEffect, useRef, useState } from 'react';
import {
  blitzRemaining,
  createGame,
  finishBlitzWord,
  pickPracticeAnswer,
  seededRandom,
  startBlitz,
  type BlitzRun,
  type GameState,
} from '@/engine';
import { useServices } from '@/app/services';
import { useGameSession, type GameSession } from '@/features/game/useGameSession';

export type BlitzPhase = 'ready' | 'playing' | 'over';

export interface Blitz extends GameSession {
  phase: BlitzPhase;
  run: BlitzRun | null;
  /** Milliseconds left on the clock. */
  remaining: number;
  start: () => void;
  /** Call once a finished word's reveal is done; loads the next word. */
  next: () => void;
}

const noop = () => {};

/**
 * Blitz runs live in memory only: leaving the screen ends the run.
 * `onRunEnd` is called once when the clock reaches zero.
 */
export function useBlitz(
  avoidAnswer: string,
  onRunEnd: (run: BlitzRun) => void,
  /** Daily Rush: words come from this seed, so everyone gets the same ones. */
  seed?: number,
): Blitz {
  const { dictionary, random, now } = useServices();
  const used = useRef<string[]>([]);
  const counter = useRef(0);
  const rng = useRef<() => number>(random);

  const nextGame = useCallback(() => {
    const answer = pickPracticeAnswer(dictionary.answers, [...used.current, avoidAnswer], rng.current);
    used.current.push(answer);
    counter.current += 1;
    return createGame({ mode: 'blitz', id: `blitz-word-${counter.current}`, answer });
  }, [dictionary, avoidAnswer]);

  const [phase, setPhase] = useState<BlitzPhase>('ready');
  const [run, setRun] = useState<BlitzRun | null>(null);
  const [clock, setClock] = useState(() => now().getTime());
  const runRef = useRef(run);
  const phaseRef = useRef(phase);
  const onEndRef = useRef(onRunEnd);
  useEffect(() => {
    runRef.current = run;
    phaseRef.current = phase;
    onEndRef.current = onRunEnd;
  });

  // Score a word the moment it ends, so a solve right at the buzzer still counts.
  const counted = useRef<string | null>(null);
  const onFinished = useCallback((game: GameState) => {
    if (phaseRef.current !== 'playing' || counted.current === game.id) return;
    counted.current = game.id;
    const word = { answer: game.answer, won: game.status === 'won', guesses: game.guesses.length };
    setRun((r) => r && finishBlitzWord(r, word));
    // Keep the ref in step so the clock sees the bonus before the next render.
    if (runRef.current) runRef.current = finishBlitzWord(runRef.current, word);
  }, []);

  const session = useGameSession({ initialGame: nextGame, persist: noop, onFinished, followHardMode: false });
  const { replace } = session;

  // Tick while playing; the run ends in the interval callback, not during render.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const t = now().getTime();
      setClock(t);
      const current = runRef.current;
      if (current && t >= current.endsAt) {
        window.clearInterval(id);
        setPhase('over');
        onEndRef.current(current);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, now]);

  const start = useCallback(() => {
    const t = now().getTime();
    used.current = [];
    rng.current = seed === undefined ? random : seededRandom(seed);
    setClock(t);
    const fresh = startBlitz(t);
    runRef.current = fresh;
    phaseRef.current = 'playing';
    setRun(fresh);
    replace(nextGame());
    setPhase('playing');
  }, [now, replace, nextGame, seed, random]);

  const next = useCallback(() => {
    if (phaseRef.current === 'playing') replace(nextGame());
  }, [replace, nextGame]);

  return {
    ...session,
    phase,
    run,
    remaining: run ? blitzRemaining(run, clock) : 0,
    start,
    next,
  };
}
