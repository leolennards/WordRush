import { useCallback, useState } from 'react';
import { m } from 'motion/react';
import {
  ArrowLeft,
  Castle,
  CloudFog,
  EyeOff,
  Heart,
  House,
  Lightbulb,
  Play,
  RotateCcw,
  Shield,
  Skull,
  Sun,
  VenetianMask,
  type LucideIcon,
} from 'lucide-react';
import { PERKS, TOWER, TWISTS, towerScore, type Perk, type TowerRun, type Twist } from '@/engine';
import { useGameScreen } from '@/features/game/useGameScreen';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useTower } from '@/features/tower/useTower';
import { PlayArea } from '@/components/board/PlayArea';
import { WordChip } from '@/components/words/WordChip';
import { BoardOverlay, Button } from '@/components/ui';

const TWIST_ICONS: Record<Twist, LucideIcon> = { none: Sun, fog: CloudFog, blind: EyeOff, liar: VenetianMask, hard: Skull };
const PERK_ICONS: Record<Perk, LucideIcon> = { heal: Heart, lantern: Lightbulb, shield: Shield, calm: Sun };
const PERK_TINT: Record<Perk, string> = {
  heal: 'bg-danger/15 text-danger',
  lantern: 'bg-present/20 text-present',
  shield: 'bg-accent/15 text-accent',
  calm: 'bg-correct/15 text-correct',
};

interface TowerScreenProps {
  avoidAnswer: string;
  inputEnabled: boolean;
  onHome: () => void;
}

/** Climb floor after floor: each word has a twist, perks help, hearts run out. */
export function TowerScreen({ avoidAnswer, inputEnabled, onHome }: TowerScreenProps) {
  const award = useAward();
  const { progress } = useProgress();
  const { reducedMotion } = useSettings();
  const best = progress.bestTower;
  const [bestBefore, setBestBefore] = useState(best);

  const onRunEnd = useCallback(
    (run: TowerRun) =>
      award({
        id: `tower-${run.id}`,
        mode: 'tower',
        won: towerScore(run) > 0,
        guesses: 0,
        hardMode: false,
        hints: 0,
        seconds: null,
        towerFloors: towerScore(run),
        words: run.log.map((l) => ({ answer: l.answer, won: l.won })),
      }),
    [award],
  );

  const tower = useTower(avoidAnswer, onRunEnd);
  const { run } = tower;
  const playing = run?.phase === 'playing';
  const screen = useGameScreen(tower, { inputEnabled: inputEnabled && playing });

  const start = () => {
    setBestBefore(best);
    tower.start();
  };

  let overlay = null;
  if (!run) {
    overlay = (
      <BoardOverlay>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink text-ink-text">
          <Castle className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-lg font-extrabold">The Tower</p>
        <p className="mt-1 text-sm text-muted">
          Climb floor by floor. Each word comes with a twist, and they get nastier as you rise. Clear a floor to pick a
          perk; miss one and lose a heart.
        </p>
        <Button variant="primary" className="mt-4 w-full" onClick={start} autoFocus>
          <Play className="size-4" aria-hidden /> Begin the climb
        </Button>
      </BoardOverlay>
    );
  } else if (run.phase === 'intro') {
    overlay = (
      <BoardOverlay>
        <m.p
          key={run.floor}
          initial={reducedMotion ? false : { y: 16, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="tabular text-xs font-black tracking-[0.3em] text-muted uppercase"
        >
          Floor
        </m.p>
        <m.p
          key={`n-${run.floor}`}
          initial={reducedMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.05 }}
          className="tabular text-6xl font-black"
        >
          {run.floor}
        </m.p>
        <ul className="mt-3 space-y-2 text-left">
          {run.twists.map((t, i) => {
            const Icon = TWIST_ICONS[t];
            return (
              <m.li
                key={t}
                initial={reducedMotion ? false : { x: -12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface">
                  <Icon className="size-[1.1rem]" aria-hidden />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-bold">{TWISTS[t].name}</span>
                  <span className="block text-xs text-muted">{TWISTS[t].description}</span>
                </span>
              </m.li>
            );
          })}
        </ul>
        {(run.lantern || run.shield) && (
          <p className="mt-2 text-xs text-muted">
            {run.lantern && 'Your lantern will reveal a letter. '}
            {run.shield && 'Your shield is up.'}
          </p>
        )}
        <Button variant="primary" className="mt-4 w-full" onClick={tower.enterFloor} autoFocus>
          Enter floor {run.floor}
        </Button>
      </BoardOverlay>
    );
  } else if (run.phase === 'perk') {
    overlay = (
      <BoardOverlay>
        <p className="text-xs font-black tracking-[0.3em] text-correct uppercase">Floor {run.floor} cleared</p>
        <p className="mt-1 text-lg font-extrabold">Choose a perk</p>
        <div className="mt-3 grid gap-2">
          {run.offer.map((p, i) => {
            const Icon = PERK_ICONS[p];
            return (
              <m.button
                key={p}
                type="button"
                onClick={() => tower.choosePerk(p)}
                autoFocus={i === 0}
                initial={reducedMotion ? false : { y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 320, damping: 22 }}
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-accent hover:bg-surface-2 active:scale-[0.98]"
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${PERK_TINT[p]}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-bold">{PERKS[p].name}</span>
                  <span className="block text-xs text-muted">{PERKS[p].description}</span>
                </span>
              </m.button>
            );
          })}
        </div>
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
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">The Tower</h2>
          <p className="tabular truncate text-xs text-muted">
            {run ? `Floor ${run.floor}` : 'How high can you climb?'}
            {best > 0 && ` · Best ${best}`}
          </p>
        </div>
        {run && playing && run.twists[0] !== 'none' && (
          <span className="flex gap-1" aria-label={`Twists: ${run.twists.map((t) => TWISTS[t].name).join(', ')}`} role="img">
            {run.twists.map((t) => {
              const Icon = TWIST_ICONS[t];
              return (
                <span key={t} className="grid size-7 place-items-center rounded-lg bg-surface-2" title={TWISTS[t].name}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
              );
            })}
          </span>
        )}
        <div className="flex items-center gap-0.5" role="img" aria-label={`${run?.hearts ?? TOWER.hearts} hearts${run?.shield ? ', shield up' : ''}`}>
          {run?.shield && <Shield className="mr-0.5 size-4 fill-accent/30 text-accent" aria-hidden />}
          {Array.from({ length: TOWER.maxHearts }, (_, i) => (
            <Heart
              key={i}
              className={`size-5 transition-colors ${i < (run?.hearts ?? TOWER.hearts) ? 'fill-danger text-danger' : 'text-border-strong'}`}
              aria-hidden
            />
          ))}
        </div>
      </div>

      <PlayArea
        active={tower}
        screen={screen}
        celebrationSeed={(run?.floor ?? 0) + 5}
        keyboardDisabled={!playing}
        forceEnd={run?.phase === 'over'}
        overlay={overlay}
        endPanel={run?.phase === 'over' ? <TowerResult run={run} bestBefore={bestBefore} onAgain={start} onHome={onHome} /> : null}
      />
    </main>
  );
}

function TowerResult({ run, bestBefore, onAgain, onHome }: { run: TowerRun; bestBefore: number; onAgain: () => void; onHome: () => void }) {
  const score = towerScore(run);
  const newBest = score > bestBefore && score > 0;
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[30rem] px-3"
      role="region"
      aria-label="Tower result"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">The climb is over</p>
        <p className="text-xl font-extrabold">
          {score} {score === 1 ? 'floor' : 'floors'} cleared
          {newBest && <span className="ml-2 align-middle text-sm text-present">New best!</span>}
        </p>
        {run.log.length > 0 && (
          <>
            <p className="mt-3 text-xs font-semibold text-muted">Tap a word for its meaning</p>
            <ul className="mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto" aria-label="Floors">
              {run.log.map((l, i) => (
                <li key={i}>
                  <WordChip word={l.answer} won={l.won} />
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <Button onClick={onHome} className="flex-1">
            <House className="size-4" aria-hidden /> Home
          </Button>
          <Button variant="primary" onClick={onAgain} className="flex-1">
            <RotateCcw className="size-4" aria-hidden /> Climb again
          </Button>
        </div>
      </div>
    </m.div>
  );
}
