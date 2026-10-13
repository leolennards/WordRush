import { BookOpen } from 'lucide-react';
import { useWords } from '@/features/words/WordsContext';

/** A played word as a small tile-coloured button that opens its meaning. */
export function WordChip({ word, won }: { word: string; won: boolean }) {
  const { showWord } = useWords();
  return (
    <button
      type="button"
      onClick={() => showWord(word)}
      aria-label={`${word.toUpperCase()}, ${won ? 'solved' : 'missed'}. Show meaning`}
      className={`group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold tracking-wide uppercase transition hover:brightness-105 active:scale-95 ${
        won ? 'bg-correct text-correct-ink' : 'bg-surface-2 text-muted'
      }`}
    >
      <span className={won ? '' : 'line-through decoration-2'}>{word}</span>
      <BookOpen className="size-3 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
    </button>
  );
}
