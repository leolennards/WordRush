import { useState, type ReactNode } from 'react';
import { Check, ShoppingBag, Volume2 } from 'lucide-react';
import {
  KEY_SKINS,
  SKINS,
  SOUND_PACKS,
  TILE_STYLES,
  WIN_EFFECTS,
  cosmeticUnlocked,
  skinUnlocked,
  type CosmeticKind,
  type WinFxId,
} from '@/engine';
import type { Settings } from '@/lib/storage/schemas';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { FxIcon } from '@/components/shop/FxIcon';
import { previewPack } from '@/lib/audio/sound';

type Tab = 'skin' | Exclude<CosmeticKind, 'title'>;

const TABS: { value: Tab; label: string; setting: keyof Settings }[] = [
  { value: 'skin', label: 'Colours', setting: 'skin' },
  { value: 'tiles', label: 'Styles', setting: 'tileStyle' },
  { value: 'keys', label: 'Keyboard', setting: 'keySkin' },
  { value: 'sound', label: 'Sound', setting: 'soundPack' },
  { value: 'fx', label: 'Win effect', setting: 'winFx' },
];

const LISTS: Record<Exclude<Tab, 'skin'>, readonly { id: string; name: string; price?: number; level?: number }[]> = {
  tiles: TILE_STYLES,
  keys: KEY_SKINS,
  sound: SOUND_PACKS,
  fx: WIN_EFFECTS,
};

const PREVIEW = [
  { l: 't', s: 'correct' },
  { l: 'i', s: 'present' },
  { l: 'l', s: 'absent' },
  { l: 'e', s: 'correct' },
  { l: 's', s: 'present' },
] as const;

/**
 * Your look: tile colours, styles, keyboard, sound and win effect. Shows only what you own or have unlocked, with a live preview.
 */
export function ThemePicker({ level, onShop }: { level: number; onShop?: () => void }) {
  const { settings, update } = useSettings();
  const { progress } = useProgress();
  const [tab, setTab] = useState<Tab>('skin');
  const current = TABS.find((t) => t.value === tab)!;

  // Everything you can use in this tab, and how many more are out there.
  const all =
    tab === 'skin'
      ? SKINS.filter((s) => !s.season || skinUnlocked(s.id, level, progress.owned)).map((s) => ({ id: s.id, name: s.name, price: s.price, level: s.free || s.price !== undefined ? undefined : s.minLevel }))
      : LISTS[tab].filter((c) => !('season' in c) || cosmeticUnlocked(tab, c.id, progress.owned, level));
  const usable = (id: string) =>
    tab === 'skin' ? skinUnlocked(id as Settings['skin'], level, progress.owned) : cosmeticUnlocked(tab, id, progress.owned, level);
  const mine = all.filter((c) => usable(c.id));
  const inShop = all.filter((c) => !usable(c.id) && c.price !== undefined).length;
  const byLevel = all.filter((c) => !usable(c.id) && c.level !== undefined);

  const look = (id: string, name: string): ReactNode => {
    switch (tab) {
      case 'skin': {
        const s = SKINS.find((x) => x.id === id)!;
        return (
          <span className="flex gap-1">
            {s.swatch.map((c, i) => (
              <span
                key={i}
                className={`grid size-7 place-items-center rounded-md text-xs font-black text-white ${s.animated ? 'swatch-flow' : ''}`}
                style={{ background: s.animated ? `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[1]}, ${s.swatch[0]})` : c }}
              >
                {'WS'[i]}
              </span>
            ))}
          </span>
        );
      }
      case 'tiles':
        return (
          <span className="flex gap-1">
            <span className="tile size-7 text-xs!" data-state="correct" data-style={id}>
              W
            </span>
            <span className="tile size-7 text-xs!" data-state="present" data-style={id}>
              S
            </span>
          </span>
        );
      case 'keys':
        return (
          <span className="flex gap-0.5">
            {(['correct', undefined] as const).map((st, i) => (
              <span key={i} className="key grid h-7 w-6 place-items-center text-[0.7rem]" data-state={st} data-keyskin={id}>
                {'WS'[i]}
              </span>
            ))}
          </span>
        );
      case 'sound':
        return <Volume2 className="size-6 text-accent" aria-hidden />;
      case 'fx':
        return <FxIcon id={id as WinFxId} className="size-6" />;
      default:
        return name;
    }
  };

  return (
    <div className="space-y-3">
      {/* Live preview in the current look. */}
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2 py-3" role="img" aria-label="Preview of your current look">
        <span className="flex gap-1.5">
          {PREVIEW.map((t, i) => (
            <span key={i} className="tile size-10 text-lg!" data-state={t.s}>
              {t.l}
            </span>
          ))}
        </span>
        <span className="flex gap-1">
          {['Q', 'W', 'E', 'R', 'T'].map((k, i) => (
            <span key={k} className="key grid h-8 w-7 place-items-center text-xs" data-state={i === 1 ? 'correct' : i === 3 ? 'present' : undefined}>
              {k}
            </span>
          ))}
        </span>
      </div>

      <div role="tablist" aria-label="What to change" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
              tab === t.value ? 'bg-ink text-ink-text' : 'bg-surface-2 text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label={current.label} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {mine.map((c) => {
          const on = settings[current.setting] === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.name}
              onClick={() => {
                update({ [current.setting]: c.id } as Partial<Settings>);
                if (tab === 'sound') previewPack(c.id as Settings['soundPack']);
              }}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition active:scale-[0.97] ${
                on ? 'border-accent bg-accent/8 ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
              }`}
            >
              <span className="grid h-8 place-items-center" aria-hidden>
                {look(c.id, c.name)}
              </span>
              <span className="text-center text-xs leading-tight font-semibold">{c.name}</span>
              {on && (
                <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-accent text-accent-ink">
                  <Check className="size-3" aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {(inShop > 0 || byLevel.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
          <span>
            {inShop > 0 && `${inShop} more in the shop`}
            {inShop > 0 && byLevel.length > 0 && ' · '}
            {byLevel.length > 0 && `next unlock at level ${Math.min(...byLevel.map((c) => c.level!))}`}
          </span>
          {onShop && inShop > 0 && (
            <button
              type="button"
              onClick={onShop}
              className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 font-semibold text-text transition hover:bg-surface-3"
            >
              <ShoppingBag className="size-3.5" aria-hidden /> Shop
            </button>
          )}
        </div>
      )}
      {settings.highContrast && <p className="text-xs text-muted">The colour-accessible palette is on, so tiles use orange and blue.</p>}
    </div>
  );
}
