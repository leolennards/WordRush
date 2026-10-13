import type { ReactNode } from 'react';
import { ArrowDownUp, Award, BookOpen, Bot, Castle, Footprints, CalendarClock, CalendarDays, Columns2, Heart, ScrollText, Share2, Shuffle, SlidersHorizontal, Zap } from 'lucide-react';
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

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="How to play">
      <div className="space-y-5 text-[0.95rem] leading-relaxed">
        <p>
          Guess the hidden word in <strong>{GAME.maxGuesses} tries</strong>. Each guess must be a real{' '}
          {GAME.wordLength}-letter word — type it and press <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-sm font-semibold">Enter</kbd>.
          Words not in the list don’t use up a try.
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
          <strong className="text-text">Repeated letters:</strong> each letter is highlighted only as many times as it
          appears in the answer. If you guess two Es and the answer has one, only one E lights up.
        </p>

        <ul className="space-y-3 text-sm">
          <li className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Daily Challenge</strong> — one puzzle a day, the same for everyone. A new one arrives at midnight
              UTC. It counts toward your streak.
            </span>
          </li>
          <li className="flex gap-3">
            <Shuffle className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Practice</strong> — unlimited words with separate statistics. It never affects your daily streak.
              Stuck? Tap the hint button for up to two letters per word.
            </span>
          </li>
          <li className="flex gap-3">
            <Zap className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Blitz</strong> — solve as many words as you can before the clock runs out. Solves add time, misses
              cost time.
            </span>
          </li>
          <li className="flex gap-3">
            <Columns2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Duo and Quad</strong> — two words with 7 shared guesses, or four with 9. Each key is split
              into one colour per word, in board order.
            </span>
          </li>
          <li className="flex gap-3">
            <Castle className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>The Tower</strong> — climb floor by floor; every word has a twist (Fog, Blind keys, Fibber, Hard
              mode). Clear a floor to pick a perk; miss one and lose a heart.
            </span>
          </li>
          <li className="flex gap-3">
            <Bot className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Bot Duel</strong> — race Pip, Byte or Oracle to the same word, live. First to solve wins.
            </span>
          </li>
          <li className="flex gap-3">
            <ArrowDownUp className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Reverse</strong> — you see the answer; find a word that makes the colour pattern shown.
            </span>
          </li>
          <li className="flex gap-3">
            <Footprints className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Word Ladder</strong> — turn the start word into the target by changing one letter at a time.
              Every step must be a real word. Reach it in par for three stars.
            </span>
          </li>
          <li className="flex gap-3">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Daily Rush</strong> — a Blitz run on the same words for everyone, once a day. Compare scores
              with friends.
            </span>
          </li>
          <li className="flex gap-3">
            <SlidersHorizontal className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Mods</strong> — in Practice, try Fog (only your latest guess stays visible), Blind keys (no
              keyboard colours) or Fibber (every row tells one lie) for bonus XP.
            </span>
          </li>
          <li className="flex gap-3">
            <Heart className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Survival</strong> — word after word with 3 lives. A miss costs a life; solving in 3 guesses or
              fewer wins one back.
            </span>
          </li>
          <li className="flex gap-3">
            <ScrollText className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Daily quests</strong> — three new goals every day for bonus XP.
            </span>
          </li>
          <li className="flex gap-3">
            <BookOpen className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Word Book</strong> — every word you play is collected with its meaning and pronunciation.
            </span>
          </li>
          <li className="flex gap-3">
            <Award className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Level up</strong> — every game earns XP. Climb through ten ranks, from Rookie to Wordskiis
              Legend at level 100, each with its own emblem and new tile themes to unlock.
            </span>
          </li>
          <li className="flex gap-3">
            <Share2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>Share</strong> your result as a spoiler-free grid of coloured squares when you finish.
            </span>
          </li>
        </ul>

        <p className="border-t border-border pt-4 text-center text-sm text-muted">{BRAND.tagline}</p>
      </div>
    </Dialog>
  );
}
