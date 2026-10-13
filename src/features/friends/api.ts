/**
 * Firebase data layer for friends, challenges and races.
 *
 * This module imports the Firebase SDK statically and is itself loaded with a
 * dynamic import() (see FriendsContext), so the SDK is only downloaded when a
 * player actually uses the Friends features.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from 'firebase/app-check';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  deleteUser,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  getDocs,
  doc,
  getDoc,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { generateFriendCode, resolveRace, type RacerProgress } from '@/engine';
import type { Account, ChallengeDoc, DailySummary, FriendLink, PlayerDoc, RaceDoc, RaceProgress } from './types';
import { firebaseConfig } from './config';
import { isNativeApp } from '@/lib/native/platform';

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
    // App Check: proves requests come from the real website or app (reCAPTCHA Enterprise,
    // invisible). Firestore rejects requests without a valid token once enforcement is on.
    if (config.appCheckSiteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(config.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
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

// ---------- Accounts ----------

const toAccount = (u: User): Account => {
  // After linking, Google's name/email live on the provider entry, not always on the user.
  const google = u.providerData.find((p) => p.providerId === 'google.com');
  return {
    uid: u.uid,
    isAnonymous: u.isAnonymous,
    email: u.email ?? google?.email ?? null,
    displayName: u.displayName ?? google?.displayName ?? null,
  };
};

/** The current account. Needed after linking, which doesn't fire an auth-state change. */
export function currentAccount(): Account | null {
  const u = handles().auth.currentUser;
  return u ? toAccount(u) : null;
}

/** Fires with the signed-in account whenever the user changes (sign-in, sign-out). */
export function onAccountChange(cb: (account: Account | null) => void) {
  return onAuthStateChanged(handles().auth, (u) => cb(u ? toAccount(u) : null));
}

export type GoogleResult = 'linked' | 'switched' | 'cancelled';

/**
 * Saves the current guest profile to a Google account by linking them, so the
 * same profile, code and friends are kept. If that Google account already has
 * a Wordskiis profile (e.g. from another device), signs into it instead.
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  const { auth } = handles();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  try {
    if (isNativeApp()) {
      // In the app: native account picker → ID token → link to this profile.
      const { nativeGoogleIdToken } = await import('@/lib/native/googleNative');
      const idToken = await nativeGoogleIdToken();
      if (!idToken) return 'cancelled';
      const credential = GoogleAuthProvider.credential(idToken);
      try {
        await linkWithCredential(user, credential);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
          await signInWithCredential(auth, GoogleAuthProvider.credentialFromError(err as never) ?? credential);
          return 'switched';
        }
        throw err;
      }
      // Refresh the token so it carries the new Google identity (needed for cloud save).
      await user.getIdToken(true);
      return 'linked';
    }
    await linkWithPopup(user, provider);
    await user.getIdToken(true);
    return 'linked';
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'cancelled';
    if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
      const credential = GoogleAuthProvider.credentialFromError(err as never);
      if (!credential) throw err;
      await signInWithCredential(auth, credential);
      return 'switched';
    }
    if (code === 'auth/popup-blocked') throw new Error('Your browser blocked the sign-in window. Allow pop-ups and try again.', { cause: err });
    if (code === 'auth/unauthorized-domain') throw new Error('Google sign-in isn’t enabled for this web address yet.', { cause: err });
    if (code === 'auth/operation-not-allowed') throw new Error('Google sign-in isn’t switched on yet.', { cause: err });
    throw err;
  }
}

/** Signs out and continues as a brand-new guest on this device. */
export async function signOutToGuest() {
  const { auth } = handles();
  if (isNativeApp()) {
    const { nativeGoogleSignOut } = await import('@/lib/native/googleNative');
    await nativeGoogleSignOut();
  }
  await signOut(auth);
  await signInAnonymously(auth);
}

/**
 * Deletes everything this player owns: friendships (both sides), friend code,
 * profile and sign-in account, then continues as a fresh guest.
 * Past challenge/race records keep only the anonymous user id (no name).
 */
export async function deleteProfile(me: string, code: string | null) {
  const { auth, db } = handles();
  const friends = await getDocs(collection(db, 'players', me, 'friends'));
  const batch = writeBatch(db);
  for (const f of friends.docs) {
    batch.delete(doc(db, 'players', me, 'friends', f.id));
    batch.delete(doc(db, 'players', f.id, 'friends', me));
  }
  if (code) batch.delete(doc(db, 'codes', code));
  batch.delete(doc(db, 'players', me));
  batch.delete(doc(db, 'saves', me));
  await batch.commit();

  const user = auth.currentUser;
  if (user) {
    if (isNativeApp() && !user.isAnonymous) {
      const { nativeGoogleSignOut } = await import('@/lib/native/googleNative');
      await nativeGoogleSignOut();
    }
    try {
      await deleteUser(user);
    } catch {
      // e.g. "requires recent login" for Google accounts: the profile data is
      // already gone, so just sign out.
      await signOut(auth);
    }
  }
  await signInAnonymously(auth);
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

// ---------- Cloud save ----------

/** The cloud save document: every section is JSON text (Firestore can't store nested arrays). */
export interface SaveDoc {
  v: 1;
  /** Each device's own counters (JSON), by device id. */
  devices: Record<string, string>;
  shared?: string;
  dailyStats?: string;
  practiceStats?: string;
  daily?: string;
  wordbook?: string;
}

export function watchSave(uid: string, cb: (save: SaveDoc | null) => void, onError?: (e: Error) => void) {
  const { db } = handles();
  return onSnapshot(
    doc(db, 'saves', uid),
    (snap) => cb(snap.exists() ? (snap.data() as SaveDoc) : null),
    (e) => onError?.(e),
  );
}

/** Writes this device's share and the merged sections; other devices' shares are kept. */
export async function writeSave(uid: string, deviceId: string, own: string, sections: Omit<SaveDoc, 'v' | 'devices'>) {
  const { db } = handles();
  await setDoc(
    doc(db, 'saves', uid),
    { v: 1, devices: { [deviceId]: own }, ...sections, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
