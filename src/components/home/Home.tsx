import { m } from 'motion/react';
import { ArrowRight, BarChart3, CalendarDays, CircleHelp, Dumbbell, Flame, Settings, Trophy } from 'lucide-react';
import { BRAND, GAME } from '@/config/game';
import { effectiveStreak, winPercentage, type GameState, type LetterState, type Stats } from '@/engine';
import { Logo } from '@/components/layout/Logo';

interface HomeProps {
  challengeNumber: number;
  dateLabel: string;
  daily: GameState;
  practice: GameState;
  practiceNumber: number;
  dailyStats: Stats;
  practiceStats: Stats;
  todayIndex: number;
  countdown: string;
  onPlayDaily: () => void;
  onDailyResults: () => void;
  onPlayPractice: () => void;
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
}

function MiniGrid({ evaluations }: { evaluations: LetterState[][] }) {
  const color: Record<LetterState, string> = { correct: 'bg-correct', present: 'bg-present', absent: 'bg-surface-3' };
  return (
    <div className="flex flex-col gap-[3px]" aria-hidden>
      {evaluations.map((row, r) => (
        <div key={r} className="flex gap-[3px]">
          {row.map((s, i) => (
            <span key={i} className={`size-3 rounded-[3px] ${color[s]}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function dailyStatus(game: GameState): { label: string; cta: string } {
  if (game.status === 'won') return { label: `Solved in ${game.guesses.length}`, cta: 'View results' };
  if (game.status === 'lost') return { label: 'Not solved today', cta: 'View results' };
  if (game.guesses.length === 0) return { label: `${GAME.maxGuesses} guesses to find today’s word`, cta: 'Play' };
  return { label: `In progress · guess ${game.guesses.length + 1} of ${GAME.maxGuesses}`, cta: 'Continue' };
}

export function Home(props: HomeProps) {
  const { daily, practice, dailyStats, practiceStats } = props;
  const status = dailyStatus(daily);
  const dailyDone = daily.status !== 'playing';
  const streak = effectiveStreak(dailyStats, props.todayIndex);
  const practiceInProgress = practice.status === 'playing' && practice.guesses.length > 0;

  const fade = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-4 px-4 pt-4 pb-6 sm:pt-8">
      <m.div {...fade(0)} className="flex flex-col items-center gap-3 pb-2 text-center">
        <Logo size={56} />
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {BRAND.wordmark[0]}
            <span className="text-accent">{BRAND.wordmark[1]}</span>
          </h2>
          <p className="mt-1 text-muted">{BRAND.tagline}</p>
        </div>
      </m.div>

      {/* Daily challenge */}
      <m.section {...fade(1)} aria-labelledby="home-daily" className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
              <CalendarDays className="size-4" aria-hidden /> Daily Challenge
            </p>
            <h3 id="home-daily" className="mt-1 text-xl font-bold">
              #{props.challengeNumber} <span className="font-medium text-muted">· {props.dateLabel}</span>
            </h3>
            <p className="mt-1 text-sm text-muted">{status.label}</p>
          </div>
          {dailyDone ? (
            <MiniGrid evaluations={daily.evaluations} />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-correct/15 text-correct">
              <CalendarDays className="size-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dailyDone ? props.onDailyResults : props.onPlayDaily}
            aria-label={`${status.cta} — Daily Challenge #${props.challengeNumber}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink shadow-sm transition hover:brightness-105 active:scale-[0.98]"
          >
            {dailyDone ? <Trophy className="size-4" aria-hidden /> : null}
            {status.cta}
            {!dailyDone && <ArrowRight className="size-4" aria-hidden />}
          </button>
          {dailyDone && (
            <button
              type="button"
              onClick={props.onPlayDaily}
              aria-label="See today’s board"
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-2"
            >
              See board
            </button>
          )}
        </div>
        <p className="tabular mt-3 text-center text-xs text-muted">
          Next challenge in <strong className="text-text">{props.countdown}</strong>
        </p>
      </m.section>

      {/* Streak strip */}
      <m.section {...fade(2)} aria-label="Daily statistics" className="grid grid-cols-3 gap-2">
        {[
          { icon: <Flame className="size-4 text-present" aria-hidden />, value: streak, label: 'Day streak' },
          { icon: <Trophy className="size-4 text-correct" aria-hidden />, value: dailyStats.maxStreak, label: 'Best streak' },
          { icon: <BarChart3 className="size-4 text-accent" aria-hidden />, value: `${winPercentage(dailyStats)}%`, label: `Won · ${dailyStats.played} played` },
        ].map((it) => (
          <div key={it.label} className="rounded-2xl border border-border bg-surface px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              {it.icon}
              <span className="tabular text-xl font-bold">{it.value}</span>
            </div>
            <p className="mt-0.5 text-[0.7rem] text-muted">{it.label}</p>
          </div>
        ))}
      </m.section>

      {/* Practice */}
      <m.section {...fade(3)} aria-labelledby="home-practice" className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-present/15 text-present">
          <Dumbbell className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="home-practice" className="font-bold">
            Practice
          </h3>
          <p className="text-sm text-muted">
            {practiceInProgress
              ? `Word ${props.practiceNumber} in progress`
              : `Unlimited words · ${practiceStats.wins} solved so far`}
          </p>
        </div>
        <button
          type="button"
          onClick={props.onPlayPractice}
          aria-label={`${practiceInProgress ? 'Continue' : 'Play'} Practice`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-surface-2 px-4 text-sm font-semibold hover:bg-surface-3"
        >
          {practiceInProgress ? 'Continue' : 'Play'} <ArrowRight className="size-4" aria-hidden />
        </button>
      </m.section>

      <m.nav {...fade(4)} aria-label="More" className="flex justify-center gap-2 pt-1">
        {[
          { label: 'How to play', icon: CircleHelp, onClick: props.onHelp },
          { label: 'Statistics', icon: BarChart3, onClick: props.onStats },
          { label: 'Settings', icon: Settings, onClick: props.onSettings },
        ].map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text"
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </m.nav>
    </div>
  );
}
