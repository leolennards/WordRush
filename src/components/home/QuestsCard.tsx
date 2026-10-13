import { CircleCheck, Circle, ScrollText } from 'lucide-react';
import { QUEST_XP, questsFor, type Progress } from '@/engine';

/** Today's three quests with progress. Resets at 00:00 UTC with the Daily Challenge. */
export function QuestsCard({ progress, todayIndex, countdown }: { progress: Progress; todayIndex: number; countdown: string }) {
  const quests = questsFor(todayIndex);
  const state = progress.quests?.day === todayIndex ? progress.quests.progress : {};
  const done = quests.filter((q) => (state[q.id] ?? 0) >= q.target).length;

  return (
    <section aria-labelledby="home-quests" className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="home-quests" className="flex items-center gap-2 font-bold">
          <ScrollText className="size-4 text-accent" aria-hidden /> Daily quests
        </h3>
        <span className="tabular text-xs font-semibold text-muted">
          {done}/{quests.length} done
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {quests.map((q) => {
          const value = Math.min(q.target, state[q.id] ?? 0);
          const complete = value >= q.target;
          return (
            <li key={q.id} className="flex items-center gap-3">
              {complete ? (
                <CircleCheck className="size-5 shrink-0 text-correct" aria-hidden />
              ) : (
                <Circle className="size-5 shrink-0 text-border-strong" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-tight ${complete ? 'text-muted line-through' : 'font-semibold'}`}>
                  {q.title}
                  <span className="sr-only">{complete ? ' (done)' : ` (${value} of ${q.target})`}</span>
                </p>
                {q.target > 1 && !complete && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(value / q.target) * 100}%` }} />
                  </div>
                )}
              </div>
              <span className="tabular shrink-0 text-xs font-bold text-muted" aria-hidden>
                {q.target > 1 && !complete ? `${value}/${q.target}` : `+${QUEST_XP}`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="tabular mt-3 text-xs text-subtle">
        +{QUEST_XP} XP each · new quests in {countdown}
      </p>
    </section>
  );
}
