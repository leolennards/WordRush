import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { m } from 'motion/react';
import { Check, Cloud, Copy, Flame, Loader2, LogOut, Pencil, Share2, Smartphone, Swords, Timer, Trash2, UserPlus, Users, X, Zap } from 'lucide-react';
import { BRAND, GAME } from '@/config/game';
import { compareChallenge, decodeRows, formatFriendCode, type GameState } from '@/engine';
import { useFriends } from '@/features/friends/FriendsContext';
import type { Challenge, Friend, Race } from '@/features/friends/types';
import { copyText, shareResult } from '@/features/sharing/shareResult';
import { useToast } from '@/components/layout/Toasts';
import { MiniBoard } from '@/components/home/MiniBoard';
import { Button } from '@/components/ui';
import { Avatar } from './Avatar';
import { GoogleButton } from './GoogleButton';

interface FriendsViewProps {
  todayIndex: number;
  onOpenChallenge: (id: string) => void;
  onOpenRace: (id: string) => void;
}

const card = 'rounded-[var(--radius-card)] border border-border bg-surface';
const input =
  'h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-[0.95rem] outline-none transition placeholder:text-subtle focus:border-border-strong focus-visible:outline-2 focus-visible:outline-focus';

/** A fake GameState so MiniBoard can draw colour rows from a friend's summary. */
const boardFromRows = (rows: string[]): GameState => ({
  mode: 'challenge',
  id: 'preview',
  answer: 'xxxxx',
  guesses: rows.map(() => 'xxxxx'),
  evaluations: decodeRows(rows),
  status: 'playing',
  hardMode: false,
  dayIndex: null,
});

export function FriendsView({ todayIndex, onOpenChallenge, onOpenRace }: FriendsViewProps) {
  const friends = useFriends();
  const { status, connect } = friends;

  useEffect(() => {
    if (status === 'idle') connect();
  }, [status, connect]);

  return (
    <div className="mx-auto w-full max-w-[30rem] px-4 pt-5 pb-10 sm:pt-10 lg:max-w-[60rem]">
      <header className="mb-5 sm:mb-8">
        <p className="text-[0.8rem] font-semibold tracking-[0.08em] text-muted uppercase">Friends</p>
        <h2 className="mt-1 text-[1.9rem] leading-[1.1] font-extrabold tracking-tight sm:text-[2.4rem]">
          Play with your people.
        </h2>
      </header>

      {status === 'unavailable' && (
        <Notice icon={<Users className="size-5" aria-hidden />} title="Friends isn’t switched on yet">
          This version of {BRAND.name} isn’t connected to the friends service. The solo game works as normal.
        </Notice>
      )}
      {(status === 'idle' || status === 'connecting') && (
        <Notice icon={<Loader2 className="size-5 animate-spin" aria-hidden />} title="Connecting…">
          Getting your friends ready.
        </Notice>
      )}
      {status === 'error' && (
        <Notice icon={<X className="size-5" aria-hidden />} title="Couldn’t reach the friends service">
          {friends.error ?? 'Check your connection and try again.'}
          <div className="mt-3">
            <Button variant="primary" onClick={connect}>
              Try again
            </Button>
          </div>
        </Notice>
      )}
      {status === 'needs-profile' && <CreateProfile />}
      {status === 'ready' && (
        <Ready todayIndex={todayIndex} onOpenChallenge={onOpenChallenge} onOpenRace={onOpenRace} />
      )}
    </div>
  );
}

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={`${card} flex gap-4 p-5`} role="status">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2">{icon}</span>
      <div className="text-sm text-muted">
        <p className="mb-0.5 text-[0.95rem] font-bold text-text">{title}</p>
        {children}
      </div>
    </div>
  );
}

function CreateProfile() {
  const { createProfile, account } = useFriends();
  const [name, setName] = useState('');
  // After linking a brand-new Google account, suggest its first name.
  const suggested = account && !account.isAnonymous ? (account.displayName ?? '').split(' ')[0] ?? '' : '';
  const [usedSuggestion, setUsedSuggestion] = useState(false);
  if (suggested && !usedSuggestion && name === '') {
    setUsedSuggestion(true);
    setName(suggested.slice(0, 20));
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createProfile(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <m.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className={`${card} max-w-[30rem] p-5 shadow-md sm:p-6`}
      aria-labelledby="create-profile"
    >
      <h3 id="create-profile" className="text-lg font-bold">
        Pick a name your friends will see
      </h3>
      <p className="mt-1 text-sm text-muted">
        No email or password needed. You’ll get a friend code to share, and your profile stays on this device.
      </p>
      <label className="mt-4 block">
        <span className="sr-only">Display name</span>
        <input
          className={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sam"
          maxLength={20}
          autoComplete="nickname"
          autoFocus
        />
      </label>
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" className="mt-4 min-h-12 w-full" disabled={busy || !name.trim()}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        Create my profile
      </Button>
      {account?.isAnonymous !== false && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-subtle" aria-hidden>
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton label="Sign in with Google" className="w-full" />
          <p className="mt-2 text-center text-xs text-muted">Already have a profile on another device? This brings it here.</p>
        </>
      )}
    </m.form>
  );
}

function Ready({ todayIndex, onOpenChallenge, onOpenRace }: FriendsViewProps) {
  const f = useFriends();
  const me = f.me!;
  const invites = f.races.filter((r) => r.state === 'invited' && r.guest === me.uid);
  const myTurn = f.challenges.filter((c) => !c.results[me.uid]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr] lg:gap-6">
      <div className="flex flex-col gap-4">
        <ProfileCard />
        <AddFriend />
      </div>
      <div className="flex flex-col gap-4">
        {(invites.length > 0 || myTurn.length > 0) && (
          <section aria-labelledby="waiting" className={`${card} p-5`}>
            <h3 id="waiting" className="mb-3 flex items-center gap-2 font-bold">
              <span className="size-2 rounded-full bg-present" aria-hidden /> Waiting for you
            </h3>
            <ul className="space-y-2">
              {invites.map((r) => (
                <RaceInvite key={r.id} race={r} onOpen={() => onOpenRace(r.id)} />
              ))}
              {myTurn.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <Avatar uid={c.from} name={f.nameOf(c.from)} size="sm" />
                  <p className="min-w-0 flex-1 text-sm">
                    <strong>{c.from === me.uid ? 'Your challenge' : f.nameOf(c.from)}</strong>
                    <span className="block text-xs text-muted">
                      {c.from === me.uid ? `Play your own word vs ${f.nameOf(c.to)}` : 'sent you a challenge word'}
                    </span>
                  </p>
                  <Button variant="primary" onClick={() => onOpenChallenge(c.id)} className="min-h-10">
                    Play
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="friends-list" className={card}>
          <div className="flex items-baseline justify-between px-5 pt-5">
            <h3 id="friends-list" className="font-bold">
              Your friends
            </h3>
            <span className="text-xs text-muted">{f.friends.length} added</span>
          </div>
          {f.friends.length === 0 ? (
            <p className="m-5 mt-3 rounded-xl border border-dashed border-border-strong/60 p-4 text-sm text-muted">
              No friends yet. Share your code, or enter a friend’s code to add them. They’ll appear here for both of you.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {f.friends.map((friend) => (
                <FriendRow
                  key={friend.uid}
                  friend={friend}
                  todayIndex={todayIndex}
                  onChallenge={async () => onOpenChallenge(await f.challenge(friend.uid))}
                  onRace={async () => onOpenRace(await f.race(friend.uid))}
                />
              ))}
            </ul>
          )}
        </section>

        <Activity onOpenChallenge={onOpenChallenge} onOpenRace={onOpenRace} />
      </div>
    </div>
  );
}

function ProfileCard() {
  const f = useFriends();
  const { toast } = useToast();
  const me = f.me!;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.profile.name);
  const code = formatFriendCode(me.profile.code);

  const share = async () => {
    const url = BRAND.siteUrl || `${window.location.origin}${window.location.pathname}`;
    const outcome = await shareResult(`Add me on ${BRAND.name}! My friend code is ${code}\n${url}`);
    if (outcome === 'copied') toast('Invite copied', { tone: 'success' });
    else if (outcome === 'failed') toast('Couldn’t share — copy the code instead');
  };
  const copy = async () => {
    const outcome = await copyText(me.profile.code);
    toast(outcome === 'copied' ? 'Code copied' : 'Couldn’t copy', { tone: outcome === 'copied' ? 'success' : 'neutral' });
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await f.rename(name);
      setEditing(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t rename');
    }
  };

  return (
    <section aria-labelledby="my-profile" className={`${card} p-5 shadow-md sm:p-6`}>
      <div className="flex items-center gap-3">
        <Avatar uid={me.uid} name={me.profile.name} size="lg" />
        {editing ? (
          <form onSubmit={save} className="flex flex-1 gap-2">
            <input
              className={`${input} h-11`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              aria-label="Display name"
              autoFocus
            />
            <Button type="submit" variant="primary" aria-label="Save name" className="min-h-11 px-3">
              <Check className="size-4" aria-hidden />
            </Button>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 id="my-profile" className="flex items-center gap-1.5 truncate text-lg font-bold">
              {me.profile.name}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Edit name"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            </h3>
            <p className="text-sm text-muted">This is how friends see you.</p>
          </div>
        )}
      </div>

      <AccountRow />

      <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-center">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Your friend code</p>
        <p className="tabular mt-1 text-[2.1rem] leading-none font-extrabold tracking-[0.14em]" aria-label={`Your friend code is ${[...me.profile.code].join(' ')}`}>
          {code}
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={copy} className="flex-1 bg-surface hover:bg-surface-3">
            <Copy className="size-4" aria-hidden /> Copy
          </Button>
          <Button variant="primary" onClick={share} className="flex-1">
            <Share2 className="size-4" aria-hidden /> Share invite
          </Button>
        </div>
      </div>
      <DeleteProfile />
    </section>
  );
}

function AccountRow() {
  const f = useFriends();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const account = f.account;
  if (!account) return null;

  if (account.isAnonymous) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border-strong/70 p-3">
        <Smartphone className="size-4 shrink-0 text-muted" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-muted">
          <strong className="text-text">Guest profile</strong> — saved on this device only.
        </p>
        <GoogleButton label="Save with Google" className="min-h-10" />
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border p-3">
      <div className="flex items-center gap-3">
        <Cloud className="size-4 shrink-0 text-correct" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm text-muted">
          Saved to Google{account.email ? <> · <span className="text-text">{account.email}</span></> : null}
        </p>
        {!confirming && (
          <Button variant="ghost" className="min-h-9 px-3" onClick={() => setConfirming(true)}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
        )}
      </div>
      {confirming && (
        <div className="mt-3 space-y-2" role="alert">
          <p className="text-sm text-muted">
            You’ll continue as a new guest on this device. Sign in with Google again any time to get this profile back.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="min-h-10"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await f.signOut();
                  toast('Signed out');
                } finally {
                  setBusy(false);
                  setConfirming(false);
                }
              }}
            >
              Sign out
            </Button>
            <Button variant="ghost" className="min-h-10" onClick={() => setConfirming(false)} autoFocus>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteProfile() {
  const f = useFriends();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-4 border-t border-border pt-3">
      {!confirming ? (
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <a href={`${BRAND.siteUrl}/privacy.html`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-text hover:underline">
            Privacy policy
          </a>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1 rounded-md px-1 py-1 hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden /> Delete my profile
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-danger/40 bg-danger/5 p-3" role="alert">
          <p className="text-sm">
            <strong>Delete your profile for good?</strong> Your name, friend code, friends list and sign-in are
            removed for everyone. Your solo games and stats on this device stay. This can’t be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="min-h-10"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await f.deleteProfile();
                  toast('Profile deleted');
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'Couldn’t delete your profile');
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
              Delete forever
            </Button>
            <Button variant="ghost" className="min-h-10" onClick={() => setConfirming(false)} autoFocus disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddFriend() {
  const f = useFriends();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const uid = await f.addFriend(code);
      setCode('');
      toast(`${f.nameOf(uid) === 'Your friend' ? 'Friend' : f.nameOf(uid)} added`, { tone: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add friend');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} p-5`} aria-labelledby="add-friend">
      <h3 id="add-friend" className="font-bold">
        Add a friend
      </h3>
      <p className="mt-0.5 text-sm text-muted">Enter the 6-character code from their Friends tab.</p>
      <div className="mt-3 flex gap-2">
        <input
          className={`${input} tabular font-semibold tracking-[0.18em] uppercase`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="ABC-123"
          aria-label="Friend code"
          aria-invalid={error ? true : undefined}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
        />
        <Button type="submit" variant="primary" className="min-h-12" disabled={busy || code.trim().length < 6}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
          Add
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function dailyLine(friend: Friend, todayIndex: number): string {
  const d = friend.profile?.daily;
  if (!d || d.dayIndex !== todayIndex || (d.status === 'playing' && d.rows.length === 0)) {
    return 'Hasn’t played today’s puzzle';
  }
  if (d.status === 'won') return `Solved today’s puzzle in ${d.rows.length}`;
  if (d.status === 'lost') return 'Missed today’s puzzle';
  return `Playing today · ${d.rows.length}/${GAME.maxGuesses}`;
}

function FriendRow({
  friend,
  todayIndex,
  onChallenge,
  onRace,
}: {
  friend: Friend;
  todayIndex: number;
  onChallenge: () => Promise<void>;
  onRace: () => Promise<void>;
}) {
  const f = useFriends();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'challenge' | 'race' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const name = friend.profile?.name ?? 'Loading…';
  const daily = friend.profile?.daily;
  const playedToday = daily && daily.dayIndex === todayIndex && daily.rows.length > 0;
  const streak = daily && daily.dayIndex >= todayIndex - 1 ? daily.streak : 0;

  const run = async (kind: 'challenge' | 'race' | 'remove', fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="p-4 sm:px-5">
      <div className="flex items-center gap-3">
        <Avatar uid={friend.uid} name={name} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-semibold">
            {name}
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-present" aria-label={`${streak} day streak`}>
                <Flame className="size-3.5" aria-hidden />
                {streak}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted">{dailyLine(friend, todayIndex)}</p>
        </div>
        {playedToday && <MiniBoard game={boardFromRows(daily.rows)} tile="size-2 rounded-[2px]" className="shrink-0" />}
      </div>
      <div className="mt-3 flex gap-2 pl-14">
        <Button onClick={() => run('challenge', onChallenge)} disabled={busy !== null} className="min-h-10 flex-1">
          {busy === 'challenge' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Swords className="size-4" aria-hidden />}
          Challenge
        </Button>
        <Button variant="primary" onClick={() => run('race', onRace)} disabled={busy !== null} className="min-h-10 flex-1">
          {busy === 'race' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Zap className="size-4" aria-hidden />}
          Race
        </Button>
        {confirmRemove ? (
          <Button
            variant="danger"
            className="min-h-10"
            onClick={() =>
              run('remove', async () => {
                await f.removeFriend(friend.uid);
                toast(`${name} removed`);
              })
            }
          >
            Remove
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            onBlur={() => setTimeout(() => setConfirmRemove(false), 200)}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
            aria-label={`Remove ${name} from friends`}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}

function RaceInvite({ race, onOpen }: { race: Race; onOpen: () => void }) {
  const f = useFriends();
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
      <Avatar uid={race.host} name={f.nameOf(race.host)} size="sm" />
      <p className="min-w-0 flex-1 text-sm">
        <strong>{f.nameOf(race.host)}</strong>
        <span className="block text-xs text-muted">wants to race you now</span>
      </p>
      <Button
        variant="ghost"
        className="min-h-10 px-3"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await f.declineRace(race.id).finally(() => setBusy(false));
        }}
      >
        Decline
      </Button>
      <Button
        variant="primary"
        className="min-h-10"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await f.acceptRace(race.id);
            onOpen();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Zap className="size-4" aria-hidden /> Accept
      </Button>
    </li>
  );
}

function Activity({ onOpenChallenge, onOpenRace }: Pick<FriendsViewProps, 'onOpenChallenge' | 'onOpenRace'>) {
  const f = useFriends();
  const me = f.me!.uid;
  type Item = { kind: 'challenge'; at: number; c: Challenge } | { kind: 'race'; at: number; r: Race };
  const items: Item[] = [
    ...f.challenges.filter((c) => c.results[me]).map((c) => ({ kind: 'challenge' as const, at: c.createdAt, c })),
    ...f.races
      .filter((r) => r.state === 'finished' || (r.state === 'invited' && r.host === me) || r.state === 'countdown' || r.state === 'playing')
      .map((r) => ({ kind: 'race' as const, at: r.createdAt, r })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="activity" className={card}>
      <h3 id="activity" className="px-5 pt-5 font-bold">
        Recent games
      </h3>
      <ul className="divide-y divide-border">
        {items.map((it) => {
          if (it.kind === 'challenge') {
            const other = it.c.from === me ? it.c.to : it.c.from;
            const mine = it.c.results[me];
            const theirs = it.c.results[other];
            const summary = !theirs
              ? `Waiting for ${f.nameOf(other)}`
              : mine
                ? { a: 'You won', b: `${f.nameOf(other)} won`, tie: 'Tie' }[
                    compareChallenge(
                      { status: mine.status, guesses: mine.rows.length },
                      { status: theirs.status, guesses: theirs.rows.length },
                    )
                  ]
                : '';
            return (
              <li key={`c-${it.c.id}`}>
                <button type="button" onClick={() => onOpenChallenge(it.c.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
                  <Swords className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    Challenge with <strong>{f.nameOf(other)}</strong>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{summary}</span>
                </button>
              </li>
            );
          }
          const other = it.r.host === me ? it.r.guest : it.r.host;
          const label =
            it.r.state === 'finished'
              ? it.r.winner === 'draw'
                ? 'Draw'
                : it.r.winner === me
                  ? 'You won'
                  : `${f.nameOf(other)} won`
              : it.r.state === 'invited'
                ? 'Invite sent'
                : 'In progress';
          return (
            <li key={`r-${it.r.id}`}>
              <button type="button" onClick={() => onOpenRace(it.r.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
                <Timer className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">
                  Race with <strong>{f.nameOf(other)}</strong>
                </span>
                <span className="shrink-0 text-xs text-muted">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
