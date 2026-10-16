import { Ghost, Heart, PartyPopper, Snowflake, Sparkles, Star, Sun } from 'lucide-react';
import type { WinFxId } from '@/engine';
import { Coin } from './Coin';

/** A small icon for each win effect. */
export function FxIcon({ id, className = 'size-5' }: { id: WinFxId; className?: string }) {
  switch (id) {
    case 'hearts':
      return <Heart className={`${className} fill-current text-pink-500`} aria-hidden />;
    case 'coins':
      return <Coin className={className} />;
    case 'stars':
      return <Star className={`${className} fill-current text-amber-400`} aria-hidden />;
    case 'bats':
      return <Ghost className={`${className} text-orange-500`} aria-hidden />;
    case 'snow':
      return <Snowflake className={`${className} text-sky-400`} aria-hidden />;
    case 'balloons':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <ellipse cx="9" cy="9" rx="5" ry="6" fill="#f43f5e" />
          <ellipse cx="15.5" cy="8" rx="4.5" ry="5.5" fill="#38bdf8" />
          <path d="M9 15 Q10 19 12 22 M15.5 13.5 Q14 18 12 22" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'supernova':
      return <Sun className={`${className} fill-yellow-200 text-amber-500`} aria-hidden />;
    case 'fireworks':
      return <Sparkles className={`${className} text-fuchsia-500`} aria-hidden />;
    default:
      return <PartyPopper className={`${className} text-accent`} aria-hidden />;
  }
}
