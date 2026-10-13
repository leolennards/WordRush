import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useWords } from '@/features/words/WordsContext';
import { useServices } from '@/app/services';
import type { WordDefinition } from '@/lib/dictionary/define';

type State = { word: string; result: WordDefinition | null | 'loading' };

/** "What it means" card for a finished game's answer. Hidden if nothing is found. */
export function WordMeaning({ word }: { word: string }) {
  const { define } = useServices();
  const { showWord } = useWords();
  const [state, setState] = useState<State>({ word, result: 'loading' });

  useEffect(() => {
    if (!define) return;
    let live = true;
    void define(word).then((result) => live && setState({ word, result }));
    return () => {
      live = false;
    };
  }, [define, word]);

  if (!define) return null;
  const result = state.word === word ? state.result : 'loading';
  if (result === null) return null;

  return (
    <section aria-label={`Meaning of ${word.toUpperCase()}`} className="rounded-2xl border border-border p-4" aria-busy={result === 'loading'}>
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
        <BookOpen className="size-3.5" aria-hidden /> What it means
      </p>
      {result === 'loading' ? (
        <div className="mt-2 space-y-2" aria-hidden>
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-2" />
          <div className="h-3.5 w-full animate-pulse rounded bg-surface-2" />
        </div>
      ) : (
        <>
          <p className="mt-1.5">
            <strong className="tracking-wide uppercase">{result.word}</strong>
            {result.partOfSpeech && <em className="ml-2 text-sm text-muted">{result.partOfSpeech}</em>}
          </p>
          <p className="mt-0.5 text-[0.95rem] leading-snug">{result.definition}</p>
          {result.example && <p className="mt-1 text-sm text-muted italic">“{result.example}”</p>}
          <button
            type="button"
            onClick={() => showWord(word)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
          >
            Full meaning{result.audio ? ' and pronunciation' : ''} <ChevronRight className="size-4" aria-hidden />
          </button>
        </>
      )}
    </section>
  );
}
