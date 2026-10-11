import { useCallback } from 'react';
import { createGame, type GameState } from '@/engine';
import { useServices } from '@/app/services';
import { friendGameKey, friendGameSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';
import { useGameSession } from '@/features/game/useGameSession';

/**
 * A challenge or race game, saved on this device under its own key so it
 * survives refreshes and never touches Daily/Practice progress or stats.
 */
export function useFriendGame(mode: 'challenge' | 'race', id: string, answer: string, onFinished: (game: GameState) => void) {
  const { store } = useServices();
  const key = friendGameKey(mode, id);

  const initialGame = () => {
    const saved = readVersioned(store, key, friendGameSchema)?.game;
    if (saved && saved.id === id && saved.answer === answer) return saved;
    return createGame({ mode, id, answer, hardMode: false });
  };
  const persist = useCallback((game: GameState) => writeVersioned(store, key, friendGameSchema, { game }), [store, key]);

  return useGameSession({ initialGame, persist, onFinished, followHardMode: false });
}
