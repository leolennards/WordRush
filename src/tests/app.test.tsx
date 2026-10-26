import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/app/App';
import type { Services } from '@/app/services';
import { dictionary } from '@/data/words';
import { ANSWERS } from '@/data/words/answers';
import {
  BLITZ,
  LADDER,
  LadderGraph,
  dailyAnswer,
  emptyProgress,
  evaluateGuess,
  pickPracticeAnswer,
  rushSeed,
  seededRandom,
  xpForLevel,
} from '@/engine';
import { createMemoryStore, type KeyValueStore } from '@/lib/storage/store';
import { DEFAULT_SETTINGS, KEYS } from '@/lib/storage/schemas';
import { HELP_EXAMPLES } from '@/components/dialogs/helpExamples';

const NOW = new Date('2026-10-11T12:00:00Z'); // launch day: challenge #1, dayIndex 0
const ANSWER = dailyAnswer(0, ANSWERS);
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

// Most tests start on the Daily game screen; the home dashboard has its own tests.
beforeEach(() => window.history.replaceState(null, '', '/#daily'));

describe('Wordskiis app', () => {
  it('shows the Daily Challenge heading and challenge number', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Daily Challenge #1' })).toBeInTheDocument();
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
    expect((await screen.findAllByText('Not enough letters')).length).toBeGreaterThan(0);
  });

  it('accepts on-screen keyboard input', async () => {
    const { user } = setup();
    const kb = screen.getByRole('group', { name: 'Keyboard' });
    for (const l of WRONG[0]!) await user.click(within(kb).getByRole('button', { name: l.toUpperCase() }));
    expect(rowText(0)).toBe(WRONG[0]);
    await user.click(within(kb).getByRole('button', { name: 'Delete letter' }));
    expect(rowText(0)).toBe(WRONG[0]!.slice(0, 4));
    await user.click(within(kb).getByRole('button', { name: WRONG[0]![4]!.toUpperCase() }));
    await user.click(within(kb).getByRole('button', { name: 'Submit' }));
    expect(rows()[0]).toHaveAttribute('aria-label', expect.stringMatching(/correct|in the word|not in the word/));
  });

  it('only offers Submit for a full, real word', async () => {
    const { user } = setup();
    const kb = screen.getByRole('group', { name: 'Keyboard' });
    expect(within(kb).getByRole('button', { name: 'Submit (0 of 5 letters)' })).toBeDisabled();
    await user.keyboard('qxz');
    expect(within(kb).getByRole('button', { name: 'Submit (3 of 5 letters)' })).toBeDisabled();
    await user.keyboard('vj');
    expect(within(kb).getByRole('button', { name: 'Not a real word' })).toBeDisabled();
    expect(rows()[0]).toHaveAttribute('data-invalid', 'true');
    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}');
    await user.keyboard(WRONG[0]!);
    const submit = within(kb).getByRole('button', { name: 'Submit' });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(rows()[0]).toHaveAttribute('aria-label', expect.stringMatching(/correct|in the word|not in the word/));
  });

  it('rejects words that are not in the list without using an attempt', async () => {
    const { user } = setup();
    await guess(user, 'qxzvj');
    expect((await screen.findAllByText('Not in word list')).length).toBeGreaterThan(0);
    expect(rows()[0]).toHaveAttribute('aria-label', expect.stringContaining('(typing)'));
    expect(rowText(0)).toBe('qxzvj');
  });

  it('plays a full winning game and shows results with statistics', async () => {
    const { user, store } = setup();
    await guess(user, WRONG[0]!);
    await guess(user, ANSWER);
    const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(within(dialog).getByText(/You solved it in/)).toHaveTextContent('2 of 6 guesses');
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
    expect(rowText(1)).toBe('');
  });

  it('restores a completed daily game without counting it twice or allowing a replay', async () => {
    const store = seededStore();
    const first = setup(store);
    await guess(first.user, ANSWER);
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    first.unmount();
    const second = setup(store);
    expect(screen.getByText('Solved in 1!')).toBeInTheDocument();
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
    expect(text.startsWith('Wordskiis #1 2/6')).toBe(true);
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
    expect((await screen.findAllByText(`1st letter must be ${ANSWER[0]!.toUpperCase()}`)).length).toBeGreaterThan(0);
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
    expect(screen.getByRole('heading', { name: 'Daily Challenge #2' })).toBeInTheDocument();
    expect(rowText(0)).toBe('');
    expect(JSON.parse(store.get(KEYS.dailyStats)!).data.lastRecordedKey).toBe(0);
  });
});

describe('completion with a live clock', () => {
  // Regression: the countdown re-renders every second, which used to restart
  // the "show results" timer forever, so results never appeared.
  it('opens the results after a win while the countdown is ticking, with animations on', async () => {
    const start = Date.now();
    const now = () => new Date(NOW.getTime() + (Date.now() - start));
    const store = seededStore({ reduceMotion: false });
    const services: Services = { store, dictionary, now, random: () => 0.5 };
    const user = userEvent.setup();
    render(<App services={services} />);
    await guess(user, ANSWER);
    const dialog = await screen.findByRole('dialog', {}, { timeout: 6000 });
    expect(within(dialog).getByText(/You solved it in/)).toBeInTheDocument();
    expect(screen.getAllByText('Solved!').length).toBeLessThanOrEqual(2); // one toast (+ live region)
  }, 10000);
});

describe('home dashboard and end of game', () => {
  it('lands on the home dashboard and starts the daily challenge from it', async () => {
    window.history.replaceState(null, '', '/');
    const { user } = setup();
    expect(screen.getByRole('heading', { name: /Daily Challenge\s*#1/ })).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Play — Daily Challenge #1$/ }));
    expect(screen.getByRole('heading', { name: 'Daily Challenge #1' })).toBeInTheDocument();
    await guess(user, WRONG[0]!);
    expect(rowText(0)).toBe(WRONG[0]);
  });

  it('ignores typing while on the home dashboard', async () => {
    window.history.replaceState(null, '', '/');
    const { user, store } = setup();
    await guess(user, WRONG[0]!);
    expect(store.get(KEYS.daily) && JSON.parse(store.get(KEYS.daily)!).data.game.guesses).toEqual([]);
  });

  it('replaces the keyboard with next steps when the game ends, and Home goes back to the dashboard', async () => {
    const { user } = setup();
    await guess(user, ANSWER);
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    await user.keyboard('{Escape}');
    const panel = screen.getByRole('region', { name: 'Game over' });
    expect(within(panel).getByText('Solved in 1!')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Keyboard' })).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: /Home/ }));
    expect(screen.getByText('You found it in 1 guess.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^View results — Daily Challenge/ })).toBeInTheDocument();
  });

  it('offers a new word after a practice game ends', async () => {
    window.history.replaceState(null, '', '/#practice');
    const { user, store } = setup();
    const answer = JSON.parse(store.get(KEYS.practice)!).data.game.answer as string;
    await guess(user, answer);
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    await user.keyboard('{Escape}');
    await user.click(within(screen.getByRole('region', { name: 'Game over' })).getByRole('button', { name: /New word/ }));
    expect(screen.getByRole('group', { name: 'Keyboard' })).toBeInTheDocument();
    expect(rowText(0)).toBe('');
  });
});

describe('levels, achievements and hints', () => {
  it('awards XP and unlocks achievements after a win, and lists them', async () => {
    const { user, store } = setup();
    await guess(user, ANSWER);
    const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(within(dialog).getByText(/^\+\d+ XP$/)).toBeInTheDocument();
    // Reward cards, not emoji text.
    expect((await screen.findAllByText('Hole in one', {}, { timeout: 6000 })).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Achievement unlocked').length).toBeGreaterThan(0);
    expect(screen.getByText('Level up')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[🏆⭐✅🎉]/u);
    const progress = JSON.parse(store.get(KEYS.progress)!).data;
    expect(progress.unlocked).toHaveProperty('ace');
    expect(progress.xp).toBeGreaterThan(0);

    await user.keyboard('{Escape}');
    await user.click(within(screen.getByRole('region', { name: 'Game over' })).getByRole('button', { name: /Home/ }));
    await user.click(screen.getByRole('button', { name: /^Achievements — \d+ of \d+ unlocked$/ }));
    const list = await screen.findByRole('dialog', { name: 'Achievements' });
    expect(within(list).getByText('Hole in one')).toBeInTheDocument();
    expect(within(list).getAllByText('(unlocked)').length).toBeGreaterThanOrEqual(2);
  });

  it('gives Practice hints that show on the board and in the result', async () => {
    window.history.replaceState(null, '', '/#practice');
    const { user, store } = setup();
    const answer = JSON.parse(store.get(KEYS.practice)!).data.game.answer as string;
    await user.click(screen.getByRole('button', { name: 'Hint, 2 left' }));
    expect((await screen.findAllByText(`Hint: letter 1 is ${answer[0]!.toUpperCase()}`)).length).toBeGreaterThan(0);
    expect(within(rows()[0]!).getAllByRole('gridcell')[0]).toHaveAttribute('data-state', 'hint');
    await user.click(screen.getByRole('button', { name: 'Hint, 1 left' }));
    expect(screen.getByRole('button', { name: 'No hints left' })).toBeDisabled();
    // Hints survive a reload.
    expect(JSON.parse(store.get(KEYS.practice)!).data.game.hints).toEqual([0, 1]);
    await guess(user, answer);
    const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(within(dialog).getByText('2 hints')).toBeInTheDocument();
  });

  it('has no hints in the Daily Challenge', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Hint/ })).not.toBeInTheDocument();
  });
});

describe('blitz', () => {
  it('plays a timed run: solves add time, and the run ends when the clock runs out', async () => {
    window.history.replaceState(null, '', '/#blitz');
    let t = NOW.getTime();
    const store = seededStore();
    const services: Services = { store, dictionary, now: () => new Date(t), random: () => 0.5 };
    const user = userEvent.setup();
    render(<App services={services} />);

    expect(await screen.findByRole('heading', { name: 'Blitz' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('1:30');
    await user.click(screen.getByRole('button', { name: /Start/ }));

    const first = pickPracticeAnswer(ANSWERS, [ANSWER], () => 0.5);
    await guess(user, first);
    expect(await screen.findByLabelText('1 words solved')).toBeInTheDocument();
    // The next word loads after the reveal.
    await waitFor(() => expect(rowText(0)).toBe(''), { timeout: 3000 });

    t += BLITZ.startMs + BLITZ.bonusMs + 1000;
    const result = await screen.findByRole('region', { name: 'Blitz result' }, { timeout: 3000 });
    expect(within(result).getByText(/1 word solved/)).toBeInTheDocument();
    expect(within(result).getByText(first)).toBeInTheDocument();
    expect(JSON.parse(store.get(KEYS.progress)!).data.bestBlitz).toBe(1);
    expect(screen.queryByRole('group', { name: 'Keyboard' })).not.toBeInTheDocument();
  });

  it('is reachable from the home dashboard', async () => {
    window.history.replaceState(null, '', '/');
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Play Blitz' }));
    expect(await screen.findByRole('heading', { name: 'Blitz' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#blitz');
  });
});

describe('duo and survival', () => {
  const pick = (avoid: string[]) => pickPracticeAnswer(ANSWERS, avoid, () => 0.5);

  it('plays Duo: one guess counts for both words, and solving both wins', async () => {
    window.history.replaceState(null, '', '/#duo');
    const { user, store } = setup();
    const first = pick([ANSWER]);
    const second = pick([ANSWER, first]);
    expect(await screen.findByRole('heading', { name: 'Duo' })).toBeInTheDocument();
    expect(screen.getByText('7 guesses left')).toBeInTheDocument();
    await guess(user, first);
    const word1 = screen.getByRole('region', { name: 'Word 1' });
    expect(await within(word1).findByText('Solved')).toBeInTheDocument();
    expect(screen.getByText('6 guesses left')).toBeInTheDocument();
    await guess(user, second);
    const result = await screen.findByRole('region', { name: 'Duo result' }, { timeout: 3000 });
    expect(within(result).getByText(/All solved in 2/)).toBeInTheDocument();
    expect(JSON.parse(store.get(KEYS.progress)!).data.duoWins).toBe(1);
    await user.click(within(result).getByRole('button', { name: /New Duo/ }));
    expect(screen.getByText('7 guesses left')).toBeInTheDocument();
  });

  it('plays Survival: lives drop on misses and the run ends at zero', async () => {
    window.history.replaceState(null, '', '/#survival');
    const { user, store } = setup();
    expect(await screen.findByRole('img', { name: '3 lives left' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start/ }));

    const first = pick([ANSWER]);
    await guess(user, first);
    await waitFor(() => expect(screen.getByText(/Score 1/)).toBeInTheDocument());

    const used = [first];
    for (let miss = 0; miss < 3; miss++) {
      await waitFor(() => expect(rowText(0)).toBe(''), { timeout: 3000 });
      const answer = pick([...used, ANSWER]);
      used.push(answer);
      const wrong = ANSWERS.filter((w) => w !== answer).slice(0, 6);
      for (const w of wrong) await guess(user, w);
    }
    const result = await screen.findByRole('region', { name: 'Survival result' }, { timeout: 3000 });
    expect(within(result).getByText(/1 word survived/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '0 lives left' })).toBeInTheDocument();
    expect(JSON.parse(store.get(KEYS.progress)!).data.bestSurvival).toBe(1);
  }, 20000);

  it('keeps a Survival run after a refresh', async () => {
    window.history.replaceState(null, '', '/#survival');
    const store = seededStore();
    const a = setup(store);
    await a.user.click(await screen.findByRole('button', { name: /Start/ }));
    await guess(a.user, WRONG[0]!);
    a.unmount();
    setup(store);
    await screen.findByRole('heading', { name: 'Survival' });
    expect(screen.queryByRole('button', { name: /Start/ })).not.toBeInTheDocument();
    expect(rowText(0)).toBe(WRONG[0]);
  });

  it('shows the daily quests on the home dashboard', () => {
    window.history.replaceState(null, '', '/');
    setup();
    const quests = screen.getByRole('region', { name: 'Daily quests' });
    expect(within(quests).getAllByRole('listitem')).toHaveLength(3);
    expect(within(quests).getByText('0/3 done')).toBeInTheDocument();
  });
});

describe('quad, daily rush, mods and words', () => {
  const pick = (avoid: string[], random: () => number = () => 0.5) => pickPracticeAnswer(ANSWERS, avoid, random);

  it('plays Quad: four boards, nine guesses', async () => {
    window.history.replaceState(null, '', '/#quad');
    const { user } = setup();
    expect(await screen.findByRole('heading', { name: 'Quad' })).toBeInTheDocument();
    expect(screen.getAllByRole('grid')).toHaveLength(4);
    expect(screen.getByText('9 guesses left')).toBeInTheDocument();
    const answers: string[] = [];
    for (let i = 0; i < 4; i++) answers.push(pick([ANSWER, ...answers]));
    for (const a of answers) await guess(user, a);
    const result = await screen.findByRole('region', { name: 'Quad result' }, { timeout: 3000 });
    expect(within(result).getByText(/All solved in 4/)).toBeInTheDocument();
  });

  it('gives one Daily Rush per day, with the same words for everyone', async () => {
    window.history.replaceState(null, '', '/#rush');
    let t = NOW.getTime();
    const store = seededStore();
    const services: Services = { store, dictionary, now: () => new Date(t), random: Math.random };
    const user = userEvent.setup();
    const view = render(<App services={services} />);
    expect(await screen.findByRole('heading', { name: 'Daily Rush #1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start/ }));
    // The first word comes from the day's seed, not from the device's randomness.
    const first = pick([ANSWER], seededRandom(rushSeed(0)));
    await guess(user, first);
    expect(await screen.findByLabelText('1 words solved')).toBeInTheDocument();
    t += 10 * 60_000;
    await screen.findByRole('region', { name: 'Blitz result' }, { timeout: 3000 });
    view.unmount();

    render(<App services={services} />);
    expect(screen.queryByRole('button', { name: /Start/ })).not.toBeInTheDocument();
    expect(screen.getByText('You’ve played today’s Rush')).toBeInTheDocument();
    expect(screen.getByText(/1 word solved/)).toBeInTheDocument();
  });

  it('hides earlier guesses with Fog and keyboard colours with Blind keys', async () => {
    window.history.replaceState(null, '', '/#practice');
    const { user, store } = setup(seededStore({ modFog: true, modBlind: true }));
    expect(screen.getByRole('button', { name: 'Mods, 2 on' })).toBeInTheDocument();
    const answer = JSON.parse(store.get(KEYS.practice)!).data.game.answer as string;
    const wrong = ANSWERS.filter((w) => w !== answer && ![...w].some((l) => answer.includes(l))).slice(0, 2);
    await guess(user, wrong[0]!);
    await guess(user, wrong[1]!);
    expect(rows()[0]).toHaveAttribute('aria-label', 'Row 1: hidden by fog');
    expect(rows()[1]).toHaveAttribute('aria-label', expect.stringContaining('not in the word'));
    const kb = screen.getByRole('group', { name: 'Keyboard' });
    expect(within(kb).getByRole('button', { name: wrong[0]![0]!.toUpperCase() })).not.toHaveAttribute('data-state');
    // The fog lifts and the XP bonus applies once the game ends.
    await guess(user, answer);
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(rows()[0]).toHaveAttribute('aria-label', expect.stringContaining('not in the word'));
  });

  it('shows a word’s full meaning and collects it in the Word Book', async () => {
    window.history.replaceState(null, '', '/#daily');
    const define = async (word: string) => ({
      word,
      partOfSpeech: 'noun',
      definition: 'A test meaning.',
      phonetic: '/test/',
      senses: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A test meaning.', example: 'an example' }], synonyms: ['trial'] }],
    });
    const store = seededStore();
    const services: Services = { store, dictionary, now: () => NOW, random: () => 0.5, define };
    const user = userEvent.setup();
    render(<App services={services} />);
    await guess(user, ANSWER);
    const result = await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(await within(result).findByText('A test meaning.')).toBeInTheDocument();
    await user.click(within(result).getByRole('button', { name: /Full meaning/ }));
    const sheet = await screen.findByRole('dialog', { name: `Meaning of ${ANSWER.toUpperCase()}` });
    expect(within(sheet).getByText('/test/')).toBeInTheDocument();
    expect(within(sheet).getByText('trial')).toBeInTheDocument();
    // Escape closes only the top sheet.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Meaning of/ })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(JSON.parse(store.get(KEYS.wordbook)!).data).toEqual([expect.objectContaining({ word: ANSWER, mode: 'daily', won: true })]);
  });

  it('lists collected words in the Word Book', async () => {
    window.history.replaceState(null, '', '/');
    const store = seededStore();
    store.set(KEYS.wordbook, JSON.stringify({ v: 1, data: [{ word: 'crane', mode: 'practice', won: true, at: 1 }] }));
    const { user } = setup(store);
    await user.click(screen.getByRole('button', { name: 'Word Book' }));
    const book = await screen.findByRole('dialog', { name: 'Word Book' });
    expect(within(book).getByText('1 word collected · 1 solved')).toBeInTheDocument();
    await user.click(within(book).getByRole('button', { name: /CRANE, solved in Practice/ }));
    expect(await screen.findByRole('dialog', { name: 'Meaning of CRANE' })).toBeInTheDocument();
  });
});

describe('ranks, themes and word ladder', () => {
  it('plays a Word Ladder to the target with 3 stars', async () => {
    window.history.replaceState(null, '', '/#ladder');
    const { user, store } = setup();
    expect(await screen.findByRole('heading', { name: 'Word Ladder' })).toBeInTheDocument();
    const game = JSON.parse(store.get(KEYS.ladder)!).data.game as { start: string; target: string; par: number };
    const path = new LadderGraph(ANSWERS).path(game.start, game.target)!;
    expect(screen.getByText(`${game.par + LADDER.slack} moves left`)).toBeInTheDocument();
    // A move that changes two letters is refused.
    const bad = [...game.start].map((l, i) => (i < 2 ? (l === 'a' ? 'b' : 'a') : l)).join('');
    await guess(user, bad);
    expect(screen.getAllByText(/Change exactly one letter|Not in word list/).length).toBeGreaterThan(0);
    for (let i = 0; i < 5; i++) await user.keyboard('{Backspace}');
    for (const w of path.slice(1)) await guess(user, w);
    const result = await screen.findByRole('region', { name: 'Ladder result' }, { timeout: 4000 });
    expect(within(result).getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument();
    expect(JSON.parse(store.get(KEYS.progress)!).data.unlocked).toHaveProperty('ladder-perfect');
  });

  it('celebrates a new rank full-screen and offers its tile theme', async () => {
    const store = seededStore();
    store.set(KEYS.progress, JSON.stringify({ v: 1, data: { ...emptyProgress(), xp: xpForLevel(5) - 5 } }));
    const { user } = setup(store);
    await guess(user, ANSWER);
    const moment = await screen.findByRole('dialog', { name: 'New rank: Apprentice' }, { timeout: 5000 });
    expect(within(moment).getByText('Ocean tiles')).toBeInTheDocument();
    await user.click(within(moment).getByRole('button', { name: 'Use it' }));
    expect(document.documentElement.dataset.skin).toBe('ocean');
    expect(JSON.parse(store.get(KEYS.settings)!).data.skin).toBe('ocean');
  });

  it('lists ranks and only lets you use themes you have unlocked', async () => {
    window.history.replaceState(null, '', '/');
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Level and ranks' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ranks and themes' });
    expect(within(dialog).getByText('Wordskiis Legend')).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Classic' })).toHaveAttribute('aria-checked', 'true');
    // Only what you can use is listed; the rest is waiting in the shop or at higher levels.
    expect(within(dialog).queryByRole('radio', { name: 'Prism' })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/more in the shop · next unlock at level 5/)).toBeInTheDocument();
  });
});

describe('bot duel, tower, reverse and fibber', () => {
  it('races a bot: count down, then solving first wins', async () => {
    window.history.replaceState(null, '', '/#duel');
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: /^Duel Pip/ }));
    expect(await screen.findByRole('group', { name: "Pip's progress" })).toBeInTheDocument();
    // Typing is ignored during the countdown.
    await user.keyboard('abc');
    expect(rowText(0)).toBe('');
    await waitFor(
      () =>
        expect(within(screen.getByRole('group', { name: 'Keyboard' })).getByRole('button', { name: 'A' })).not.toHaveAttribute(
          'aria-disabled',
        ),
      { timeout: 5000 },
    );
    const answer = pickPracticeAnswer(ANSWERS, [ANSWER], () => 0.5);
    await guess(user, answer);
    const result = await screen.findByRole('region', { name: 'Duel result' }, { timeout: 4000 });
    expect(within(result).getByText('You beat Pip!')).toBeInTheDocument();
  }, 15000);

  it('climbs the Tower: clear a floor, pick a perk, face the next floor', async () => {
    window.history.replaceState(null, '', '/#tower');
    const { user, store } = setup();
    await user.click(await screen.findByRole('button', { name: /Begin the climb/ }));
    await user.click(screen.getByRole('button', { name: 'Enter floor 1' }));
    const answer = JSON.parse(store.get(KEYS.tower)!).data.game.answer as string;
    await guess(user, answer);
    expect((await screen.findAllByText('Choose a perk', {}, { timeout: 4000 })).length).toBeGreaterThan(0);
    const perks = screen.getAllByRole('button').filter((b) => /Heal|Lantern|Shield|Clear skies/.test(b.textContent ?? ''));
    expect(perks).toHaveLength(2);
    await user.click(perks[0]!);
    expect(screen.getByRole('button', { name: 'Enter floor 2' })).toBeInTheDocument();
    expect(JSON.parse(store.get(KEYS.tower)!).data.run.floor).toBe(2);
  });

  it('plays Reverse: a word that makes the pattern scores; a wrong one costs a life', async () => {
    window.history.replaceState(null, '', '/#reverse');
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: /Start/ }));
    const answer = screen.getByRole('group', { name: /^The answer is / }).getAttribute('aria-label')!.slice(-5).toLowerCase();
    const pattern = screen.getByRole('group', { name: /^Target pattern/ }).getAttribute('aria-label')!.match(/pattern: ([a-z, ]+)\./)![1]!;
    const fits = ANSWERS.find((w) => w !== answer && evaluateGuess(w, answer).join(', ') === pattern)!;
    const wrong = ANSWERS.find((w) => w !== answer && evaluateGuess(w, answer).join(', ') !== pattern)!;
    await guess(user, wrong);
    expect(screen.getByRole('img', { name: '2 lives left' })).toBeInTheDocument();
    expect(screen.getByText('Your tries made')).toBeInTheDocument();
    await guess(user, fits);
    expect((await screen.findAllByText(/Round 2 of 5 · 1 solved/, {}, { timeout: 3000 })).length).toBeGreaterThan(0);
  });

  it('Fibber shows one lie per row and unmasks the lies at the end', async () => {
    window.history.replaceState(null, '', '/#practice');
    const { user, store } = setup(seededStore({ modLiar: true }));
    const game = JSON.parse(store.get(KEYS.practice)!).data.game as { answer: string; id: string };
    const wrong = ANSWERS.filter((w) => w !== game.answer).slice(0, 2);
    await guess(user, wrong[0]!);
    const truth = evaluateGuess(wrong[0]!, game.answer);
    const shown = within(rows()[0]!)
      .getAllByRole('gridcell')
      .map((c) => c.getAttribute('data-state'));
    expect(shown.filter((s, i) => s !== truth[i])).toHaveLength(1);
    await guess(user, game.answer);
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(within(rows()[0]!).getAllByRole('gridcell').map((c) => c.getAttribute('data-state'))).toEqual(truth);
    expect(within(rows()[0]!).getByLabelText(/this tile lied/)).toBeInTheDocument();
  });
});

describe('free themes and records', () => {
  it('offers free tile themes from level 1 in Settings, with a preview', async () => {
    window.history.replaceState(null, '', '/');
    const { user, store } = setup();
    await user.click(screen.getAllByRole('button', { name: 'Settings' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: /Change/ }));
    expect(within(dialog).getByRole('img', { name: 'Preview of your current look' })).toBeInTheDocument();
    for (const name of ['Mint', 'Candy', 'Lavender']) {
      expect(within(dialog).getByRole('radio', { name })).toBeEnabled();
    }
    // Ocean comes with level 5, so it isn't listed yet.
    expect(within(dialog).queryByRole('radio', { name: 'Ocean' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Candy' }));
    expect(document.documentElement.dataset.skin).toBe('candy');
    expect(JSON.parse(store.get(KEYS.settings)!).data.skin).toBe('candy');
  });

  it('shows personal records across modes', async () => {
    window.history.replaceState(null, '', '/');
    const store = seededStore();
    store.set(KEYS.progress, JSON.stringify({ v: 1, data: { ...emptyProgress(), bestBlitz: 7, bestTower: 4, duelWins: 2 } }));
    const { user } = setup(store);
    await user.click(screen.getAllByRole('button', { name: 'Statistics' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Statistics' });
    await user.click(within(dialog).getByRole('radio', { name: 'Records' }));
    expect(within(dialog).getByText('Best Blitz').nextSibling).toHaveTextContent('7');
    expect(within(dialog).getByText('Highest floor').nextSibling).toHaveTextContent('4');
    expect(within(dialog).getByText('Bots beaten').nextSibling).toHaveTextContent('2');
  });
});
