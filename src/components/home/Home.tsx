import { useState, type ComponentType, type ReactNode } from 'react';
import { m } from 'motion/react';
import {
  ArrowDownUp,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  CalendarClock,
  Castle,
  ChevronRight,
  CircleHelp,
  Clock3,
  Columns2,
  Flame,
  Footprints,
  Grid2x2,
  Heart,
  LayoutGrid,
  Shuffle,
  Smartphone,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { BRAND, GAME } from '@/config/game';
import { ACHIEVEMENTS, TITLES, chestReady, coinBalance, effectiveStreak, freezesHeld, frozenDays, levelFor, rankFor, winPercentage, type GameState, type Progress, type Stats } from '@/engine';
import { Coin } from '@/components/shop/Coin';
import { Dialog } from '@/components/dialogs/Dialog';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import { useSettings } from '@/features/settings/SettingsContext';
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
  onLadder: () => void;
  onDuel: () => void;
  onTower: () => void;
  onReverse: () => void;
  /** Today's Daily Rush score, or null if not played yet. */
  rushScore: number | null;
  onSurvival: () => void;
  onAchievements: () => void;
  onRanks: () => void;
  onWordBook: () => void;
  onShop: () => void;
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
  onProfile: () => void;
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
      detail: `Guess the five-letter word in ${GAME.maxGuesses} tries. Same puzzle for everyone.`,
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

interface Mode {
  name: string;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  color: string;
  onClick: () => void;
  detail: string;
}

/**
 * Home, phone first: a slim greeting, today's Daily Challenge, four favourite ways to play with the
 * rest behind "More games", then quests, Friends, the Shop and a few links.
 */
export function Home(props: HomeProps) {
  const { daily, practice, dailyStats, practiceStats, progress } = props;
  const f = useFriends();
  const { settings } = useSettings();
  const { now } = useServices();
  const [moreGames, setMoreGames] = useState(false);
  const copy = dailyCopy(daily);
  const dailyDone = daily.status !== 'playing';
  const streak = effectiveStreak(dailyStats, props.todayIndex, frozenDays(progress.owned));
  const freezes = freezesHeld(progress.owned);
  const practiceInProgress = practice.status === 'playing' && practice.guesses.length > 0;
  const unlocked = ACHIEVEMENTS.filter((a) => progress.unlocked[a.id]).length;
  const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

  const favourites: Mode[] = [
    {
      name: 'Practice',
      label: `${practiceInProgress ? 'Continue' : 'Play'} Practice`,
      icon: Shuffle,
      color: '#0ea5e9',
      onClick: props.onPlayPractice,
      detail: practiceInProgress
        ? `Word ${props.practiceNumber} in progress`
        : practiceStats.played === 0
          ? 'Unlimited words, with hints'
          : `${practiceStats.wins} of ${practiceStats.played} solved`,
    },
    {
      name: 'Blitz',
      label: 'Play Blitz',
      icon: Zap,
      color: '#f59e0b',
      onClick: props.onBlitz,
      detail: progress.bestBlitz > 0 ? `Best: ${plural(progress.bestBlitz, 'word')}` : 'Beat the clock',
    },
    {
      name: 'The Tower',
      label: 'Play The Tower',
      icon: Castle,
      color: '#6d4fd8',
      onClick: props.onTower,
      detail: progress.bestTower > 0 ? `Best: floor ${progress.bestTower}` : 'Climb, floor by floor',
    },
    {
      name: 'Bot Duel',
      label: 'Play Bot Duel',
      icon: Bot,
      color: '#e0457b',
      onClick: props.onDuel,
      detail: progress.duelWins > 0 ? `${plural(progress.duelWins, 'bot')} beaten` : 'Race the computer',
    },
  ];
  const more: Mode[] = [
    {
      name: 'Daily Rush',
      label: props.rushScore === null ? 'Play Daily Rush' : 'Daily Rush result',
      icon: CalendarClock,
      color: '#8b5cf6',
      onClick: props.onRush,
      detail: props.rushScore === null ? 'The same words for everyone, one try a day' : `Today: ${plural(props.rushScore, 'word')}`,
    },
    {
      name: 'Survival',
      label: 'Play Survival',
      icon: Heart,
      color: '#ef4444',
      onClick: props.onSurvival,
      detail: progress.bestSurvival > 0 ? `Best: ${plural(progress.bestSurvival, 'word')}` : 'Three lives. How far can you get?',
    },
    {
      name: 'Duo',
      label: 'Play Duo',
      icon: Columns2,
      color: '#22a467',
      onClick: props.onDuo,
      detail: progress.duoWins > 0 ? `${progress.duoWins} won` : 'Solve two words at once',
    },
    {
      name: 'Quad',
      label: 'Play Quad',
      icon: Grid2x2,
      color: '#f97316',
      onClick: props.onQuad,
      detail: progress.quadWins > 0 ? `${progress.quadWins} won` : 'Four words, nine guesses',
    },
    {
      name: 'Word Ladder',
      label: 'Play Word Ladder',
      icon: Footprints,
      color: '#14b8a6',
      onClick: props.onLadder,
      detail: 'Change one letter at a time to reach the goal',
    },
    {
      name: 'Reverse',
      label: 'Play Reverse',
      icon: ArrowDownUp,
      color: '#6366f1',
      onClick: props.onReverse,
      detail: progress.bestReverse > 0 ? `Best: ${progress.bestReverse}/5` : 'Find words that make the colour pattern',
    },
  ];

  const name = f.me?.profile.name;
  const hour = now().getHours();
  const greeting = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const { level, into, span } = levelFor(progress.xp);
  const { rank } = rankFor(level);
  const coins = coinBalance(progress);
  const chest = chestReady(progress, props.todayIndex);
  const title = TITLES.find((t) => t.id === settings.title && t.id !== 'none');

  return (
    <div className="mx-auto w-full max-w-[30rem] px-4 pt-3 pb-8 sm:pt-8 lg:max-w-[60rem]">
      {/* You, in one slim row: picture, greeting, level and streak. */}
      <m.section {...rise(0)} aria-label="Your progress" className="mb-4 flex items-center gap-3 px-1">
        <button type="button" onClick={props.onRanks} aria-label="Level and ranks" className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[1.15rem] leading-tight font-extrabold">
            {greeting}
            {name ? `, ${name}` : ''}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-muted">
              {title ? title.name : `Level ${level} · ${rank.name}`}
            </span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-border" aria-hidden>
              <m.span
                className="home-xp block h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.round((into / span) * 100))}%` }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={props.onStats}
          aria-label={`${plural(streak, 'day')} streak${freezes > 0 ? `, ${freezes} streak ${freezes === 1 ? 'freeze' : 'freezes'}` : ''}`}
          className="tabular flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-extrabold shadow-sm ring-1 ring-border transition active:scale-95"
        >
          <Flame className="size-4 text-orange-500" aria-hidden />
          {streak}
        </button>
      </m.section>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
        <div className="flex flex-col gap-4">
          {/* Daily challenge: the main event */}
          <m.section
            {...rise(1)}
            aria-labelledby="home-daily"
            className="daily-card relative overflow-hidden rounded-[var(--radius-card)] p-5 text-white shadow-md sm:p-6"
            data-done={dailyDone || undefined}
          >
            <span className="feature-card-shine" aria-hidden />
            <div className="relative flex items-start justify-between gap-5">
              <div className="min-w-0">
                <h3 id="home-daily" className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-white/85">Daily Challenge</span>
                  <span className="tabular rounded-full bg-white/20 px-2 py-0.5 text-xs font-extrabold">#{props.challengeNumber}</span>
                </h3>
                <p className="mt-2 text-[1.35rem] leading-tight font-extrabold text-balance">{copy.headline}</p>
                <p className="mt-1 max-w-[16rem] text-[0.9rem] leading-snug text-white/85">{copy.detail}</p>
              </div>
              <span className="mini-plate shrink-0 rounded-2xl p-2 shadow-sm">
                <MiniBoard game={daily} />
              </span>
            </div>

            <div className="relative mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={dailyDone ? props.onDailyResults : props.onPlayDaily}
                aria-label={`${copy.cta} — Daily Challenge #${props.challengeNumber}`}
                className="group inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 font-extrabold text-slate-900 shadow-sm transition hover:bg-white/90 active:scale-[0.985]"
              >
                {dailyDone && <Trophy className="size-4" aria-hidden />}
                {copy.cta}
                {!dailyDone && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}
              </button>
              {dailyDone && (
                <button
                  type="button"
                  onClick={props.onPlayDaily}
                  aria-label="See today’s board"
                  className="min-h-12 rounded-xl bg-white/20 px-4 text-sm font-bold transition hover:bg-white/30"
                >
                  Board
                </button>
              )}
            </div>

            <p className="tabular relative mt-3 flex items-center justify-center gap-1.5 text-xs text-white/85">
              <Clock3 className="size-3.5" aria-hidden />
              {dailyDone ? 'Next puzzle in' : 'New puzzle in'} <span className="font-bold text-white">{props.countdown}</span>
              {dailyStats.played > 0 && <> · {winPercentage(dailyStats)}% won</>}
            </p>
          </m.section>
        </div>

        <div className="flex flex-col gap-4">
          {/* Ways to play: four favourites, the rest one tap away. */}
          <m.section {...rise(2)} aria-labelledby="home-modes">
            <h3 id="home-modes" className="mb-2 px-1 text-sm font-bold">
              More ways to play
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {favourites.map((mode) => (
                <button
                  key={mode.name}
                  type="button"
                  onClick={mode.onClick}
                  aria-label={mode.label}
                  className="mode-card group flex min-h-[6.25rem] flex-col items-start rounded-[var(--radius-card)] p-3.5 text-left transition active:scale-[0.98]"
                  style={{ ['--mode' as string]: mode.color }}
                >
                  <span className="mode-icon grid size-9 shrink-0 place-items-center rounded-xl text-white">
                    <mode.icon className="size-[1.1rem]" aria-hidden />
                  </span>
                  <span className="mt-2 font-bold">{mode.name}</span>
                  <span className="mt-0.5 block text-[0.78rem] leading-snug text-muted">{mode.detail}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMoreGames(true)}
              className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-4 text-left font-semibold transition-colors hover:bg-surface-2 active:bg-surface-2"
            >
              <LayoutGrid className="size-[1.15rem] shrink-0 text-muted" aria-hidden />
              <span className="flex-1">More games</span>
              <span className="text-sm text-muted">{more.length}</span>
              <ChevronRight className="size-4 text-subtle" aria-hidden />
            </button>
          </m.section>

          <m.div {...rise(4)}>
            <QuestsCard progress={progress} todayIndex={props.todayIndex} countdown={props.countdown} />
          </m.div>

          {/* Friends and the Shop */}
          <m.nav {...rise(5)} aria-label="Friends and shop" className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            {props.friendsAvailable && (
              <Row
                icon={<Users className="size-[1.15rem] text-fuchsia-600 dark:text-fuchsia-400" aria-hidden />}
                label="Play with friends"
                ariaLabel={props.friendsPending > 0 ? `Friends — ${props.friendsPending} waiting for you` : 'Play with friends'}
                trailing={
                  props.friendsPending > 0 ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-fuchsia-600 px-1.5 text-[0.7rem] font-extrabold text-white">
                      {props.friendsPending}
                    </span>
                  ) : null
                }
                onClick={props.onFriends}
              />
            )}
            <Row
              icon={<Coin className="size-5" />}
              label="Shop"
              ariaLabel={`Shop — ${coins} coins${chest ? ', free daily chest ready' : ''}`}
              trailing={
                chest ? (
                  <span className="chest-badge rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-bold text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
                    Free chest
                  </span>
                ) : (
                  <span className="tabular text-sm text-muted">{coins.toLocaleString()}</span>
                )
              }
              onClick={props.onShop}
            />
          </m.nav>

          <m.nav {...rise(6)} aria-label="More" className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            <Row icon={<CircleHelp className="size-[1.15rem] text-muted" aria-hidden />} label="How to play" onClick={props.onHelp} />
            <Row icon={<BarChart3 className="size-[1.15rem] text-muted" aria-hidden />} label="Statistics" onClick={props.onStats} />
            <Row
              icon={<Award className="size-[1.15rem] text-muted" aria-hidden />}
              label="Achievements"
              ariaLabel={`Achievements — ${unlocked} of ${ACHIEVEMENTS.length} unlocked`}
              trailing={<span className="tabular text-sm text-muted">{unlocked}/{ACHIEVEMENTS.length}</span>}
              onClick={props.onAchievements}
            />
            <Row
              icon={<BookOpen className="size-[1.15rem] text-muted" aria-hidden />}
              label="Word Book"
              ariaLabel="Word Book"
              trailing={<span className="tabular text-sm text-muted">{props.wordCount}</span>}
              onClick={props.onWordBook}
            />
            {props.onGetApp && <Row icon={<Smartphone className="size-[1.15rem] text-muted" aria-hidden />} label="Get the app" onClick={props.onGetApp} />}
          </m.nav>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-subtle">{BRAND.tagline}</p>

      <Dialog open={moreGames} onClose={() => setMoreGames(false)} title="More games">
        <ul className="-mx-1 space-y-1">
          {more.map((mode) => (
            <li key={mode.name}>
              <button
                type="button"
                aria-label={mode.label}
                onClick={() => {
                  setMoreGames(false);
                  mode.onClick();
                }}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2"
                style={{ ['--mode' as string]: mode.color }}
              >
                <span className="mode-icon grid size-10 shrink-0 place-items-center rounded-xl text-white">
                  <mode.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{mode.name}</span>
                  <span className="block text-[0.8rem] leading-snug text-muted">{mode.detail}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}

/** One row in a Home list. */
function Row({
  icon,
  label,
  ariaLabel,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  ariaLabel?: string;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex min-h-12 w-full items-center gap-3 border-b border-border px-4 text-left text-[0.95rem] font-semibold transition-colors last:border-b-0 hover:bg-surface-2 active:bg-surface-2"
    >
      <span className="grid w-5 shrink-0 place-items-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {trailing}
      <ChevronRight className="size-4 text-subtle" aria-hidden />
    </button>
  );
}
