import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME } from '@/config/game';
import {
  BOTS,
  botDelay,
  botGuess,
  botLine,
  createGame,
  evaluateGuess,
  pickPracticeAnswer,
  type BotLevel,
  type GameState,
  type LetterState,
} from '@/engine';
import { useServices } from '@/app/services';
import { useGameSession, type GameSession } from '@/features/game/useGameSession';

export type DuelPhase = 'pick' | 'countdown' | 'playing' | 'over';

export interface BotBoard {
  guesses: string[];
  evaluations: LetterState[][];
  status: 'playing' | 'won' | 'lost';
  /** What the bot just said. */
  line: string;
}

export interface Duel extends GameSession {
  phase: DuelPhase;
  level: BotLevel;
  bot: BotBoard;
  /** Who won, once decided. */
  winner: 'you' | 'bot' | 'nobody' | null;
  /** Milliseconds left in the 3-2-1 countdown. */
  countdown: number;
  start: (level: BotLevel) => void;
  pickAgain: () => void;
}

const COUNTDOWN_MS = 3000;
const freshBot = (): BotBoard => ({ guesses: [], evaluations: [], status: 'playing', line: 'Ready when you are.' });
const noop = () => {};

/**
 * Bot Duel: race a bot to the same word. The bot plays on timers while the
 * phase is "playing"; the first to solve wins. Duels live in memory only.
 */
export function useDuel(avoidAnswer: string, onEnd: (result: { won: boolean; guesses: number; level: BotLevel; id: string; answer: string }) => void): Duel {
  const { dictionary, random } = useServices();
  const counter = useRef(0);
  const [phase, setPhase] = useState<DuelPhase>('pick');
  const [level, setLevel] = useState<BotLevel>('medium');
  const [bot, setBot] = useState<BotBoard>(freshBot);
  const [winner, setWinner] = useState<Duel['winner']>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_MS);

  const state = useRef({ phase, winner, bot, level });
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    state.current = { phase, winner, bot, level };
    onEndRef.current = onEnd;
  });

  const newGame = useCallback((): GameState => {
    counter.current += 1;
    const answer = pickPracticeAnswer(dictionary.answers, [avoidAnswer], random);
    return createGame({ mode: 'duel', id: `duel-${Date.now()}-${counter.current}`, answer });
  }, [dictionary, random, avoidAnswer]);

  const finish = useCallback((who: 'you' | 'bot' | 'nobody', game: GameState) => {
    if (state.current.winner) return;
    state.current.winner = who;
    setWinner(who);
    setPhase('over');
    state.current.phase = 'over';
    onEndRef.current({ won: who === 'you', guesses: game.guesses.length, level: state.current.level, id: game.id, answer: game.answer });
  }, []);

  // The player's game ending decides the duel (unless the bot already won).
  const onFinished = useCallback(
    (game: GameState) => {
      if (state.current.phase !== 'playing') return;
      if (game.status === 'won') finish('you', game);
      else if (state.current.bot.status !== 'playing') finish('nobody', game);
      else finish('bot', game);
    },
    [finish],
  );

  const session = useGameSession({ initialGame: newGame, persist: noop, onFinished, followHardMode: false });
  const { replace } = session;
  const gameRef = useRef(session.session.game);
  useEffect(() => {
    gameRef.current = session.session.game;
  });

  // 3-2-1, then go.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const left = COUNTDOWN_MS - (Date.now() - started);
      setCountdown(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        setPhase('playing');
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  // The bot's turns.
  useEffect(() => {
    if (phase !== 'playing' || bot.status !== 'playing') return;
    const profile = BOTS[level];
    const t = window.setTimeout(() => {
      if (state.current.phase !== 'playing') return;
      const game = gameRef.current;
      const current = state.current.bot;
      const guess = botGuess(profile, dictionary.answers, current.guesses, current.evaluations, random);
      const evaluation = evaluateGuess(guess, game.answer);
      const won = guess === game.answer;
      const guesses = [...current.guesses, guess];
      const status = won ? 'won' : guesses.length >= GAME.maxGuesses ? 'lost' : 'playing';
      const next: BotBoard = {
        guesses,
        evaluations: [...current.evaluations, evaluation],
        status,
        line: status === 'lost' ? 'Out of guesses. Your turn to shine.' : botLine(evaluation, won, random),
      };
      state.current.bot = next;
      setBot(next);
      if (won) finish('bot', game);
      else if (status === 'lost' && game.status === 'lost') finish('nobody', game);
    }, botDelay(profile, random));
    return () => window.clearTimeout(t);
  }, [phase, bot, level, dictionary, random, finish]);

  const start = useCallback(
    (lvl: BotLevel) => {
      setLevel(lvl);
      state.current.level = lvl;
      const fresh = freshBot();
      setBot(fresh);
      state.current.bot = fresh;
      setWinner(null);
      state.current.winner = null;
      replace(newGame());
      setCountdown(COUNTDOWN_MS);
      setPhase('countdown');
      state.current.phase = 'countdown';
    },
    [replace, newGame],
  );

  const pickAgain = useCallback(() => {
    setPhase('pick');
    state.current.phase = 'pick';
  }, []);

  return { ...session, phase, level, bot, winner, countdown, start, pickAgain };
}
