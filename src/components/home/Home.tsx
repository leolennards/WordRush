import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { ArrowDownUp, ArrowRight, Award, BarChart3, BookOpen, Bot, CalendarClock, Castle, ChevronRight, CircleHelp, Clock3, Columns2, Flame, Footprints, Gift, Grid2x2, Heart, Palette, Settings, Shuffle, Smartphone, Trophy, Users, Zap } from 'lucide-react';
import { BRAND, GAME } from '@/config/game';
import { ACHIEVEMENTS, TITLES, chestReady, coinBalance, effectiveStreak, freezesHeld, frozenDays, levelFor, nextRewards, rankFor, winPercentage, type GameState, type Progress, type Stats } from '@/engine';
import { Coin } from '@/components/shop/Coin';
import { Avatar } from '@/components/friends/Avatar';
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
  const f = useFriends();
  const { settings } = useSettings();
  const { now } = useServices();
  const copy = dailyCopy(daily);
  const dailyDone = daily.status !== 'playing';
  const streak = effectiveStreak(dailyStats, props.todayIndex, frozenDays(props.progress.owned));
  const freezes = freezesHeld(props.progress.owned);
  const practiceInProgress = practice.status === 'playing' && practice.guesses.length > 0;
  const unlocked = ACHIEVEMENTS.filter((a) => props.progress.unlocked[a.id]).length;
  const best = props.progress.bestBlitz;
  const bestSurvival = props.progress.bestSurvival;
  const modes = [
    {
      name: 'Practice',
      group: 'quick' as const,
      label: `${practiceInProgress ? 'Continue' : 'Play'} Practice`,
      icon: Shuffle,
      color: '#0ea5e9',
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
      group: 'quick' as const,
      label: 'Play Blitz',
      icon: Zap,
      color: '#f59e0b',
      onClick: props.onBlitz,
      detail: best > 0 ? `Best: ${best} ${best === 1 ? 'word' : 'words'}` : 'Race the clock.',
      isNew: false,
    },
    {
      name: 'Daily Rush',
      group: 'quick' as const,
      label: props.rushScore === null ? 'Play Daily Rush' : 'Daily Rush result',
      icon: CalendarClock,
      color: '#8b5cf6',
      onClick: props.onRush,
      detail:
        props.rushScore === null
          ? 'Same words for all. One try.'
          : `Today: ${props.rushScore} ${props.rushScore === 1 ? 'word' : 'words'}`,
      isNew: false,
    },
    {
      name: 'Duo',
      group: 'puzzle' as const,
      label: 'Play Duo',
      icon: Columns2,
      color: '#22a467',
      onClick: props.onDuo,
      detail: props.progress.duoWins > 0 ? `${props.progress.duoWins} won` : 'Two words at once.',
      isNew: false,
    },
    {
      name: 'Quad',
      group: 'puzzle' as const,
      label: 'Play Quad',
      icon: Grid2x2,
      color: '#f97316',
      onClick: props.onQuad,
      detail: props.progress.quadWins > 0 ? `${props.progress.quadWins} won` : 'Four words, nine guesses.',
      isNew: false,
    },
    {
      name: 'Survival',
      group: 'quick' as const,
      label: 'Play Survival',
      icon: Heart,
      color: '#ef4444',
      onClick: props.onSurvival,
      detail: bestSurvival > 0 ? `Best: ${bestSurvival} ${bestSurvival === 1 ? 'word' : 'words'}` : 'Three lives. How far?',
      isNew: false,
    },
    {
      name: 'Word Ladder',
      group: 'puzzle' as const,
      label: 'Play Word Ladder',
      icon: Footprints,
      color: '#14b8a6',
      onClick: props.onLadder,
      detail: 'One letter at a time.',
      isNew: false,
    },
    {
      name: 'Reverse',
      group: 'puzzle' as const,
      label: 'Play Reverse',
      icon: ArrowDownUp,
      color: '#6366f1',
      onClick: props.onReverse,
      detail: props.progress.bestReverse > 0 ? `Best: ${props.progress.bestReverse}/5` : 'Make the colour pattern.',
      isNew: true,
    },
  ];
  const groups = [
    { id: 'quick', title: 'Quick play' },
    { id: 'puzzle', title: 'Puzzles' },
  ] as const;

  const name = f.me?.profile.name;
  const hour = now().getHours();
  const greeting = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const { level, into, span } = levelFor(props.progress.xp);
  const { rank } = rankFor(level);
  const upcoming = nextRewards(level);
  const coins = coinBalance(props.progress);
  const chest = chestReady(props.progress, props.todayIndex);
  const title = TITLES.find((t) => t.id === settings.title && t.id !== 'none');

  return (
    <div className="mx-auto w-full max-w-[30rem] px-4 pt-4 pb-8 sm:pt-8 lg:max-w-[60rem]">
      {/* You: picture, level, streak and coins, on your banner */}
      <m.section
        {...rise(0)}
        aria-label="Your progress"
        className="home-hero relative mb-4 overflow-hidden rounded-[var(--radius-card)] text-white shadow-lg sm:mb-6"
      >
        <span className="profile-banner absolute inset-0" data-banner={settings.banner === 'none' ? 'home' : settings.banner} aria-hidden />
        <span className="home-hero-shade absolute inset-0" aria-hidden />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={props.onProfile}
              aria-label="Your profile"
              className="shrink-0 rounded-full bg-white/25 p-1 backdrop-blur transition hover:scale-105 active:scale-95"
            >
              <Avatar uid={f.me?.uid ?? 'me'} name={name ?? 'You'} size="lg" look={f.lookOf('me')} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[0.72rem] font-bold tracking-[0.12em] text-white/75 uppercase">{props.dateLabel}</p>
              <h2 className="truncate text-[1.45rem] leading-tight font-extrabold tracking-tight sm:text-[1.7rem]">
                {greeting}
                {name ? `, ${name}` : ''}!
              </h2>
              {title && <p className="truncate text-sm font-bold text-white/90">{title.name}</p>}
            </div>
          </div>

          {/* Level progress and the next reward */}
          <button type="button" onClick={props.onProfile} className="mt-4 block w-full text-left" aria-label="Level rewards">
            <span className="flex items-baseline justify-between text-xs font-semibold text-white/85">
              <span>
                Level {level} · {rank.name}
              </span>
              <span className="tabular">
                {into.toLocaleString()}/{span.toLocaleString()} XP
              </span>
            </span>
            <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-white/25">
              <m.span
                className="home-xp block h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, Math.round((into / span) * 100))}%` }}
                transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            {upcoming && (
              <span className="mt-2 flex items-center gap-1.5 text-xs text-white/90">
                <Gift className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  Level {upcoming.level} unlocks <strong>{upcoming.rewards.map((r) => r.name).join(' + ')}</strong>
                </span>
              </span>
            )}
          </button>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HeroChip
              icon={<Flame className="size-4 text-orange-300" aria-hidden />}
              value={streak}
              label={freezes > 0 ? `day streak · ${freezes} ❄` : 'day streak'}
              onClick={props.onStats}
            />
            <HeroChip
              icon={<BookOpen className="size-4 text-sky-200" aria-hidden />}
              value={props.wordCount.toLocaleString()}
              label={props.wordCount === 1 ? 'word found' : 'words found'}
              onClick={props.onWordBook}
            />
            <HeroChip
              icon={<Award className="size-4 text-yellow-200" aria-hidden />}
              value={`${unlocked}/${ACHIEVEMENTS.length}`}
              label="badges"
              ariaLabel={`Achievements — ${unlocked} of ${ACHIEVEMENTS.length} unlocked`}
              onClick={props.onAchievements}
            />
          </div>
        </div>
      </m.section>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
        <div className="flex flex-col gap-4">
          {/* Daily challenge — the hero */}
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
              Next puzzle in <span className="font-bold text-white">{props.countdown}</span>
              {dailyStats.played > 0 && (
                <>
                  {' '}
                  · {winPercentage(dailyStats)}% won · best streak {dailyStats.maxStreak}
                </>
              )}
            </p>
          </m.section>

          <m.div {...rise(2)}>
            <QuestsCard progress={props.progress} todayIndex={props.todayIndex} countdown={props.countdown} />
          </m.div>

          {/* Shop */}
          <m.button
            {...rise(3)}
            type="button"
            onClick={props.onShop}
            aria-label={`Shop — ${coins} coins${chest ? ', free daily chest ready' : ''}`}
            className="feature-card group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-card)] p-4 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99]"
            data-tone="shop"
          >
            <span className="feature-card-shine" aria-hidden />
            <span className="relative transition-transform group-hover:scale-110 group-hover:-rotate-12">
              <Coin className="size-12" hero />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="flex items-center gap-2 text-lg leading-tight font-extrabold">
                Shop
                {chest && (
                  <span className="chest-badge rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-extrabold tracking-wide text-amber-700 uppercase">
                    Free chest
                  </span>
                )}
              </span>
              <span className="block text-[0.8rem] leading-snug text-white/85">
                {chest ? 'Open it for free coins' : 'Tile colours, keyboards, sounds and more'}
              </span>
            </span>
            <ChevronRight className="relative size-5 text-white/80 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </m.button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Ways to play */}
          <m.section {...rise(4)} aria-labelledby="home-modes" className="space-y-4">
            <h3 id="home-modes" className="sr-only">
              Ways to play
            </h3>
            {/* The two headline modes */}
            <div className="grid grid-cols-2 gap-3">
              <FeatureCard
                title="The Tower"
                detail={props.progress.bestTower > 0 ? `Best: floor ${props.progress.bestTower}` : 'Climb. Survive the twists.'}
                icon={Castle}
                tone="tower"
                label="Play The Tower"
                onClick={props.onTower}
              />
              <FeatureCard
                title="Bot Duel"
                detail={props.progress.duelWins > 0 ? `${props.progress.duelWins} bots beaten` : 'Race an AI to the word.'}
                icon={Bot}
                tone="duel"
                label="Play Bot Duel"
                onClick={props.onDuel}
              />
            </div>
            {groups.map((g) => (
              <div key={g.id}>
                <h4 className="mb-2 px-1 text-xs font-bold tracking-[0.08em] text-muted uppercase">{g.title}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {modes
                    .filter((mode) => mode.group === g.id)
                    .map((mode) => (
                      <button
                        key={mode.name}
                        type="button"
                        onClick={mode.onClick}
                        aria-label={mode.label}
                        className="mode-card group flex min-h-[6.75rem] flex-col items-start rounded-[var(--radius-card)] p-3.5 text-left transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
                        style={{ ['--mode' as string]: mode.color }}
                      >
                        <span className="mode-icon grid size-10 shrink-0 place-items-center rounded-xl text-white transition-transform group-hover:scale-110 group-hover:-rotate-6">
                          <mode.icon className="size-5" aria-hidden />
                        </span>
                        <span className="mt-2.5 font-bold">{mode.name}</span>
                        <span className="mt-0.5 block text-[0.78rem] leading-snug text-muted">{mode.detail}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </m.section>

          {props.friendsAvailable && (
            <m.button
              {...rise(5)}
              type="button"
              onClick={props.onFriends}
              aria-label={props.friendsPending > 0 ? `Friends — ${props.friendsPending} waiting for you` : 'Play with friends'}
              className="feature-card group relative flex w-full items-center gap-4 overflow-hidden rounded-[var(--radius-card)] p-5 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              data-tone="friends"
            >
              <span className="feature-card-shine" aria-hidden />
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-white/20">
                <Users className="size-5" aria-hidden />
                {props.friendsPending > 0 && (
                  <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[0.7rem] font-extrabold text-fuchsia-700">
                    {props.friendsPending}
                  </span>
                )}
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block text-lg font-extrabold">Play with friends</span>
                <span className="block text-sm text-white/85">
                  {props.friendsPending > 0 ? `${props.friendsPending} waiting for you` : 'Word Swap, challenges, races and gifts.'}
                </span>
              </span>
              <ChevronRight className="relative size-5 text-white/80 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </m.button>
          )}

          <m.nav {...rise(6)} aria-label="More" className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            {[
              ...(props.onGetApp ? [{ label: 'Get the app', icon: Smartphone, onClick: props.onGetApp }] : []),
              { label: 'How to play', icon: CircleHelp, onClick: props.onHelp },
              { label: 'Statistics', icon: BarChart3, onClick: props.onStats },
              { label: 'Achievements', icon: Award, onClick: props.onAchievements },
              { label: 'Word Book', icon: BookOpen, onClick: props.onWordBook },
              { label: 'Ranks & rewards', icon: Palette, onClick: props.onRanks },
              { label: 'Settings', icon: Settings, onClick: props.onSettings },
            ].map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex min-h-12 w-full items-center gap-3 border-b border-border px-4 text-left text-[0.95rem] font-semibold transition-colors last:border-b-0 hover:bg-surface-2 active:bg-surface-2"
              >
                <Icon className="size-[1.15rem] shrink-0 text-muted" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-subtle" aria-hidden />
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

/** A small stat on the hero card. */
function HeroChip({
  icon,
  value,
  label,
  ariaLabel,
  onClick,
  glow = false,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  ariaLabel?: string;
  onClick: () => void;
  glow?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex flex-col items-center rounded-2xl bg-white/15 px-2 py-2 backdrop-blur transition hover:bg-white/25 active:scale-95 ${glow ? 'chest-badge' : ''}`}
    >
      <span className="tabular flex items-center gap-1 text-lg leading-tight font-extrabold">
        {icon}
        {value}
      </span>
      <span className="text-[0.68rem] font-semibold text-white/80">{label}</span>
    </button>
  );
}

/** A large, animated card for a headline mode. */
function FeatureCard({
  title,
  detail,
  icon: Icon,
  tone,
  label,
  onClick,
}: {
  title: string;
  detail: string;
  icon: typeof Bot;
  tone: 'tower' | 'duel';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="feature-card group relative flex min-h-[9rem] flex-col justify-between overflow-hidden rounded-[var(--radius-card)] p-4 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99]"
      data-tone={tone}
    >
      <span className="feature-card-shine" aria-hidden />
      <span className="relative grid size-11 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:-rotate-6">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="relative">
        <span className="block text-lg leading-tight font-extrabold">{title}</span>
        <span className="block text-[0.78rem] leading-snug text-white/80">{detail}</span>
      </span>
    </button>
  );
}
