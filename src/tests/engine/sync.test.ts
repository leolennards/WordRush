import { describe, expect, it } from 'vitest';
import {
  countersOf,
  emptyProgress,
  emptyStats,
  mergeDaily,
  mergeStats,
  mergeWordbook,
  reconcileProgress,
  recordResult,
  sharedOf,
  zeroCounters,
  createGame,
  decideSection,
  type Counters,
  type Progress,
} from '@/engine';

/** Simulates devices syncing through a shared cloud document. */
function cloud() {
  const devices: Record<string, Counters> = {};
  let shared: ReturnType<typeof sharedOf> | null = null;
  return {
    sync(deviceId: string, local: Progress, base: Counters) {
      const r = reconcileProgress({ local, base, devices, deviceId, remoteShared: shared });
      devices[deviceId] = r.own;
      shared = sharedOf(r.progress);
      return { local: r.progress, base: r.others };
    },
  };
}

const withXp = (p: Progress, xp: number, extra: Partial<Progress> = {}) => ({ ...p, xp: p.xp + xp, ...extra });

describe('cloud save merging', () => {
  it('adds up progress made on two devices before they ever synced', () => {
    const c = cloud();
    const laptop = c.sync('laptop', withXp(emptyProgress(), 640, { wins: 5, bestBlitz: 4 }), zeroCounters());
    expect(laptop.local.xp).toBe(640);
    const phone = c.sync('phone', withXp(emptyProgress(), 150, { wins: 1, bestBlitz: 7 }), zeroCounters());
    expect(phone.local).toMatchObject({ xp: 790, wins: 6, bestBlitz: 7 });
    const laptopAgain = c.sync('laptop', laptop.local, laptop.base);
    expect(laptopAgain.local).toMatchObject({ xp: 790, wins: 6, bestBlitz: 7 });
  });

  it('never counts the same XP twice across repeated syncs', () => {
    const c = cloud();
    let a = c.sync('a', withXp(emptyProgress(), 100), zeroCounters());
    let b = c.sync('b', emptyProgress(), zeroCounters());
    for (let i = 0; i < 5; i++) {
      a = c.sync('a', a.local, a.base);
      b = c.sync('b', b.local, b.base);
    }
    expect(a.local.xp).toBe(100);
    expect(b.local.xp).toBe(100);
    // Then each plays more.
    a = c.sync('a', withXp(a.local, 30), a.base);
    b = c.sync('b', withXp(b.local, 20), b.base);
    a = c.sync('a', a.local, a.base);
    expect(a.local.xp).toBe(150);
    expect(b.local.xp).toBe(150);
  });

  it('keeps every achievement, with the earliest time, and unions played games', () => {
    const c = cloud();
    c.sync('a', { ...emptyProgress(), unlocked: { ace: 50 }, applied: ['daily-3'] }, zeroCounters());
    const b = c.sync('b', { ...emptyProgress(), unlocked: { ace: 10, hard: 20 }, applied: ['practice-1'] }, zeroCounters());
    expect(b.local.unlocked).toEqual({ ace: 10, hard: 20 });
    expect(b.local.applied).toEqual(expect.arrayContaining(['daily-3', 'practice-1']));
  });

  it('keeps the daily statistics that have seen the most recent day', () => {
    const older = recordResult(emptyStats(6), { key: 3, won: true, guesses: 4 });
    const newer = recordResult(recordResult(emptyStats(6), { key: 3, won: true, guesses: 4 }), { key: 4, won: true, guesses: 3 });
    expect(mergeStats(older, newer)).toBe(newer);
    expect(mergeStats(newer, older)).toBe(newer);
    expect(mergeStats(newer, null)).toBe(newer);
  });

  it('continues today’s daily from the further-along device', () => {
    const base = createGame({ mode: 'daily', id: 'daily-4', answer: 'crane', dayIndex: 4 });
    const two = { ...base, guesses: ['slate', 'brine'], evaluations: [[], []] as never };
    const yesterday = createGame({ mode: 'daily', id: 'daily-3', answer: 'slate', dayIndex: 3 });
    expect(mergeDaily(base, two)).toBe(two);
    expect(mergeDaily(two, base)).toBe(two);
    expect(mergeDaily(yesterday, base)).toBe(base);
  });

  it('merges Word Books, keeping the newest play of each word', () => {
    const a = [{ word: 'crane', mode: 'daily', won: false, at: 1 }];
    const b = [
      { word: 'crane', mode: 'practice', won: true, at: 5 },
      { word: 'slate', mode: 'blitz', won: true, at: 3 },
    ];
    expect(mergeWordbook(a, b).map((e) => `${e.word}:${e.won}`)).toEqual(['slate:true', 'crane:true']);
  });

  it('starts a device fresh when it has nothing to subtract', () => {
    expect(countersOf(emptyProgress())).toEqual(zeroCounters());
  });
});

describe('game save sections', () => {
  const weigh = (s: { data: Record<string, string | null> }) => Number(s.data.floor ?? 0);
  const snap = (at: number, floor: string | null) => ({ at, data: { floor } });

  it('takes the newest change', () => {
    expect(decideSection(snap(10, '2'), snap(20, '1'), weigh)).toBe('pull');
    expect(decideSection(snap(30, '1'), snap(20, '5'), weigh)).toBe('push');
  });

  it('on the first sync, keeps whichever is further along', () => {
    expect(decideSection(snap(0, '1'), snap(0, '5'), weigh)).toBe('pull');
    expect(decideSection(snap(0, '5'), snap(0, '1'), weigh)).toBe('push');
  });

  it('pushes when the cloud has nothing, and does nothing when both match', () => {
    expect(decideSection(snap(5, '3'), null, weigh)).toBe('push');
    expect(decideSection(snap(0, null), null, weigh)).toBe('none');
    expect(decideSection(snap(5, '3'), snap(9, '3'), weigh)).toBe('none');
  });
});
