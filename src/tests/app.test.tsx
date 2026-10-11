import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/app/App';
import type { Services } from '@/app/services';
import { dictionary } from '@/data/words';
import { ANSWERS } from '@/data/words/answers';
import { dailyAnswer } from '@/engine';
import { createMemoryStore, type KeyValueStore } from '@/lib/storage/store';
import { DEFAULT_SETTINGS, KEYS } from '@/lib/storage/schemas';
import { HELP_EXAMPLES } from '@/components/dialogs/helpExamples';

const NOW = new Date('2026-10-11T12:00:00Z'); // challenge #11, dayIndex 10
const ANSWER = dailyAnswer(10, ANSWERS);
const WRONG = ANSWERS.filter((w) => w !== ANSWER && !w.includes(ANSWER[0]!)).slice(0, 6);

function seededStore(settings: Partial<typeof DEFAULT_SETTINGS> = {}): KeyValueStore {
  return createMemoryStore({
    [KEYS.settings]: JSON.stringify({
      v: 1,
      data: { ...DEFAULT_SETTINGS, seenHelp: true, reduceMotion: true, ...settings },
    }),
  });
}

function setup(store: KeyValueStore = seededStore()) {
  const services: Services = { store, dictionary, now: () => NOW, random: () => 0.5 };
  const user = userEvent.setup();
  const utils = render(<App services={services} />);
  return { user, store, services, ...utils };
}

const rows = () => screen.getAllByRole('row');
const rowText = (i: number) =>
  within(rows()[i]!)
    .getAllByRole('gridcell')
    .map((c) => c.textContent)
    .join('');

async function guess(user: ReturnType<typeof userEvent.setup>, word: string) {
  await user.keyboard(word);
  await user.keyboard('{Enter}');
}

describe('WordRush app', () => {
  it('shows the Daily Challenge heading and challenge number', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Daily Challenge #11' })).toBeInTheDocument();
  });

  it('accepts physical keyboard input, Backspace and Enter', async () => {
    const { user } = setup();
    await user.keyboard('abcdx');
    expect(rowText(0)).toBe('abcdx');
    await user.keyboard('q'); // row is full: ignored
    expect(rowText(0)).toBe('abcdx');
    await user.keyboard('{Backspace}{Backspace}');
    expect(rowText(0)).toBe('abc');
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Not enough letters')).toBeInTheDocument();
  });

  it('accepts on-screen keyboard input', async () => {
    const { user } = setup();
    const kb = screen.getByRole('group', { name: 'Keyboard' });
    for (const l of WRONG[0]!) await user.click(within(kb).getByRole('button', { name: l.toUpperCase() }));
    expect(rowText(0)).toBe(WRONG[0]);
    await user.click(within(kb).getByRole('button', { name: 'Delete letter' }));
    expect(rowText(0)).toBe(WRONG[0]!.slice(0, 4));
    await user.click(within(kb).getByRole('button', { name: WRONG[0]![4]!.toUpperCase() }));
    await user.click(within(kb).getByRole('button', { name: 'Enter' }));
    expect(screen.getByText(/Guess 2 of 6/)).toBeInTheDocument();
  });

  it('rejects words that are not in the list without using an attempt', async () => {
    const { user } = setup();
    await guess(user, 'qxzvj');
    expect(await screen.findByText('Not in word list')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(rowText(0)).toBe('qxzvj');
  });

  it('plays a full winning game and shows results with statistics', async () => {
    const { user, store } = setup();
    await guess(user, WRONG[0]!);
    await guess(user, ANSWER);
    const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(within(dialog).getByText(/You solved it in/)).toHaveTextContent('2 guesses');
    expect(within(dialog).getByRole('button', { name: /Share result/ })).toBeInTheDocument();
    const stats = JSON.parse(store.get(KEYS.dailyStats)!).data;
    expect(stats).toMatchObject({ played: 1, wins: 1, currentStreak: 1, distribution: [0, 1, 0, 0, 0, 0] });
    // No further input once the game is over.
    await user.keyboard('{Escape}');
    await guess(user, WRONG[1]!);
    expect(rowText(2)).toBe('');
  });

  it('reveals the answer after six wrong guesses', async () => {
    const { user, store } = setup();
    for (const w of WRONG) await guess(user, w);
    const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(within(dialog).getByLabelText(`The answer was ${ANSWER.toUpperCase()}`)).toBeInTheDocument();
    const stats = JSON.parse(store.get(KEYS.dailyStats)!).data;
    expect(stats).toMatchObject({ played: 1, wins: 0, currentStreak: 0 });
  });

  it('restores an unfinished daily game after a refresh', async () => {
    const store = seededStore();
    const first = setup(store);
    await guess(first.user, WRONG[0]!);
    first.unmount();
    setup(store);
    expect(rowText(0)).toBe(WRONG[0]);
    expect(screen.getByText(/Guess 2 of 6/)).toBeInTheDocument();
  });

  it('restores a completed daily game without counting it twice or allowing a replay', async () => {
    const store = seededStore();
    const first = setup(store);
    await guess(first.user, ANSWER);
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    first.unmount();
    const second = setup(store);
    expect(screen.getByText('Solved in 1')).toBeInTheDocument();
    await guess(second.user, WRONG[0]!);
    expect(rowText(1)).toBe('');
    expect(JSON.parse(store.get(KEYS.dailyStats)!).data.played).toBe(1);
  });

  it('keeps Practice separate from the Daily Challenge', async () => {
    const { user, store } = setup();
    await guess(user, WRONG[0]!);
    await user.click(screen.getAllByRole('radio', { name: 'Practice' })[0]!);
    expect(screen.getByRole('heading', { name: 'Practice' })).toBeInTheDocument();
    expect(rowText(0)).toBe('');
    await guess(user, WRONG[1]!);
    await user.click(screen.getAllByRole('radio', { name: 'Daily' })[0]!);
    expect(rowText(0)).toBe(WRONG[0]);
    expect(rowText(1)).toBe('');
    const daily = JSON.parse(store.get(KEYS.daily)!).data.game;
    const practice = JSON.parse(store.get(KEYS.practice)!).data.game;
    expect(daily.guesses).toEqual([WRONG[0]]);
    expect(practice.guesses).toEqual([WRONG[1]]);
    expect(practice.answer).not.toBe(ANSWER);
  });

  it('shares a spoiler-free result via the clipboard', async () => {
    // userEvent.setup() installs a clipboard stub on navigator; we read it back.
    const { user } = setup();
    await guess(user, WRONG[0]!);
    await guess(user, ANSWER);
    const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
    await user.click(within(dialog).getByRole('button', { name: /Share result/ }));
    expect((await screen.findAllByText('Result copied to clipboard')).length).toBeGreaterThan(0);
    const text = await navigator.clipboard.readText();
    expect(text.startsWith('WordRush #11 2/6')).toBe(true);
    expect(text.toLowerCase()).not.toContain(ANSWER);
    expect(text).toContain('🟩🟩🟩🟩🟩');
    expect(text.split('\n').filter((l) => /^[🟩🟨⬛⬜]+$/u.test(l))).toHaveLength(2);
  });

  it('persists the theme choice without touching the game', async () => {
    const { user, store } = setup(seededStore({ theme: 'light' }));
    await guess(user, WRONG[0]!);
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(JSON.parse(store.get(KEYS.settings)!).data.theme).toBe('dark');
    expect(rowText(0)).toBe(WRONG[0]);
  });

  it('shows the rules on the first visit only', async () => {
    const store = seededStore({ seenHelp: false });
    const { user, unmount } = setup(store);
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    unmount();
    setup(store);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses help examples that are never possible answers', () => {
    for (const w of HELP_EXAMPLES) {
      expect(ANSWERS).not.toContain(w);
      expect(dictionary.isAccepted(w)).toBe(true);
    }
  });

  it('enforces hard mode when enabled', async () => {
    const { user } = setup(seededStore({ hardMode: true }));
    // Find a guess sharing a correct letter with the answer, then drop it.
    const first = ANSWERS.find((w) => w !== ANSWER && w[0] === ANSWER[0])!;
    await guess(user, first);
    const breaker = ANSWERS.find((w) => w[0] !== ANSWER[0])!;
    await guess(user, breaker);
    expect(await screen.findByText(`1st letter must be ${ANSWER[0]!.toUpperCase()}`)).toBeInTheDocument();
  });

  it('still works when storage is unavailable', async () => {
    const broken: KeyValueStore = {
      persistent: false,
      get: () => {
        throw new Error('blocked');
      },
      set: () => {
        throw new Error('blocked');
      },
      remove: () => {},
    };
    const safe: KeyValueStore = {
      persistent: false,
      get: (k) => {
        try {
          return broken.get(k);
        } catch {
          return null;
        }
      },
      set: () => {},
      remove: () => {},
    };
    const { user } = setup(safe);
    await waitFor(() => expect(rows()).toHaveLength(6));
    // No stored settings → first-visit help opens; close it, then play.
    await user.keyboard('{Escape}');
    await guess(user, WRONG[0]!);
    expect(rowText(0)).toBe(WRONG[0]);
  });
});

describe('day rollover', () => {
  it('moves to the next challenge at UTC midnight when today is finished', async () => {
    let now = new Date('2026-10-11T23:59:59.500Z');
    const store = seededStore();
    const services: Services = { store, dictionary, now: () => now, random: () => 0.5 };
    const user = userEvent.setup();
    const { unmount } = render(<App services={services} />);
    await guess(user, ANSWER);
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    unmount();
    now = new Date('2026-10-12T00:00:01Z');
    render(<App services={services} />);
    expect(screen.getByRole('heading', { name: 'Daily Challenge #12' })).toBeInTheDocument();
    expect(rowText(0)).toBe('');
    expect(JSON.parse(store.get(KEYS.dailyStats)!).data.lastRecordedKey).toBe(10);
  });
});
