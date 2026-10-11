import { useCallback, useEffect, useState } from 'react';

export type View = 'home' | 'daily' | 'practice';

const read = (): View =>
  window.location.hash === '#practice' ? 'practice' : window.location.hash === '#daily' ? 'daily' : 'home';

/**
 * Keeps the current view in the URL hash (#daily, #practice; none = home) so
 * it survives refresh and the browser Back button returns to the dashboard.
 */
export function useView(): [View, (view: View) => void] {
  const [view, setViewState] = useState<View>(read);

  useEffect(() => {
    const onChange = () => setViewState(read());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  const setView = useCallback((next: View) => {
    if (next === read()) return;
    const url = `${window.location.pathname}${window.location.search}${next === 'home' ? '' : `#${next}`}`;
    // Push when leaving home so Back returns there; otherwise replace.
    if (read() === 'home') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    setViewState(next);
  }, []);

  return [view, setView];
}
