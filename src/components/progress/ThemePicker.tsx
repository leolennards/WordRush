import { Check, Lock } from 'lucide-react';
import { SKINS, type Skin } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';

const PREVIEW = [
  { l: 't', s: 'correct' },
  { l: 'i', s: 'present' },
  { l: 'l', s: 'absent' },
  { l: 'e', s: 'correct' },
  { l: 's', s: 'present' },
] as const;

/** Tile themes: free ones first, then those unlocked by rank, with a live preview. */
export function ThemePicker({ level }: { level: number }) {
  const { settings, update } = useSettings();
  const free = SKINS.filter((s) => s.free);
  const ranked = SKINS.filter((s) => !s.free);

  const swatch = (s: Skin) => {
    const unlocked = level >= s.minLevel;
    const on = settings.skin === s.id;
    return (
      <button
        key={s.id}
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={unlocked ? `${s.name} tiles` : `${s.name} tiles, unlocks at level ${s.minLevel}`}
        disabled={!unlocked}
        onClick={() => update({ skin: s.id })}
        className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition active:scale-[0.97] ${
          on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
        } disabled:cursor-not-allowed`}
      >
        <span className={`flex gap-1 ${unlocked ? '' : 'opacity-35 grayscale'}`} aria-hidden>
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
        <span className={`text-xs font-semibold ${unlocked ? '' : 'text-muted'}`}>{s.name}</span>
        {on && (
          <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-accent text-accent-ink">
            <Check className="size-3" aria-hidden />
          </span>
        )}
        {!unlocked && (
          <span className="tabular flex items-center gap-0.5 text-[0.65rem] text-subtle">
            <Lock className="size-2.5" aria-hidden /> Level {s.minLevel}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Live preview in the current theme. */}
      <div className="flex justify-center gap-1.5 rounded-2xl bg-surface-2 py-3" role="img" aria-label="Preview of the current tile theme">
        {PREVIEW.map((t, i) => (
          <span key={i} className="tile size-10 text-lg!" data-state={t.s} aria-hidden>
            {t.l}
          </span>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Free</p>
        <div role="radiogroup" aria-label="Free tile themes" className="grid grid-cols-4 gap-2">
          {free.map(swatch)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Unlocked by rank</p>
        <div role="radiogroup" aria-label="Rank tile themes" className="grid grid-cols-4 gap-2">
          {ranked.map(swatch)}
        </div>
      </div>
      {settings.highContrast && (
        <p className="text-xs text-muted">The colour-accessible palette is on, so tiles use orange and blue.</p>
      )}
    </div>
  );
}
