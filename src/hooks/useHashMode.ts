import { useCallback, useEffect, useState } from 'react';
import type { GameMode } from '@/engine';

const read = (): GameMode => (window.location.hash === '#practice' ? 'practice' : 'daily');

/** Keeps the active mode in the URL hash (#practice) so it survives refresh and is linkable. */
export function useHashMode(): [GameMode, (mode: GameMode) => void] {
  const [mode, setModeState] = useState<GameMode>(read);

  useEffect(() => {
    const onChange = () => setModeState(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const setMode = useCallback((next: GameMode) => {
    const url = `${window.location.pathname}${window.location.search}${next === 'practice' ? '#practice' : ''}`;
    window.history.replaceState(null, '', url);
    setModeState(next);
  }, []);

  return [mode, setMode];
}
