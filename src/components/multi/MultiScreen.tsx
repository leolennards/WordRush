import { useEffect, useMemo, useRef } from 'react';
import { m } from 'motion/react';
import { ArrowLeft, Check, House, RotateCcw, Share2 } from 'lucide-react';
import { BRAND, GAME, TIMING } from '@/config/game';
import {
  MULTI,
  buildMultiShareText,
  multiBoard,
  multiKeyStates,
  multiSolved,
  multiSolvedCount,
  type MultiMode,
  type MultiState,
} from '@/engine';
import { useServices } from '@/app/services';
import { useMulti } from '@/features/multi/useMulti';
import { rejectionMessage } from '@/features/game/sessionReducer';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { shareResult } from '@/features/sharing/shareResult';
import { usePhysicalKeyboard } from '@/hooks/usePhysicalKeyboard';
import { playCue } from '@/lib/audio/sound';
import { buzz } from '@/lib/haptics';
import { markStarted, secondsSinceStart } from '@/lib/storage/timers';
import { Board } from '@/components/board/Board';
import { Keyboard } from '@/components/keyboard/Keyboard';
import { submitStateFor } from '@/components/keyboard/submit';
import { WinCelebration } from '@/components/layout/Celebration';
import { useToast } from '@/components/layout/Toasts';
import { WordChip } from '@/components/words/WordChip';
import { Button } from '@/components/ui';

interface MultiScreenProps {
  mode: MultiMode;
  avoidAnswer: string;
  inputEnabled: boolean;
  onHome: () => void;
}

/** Duo (two words) and Quad (four words): one shared set of guesses. */
export function MultiScreen({ mode, avoidAnswer, inputEnabled, onHome }: MultiScreenProps) {
  const config = MULTI[mode];
  const multi = useMulti(mode, avoidAnswer);
  const { game, input, revealing, rejection, justCompleted } = multi.state;
  const { settings, reducedMotion } = useSettings();
  const { store, now, dictionary } = useServices();
  const { toast } = useToast();
  const { gains } = useProgress();
  const award = useAward();
  const quad = config.words === 4;

  const cue = (c: Parameters<typeof playCue>[0]) => {
    if (settings.sound) playCue(c);
    if (settings.haptics && c !== 'reveal') buzz(c);
  };

  const onLetter = (l: string) => {
    if (game.status === 'playing' && !revealing && input.length < GAME.wordLength) {
      cue('key');
      if (game.guesses.length === 0 && input.length === 0) markStarted(store, game.id, now().getTime());
    }
    multi.type(l);
  };
  usePhysicalKeyboard({ onLetter, onDelete: multi.remove, onEnter: multi.submit }, inputEnabled && game.status === 'playing');

  // Rejected guesses.
  const lastRejection = useRef(rejection?.nonce ?? 0);
  useEffect(() => {
    if (!rejection || rejection.nonce === lastRejection.current) return;
    lastRejection.current = rejection.nonce;
    if (rejection.error.kind === 'game-over') return;
    toast(rejectionMessage(rejection.error));
    if (settings.sound) playCue('invalid');
    if (settings.haptics) buzz('invalid');
  }, [rejection, toast, settings.sound, settings.haptics]);

  // A sound as each word is solved mid-game.
  const solvedCount = multiSolvedCount(game);
  const lastSolved = useRef(solvedCount);
  useEffect(() => {
    if (revealing) return;
    if (solvedCount > lastSolved.current && game.status === 'playing') {
      toast(`${solvedCount} of ${config.words} solved`, { tone: 'success' });
      if (settings.sound) playCue('reveal');
      if (settings.haptics) buzz('hint');
    }
    lastSolved.current = solvedCount;
  }, [solvedCount, revealing, game.status, config.words, toast, settings.sound, settings.haptics]);

  // Completion: once the last reveal is done.
  const completionReady = justCompleted && !revealing;
  const won = game.status === 'won';
  const { ack } = multi;
  const latest = useRef({ award, game, settings });
  useEffect(() => {
    latest.current = { award, game, settings };
  });
  useEffect(() => {
    if (!completionReady) return;
    const { award: give, game: g, settings: s } = latest.current;
    const didWin = g.status === 'won';
    if (s.sound) playCue(didWin ? 'win' : 'lose');
    if (s.haptics) buzz(didWin ? 'win' : 'lose');
    toast(didWin ? 'All solved!' : 'Out of guesses', { tone: didWin ? 'success' : 'neutral', duration: 2200 });
    give({
      id: g.id,
      mode,
      won: didWin,
      guesses: g.guesses.length,
      hardMode: false,
      hints: 0,
      seconds: secondsSinceStart(store, g.id, now().getTime()),
      words: g.answers.map((answer, k) => ({ answer, won: multiSolved(g, k) })),
    });
    const t = window.setTimeout(ack, reducedMotion ? 300 : TIMING.resultDelay + 600);
    return () => window.clearTimeout(t);
  }, [completionReady, ack, mode, now, reducedMotion, store, toast]);

  const shakeKey = rejection && rejection.error.kind !== 'game-over' ? rejection.nonce : 0;
  const splitStates = useMemo(() => multiKeyStates(game), [game]);
  const revealingRow = revealing ? game.guesses.length - 1 : null;
  const over = game.status !== 'playing' && !revealing;
  const left = game.maxGuesses - game.guesses.length;

  return (
    <main id="game" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[40rem] items-center gap-3 px-3 pt-3 pb-1 sm:pt-5">
        <button
          type="button"
          onClick={onHome}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">{config.name}</h2>
          <p className="truncate text-xs text-muted">
            {config.words} words, {game.maxGuesses} shared guesses · Game {multi.state.number}
          </p>
        </div>
        {game.status === 'playing' && (
          <span
            className={`tabular inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition-colors ${
              left <= 2 ? 'bg-danger/15 text-danger' : 'bg-surface-2'
            }`}
          >
            {left} {left === 1 ? 'guess' : 'guesses'} left
          </span>
        )}
      </div>

      <div
        className={`relative mx-auto grid min-h-0 w-full max-w-[40rem] flex-1 gap-x-2 gap-y-1 px-2 py-1 sm:gap-x-5 sm:px-3 sm:py-3 ${
          quad ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2'
        }`}
      >
        {game.answers.map((_, k) => {
          const solved = multiSolved(game, k);
          return (
            <section key={k} className="flex min-h-0 min-w-0 flex-col" aria-label={`Word ${k + 1}`}>
              <p className="mb-1 flex h-4 items-center justify-center gap-1 text-[0.7rem] font-bold text-muted sm:h-5 sm:text-xs">
                {solved ? (
                  <m.span
                    initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1 text-correct"
                  >
                    <Check className="size-3.5" aria-hidden /> Solved
                  </m.span>
                ) : game.status === 'lost' && !revealing ? (
                  <span className="tracking-wider text-text uppercase">{game.answers[k]}</span>
                ) : (
                  `Word ${k + 1}`
                )}
              </p>
              <div className={`board-area min-h-0 flex-1 transition-opacity duration-500 ${solved && !over ? 'opacity-60' : ''}`}>
                <div className="flex h-full items-center justify-center">
                  <Board
                    game={multiBoard(game, k)}
                    input={solved ? '' : input}
                    revealingRow={revealingRow}
                    shakeKey={solved ? 0 : shakeKey}
                    celebrate={over && solved}
                    rowCount={game.maxGuesses}
                    label={`Word ${k + 1} board`}
                    compact={quad}
                  />
                </div>
              </div>
            </section>
          );
        })}
        {justCompleted && !revealing && won && !reducedMotion && <WinCelebration seed={multi.state.number} />}
      </div>

      <div className="safe-bottom pt-1 sm:pb-5">
        {over ? (
          <MultiResult mode={mode} game={game} xp={gains[game.id]} onAgain={multi.newGame} onHome={onHome} />
        ) : (
          <Keyboard
            letterStates={{}}
            splitStates={splitStates}
            onLetter={onLetter}
            onDelete={multi.remove}
            onEnter={multi.submit}
            input={input}
            submit={submitStateFor(input, (w) => dictionary.isAccepted(w))}
            disabled={game.status !== 'playing'}
          />
        )}
      </div>
    </main>
  );
}

function MultiResult({
  mode,
  game,
  xp,
  onAgain,
  onHome,
}: {
  mode: MultiMode;
  game: MultiState;
  xp?: number;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { settings, resolvedTheme } = useSettings();
  const { toast } = useToast();
  const won = game.status === 'won';
  const config = MULTI[mode];

  const share = async () => {
    const text = buildMultiShareText({
      brand: BRAND.name,
      mode,
      state: game,
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
      aria-label={`${config.name} result`}
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-bold">
              {won ? `All solved in ${game.guesses.length}!` : `${multiSolvedCount(game)} of ${config.words} solved`}
              {xp ? (
                <span className="tabular rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">+{xp} XP</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">{won ? 'Nicely done.' : 'So close. Try another?'}</p>
          </div>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-semibold transition hover:bg-surface-3 active:scale-[0.98]"
          >
            <Share2 className="size-4" aria-hidden /> Share
          </button>
        </div>
        <p className="mt-3 mb-1.5 text-xs font-semibold text-muted">Tap a word for its meaning</p>
        <div className="flex flex-wrap gap-1.5">
          {game.answers.map((w, k) => (
            <WordChip key={w} word={w} won={multiSolved(game, k)} />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={onHome} className="flex-1">
            <House className="size-4" aria-hidden /> Home
          </Button>
          <Button variant="primary" onClick={onAgain} className="flex-1">
            <RotateCcw className="size-4" aria-hidden /> New {config.name}
          </Button>
        </div>
      </div>
    </m.div>
  );
}
