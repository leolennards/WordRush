import { useCallback, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, House, Play, RotateCcw, Share2, Timer, Zap } from 'lucide-react';
import { BRAND } from '@/config/game';
import { BLITZ, buildBlitzShareText, formatClock, type BlitzRun } from '@/engine';
import { useBlitz } from '@/features/blitz/useBlitz';
import { useGameScreen } from '@/features/game/useGameScreen';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { shareResult } from '@/features/sharing/shareResult';
import { PlayArea } from '@/components/board/PlayArea';
import { useToast } from '@/components/layout/Toasts';
import { BoardOverlay, Button } from '@/components/ui';

interface BlitzScreenProps {
  /** Today's daily answer, never used in Blitz to avoid spoilers. */
  avoidAnswer: string;
  inputEnabled: boolean;
  onHome: () => void;
}

export function BlitzScreen({ avoidAnswer, inputEnabled, onHome }: BlitzScreenProps) {
  const award = useAward();
  const { progress } = useProgress();
  const best = progress.bestBlitz;
  // The best score before this run, so the result can say "New best!".
  const [bestBefore, setBestBefore] = useState(best);

  const onRunEnd = useCallback(
    (run: BlitzRun) =>
      award({
        id: `blitz-${run.startedAt}`,
        mode: 'blitz',
        won: run.solved > 0,
        guesses: 0,
        hardMode: false,
        hints: 0,
        seconds: null,
        blitzScore: run.solved,
      }),
    [award],
  );

  const blitz = useBlitz(avoidAnswer, onRunEnd);
  const { phase, run, remaining } = blitz;
  const playing = phase === 'playing';
  const screen = useGameScreen(blitz, { inputEnabled: inputEnabled && playing, onCompleted: blitz.next });

  const start = () => {
    setBestBefore(best);
    blitz.start();
  };

  const low = playing && remaining <= 10_000;
  const fill = Math.min(1, remaining / BLITZ.startMs);
  const lastWord = run?.words.at(-1);

  let overlay = null;
  if (phase === 'ready') {
    overlay = (
      <BoardOverlay>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-present/20">
          <Zap className="size-6 text-present" aria-hidden />
        </span>
        <p className="mt-3 text-lg font-extrabold">Blitz</p>
        <p className="mt-1 text-sm text-muted">
          Solve as many words as you can in {BLITZ.startMs / 1000} seconds. Each solve adds{' '}
          <strong className="text-text">+{BLITZ.bonusMs / 1000}s</strong>, a miss costs {BLITZ.penaltyMs / 1000}s.
        </p>
        {best > 0 && (
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
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Blitz</h2>
          <p className="truncate text-xs text-muted">
            {best > 0 ? `Best: ${best} ${best === 1 ? 'word' : 'words'}` : 'Beat the clock'}
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
            <BlitzResult run={run} bestBefore={bestBefore} onAgain={start} onHome={onHome} />
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
}: {
  run: BlitzRun;
  bestBefore: number;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { settings, resolvedTheme } = useSettings();
  const { toast } = useToast();
  const newBest = run.solved > bestBefore && run.solved > 0;

  const share = async () => {
    const text = buildBlitzShareText({
      brand: BRAND.name,
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
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Words this run">
            {run.words.map((w, i) => (
              <li
                key={i}
                className={`rounded-lg px-2 py-1 text-xs font-bold tracking-wide uppercase ${
                  w.won ? 'bg-correct text-correct-ink' : 'bg-surface-2 text-muted line-through'
                }`}
              >
                {w.answer}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <Button onClick={onHome} className="flex-1">
            <House className="size-4" aria-hidden /> Home
          </Button>
          <Button variant="primary" onClick={onAgain} className="flex-1">
            <RotateCcw className="size-4" aria-hidden /> Play again
          </Button>
        </div>
      </div>
    </m.div>
  );
}
