import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useServices } from '@/app/services';
import { GAME, STORAGE_PREFIX } from '@/config/game';
import { cleanDisplayName, dailyAnswer, dayIndexFor, parseFriendCode, pickPracticeAnswer } from '@/engine';
import { friendsConfigured } from './config';
import type { SaveDoc } from './api';
import { swapWaitingOn, type Swap } from '@/engine';
import { useToast } from '@/components/layout/Toasts';
import { notify } from '@/lib/notify';
import { useSettings } from '@/features/settings/SettingsContext';
import type { Account, Challenge, DailySummary, Friend, FinishedResult, FriendLink, GiftDoc, PlayerDoc, PlayerLook, Race, RaceProgress } from './types';

export type ReceivedGift = GiftDoc & { id: string };

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
  /** Word Swap matches, most recently active first. */
  swaps: Swap[];
  races: Race[];
  /** Things waiting for me: challenges I haven't played, race invites and Word Swaps on my turn. */
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
  /** A player's picture, frame, badge, title and banner (mine from my settings). */
  lookOf: (uid: string) => PlayerLook;
  /** Gifts from friends waiting to be opened. */
  gifts: ReceivedGift[];
  /** Sends a friend coins or a shop item (paid for separately). */
  sendGift: (uid: string, gift: Pick<GiftDoc, 'kind' | 'coins' | 'item'>) => Promise<void>;
  /** Opens a gift; false if it was already opened elsewhere. */
  claimGift: (id: string) => Promise<boolean>;
  /** Word Swap. */
  startSwap: (uid: string) => Promise<string>;
  pickSwapWord: (id: string, word: string) => Promise<void>;
  pushSwapGuesses: (id: string, guesses: string[], live: string) => Promise<void>;
  setSwapLive: (id: string, live: string) => Promise<void>;
  finishSwapRound: (id: string) => Promise<void>;
  nudgeSwap: (id: string) => Promise<void>;
  endSwap: (id: string) => Promise<void>;
  watchSwap: (id: string, cb: (swap: Swap | null) => void) => () => void;
  /** Cloud save for a Google account (null for guests or before connecting). */
  cloud: CloudSave | null;
}

export interface CloudSave {
  uid: string;
  watch: (cb: (save: SaveDoc | null) => void, onError?: (e: Error) => void) => () => void;
  write: (deviceId: string, own: string, sections: Omit<SaveDoc, 'v' | 'devices'>) => Promise<void>;
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
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [gifts, setGifts] = useState<ReceivedGift[]>([]);
  const api = useRef<Api | null>(null);
  const { settings } = useSettings();

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
    setStatus('error');
  }, []);

  /** Loads the Firebase module and signs in. Only sets state asynchronously. */
  // Resolves once Firebase is loaded and signed in (as a guest at least).
  const connecting = useRef<Promise<void> | null>(null);
  const startConnection = useCallback(() => {
    connecting.current = import('./api')
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
            setSwaps([]);
            setRaces([]);
            setGifts([]);
            setUid(acct.uid);
          }
        });
      })
      .catch(fail);
    return connecting.current;
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
      a.watchSwaps(uid, setSwaps, fail),
      // Gifts are a bonus: if they can't load, the rest of Friends still works.
      a.watchGifts(uid, setGifts),
    ];
    return () => unsubs.forEach((u) => u());
  }, [ready, uid, fail]);

  // Show my picture, frame, badge, title and banner to friends (only what changed).
  const none = (v: string, empty: string) => (v === empty ? null : v);
  const myLook = useMemo<PlayerLook>(
    () => ({
      frame: none(settings.frame, 'none'),
      badge: none(settings.badge, 'none'),
      avatar: none(settings.avatar, 'initial'),
      photo: settings.avatar === 'photo' && settings.photo ? settings.photo : null,
      tint: none(settings.tint, 'auto'),
      title: none(settings.title, 'none'),
      banner: none(settings.banner, 'none'),
    }),
    [settings.frame, settings.badge, settings.avatar, settings.photo, settings.tint, settings.title, settings.banner],
  );
  useEffect(() => {
    if (!ready || !api.current || !uid || !profile) return;
    const changed: Partial<PlayerLook> = {};
    for (const k of Object.keys(myLook) as (keyof PlayerLook)[]) if ((profile[k] ?? null) !== myLook[k]) changed[k] = myLook[k];
    if (!Object.keys(changed).length) return;
    // Wait a moment so a burst of changes (picking through emoji) is one write.
    const t = window.setTimeout(() => {
      api.current?.publishLook(uid, changed).catch(() => {
        /* Best effort: tried again on the next change. */
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [ready, uid, profile, myLook]);

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

  // Word Swap news: a word picked for me, a nudge, or my word solved. Toast in the app, and a system
  // notification when Wordskiis is in the background.
  const { toast } = useToast();
  const seenSwaps = useRef<Map<string, Swap> | null>(null);
  useEffect(() => {
    const before = seenSwaps.current;
    seenSwaps.current = new Map(swaps.map((s) => [s.id, s]));
    if (!before || !uid) return; // first load: nothing is "new"
    const name = (id: string) => profiles[id]?.name ?? 'Your friend';
    for (const s of swaps) {
      const prev = before.get(s.id);
      const them = s.players.find((p) => p !== uid) ?? '';
      let message: string | null = null;
      if (prev && prev.state === 'picking' && s.state === 'guessing' && s.guesser === uid) {
        message = `${name(them)} picked a word for you. Your turn to guess!`;
      } else if (s.nudge && s.nudge.by !== uid && (!prev?.nudge || prev.nudge.at !== s.nudge.at)) {
        message = swapWaitingOn(s) === uid ? `${name(them)} nudged you: it’s your turn in Word Swap` : `${name(them)} nudged you`;
      } else if (prev && prev.round !== s.round) {
        const last = s.history.at(-1);
        if (last && last.guesser === them) {
          message = last.solved
            ? `${name(them)} solved your word ${last.word.toUpperCase()} in ${last.guesses}`
            : `${name(them)} couldn’t get ${last.word.toUpperCase()}. +${last.points} to you!`;
        }
      }
      if (message) {
        toast(message, { tone: 'success', duration: 4000 });
        void notify('Wordskiis', message, `swap-${s.id}`);
      }
    }
  }, [swaps, uid, profiles, toast]);

  const need = useCallback(() => {
    if (!api.current || !uid) throw new Error('Friends are not connected yet');
    return { a: api.current, me: uid };
  }, [uid]);

  // Friend games never use today's daily answer, so they can't spoil it.
  const pickAnswer = useCallback(() => {
    const today = dailyAnswer(dayIndexFor(now(), GAME.dailyEpoch), dictionary.answers);
    return pickPracticeAnswer(dictionary.answers, [today], random);
  }, [dictionary, random, now]);

  // Cloud save is only for Google accounts, once Firebase is connected as that account.
  const signedInUid = account && !account.isAnonymous && uid === account.uid ? uid : null;
  // (The account only appears once the Firebase module has loaded, so api.current is set by then.)
  const cloud = useMemo<CloudSave | null>(() => {
    if (!signedInUid) return null;
    return {
      uid: signedInUid,
      watch: (cb, onError) => api.current?.watchSave(signedInUid, cb, onError) ?? (() => {}),
      write: async (deviceId, own, sections) => {
        if (!api.current) throw new Error('Not connected');
        await api.current.writeSave(signedInUid, deviceId, own, sections);
      },
    };
  }, [signedInUid]);

  const value = useMemo<FriendsContextValue>(() => {
    const friends: Friend[] = links
      .map((l) => ({ ...l, profile: profiles[l.uid] ?? null }))
      .sort((x, y) => (x.profile?.name ?? '').localeCompare(y.profile?.name ?? ''));
    const nameOf = (id: string) =>
      id === uid ? 'You' : (profiles[id]?.name ?? 'Your friend');
    const pendingChallenges = challenges.filter((c) => uid && !c.results[uid]).length;
    const pendingRaces = races.filter((r) => r.state === 'invited' && r.guest === uid).length;
    const pendingSwaps = swaps.filter((s) => uid && swapWaitingOn(s) === uid).length;

    return {
      status,
      error,
      me: uid && profile ? { uid, profile } : null,
      account,
      friends,
      challenges,
      races,
      pendingCount: pendingChallenges + pendingRaces + pendingSwaps,
      swaps,
      connect,
      nameOf,
      lookOf: (id: string): PlayerLook => {
        if (id === uid || id === 'me') return myLook;
        const p = profiles[id];
        return {
          frame: p?.frame ?? null,
          badge: p?.badge ?? null,
          avatar: p?.avatar ?? null,
          photo: p?.photo ?? null,
          tint: p?.tint ?? null,
          title: p?.title ?? null,
          banner: p?.banner ?? null,
        };
      },
      gifts,
      async sendGift(friendUid, gift) {
        const { a, me } = need();
        await a.sendGift(me, friendUid, gift);
      },
      async claimGift(id) {
        return need().a.claimGift(id);
      },
      cloud,
      async startSwap(friendUid) {
        const { a, me } = need();
        return a.createSwap(me, friendUid);
      },
      async pickSwapWord(id, word) {
        await need().a.pickSwapWord(id, word);
      },
      async pushSwapGuesses(id, guesses, live) {
        await need().a.pushSwapGuesses(id, guesses, live);
      },
      async setSwapLive(id, live) {
        await need().a.setSwapLive(id, live);
      },
      async finishSwapRound(id) {
        await need().a.finishSwapRound(id);
      },
      async nudgeSwap(id) {
        const { a, me } = need();
        await a.nudgeSwap(id, me);
      },
      async endSwap(id) {
        await need().a.deleteSwap(id);
      },
      watchSwap(id, cb) {
        return need().a.watchSwap(id, cb, fail);
      },
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
        // Works from anywhere (e.g. Settings), even before Friends has been opened.
        if (!api.current) {
          if (!configured) throw new Error('Sign-in isn’t available in this build.');
          setStatus((st) => (st === 'idle' || st === 'error' ? 'connecting' : st));
          await (connecting.current ?? startConnection());
        }
        const a = api.current;
        if (!a) throw new Error('Couldn’t connect. Check your internet connection and try again.');
        const result = await a.signInWithGoogle();
        // Reconnect automatically next time, so the account stays signed in across launches.
        if (result !== 'cancelled') store.set(JOINED_KEY, '1');
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
  }, [status, error, uid, account, profile, links, profiles, challenges, races, swaps, gifts, myLook, connect, need, pickAnswer, fail, store, configured, startConnection, cloud]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used inside <FriendsProvider>');
  return ctx;
}
