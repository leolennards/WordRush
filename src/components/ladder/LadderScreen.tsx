import { useEffect, useRef } from 'react';
import { m } from 'motion/react';
import { ArrowDown, ArrowLeft, Flag, House, Lightbulb, RotateCcw, Star } from 'lucide-react';
import {
  LADDER,
  LADDER_ERRORS,
  changedIndex,
  ladderCurrent,
  ladderMovesLeft,
  ladderStars,
  type LadderState,
} from '@/engine';
import { GAME } from '@/config/game';
import { useServices } from '@/app/services';
import { useLadder } from '@/features/ladder/useLadder';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { usePhysicalKeyboard } from '@/hooks/usePhysicalKeyboard';
import { playCue } from '@/lib/audio/sound';
import { buzz } from '@/lib/haptics';
import { keepFocus } from '@/lib/accessibility/keepFocus';
import { markStarted, secondsSinceStart } from '@/lib/storage/timers';
import { Keyboard } from '@/components/keyboard/Keyboard';
import { Celebration } from '@/components/layout/Celebration';
import { useToast } from '@/components/layout/Toasts';
import { WordChip } from '@/components/words/WordChip';
import { Button } from '@/components/ui';

interface LadderScreenProps {
  inputEnabled: boolean;
  onHome: () => void;
}

/** Word Ladder: change one letter at a time to reach the target word. */
export function LadderScreen({ inputEnabled, onHome }: LadderScreenProps) {
  const ladder = useLadder();
  const { game, input, rejection, hintWord, justCompleted } = ladder.state;
  const { settings, reducedMotion } = useSettings();
  const { store, now } = useServices();
  const { toast } = useToast();
  const { gains } = useProgress();
  const award = useAward();
  const playing = game.status === 'playing';

  const cue = (c: Parameters<typeof playCue>[0]) => {
    if (settings.sound) playCue(c);
    if (settings.haptics && c !== 'reveal') buzz(c);
  };

  const onLetter = (l: string) => {
    if (playing && input.length < GAME.wordLength) {
      cue('key');
      if (game.steps.length === 0 && input.length === 0) markStarted(store, game.id, now().getTime());
    }
    ladder.type(l);
  };
  const onEnter = () => {
    if (playing && input.length === GAME.wordLength) cue('reveal');
    ladder.submit();
  };
  usePhysicalKeyboard({ onLetter, onDelete: ladder.remove, onEnter }, inputEnabled && playing);

  // Rejected moves: toast + sound (the row shakes below).
  const lastRejection = useRef(rejection?.nonce ?? 0);
  useEffect(() => {
    if (!rejection || rejection.nonce === lastRejection.current) return;
    lastRejection.current = rejection.nonce;
    if (rejection.error === 'game-over') return;
    toast(LADDER_ERRORS[rejection.error]);
    if (settings.sound) playCue('invalid');
    if (settings.haptics) buzz('invalid');
  }, [rejection, toast, settings.sound, settings.haptics]);

  // Completion.
  const latest = useRef({ award, game, settings });
  useEffect(() => {
    latest.current = { award, game, settings };
  });
  const { ack } = ladder;
  useEffect(() => {
    if (!justCompleted) return;
    const { award: give, game: g, settings: s } = latest.current;
    const won = g.status === 'won';
    if (s.sound) playCue(won ? 'win' : 'lose');
    if (s.haptics) buzz(won ? 'win' : 'lose');
    toast(won ? 'You reached the top!' : 'Out of moves', { tone: won ? 'success' : 'neutral', duration: 2200 });
    give({
      id: g.id,
      mode: 'ladder',
      won,
      guesses: g.steps.length,
      hardMode: false,
      hints: g.hints,
      seconds: secondsSinceStart(store, g.id, now().getTime()),
      stars: ladderStars(g),
      words: [{ answer: g.target, won }],
    });
    const t = window.setTimeout(ack, reducedMotion ? 300 : 1600);
    return () => window.clearTimeout(t);
  }, [justCompleted, ack, now, reducedMotion, store, toast]);

  // Keep the newest rung in view.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [game.steps.length, reducedMotion]);

  const left = ladderMovesLeft(game);
  const hintsLeft = LADDER.maxHints - game.hints;
  const onHint = () => {
    const word = ladder.hint();
    if (word) toast(`Try ${word.toUpperCase()}`, { duration: 2400 });
    else toast('No hint available from here');
  };
  const shake = rejection && rejection.error !== 'game-over' ? rejection.nonce : 0;
  const current = ladderCurrent(game);

  return (
    <main id="game" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[26rem] flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pt-3 pb-1 sm:pt-5">
        <button
          type="button"
          onClick={onHome}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Word Ladder</h2>
          <p className="truncate text-xs text-muted">One letter at a time · Ladder {ladder.state.number}</p>
        </div>
        {playing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={onHint}
              disabled={hintsLeft === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-xs font-semibold transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={hintsLeft > 0 ? `Hint, ${hintsLeft} left` : 'No hints left'}
            >
              <Lightbulb className="size-3.5 text-present" aria-hidden /> Hint <span className="tabular text-muted">{hintsLeft}</span>
            </button>
            <span
              className={`tabular inline-flex h-8 items-center rounded-full px-3 text-xs font-bold ${
                left <= 1 ? 'bg-danger/15 text-danger' : 'bg-surface-2'
              }`}
            >
              {left} {left === 1 ? 'move' : 'moves'} left
            </span>
          </div>
        )}
      </div>

      <div className="relative mx-auto flex min-h-0 w-full max-w-[22rem] flex-1 flex-col px-3 py-2">
        <p className="mb-1 text-center text-[0.68rem] font-bold tracking-[0.14em] text-muted uppercase">
          Start · par {game.par}
        </p>
        <LadderRow word={game.start} target={game.target} kind="start" label={`Start word ${game.start.toUpperCase()}`} />

        <div ref={scroller} className="ladder-rails min-h-0 flex-1 overflow-y-auto overscroll-contain py-1" aria-live="polite">
          {game.steps.map((w, i) => (
            <div key={`${i}-${w}`}>
              <Rung />
              <LadderRow
                word={w}
                target={game.target}
                kind="step"
                changed={changedIndex(i === 0 ? game.start : game.steps[i - 1]!, w)}
                label={`Step ${i + 1}: ${w.toUpperCase()}`}
                animate={!reducedMotion}
              />
            </div>
          ))}
          {playing && (
            <>
              <Rung />
              <LadderRow
                key={shake ? `input-${shake}` : 'input'}
                word={input}
                ghost={hintWord ?? undefined}
                target={game.target}
                kind="input"
                shake={shake > 0}
                label={`Next word: ${input ? input.toUpperCase() : 'empty'}. Change one letter of ${current.toUpperCase()}`}
              />
            </>
          )}
        </div>

        <div className="flex flex-col items-center">
          <ArrowDown className="my-1 size-4 text-subtle" aria-hidden />
          <p className="mb-1 flex items-center gap-1 text-[0.68rem] font-bold tracking-[0.14em] text-muted uppercase">
            <Flag className="size-3" aria-hidden /> Target
          </p>
          <LadderRow word={game.target} target={game.target} kind="target" label={`Target word ${game.target.toUpperCase()}`} />
        </div>
        {justCompleted && game.status === 'won' && !reducedMotion && <Celebration seed={ladder.state.number} />}
      </div>

      <div className="safe-bottom pt-1 sm:pb-5">
        {!playing && !justCompleted ? (
          <LadderResult game={game} bestPath={ladder.bestPath} xp={gains[game.id]} onAgain={ladder.newGame} onHome={onHome} />
        ) : (
          <Keyboard letterStates={{}} onLetter={onLetter} onDelete={ladder.remove} onEnter={onEnter} disabled={!playing} />
        )}
      </div>
    </main>
  );
}

function Rung() {
  return <div className="h-2.5" aria-hidden />;
}

function LadderRow({
  word,
  target,
  kind,
  changed = -1,
  ghost,
  shake = false,
  label,
  animate = false,
}: {
  word: string;
  target: string;
  kind: 'start' | 'step' | 'input' | 'target';
  changed?: number;
  ghost?: string;
  shake?: boolean;
  label: string;
  animate?: boolean;
}) {
  const row = (
    <div className="ladder-row" data-shake={shake || undefined} role="group" aria-label={label}>
      {Array.from({ length: GAME.wordLength }, (_, i) => {
        const typed = word[i] ?? '';
        const letter = typed || (kind === 'input' && !word ? (ghost?.[i] ?? '') : '');
        let state: string;
        if (kind === 'target') state = 'correct';
        else if (kind === 'input') state = typed ? 'tbd' : letter ? 'hint' : 'empty';
        else if (kind === 'start') state = 'start';
        else state = letter === target[i] ? 'correct' : 'step';
        return (
          <span key={i} className="tile ladder-tile" data-state={state} data-changed={i === changed || undefined} aria-hidden>
            {letter}
          </span>
        );
      })}
    </div>
  );
  if (!animate) return row;
  return (
    <m.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>
      {row}
    </m.div>
  );
}

function LadderResult({
  game,
  bestPath,
  xp,
  onAgain,
  onHome,
}: {
  game: LadderState;
  bestPath: string[];
  xp?: number;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { reducedMotion } = useSettings();
  const won = game.status === 'won';
  const stars = ladderStars(game);

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[30rem] px-3"
      role="region"
      aria-label="Ladder result"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-bold">
              {won ? `Climbed in ${game.steps.length} ${game.steps.length === 1 ? 'move' : 'moves'}` : 'Out of moves'}
              {xp ? (
                <span className="tabular rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">+{xp} XP</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">
              Par {game.par}
              {game.hints > 0 && ` · ${game.hints} ${game.hints === 1 ? 'hint' : 'hints'}`}
            </p>
          </div>
          {won && (
            <div className="flex gap-0.5" role="img" aria-label={`${stars} of 3 stars`}>
              {[0, 1, 2].map((i) => (
                <m.span
                  key={i}
                  initial={reducedMotion ? false : { scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 + i * 0.15 }}
                >
                  <Star className={`size-7 ${i < stars ? 'fill-present text-present' : 'text-border-strong'}`} aria-hidden />
                </m.span>
              ))}
            </div>
          )}
        </div>
        {bestPath.length > 1 && (
          <>
            <p className="mt-3 mb-1.5 text-xs font-semibold text-muted">A shortest path · tap a word for its meaning</p>
            <div className="flex flex-wrap items-center gap-1">
              {bestPath.map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  {i > 0 && <span className="text-xs text-subtle" aria-hidden>→</span>}
                  <WordChip word={w} won={i === bestPath.length - 1 || i === 0} />
                </span>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <Button onClick={onHome} className="flex-1">
            <House className="size-4" aria-hidden /> Home
          </Button>
          <Button variant="primary" onClick={onAgain} className="flex-1">
            <RotateCcw className="size-4" aria-hidden /> New ladder
          </Button>
        </div>
      </div>
    </m.div>
  );
}
