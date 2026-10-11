import { m } from 'motion/react';
import { BarChart3 } from 'lucide-react';
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

export function StatsPanel({ stats, currentKey, highlight, streakLabel = 'Streak' }: StatsPanelProps) {
  const { reducedMotion } = useSettings();
  const avg = averageGuesses(stats);
  const maxCount = Math.max(1, ...stats.distribution);
  const hasWins = stats.distribution.some((n) => n > 0);
  const items = [
    { label: 'Played', value: stats.played },
    { label: 'Win %', value: winPercentage(stats) },
    { label: streakLabel, value: effectiveStreak(stats, currentKey) },
    { label: 'Best', value: stats.maxStreak },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-4 divide-x divide-border rounded-2xl bg-surface-2 py-3 text-center">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col-reverse gap-0.5 px-1">
            <dt className="text-[0.7rem] leading-tight text-muted sm:text-xs">{it.label}</dt>
            <dd className="tabular text-2xl leading-none font-bold">{it.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="dist-heading">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h3 id="dist-heading" className="text-sm font-bold">
            Guess distribution
          </h3>
          <span className="text-xs text-muted">
            Average <strong className="tabular text-text">{avg === null ? '—' : avg.toFixed(2)}</strong>
          </span>
        </div>

        {!hasWins ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong/60 p-4 text-sm text-muted">
            <BarChart3 className="size-5 shrink-0" aria-hidden />
            Solve a puzzle and your guess distribution will build up here.
          </div>
        ) : (
          <ol className="space-y-1.5">
            {stats.distribution.map((count, i) => {
              const isHighlight = highlight === i + 1;
              const pct = count === 0 ? 0 : Math.max(9, (count / maxCount) * 100);
              return (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="tabular w-3 text-right font-semibold text-muted">{i + 1}</span>
                  <div
                    className="relative h-6 flex-1 overflow-hidden rounded-md bg-surface-2"
                    aria-label={`${count} ${count === 1 ? 'win' : 'wins'} in ${i + 1} ${i === 0 ? 'guess' : 'guesses'}`}
                  >
                    {count > 0 ? (
                      <m.div
                        className={`tabular flex h-full items-center justify-end rounded-md px-2 text-xs font-bold ${
                          isHighlight ? 'bg-correct text-correct-ink' : 'bg-surface-3 text-text'
                        }`}
                        initial={reducedMotion ? false : { width: '0%' }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.55, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {count}
                      </m.div>
                    ) : (
                      <span className="tabular absolute inset-y-0 left-2 flex items-center text-xs text-subtle">0</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
