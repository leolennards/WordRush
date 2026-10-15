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

  it('lets owners delete their own profile and code, but nobody else’s', async () => {
    await makePlayer('alice', 'AAAAAA');
    await makePlayer('bob', 'BBBBBB');
    await assertFails(deleteDoc(doc(db('bob'), 'players', 'alice')));
    await assertFails(deleteDoc(doc(db('bob'), 'codes', 'AAAAAA')));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'codes', 'AAAAAA')));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'players', 'alice')));
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

describe('cloud save', () => {
  const google = (uid: string) =>
    env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['g-' + uid] } } }).firestore();
  const save = { v: 1, devices: { phone: '{"xp":10}' }, shared: '{}', wordbook: '[]' };

  it('lets a Google account write and read only its own save', async () => {
    await assertSucceeds(setDoc(doc(google('alice'), 'saves', 'alice'), save));
    await assertSucceeds(getDoc(doc(google('alice'), 'saves', 'alice')));
    await assertSucceeds(setDoc(doc(google('alice'), 'saves', 'alice'), { devices: { laptop: '{"xp":5}' } }, { merge: true }));
    await assertFails(getDoc(doc(google('bob'), 'saves', 'alice')));
    await assertFails(setDoc(doc(google('bob'), 'saves', 'alice'), save));
  });

  it('stores coins per device and shop purchases', async () => {
    await assertSucceeds(
      setDoc(doc(google('alice'), 'saves', 'alice'), { ...save, wallet: { phone: '{"coins":40,"spent":0}' }, owned: '["skin:gold"]' }),
    );
    await assertFails(setDoc(doc(google('alice'), 'saves', 'alice'), { ...save, wallet: 'lots' }));
    await assertFails(setDoc(doc(google('alice'), 'saves', 'alice'), { ...save, owned: 'x'.repeat(4001) }));
  });

  it('keeps guests and signed-out visitors out', async () => {
    await assertFails(setDoc(doc(db('guest'), 'saves', 'guest'), save));
    await assertFails(getDoc(doc(db(null), 'saves', 'alice')));
  });

  it('rejects unexpected fields and oversized sections', async () => {
    await assertFails(setDoc(doc(google('alice'), 'saves', 'alice'), { ...save, admin: true }));
    await assertFails(setDoc(doc(google('alice'), 'saves', 'alice'), { ...save, wordbook: 'x'.repeat(150001) }));
    await assertFails(setDoc(doc(google('alice'), 'saves', 'alice'), { ...save, v: 2 }));
  });

  it('lets the owner delete their save (part of Delete my profile)', async () => {
    await assertSucceeds(setDoc(doc(google('alice'), 'saves', 'alice'), save));
    await assertSucceeds(deleteDoc(doc(google('alice'), 'saves', 'alice')));
  });
});

describe('cloud save game sessions', () => {
  const google = (uid: string) =>
    env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['g-' + uid] } } }).firestore();
  it('accepts a sessions map and rejects an oversized one', async () => {
    const ok = { v: 1, devices: {}, sessions: { tower: '{"at":1,"data":{}}' } };
    await assertSucceeds(setDoc(doc(google('alice'), 'saves', 'alice'), ok));
    const many = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`s${i}`, '{}']));
    await assertFails(setDoc(doc(google('alice'), 'saves', 'alice'), { v: 1, devices: {}, sessions: many }));
  });
});

describe('word swap', () => {
  async function friends() {
    await makePlayer('ann', 'AAAAAA');
    await makePlayer('ben', 'BBBBBB');
    await makePlayer('cat', 'CCCCCC');
    await befriend('ann', 'ben');
  }
  const fresh = () => ({
    players: ['ann', 'ben'],
    createdAt: 1,
    updatedAt: 1,
    round: 1,
    scores: { ann: 0, ben: 0 },
    setter: 'ann',
    guesser: 'ben',
    state: 'picking',
    word: null,
    guesses: [],
    live: '',
    history: [],
    nudge: null,
  });

  it('starts only between friends, with the creator picking first', async () => {
    await friends();
    await assertFails(setDoc(doc(db('ann'), 'swaps', 'x'), { ...fresh(), players: ['ann', 'cat'], guesser: 'cat', scores: { ann: 0, cat: 0 } }));
    await assertFails(setDoc(doc(db('ann'), 'swaps', 'x'), { ...fresh(), setter: 'ben' }));
    await assertFails(setDoc(doc(db('ann'), 'swaps', 'x'), { ...fresh(), scores: { ann: 9, ben: 0 } }));
    await assertSucceeds(setDoc(doc(db('ann'), 'swaps', 'x'), fresh()));
    await assertFails(getDoc(doc(db('cat'), 'swaps', 'x')));
  });

  it('runs a round: picker sets the word, guesser guesses one at a time, then roles swap', async () => {
    await friends();
    await assertSucceeds(setDoc(doc(db('ann'), 'swaps', 'x'), fresh()));
    // Only the picker may pick.
    await assertFails(updateDoc(doc(db('ben'), 'swaps', 'x'), { state: 'guessing', word: 'crane', guesses: [], live: '' }));
    await assertSucceeds(updateDoc(doc(db('ann'), 'swaps', 'x'), { state: 'guessing', word: 'crane', guesses: [], live: '', updatedAt: 2 }));
    // Only the guesser may guess, one at a time, live typing allowed.
    await assertFails(updateDoc(doc(db('ann'), 'swaps', 'x'), { guesses: ['crane'] }));
    await assertSucceeds(updateDoc(doc(db('ben'), 'swaps', 'x'), { live: 'sla' }));
    await assertSucceeds(updateDoc(doc(db('ben'), 'swaps', 'x'), { guesses: ['slate'], live: '' }));
    await assertFails(updateDoc(doc(db('ben'), 'swaps', 'x'), { guesses: ['slate', 'pious', 'crane'] }));
    await assertFails(updateDoc(doc(db('ben'), 'swaps', 'x'), { guesses: ['other', 'crane'] }));
    await assertSucceeds(updateDoc(doc(db('ben'), 'swaps', 'x'), { guesses: ['slate', 'crane'] }));
    // Finishing: roles swap, round advances, at most 6 points.
    const end = { round: 2, setter: 'ben', guesser: 'ann', state: 'picking', word: null, guesses: [], live: '', history: [], nudge: null, updatedAt: 3 };
    await assertFails(updateDoc(doc(db('ben'), 'swaps', 'x'), { ...end, scores: { ann: 0, ben: 50 } }));
    await assertFails(updateDoc(doc(db('ann'), 'swaps', 'x'), { ...end, scores: { ann: 0, ben: 5 } }));
    await assertSucceeds(updateDoc(doc(db('ben'), 'swaps', 'x'), { ...end, scores: { ann: 0, ben: 5 } }));
  });

  it('lets either player nudge or end the match, but not outsiders', async () => {
    await friends();
    await assertSucceeds(setDoc(doc(db('ann'), 'swaps', 'x'), fresh()));
    await assertSucceeds(updateDoc(doc(db('ben'), 'swaps', 'x'), { nudge: { by: 'ben', at: 5 } }));
    await assertFails(updateDoc(doc(db('ben'), 'swaps', 'x'), { nudge: { by: 'ann', at: 5 } }));
    await assertFails(deleteDoc(doc(db('cat'), 'swaps', 'x')));
    await assertSucceeds(deleteDoc(doc(db('ben'), 'swaps', 'x')));
  });
});

describe('profile looks', () => {
  it('lets players show a frame and badge, with short ids only', async () => {
    await makePlayer('alice', 'AAAAAA');
    await assertSucceeds(updateDoc(doc(db('alice'), 'players', 'alice'), { frame: 'gold', badge: 'crown' }));
    await assertSucceeds(updateDoc(doc(db('alice'), 'players', 'alice'), { frame: null, badge: null }));
    await assertFails(updateDoc(doc(db('alice'), 'players', 'alice'), { frame: '<script>' }));
    await assertFails(updateDoc(doc(db('alice'), 'players', 'alice'), { badge: 'x'.repeat(13) }));
    await assertFails(updateDoc(doc(db('bob'), 'players', 'alice'), { frame: 'gold' }));
  });

  it('accepts a profile picture: an emoji or a small photo, nothing else', async () => {
    await makePlayer('alice', 'AAAAAA');
    const me = doc(db('alice'), 'players', 'alice');
    await assertSucceeds(updateDoc(me, { avatar: '🦊', tint: 'sky', title: 'wizard', banner: 'aurora' }));
    await assertSucceeds(updateDoc(me, { avatar: 'photo', photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' }));
    await assertFails(updateDoc(me, { photo: 'https://example.com/me.png' }));
    await assertFails(updateDoc(me, { photo: 'data:image/svg+xml;base64,PHN2Zz4=' }));
    await assertFails(updateDoc(me, { photo: `data:image/jpeg;base64,${'A'.repeat(16001)}` }));
    await assertFails(updateDoc(me, { avatar: 'x'.repeat(17) }));
  });
});

describe('gifts', () => {
  beforeEach(async () => {
    await makePlayer('alice', 'AAAAAA');
    await makePlayer('bob', 'BBBBBB');
    await makePlayer('carol', 'CCCCCC');
    await befriend('alice', 'bob');
  });
  const coins = (from: string, to: string, amount = 100) => ({ from, to, kind: 'coins', coins: amount, createdAt: 1, claimed: false });

  it('sends coins or an item to a friend only', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'gifts', 'g1'), coins('alice', 'bob')));
    await assertSucceeds(
      setDoc(doc(db('alice'), 'gifts', 'g2'), { from: 'alice', to: 'bob', kind: 'item', item: 'skin:galaxy', createdAt: 1, claimed: false }),
    );
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g3'), coins('alice', 'carol')));
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g4'), coins('bob', 'alice')));
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g5'), coins('alice', 'alice')));
  });

  it('only allows 10 to 5,000 whole coins and no extra fields', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'gifts', 'g0'), coins('alice', 'bob', 5000)));
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g1'), coins('alice', 'bob', 5001)));
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g6'), coins('alice', 'bob', 5)));
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g7'), coins('alice', 'bob', 12.5)));
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g2'), { ...coins('alice', 'bob'), claimed: true }));
    await assertFails(setDoc(doc(db('alice'), 'gifts', 'g3'), { ...coins('alice', 'bob'), item: 'skin:gold' }));
  });

  it('only the recipient opens it, once; outsiders can’t read it', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'gifts', 'g1'), coins('alice', 'bob')));
    await assertSucceeds(getDocs(query(collection(db('bob'), 'gifts'), where('to', '==', 'bob'), where('claimed', '==', false))));
    await assertFails(getDoc(doc(db('carol'), 'gifts', 'g1')));
    await assertFails(updateDoc(doc(db('alice'), 'gifts', 'g1'), { claimed: true }));
    await assertFails(updateDoc(doc(db('bob'), 'gifts', 'g1'), { coins: 500 }));
    await assertSucceeds(updateDoc(doc(db('bob'), 'gifts', 'g1'), { claimed: true }));
    await assertFails(updateDoc(doc(db('bob'), 'gifts', 'g1'), { claimed: true }));
    await assertFails(deleteDoc(doc(db('bob'), 'gifts', 'g1')));
  });
});
