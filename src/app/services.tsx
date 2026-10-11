import { createContext, useContext, type ReactNode } from 'react';
import type { Dictionary } from '@/engine';
import type { KeyValueStore } from '@/lib/storage/store';

/**
 * Platform services injected into the UI. Tests (and a future mobile shell)
 * provide their own clock, storage and randomness.
 */
export interface Services {
  store: KeyValueStore;
  dictionary: Dictionary;
  now: () => Date;
  random: () => number;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside <ServicesProvider>');
  return ctx;
}
