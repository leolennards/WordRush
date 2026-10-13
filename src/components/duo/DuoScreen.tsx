import { useEffect, useMemo, useRef } from 'react';
import { m } from 'motion/react';
import { ArrowLeft, Check, House, RotateCcw, Share2 } from 'lucide-react';
import { BRAND, TIMING } from '@/config/game';
import { DUO_MAX_GUESSES, buildDuoShareText, duoBoard, duoKeyStates, duoSolved, type DuoState } from '@/engine';
import { useServices } from '@/app/services';
import { useDuo } from '@/features/duo/useDuo';
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
import { Celebration } from '@/components/layout/Celebration';
import { useToast } from '@/components/layout/Toasts';
import { WordMeaning } from '@/components/dialogs/WordMeaning';
import { Button } from '@/components/ui';

interface DuoScreenProps {
  avoidAnswer: string;
  inputEnabled: boolean;
  onHome: () => void;
}

export function DuoScreen({ avoidAnswer, inputEnabled, onHome }: DuoScreenProps) {
  const duo = useDuo(avoidAnswer);
  const { game, input, revealing, rejection, justCompleted } = duo.state;
  const { settings, reducedMotion } = useSettings();
  const { store, now } = useServices();
  const { toast } = useToast();
  const { gains } = useProgress();
  const award = useAward();

  const cue = (c: Parameters<typeof playCue>[0]) => {
    if (settings.sound) playCue(c);
    if (settings.haptics && c !== 'reveal') buzz(c);
  };

  const onLetter = (l: string) => {
    if (game.status === 'playing' && !revealing && input.length < 5) {
      cue('key');
      if (game.guesses.length === 0 && input.length === 0) markStarted(store, game.id, now().getTime());
    }
    duo.type(l);
  };
  usePhysicalKeyboard({ onLetter, onDelete: duo.remove, onEnter: duo.submit }, inputEnabled && game.status === 'playing');

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

  // Completion: once the last reveal is done.
  const completionReady = justCompleted && !revealing;
  const won = game.status === 'won';
  const { ack } = duo;
  const awardRef = useRef(award);
  useEffect(() => {
    awardRef.current = award;
  });
  useEffect(() => {
    if (!completionReady) return;
    if (settings.sound) playCue(won ? 'win' : 'lose');
    if (settings.haptics) buzz(won ? 'win' : 'lose');
    toast(won ? 'Both solved!' : 'Out of guesses', { tone: won ? 'success' : 'neutral', duration: 2200 });
    awardRef.current({
      id: game.id,
      mode: 'duo',
      won,
      guesses: game.guesses.length,
      hardMode: false,
      hints: 0,
      seconds: secondsSinceStart(store, game.id, now().getTime()),
    });
    const t = window.setTimeout(ack, reducedMotion ? 300 : TIMING.resultDelay + 600);
    return () => window.clearTimeout(t);
    // Runs once per completed game; the other values are stable or read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionReady]);

  const shakeKey = rejection && rejection.error.kind !== 'game-over' ? rejection.nonce : 0;
  const splitStates = useMemo(() => duoKeyStates(game), [game]);
  const revealingRow = revealing ? game.guesses.length - 1 : null;
  const over = game.status !== 'playing' && !revealing;
  const left = DUO_MAX_GUESSES - game.guesses.length;

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
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Duo</h2>
          <p className="truncate text-xs text-muted">Two words, {DUO_MAX_GUESSES} shared guesses · Game {duo.state.number}</p>
        </div>
        {game.status === 'playing' && (
          <span className="tabular inline-flex h-8 items-center rounded-full bg-surface-2 px-3 text-xs font-bold">
            {left} {left === 1 ? 'guess' : 'guesses'} left
          </span>
        )}
      </div>

      <div className="relative mx-auto flex min-h-0 w-full max-w-[40rem] flex-1 gap-2 px-2 py-2 sm:gap-5 sm:px-3 sm:py-3">
        {([0, 1] as const).map((k) => {
          const solved = duoSolved(game, k);
          return (
            <section key={k} className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={`Word ${k + 1}`}>
              <p className="mb-1.5 flex h-5 items-center justify-center gap-1 text-xs font-bold text-muted">
                {solved ? (
                  <span className="inline-flex items-center gap-1 text-correct">
                    <Check className="size-3.5" aria-hidden /> Solved
                  </span>
                ) : game.status === 'lost' && !revealing ? (
                  <span className="tracking-wider text-text uppercase">{game.answers[k]}</span>
                ) : (
                  `Word ${k + 1}`
                )}
              </p>
              <div className="board-area min-h-0 flex-1">
                <div className="flex h-full items-center justify-center">
                  <Board
                    game={duoBoard(game, k)}
                    input={solved ? '' : input}
                    revealingRow={revealingRow}
                    shakeKey={solved ? 0 : shakeKey}
                    celebrate={over && solved}
                    rowCount={DUO_MAX_GUESSES}
                    label={`Word ${k + 1} board`}
                  />
                </div>
              </div>
            </section>
          );
        })}
        {justCompleted && !revealing && won && !reducedMotion && <Celebration seed={duo.state.number} />}
      </div>

      <div className="safe-bottom pt-1 sm:pb-5">
        {over ? (
          <DuoResult game={game} xp={gains[game.id]} onAgain={duo.newGame} onHome={onHome} />
        ) : (
          <Keyboard
            letterStates={{}}
            splitStates={splitStates}
            onLetter={onLetter}
            onDelete={duo.remove}
            onEnter={duo.submit}
            disabled={game.status !== 'playing'}
          />
        )}
      </div>
    </main>
  );
}

function DuoResult({ game, xp, onAgain, onHome }: { game: DuoState; xp?: number; onAgain: () => void; onHome: () => void }) {
  const { settings, resolvedTheme } = useSettings();
  const { toast } = useToast();
  const won = game.status === 'won';
  const solvedCount = (duoSolved(game, 0) ? 1 : 0) + (duoSolved(game, 1) ? 1 : 0);

  const share = async () => {
    const text = buildDuoShareText({
      brand: BRAND.name,
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
      aria-label="Duo result"
    >
      <div className="max-h-[45dvh] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-bold">
              {won ? `Both solved in ${game.guesses.length}! 🎉` : `${solvedCount} of 2 solved`}
              {xp ? (
                <span className="tabular rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">+{xp} XP</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">
              The words were <strong className="text-text uppercase">{game.answers[0]}</strong> and{' '}
              <strong className="text-text uppercase">{game.answers[1]}</strong>.
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
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <WordMeaning word={game.answers[0]} />
          <WordMeaning word={game.answers[1]} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={onHome} className="flex-1">
            <House className="size-4" aria-hidden /> Home
          </Button>
          <Button variant="primary" onClick={onAgain} className="flex-1">
            <RotateCcw className="size-4" aria-hidden /> New Duo
          </Button>
        </div>
      </div>
    </m.div>
  );
}
