import { levelFor } from '@/engine';

/** Level badge, title and progress towards the next level. */
export function LevelBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const { level, title, into, span } = levelFor(xp);
  const pct = Math.round((into / span) * 100);
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-ink font-extrabold text-ink-text ${compact ? 'size-9 text-sm' : 'size-11 text-lg'}`}
        aria-hidden
      >
        {level}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate font-bold">
            Level {level} <span className="font-semibold text-muted">· {title}</span>
          </span>
          <span className="tabular shrink-0 text-xs text-muted">
            {into}/{span} XP
          </span>
        </p>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={`Level ${level} progress`}
          aria-valuemin={0}
          aria-valuemax={span}
          aria-valuenow={into}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
