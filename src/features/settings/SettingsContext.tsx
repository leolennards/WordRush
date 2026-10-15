import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useServices } from '@/app/services';
import { DEFAULT_SETTINGS, KEYS, settingsSchema, type Settings } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';
import { usePrefersDark, usePrefersReducedMotion } from '@/hooks/useMediaQuery';

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** Resolved theme after applying the "system" preference. */
  resolvedTheme: 'light' | 'dark';
  /** True if either the OS or the in-app setting requests reduced motion. */
  reducedMotion: boolean;
  /** Re-reads settings from storage (after a cloud sync). */
  reload: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { store } = useServices();
  const [settings, setSettings] = useState<Settings>(
    () => readVersioned(store, KEYS.settings, settingsSchema) ?? DEFAULT_SETTINGS,
  );
  const prefersDark = usePrefersDark();
  const prefersReduced = usePrefersReducedMotion();

  const resolvedTheme = settings.theme === 'system' ? (prefersDark ? 'dark' : 'light') : settings.theme;
  const reducedMotion = prefersReduced || settings.reduceMotion;

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        writeVersioned(store, KEYS.settings, settingsSchema, next);
        return next;
      });
    },
    [store],
  );

  // Apply presentation attributes to <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.reduceMotion = String(settings.reduceMotion);
    root.dataset.skin = settings.skin;
    root.dataset.tiles = settings.tileStyle;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', resolvedTheme === 'dark' ? '#0c0f15' : '#f6f3ec');
  }, [resolvedTheme, settings.highContrast, settings.reduceMotion, settings.skin, settings.tileStyle]);

  const reload = useCallback(
    () => setSettings(readVersioned(store, KEYS.settings, settingsSchema) ?? DEFAULT_SETTINGS),
    [store],
  );
  const value = useMemo(
    () => ({ settings, update, resolvedTheme, reducedMotion, reload }) as const,
    [settings, update, resolvedTheme, reducedMotion, reload],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
