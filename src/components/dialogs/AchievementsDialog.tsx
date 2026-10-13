import { Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '@/engine';
import { useProgress } from '@/features/progress/ProgressContext';
import { LevelBar } from '@/components/progress/LevelBar';
import { ACHIEVEMENT_ICONS } from '@/components/progress/achievementIcons';
import { Dialog } from './Dialog';

export function AchievementsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { progress } = useProgress();
  const count = ACHIEVEMENTS.filter((a) => progress.unlocked[a.id]).length;

  return (
    <Dialog open={open} onClose={onClose} title="Achievements">
      <div className="space-y-5 pt-2">
        <div className="rounded-2xl bg-surface-2 p-4">
          <LevelBar xp={progress.xp} />
          <p className="mt-3 text-xs text-muted">
            Earn XP for every game: more for fewer guesses, Hard mode and the Daily Challenge.
          </p>
        </div>

        <p className="text-sm font-semibold">
          {count} of {ACHIEVEMENTS.length} unlocked
        </p>
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const at = progress.unlocked[a.id];
            const Icon = ACHIEVEMENT_ICONS[a.icon];
            return (
              <li
                key={a.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  at ? 'border-correct/40 bg-correct/10' : 'border-border'
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                    at ? 'bg-correct text-correct-ink' : 'bg-surface-2 text-subtle'
                  }`}
                >
                  {at ? <Icon className="size-[1.1rem]" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-bold ${at ? '' : 'text-muted'}`}>
                    {a.title}
                    <span className="sr-only">{at ? ' (unlocked)' : ' (locked)'}</span>
                  </span>
                  <span className="block text-xs text-muted">{a.description}</span>
                  {at && (
                    <span className="mt-0.5 block text-[0.7rem] text-subtle">
                      {new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
