import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { BRAND, GAME, TIMING } from '@/config/game';
import {
  buildShareText,
  challengeNumber,
  dailyAnswer,
  dateForDayIndex,
  letterStatesFor,
  type GameMode,
} from '@/engine';
import { ServicesProvider, useServices, type Services } from './services';
import { SettingsProvider, useSettings } from '@/features/settings/SettingsContext';
import { StatsProvider, useStats } from '@/features/stats/StatsContext';
import { useDailyGame } from '@/features/daily/useDailyGame';
import { usePracticeGame } from '@/features/practice/usePracticeGame';
import { rejectionMessage } from '@/features/game/sessionReducer';
import { shareResult } from '@/features/sharing/shareResult';
import { useCountdown, useTodayIndex } from '@/hooks/useToday';
import { usePhysicalKeyboard } from '@/hooks/usePhysicalKeyboard';
import { useHashMode } from '@/hooks/useHashMode';
import { playCue } from '@/lib/audio/sound';
import { Board } from '@/components/board/Board';
import { Keyboard } from '@/components/keyboard/Keyboard';
import { Header, ModeTabs } from '@/components/layout/Header';
import { InfoBar } from '@/components/layout/InfoBar';
import { ToastProvider, useToast } from '@/components/layout/Toasts';
import { Celebration } from '@/components/layout/Celebration';
import { HelpDialog } from '@/components/dialogs/HelpDialog';
import { StatsDialog } from '@/components/dialogs/StatsDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { ResultDialog } from '@/components/dialogs/ResultDialog';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

export function App({ services }: { services: Services }) {
  return (
    <ServicesProvider services={services}>
      <SettingsProvider>
        <StatsProvider>
          <ToastProvider>
            <MotionRoot />
          </ToastProvider>
        </StatsProvider>
      </SettingsProvider>
    </ServicesProvider>
  );
}

function MotionRoot() {
  const { reducedMotion } = useSettings();
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <WordRush />
      </MotionConfig>
    </LazyMotion>
  );
}

type DialogName = 'help' | 'stats' | 'settings' | 'result' | 'confirm-new' | null;

function WordRush() {
  const services = useServices();
  const { settings, update, resolvedTheme, reducedMotion } = useSettings();
  const stats = useStats();
  const { toast, announce } = useToast();

  const [mode, setMode] = useHashMode();
  const todayIndex = useTodayIndex(services.now);
  const countdown = useCountdown(services.now);
  const daily = useDailyGame(todayIndex);
  const todaysAnswer = dailyAnswer(todayIndex, services.dictionary.answers);
  const practice = usePracticeGame(todaysAnswer);
  const active = mode === 'daily' ? daily : practice;
  const { game, input, revealingRow, rejection, justCompleted } = active.session;

  const [dialog, setDialog] = useState<DialogName>(() => (settings.seenHelp ? null : 'help'));
  // Derived presentation state (no extra React state needed).
  const shakeKey =
    rejection && rejection.error.kind !== 'game-over' && rejection.row === game.guesses.length ? rejection.nonce : 0;
  const celebrating = justCompleted && revealingRow === null && game.status === 'won';

  const sound = useCallback((cue: Parameters<typeof playCue>[0]) => settings.sound && playCue(cue), [settings.sound]);

  // ----- Input -----
  const onLetter = useCallback(
    (l: string) => {
      if (game.status === 'playing' && revealingRow === null && input.length < GAME.wordLength) sound('key');
      active.type(l);
    },
    [active, game.status, revealingRow, input.length, sound],
  );
  const inputEnabled = dialog === null;
  usePhysicalKeyboard({ onLetter, onDelete: active.remove, onEnter: active.submit }, inputEnabled);

  // ----- Rejected guesses: toast + shake -----
  const lastRejection = useRef(rejection?.nonce ?? 0);
  useEffect(() => {
    if (!rejection || rejection.nonce === lastRejection.current) return;
    lastRejection.current = rejection.nonce;
    if (rejection.error.kind === 'game-over') return;
    toast(rejectionMessage(rejection.error));
    sound('invalid');
  }, [rejection, toast, sound]);

  // ----- Announce each revealed row for screen readers -----
  const announcedRows = useRef<string>('');
  useEffect(() => {
    if (revealingRow !== null) {
      sound('reveal');
      return;
    }
    const row = game.guesses.length - 1;
    const tag = `${game.id}:${row}`;
    if (row < 0 || announcedRows.current === tag) return;
    const first = announcedRows.current === '';
    announcedRows.current = tag;
    if (first) return; // don't announce restored rows on load
    const evaluation = game.evaluations[row]!;
    const words = { correct: 'correct', present: 'in the word', absent: 'not in the word' } as const;
    announce(
      `Guess ${row + 1}: ${[...game.guesses[row]!].map((l, i) => `${l.toUpperCase()} ${words[evaluation[i]!]}`).join(', ')}`,
    );
  }, [revealingRow, game, announce, sound]);

  // ----- Completion: celebrate, then show results -----
  useEffect(() => {
    if (!justCompleted || revealingRow !== null) return;
    const won = game.status === 'won';
    sound(won ? 'win' : 'lose');
    toast(won ? 'Solved!' : game.answer.toUpperCase(), { tone: won ? 'success' : 'neutral', duration: 2200 });
    const t = window.setTimeout(
      () => {
        active.ackComplete();
        setDialog((d) => d ?? 'result');
      },
      reducedMotion ? 300 : TIMING.resultDelay + (won ? 500 : 0),
    );
    return () => window.clearTimeout(t);
  }, [justCompleted, revealingRow, game, active, sound, toast, reducedMotion]);

  // ----- Sharing -----
  const shareLabel = mode === 'daily' && game.dayIndex !== null ? `#${challengeNumber(game.dayIndex)}` : 'Practice';
  const onShare = useCallback(async () => {
    const url = BRAND.siteUrl || `${window.location.origin}${window.location.pathname}`;
    const text = buildShareText({
      brand: BRAND.name,
      label: shareLabel,
      evaluations: game.evaluations,
      won: game.status === 'won',
      maxGuesses: GAME.maxGuesses,
      hardMode: game.hardMode,
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

  const changeMode = useCallback(
    (m: GameMode) => {
      setMode(m);
      setDialog(null);
    },
    [setMode],
  );

  const requestNewPractice = () => {
    if (practice.session.game.status === 'playing' && practice.session.game.guesses.length > 0) {
      setDialog('confirm-new');
    } else {
      practice.newGame();
      setDialog(null);
    }
  };

  const letterStates = useMemo(() => letterStatesFor(game.guesses, game.evaluations), [game.guesses, game.evaluations]);

  const dailyDate = dateForDayIndex(game.dayIndex ?? todayIndex, GAME.dailyEpoch).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const heading = mode === 'daily' ? `Daily Challenge #${challengeNumber(game.dayIndex ?? todayIndex)}` : 'Practice';
  const subheading = mode === 'daily' ? dailyDate : `Word ${practice.gameNumber} · unlimited play`;

  const onReset = () => {
    const dailyGame = daily.session.game;
    stats.reset(dailyGame.status !== 'playing' ? dailyGame.dayIndex : null);
    practice.reset();
    setDialog(null);
    toast('Statistics reset');
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <a
        href="#game"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to game
      </a>
      <Header
        mode={mode}
        onModeChange={changeMode}
        onHelp={() => setDialog('help')}
        onStats={() => setDialog('stats')}
        onSettings={() => setDialog('settings')}
      />
      <h1 className="sr-only">
        {BRAND.name} — {BRAND.tagline}
      </h1>

      <main id="game" className="flex min-h-0 flex-1 flex-col">
        <div className="flex justify-center pt-2 sm:hidden">
          <ModeTabs mode={mode} onModeChange={changeMode} />
        </div>
        <InfoBar
          heading={heading}
          subheading={subheading}
          game={game}
          countdown={mode === 'daily' ? countdown : undefined}
          onResults={() => setDialog('result')}
          onNewGame={mode === 'practice' ? requestNewPractice : undefined}
          staleAction={
            mode === 'daily' && daily.stale
              ? { label: `Play #${challengeNumber(todayIndex)}`, onClick: daily.startToday }
              : undefined
          }
        />

        <div className="board-area relative min-h-0 flex-1 px-3 py-1 sm:py-3">
          <div className="flex h-full items-center justify-center">
            <Board
              game={game}
              input={input}
              revealingRow={revealingRow}
              shakeKey={shakeKey}
              celebrate={celebrating}
            />
          </div>
          {celebrating && !reducedMotion && <Celebration seed={game.guesses.length + todayIndex} />}
        </div>

        <div className="safe-bottom pt-1 sm:pb-3">
          <Keyboard
            letterStates={letterStates}
            onLetter={onLetter}
            onDelete={active.remove}
            onEnter={active.submit}
            disabled={game.status !== 'playing'}
          />
        </div>
      </main>

      <footer className="footer-compact border-t border-border/60 py-2 text-center text-xs text-subtle">
        {BRAND.tagline} · New puzzle at 00:00 UTC
      </footer>

      <HelpDialog open={dialog === 'help'} onClose={closeDialog} />
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
  );
}
