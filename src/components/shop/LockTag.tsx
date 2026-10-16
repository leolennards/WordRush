import { Lock } from 'lucide-react';
import { Coin } from './Coin';

/** The small tag under a locked item: its price, or the level that unlocks it. */
export function LockTag({ price, level }: { price?: number; level?: number }) {
  return (
    <span className="tabular flex items-center gap-0.5 text-[0.65rem] text-subtle">
      {level !== undefined ? (
        <>
          <Lock className="size-2.5" aria-hidden /> Level {level}
        </>
      ) : (
        <>
          <Coin className="size-3" /> {price}
        </>
      )}
    </span>
  );
}
