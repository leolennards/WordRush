import { createDictionary, type Dictionary } from '@/engine';
import { GAME } from '@/config/game';
import { ANSWERS } from './answers';
import { ALLOWED_GUESSES } from './allowed';

/** The default WordRush dictionary. Replace this module to swap word lists. */
export const dictionary: Dictionary = createDictionary(ANSWERS, ALLOWED_GUESSES, GAME.wordLength);
