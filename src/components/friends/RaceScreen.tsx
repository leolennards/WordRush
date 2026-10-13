import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Loader2, RotateCcw, Users, Zap } from 'lucide-react';
import { GAME } from '@/config/game';
import { decodeRows, encodeRows, type GameState } from '@/engine';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import type { Race } from '@/features/friends/types';
import { useFriendGame } from '@/features/friends/useFriendGame';
import { useGameScreen } from '@/features/game/useGameScreen';
import { PlayArea } from '@/components/board/PlayArea';
import { MiniBoard } from '@/components/home/MiniBoard';
import { BoardOverlay, Button } from '@/components/ui';
import { Avatar } from './Avatar';

interface Props {
  id: string;
  inputEnabled: boolean;
  onBack: () => void;
  onOpenRace: (id: string) => void;
}

/** Re-renders every `ms` while `active`, returning the current time. */
function useClock(active: boolean, ms = 200): number {
  const { now } = useServices();
  const [t, setT] = useState(() => now().getTime());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setT(now().getTime()), ms);
    return () => window.clearInterval(id);
  }, [active, ms, now]);
  return t;
}

export function RaceScreen({ id, inputEnabled, onBack, onOpenRace }: Props) {
  const f = useFriends();
  const [race, setRace] = useState<Race | null | undefined>(undefined);
  const { watchRace, status } = f;

  useEffect(() => {
    if (status !== 'ready') return;
    return watchRace(id, setRace);
  }, [id, status, watchRace]);

  if (status !== 'ready' || race === undefined) {
    return <Loader2 className="mx-auto mt-16 size-6 animate-spin text-muted" aria-label="Loading race" />;
  }
  if (race === null) {
    return (
      <div className="mx-auto mt-16 max-w-sm px-4 text-center">
        <p className="font-bold">This race isn’t available.</p>
        <Button className="mt-4" onClick={onBack}>
          Back to friends
        </Button>
      </div>
    );
  }
  return <RaceGame key={race.id} race={race} inputEnabled={inputEnabled} onBack={onBack} onOpenRace={onOpenRace} />;
}

function RaceGame({ race, inputEnabled, onBack, onOpenRace }: { race: Race } & Omit<Props, 'id'>) {
  const f = useFriends();
  const { now } = useServices();
  const me = f.me!.uid;
  const other = race.host === me ? race.guest : race.host;
  const otherName = f.nameOf(other);
  const { pushRaceProgress } = f;

  const started = race.state === 'countdown' || race.state === 'playing' || race.state === 'finished';
  const clock = useClock(race.state === 'countdown' || race.state === 'playing', 250);
  const msToStart = race.startAt === null ? Infinity : race.startAt - clock;
  // Typing unlocks at the shared start time, whatever the stored state says.
  const live = (race.state === 'countdown' || race.state === 'playing') && msToStart <= 0;

  const onFinished = useCallback(() => {}, []);
  const active = useFriendGame('race', race.id, race.answer, onFinished);
  const { game } = active.session;
  const finished = race.state === 'finished';
  const screen = useGameScreen(active, { inputEnabled: inputEnabled && live && !finished, lossToast: null });

  // Publish my progress (colours only) after every guess.
  const pushed = useRef(-1);
  useEffect(() => {
    if (!started || game.guesses.length === pushed.current) return;
    pushed.current = game.guesses.length;
    void pushRaceProgress(race.id, {
      status: game.status,
      rows: encodeRows(game.evaluations),
      finishedAt: game.status === 'playing' ? null : now().getTime(),
    }).catch(() => {
      pushed.current = -1; // retry on the next change
    });
  }, [started, game.guesses.length, game.status, game.evaluations, race.id, pushRaceProgress, now]);

  const theirs = race.progress[other];
  const theirBoard: GameState = {
    ...game,
    guesses: (theirs?.rows ?? []).map(() => 'xxxxx'),
    evaluations: decodeRows(theirs?.rows ?? []),
  };

  const rematch = async () => onOpenRace(await f.race(other));

  const opponentStrip = (
    <div className="mx-auto mt-2 flex w-full max-w-[26rem] items-center gap-3 px-3">
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2">
        <Avatar uid={other} name={otherName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{otherName}</p>
          <p className="text-xs text-muted" aria-live="polite">
            {theirs?.status === 'won'
              ? 'Solved it!'
              : theirs?.status === 'lost'
                ? 'Out of guesses'
                : `${theirs?.rows.length ?? 0} of ${GAME.maxGuesses} guesses`}
          </p>
        </div>
        <MiniBoard game={theirBoard} tile="size-2 rounded-[2px]" className="shrink-0" />
      </div>
    </div>
  );

  let overlay = null;
  if (race.state === 'invited') {
    overlay = (
      <BoardOverlay>
        {race.host === me ? (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-muted" aria-hidden />
            <p className="mt-3 font-bold">Waiting for {otherName} to accept…</p>
            <p className="mt-1 text-sm text-muted">They’ll see your invite in their Friends tab.</p>
            <Button className="mt-4" onClick={() => void f.cancelRace(race.id).then(onBack)}>
              Cancel race
            </Button>
          </>
        ) : (
          <>
            <p className="font-bold">{otherName} wants to race you</p>
            <p className="mt-1 text-sm text-muted">Same word, same moment. First to solve wins.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => void f.declineRace(race.id).then(onBack)}>Decline</Button>
              <Button variant="primary" onClick={() => void f.acceptRace(race.id)}>
                <Zap className="size-4" aria-hidden /> Accept
              </Button>
            </div>
          </>
        )}
      </BoardOverlay>
    );
  } else if (race.state === 'declined' || race.state === 'cancelled') {
    overlay = (
      <BoardOverlay>
        <p className="font-bold">{race.state === 'declined' ? `${otherName} declined the race.` : 'This race was cancelled.'}</p>
        <Button className="mt-4" onClick={onBack}>
          Back to friends
        </Button>
      </BoardOverlay>
    );
  } else if ((race.state === 'countdown' || race.state === 'playing') && msToStart > 0) {
    const n = Math.ceil(msToStart / 1000);
    overlay = (
      <BoardOverlay transparent>
        <AnimatePresence mode="popLayout">
          <m.p
            key={n}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="text-7xl font-extrabold tabular"
            aria-live="assertive"
          >
            {n}
          </m.p>
        </AnimatePresence>
        <p className="mt-2 text-sm font-semibold text-muted">Get ready…</p>
      </BoardOverlay>
    );
  }

  const outcome = finished ? (race.winner === 'draw' ? 'draw' : race.winner === me ? 'won' : 'lost') : null;

  return (
    <main id="game" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-3 pt-3 sm:pt-5">
        <button
          type="button"
          onClick={onBack}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Back to friends"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Race vs {otherName}</h2>
          <p className="truncate text-xs text-muted">First to solve wins</p>
        </div>
      </div>

      <PlayArea
        active={active}
        screen={screen}
        top={started ? opponentStrip : null}
        overlay={overlay}
        keyboardDisabled={!live || finished}
        celebrationSeed={race.createdAt % 997}
        forceEnd={finished}
        endPanel={
          outcome && (
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-[30rem] px-3" role="region" aria-label="Race result">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-center shadow-md">
                <p className="text-xl font-extrabold">
                  {outcome === 'won' ? 'You won the race! 🏆' : outcome === 'draw' ? 'It’s a draw.' : `${otherName} won this one.`}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  The word was <strong className="text-text">{race.answer.toUpperCase()}</strong>
                </p>
                <div className="mt-3 flex gap-2">
                  <Button onClick={onBack} className="flex-1">
                    <Users className="size-4" aria-hidden /> Friends
                  </Button>
                  <Button variant="primary" onClick={() => void rematch()} className="flex-1">
                    <RotateCcw className="size-4" aria-hidden /> Rematch
                  </Button>
                </div>
              </div>
            </m.div>
          )
        }
      />
    </main>
  );
}

