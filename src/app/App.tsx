import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { BRAND, GAME } from '@/config/game';
import {
  MAX_HINTS,
  buildShareText,
  challengeNumber,
  dateForDayIndex,
  effectiveStreak,
  encodeRows,
  hintsUsed,
  nextHintPosition,
  type GameState,
  type SoloMode,
} from '@/engine';
import { ServicesProvider, useServices, type Services } from './services';
import { SettingsProvider, useSettings } from '@/features/settings/SettingsContext';
import { StatsProvider, useStats } from '@/features/stats/StatsContext';
import { useDailyGame } from '@/features/daily/useDailyGame';
import { usePracticeGame } from '@/features/practice/usePracticeGame';
import { useGameScreen } from '@/features/game/useGameScreen';
import { FriendsProvider, useFriends } from '@/features/friends/FriendsContext';
import { shareResult } from '@/features/sharing/shareResult';
import { useCountdown, useTodayIndex } from '@/hooks/useToday';
import { useView } from '@/hooks/useHashMode';
import { PlayArea } from '@/components/board/PlayArea';
import { Header, ModeTabs } from '@/components/layout/Header';
import { InfoBar } from '@/components/layout/InfoBar';
import { ToastProvider, useToast } from '@/components/layout/Toasts';
import { GameOverPanel } from '@/components/layout/GameOverPanel';
import { Home } from '@/components/home/Home';
import { HelpDialog } from '@/components/dialogs/HelpDialog';
import { StatsDialog } from '@/components/dialogs/StatsDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { ResultDialog } from '@/components/dialogs/ResultDialog';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { FriendsView } from '@/components/friends/FriendsView';
import { ChallengeScreen } from '@/components/friends/ChallengeScreen';
import { RaceScreen } from '@/components/friends/RaceScreen';
import { GetAppDialog } from '@/components/dialogs/GetAppDialog';
import { isNativeApp } from '@/lib/native/platform';
import { secondsSinceStart } from '@/lib/storage/timers';
import { KEYS, rushSchema } from '@/lib/storage/schemas';
import { readVersioned } from '@/lib/storage/versioned';
import { ProgressProvider, useProgress } from '@/features/progress/ProgressContext';
import { useAward } from '@/features/progress/useAward';
import { WordsProvider, useWords } from '@/features/words/WordsContext';
import { Backdrop } from '@/components/layout/Backdrop';
import { BlitzScreen } from '@/components/blitz/BlitzScreen';
import { MultiScreen } from '@/components/multi/MultiScreen';
import { SurvivalScreen } from '@/components/survival/SurvivalScreen';
import { AchievementsDialog } from '@/components/dialogs/AchievementsDialog';
import { ModsDialog } from '@/components/dialogs/ModsDialog';

export function App({ services }: { services: Services }) {
  return (
    <ServicesProvider services={services}>
      <SettingsProvider>
        <MotionRoot>
          <StatsProvider>
            <ToastProvider>
              <ProgressProvider>
                <WordsProvider>
                  <FriendsProvider>
                    <Wordskiis />
                  </FriendsProvider>
                </WordsProvider>
              </ProgressProvider>
            </ToastProvider>
          </StatsProvider>
        </MotionRoot>
      </SettingsProvider>
    </ServicesProvider>
  );
}

/** Every animated component (including toasts and dialogs) must sit inside this. */
function MotionRoot({ children }: { children: ReactNode }) {
  const { reducedMotion } = useSettings();
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>{children}</MotionConfig>
    </LazyMotion>
  );
}

type DialogName = 'help' | 'stats' | 'settings' | 'result' | 'confirm-new' | 'get-app' | 'achievements' | 'mods' | null;

/** Already running as an installed app (Android app, or added to a home screen)? */
const runningAsApp = () =>
  isNativeApp() || (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches);

function Wordskiis() {
  const services = useServices();
  const { settings, update, resolvedTheme } = useSettings();
  const stats = useStats();
  const friends = useFriends();
  const { toast } = useToast();
  const { progress, gains } = useProgress();
  const award = useAward();
  const words = useWords();

  const [route, navigate] = useView();
  const { view } = route;
  const isSolo = view === 'daily' || view === 'practice';
  // Outside the solo screens, "mode" is daily so Results/Stats default to the daily game.
  const mode: SoloMode = view === 'practice' ? 'practice' : 'daily';
  const todayIndex = useTodayIndex(services.now);
  const countdown = useCountdown(services.now);
  const daily = useDailyGame(todayIndex);
  const practice = usePracticeGame(daily.session.game.answer);
  const active = mode === 'daily' ? daily : practice;
  const { game } = active.session;

  const [dialog, setDialog] = useState<DialogName>(() => (settings.seenHelp ? null : 'help'));

  // Levels & achievements for a solo game that just finished in this session.
  const awardSolo = (g: GameState) => {
    if (g.status === 'playing' || (g.mode !== 'daily' && g.mode !== 'practice')) return;
    award({
      id: g.id,
      mode: g.mode,
      won: g.status === 'won',
      guesses: g.guesses.length,
      hardMode: g.hardMode,
      hints: hintsUsed(g),
      seconds: secondsSinceStart(services.store, g.id, services.now().getTime()),
      ...(g.mode === 'daily' ? { streak: effectiveStreak(stats.daily, todayIndex) } : {}),
      words: [{ answer: g.answer, won: g.status === 'won' }],
      ...(g.mods?.length ? { mods: g.mods } : {}),
    });
  };
  const screen = useGameScreen(active, {
    inputEnabled: dialog === null && isSolo,
    onCompleted: () => {
      awardSolo(game);
      setDialog((d) => d ?? 'result');
    },
  });

  // ----- Share today's daily result with friends (colours only, never letters) -----
  const dailyGame = daily.session.game;
  const { publishDaily, status: friendsStatus } = friends;
  const dailyStreak = effectiveStreak(stats.daily, todayIndex);
  useEffect(() => {
    if (friendsStatus !== 'ready' || dailyGame.dayIndex === null) return;
    publishDaily({
      dayIndex: dailyGame.dayIndex,
      status: dailyGame.status,
      rows: encodeRows(dailyGame.evaluations),
      streak: dailyStreak,
    });
  }, [friendsStatus, publishDaily, dailyGame.dayIndex, dailyGame.status, dailyGame.evaluations, dailyStreak]);

  // ----- Sharing -----
  const modNames = (game.mods ?? []).map((m) => (m === 'fog' ? 'Fog' : 'Blind keys'));
  const shareLabel =
    mode === 'daily' && game.dayIndex !== null
      ? `#${challengeNumber(game.dayIndex)}`
      : `Practice${modNames.length ? ` (${modNames.join(' + ')})` : ''}`;
  const onShare = useCallback(async () => {
    const url = BRAND.siteUrl || `${window.location.origin}${window.location.pathname}`;
    const text = buildShareText({
      brand: BRAND.name,
      label: shareLabel,
      evaluations: game.evaluations,
      won: game.status === 'won',
      maxGuesses: GAME.maxGuesses,
      hardMode: game.hardMode,
      hints: hintsUsed(game),
      highContrast: settings.highContrast,
      darkSquares: resolvedTheme === 'dark',
      url,
    });
    const outcome = await shareResult(text);
    if (outcome === 'copied') toast('Result copied to clipboard', { tone: 'success' });
    else if (outcome === 'shared') toast('Shared!', { tone: 'success' });
    else if (outcome === 'failed') toast('Couldn’t share — your browser blocked clipboard access', { duration: 3200 });
  }, [shareLabel, game, settings.highContrast, resolvedTheme, toast]);

  // ----- Navigation & dialogs -----
  const closeDialog = useCallback(() => {
    setDialog((d) => {
      if (d === 'help' && !settings.seenHelp) update({ seenHelp: true });
      return null;
    });
  }, [settings.seenHelp, update]);

  const go = useCallback(
    (v: Parameters<typeof navigate>[0], id: string | null = null) => {
      navigate(v, id);
      setDialog(null);
    },
    [navigate],
  );
  const changeMode = useCallback((m: SoloMode) => go(m), [go]);
  const goHome = useCallback(() => go('home'), [go]);
  const goFriends = useCallback(() => go('friends'), [go]);
  const goBlitz = useCallback(() => go('blitz'), [go]);
  const goDuo = useCallback(() => go('duo'), [go]);
  const goQuad = useCallback(() => go('quad'), [go]);
  const goRush = useCallback(() => go('rush'), [go]);
  const goSurvival = useCallback(() => go('survival'), [go]);
  const openChallenge = useCallback((id: string) => go('challenge', id), [go]);
  const openRace = useCallback((id: string) => go('race', id), [go]);

  const onHint = () => {
    const position = nextHintPosition(practice.session.game);
    if (position === null) return;
    practice.hint();
    toast(`Hint: letter ${position + 1} is ${practice.session.game.answer[position]!.toUpperCase()}`, { duration: 2600 });
  };
  const hintsLeft =
    nextHintPosition(practice.session.game) === null ? 0 : MAX_HINTS - hintsUsed(practice.session.game);

  const requestNewPractice = () => {
    if (practice.session.game.status === 'playing' && practice.session.game.guesses.length > 0) {
      setDialog('confirm-new');
    } else {
      practice.newGame();
      setDialog(null);
    }
  };

  const dailyDate = dateForDayIndex(game.dayIndex ?? todayIndex, GAME.dailyEpoch).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const heading = mode === 'daily' ? `Daily Challenge #${challengeNumber(game.dayIndex ?? todayIndex)}` : 'Practice';
  const subheading = mode === 'daily' ? dailyDate : `Word ${practice.gameNumber} · unlimited play`;

  const onReset = () => {
    stats.reset(dailyGame.status !== 'playing' ? dailyGame.dayIndex : null);
    practice.reset();
    setDialog(null);
    toast('Statistics reset');
  };

  let content: ReactNode;
  if (view === 'home') {
    content = (
      <main id="game" className="min-h-0 flex-1 overflow-y-auto">
        <Home
          challengeNumber={challengeNumber(todayIndex)}
          dateLabel={dateForDayIndex(todayIndex, GAME.dailyEpoch).toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
          })}
          daily={dailyGame}
          practice={practice.session.game}
          practiceNumber={practice.gameNumber}
          dailyStats={stats.daily}
          practiceStats={stats.practice}
          todayIndex={todayIndex}
          countdown={countdown}
          friendsPending={friends.pendingCount}
          friendsAvailable={friends.status !== 'unavailable'}
          onPlayDaily={() => changeMode('daily')}
          onDailyResults={() => setDialog('result')}
          onPlayPractice={() => changeMode('practice')}
          onBlitz={goBlitz}
          onDuo={goDuo}
          onQuad={goQuad}
          onRush={goRush}
          rushScore={(() => {
            const r = readVersioned(services.store, KEYS.rush, rushSchema);
            return r && r.day === todayIndex ? r.solved : null;
          })()}
          onSurvival={goSurvival}
          onAchievements={() => setDialog('achievements')}
          onWordBook={words.showBook}
          wordCount={words.book.length}
          progress={progress}
          onFriends={goFriends}
          onGetApp={runningAsApp() ? undefined : () => setDialog('get-app')}
          onHelp={() => setDialog('help')}
          onStats={() => setDialog('stats')}
          onSettings={() => setDialog('settings')}
        />
      </main>
    );
  } else if (view === 'friends') {
    content = (
      <main id="game" className="min-h-0 flex-1 overflow-y-auto">
        <FriendsView todayIndex={todayIndex} onOpenChallenge={openChallenge} onOpenRace={openRace} />
      </main>
    );
  } else if (view === 'blitz') {
    content = <BlitzScreen key="blitz" avoidAnswer={dailyGame.answer} inputEnabled={dialog === null} onHome={goHome} />;
  } else if (view === 'duo' || view === 'quad') {
    content = (
      <MultiScreen key={view} mode={view} avoidAnswer={dailyGame.answer} inputEnabled={dialog === null} onHome={goHome} />
    );
  } else if (view === 'rush') {
    content = (
      <BlitzScreen
        key="rush"
        rushDay={todayIndex}
        avoidAnswer={dailyGame.answer}
        inputEnabled={dialog === null}
        onHome={goHome}
      />
    );
  } else if (view === 'survival') {
    content = <SurvivalScreen avoidAnswer={dailyGame.answer} inputEnabled={dialog === null} onHome={goHome} />;
  } else if (view === 'challenge' && route.id) {
    content = (
      <ChallengeScreen id={route.id} inputEnabled={dialog === null} onBack={goFriends} onOpenChallenge={openChallenge} />
    );
  } else if (view === 'race' && route.id) {
    content = <RaceScreen id={route.id} inputEnabled={dialog === null} onBack={goFriends} onOpenRace={openRace} />;
  } else {
    content = (
      <main id="game" className="flex min-h-0 flex-1 flex-col">
        <InfoBar
          heading={heading}
          subheading={subheading}
          game={game}
          modeSwitch={<ModeTabs mode={mode} onModeChange={changeMode} />}
          onResults={() => setDialog('result')}
          onNewGame={mode === 'practice' ? requestNewPractice : undefined}
          onHint={mode === 'practice' ? onHint : undefined}
          onMods={mode === 'practice' ? () => setDialog('mods') : undefined}
          modsOn={(practice.session.game.mods?.length ?? 0) + (practice.session.game.hardMode ? 1 : 0)}
          hintsLeft={hintsLeft}
          staleAction={
            mode === 'daily' && daily.stale
              ? { label: `Play #${challengeNumber(todayIndex)}`, onClick: daily.startToday }
              : undefined
          }
        />
        <PlayArea
          active={active}
          screen={screen}
          celebrationSeed={game.guesses.length + todayIndex}
          endPanel={
            <GameOverPanel
              game={game}
              countdown={mode === 'daily' ? countdown : undefined}
              onResults={() => setDialog('result')}
              onShare={onShare}
              onHome={goHome}
              onPractice={mode === 'daily' ? () => changeMode('practice') : undefined}
              onNewGame={mode === 'practice' ? requestNewPractice : undefined}
              xp={gains[game.id]}
              onMeaning={() => words.showWord(game.answer)}
            />
          }
        />
      </main>
    );
  }

  return (
    <>
      <Backdrop />
      <div className="relative z-[1] flex h-dvh flex-col overflow-hidden">
        <a
          href="#game"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Header
          mode={isSolo ? mode : null}
          onHome={goHome}
          onModeChange={changeMode}
          onFriends={friends.status === 'unavailable' ? undefined : goFriends}
          friendsBadge={friends.pendingCount}
          onHelp={() => setDialog('help')}
          onStats={() => setDialog('stats')}
          onSettings={() => setDialog('settings')}
        />
        <h1 className="sr-only">
          {BRAND.name} — {BRAND.tagline}
        </h1>

        {content}

        <HelpDialog open={dialog === 'help'} onClose={closeDialog} />
        <GetAppDialog open={dialog === 'get-app'} onClose={closeDialog} />
        <StatsDialog open={dialog === 'stats'} onClose={closeDialog} initialMode={mode} todayIndex={todayIndex} />
        <SettingsDialog
          open={dialog === 'settings'}
          onClose={closeDialog}
          hardModeLocked={game.guesses.length > 0 && game.status === 'playing'}
          onReset={onReset}
          storagePersistent={services.store.persistent}
        />
        <ResultDialog
          open={dialog === 'result' && game.status !== 'playing'}
          onClose={closeDialog}
          game={game}
          stats={mode === 'daily' ? stats.daily : stats.practice}
          currentKey={mode === 'daily' ? todayIndex : undefined}
          title={mode === 'daily' ? `Daily Challenge #${challengeNumber(game.dayIndex ?? todayIndex)}` : `Practice · Word ${practice.gameNumber}`}
          countdown={mode === 'daily' ? countdown : undefined}
          onShare={onShare}
          onPractice={mode === 'daily' ? () => changeMode('practice') : undefined}
          onNewGame={mode === 'practice' ? requestNewPractice : undefined}
          onHome={view === 'home' ? undefined : goHome}
          xp={gains[game.id]}
        />
        <AchievementsDialog open={dialog === 'achievements'} onClose={closeDialog} />
      <ModsDialog
        open={dialog === 'mods'}
        onClose={closeDialog}
        locked={practice.session.game.status === 'playing' && practice.session.game.guesses.length > 0}
      />
        <ConfirmDialog
          open={dialog === 'confirm-new'}
          onClose={closeDialog}
          title="Start a new word?"
          message="Your current practice game will count as a loss in Practice statistics. Your Daily Challenge is not affected."
          confirmLabel="New word"
          onConfirm={() => {
            practice.newGame();
            setDialog(null);
          }}
        />
      </div>
    </>
  );
}
