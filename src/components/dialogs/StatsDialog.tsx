import { useState } from 'react';
import { GAME } from '@/config/game';
import { challengeNumber, dateForDayIndex, type SoloMode } from '@/engine';
import { useStats } from '@/features/stats/StatsContext';
import { StatsPanel } from '@/components/statistics/StatsPanel';
import { Segmented } from '@/components/ui';
import { ACHIEVEMENTS, levelFor, rankFor } from '@/engine';
import { useProgress } from '@/features/progress/ProgressContext';
import { RankBadge } from '@/components/progress/RankBadge';
import {
  Award,
  Bot,
  BookOpen,
  Castle,
  Columns2,
  Grid2x2,
  Heart,
  ArrowDownUp,
  ScrollText,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Dialog } from './Dialog';

interface StatsDialogProps {
  open: boolean;
  onClose: () => void;
  initialMode: SoloMode;
  todayIndex: number;
}

export function StatsDialog({ open, onClose, initialMode, todayIndex }: StatsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Statistics">
      {/* Remount on open so the tab follows the active mode. */}
      {open && <StatsContent initialMode={initialMode} todayIndex={todayIndex} />}
    </Dialog>
  );
}

type Tab = SoloMode | 'records';

function StatsContent({ initialMode, todayIndex }: { initialMode: SoloMode; todayIndex: number }) {
  const [mode, setMode] = useState<Tab>(initialMode);
  const { daily, practice } = useStats();
  const last = daily.lastResult;

  return (
    <div className="space-y-5 pt-2">
      <div className="flex justify-center">
        <Segmented<Tab>
          label="Statistics for"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'practice', label: 'Practice' },
            { value: 'records', label: 'Records' },
          ]}
        />
      </div>

      {mode === 'records' ? (
        <Records />
      ) : mode === 'daily' ? (
        <>
          <StatsPanel stats={daily} currentKey={todayIndex} />
          <p className="text-center text-sm text-muted">
            {last ? (
              <>
                Last completed: <strong className="text-text">#{challengeNumber(last.key)}</strong> (
                {dateForDayIndex(last.key, GAME.dailyEpoch).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'UTC',
                })}
                ) — {last.won ? `solved in ${last.guesses}` : 'not solved'}
              </>
            ) : (
              'No daily challenges completed yet.'
            )}
          </p>
        </>
      ) : (
        <StatsPanel stats={practice} streakLabel="Win streak" />
      )}
      {mode !== 'records' && (
        <p className="text-center text-xs text-subtle">
          Average counts solved games only. Streaks need a win on consecutive days (UTC).
        </p>
      )}
    </div>
  );
}

/** Personal bests across every mode. */
function Records() {
  const { progress: p } = useProgress();
  const { level } = levelFor(p.xp);
  const { rank } = rankFor(level);
  const unlocked = ACHIEVEMENTS.filter((a) => p.unlocked[a.id]).length;
  const items: { label: string; value: string | number; icon: LucideIcon; tint: string }[] = [
    { label: 'Best Blitz', value: p.bestBlitz, icon: Zap, tint: 'text-present' },
    { label: 'Best Survival', value: p.bestSurvival, icon: Heart, tint: 'text-danger' },
    { label: 'Highest floor', value: p.bestTower, icon: Castle, tint: 'text-accent' },
    { label: 'Best Reverse', value: `${p.bestReverse}/5`, icon: ArrowDownUp, tint: 'text-accent' },
    { label: 'Bots beaten', value: p.duelWins, icon: Bot, tint: 'text-danger' },
    { label: 'Duo wins', value: p.duoWins, icon: Columns2, tint: 'text-correct' },
    { label: 'Quad wins', value: p.quadWins, icon: Grid2x2, tint: 'text-present' },
    { label: 'Words played', value: p.wordsPlayed, icon: BookOpen, tint: 'text-text' },
    { label: 'Quests done', value: p.questsDone, icon: ScrollText, tint: 'text-correct' },
    { label: 'Achievements', value: `${unlocked}/${ACHIEVEMENTS.length}`, icon: Award, tint: 'text-present' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <RankBadge level={level} rank={rank} size="sm" />
        <p className="min-w-0 text-sm">
          <span className="block font-bold">{rank.name}</span>
          <span className="tabular text-muted">
            Level {level} · {p.xp.toLocaleString()} XP total
          </span>
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {items.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Icon className={`size-5 shrink-0 ${tint}`} aria-hidden />
            <div className="flex min-w-0 flex-col-reverse">
              <dt className="truncate text-xs text-muted">{label}</dt>
              <dd className="tabular text-lg leading-tight font-extrabold">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
