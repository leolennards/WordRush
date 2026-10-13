import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useServices } from '@/app/services';
import { KEYS, WORDBOOK_LIMIT, wordbookSchema, type WordBookEntry } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';
import { WordSheet } from '@/components/words/WordSheet';
import { WordBookDialog } from '@/components/words/WordBookDialog';

interface WordsContextValue {
  /** Opens the meaning sheet for a word. */
  showWord: (word: string) => void;
  /** Opens the Word Book. */
  showBook: () => void;
  book: WordBookEntry[];
  /** Adds played answers to the Word Book (the newest play of a word wins). */
  collect: (mode: string, words: { answer: string; won: boolean }[]) => void;
  /** Re-reads the Word Book from storage (after a cloud sync). */
  refresh: () => void;
}

const WordsContext = createContext<WordsContextValue | null>(null);

export function WordsProvider({ children }: { children: ReactNode }) {
  const { store, now } = useServices();
  const [book, setBook] = useState<WordBookEntry[]>(() => readVersioned(store, KEYS.wordbook, wordbookSchema) ?? []);
  const [word, setWord] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);

  const collect = useCallback(
    (mode: string, words: { answer: string; won: boolean }[]) => {
      if (words.length === 0) return;
      const at = now().getTime();
      const current = readVersioned(store, KEYS.wordbook, wordbookSchema) ?? [];
      const fresh = new Set(words.map((w) => w.answer));
      const next = [
        ...current.filter((e) => !fresh.has(e.word)),
        ...words.map((w) => ({ word: w.answer, mode, won: w.won, at })),
      ].slice(-WORDBOOK_LIMIT);
      writeVersioned(store, KEYS.wordbook, wordbookSchema, next);
      setBook(next);
    },
    [store, now],
  );

  const showWord = useCallback((w: string) => setWord(w.toLowerCase()), []);
  const showBook = useCallback(() => setBookOpen(true), []);

  const refresh = useCallback(() => setBook(readVersioned(store, KEYS.wordbook, wordbookSchema) ?? []), [store]);
  const value = useMemo(() => ({ showWord, showBook, book, collect, refresh }), [showWord, showBook, book, collect, refresh]);
  return (
    <WordsContext.Provider value={value}>
      {children}
      <WordBookDialog open={bookOpen && word === null} onClose={() => setBookOpen(false)} book={book} onWord={showWord} />
      <WordSheet word={word} onClose={() => setWord(null)} />
    </WordsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWords(): WordsContextValue {
  const ctx = useContext(WordsContext);
  if (!ctx) throw new Error('useWords must be used inside <WordsProvider>');
  return ctx;
}
