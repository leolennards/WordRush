import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Volume2 } from 'lucide-react';
import type { ShopItem, SkinId, WinFxId } from '@/engine';
import type { Settings } from '@/lib/storage/schemas';
import { useSettings } from '@/features/settings/SettingsContext';
import { titleTier } from './kinds';
import { previewPack } from '@/lib/audio/sound';
import { Celebration } from '@/components/layout/Celebration';
import { FxIcon } from './FxIcon';

const TILES = [
  { l: 'w', s: 'correct' },
  { l: 'o', s: 'present' },
  { l: 'r', s: 'absent' },
  { l: 'd', s: 'correct' },
  { l: 's', s: 'present' },
] as const;

const KEYS = [
  { l: 'W', s: 'correct' },
  { l: 'O', s: 'present' },
  { l: 'R', s: undefined },
  { l: 'D', s: undefined },
  { l: 'S', s: 'absent' },
] as const;

/** A live preview of any shop item, in your current colours where it isn't colours itself. */
export function ItemPreview({ item, still = false }: { item: ShopItem; still?: boolean }) {
  const { settings, resolvedTheme } = useSettings();
  const dark = resolvedTheme === 'dark';
  switch (item.kind) {
    case 'fx':
      return still ? (
        <span className={stillTile}>
          <FxIcon id={item.ref as WinFxId} className="size-7" />
        </span>
      ) : (
        <FxPreview item={item} />
      );
    case 'sound':
      return still ? (
        <span className={stillTile}>
          <Volume2 className="size-7 text-accent" aria-hidden />
        </span>
      ) : (
        <SoundPreview item={item} />
      );
    case 'title':
      return (
        <span
          className="grid aspect-[5/2] w-full max-w-[12.5rem] place-items-center rounded-xl bg-surface-2"
          role="img"
          aria-label={`Preview of ${item.name}`}
        >
          <span className="profile-title text-base font-extrabold" data-tier={titleTier(item)}>
            {item.name}
          </span>
        </span>
      );
    case 'keys':
      return (
        <div
          className={`grid w-full max-w-[12.5rem] grid-cols-5 gap-1 ${dark ? 'dark' : ''}`}
          data-skin={settings.skin}
          role="img"
          aria-label={`Preview of ${item.name}`}
        >
          {KEYS.map((k, i) => (
            <span
              key={i}
              className="key grid h-9 place-items-center text-sm"
              data-state={k.s}
              data-keyskin={item.ref}
              aria-hidden
            >
              {k.l}
            </span>
          ))}
        </div>
      );
    default: {
      const isSkin = item.kind === 'skin';
      return (
        <div
          className={`grid w-full max-w-[12.5rem] grid-cols-5 gap-1 ${dark ? 'dark' : ''}`}
          data-skin={isSkin ? item.ref : (settings.skin as SkinId)}
          role="img"
          aria-label={`Preview of ${item.name}`}
        >
          {TILES.map((t, i) => (
            <span
              key={i}
              className="tile aspect-square w-full text-sm!"
              data-state={t.s}
              {...(!isSkin ? { 'data-style': item.ref } : {})}
              aria-hidden
            >
              {t.l}
            </span>
          ))}
        </div>
      );
    }
  }
}

const stillTile = 'grid aspect-[5/2] w-full max-w-[12.5rem] place-items-center rounded-xl bg-surface-2';

const previewButton =
  'group grid aspect-[5/1] w-full max-w-[12.5rem] place-items-center rounded-xl bg-surface-2 transition hover:bg-surface-3 active:scale-[0.97]';

/** A win effect: tap to watch it play over the screen, as it does when you win. */
function FxPreview({ item }: { item: ShopItem }) {
  const { reducedMotion } = useSettings();
  const [play, setPlay] = useState(0);
  const fx = item.ref as WinFxId;
  useEffect(() => {
    if (!play) return;
    const t = window.setTimeout(() => setPlay(0), 2800);
    return () => window.clearTimeout(t);
  }, [play]);
  return (
    <>
      <button type="button" onClick={() => setPlay((n) => n + 1)} className={previewButton} aria-label={`Watch ${item.name}`}>
        <span className="flex items-center gap-2 text-xs font-bold text-muted group-hover:text-text">
          <FxIcon id={fx} className="size-5" />
          <Play className="size-3.5 fill-current" aria-hidden /> Watch
        </span>
      </button>
      {play > 0 &&
        !reducedMotion &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-50" key={play}>
            <Celebration seed={play * 7 + item.price} fx={fx} />
          </div>,
          document.body,
        )}
    </>
  );
}

/** A sound pack: tap to hear a few keys, a reveal and a win. */
function SoundPreview({ item }: { item: ShopItem }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setPlaying(false), 1300);
    return () => window.clearTimeout(t);
  }, [playing]);
  return (
    <button
      type="button"
      onClick={() => {
        previewPack(item.ref as Settings['soundPack']);
        setPlaying(true);
      }}
      className={previewButton}
      aria-label={`Listen to ${item.name}`}
    >
      <span className="flex items-center gap-2 text-xs font-bold text-muted group-hover:text-text">
        <Volume2 className={`size-5 text-accent ${playing ? 'animate-pulse' : ''}`} aria-hidden />
        <span className="flex h-4 items-end gap-0.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-current transition-all"
              style={{
                height: playing ? `${[60, 100, 40, 80][i]}%` : '30%',
                transitionDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </span>
        Listen
      </span>
    </button>
  );
}
