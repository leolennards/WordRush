import { useCallback } from 'react';
import { levelFor, type GameEvent } from '@/engine';
import { useToast, type Reward } from '@/components/layout/Toasts';
import { ACHIEVEMENT_ICONS } from '@/components/progress/achievementIcons';
import { useWords } from '@/features/words/WordsContext';
import { useProgress } from './ProgressContext';

/** Delay between reward cards when several arrive together. */
const STAGGER_MS = 1000;

/** Records a finished game and celebrates new achievements, quests and level-ups. */
export function useAward() {
  const { record } = useProgress();
  const { toast } = useToast();
  const { collect } = useWords();
  return useCallback(
    (event: GameEvent) => {
      const result = record(event);
      if (event.words && result.xpGained > 0) collect(event.id.startsWith('rush-') ? 'rush' : event.mode, event.words);
      const rewards: Reward[] = [];
      if (result.levelUp) {
        rewards.push({
          kind: 'level',
          eyebrow: 'Level up',
          title: `Level ${result.levelUp}`,
          detail: levelFor(result.progress.xp).title,
          level: result.levelUp,
        });
      }
      for (const a of result.unlocked) {
        rewards.push({
          kind: 'achievement',
          eyebrow: 'Achievement unlocked',
          title: a.title,
          detail: a.description,
          icon: ACHIEVEMENT_ICONS[a.icon],
        });
      }
      for (const q of result.questsCompleted) {
        rewards.push({ kind: 'quest', eyebrow: 'Quest complete', title: q.title, detail: '+60 XP' });
      }

      // One after another, so each card gets its moment.
      rewards.forEach((reward, i) => {
        const show = () => toast(`${reward.eyebrow}: ${reward.title}`, { reward });
        if (i === 0) show();
        else window.setTimeout(show, i * STAGGER_MS);
      });
      return result;
    },
    [record, toast, collect],
  );
}
