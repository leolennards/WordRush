import type { ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';
import {
  ACCENTS,
  BACKGROUNDS,
  KEY_SKINS,
  SKINS,
  SOUND_PACKS,
  TILE_STYLES,
  WIN_EFFECTS,
  cosmeticUnlocked,
  owns,
  skinUnlocked,
  tileStyleUnlocked,
  winFxUnlocked,
  type Skin,
  type TileStyle,
  type WinFx,
} from '@/engine';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { Coin } from '@/components/shop/Coin';
import { FxIcon } from '@/components/shop/FxIcon';
import { LockTag } from '@/components/shop/LockTag';
import { lockLabel } from '@/components/shop/kinds';
import { previewPack } from '@/lib/audio/sound';
import { Volume2 } from 'lucide-react';
import type { Settings } from '@/lib/storage/schemas';

type Extra = 'keys' | 'sound' | 'bg' | 'accent';
const EXTRA_SETTING: Record<Extra, 'keySkin' | 'soundPack' | 'background' | 'accent'> = {
  keys: 'keySkin',
  sound: 'soundPack',
  bg: 'background',
  accent: 'accent',
};

const PREVIEW = [
  { l: 't', s: 'correct' },
  { l: 'i', s: 'present' },
  { l: 'l', s: 'absent' },
  { l: 'e', s: 'correct' },
  { l: 's', s: 'present' },
] as const;

/** Tile themes (free, by rank, from the shop), tile styles, keyboards, sounds, win effects, frames and badges. */
export function ThemePicker({ level, onShop }: { level: number; onShop?: () => void }) {
  const { settings, update } = useSettings();
  const { progress } = useProgress();
  const free = SKINS.filter((s) => s.free);
  const ranked = SKINS.filter((s) => !s.free && s.price === undefined);
  const shop = SKINS.filter((s) => s.price !== undefined && (!s.season || skinUnlocked(s.id, level, progress.owned)));

  const swatch = (s: Skin) => {
    const unlocked = skinUnlocked(s.id, level, progress.owned);
    const on = settings.skin === s.id;
    const lockLabel = s.price !== undefined ? `${s.price} coins in the shop` : `unlocks at level ${s.minLevel}`;
    return (
      <button
        key={s.id}
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={unlocked ? `${s.name} tiles` : `${s.name} tiles, ${lockLabel}`}
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
              style={{
                background: s.animated ? `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[1]}, ${s.swatch[0]})` : c,
              }}
            >
              {'WS'[i]}
            </span>
          ))}
        </span>
        <span className={`text-xs font-semibold ${unlocked ? '' : 'text-muted'}`}>{s.name}</span>
        {on && <OnMark />}
        {!unlocked &&
          (s.price !== undefined ? (
            <span className="tabular flex items-center gap-0.5 text-[0.65rem] text-subtle">
              <Coin className="size-3" /> {s.price}
            </span>
          ) : (
            <span className="tabular flex items-center gap-0.5 text-[0.65rem] text-subtle">
              <Lock className="size-2.5" aria-hidden /> Level {s.minLevel}
            </span>
          ))}
      </button>
    );
  };

  const style = (t: TileStyle) => {
    const unlocked = tileStyleUnlocked(t.id, progress.owned, level);
    const on = settings.tileStyle === t.id;
    return (
      <button
        key={t.id}
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={unlocked ? `${t.name} tile style` : `${t.name} tile style, ${lockLabel(t)}`}
        disabled={!unlocked}
        onClick={() => update({ tileStyle: t.id })}
        className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition active:scale-[0.97] ${
          on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
        } disabled:cursor-not-allowed`}
      >
        <span className={`flex gap-1 ${unlocked ? '' : 'opacity-35 grayscale'}`} aria-hidden>
          <span className="tile size-7 text-xs!" data-state="correct" data-style={t.id}>
            W
          </span>
          <span className="tile size-7 text-xs!" data-state="present" data-style={t.id}>
            S
          </span>
        </span>
        <span className={`text-xs font-semibold ${unlocked ? '' : 'text-muted'}`}>{t.name}</span>
        {on && <OnMark />}
        {!unlocked && <LockTag price={t.price} level={t.level} />}
      </button>
    );
  };

  const effect = (f: WinFx) => {
    const unlocked = winFxUnlocked(f.id, progress.owned, level);
    const on = settings.winFx === f.id;
    return (
      <button
        key={f.id}
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={unlocked ? `${f.name} win effect` : `${f.name} win effect, ${lockLabel(f)}`}
        disabled={!unlocked}
        onClick={() => update({ winFx: f.id })}
        className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition active:scale-[0.97] ${
          on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
        } disabled:cursor-not-allowed`}
      >
        <span className={`grid size-7 place-items-center ${unlocked ? '' : 'opacity-35 grayscale'}`} aria-hidden>
          <FxIcon id={f.id} />
        </span>
        <span className={`text-center text-xs leading-tight font-semibold ${unlocked ? '' : 'text-muted'}`}>{f.name}</span>
        {on && <OnMark />}
        {!unlocked && <LockTag price={f.price} level={f.level} />}
      </button>
    );
  };

  /** A keyboard, sound pack, frame or badge. */
  const extra = (kind: Extra) => (c: { id: string; name: string; price?: number; level?: number }) => {
    const key = EXTRA_SETTING[kind];
    const unlocked = cosmeticUnlocked(kind, c.id, progress.owned, level);
    const on = settings[key] === c.id;
    let look: ReactNode;
    if (kind === 'keys') {
      look = (
        <span className="flex gap-0.5">
          {(['correct', undefined] as const).map((st, i) => (
            <span key={i} className="key grid h-7 w-5 place-items-center text-[0.65rem]" data-state={st} data-keyskin={c.id}>
              {'WS'[i]}
            </span>
          ))}
        </span>
      );
    } else if (kind === 'sound') {
      look = <Volume2 className="size-5 text-accent" aria-hidden />;
    } else if (kind === 'bg') {
      look = <span className="scene-thumb block h-7 w-12 rounded-md" data-scene={c.id} />;
    } else {
      look = <span className="block size-6 rounded-full" style={{ background: ACCENTS.find((a) => a.id === c.id)?.swatch }} />;
    }
    return (
      <button
        key={c.id}
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={unlocked ? c.name : `${c.name}, ${lockLabel(c)}`}
        disabled={!unlocked}
        onClick={() => {
          update({ [key]: c.id } as Partial<Settings>);
          if (kind === 'sound') previewPack(c.id as Settings['soundPack']);
        }}
        className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition active:scale-[0.97] ${
          on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
        } disabled:cursor-not-allowed`}
      >
        <span className={`grid h-8 place-items-center ${unlocked ? '' : 'opacity-35 grayscale'}`} aria-hidden>
          {look}
        </span>
        <span className={`text-center text-xs leading-tight font-semibold ${unlocked ? '' : 'text-muted'}`}>{c.name}</span>
        {on && <OnMark />}
        {!unlocked && <LockTag price={c.price} level={c.level} />}
      </button>
    );
  };

  const ownedShop = shop.filter((s) => owns(progress, `skin:${s.id}`)).length;

  return (
    <div className="space-y-4">
      {/* Live preview in the current theme and style. */}
      <div
        className="flex justify-center gap-1.5 rounded-2xl bg-surface-2 py-3"
        role="img"
        aria-label="Preview of the current tile theme"
      >
        {PREVIEW.map((t, i) => (
          <span key={i} className="tile size-10 text-lg!" data-state={t.s} aria-hidden>
            {t.l}
          </span>
        ))}
      </div>
      <Group title="Free" label="Free tile themes">
        {free.map(swatch)}
      </Group>
      <Group title="Unlocked by rank" label="Rank tile themes">
        {ranked.map(swatch)}
      </Group>
      <Group title={`From the shop · ${ownedShop}/${shop.length}`} label="Shop tile themes">
        {shop.map(swatch)}
      </Group>
      <Group title="Tile style" label="Tile styles">
        {TILE_STYLES.map(style)}
      </Group>
      <Group title="Keyboard" label="Keyboards">
        {KEY_SKINS.map(extra('keys'))}
      </Group>
      <Group title="Sound pack" label="Sound packs">
        {SOUND_PACKS.map(extra('sound'))}
      </Group>
      <Group title="Win effect" label="Win effects">
        {WIN_EFFECTS.filter((f) => !f.season || winFxUnlocked(f.id, progress.owned, level)).map(effect)}
      </Group>
      <Group title="Background" label="Backgrounds">
        {BACKGROUNDS.map(extra('bg'))}
      </Group>
      <Group title="App colour" label="App colours">
        {ACCENTS.map(extra('accent'))}
      </Group>
      <p className="text-xs text-muted">Your picture, frame, badge, title and banner are on your profile: tap your picture at the top.</p>
      {onShop && (
        <button
          type="button"
          onClick={onShop}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-3 active:scale-95"
        >
          <Coin className="size-4" /> Visit the shop
        </button>
      )}
      {settings.highContrast && (
        <p className="text-xs text-muted">The colour-accessible palette is on, so tiles use orange and blue.</p>
      )}
    </div>
  );
}

function Group({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">{title}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2">
        {children}
      </div>
    </div>
  );
}

function OnMark() {
  return (
    <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-accent text-accent-ink">
      <Check className="size-3" aria-hidden />
    </span>
  );
}
