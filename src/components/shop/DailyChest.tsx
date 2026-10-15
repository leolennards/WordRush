import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Clock3, Gift } from 'lucide-react';
import { GAME } from '@/config/game';
import { CHEST, chestReady, dayIndexFor } from '@/engine';
import { useServices } from '@/app/services';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useCountdown } from '@/hooks/useToday';
import { playCue } from '@/lib/audio/sound';
import { buzz } from '@/lib/haptics';
import { useToast } from '@/components/layout/Toasts';
import { Coin } from './Coin';

/** A treasure chest with a lid that can swing open. */
function Chest({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="size-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="chest-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b45309" />
          <stop offset="1" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="chest-band" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Gold glowing inside once open. */}
      {open && <ellipse cx="32" cy="32" rx="20" ry="6" fill="#fde68a" opacity="0.9" />}
      <rect x="8" y="30" width="48" height="26" rx="4" fill="url(#chest-wood)" />
      <rect x="8" y="30" width="48" height="5" fill="url(#chest-band)" />
      <rect x="14" y="30" width="5" height="26" fill="url(#chest-band)" />
      <rect x="45" y="30" width="5" height="26" fill="url(#chest-band)" />
      <rect x="28" y="36" width="8" height="9" rx="1.5" fill="url(#chest-band)" />
      <circle cx="32" cy="40" r="1.5" fill="#78350f" />
      <m.g
        style={{ originX: '50%', originY: '100%', transformBox: 'fill-box' }}
        animate={open ? { y: -10, rotate: -18, x: -6 } : { rotate: 0, y: 0, x: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
      >
        <path d="M8 31 V22 a24 12 0 0 1 48 0 V31 z" fill="url(#chest-wood)" />
        <path d="M14 31 V16.5 h5 V31z M45 31 V16.5 h5 V31z" fill="url(#chest-band)" />
        <path d="M8 29 h48 v3 H8z" fill="url(#chest-band)" />
      </m.g>
    </svg>
  );
}

/** Today's free coin chest: once a day, a handful of coins. */
export function DailyChest() {
  const { progress, claimChest } = useProgress();
  const { settings } = useSettings();
  const { now } = useServices();
  const { toast } = useToast();
  const countdown = useCountdown(now);
  const day = dayIndexFor(now(), GAME.dailyEpoch);
  const ready = chestReady(progress, day);
  const [won, setWon] = useState<number | null>(null);

  const open = () => {
    const coins = claimChest();
    if (coins === null) return;
    setWon(coins);
    if (settings.sound) playCue('win');
    if (settings.haptics) buzz('win');
    toast(`+${coins} coins from the daily chest`);
  };

  const opened = !ready || won !== null;
  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 }}
      className="chest-card relative mt-4 flex items-center gap-4 overflow-hidden rounded-[var(--radius-card)] p-4 text-white shadow-md"
      aria-label="Daily chest"
    >
      <div className="relative size-16 shrink-0">
        {!opened && <span className="chest-glow absolute -inset-3 rounded-full" aria-hidden />}
        <div className={`relative size-full ${opened ? '' : 'chest-ready'}`}>
          <Chest open={opened} />
        </div>
        <AnimatePresence>
          {won !== null && (
            <>
              {Array.from({ length: 10 }, (_, i) => {
                const angle = -Math.PI / 2 + ((i - 4.5) / 10) * Math.PI * 1.1;
                return (
                  <m.span
                    key={i}
                    className="absolute top-1/3 left-1/2 -ml-2.5"
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                    animate={{ x: Math.cos(angle) * 70, y: [0, Math.sin(angle) * 70, Math.sin(angle) * 70 + 50], scale: 1, opacity: [1, 1, 0], rotate: 360 }}
                    transition={{ duration: 1.2, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden
                  >
                    <Coin className="size-5" />
                  </m.span>
                );
              })}
            </>
          )}
        </AnimatePresence>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-white/75 uppercase">
          <Gift className="size-3.5" aria-hidden /> Daily chest
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          {won !== null ? (
            <m.p
              key="won"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="tabular flex items-center gap-1.5 text-2xl font-black"
            >
              +{won} <Coin className="size-6" />
            </m.p>
          ) : ready ? (
            <m.p key="ready" className="text-[0.95rem] leading-snug font-bold">
              Up to {CHEST.max} free coins, every day!
            </m.p>
          ) : (
            <m.p key="done" className="text-[0.95rem] leading-snug font-bold">
              Opened today
            </m.p>
          )}
        </AnimatePresence>
        {opened && (
          <p className="tabular mt-0.5 flex items-center gap-1 text-xs text-white/75">
            <Clock3 className="size-3" aria-hidden /> Next chest in {countdown}
          </p>
        )}
      </div>
      {!opened && (
        <button
          type="button"
          onClick={open}
          className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-violet-700 shadow transition hover:bg-white/90 active:scale-95"
        >
          Open
        </button>
      )}
    </m.section>
  );
}
