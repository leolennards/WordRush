import { levelFor, rankFor } from '@/engine';
import { RankBadge } from './RankBadge';

/** Rank emblem, level, rank name and progress towards the next level. */
export function LevelBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const { level, into, span } = levelFor(xp);
  const { rank, next } = rankFor(level);
  const pct = Math.round((into / span) * 100);
  return (
    <div className="flex items-center gap-3">
      <RankBadge level={level} rank={rank} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate font-bold">
            {rank.name} <span className="font-semibold text-muted">· Level {level}</span>
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
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${rank.from}, ${rank.to})` }}
          />
        </div>
        {next && !compact && (
          <p className="mt-1 truncate text-[0.7rem] text-subtle">
            Next rank: {next.name} at level {next.minLevel}
          </p>
        )}
      </div>
    </div>
  );
}
