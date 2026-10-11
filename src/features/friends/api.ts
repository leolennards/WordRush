/**
 * Firebase data layer for friends, challenges and races.
 *
 * This module imports the Firebase SDK statically and is itself loaded with a
 * dynamic import() (see FriendsContext), so the SDK is only downloaded when a
 * player actually uses the Friends features.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { generateFriendCode, resolveRace, type RacerProgress } from '@/engine';
import type { ChallengeDoc, DailySummary, FriendLink, PlayerDoc, RaceDoc, RaceProgress } from './types';
import { firebaseConfig } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function handles() {
  if (!auth || !db) throw new Error('Friends are not connected');
  return { auth, db };
}

/** Initialises Firebase (once) and signs in anonymously. Returns the player's uid. */
export async function connect(): Promise<string> {
  const config = firebaseConfig();
  if (!config) throw new Error('Friends are not configured for this build');
  if (!app) {
    app = initializeApp(config.options);
    auth = getAuth(app);
    // Long-polling fallback helps on restrictive networks and in tests.
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    if (config.emulator) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
  }
  const a = handles().auth;
  await a.authStateReady();
  if (!a.currentUser) await signInAnonymously(a);
  return a.currentUser!.uid;
}

// ---------- Profiles ----------

export function watchPlayer(uid: string, cb: (p: PlayerDoc | null) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    doc(handles().db, 'players', uid),
    (snap) => cb(snap.exists() ? (snap.data() as PlayerDoc) : null),
    (e) => onError?.(e),
  );
}

/** Claims a unique friend code and creates the profile in one transaction. */
export async function createProfile(uid: string, name: string): Promise<string> {
  const { db } = handles();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateFriendCode();
    const ok = await runTransaction(db, async (tx) => {
      const codeRef = doc(db, 'codes', code);
      if ((await tx.get(codeRef)).exists()) return false;
      tx.set(codeRef, { uid });
      tx.set(doc(db, 'players', uid), { name, code, createdAt: Date.now(), daily: null } satisfies PlayerDoc);
      return true;
    });
    if (ok) return code;
  }
  throw new Error('Could not create a friend code, please try again');
}

export async function renameProfile(uid: string, name: string) {
  await updateDoc(doc(handles().db, 'players', uid), { name });
}

export async function publishDaily(uid: string, daily: DailySummary) {
  await updateDoc(doc(handles().db, 'players', uid), { daily });
}

// ---------- Friends ----------

export type AddFriendResult = { ok: true; uid: string } | { ok: false; reason: 'not-found' | 'self' | 'already' };

export async function addFriendByCode(me: string, code: string): Promise<AddFriendResult> {
  const { db } = handles();
  const codeSnap = await getDoc(doc(db, 'codes', code));
  if (!codeSnap.exists()) return { ok: false, reason: 'not-found' };
  const them = (codeSnap.data() as { uid: string }).uid;
  if (them === me) return { ok: false, reason: 'self' };
  if ((await getDoc(doc(db, 'players', me, 'friends', them))).exists()) return { ok: false, reason: 'already' };
  const batch = writeBatch(db);
  const since = Date.now();
  batch.set(doc(db, 'players', me, 'friends', them), { since });
  batch.set(doc(db, 'players', them, 'friends', me), { since });
  await batch.commit();
  return { ok: true, uid: them };
}

export async function removeFriend(me: string, them: string) {
  const { db } = handles();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'players', me, 'friends', them));
  batch.delete(doc(db, 'players', them, 'friends', me));
  await batch.commit();
}

export function watchFriends(me: string, cb: (links: FriendLink[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    collection(handles().db, 'players', me, 'friends'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, since: (d.data() as { since: number }).since }))),
    (e) => onError?.(e),
  );
}

// ---------- Challenges ----------

export async function createChallenge(me: string, them: string, answer: string): Promise<string> {
  const { db } = handles();
  const ref = doc(collection(db, 'challenges'));
  const data: ChallengeDoc = { from: me, to: them, players: [me, them], answer, createdAt: Date.now(), results: {} };
  await writeBatch(db).set(ref, data).commit();
  return ref.id;
}

export function watchChallenges(me: string, cb: (list: (ChallengeDoc & { id: string })[]) => void, onError?: (e: Error) => void) {
  const q = query(
    collection(handles().db, 'challenges'),
    where('players', 'array-contains', me),
    orderBy('createdAt', 'desc'),
    limit(30),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChallengeDoc) }))),
    (e) => onError?.(e),
  );
}

export async function submitChallengeResult(id: string, me: string, result: ChallengeDoc['results'][string]) {
  await updateDoc(doc(handles().db, 'challenges', id), { [`results.${me}`]: result });
}

// ---------- Races ----------

export async function createRace(me: string, them: string, answer: string): Promise<string> {
  const { db } = handles();
  const ref = doc(collection(db, 'races'));
  const data: RaceDoc = {
    host: me,
    guest: them,
    players: [me, them],
    answer,
    state: 'invited',
    createdAt: Date.now(),
    startAt: null,
    progress: {},
    winner: null,
  };
  await writeBatch(db).set(ref, data).commit();
  return ref.id;
}

export function watchRaces(me: string, cb: (list: (RaceDoc & { id: string })[]) => void, onError?: (e: Error) => void) {
  const q = query(
    collection(handles().db, 'races'),
    where('players', 'array-contains', me),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as RaceDoc) }))),
    (e) => onError?.(e),
  );
}

export function watchRace(id: string, cb: (race: (RaceDoc & { id: string }) | null) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    doc(handles().db, 'races', id),
    (snap) => cb(snap.exists() ? { id: snap.id, ...(snap.data() as RaceDoc) } : null),
    (e) => onError?.(e),
  );
}

/** Guest accepts: a short countdown, then both start at the same moment. */
export async function acceptRace(id: string, countdownMs = 3500) {
  await updateDoc(doc(handles().db, 'races', id), { state: 'countdown', startAt: Date.now() + countdownMs });
}

export async function setRaceState(id: string, state: 'declined' | 'cancelled') {
  await updateDoc(doc(handles().db, 'races', id), { state });
}

/**
 * Records my progress and, in the same transaction, settles the winner if the
 * race is now decided — so two players finishing together can't both win.
 */
export async function pushRaceProgress(id: string, me: string, progress: RaceProgress) {
  const { db } = handles();
  const ref = doc(db, 'races', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const race = snap.data() as RaceDoc;
    const all = { ...race.progress, [me]: progress };
    const update: Record<string, unknown> = { [`progress.${me}`]: progress };
    if (race.state !== 'finished' && race.startAt !== null) {
      const startAt = race.startAt;
      const racers: Record<string, RacerProgress> = {};
      for (const uid of race.players) {
        const p = all[uid];
        racers[uid] = p
          ? { status: p.status, guesses: p.rows.length, finishedAfterMs: p.finishedAt === null ? null : p.finishedAt - startAt }
          : { status: 'playing', guesses: 0, finishedAfterMs: null };
      }
      const outcome = resolveRace(racers);
      if (outcome.state === 'finished') {
        update.state = 'finished';
        update.winner = outcome.winner;
      } else if (race.state === 'countdown' && Date.now() >= startAt) {
        update.state = 'playing';
      }
    }
    tx.update(ref, update);
  });
}
