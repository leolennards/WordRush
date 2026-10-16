import { useEffect, useRef } from 'react';
import { Check, Lock, Type, Volume2 } from 'lucide-react';
import { ACCENTS, LEVEL_REWARDS, REWARD_KIND, SKINS, tilePal, type LevelReward, type WinFxId } from '@/engine';
import { Avatar, BadgeIcon } from '@/components/friends/Avatar';
import { TilePalArt } from '@/components/friends/TilePalArt';
import { FxIcon } from '@/components/shop/FxIcon';

/** A small picture of a level reward. */
export function RewardPreview({ reward }: { reward: LevelReward }) {
  switch (reward.kind) {
    case 'skin': {
      const s = SKINS.find((x) => x.id === reward.id);
      return (
        <span className="flex gap-0.5">
          {s?.swatch.map((c) => <span key={c} className="size-4 rounded" style={{ background: c }} />)}
        </span>
      );
    }
    case 'tiles':
      return (
        <span className="tile size-7 text-xs!" data-state="correct" data-style={reward.id}>
          W
        </span>
      );
    case 'keys':
      return (
        <span className="key grid h-7 w-6 place-items-center text-xs" data-keyskin={reward.id}>
          K
        </span>
      );
    case 'sound':
      return <Volume2 className="size-6 text-accent" aria-hidden />;
    case 'fx':
      return <FxIcon id={reward.id as WinFxId} className="size-6" />;
    case 'bg':
      return <span className="scene-thumb block h-6 w-10 rounded-md" data-scene={reward.id} />;
    case 'accent':
      return <span className="block size-6 rounded-full" style={{ background: ACCENTS.find((a) => a.id === reward.id)?.swatch }} />;
    case 'frame':
      return <Avatar uid="me" name="W" size="sm" look={{ frame: reward.id, badge: null }} />;
    case 'badge':
      return <BadgeIcon id={reward.id} className="size-6" />;
    case 'title':
      return <Type className="size-6 text-accent" aria-hidden />;
    case 'banner':
      return <span className="profile-banner block h-6 w-10 rounded-md" data-banner={reward.id} />;
    case 'pal': {
      const p = tilePal(reward.id);
      return p ? <TilePalArt pal={p} className="size-8" /> : null;
    }
  }
}

/** Every level that brings a reward, as a road you travel along. */
export function LevelRoad({ level }: { level: number }) {
  const levels = [...new Set(LEVEL_REWARDS.map((r) => r.level))];
  const next = levels.find((l) => l > level);
  const row = useRef<HTMLOListElement>(null);
  const nextRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = nextRef.current;
    const box = row.current;
    if (el && box) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2;
  }, []);
  return (
    <ol ref={row} className="no-scrollbar relative -mx-4 flex items-start gap-3 overflow-x-auto px-4 pt-1 pb-2" aria-label="Level rewards">
      {levels.map((l) => {
        const reached = level >= l;
        const isNext = l === next;
        const rewards = LEVEL_REWARDS.filter((r) => r.level === l);
        return (
          <li
            key={l}
            ref={isNext ? nextRef : undefined}
            className={`level-stop relative flex w-36 shrink-0 flex-col gap-2 rounded-2xl border p-3 ${
              reached ? 'border-accent/40 bg-accent/8' : isNext ? 'border-present ring-2 ring-present/30' : 'border-border bg-surface'
            }`}
            data-next={isNext || undefined}
          >
            <span className="flex items-center justify-between">
              <span
                className={`grid size-8 place-items-center rounded-xl text-sm font-black ${
                  reached ? 'bg-accent text-accent-ink' : isNext ? 'bg-present text-present-ink' : 'bg-surface-2 text-muted'
                }`}
              >
                {l}
              </span>
              {reached ? (
                <Check className="size-4 text-accent" aria-label="Unlocked" />
              ) : (
                <Lock className="size-3.5 text-subtle" aria-label="Locked" />
              )}
            </span>
            {rewards.map((r) => (
              <span key={`${r.kind}-${r.id}`} className={`flex items-center gap-2 ${reached ? '' : 'opacity-60'}`}>
                <span className="grid h-8 w-10 shrink-0 place-items-center">
                  <RewardPreview reward={r} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{r.name}</span>
                  <span className="block text-[0.65rem] text-muted">{REWARD_KIND[r.kind]}</span>
                </span>
              </span>
            ))}
            {isNext && <span className="text-[0.65rem] font-bold tracking-wide text-present uppercase">Up next</span>}
          </li>
        );
      })}
    </ol>
  );
}
