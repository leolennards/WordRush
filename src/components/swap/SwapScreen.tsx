import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Bell, BellRing, Crown, Eye, Hourglass, Loader2, Send, Trash2 } from 'lucide-react';
import { GAME } from '@/config/game';
import {
  NUDGE_COOLDOWN_MS,
  SWAP,
  canNudge,
  createGame,
  roundOver,
  submitGuess,
  swapLeader,
  swapRows,
  swapTurn,
  swapChoices,
  wordDifficulty,
  type Dictionary,
  type GameState,
  type Swap,
} from '@/engine';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import { useGameSession, revealDuration } from '@/features/game/useGameSession';
import { useGameScreen } from '@/features/game/useGameScreen';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { notifyPermission, requestNotifyPermission, type NotifyPermission } from '@/lib/notify';
import { Board } from '@/components/board/Board';
import { PlayArea } from '@/components/board/PlayArea';
import { useToast } from '@/components/layout/Toasts';
import { Avatar } from '@/components/friends/Avatar';
import { WordChip } from '@/components/words/WordChip';
import { Button } from '@/components/ui';

interface SwapScreenProps {
  id: string;
  inputEnabled: boolean;
  onBack: () => void;
}

/** Word Swap with one friend: pick a word, watch them guess, then swap roles. */
export function SwapScreen({ id, inputEnabled, onBack }: SwapScreenProps) {
  const f = useFriends();
  const me = f.me?.uid ?? null;
  const [swap, setSwap] = useState<Swap | null | undefined>(undefined);
  const watch = useRef(f.watchSwap);
  useEffect(() => {
    watch.current = f.watchSwap;
  });
  const ready = f.status === 'ready';
  useEffect(() => {
    if (!ready) return;
    return watch.current(id, setSwap);
  }, [id, ready]);

  useRoundAwards(swap ?? null, me);

  // A round left finished but not wrapped up (e.g. the guesser closed the app): wrap it up now.
  const stuck = !!swap && swap.state === 'guessing' && roundOver(swap);
  const finish = useRef(f.finishSwapRound);
  useEffect(() => {
    finish.current = f.finishSwapRound;
  });
  useEffect(() => {
    if (!stuck || !swap) return;
    const t = window.setTimeout(() => void finish.current(swap.id).catch(() => {}), FINISH_DELAY_MS + 1500);
    return () => window.clearTimeout(t);
  }, [stuck, swap]);

  if (!ready || swap === undefined || !me) {
    return (
      <main id="game" className="grid flex-1 place-items-center">
        <Loader2 className="size-6 animate-spin text-muted" aria-label="Loading Word Swap" />
      </main>
    );
  }
  if (swap === null) {
    return (
      <main id="game" className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <p className="font-bold">This Word Swap has ended.</p>
          <Button className="mt-4" onClick={onBack}>
            Back to friends
          </Button>
        </div>
      </main>
    );
  }

  const them = swap.players.find((p) => p !== me) ?? '';
  const name = f.nameOf(them);
  const turn = swapTurn(swap, me);

  return (
    <main id="game" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-3 pt-3 pb-1 sm:pt-5">
        <button
          type="button"
          onClick={onBack}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Back to friends"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Word Swap vs {name}</h2>
          <p className="truncate text-xs text-muted">
            {turn === 'pick' || turn === 'guess' ? 'Your turn' : `${name}’s turn`}
          </p>
        </div>
        <EndMatch onEnd={async () => {
          await f.endSwap(swap.id);
          onBack();
        }} />
      </div>

      <Scoreboard swap={swap} me={me} myName={f.me?.profile.name ?? 'You'} them={them} name={name} />
      <RoundRecap swap={swap} me={me} name={name} />

      {turn === 'pick' && <PickWord key={`pick-${swap.round}`} swap={swap} name={name} inputEnabled={inputEnabled} />}
      {turn === 'wait-pick' && <Waiting key={`wait-${swap.round}`} swap={swap} me={me} name={name} />}
      {turn === 'watch' && <Spectate key={`watch-${swap.round}`} swap={swap} me={me} name={name} />}
      {turn === 'guess' && <SwapGuess key={`guess-${swap.round}`} swap={swap} inputEnabled={inputEnabled} />}
    </main>
  );
}

/** XP for each finished round, for whichever role this player had (once per round). */
function useRoundAwards(swap: Swap | null, me: string | null) {
  const award = useAward();
  const { progress } = useProgress();
  const last = swap?.history.at(-1);
  useEffect(() => {
    if (!swap || !me || !last) return;
    const eventId = `swap-${swap.id}-r${last.round}`;
    if (progress.applied.includes(eventId)) return;
    award({
      id: eventId,
      mode: 'swap',
      won: last.scorer === me,
      guesses: last.guesses,
      hardMode: false,
      hints: 0,
      seconds: null,
      swapPicker: last.setter === me,
      words: [{ answer: last.word, won: last.solved }],
    });
    // Award once per new round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swap?.id, last?.round, me]);
}

function Scoreboard({ swap, me, myName, them, name }: { swap: Swap; me: string; myName: string; them: string; name: string }) {
  const leader = swapLeader(swap);
  const mine = swap.scores[me] ?? 0;
  const theirs = swap.scores[them] ?? 0;
  const lead = Math.abs(mine - theirs);
  return (
    <section aria-label="Score" className="mx-auto mt-1 w-full max-w-[26rem] px-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 shadow-sm">
        <Side uid={me} label="You" avatarName={myName} score={mine} leading={leader === me} />
        <div className="flex flex-col items-center px-1 text-center">
          <span className="text-[0.62rem] font-bold tracking-[0.14em] text-muted uppercase">Round</span>
          <m.span key={swap.round} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="tabular text-xl font-black">
            {swap.round}
          </m.span>
        </div>
        <Side uid={them} label={name} avatarName={name} score={theirs} leading={leader === them} right />
      </div>
      <p className="mt-1 text-center text-xs text-muted" aria-live="polite">
        {leader === null ? 'All square' : leader === me ? `You lead by ${lead}` : `${name} leads by ${lead}`}
      </p>
    </section>
  );
}

function Side({
  uid,
  label,
  avatarName,
  score,
  leading,
  right = false,
}: {
  uid: string;
  label: string;
  avatarName: string;
  score: number;
  leading: boolean;
  right?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="relative">
        <Avatar uid={uid} name={avatarName} size="sm" />
        <AnimatePresence>
          {leading && (
            <m.span
              initial={{ scale: 0, rotate: -30, y: 4 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0 }}
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-present"
              aria-label="Leading"
            >
              <Crown className="size-4 fill-present" aria-hidden />
            </m.span>
          )}
        </AnimatePresence>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-muted">{label}</span>
        <m.span key={score} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular block text-2xl leading-none font-black">
          {score}
        </m.span>
      </span>
    </div>
  );
}

/** A short recap of the round that just finished. */
function RoundRecap({ swap, me, name }: { swap: Swap; me: string; name: string }) {
  const last = swap.history.at(-1);
  const [dismissed, setDismissed] = useState<number | null>(null);
  if (!last || dismissed === last.round || swap.round !== last.round + 1) return null;
  const guesserIsMe = last.guesser === me;
  const who = guesserIsMe ? 'You' : name;
  const scorerName = last.scorer === me ? 'you' : name;
  return (
    <AnimatePresence>
      <m.div
        key={last.round}
        initial={{ y: -10, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="mx-auto mt-2 flex w-[min(26rem,calc(100%-1.5rem))] items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3"
        role="status"
      >
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold">
            Round {last.round}: {who} {last.solved ? `solved it in ${last.guesses}` : 'didn’t get it'}
          </p>
          <p className="text-xs text-muted">
            +{last.points} to {scorerName}
          </p>
        </div>
        <WordChip word={last.word} won={last.solved} />
        <button type="button" onClick={() => setDismissed(last.round)} className="text-xs font-semibold text-muted hover:text-text">
          OK
        </button>
      </m.div>
    </AnimatePresence>
  );
}

function EndMatch({ onEnd }: { onEnd: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="flex items-center gap-1.5">
      <Button variant="danger" className="min-h-9 px-3" onClick={() => void onEnd()}>
        End match
      </Button>
      <Button variant="ghost" className="min-h-9 px-2" onClick={() => setConfirm(false)} autoFocus>
        Keep
      </Button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
      aria-label="End this Word Swap"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

/** Pick one of three words for your friend to guess. */
function PickWord({ swap, name, inputEnabled }: { swap: Swap; name: string; inputEnabled: boolean }) {
  const f = useFriends();
  const { dictionary } = useServices();
  const { toast } = useToast();
  const choices = useMemo(() => swapChoices(swap, dictionary.answers), [swap, dictionary.answers]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (sending || !chosen) return;
    setSending(true);
    try {
      await f.pickSwapWord(swap.id, chosen);
      toast(`Sent! ${name} is up.`, { tone: 'success' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t send your word');
      setSending(false);
    }
  };
  // Keys 1–3 choose, Enter sends.
  useEffect(() => {
    if (!inputEnabled || sending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= choices.length) setChosen(choices[n - 1]!);
      else if (e.key === 'Enter' && chosen) void send();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-4">
      <div className="text-center">
        <p className="text-lg font-extrabold">Pick a word for {name}</p>
        <p className="text-sm text-muted">Choose one of three. They’ll get {SWAP.maxGuesses} guesses, and you can watch live.</p>
      </div>
      <div role="radiogroup" aria-label="Words to choose from" className="flex w-full max-w-[22rem] flex-col gap-2.5">
        {choices.map((w, i) => {
          const on = chosen === w;
          const level = wordDifficulty(w);
          return (
            <m.button
              key={w}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${w.toUpperCase()}, ${DIFFICULTY[level].label}`}
              onClick={() => setChosen(w)}
              disabled={sending}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: on ? 1.03 : 1 }}
              transition={{ delay: chosen ? 0 : i * 0.08, type: 'spring', stiffness: 420, damping: 26 }}
              className={`relative flex items-center gap-3 rounded-2xl border bg-surface p-3 text-left shadow-sm transition-colors ${
                on ? 'border-accent ring-2 ring-accent/35' : 'border-border hover:border-border-strong'
              }`}
            >
              <span className="flex gap-1" aria-hidden>
                {[...w].map((l, k) => (
                  <m.span
                    key={k}
                    className="tile size-9 text-base!"
                    data-state={on ? 'correct' : 'tbd'}
                    animate={on ? { rotateX: [0, 90, 0] } : { rotateX: 0 }}
                    transition={{ delay: on ? k * 0.06 : 0, duration: 0.36 }}
                  >
                    {l}
                  </m.span>
                ))}
              </span>
              <span className="ml-auto flex flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase ${DIFFICULTY[level].className}`}>
                  {DIFFICULTY[level].label}
                </span>
                <span className="text-[0.65rem] text-subtle">Key {i + 1}</span>
              </span>
            </m.button>
          );
        })}
      </div>
      {chosen && <WordChip word={chosen} won />}
      <Button variant="primary" onClick={() => void send()} disabled={!chosen || sending} className="w-full max-w-[22rem]">
        {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {chosen ? `Send ${chosen.toUpperCase()} to ${name}` : 'Choose a word'}
      </Button>
      <NotifyPrompt />
    </div>
  );
}

const DIFFICULTY = {
  easy: { label: 'Easy', className: 'bg-correct/15 text-correct' },
  medium: { label: 'Medium', className: 'bg-present/20 text-text' },
  tricky: { label: 'Tricky', className: 'bg-danger/15 text-danger' },
} as const;

/** Waiting for the other player to pick; offers a nudge. */
function Waiting({ swap, me, name }: { swap: Swap; me: string; name: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <m.span
        className="grid size-16 place-items-center rounded-3xl bg-present/20 text-present"
        animate={{ rotate: [0, 0, 180, 180] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.6, 1], ease: 'easeInOut' }}
        aria-hidden
      >
        <Hourglass className="size-8" />
      </m.span>
      <div>
        <p className="text-lg font-extrabold">{name} is picking a word for you</p>
        <p className="text-sm text-muted">We’ll let you know the moment it arrives.</p>
      </div>
      <NudgeButton swap={swap} me={me} name={name} />
      <NotifyPrompt />
    </div>
  );
}

function NudgeButton({ swap, me, name }: { swap: Swap; me: string; name: string }) {
  const f = useFriends();
  const { now } = useServices();
  const { toast } = useToast();
  const [, tick] = useState(0);
  const allowed = canNudge(swap, me, now().getTime());
  // Re-check once the cooldown is over.
  useEffect(() => {
    if (allowed || !swap.nudge) return;
    const t = window.setTimeout(() => tick((n) => n + 1), Math.max(0, swap.nudge.at + NUDGE_COOLDOWN_MS - now().getTime()) + 50);
    return () => window.clearTimeout(t);
  }, [allowed, swap.nudge, now]);

  return (
    <Button
      onClick={async () => {
        try {
          await f.nudgeSwap(swap.id);
          toast(`Nudged ${name}`, { tone: 'success' });
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Couldn’t nudge right now');
        }
      }}
      disabled={!allowed}
      className="min-h-11 px-5"
    >
      <BellRing className="size-4" aria-hidden /> {allowed ? `Nudge ${name}` : 'Nudged'}
    </Button>
  );
}

/** Watch the other player guess your word, live. */
function Spectate({ swap, me, name }: { swap: Swap; me: string; name: string }) {
  const { reducedMotion } = useSettings();
  const rows = useMemo(() => swapRows(swap), [swap]);
  const game: GameState = {
    mode: 'swap',
    id: `${swap.id}-r${swap.round}`,
    answer: swap.word ?? 'xxxxx',
    guesses: swap.guesses,
    evaluations: rows,
    status: 'playing',
    hardMode: false,
    dayIndex: null,
  };
  // Flip each new guess as it arrives: a row newer than what's been shown is revealing.
  const [shown, setShown] = useState(swap.guesses.length);
  const revealing = !reducedMotion && swap.guesses.length > shown ? swap.guesses.length - 1 : null;
  useEffect(() => {
    if (swap.guesses.length <= shown) return;
    const t = window.setTimeout(() => setShown(swap.guesses.length), reducedMotion ? 0 : revealDuration(false));
    return () => window.clearTimeout(t);
  }, [swap.guesses.length, shown, reducedMotion]);
  const started = swap.guesses.length > 0 || swap.live !== '';

  return (
    <>
      <div className="mx-auto flex w-full max-w-[26rem] items-center justify-between gap-2 px-3 pt-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span className="live-dot" aria-hidden /> <Eye className="size-4" aria-hidden /> Watching {name}
        </span>
        <span className="text-xs text-muted">
          Your word: <strong className="tracking-wider text-text uppercase">{swap.word}</strong>
        </span>
      </div>
      <div className="board-area relative min-h-0 flex-1 px-3 py-2">
        <div className="flex h-full items-center justify-center">
          <Board game={game} input={swap.live} revealingRow={revealing} shakeKey={0} celebrate={false} label={`${name}'s board`} />
        </div>
      </div>
      <div className="safe-bottom flex flex-col items-center gap-2 pt-1 pb-4">
        <p className="text-sm text-muted" aria-live="polite">
          {swap.live ? `${name} is typing…` : started ? `${swap.guesses.length} of ${SWAP.maxGuesses} guesses used` : `Waiting for ${name} to start`}
        </p>
        {!started && <NudgeButton swap={swap} me={me} name={name} />}
      </div>
    </>
  );
}

const FINISH_DELAY_MS = 2600;

const anyWord: Dictionary = { answers: [], isAccepted: () => true };

/** Rebuilds the guesser's game from the shared document. */
function gameFromSwap(swap: Swap): GameState {
  let game = createGame({ mode: 'swap', id: `${swap.id}-r${swap.round}`, answer: swap.word ?? 'xxxxx' });
  for (const g of swap.guesses) {
    const r = submitGuess(game, g, anyWord, { wordLength: GAME.wordLength, maxGuesses: SWAP.maxGuesses });
    if (r.ok) game = r.state;
  }
  return game;
}

/** Guess the word your friend picked; every guess and keystroke is shared live. */
function SwapGuess({ swap, inputEnabled }: { swap: Swap; inputEnabled: boolean }) {
  const f = useFriends();
  const { toast } = useToast();
  const pushed = useRef(swap.guesses.length);
  const latest = useRef(f);
  useEffect(() => {
    latest.current = f;
  });

  const persist = useCallback(
    (game: GameState) => {
      if (game.guesses.length <= pushed.current) return;
      pushed.current = game.guesses.length;
      const api = latest.current;
      void api
        .pushSwapGuesses(swap.id, game.guesses, '')
        .then(() => {
          // Let the last row flip (and the win bounce) play before the roles swap.
          if (game.status !== 'playing') window.setTimeout(() => void api.finishSwapRound(swap.id).catch(() => {}), FINISH_DELAY_MS);
        })
        .catch((err: unknown) => toast(err instanceof Error ? err.message : 'Couldn’t send your guess'));
    },
    [swap.id, toast],
  );
  const noop = useCallback(() => {}, []);
  const session = useGameSession({ initialGame: () => gameFromSwap(swap), persist, onFinished: noop, followHardMode: false });
  const screen = useGameScreen(session, { inputEnabled, lossToast: swap.word?.toUpperCase() ?? null });

  // Share what's being typed, so the picker can watch letter by letter.
  const input = session.session.input;
  const lastLive = useRef(swap.live);
  useEffect(() => {
    if (input === lastLive.current) return;
    const t = window.setTimeout(() => {
      lastLive.current = input;
      void latest.current.setSwapLive(swap.id, input).catch(() => {});
    }, 200);
    return () => window.clearTimeout(t);
  }, [input, swap.id]);

  return <PlayArea active={session} screen={screen} celebrationSeed={swap.round} />;
}

/** Offers to turn on notifications (once), so nudges and turns reach you. */
function NotifyPrompt() {
  const [permission, setPermission] = useState<NotifyPermission | null>(null);
  useEffect(() => {
    let live = true;
    void notifyPermission().then((p) => live && setPermission(p));
    return () => {
      live = false;
    };
  }, []);
  if (permission !== 'default') return null;
  return (
    <button
      type="button"
      onClick={async () => setPermission(await requestNotifyPermission())}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-border-strong hover:text-text"
    >
      <Bell className="size-3.5" aria-hidden /> Notify me when it’s my turn
    </button>
  );
}
