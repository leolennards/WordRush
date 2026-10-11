import { useCallback } from 'react';
import { m } from 'motion/react';
import { ArrowLeft, Loader2, RotateCcw, Users } from 'lucide-react';
import { compareChallenge, decodeRows, encodeRows, type GameState } from '@/engine';
import { useFriends } from '@/features/friends/FriendsContext';
import type { Challenge } from '@/features/friends/types';
import { useFriendGame } from '@/features/friends/useFriendGame';
import { useGameScreen } from '@/features/game/useGameScreen';
import { PlayArea } from '@/components/board/PlayArea';
import { MiniBoard } from '@/components/home/MiniBoard';
import { Button } from '@/components/ui';
import { Avatar } from './Avatar';

interface Props {
  id: string;
  inputEnabled: boolean;
  onBack: () => void;
  onOpenChallenge: (id: string) => void;
}

export function ChallengeScreen({ id, inputEnabled, onBack, onOpenChallenge }: Props) {
  const f = useFriends();
  const challenge = f.challenges.find((c) => c.id === id);

  if (f.status !== 'ready' || !challenge) {
    const loading = f.status === 'idle' || f.status === 'connecting' || (f.status === 'ready' && f.challenges.length === 0);
    return (
      <div className="mx-auto mt-16 max-w-sm px-4 text-center">
        {loading ? (
          <Loader2 className="mx-auto size-6 animate-spin text-muted" aria-label="Loading challenge" />
        ) : (
          <>
            <p className="font-bold">This challenge isn’t available.</p>
            <p className="mt-1 text-sm text-muted">It may belong to another player or device.</p>
            <Button className="mt-4" onClick={onBack}>
              Back to friends
            </Button>
          </>
        )}
      </div>
    );
  }
  return (
    <ChallengeGame key={challenge.id} challenge={challenge} inputEnabled={inputEnabled} onBack={onBack} onOpenChallenge={onOpenChallenge} />
  );
}

function ChallengeGame({ challenge, inputEnabled, onBack, onOpenChallenge }: { challenge: Challenge } & Omit<Props, 'id'>) {
  const f = useFriends();
  const me = f.me!.uid;
  const other = challenge.from === me ? challenge.to : challenge.from;
  const otherName = f.nameOf(other);
  const alreadySubmitted = Boolean(challenge.results[me]);
  const { submitChallenge } = f;

  const onFinished = useCallback(
    (game: GameState) => {
      if (alreadySubmitted || game.status === 'playing') return;
      void submitChallenge(challenge.id, {
        status: game.status,
        rows: encodeRows(game.evaluations),
        finishedAt: Date.now(),
      });
    },
    [alreadySubmitted, submitChallenge, challenge.id],
  );

  const active = useFriendGame('challenge', challenge.id, challenge.answer, onFinished);
  const screen = useGameScreen(active, { inputEnabled });
  const { game } = active.session;
  const theirResult = challenge.results[other];

  const rematch = async () => onOpenChallenge(await f.challenge(other));

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
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Challenge vs {otherName}</h2>
          <p className="truncate text-xs text-muted">
            {theirResult
              ? game.status === 'playing'
                ? `${otherName} has played — finish to compare`
                : 'Both finished'
              : `${otherName} hasn’t played yet`}
          </p>
        </div>
        <Avatar uid={other} name={otherName} size="sm" />
      </div>

      <PlayArea
        active={active}
        screen={screen}
        celebrationSeed={challenge.createdAt % 997}
        endPanel={
          <ChallengeResult
            game={game}
            me={me}
            other={other}
            otherName={otherName}
            theirs={theirResult}
            onRematch={rematch}
            onBack={onBack}
          />
        }
      />
    </main>
  );
}

function ChallengeResult({
  game,
  me,
  other,
  otherName,
  theirs,
  onRematch,
  onBack,
}: {
  game: GameState;
  me: string;
  other: string;
  otherName: string;
  theirs: Challenge['results'][string] | undefined;
  onRematch: () => Promise<void>;
  onBack: () => void;
}) {
  const mine = { status: game.status as 'won' | 'lost', guesses: game.guesses.length };
  const outcome = theirs ? compareChallenge(mine, { status: theirs.status, guesses: theirs.rows.length }) : null;
  const headline = !outcome ? 'Your score is in.' : outcome === 'a' ? 'You win! 🏆' : outcome === 'b' ? `${otherName} wins.` : 'It’s a tie.';
  const theirBoard: GameState | null = theirs
    ? { ...game, guesses: theirs.rows.map(() => 'xxxxx'), evaluations: decodeRows(theirs.rows), status: theirs.status }
    : null;
  const line = (g: { status: string; guesses: number }) => (g.status === 'won' ? `Solved in ${g.guesses}` : 'Not solved');

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[30rem] px-3"
      role="region"
      aria-label="Challenge result"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <p className="text-center text-lg font-extrabold">{headline}</p>
        {!theirs && (
          <p className="mt-0.5 text-center text-sm text-muted">We’ll show who won once {otherName} plays.</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Side uid={me} name="You" board={game} label={line(mine)} highlight={outcome === 'a'} />
          {theirBoard && theirs ? (
            <Side uid={other} name={otherName} board={theirBoard} label={line({ status: theirs.status, guesses: theirs.rows.length })} highlight={outcome === 'b'} />
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed border-border-strong/60 p-3 text-center text-xs text-muted">
              Waiting for {otherName}…
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={onBack} className="flex-1">
            <Users className="size-4" aria-hidden /> Friends
          </Button>
          <Button variant="primary" onClick={() => void onRematch()} className="flex-1">
            <RotateCcw className="size-4" aria-hidden /> New challenge
          </Button>
        </div>
      </div>
    </m.div>
  );
}

function Side({ uid, name, board, label, highlight }: { uid: string; name: string; board: GameState; label: string; highlight: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${highlight ? 'bg-correct/15 ring-1 ring-correct/40' : 'bg-surface-2'}`}>
      <MiniBoard game={board} tile="size-2.5 rounded-[2px]" className="shrink-0" />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm font-bold">
          <Avatar uid={uid} name={name} size="sm" />
          <span className="truncate">{name}</span>
        </p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
