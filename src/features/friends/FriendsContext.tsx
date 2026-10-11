import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useServices } from '@/app/services';
import { GAME, STORAGE_PREFIX } from '@/config/game';
import { cleanDisplayName, dailyAnswer, dayIndexFor, parseFriendCode, pickPracticeAnswer } from '@/engine';
import { friendsConfigured } from './config';
import type { Account, Challenge, DailySummary, Friend, FinishedResult, FriendLink, PlayerDoc, Race, RaceProgress } from './types';

type Api = typeof import('./api');

export type FriendsStatus = 'unavailable' | 'idle' | 'connecting' | 'needs-profile' | 'ready' | 'error';

interface FriendsContextValue {
  status: FriendsStatus;
  error: string | null;
  me: { uid: string; profile: PlayerDoc } | null;
  /** The signed-in account (guest or Google). */
  account: Account | null;
  friends: Friend[];
  challenges: Challenge[];
  races: Race[];
  /** Things waiting for me: challenges I haven't played + race invites. */
  pendingCount: number;
  connect: () => void;
  createProfile: (name: string) => Promise<void>;
  rename: (name: string) => Promise<void>;
  addFriend: (code: string) => Promise<string>;
  removeFriend: (uid: string) => Promise<void>;
  challenge: (uid: string) => Promise<string>;
  submitChallenge: (id: string, result: FinishedResult) => Promise<void>;
  race: (uid: string) => Promise<string>;
  acceptRace: (id: string) => Promise<void>;
  declineRace: (id: string) => Promise<void>;
  cancelRace: (id: string) => Promise<void>;
  pushRaceProgress: (id: string, progress: RaceProgress) => Promise<void>;
  watchRace: (id: string, cb: (race: Race | null) => void) => () => void;
  publishDaily: (daily: DailySummary) => void;
  /** Link this profile to Google, or load the Google account's existing profile. */
  signInWithGoogle: () => Promise<'linked' | 'switched' | 'cancelled'>;
  /** Sign out of Google and continue as a new guest on this device. */
  signOut: () => Promise<void>;
  /** Permanently delete my profile, code, friendships and account. */
  deleteProfile: () => Promise<void>;
  nameOf: (uid: string) => string;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);
/** Remembers that this device joined, so Friends reconnects automatically next time. */
const JOINED_KEY = `${STORAGE_PREFIX}:friends-joined`;

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { store, dictionary, random, now } = useServices();
  const configured = friendsConfigured();
  // Devices that joined before reconnect automatically, so they start as "connecting".
  const [status, setStatus] = useState<FriendsStatus>(() =>
    !configured ? 'unavailable' : store.get(JOINED_KEY) === '1' ? 'connecting' : 'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const accountUnsub = useRef<(() => void) | null>(null);
  const uidRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<PlayerDoc | null>(null);
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PlayerDoc | null>>({});
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const api = useRef<Api | null>(null);

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
    setStatus('error');
  }, []);

  /** Loads the Firebase module and signs in. Only sets state asynchronously. */
  const startConnection = useCallback(() => {
    import('./api')
      .then(async (mod) => {
        api.current = mod;
        await mod.connect();
        // Follow the account live: linking, switching or signing out changes it.
        accountUnsub.current?.();
        accountUnsub.current = mod.onAccountChange((acct) => {
          if (!acct) return; // momentarily signed out while switching
          setAccount(acct);
          if (uidRef.current !== acct.uid) {
            // A different player: clear everything that belonged to the previous one.
            uidRef.current = acct.uid;
            setStatus('connecting');
            setProfile(null);
            setLinks([]);
            setChallenges([]);
            setRaces([]);
            setUid(acct.uid);
          }
        });
      })
      .catch(fail);
  }, [fail]);

  useEffect(() => () => accountUnsub.current?.(), []);

  const connect = useCallback(() => {
    if (!configured) return;
    setStatus((s) => (s === 'ready' || s === 'needs-profile' || s === 'connecting' ? s : 'connecting'));
    setError(null);
    startConnection();
  }, [configured, startConnection]);

  // Reconnect automatically on later visits once this device has joined.
  const autoConnect = configured && store.get(JOINED_KEY) === '1';
  useEffect(() => {
    if (autoConnect) startConnection();
  }, [autoConnect, startConnection]);

  // Live: my profile.
  useEffect(() => {
    if (!uid || !api.current) return;
    return api.current.watchPlayer(
      uid,
      (p) => {
        setProfile(p);
        setStatus(p ? 'ready' : 'needs-profile');
        if (p) store.set(JOINED_KEY, '1');
      },
      fail,
    );
  }, [uid, store, fail]);

  const ready = status === 'ready' && uid !== null;

  // Live: friend list, challenges and races.
  useEffect(() => {
    if (!ready || !api.current || !uid) return;
    const a = api.current;
    const unsubs = [
      a.watchFriends(uid, setLinks, fail),
      a.watchChallenges(uid, setChallenges, fail),
      a.watchRaces(uid, setRaces, fail),
    ];
    return () => unsubs.forEach((u) => u());
  }, [ready, uid, fail]);

  // Live: each friend's public profile (name + today's result).
  const linkKey = links.map((l) => l.uid).sort().join(',');
  useEffect(() => {
    if (!ready || !api.current || linkKey === '') return;
    const a = api.current;
    const unsubs = linkKey.split(',').map((fid) =>
      a.watchPlayer(fid, (p) => setProfiles((prev) => ({ ...prev, [fid]: p }))),
    );
    return () => unsubs.forEach((u) => u());
  }, [ready, linkKey]);

  const need = useCallback(() => {
    if (!api.current || !uid) throw new Error('Friends are not connected yet');
    return { a: api.current, me: uid };
  }, [uid]);

  // Friend games never use today's daily answer, so they can't spoil it.
  const pickAnswer = useCallback(() => {
    const today = dailyAnswer(dayIndexFor(now(), GAME.dailyEpoch), dictionary.answers);
    return pickPracticeAnswer(dictionary.answers, [today], random);
  }, [dictionary, random, now]);

  const value = useMemo<FriendsContextValue>(() => {
    const friends: Friend[] = links
      .map((l) => ({ ...l, profile: profiles[l.uid] ?? null }))
      .sort((x, y) => (x.profile?.name ?? '').localeCompare(y.profile?.name ?? ''));
    const nameOf = (id: string) =>
      id === uid ? 'You' : (profiles[id]?.name ?? 'Your friend');
    const pendingChallenges = challenges.filter((c) => uid && !c.results[uid]).length;
    const pendingRaces = races.filter((r) => r.state === 'invited' && r.guest === uid).length;

    return {
      status,
      error,
      me: uid && profile ? { uid, profile } : null,
      account,
      friends,
      challenges,
      races,
      pendingCount: pendingChallenges + pendingRaces,
      connect,
      nameOf,
      async createProfile(raw) {
        const name = cleanDisplayName(raw);
        if (!name) throw new Error('Please enter a name');
        const { a, me } = need();
        await a.createProfile(me, name);
      },
      async rename(raw) {
        const name = cleanDisplayName(raw);
        if (!name) throw new Error('Please enter a name');
        const { a, me } = need();
        await a.renameProfile(me, name);
      },
      async addFriend(raw) {
        const code = parseFriendCode(raw);
        if (!code) throw new Error('That doesn’t look like a friend code');
        const { a, me } = need();
        const res = await a.addFriendByCode(me, code);
        if (!res.ok) {
          throw new Error(
            res.reason === 'self'
              ? 'That’s your own code'
              : res.reason === 'already'
                ? 'You’re already friends'
                : 'No player has that code',
          );
        }
        return res.uid;
      },
      async removeFriend(friendUid) {
        const { a, me } = need();
        await a.removeFriend(me, friendUid);
      },
      async challenge(friendUid) {
        const { a, me } = need();
        return a.createChallenge(me, friendUid, pickAnswer());
      },
      async submitChallenge(id, result) {
        const { a, me } = need();
        await a.submitChallengeResult(id, me, result);
      },
      async race(friendUid) {
        const { a, me } = need();
        return a.createRace(me, friendUid, pickAnswer());
      },
      async acceptRace(id) {
        await need().a.acceptRace(id);
      },
      async declineRace(id) {
        await need().a.setRaceState(id, 'declined');
      },
      async cancelRace(id) {
        await need().a.setRaceState(id, 'cancelled');
      },
      async pushRaceProgress(id, progress) {
        const { a, me } = need();
        await a.pushRaceProgress(id, me, progress);
      },
      watchRace(id, cb) {
        if (!api.current) return () => {};
        return api.current.watchRace(id, cb, fail);
      },
      async signInWithGoogle() {
        const { a } = need();
        const result = await a.signInWithGoogle();
        // Linking keeps the same user, so refresh the account details by hand.
        if (result === 'linked') setAccount(a.currentAccount());
        return result;
      },
      async signOut() {
        await need().a.signOutToGuest();
      },
      async deleteProfile() {
        const { a, me } = need();
        await a.deleteProfile(me, profile?.code ?? null);
        store.remove(JOINED_KEY);
      },
      publishDaily(daily) {
        if (!api.current || !uid || status !== 'ready') return;
        api.current.publishDaily(uid, daily).catch(() => {
          /* Best effort: the scoreboard will catch up on the next guess. */
        });
      },
    };
  }, [status, error, uid, account, profile, links, profiles, challenges, races, connect, need, pickAnswer, fail, store]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used inside <FriendsProvider>');
  return ctx;
}
