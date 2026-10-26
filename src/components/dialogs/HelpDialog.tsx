import type { ReactNode } from 'react';
import { CalendarDays, LayoutGrid, Shuffle, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { LetterState } from '@/engine';
import { BRAND, GAME } from '@/config/game';
import { Dialog } from './Dialog';
import { HELP_EXAMPLES } from './helpExamples';

function Example({ word, states, caption }: { word: string; states: (LetterState | null)[]; caption: ReactNode }) {
  return (
    <figure className="space-y-2">
      <div className="flex gap-1.5" role="img" aria-label={`Example: ${word.toUpperCase()}`}>
        {[...word].map((l, i) => (
          <div
            key={i}
            className="tile size-10 text-xl!"
            data-state={states[i] ?? 'tbd'}
            aria-hidden
          >
            {l}
          </div>
        ))}
      </div>
      <figcaption className="text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}

function Tip({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
      <span>
        <strong>{title}</strong> — {children}
      </span>
    </li>
  );
}

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="How to play">
      <div className="space-y-5 text-[0.95rem] leading-relaxed">
        <p>
          Guess the hidden word in <strong>{GAME.maxGuesses} tries</strong>. Type any real {GAME.wordLength}-letter word and
          tap <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-sm font-semibold">Submit</kbd>. After each guess,
          the tiles change colour to show how close you were.
        </p>

        <div className="space-y-4 rounded-2xl bg-surface-2 p-4">
          <Example
            word={HELP_EXAMPLES[0]}
            states={['correct', null, null, null, null]}
            caption={<><strong className="text-text">W</strong> is in the word and in the right spot.</>}
          />
          <Example
            word={HELP_EXAMPLES[1]}
            states={[null, null, 'present', null, null]}
            caption={<><strong className="text-text">U</strong> is in the word but in the wrong spot.</>}
          />
          <Example
            word={HELP_EXAMPLES[2]}
            states={[null, null, 'absent', null, null]}
            caption={<><strong className="text-text">M</strong> is not in the word.</>}
          />
        </div>

        <p className="text-sm text-muted">
          <strong className="text-text">Double letters:</strong> a letter only lights up as many times as it’s in the
          answer.
        </p>

        <div>
          <h3 className="mb-2 text-sm font-bold">Good to know</h3>
          <ul className="space-y-3 text-sm">
            <Tip icon={CalendarDays} title="Daily Challenge">
              One puzzle a day, the same for everyone. Solve it to keep your streak going.
            </Tip>
            <Tip icon={Shuffle} title="Practice">
              As many words as you like, with hints when you’re stuck. It never touches your streak.
            </Tip>
            <Tip icon={LayoutGrid} title="Other games">
              Blitz, The Tower, Bot Duel and more are on Home, each with a one-line description.
            </Tip>
            <Tip icon={ShoppingBag} title="Coins">
              Every game earns coins. Spend them in the Shop on new tile colours, keyboards, sounds and more.
            </Tip>
          </ul>
        </div>

        <p className="border-t border-border pt-4 text-center text-sm text-muted">{BRAND.tagline}</p>
      </div>
    </Dialog>
  );
}
