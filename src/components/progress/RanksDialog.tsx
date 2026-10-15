import { Lock } from 'lucide-react';
import { RANKS, SKINS, levelFor, rankFor, xpForLevel } from '@/engine';
import { useProgress } from '@/features/progress/ProgressContext';
import { Dialog } from '@/components/dialogs/Dialog';
import { RankBadge } from './RankBadge';
import { ThemePicker } from './ThemePicker';

/** Every rank with its emblem, and the tile themes they unlock. */
export function RanksDialog({ open, onClose, onShop }: { open: boolean; onClose: () => void; onShop?: () => void }) {
  const { progress } = useProgress();
  const { level, into, span } = levelFor(progress.xp);
  const { rank, next } = rankFor(level);
  const toNext = next ? xpForLevel(next.minLevel) - progress.xp : 0;

  return (
    <Dialog open={open} onClose={onClose} title="Ranks and themes">
      <div className="space-y-6 pt-1">
        <section className="relative overflow-hidden rounded-2xl bg-surface-2 px-4 pt-6 pb-5 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{ background: `radial-gradient(60% 70% at 50% 25%, ${rank.from}, transparent 70%)` }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <RankBadge level={level} rank={rank} size="lg" />
            <p className="mt-3 text-xs font-bold tracking-[0.14em] text-muted uppercase">Your rank</p>
            <p className="rank-title text-2xl font-black tracking-tight" style={{ ['--from' as string]: rank.from, ['--to' as string]: rank.to }}>
              {rank.name}
            </p>
            <p className="tabular mt-0.5 text-sm text-muted">
              Level {level} · {into}/{span} XP
            </p>
            {next && (
              <p className="tabular mt-2 text-xs text-muted">
                <strong className="text-text">{next.name}</strong> at level {next.minLevel} · {toNext.toLocaleString()} XP to go
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="ranks-list">
          <h3 id="ranks-list" className="mb-2 text-sm font-bold">
            All ranks
          </h3>
          <ol className="space-y-1.5">
            {RANKS.map((r) => {
              const reached = level >= r.minLevel;
              const current = r.id === rank.id;
              const skin = SKINS.find((s) => s.id === r.unlocks);
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl p-2 pr-3 ${current ? 'bg-surface-2 ring-1 ring-border-strong' : ''}`}
                >
                  <RankBadge level={r.minLevel} rank={r} size="sm" locked={!reached} showLevel={false} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-bold ${reached ? '' : 'text-muted'}`}>
                      {r.name}
                      {current && <span className="ml-2 text-xs font-semibold text-accent">You</span>}
                    </span>
                    <span className="block text-xs text-muted">
                      Level {r.minLevel}
                      {r.id === 'legend' ? '+' : ''}
                      {skin ? ` · unlocks ${skin.name} tiles` : ''}
                    </span>
                  </span>
                  {!reached && <Lock className="size-4 text-subtle" aria-hidden />}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="skins-list">
          <h3 id="skins-list" className="mb-2 text-sm font-bold">
            Tile themes
          </h3>
          <ThemePicker level={level} onShop={onShop} />
        </section>
      </div>
    </Dialog>
  );
}
