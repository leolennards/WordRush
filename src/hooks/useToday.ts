import { useEffect, useState } from 'react';
import { GAME } from '@/config/game';
import { dayIndexFor, msUntilNextDay } from '@/engine';

/**
 * Today's daily-challenge index, updated at UTC midnight and whenever the tab
 * becomes visible again (timers are unreliable while a device sleeps).
 */
export function useTodayIndex(now: () => Date): number {
  const [index, setIndex] = useState(() => dayIndexFor(now(), GAME.dailyEpoch));

  useEffect(() => {
    let timer: number | undefined;
    const sync = () => {
      setIndex(dayIndexFor(now(), GAME.dailyEpoch));
      window.clearTimeout(timer);
      // +250ms so we land safely after midnight.
      timer = window.setTimeout(sync, msUntilNextDay(now()) + 250);
    };
    sync();
    const onVisible = () => document.visibilityState === 'visible' && sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', sync);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', sync);
    };
  }, [now]);

  return index;
}

/** Ticking "HH:MM:SS" countdown to the next UTC midnight. */
export function useCountdown(now: () => Date): string {
  const [ms, setMs] = useState(() => msUntilNextDay(now()));
  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilNextDay(now())), 1000);
    return () => window.clearInterval(id);
  }, [now]);
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
