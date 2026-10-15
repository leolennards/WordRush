import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { Gift, Package } from 'lucide-react';
import type { ShopItem } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';
import { playCue } from '@/lib/audio/sound';
import { buzz } from '@/lib/haptics';
import { Coin } from './Coin';
import { ItemPreview } from './Previews';
import { KIND_LABEL } from './kinds';

export interface Prize {
  item: ShopItem | null;
  coins: number;
}

/**
 * A box that shakes, bursts open and shows what was inside: a mystery box, or a
 * friend's gift. `prize` may arrive after opening starts (a gift is claimed first).
 */
export function Reveal({
  kind,
  eyebrow,
  prize,
  onUse,
  onClose,
}: {
  kind: 'mystery' | 'gift';
  eyebrow: string;
  prize: Prize | null;
  onUse?: (item: ShopItem) => void;
  onClose: () => void;
}) {
  const { settings, reducedMotion } = useSettings();
  const [opened, setOpened] = useState(reducedMotion);
  const close = useRef<HTMLButtonElement>(null);

  // Shake for a moment, then burst open once the prize is known.
  useEffect(() => {
    if (opened || !prize) return;
    const t = window.setTimeout(() => {
      setOpened(true);
      if (settings.sound) playCue('win');
      if (settings.haptics) buzz('win');
    }, 1100);
    return () => window.clearTimeout(t);
  }, [opened, prize, settings.sound, settings.haptics]);

  useEffect(() => {
    if (opened) close.current?.focus();
  }, [opened]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && opened && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, onClose]);

  const Icon = kind === 'gift' ? Gift : Package;
  const shown = opened && prize;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={eyebrow}>
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-xs overflow-hidden rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-lg"
      >
        <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{eyebrow}</p>
        <div className="relative mx-auto my-5 grid h-36 place-items-center">
          <AnimatePresence mode="popLayout">
            {!shown ? (
              <m.div
                key="box"
                className={`grid size-28 place-items-center rounded-3xl text-white shadow-lg ${
                  kind === 'gift' ? 'bg-gradient-to-br from-rose-500 to-fuchsia-600' : 'bg-gradient-to-br from-violet-500 to-indigo-700'
                }`}
                animate={reducedMotion ? undefined : { rotate: [0, -8, 8, -10, 10, -6, 6, 0], scale: [1, 1.04, 1, 1.06, 1, 1.08, 1.1] }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
                exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
              >
                <Icon className="size-14" aria-hidden />
              </m.div>
            ) : (
              <m.div
                key="prize"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 15 }}
                className="flex w-full flex-col items-center gap-2"
              >
                {prize.item ? (
                  <ItemPreview item={prize.item} />
                ) : (
                  <p className="tabular flex items-center gap-2 text-4xl font-black">
                    <Coin className="size-12" hero /> +{prize.coins}
                  </p>
                )}
              </m.div>
            )}
          </AnimatePresence>
          {shown &&
            !reducedMotion &&
            Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              return (
                <m.span
                  key={i}
                  className="pointer-events-none absolute size-2.5 rounded-full"
                  style={{ background: ['#facc15', '#f472b6', '#38bdf8', '#a3e635'][i % 4] }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: Math.cos(a) * 120, y: Math.sin(a) * 90, opacity: 0, scale: [1, 1.4, 0.4] }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden
                />
              );
            })}
        </div>
        <div aria-live="polite">
          {shown ? (
            prize.item ? (
              <>
                <p className="text-xl font-extrabold">{prize.item.name}</p>
                <p className="text-sm text-muted">New {KIND_LABEL[prize.item.kind]}</p>
              </>
            ) : (
              <p className="text-xl font-extrabold">{prize.coins} coins!</p>
            )
          ) : (
            <p className="text-sm font-semibold text-muted">Opening…</p>
          )}
        </div>
        {shown && (
          <div className="mt-5 flex gap-2">
            {prize.item && onUse && (
              <button
                type="button"
                onClick={() => {
                  onUse(prize.item!);
                  onClose();
                }}
                className="min-h-11 flex-1 rounded-xl bg-accent px-3 text-sm font-bold text-accent-ink transition active:scale-[0.97]"
              >
                Use it
              </button>
            )}
            <button
              ref={close}
              type="button"
              onClick={onClose}
              className="min-h-11 flex-1 rounded-xl bg-surface-2 px-3 text-sm font-bold transition hover:bg-surface-3 active:scale-[0.97]"
            >
              {prize.item ? 'Later' : 'Nice!'}
            </button>
          </div>
        )}
      </m.div>
    </div>,
    document.body,
  );
}
