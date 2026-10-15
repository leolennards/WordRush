import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { coinBalance } from '@/engine';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { Coin } from './Coin';

/** The coin balance in the header. Pops and floats "+N" whenever coins come in. */
export function CoinChip({ onClick }: { onClick: () => void }) {
  const { progress } = useProgress();
  const balance = coinBalance(progress);
  const last = useRef(balance);
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);

  useEffect(() => {
    const diff = balance - last.current;
    last.current = balance;
    if (diff <= 0) return;
    setGain({ n: diff, key: Date.now() });
    const t = window.setTimeout(() => setGain(null), 1800);
    return () => window.clearTimeout(t);
  }, [balance]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${balance} coins — open the shop`}
      className="relative mr-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface pr-3 pl-1.5 text-sm font-bold shadow-sm transition hover:border-border-strong hover:shadow-md active:scale-95"
    >
      <m.span
        key={gain?.key ?? 0}
        initial={gain ? { rotateY: 0, scale: 1.25 } : false}
        animate={{ rotateY: 360, scale: 1 }}
        transition={{ duration: 0.7 }}
      >
        <Coin className="size-6" />
      </m.span>
      <span className="tabular">
        <Rolling value={balance} />
      </span>
      <AnimatePresence>
        {gain && (
          <m.span
            key={gain.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 22 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="tabular pointer-events-none absolute right-1 top-full -mt-5 rounded-full bg-present px-2 py-0.5 text-xs font-black whitespace-nowrap text-present-ink shadow-md"
            aria-live="polite"
          >
            +{gain.n}
          </m.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** Rolls from the previous number to the new one. */
export function Rolling({ value }: { value: number }) {
  const { reducedMotion } = useSettings();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reducedMotion) {
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let frame = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      setShown(v);
      from.current = v;
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);
  return <>{reducedMotion ? value : shown}</>;
}
