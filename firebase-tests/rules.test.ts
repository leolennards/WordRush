import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wordskiis-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const db = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

/** Creates a player (code + profile) the way the app does. */
async function makePlayer(uid: string, code: string, name = uid) {
  const d = db(uid);
  await assertSucceeds(setDoc(doc(d, 'codes', code), { uid }));
  await assertSucceeds(setDoc(doc(d, 'players', uid), { name, code, createdAt: 1, daily: null }));
}
async function befriend(a: string, b: string) {
  const d = db(a);
  await assertSucceeds(setDoc(doc(d, 'players', a, 'friends', b), { since: 1 }));
  await assertSucceeds(setDoc(doc(d, 'players', b, 'friends', a), { since: 1 }));
}

describe('codes and profiles', () => {
  it('requires sign-in for everything', async () => {
    await assertFails(getDoc(doc(db(null), 'codes', 'ABCDEF')));
    await assertFails(setDoc(doc(db(null), 'codes', 'ABCDEF'), { uid: 'x' }));
  });

  it('lets a player claim a free code and create their own profile', async () => {
    await makePlayer('alice', 'AAAAAA');
    await assertSucceeds(getDoc(doc(db('bob'), 'players', 'alice')));
  });

  it('allows claiming the code and creating the profile in one transaction (as the app does)', async () => {
    const d = db('dave');
    await assertSucceeds(
      runTransaction(d, async (tx) => {
        tx.set(doc(d, 'codes', 'DDDDDD'), { uid: 'dave' });
        tx.set(doc(d, 'players', 'dave'), { name: 'Dave', code: 'DDDDDD', createdAt: 1, daily: null });
      }),
    );
  });

  it('prevents claiming a taken code, an invalid code, or a code for someone else', async () => {
    await makePlayer('alice', 'AAAAAA');
    await assertFails(setDoc(doc(db('bob'), 'codes', 'AAAAAA'), { uid: 'bob' }));
    await assertFails(setDoc(doc(db('bob'), 'codes', 'AAAA0A'), { uid: 'bob' }));
    await assertFails(setDoc(doc(db('bob'), 'codes', 'BBBBBB'), { uid: 'alice' }));
  });

  it('prevents creating a profile with a code you do not own, or for another user', async () => {
    await makePlayer('alice', 'AAAAAA');
    await assertFails(setDoc(doc(db('bob'), 'players', 'bob'), { name: 'Bob', code: 'AAAAAA', createdAt: 1, daily: null }));
    await assertFails(setDoc(doc(db('bob'), 'players', 'alice'), { name: 'X', code: 'AAAAAA', createdAt: 1, daily: null }));
  });

  it('allows editing your own name and daily result only', async () => {
    await makePlayer('alice', 'AAAAAA');
    await makePlayer('bob', 'BBBBBB');
    const daily = { dayIndex: 0, status: 'won', rows: ['ccccc'], streak: 1 };
    await assertSucceeds(updateDoc(doc(db('alice'), 'players', 'alice'), { name: 'Al', daily }));
    await assertFails(updateDoc(doc(db('alice'), 'players', 'alice'), { code: 'CCCCCC' }));
    await assertFails(updateDoc(doc(db('alice'), 'players', 'alice'), { name: 'x'.repeat(21) }));
    await assertFails(updateDoc(doc(db('bob'), 'players', 'alice'), { name: 'Hacked' }));
  });

  it('never allows listing all players or codes', async () => {
    await makePlayer('alice', 'AAAAAA');
    await assertFails(getDocs(collection(db('bob'), 'players')));
    await assertFails(getDocs(collection(db('bob'), 'codes')));
  });
});

describe('friends', () => {
  beforeEach(async () => {
    await makePlayer('alice', 'AAAAAA');
    await makePlayer('bob', 'BBBBBB');
  });

  it('adding by code writes both friend lists', async () => {
    await befriend('alice', 'bob');
    await assertSucceeds(getDocs(collection(db('bob'), 'players', 'bob', 'friends')));
  });

  it('friend lists are private', async () => {
    await befriend('alice', 'bob');
    await assertFails(getDocs(collection(db('carol'), 'players', 'alice', 'friends')));
  });

  it('cannot write friendships between two other people, or befriend yourself', async () => {
    await makePlayer('carol', 'CCCCCC');
    await assertFails(setDoc(doc(db('carol'), 'players', 'alice', 'friends', 'bob'), { since: 1 }));
    await assertFails(setDoc(doc(db('alice'), 'players', 'alice', 'friends', 'alice'), { since: 1 }));
  });

  it('either friend can remove the friendship', async () => {
    await befriend('alice', 'bob');
    await assertSucceeds(deleteDoc(doc(db('bob'), 'players', 'alice', 'friends', 'bob')));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'players', 'bob', 'friends', 'alice')));
  });
});

describe('challenges', () => {
  const challenge = { from: 'alice', to: 'bob', players: ['alice', 'bob'], answer: 'crane', createdAt: 1, results: {} };
  beforeEach(async () => {
    await makePlayer('alice', 'AAAAAA');
    await makePlayer('bob', 'BBBBBB');
    await makePlayer('carol', 'CCCCCC');
    await befriend('alice', 'bob');
  });

  it('can only challenge friends', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'challenges', 'c1'), challenge));
    await assertFails(setDoc(doc(db('alice'), 'challenges', 'c2'), { ...challenge, to: 'carol', players: ['alice', 'carol'] }));
    await assertFails(setDoc(doc(db('carol'), 'challenges', 'c3'), { ...challenge, from: 'carol', players: ['carol', 'bob'] }));
  });

  it('only participants can read; each can only write their own result', async () => {
    await setDoc(doc(db('alice'), 'challenges', 'c1'), challenge);
    await assertSucceeds(getDoc(doc(db('bob'), 'challenges', 'c1')));
    await assertFails(getDoc(doc(db('carol'), 'challenges', 'c1')));
    await assertSucceeds(
      getDocs(query(collection(db('bob'), 'challenges'), where('players', 'array-contains', 'bob'))),
    );
    const result = { status: 'won', rows: ['ccccc'], finishedAt: 1 };
    await assertSucceeds(updateDoc(doc(db('bob'), 'challenges', 'c1'), { 'results.bob': result }));
    await assertFails(updateDoc(doc(db('bob'), 'challenges', 'c1'), { 'results.alice': result }));
    await assertFails(updateDoc(doc(db('bob'), 'challenges', 'c1'), { answer: 'slate' }));
  });
});

describe('races', () => {
  const race = {
    host: 'alice',
    guest: 'bob',
    players: ['alice', 'bob'],
    answer: 'crane',
    state: 'invited',
    createdAt: 1,
    startAt: null,
    progress: {},
    winner: null,
  };
  beforeEach(async () => {
    await makePlayer('alice', 'AAAAAA');
    await makePlayer('bob', 'BBBBBB');
    await makePlayer('carol', 'CCCCCC');
    await befriend('alice', 'bob');
  });

  it('can only invite friends', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'races', 'r1'), race));
    await assertFails(setDoc(doc(db('alice'), 'races', 'r2'), { ...race, guest: 'carol', players: ['alice', 'carol'] }));
  });

  it('participants update state and only their own progress', async () => {
    await setDoc(doc(db('alice'), 'races', 'r1'), race);
    await assertSucceeds(updateDoc(doc(db('bob'), 'races', 'r1'), { state: 'countdown', startAt: 5 }));
    const progress = { rows: ['caaaa'], status: 'playing', finishedAt: null };
    await assertSucceeds(updateDoc(doc(db('bob'), 'races', 'r1'), { 'progress.bob': progress }));
    await assertFails(updateDoc(doc(db('bob'), 'races', 'r1'), { 'progress.alice': progress }));
    await assertFails(updateDoc(doc(db('bob'), 'races', 'r1'), { answer: 'slate' }));
    await assertFails(updateDoc(doc(db('carol'), 'races', 'r1'), { state: 'cancelled' }));
    await assertFails(getDoc(doc(db('carol'), 'races', 'r1')));
  });
});
