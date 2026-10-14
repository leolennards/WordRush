import { GAME } from '@/config/game';

/**
 * The Submit button's state: `short` until every letter is typed, then
 * `ready` for a real word or `unknown` for one that isn't in the word list.
 */
export type SubmitState = 'short' | 'ready' | 'unknown';

export function submitStateFor(input: string, isWord: (word: string) => boolean): SubmitState {
  if (input.length < GAME.wordLength) return 'short';
  return isWord(input) ? 'ready' : 'unknown';
}
