import { useEffect, useState } from 'react';
import { m } from 'motion/react';
import { BookMarked, ExternalLink, Volume2, WifiOff } from 'lucide-react';
import { useServices } from '@/app/services';
import { useSettings } from '@/features/settings/SettingsContext';
import type { WordDefinition } from '@/lib/dictionary/define';
import { Dialog } from '@/components/dialogs/Dialog';

type Lookup = { word: string; result: WordDefinition | null | 'loading' };

/** Full meaning of a word: pronunciation, senses, examples and synonyms. */
export function WordSheet({ word, onClose }: { word: string | null; onClose: () => void }) {
  return (
    <Dialog open={word !== null} onClose={onClose} title={word ? `Meaning of ${word.toUpperCase()}` : 'Meaning'} hideTitle>
      {word && <WordSheetBody word={word} />}
    </Dialog>
  );
}

function WordSheetBody({ word }: { word: string }) {
  const { define } = useServices();
  const { reducedMotion } = useSettings();
  const [lookup, setLookup] = useState<Lookup>({ word, result: 'loading' });

  useEffect(() => {
    if (!define) return;
    let live = true;
    void define(word).then((result) => live && setLookup({ word, result }));
    return () => {
      live = false;
    };
  }, [define, word]);

  const result = !define ? null : lookup.word === word ? lookup.result : 'loading';
  const play = (url: string) => {
    try {
      void new Audio(url).play().catch(() => {});
    } catch {
      /* audio unavailable */
    }
  };

  return (
    <div className="space-y-5 pt-1">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" aria-label={word.toUpperCase()} role="img">
          {[...word].map((l, i) => (
            <m.span
              key={`${word}-${i}`}
              className="tile size-10 text-lg! sm:size-11"
              data-state="correct"
              aria-hidden
              initial={reducedMotion ? false : { rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ delay: 0.05 + i * 0.07, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {l}
            </m.span>
          ))}
        </div>
        {result && result !== 'loading' && (result.phonetic || result.audio) && (
          <div className="flex items-center gap-2">
            {result.phonetic && <span className="font-medium text-muted">{result.phonetic}</span>}
            {result.audio && (
              <button
                type="button"
                onClick={() => play(result.audio!)}
                className="grid size-9 place-items-center rounded-full bg-surface-2 transition hover:bg-surface-3 active:scale-95"
                aria-label={`Hear ${word} pronounced`}
              >
                <Volume2 className="size-[1.1rem]" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>

      {result === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-label="Looking up the meaning">
          {[0.35, 1, 0.8].map((w, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-surface-2" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      )}

      {result === null && (
        <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
          {define ? (
            <BookMarked className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          ) : (
            <WifiOff className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          )}
          <p className="text-muted">
            {define
              ? 'We couldn’t find a definition for this word. It may be a rare or regional spelling.'
              : 'Meanings need an internet connection.'}
          </p>
        </div>
      )}

      {result && result !== 'loading' && (
        <ol className="space-y-4">
          {result.senses.map((sense, i) => (
            <m.li
              key={sense.partOfSpeech + i}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
            >
              {sense.partOfSpeech && (
                <span className="inline-block rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-bold text-accent italic">
                  {sense.partOfSpeech}
                </span>
              )}
              <ul className="mt-2 space-y-2">
                {sense.definitions.map((d, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="tabular mt-0.5 text-xs font-bold text-subtle">{j + 1}</span>
                    <span>
                      <span className="block leading-snug">{d.definition}</span>
                      {d.example && <span className="mt-0.5 block text-sm text-muted italic">“{d.example}”</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {sense.synonyms.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-muted">Similar:</span>
                  {sense.synonyms.map((s) => (
                    <span key={s} className="rounded-full border border-border px-2 py-0.5">
                      {s}
                    </span>
                  ))}
                </p>
              )}
            </m.li>
          ))}
        </ol>
      )}

      <a
        href={`https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
      >
        More on Wiktionary <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}
