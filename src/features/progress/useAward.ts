import { useCallback } from 'react';
import type { GameEvent } from '@/engine';
import { useToast } from '@/components/layout/Toasts';
import { useProgress } from './ProgressContext';

/** Records a finished game and celebrates new achievements and level-ups. */
export function useAward() {
  const { record } = useProgress();
  const { toast } = useToast();
  return useCallback(
    (event: GameEvent) => {
      const result = record(event);
      // One toast for all new achievements so they don't push each other away.
      if (result.unlocked.length > 0) {
        const names = result.unlocked.map((a) => a.title).join(', ');
        toast(`🏆 ${result.unlocked.length === 1 ? 'Achievement' : 'Achievements'}: ${names}`, { tone: 'success', duration: 3600 });
      }
      if (result.levelUp) toast(`⭐ Level ${result.levelUp} reached!`, { tone: 'success', duration: 3400 });
      return result;
    },
    [record, toast],
  );
}
