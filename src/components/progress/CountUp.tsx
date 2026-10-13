import { useEffect, useState } from 'react';
import { useSettings } from '@/features/settings/SettingsContext';

/** Counts from 0 up to `value` with an ease-out, e.g. for XP earned. */
export function CountUp({ value, duration = 900, prefix = '', suffix = '' }: { value: number; duration?: number; prefix?: string; suffix?: string }) {
  const { reducedMotion } = useSettings();
  const [shown, setShown] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reducedMotion]);

  return (
    <span className="tabular" aria-label={`${prefix}${value}${suffix}`}>
      <span aria-hidden>
        {prefix}
        {reducedMotion ? value : shown}
        {suffix}
      </span>
    </span>
  );
}
