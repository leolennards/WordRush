import { useCallback, useEffect, useState } from 'react';

export type View =
  | 'swap'
  | 'home' | 'daily' | 'practice' | 'blitz' | 'duo' | 'quad' | 'rush' | 'ladder' | 'duel' | 'tower' | 'reverse' | 'survival' | 'friends' | 'challenge' | 'race';

export interface Route {
  view: View;
  /** Challenge or race id for those views. */
  id: string | null;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export function parseHash(hash: string): Route {
  const [name, id] = hash.replace(/^#/, '').split('/');
  switch (name) {
    case 'daily':
    case 'practice':
    case 'blitz':
    case 'duo':
    case 'quad':
    case 'rush':
    case 'ladder':
    case 'duel':
    case 'tower':
    case 'reverse':
    case 'survival':
    case 'friends':
      return { view: name, id: null };
    case 'challenge':
    case 'race':
    case 'swap':
      return id && ID.test(id) ? { view: name, id } : { view: 'friends', id: null };
    default:
      return { view: 'home', id: null };
  }
}

export function routeToHash({ view, id }: Route): string {
  if (view === 'home') return '';
  return id ? `#${view}/${id}` : `#${view}`;
}

const read = () => parseHash(window.location.hash);

/**
 * Keeps the current screen in the URL hash (#daily, #practice, #blitz, #duo, #survival, #friends,
 * #challenge/<id>, #race/<id>; none = home) so it survives refresh and the
 * browser Back button returns to the previous screen.
 */
export function useView(): [Route, (view: View, id?: string | null) => void] {
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  const navigate = useCallback((view: View, id: string | null = null) => {
    const next: Route = { view, id };
    const current = read();
    if (current.view === next.view && current.id === next.id) return;
    const url = `${window.location.pathname}${window.location.search}${routeToHash(next)}`;
    // Switching between Daily and Practice replaces; everything else pushes so Back works.
    const swap = ['daily', 'practice'].includes(current.view) && ['daily', 'practice'].includes(view);
    if (swap) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setRoute(next);
  }, []);

  return [route, navigate];
}
