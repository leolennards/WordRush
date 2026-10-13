import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyHint,
  choosePerk as applyPerk,
  createGame,
  finishFloor,
  pickPracticeAnswer,
  startTower,
  towerMods,
  type GameState,
  type Perk,
  type TowerRun,
} from '@/engine';
import { useServices } from '@/app/services';
import { useGameSession, type GameSession } from '@/features/game/useGameSession';
import { KEYS, towerSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

export interface Tower extends GameSession {
  /** Null before the first run. */
  run: TowerRun | null;
  start: () => void;
  enterFloor: () => void;
  choosePerk: (perk: Perk) => void;
}

/** Tower runs are saved after every guess and every choice. */
export function useTower(avoidAnswer: string, onRunEnd: (run: TowerRun) => void): Tower {
  const { store, dictionary, random, now } = useServices();
  const [saved] = useState(() => readVersioned(store, KEYS.tower, towerSchema));
  const [run, setRun] = useState<TowerRun | null>(() => saved?.run ?? null);
  const runRef = useRef(run);
  const onEndRef = useRef(onRunEnd);
  useEffect(() => {
    onEndRef.current = onRunEnd;
  });

  const floorGame = useCallback(
    (r: TowerRun | null): GameState => {
      const used = r?.log.map((l) => l.answer) ?? [];
      const answer = pickPracticeAnswer(dictionary.answers, [...used, avoidAnswer], random);
      let game = createGame({
        mode: 'tower',
        id: `tower-${r?.id ?? 0}-${r?.floor ?? 0}`,
        answer,
        hardMode: !!r?.twists.includes('hard'),
      });
      const mods = r ? towerMods(r.twists) : [];
      if (mods.length) game = { ...game, mods };
      if (r?.lantern) game = applyHint(game);
      return game;
    },
    [dictionary, random, avoidAnswer],
  );

  const save = useCallback(
    (game: GameState, r: TowerRun | null) => {
      if (r) writeVersioned(store, KEYS.tower, towerSchema, { run: r, game });
    },
    [store],
  );
  const gameRef = useRef<GameState | null>(saved?.game ?? null);
  const persist = useCallback(
    (game: GameState) => {
      gameRef.current = game;
      save(game, runRef.current);
    },
    [save],
  );

  const update = useCallback(
    (next: TowerRun, game: GameState | null = gameRef.current) => {
      runRef.current = next;
      setRun(next);
      if (game) save(game, next);
    },
    [save],
  );

  const onFinished = useCallback(
    (game: GameState) => {
      const current = runRef.current;
      if (!current) return;
      const next = finishFloor(current, game.id, game.answer, game.status === 'won', random);
      if (next === current) return;
      update(next, game);
      if (next.phase === 'over') onEndRef.current(next);
    },
    [random, update],
  );

  const session = useGameSession({
    initialGame: () => saved?.game ?? floorGame(null),
    persist,
    onFinished,
    followHardMode: false,
  });
  const { replace } = session;

  const start = useCallback(() => update(startTower(now().getTime(), random)), [now, random, update]);

  const enterFloor = useCallback(() => {
    const current = runRef.current;
    if (!current || current.phase !== 'intro') return;
    const game = floorGame(current);
    const next: TowerRun = { ...current, phase: 'playing', lantern: false };
    update(next, game);
    replace(game);
  }, [floorGame, update, replace]);

  const choosePerk = useCallback(
    (perk: Perk) => {
      const current = runRef.current;
      if (current) update(applyPerk(current, perk, random));
    },
    [random, update],
  );

  return { ...session, run, start, enterFloor, choosePerk };
}
