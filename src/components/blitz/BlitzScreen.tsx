import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, CalendarClock, House, Play, RotateCcw, Share2, Timer, Zap } from 'lucide-react';
import { BRAND } from '@/config/game';
import { BLITZ, buildBlitzShareText, challengeNumber, formatClock, rushSeed, type BlitzRun } from '@/engine';
import { useServices } from '@/app/services';
import { KEYS, rushSchema, type RushResult } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';
import { useCountdown } from '@/hooks/useToday';
import { useBlitz } from '@/features/blitz/useBlitz';
import { useGameScreen } from '@/features/game/useGameScreen';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { shareResult } from '@/features/sharing/shareResult';
import { PlayArea } from '@/components/board/PlayArea';
import { useToast } from '@/components/layout/Toasts';
import { BoardOverlay, Button } from '@/components/ui';
import { WordChip } from '@/components/words/WordChip';

interface BlitzScreenProps {
  /** Today's daily answer, never used in Blitz to avoid spoilers. */
  avoidAnswer: string;
  inputEnabled: boolean;
  onHome: () => void;
  /** Daily Rush: today's day index (same words for everyone, one try). */
  rushDay?: number;
}

export function BlitzScreen(props: BlitzScreenProps) {
  const { store } = useServices();
  // Today's Rush already played (or left part-way): show the result instead.
  const [done] = useState(() => {
    if (props.rushDay === undefined) return null;
    const saved = readVersioned(store, KEYS.rush, rushSchema);
    return saved && saved.day === props.rushDay ? saved : null;
  });
  if (done) return <RushDone result={done} onHome={props.onHome} />;
  return <BlitzGame {...props} />;
}

function BlitzGame({ avoidAnswer, inputEnabled, onHome, rushDay }: BlitzScreenProps) {
  const rush = rushDay !== undefined;
  const { store } = useServices();
  const award = useAward();
  const { progress } = useProgress();
  const best = progress.bestBlitz;
  // The best score before this run, so the result can say "New best!".
  const [bestBefore, setBestBefore] = useState(best);

  const onRunEnd = useCallback(
    (run: BlitzRun) =>
      award({
        id: rush ? `rush-${rushDay}` : `blitz-${run.startedAt}`,
        mode: 'blitz',
        won: run.solved > 0,
        guesses: 0,
        hardMode: false,
        hints: 0,
        seconds: null,
        blitzScore: run.solved,
        ...(rush ? { rush: true } : {}),
        words: run.words.map((w) => ({ answer: w.answer, won: w.won })),
      }),
    [award, rush, rushDay],
  );

  const blitz = useBlitz(avoidAnswer, onRunEnd, rush ? rushSeed(rushDay) : undefined);
  const { phase, run, remaining } = blitz;
  const playing = phase === 'playing';
  const screen = useGameScreen(blitz, { inputEnabled: inputEnabled && playing, onCompleted: blitz.next });

  const start = () => {
    setBestBefore(best);
    if (rush) writeVersioned(store, KEYS.rush, rushSchema, { day: rushDay, solved: 0, words: [], done: false });
    blitz.start();
  };

  // Daily Rush: save progress as it happens, so leaving counts as finishing.
  useEffect(() => {
    if (!rush || !run) return;
    writeVersioned(store, KEYS.rush, rushSchema, {
      day: rushDay,
      solved: run.solved,
      words: run.words.map((w) => ({ answer: w.answer, won: w.won })),
      done: phase === 'over',
    });
  }, [rush, rushDay, run, phase, store]);

  const title = rush ? `Daily Rush #${challengeNumber(rushDay)}` : 'Blitz';

  const low = playing && remaining <= 10_000;
  const fill = Math.min(1, remaining / BLITZ.startMs);
  const lastWord = run?.words.at(-1);

  let overlay = null;
  if (phase === 'ready') {
    overlay = (
      <BoardOverlay>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-present/20">
          {rush ? <CalendarClock className="size-6 text-present" aria-hidden /> : <Zap className="size-6 text-present" aria-hidden />}
        </span>
        <p className="mt-3 text-lg font-extrabold">{title}</p>
        <p className="mt-1 text-sm text-muted">
          {rush && 'Everyone gets the same words today, and you get one try. '}
          Solve as many words as you can in {BLITZ.startMs / 1000} seconds. Each solve adds{' '}
          <strong className="text-text">+{BLITZ.bonusMs / 1000}s</strong>, a miss costs {BLITZ.penaltyMs / 1000}s.
        </p>
        {rush && <p className="mt-2 text-xs text-muted">Leaving during the run ends it.</p>}
        {!rush && best > 0 && (
          <p className="mt-2 text-sm font-semibold">
            Your best: {best} {best === 1 ? 'word' : 'words'}
          </p>
        )}
        <Button variant="primary" className="mt-4 w-full" onClick={start} autoFocus>
          <Play className="size-4" aria-hidden /> Start
        </Button>
      </BoardOverlay>
    );
  }

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
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">{title}</h2>
          <p className="truncate text-xs text-muted">
            {rush ? 'Same words for everyone · one try' : best > 0 ? `Best: ${best} ${best === 1 ? 'word' : 'words'}` : 'Beat the clock'}
          </p>
        </div>
        <div
          className="tabular inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-bold"
          aria-label={`${run?.solved ?? 0} words solved`}
        >
          <Zap className="size-3.5 text-present" aria-hidden />
          {run?.solved ?? 0}
        </div>
      </div>

      {/* Clock */}
      <div className="mx-auto w-full max-w-[26rem] px-3 pt-1">
        <div className="relative flex items-center gap-3">
          <Timer className={`size-4 shrink-0 ${low ? 'text-danger' : 'text-muted'}`} aria-hidden />
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ease-linear ${low ? 'bg-danger' : 'bg-correct'}`}
              style={{ width: `${(phase === 'ready' ? 1 : fill) * 100}%` }}
            />
          </div>
          <span
            className={`tabular w-12 text-right text-sm font-bold ${low ? 'animate-pulse text-danger' : ''}`}
            role="timer"
            aria-label="Time left"
          >
            {formatClock(phase === 'ready' ? BLITZ.startMs : remaining)}
          </span>
          <AnimatePresence>
            {playing && lastWord && (
              <m.span
                key={run?.words.length}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: [0, 1, 1, 0], y: [4, -14, -18, -22] }}
                transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1] }}
                className={`pointer-events-none absolute right-0 -top-3 text-xs font-extrabold ${
                  lastWord.won ? 'text-correct' : 'text-danger'
                }`}
              >
                {lastWord.won ? `+${BLITZ.bonusMs / 1000}s` : `−${BLITZ.penaltyMs / 1000}s`}
              </m.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <PlayArea
        active={blitz}
        screen={screen}
        celebrationSeed={(run?.words.length ?? 0) + 7}
        keyboardDisabled={!playing}
        overlay={overlay}
        forceEnd={phase === 'over'}
        endPanel={
          run && phase === 'over' ? (
            <BlitzResult
              run={run}
              bestBefore={bestBefore}
              onAgain={rush ? undefined : start}
              onHome={onHome}
              label={rush ? title : undefined}
            />
          ) : null
        }
      />
    </main>
  );
}

function BlitzResult({
  run,
  bestBefore,
  onAgain,
  onHome,
  label,
}: {
  run: { solved: number; words: { answer: string; won: boolean }[] };
  bestBefore: number;
  /** Omitted for Daily Rush (one try). */
  onAgain?: () => void;
  onHome: () => void;
  /** Daily Rush title, used in the share text. */
  label?: string;
}) {
  const countdown = useCountdown(useServices().now);
  const { settings, resolvedTheme } = useSettings();
  const { toast } = useToast();
  const newBest = run.solved > bestBefore && run.solved > 0;

  const share = async () => {
    const text = buildBlitzShareText({
      brand: BRAND.name,
      label,
      solved: run.solved,
      results: run.words.map((w) => w.won),
      highContrast: settings.highContrast,
      darkSquares: resolvedTheme === 'dark',
      url: BRAND.siteUrl || `${window.location.origin}${window.location.pathname}`,
    });
    const outcome = await shareResult(text);
    if (outcome === 'copied') toast('Result copied to clipboard', { tone: 'success' });
    else if (outcome === 'shared') toast('Shared!', { tone: 'success' });
    else if (outcome === 'failed') toast('Couldn’t share — your browser blocked clipboard access', { duration: 3200 });
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[30rem] px-3"
      role="region"
      aria-label="Blitz result"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Time’s up!</p>
            <p className="text-xl font-extrabold">
              {run.solved} {run.solved === 1 ? 'word' : 'words'} solved
              {newBest && <span className="ml-2 align-middle text-sm text-present">New best!</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-semibold transition hover:bg-surface-3 active:scale-[0.98]"
          >
            <Share2 className="size-4" aria-hidden /> Share
          </button>
        </div>
        {run.words.length > 0 && (
          <>
            <p className="mt-3 text-xs font-semibold text-muted">Tap a word for its meaning</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Words this run">
              {run.words.map((w, i) => (
                <li key={i}>
                  <WordChip word={w.answer} won={w.won} />
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <Button onClick={onHome} className="flex-1">
            <House className="size-4" aria-hidden /> Home
          </Button>
          {onAgain ? (
            <Button variant="primary" onClick={onAgain} className="flex-1">
              <RotateCcw className="size-4" aria-hidden /> Play again
            </Button>
          ) : (
            <p className="tabular flex flex-1 items-center justify-center text-center text-xs text-muted">
              Next Rush in <span className="ml-1 font-semibold text-text">{countdown}</span>
            </p>
          )}
        </div>
      </div>
    </m.div>
  );
}

/** Today's Daily Rush, already played. */
function RushDone({ result, onHome }: { result: RushResult; onHome: () => void }) {
  const title = `Daily Rush #${challengeNumber(result.day)}`;
  return (
    <main id="game" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[30rem] items-center gap-3 px-3 pt-3 pb-1 sm:pt-5">
        <button
          type="button"
          onClick={onHome}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">{title}</h2>
          <p className="truncate text-xs text-muted">{result.done ? 'You’ve played today’s Rush' : 'Your run ended when you left'}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center pb-6">
        <BlitzResult run={result} bestBefore={Infinity} onHome={onHome} label={title} />
      </div>
    </main>
  );
}
