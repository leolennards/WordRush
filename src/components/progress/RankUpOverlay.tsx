import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { SKINS, type Rank } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';
import { Celebration } from '@/components/layout/Celebration';
import { Button } from '@/components/ui';
import { RankBadge } from './RankBadge';

/** Full-screen moment for reaching a new rank. */
export function RankUpOverlay({ show, onClose }: { show: { rank: Rank; level: number } | null; onClose: () => void }) {
  return createPortal(
    <AnimatePresence>{show && <Panel rank={show.rank} level={show.level} onClose={onClose} />}</AnimatePresence>,
    document.body,
  );
}

function Panel({ rank, level, onClose }: { rank: Rank; level: number; onClose: () => void }) {
  const { update, reducedMotion } = useSettings();
  const skin = SKINS.find((s) => s.id === rank.unlocks);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={`New rank: ${rank.name}`}
      className="fixed inset-0 z-[70] grid place-items-center overflow-hidden p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 bg-[var(--c-overlay)] backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        className="rankup-glow pointer-events-none absolute inset-0"
        style={{ ['--from' as string]: rank.from, ['--to' as string]: rank.to }}
        aria-hidden
      />
      <m.div
        className="relative flex w-full max-w-sm flex-col items-center rounded-[1.75rem] border border-border bg-surface px-6 pt-8 pb-6 text-center shadow-lg"
        initial={{ y: 30, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {!reducedMotion && <Celebration seed={level} />}
        <m.p
          className="text-xs font-black tracking-[0.3em] text-muted uppercase"
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.3em' }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          New rank
        </m.p>
        <m.div
          className="my-5"
          initial={reducedMotion ? false : { scale: 0.2, rotate: -40, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.25 }}
        >
          <RankBadge level={level} rank={rank} size="xl" />
        </m.div>
        <m.p
          className="rank-title text-3xl font-black tracking-tight"
          style={{ ['--from' as string]: rank.from, ['--to' as string]: rank.to }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          {rank.name}
        </m.p>
        <m.p className="tabular mt-1 text-sm text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          You reached level {level}.
        </m.p>
        {skin && (
          <m.div
            className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
          >
            <span className="flex gap-1" aria-hidden>
              {skin.swatch.map((c, i) => (
                <span key={i} className="size-6 rounded-md" style={{ background: c }} />
              ))}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block text-[0.65rem] font-bold tracking-[0.12em] text-muted uppercase">Unlocked</span>
              <span className="font-bold">{skin.name} tiles</span>
            </span>
            <Button
              variant="secondary"
              className="min-h-9 px-3"
              onClick={() => {
                update({ skin: skin.id });
                onClose();
              }}
            >
              Use it
            </Button>
          </m.div>
        )}
        <Button ref={button} variant="primary" className="mt-5 w-full" onClick={onClose}>
          Continue
        </Button>
      </m.div>
    </m.div>
  );
}
