import { m } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  Grid2x2,
  BarChart3,
  ChevronRight,
  CircleHelp,
  Clock3,
  Columns2,
  Flame,
  Heart,
  Settings,
  Shuffle,
  Smartphone,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { BRAND, GAME } from '@/config/game';
import { ACHIEVEMENTS, effectiveStreak, winPercentage, type GameState, type Progress, type Stats } from '@/engine';
import { LevelBar } from '@/components/progress/LevelBar';
import { MiniBoard } from './MiniBoard';
import { QuestsCard } from './QuestsCard';

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
  onBlitz: () => void;
  onDuo: () => void;
  onQuad: () => void;
  onRush: () => void;
  /** Today's Daily Rush score, or null if not played yet. */
  rushScore: number | null;
  onSurvival: () => void;
  onAchievements: () => void;
  onWordBook: () => void;
  wordCount: number;
  progress: Progress;
  onFriends: () => void;
  /** Omitted when already running as an app. */
  onGetApp?: () => void;
  friendsPending: number;
  friendsAvailable: boolean;
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
}

function dailyCopy(game: GameState): { headline: string; detail: string; cta: string } {
  if (game.status === 'won') {
    return {
      headline: game.guesses.length <= 2 ? 'Brilliant solve.' : 'Solved. Nicely done.',
      detail: `You found it in ${game.guesses.length} ${game.guesses.length === 1 ? 'guess' : 'guesses'}.`,
      cta: 'View results',
    };
  }
  if (game.status === 'lost') {
    return { headline: 'Not this time.', detail: 'A fresh puzzle arrives tomorrow.', cta: 'View results' };
  }
  if (game.guesses.length === 0) {
    return {
      headline: 'Today’s word is waiting.',
      detail: `Five letters, ${GAME.maxGuesses} guesses. Same puzzle for everyone.`,
      cta: 'Play',
    };
  }
  return {
    headline: 'Pick up where you left off.',
    detail: `${GAME.maxGuesses - game.guesses.length} of ${GAME.maxGuesses} guesses left.`,
    cta: 'Continue',
  };
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
});

export function Home(props: HomeProps) {
  const { daily, practice, dailyStats, practiceStats } = props;
  const copy = dailyCopy(daily);
  const dailyDone = daily.status !== 'playing';
  const streak = effectiveStreak(dailyStats, props.todayIndex);
  const practiceInProgress = practice.status === 'playing' && practice.guesses.length > 0;
  const unlocked = ACHIEVEMENTS.filter((a) => props.progress.unlocked[a.id]).length;
  const best = props.progress.bestBlitz;
  const bestSurvival = props.progress.bestSurvival;
  const modes = [
    {
      name: 'Practice',
      label: `${practiceInProgress ? 'Continue' : 'Play'} Practice`,
      icon: Shuffle,
      tint: 'bg-surface-2',
      iconClass: '',
      onClick: props.onPlayPractice,
      detail: practiceInProgress
        ? `Word ${props.practiceNumber} in progress`
        : practiceStats.played === 0
          ? 'Unlimited words, with hints.'
          : `${practiceStats.wins} of ${practiceStats.played} solved`,
      isNew: false,
    },
    {
      name: 'Blitz',
      label: 'Play Blitz',
      icon: Zap,
      tint: 'bg-present/20',
      iconClass: 'text-present',
      onClick: props.onBlitz,
      detail: best > 0 ? `Best: ${best} ${best === 1 ? 'word' : 'words'}` : 'Race the clock.',
      isNew: false,
    },
    {
      name: 'Daily Rush',
      label: props.rushScore === null ? 'Play Daily Rush' : 'Daily Rush result',
      icon: CalendarClock,
      tint: 'bg-accent/15',
      iconClass: 'text-accent',
      onClick: props.onRush,
      detail:
        props.rushScore === null
          ? 'Same words for all. One try.'
          : `Today: ${props.rushScore} ${props.rushScore === 1 ? 'word' : 'words'}`,
      isNew: true,
    },
    {
      name: 'Duo',
      label: 'Play Duo',
      icon: Columns2,
      tint: 'bg-correct/15',
      iconClass: 'text-correct',
      onClick: props.onDuo,
      detail: props.progress.duoWins > 0 ? `${props.progress.duoWins} won` : 'Two words at once.',
      isNew: false,
    },
    {
      name: 'Quad',
      label: 'Play Quad',
      icon: Grid2x2,
      tint: 'bg-present/15',
      iconClass: 'text-present',
      onClick: props.onQuad,
      detail: props.progress.quadWins > 0 ? `${props.progress.quadWins} won` : 'Four words, nine guesses.',
      isNew: true,
    },
    {
      name: 'Survival',
      label: 'Play Survival',
      icon: Heart,
      tint: 'bg-danger/12',
      iconClass: 'text-danger',
      onClick: props.onSurvival,
      detail: bestSurvival > 0 ? `Best: ${bestSurvival} ${bestSurvival === 1 ? 'word' : 'words'}` : 'Three lives. How far?',
      isNew: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[30rem] px-4 pt-5 pb-8 sm:pt-10 lg:max-w-[60rem]">
      <m.header {...rise(0)} className="mb-5 sm:mb-8">
        <p className="text-[0.8rem] font-semibold tracking-[0.08em] text-muted uppercase">{props.dateLabel}</p>
        <h2 className="mt-1 text-[1.9rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-[2.4rem]">
          {copy.headline}
        </h2>
      </m.header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
        <div className="flex flex-col gap-4">
          {/* Daily challenge — the hero */}
          <m.section
            {...rise(1)}
            aria-labelledby="home-daily"
            className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <h3 id="home-daily" className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-muted">Daily Challenge</span>
                  <span className="tabular text-sm font-bold">#{props.challengeNumber}</span>
                </h3>
                <p className="mt-3 max-w-[16rem] text-[0.95rem] leading-snug text-muted">{copy.detail}</p>
              </div>
              <MiniBoard game={daily} className="shrink-0" />
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={dailyDone ? props.onDailyResults : props.onPlayDaily}
                aria-label={`${copy.cta} — Daily Challenge #${props.challengeNumber}`}
                className="group inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-5 font-semibold text-ink-text shadow-sm transition hover:opacity-90 active:scale-[0.985]"
              >
                {dailyDone && <Trophy className="size-4" aria-hidden />}
                {copy.cta}
                {!dailyDone && (
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                )}
              </button>
              {dailyDone && (
                <button
                  type="button"
                  onClick={props.onPlayDaily}
                  aria-label="See today’s board"
                  className="min-h-12 rounded-xl bg-surface-2 px-4 text-sm font-semibold transition hover:bg-surface-3"
                >
                  Board
                </button>
              )}
            </div>

            <p className="tabular mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
              <Clock3 className="size-3.5" aria-hidden />
              Next puzzle in <span className="font-semibold text-text">{props.countdown}</span>
            </p>
          </m.section>

          {/* Level & achievements */}
          <m.button
            {...rise(2)}
            type="button"
            onClick={props.onAchievements}
            aria-label={`Achievements — ${unlocked} of ${ACHIEVEMENTS.length} unlocked`}
            className="group w-full rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left transition hover:border-border-strong"
          >
            <LevelBar xp={props.progress.xp} />
            <span className="mt-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                <Award className="size-4 text-present" aria-hidden />
                {unlocked} of {ACHIEVEMENTS.length} achievements
              </span>
              <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </m.button>

          <m.div {...rise(3)}>
            <QuestsCard progress={props.progress} todayIndex={props.todayIndex} countdown={props.countdown} />
          </m.div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Streak strip */}
          <m.section
            {...rise(4)}
            aria-label="Daily statistics"
            className="rounded-[var(--radius-card)] border border-border bg-surface"
          >
            {dailyStats.played === 0 ? (
              <div className="flex items-center gap-3 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-present/15">
                  <Flame className="size-5 text-present" aria-hidden />
                </span>
                <p className="text-sm text-muted">
                  <strong className="block text-[0.95rem] text-text">Start a streak today</strong>
                  Solve the daily puzzle on consecutive days to build it up.
                </p>
              </div>
            ) : (
              <dl className="grid grid-cols-3 divide-x divide-border py-4">
                {[
                  { label: 'Day streak', value: streak, icon: <Flame className="size-4 text-present" aria-hidden /> },
                  { label: 'Best streak', value: dailyStats.maxStreak },
                  { label: 'Win rate', value: `${winPercentage(dailyStats)}%` },
                ].map((it) => (
                  <div key={it.label} className="flex flex-col-reverse items-center gap-0.5 px-2">
                    <dt className="text-xs text-muted">{it.label}</dt>
                    <dd className="tabular flex items-center gap-1 text-2xl font-bold">
                      {it.icon}
                      {it.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </m.section>

          {/* Ways to play */}
          <m.section {...rise(5)} aria-labelledby="home-modes">
            <h3 id="home-modes" className="mb-2 px-1 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
              Ways to play
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {modes.map((mode) => (
                <button
                  key={mode.name}
                  type="button"
                  onClick={mode.onClick}
                  aria-label={mode.label}
                  className="group flex min-h-[7.5rem] flex-col items-start rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left transition hover:border-border-strong active:scale-[0.99]"
                >
                  <span className={`grid size-10 place-items-center rounded-xl ${mode.tint}`}>
                    <mode.icon className={`size-5 ${mode.iconClass}`} aria-hidden />
                  </span>
                  <span className="mt-3 flex items-center gap-1.5 font-bold">
                    {mode.name}
                    {mode.isNew && (
                      <span className="rounded-full bg-present/20 px-1.5 py-px text-[0.6rem] font-bold tracking-wide uppercase">
                        New
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-[0.8rem] leading-snug text-muted">{mode.detail}</span>
                </button>
              ))}
            </div>
          </m.section>

          {props.friendsAvailable && (
            <m.button
              {...rise(6)}
              type="button"
              onClick={props.onFriends}
              aria-label={props.friendsPending > 0 ? `Friends — ${props.friendsPending} waiting for you` : 'Play with friends'}
              className="group flex w-full items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 text-left transition hover:border-border-strong"
            >
              <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2">
                <Users className="size-5" aria-hidden />
                {props.friendsPending > 0 && (
                  <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-present px-1 text-[0.7rem] font-bold text-present-ink">
                    {props.friendsPending}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Play with friends</span>
                <span className="block text-sm text-muted">
                  {props.friendsPending > 0 ? `${props.friendsPending} waiting for you` : 'Challenges and live races.'}
                </span>
              </span>
              <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </m.button>
          )}

          <m.nav {...rise(7)} aria-label="More" className="flex flex-wrap justify-center gap-1 pt-1 lg:justify-start">
            {[
              ...(props.onGetApp ? [{ label: 'Get the app', icon: Smartphone, onClick: props.onGetApp }] : []),
              { label: 'How to play', icon: CircleHelp, onClick: props.onHelp },
              { label: 'Statistics', icon: BarChart3, onClick: props.onStats },
              { label: 'Achievements', icon: Award, onClick: props.onAchievements },
              { label: 'Word Book', icon: BookOpen, onClick: props.onWordBook },
              { label: 'Settings', icon: Settings, onClick: props.onSettings },
            ].map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-text"
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </m.nav>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-subtle">
        {BRAND.tagline} New puzzle every day at 00:00 UTC.
      </p>
    </div>
  );
}
