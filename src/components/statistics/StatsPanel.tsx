import { m } from 'motion/react';
import { averageGuesses, effectiveStreak, winPercentage, type Stats } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';

interface StatsPanelProps {
  stats: Stats;
  /** For daily stats: today's key, so a missed day shows a lapsed streak. */
  currentKey?: number;
  /** Guess count to highlight in the distribution (the just-finished game). */
  highlight?: number | null;
  streakLabel?: string;
}

export function StatsPanel({ stats, currentKey, highlight, streakLabel = 'Current streak' }: StatsPanelProps) {
  const { reducedMotion } = useSettings();
  const avg = averageGuesses(stats);
  const maxCount = Math.max(1, ...stats.distribution);
  const items = [
    { label: 'Played', value: stats.played },
    { label: 'Win %', value: winPercentage(stats) },
    { label: streakLabel, value: effectiveStreak(stats, currentKey) },
    { label: 'Best streak', value: stats.maxStreak },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-4 gap-2 text-center">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl bg-surface-2 px-1 py-3">
            <dd className="tabular text-2xl font-bold leading-none sm:text-3xl">{it.value}</dd>
            <dt className="mt-1.5 text-[0.7rem] leading-tight text-muted sm:text-xs">{it.label}</dt>
          </div>
        ))}
      </dl>

      <section aria-labelledby="dist-heading">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 id="dist-heading" className="text-sm font-bold tracking-wide text-muted uppercase">
            Guess distribution
          </h3>
          <span className="text-xs text-muted">
            Avg. guesses: <strong className="tabular text-text">{avg === null ? '—' : avg.toFixed(2)}</strong>
          </span>
        </div>
        <ol className="space-y-1.5">
          {stats.distribution.map((count, i) => {
            const isHighlight = highlight === i + 1;
            const pct = Math.max(7, (count / maxCount) * 100);
            return (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="tabular w-3 text-right font-semibold text-muted">{i + 1}</span>
                <div className="flex-1">
                  <m.div
                    className={`tabular flex h-6 min-w-6 items-center justify-end rounded-md px-2 text-xs font-bold ${
                      isHighlight ? 'bg-correct text-correct-ink' : 'bg-surface-3 text-text'
                    }`}
                    initial={reducedMotion ? false : { width: '7%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                    aria-label={`${count} ${count === 1 ? 'win' : 'wins'} in ${i + 1} ${i === 0 ? 'guess' : 'guesses'}`}
                  >
                    {count}
                  </m.div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
