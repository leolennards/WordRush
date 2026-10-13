import { useCallback, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Heart, House, Play, RotateCcw, Share2 } from 'lucide-react';
import { BRAND } from '@/config/game';
import { SURVIVAL, buildSurvivalShareText, type SurvivalRun } from '@/engine';
import { useGameScreen } from '@/features/game/useGameScreen';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { shareResult } from '@/features/sharing/shareResult';
import { useSurvival } from '@/features/survival/useSurvival';
import { PlayArea } from '@/components/board/PlayArea';
import { useToast } from '@/components/layout/Toasts';
import { BoardOverlay, Button } from '@/components/ui';

interface SurvivalScreenProps {
  avoidAnswer: string;
  inputEnabled: boolean;
  onHome: () => void;
}

export function SurvivalScreen({ avoidAnswer, inputEnabled, onHome }: SurvivalScreenProps) {
  const award = useAward();
  const { progress } = useProgress();
  const best = progress.bestSurvival;
  const [bestBefore, setBestBefore] = useState(best);

  const onRunEnd = useCallback(
    (run: SurvivalRun) =>
      award({
        id: `survival-${run.id}`,
        mode: 'survival',
        won: run.score > 0,
        guesses: 0,
        hardMode: false,
        hints: 0,
        seconds: null,
        survivalScore: run.score,
      }),
    [award],
  );

  const survival = useSurvival(avoidAnswer, onRunEnd);
  const { run, over } = survival;
  const playing = run !== null && !over;
  const screen = useGameScreen(survival, { inputEnabled: inputEnabled && playing, onCompleted: survival.next });

  const start = () => {
    setBestBefore(best);
    survival.start();
  };

  const last = run?.words.at(-1);
  const lifeFlash = last && (last.won ? last.guesses <= SURVIVAL.quickSolve : true);

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
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Survival</h2>
          <p className="tabular truncate text-xs text-muted">
            {run ? `Score ${run.score}` : 'How long can you last?'}
            {best > 0 && ` · Best ${best}`}
          </p>
        </div>
        <div className="relative flex items-center gap-0.5" role="img" aria-label={`${run?.lives ?? SURVIVAL.lives} lives left`}>
          {Array.from({ length: SURVIVAL.maxLives }, (_, i) => {
            const full = i < (run?.lives ?? SURVIVAL.lives);
            return (
              <Heart
                key={i}
                className={`size-5 transition-colors ${full ? 'fill-danger text-danger' : 'text-border-strong'}`}
                aria-hidden
              />
            );
          })}
          <AnimatePresence>
            {playing && lifeFlash && (
              <m.span
                key={run?.words.length}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: [0, 1, 1, 0], y: [4, 18, 22, 26] }}
                transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1] }}
                className={`pointer-events-none absolute right-0 top-4 text-xs font-extrabold whitespace-nowrap ${
                  last?.won ? 'text-correct' : 'text-danger'
                }`}
              >
                {last?.won ? '+1 life' : '−1 life'}
              </m.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <PlayArea
        active={survival}
        screen={screen}
        celebrationSeed={(run?.words.length ?? 0) + 3}
        keyboardDisabled={!playing}
        forceEnd={over}
        overlay={
          run === null ? (
            <BoardOverlay>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger/15">
                <Heart className="size-6 fill-danger text-danger" aria-hidden />
              </span>
              <p className="mt-3 text-lg font-extrabold">Survival</p>
              <p className="mt-1 text-sm text-muted">
                Solve word after word. You have {SURVIVAL.lives} lives: a miss costs one, and solving in{' '}
                {SURVIVAL.quickSolve} guesses or fewer wins one back.
              </p>
              <Button variant="primary" className="mt-4 w-full" onClick={start} autoFocus>
                <Play className="size-4" aria-hidden /> Start
              </Button>
            </BoardOverlay>
          ) : null
        }
        endPanel={over && run ? <SurvivalResult run={run} bestBefore={bestBefore} onAgain={start} onHome={onHome} /> : null}
      />
    </main>
  );
}

function SurvivalResult({
  run,
  bestBefore,
  onAgain,
  onHome,
}: {
  run: SurvivalRun;
  bestBefore: number;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { settings, resolvedTheme } = useSettings();
  const { toast } = useToast();
  const newBest = run.score > bestBefore && run.score > 0;

  const share = async () => {
    const text = buildSurvivalShareText({
      brand: BRAND.name,
      run,
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
      aria-label="Survival result"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Out of lives</p>
            <p className="text-xl font-extrabold">
              {run.score} {run.score === 1 ? 'word' : 'words'} survived
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
          <ul className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto" aria-label="Words this run">
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
