import { useMemo, useState } from 'react';
import { BookOpen, Check, ChevronRight, Search, X } from 'lucide-react';
import type { WordBookEntry } from '@/lib/storage/schemas';
import { Dialog } from '@/components/dialogs/Dialog';

const MODE_LABEL: Record<string, string> = {
  daily: 'Daily',
  practice: 'Practice',
  blitz: 'Blitz',
  rush: 'Daily Rush',
  duo: 'Duo',
  quad: 'Quad',
  survival: 'Survival',
};

type Filter = 'all' | 'solved' | 'missed';

/** Every answer you've played, newest first, each one tappable for its meaning. */
export function WordBookDialog({
  open,
  onClose,
  book,
  onWord,
}: {
  open: boolean;
  onClose: () => void;
  book: WordBookEntry[];
  onWord: (word: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const solved = book.filter((e) => e.won).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...book]
      .reverse()
      .filter((e) => (filter === 'all' ? true : filter === 'solved' ? e.won : !e.won))
      .filter((e) => !q || e.word.includes(q));
  }, [book, query, filter]);

  return (
    <Dialog open={open} onClose={onClose} title="Word Book">
      <div className="space-y-4 pt-1">
        <p className="text-sm text-muted">
          {book.length === 0
            ? 'Every word you play is collected here, with its meaning one tap away.'
            : `${book.length} ${book.length === 1 ? 'word' : 'words'} collected · ${solved} solved`}
        </p>

        {book.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <label className="relative min-w-[10rem] flex-1">
                <span className="sr-only">Search words</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value.replace(/[^a-z]/gi, '').slice(0, 5))}
                  placeholder="Search"
                  className="h-10 w-full rounded-xl border border-border bg-surface-2 pr-9 pl-9 text-sm outline-none focus:border-focus"
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-3"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </label>
              <div role="radiogroup" aria-label="Show" className="inline-flex rounded-full border border-border bg-surface-2 p-1">
                {(['all', 'solved', 'missed'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={filter === f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                      filter === f ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No words match.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {shown.map((e) => (
                  <li key={e.word}>
                    <button
                      type="button"
                      onClick={() => onWord(e.word)}
                      className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface-2"
                      aria-label={`${e.word.toUpperCase()}, ${e.won ? 'solved' : 'missed'} in ${MODE_LABEL[e.mode] ?? e.mode}. Show meaning`}
                    >
                      <span className="flex gap-[3px]" aria-hidden>
                        {[...e.word].map((l, i) => (
                          <span
                            key={i}
                            className={`grid size-7 place-items-center rounded-[5px] text-[0.8rem] font-bold uppercase ${
                              e.won ? 'bg-correct text-correct-ink' : 'bg-surface-3 text-muted'
                            }`}
                          >
                            {l}
                          </span>
                        ))}
                      </span>
                      <span className="min-w-0 flex-1 text-xs text-muted">
                        <span className="flex items-center gap-1 font-semibold text-text">
                          {e.won ? <Check className="size-3.5 text-correct" aria-hidden /> : null}
                          {MODE_LABEL[e.mode] ?? e.mode}
                        </span>
                        {new Date(e.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </span>
                      <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {book.length === 0 && (
          <div className="grid place-items-center gap-2 rounded-2xl bg-surface-2 py-10 text-center">
            <BookOpen className="size-8 text-subtle" aria-hidden />
            <p className="text-sm font-semibold">Your Word Book is empty</p>
            <p className="max-w-[16rem] text-xs text-muted">Finish any game to collect its word.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
