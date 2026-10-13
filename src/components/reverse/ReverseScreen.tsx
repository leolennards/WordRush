import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowDownUp, ArrowLeft, Heart, House, Play, RotateCcw } from 'lucide-react';
import { GAME } from '@/config/game';
import { REVERSE, checkReverse, makeReverseRound, type Dictionary, type LetterState, type ReverseRound } from '@/engine';
import { useServices } from '@/app/services';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { usePhysicalKeyboard } from '@/hooks/usePhysicalKeyboard';
import { playCue } from '@/lib/audio/sound';
import { buzz } from '@/lib/haptics';
import { Keyboard } from '@/components/keyboard/Keyboard';
import { useToast } from '@/components/layout/Toasts';
import { WordChip } from '@/components/words/WordChip';
import { BoardOverlay, Button } from '@/components/ui';

interface State {
  phase: 'ready' | 'playing' | 'over';
  id: number;
  rounds: ReverseRound[];
  index: number;
  lives: number;
  input: string;
  /** Wrong tries this round, with the pattern each one actually made. */
  tries: { word: string; pattern: LetterState[] }[];
  solved: boolean[];
  /** Bumped on every rejection, to replay the shake. */
  shake: number;
  /** Brief "solved" moment before the next round. */
  celebrating: boolean;
  mistakes: number;
}

type Action =
  | { type: 'start'; rounds: ReverseRound[]; id: number }
  | { type: 'type'; letter: string }
  | { type: 'delete' }
  | { type: 'reject' }
  | { type: 'wrong'; word: string; pattern: LetterState[] }
  | { type: 'right' }
  | { type: 'next' };

const initial: State = {
  phase: 'ready',
  id: 0,
  rounds: [],
  index: 0,
  lives: REVERSE.lives,
  input: '',
  tries: [],
  solved: [],
  shake: 0,
  celebrating: false,
  mistakes: 0,
};

function reducer(s: State, a: Action): State {
  const locked = s.phase !== 'playing' || s.celebrating;
  switch (a.type) {
    case 'start':
      return { ...initial, phase: 'playing', rounds: a.rounds, id: a.id };
    case 'type':
      return locked || s.input.length >= GAME.wordLength ? s : { ...s, input: s.input + a.letter };
    case 'delete':
      return locked || !s.input ? s : { ...s, input: s.input.slice(0, -1) };
    case 'reject':
      return { ...s, shake: s.shake + 1 };
    case 'wrong': {
      const lives = s.lives - 1;
      return {
        ...s,
        lives,
        mistakes: s.mistakes + 1,
        input: '',
        shake: s.shake + 1,
        tries: [{ word: a.word, pattern: a.pattern }, ...s.tries].slice(0, 3),
        phase: lives <= 0 ? 'over' : s.phase,
        solved: lives <= 0 ? [...s.solved, false] : s.solved,
      };
    }
    case 'right':
      return { ...s, celebrating: true, solved: [...s.solved, true] };
    case 'next': {
      const index = s.index + 1;
      if (index >= s.rounds.length) return { ...s, celebrating: false, phase: 'over' };
      return { ...s, celebrating: false, index, input: '', tries: [] };
    }
  }
}

interface ReverseScreenProps {
  inputEnabled: boolean;
  onHome: () => void;
}

/** See the answer; find a word that makes the colour pattern. */
export function ReverseScreen({ inputEnabled, onHome }: ReverseScreenProps) {
  const { dictionary, random, now } = useServices();
  const { settings, reducedMotion } = useSettings();
  const { toast } = useToast();
  const { progress, gains } = useProgress();
  const award = useAward();
  const [s, dispatch] = useReducer(reducer, initial);
  const round = s.rounds[s.index];

  const cue = useCallback(
    (c: Parameters<typeof playCue>[0]) => {
      if (settings.sound) playCue(c);
      if (settings.haptics && c !== 'reveal') buzz(c);
    },
    [settings.sound, settings.haptics],
  );

  const start = () => {
    const rounds: ReverseRound[] = [];
    for (let i = 0; i < REVERSE.rounds; i++) rounds.push(makeReverseRound(dictionary.answers, random, rounds.map((r) => r.answer)));
    dispatch({ type: 'start', rounds, id: now().getTime() });
  };

  const submit = (dict: Dictionary) => {
    if (!round || s.phase !== 'playing' || s.celebrating) return;
    const r = checkReverse(round, s.input, dict);
    if (r.ok) {
      cue('win');
      toast('Pattern matched!', { tone: 'success' });
      dispatch({ type: 'right' });
    } else if (r.error === 'wrong') {
      cue('invalid');
      toast(s.lives > 1 ? 'Not quite — that makes a different pattern' : 'Out of lives');
      dispatch({ type: 'wrong', word: s.input, pattern: r.pattern });
    } else {
      cue('invalid');
      toast(r.error === 'incomplete' ? 'Not enough letters' : r.error === 'is-answer' ? 'That’s the answer — find another word' : 'Not in word list');
      dispatch({ type: 'reject' });
    }
  };

  usePhysicalKeyboard(
    {
      onLetter: (l) => {
        if (s.input.length < GAME.wordLength) cue('key');
        dispatch({ type: 'type', letter: l });
      },
      onDelete: () => dispatch({ type: 'delete' }),
      onEnter: () => submit(dictionary),
    },
    inputEnabled && s.phase === 'playing',
  );

  // After a match, a beat to enjoy it, then the next round.
  useEffect(() => {
    if (!s.celebrating) return;
    const t = window.setTimeout(() => dispatch({ type: 'next' }), reducedMotion ? 300 : 1000);
    return () => window.clearTimeout(t);
  }, [s.celebrating, reducedMotion]);

  // Record the game once it ends.
  const recorded = useRef(0);
  useEffect(() => {
    if (s.phase !== 'over' || recorded.current === s.id) return;
    recorded.current = s.id;
    const score = s.solved.filter(Boolean).length;
    award({
      id: `reverse-${s.id}`,
      mode: 'reverse',
      won: score > 0,
      guesses: 0,
      hardMode: false,
      hints: 0,
      seconds: null,
      reverseScore: score,
      flawless: s.mistakes === 0,
      words: s.rounds.slice(0, s.solved.length).map((r, i) => ({ answer: r.answer, won: !!s.solved[i] })),
    });
  }, [s.phase, s.id, s.solved, s.mistakes, s.rounds, award]);

  const score = s.solved.filter(Boolean).length;

  return (
    <main id="game" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-3 pt-3 pb-1 sm:pt-5">
        <button
          type="button"
          onClick={onHome}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Reverse</h2>
          <p className="tabular truncate text-xs text-muted">
            {s.phase === 'ready' ? 'Make the pattern' : `Round ${Math.min(s.index + 1, REVERSE.rounds)} of ${REVERSE.rounds} · ${score} solved`}
          </p>
        </div>
        <div className="flex items-center gap-0.5" role="img" aria-label={`${s.lives} lives left`}>
          {Array.from({ length: REVERSE.lives }, (_, i) => (
            <Heart key={i} className={`size-5 transition-colors ${i < s.lives ? 'fill-danger text-danger' : 'text-border-strong'}`} aria-hidden />
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-3 py-2">
        {round && s.phase !== 'ready' && (
          <AnimatePresence mode="wait">
            <m.div
              key={s.index}
              initial={reducedMotion ? false : { x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="flex w-full max-w-[19rem] flex-col items-center gap-4"
            >
              <div className="w-full">
                <p className="mb-1.5 text-center text-[0.68rem] font-bold tracking-[0.14em] text-muted uppercase">The answer is</p>
                <div className="ladder-row" role="group" aria-label={`The answer is ${round.answer.toUpperCase()}`}>
                  {[...round.answer].map((l, i) => (
                    <span key={i} className="tile ladder-tile" data-state="start" aria-hidden>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="w-full">
                <p className="mb-1.5 text-center text-[0.68rem] font-bold tracking-[0.14em] text-muted uppercase">
                  Type a word that makes this
                </p>
                <div
                  key={`shake-${s.shake}`}
                  className="ladder-row"
                  data-shake={s.shake > 0 || undefined}
                  role="group"
                  aria-label={`Target pattern: ${round.pattern.join(', ')}. Your word: ${s.input ? s.input.toUpperCase() : 'empty'}`}
                >
                  {round.pattern.map((p, i) => (
                    <span
                      key={i}
                      className="tile ladder-tile reverse-slot"
                      data-state={p}
                      data-anim={s.celebrating ? 'bounce' : undefined}
                      style={s.celebrating ? { animationDelay: `${i * 80}ms` } : undefined}
                      aria-hidden
                    >
                      {s.input[i] ?? ''}
                    </span>
                  ))}
                </div>
              </div>
              {s.tries.length > 0 && (
                <div className="w-full">
                  <p className="mb-1.5 text-center text-[0.68rem] font-bold tracking-[0.14em] text-muted uppercase">Your tries made</p>
                  <ul className="space-y-1.5">
                    {s.tries.map((t, k) => (
                      <li key={`${t.word}-${k}`} className="ladder-row scale-[0.82] opacity-80" aria-label={`${t.word.toUpperCase()}: ${t.pattern.join(', ')}`}>
                        {t.pattern.map((p, i) => (
                          <span key={i} className="tile ladder-tile" data-state={p} aria-hidden>
                            {t.word[i]}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </m.div>
          </AnimatePresence>
        )}
        {s.phase === 'ready' && (
          <BoardOverlay>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/15">
              <ArrowDownUp className="size-6 text-accent" aria-hidden />
            </span>
            <p className="mt-3 text-lg font-extrabold">Reverse</p>
            <p className="mt-1 text-sm text-muted">
              Wordle, flipped. You see the answer; type any real word that would light up the tiles in exactly the colours
              shown. {REVERSE.rounds} rounds, {REVERSE.lives} lives.
            </p>
            {progress.bestReverse > 0 && (
              <p className="tabular mt-2 text-sm font-semibold">
                Your best: {progress.bestReverse}/{REVERSE.rounds}
              </p>
            )}
            <Button variant="primary" className="mt-4 w-full" onClick={start} autoFocus>
              <Play className="size-4" aria-hidden /> Start
            </Button>
          </BoardOverlay>
        )}
      </div>

      <div className="safe-bottom pt-1 sm:pb-5">
        {s.phase === 'over' ? (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-[30rem] px-3"
            role="region"
            aria-label="Reverse result"
          >
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
              <p className="flex items-center gap-2 text-xl font-extrabold">
                {score}/{REVERSE.rounds} patterns
                {s.mistakes === 0 && score === REVERSE.rounds && (
                  <span className="rounded-full bg-present/20 px-2 py-0.5 text-xs font-bold">Flawless</span>
                )}
                {gains[`reverse-${s.id}`] ? (
                  <span className="tabular rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                    +{gains[`reverse-${s.id}`]} XP
                  </span>
                ) : null}
              </p>
              {round && score < REVERSE.rounds && (
                <p className="mt-1 text-sm text-muted">
                  One word that fit: <strong className="text-text uppercase">{round.example}</strong>
                </p>
              )}
              <p className="mt-3 text-xs font-semibold text-muted">Tap a word for its meaning</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {s.rounds.slice(0, s.solved.length).map((r, i) => (
                  <WordChip key={r.answer} word={r.answer} won={!!s.solved[i]} />
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={onHome} className="flex-1">
                  <House className="size-4" aria-hidden /> Home
                </Button>
                <Button variant="primary" onClick={start} className="flex-1">
                  <RotateCcw className="size-4" aria-hidden /> Play again
                </Button>
              </div>
            </div>
          </m.div>
        ) : (
          <Keyboard
            letterStates={{}}
            onLetter={(l) => {
              if (s.input.length < GAME.wordLength) cue('key');
              dispatch({ type: 'type', letter: l });
            }}
            onDelete={() => dispatch({ type: 'delete' })}
            onEnter={() => submit(dictionary)}
            disabled={s.phase !== 'playing'}
          />
        )}
      </div>
    </main>
  );
}
