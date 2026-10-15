import { Heart, PartyPopper, Sparkles, Star } from 'lucide-react';
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
    case 'fireworks':
      return <Sparkles className={`${className} text-fuchsia-500`} aria-hidden />;
    default:
      return <PartyPopper className={`${className} text-accent`} aria-hidden />;
  }
}
