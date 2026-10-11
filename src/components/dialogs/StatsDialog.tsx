import { useState } from 'react';
import { GAME } from '@/config/game';
import { challengeNumber, dateForDayIndex, type SoloMode } from '@/engine';
import { useStats } from '@/features/stats/StatsContext';
import { StatsPanel } from '@/components/statistics/StatsPanel';
import { Segmented } from '@/components/ui';
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

function StatsContent({ initialMode, todayIndex }: { initialMode: SoloMode; todayIndex: number }) {
  const [mode, setMode] = useState<SoloMode>(initialMode);
  const { daily, practice } = useStats();
  const last = daily.lastResult;

  return (
    <div className="space-y-5 pt-2">
      <div className="flex justify-center">
        <Segmented<SoloMode>
          label="Statistics for"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'practice', label: 'Practice' },
          ]}
        />
      </div>

      {mode === 'daily' ? (
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
      <p className="text-center text-xs text-subtle">
        Average counts solved games only. Streaks need a win on consecutive days (UTC).
      </p>
    </div>
  );
}
