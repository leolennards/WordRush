import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettings } from '@/features/settings/SettingsContext';
import type { ThemePreference } from '@/lib/storage/schemas';
import { BRAND, GAME } from '@/config/game';
import { Button, Segmented, Switch } from '@/components/ui';
import { SKINS, levelFor } from '@/engine';
import { useProgress } from '@/features/progress/ProgressContext';
import { ThemePicker } from '@/components/progress/ThemePicker';
import { AccountSettings } from '@/components/friends/AccountSettings';
import type { SyncStatus } from '@/features/sync/useCloudSync';
import { Dialog } from './Dialog';
import { hapticsSupported } from '@/lib/haptics';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** True if hard mode can't change for the game in progress (it already has guesses). */
  hardModeLocked: boolean;
  onReset: () => void;
  storagePersistent: boolean;
  /** Opens tile themes (Ranks and themes). */
  onThemes: () => void;
  syncStatus: SyncStatus;
}

export function SettingsDialog({ open, onClose, hardModeLocked, onReset, storagePersistent, onThemes, syncStatus }: SettingsDialogProps) {
  const { settings, update } = useSettings();
  const [confirming, setConfirming] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const { progress } = useProgress();

  const close = () => {
    setConfirming(false);
    setThemesOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Settings">
      <div className="divide-y divide-border">
        <AccountSettings syncStatus={syncStatus} />
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span className="font-semibold" id="theme-label">
            Appearance
          </span>
          <Segmented<ThemePreference>
            label="Appearance"
            size="sm"
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'light', label: <><Sun className="size-4" aria-hidden /> Light</> },
              { value: 'dark', label: <><Moon className="size-4" aria-hidden /> Dark</> },
              { value: 'system', label: <><Monitor className="size-4" aria-hidden /> System</> },
            ]}
          />
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-semibold">Tile theme</span>
              <span className="mt-0.5 block text-sm text-muted">
                {SKINS.find((s) => s.id === settings.skin)?.name ?? 'Classic'} · 4 free, more unlock as you rank up
              </span>
            </span>
            <Button variant="secondary" onClick={() => setThemesOpen((o) => !o)} aria-expanded={themesOpen}>
              <span className="flex gap-0.5" aria-hidden>
                <span className="size-3 rounded-[3px] bg-correct" />
                <span className="size-3 rounded-[3px] bg-present" />
              </span>
              {themesOpen ? 'Done' : 'Change'}
            </Button>
          </div>
          {themesOpen && (
            <div className="mt-3">
              <ThemePicker level={levelFor(progress.xp).level} />
              <button type="button" onClick={onThemes} className="mt-3 text-sm font-semibold text-accent hover:underline">
                See all ranks
              </button>
            </div>
          )}
        </div>

        <Switch
          label="Hard mode"
          checked={settings.hardMode}
          onChange={(hardMode) => update({ hardMode })}
          description={
            hardModeLocked
              ? 'Revealed hints must be used in later guesses. Changes apply from your next game.'
              : 'Revealed hints must be used in later guesses.'
          }
        />
        <Switch
          label="Colour-accessible mode"
          checked={settings.highContrast}
          onChange={(highContrast) => update({ highContrast })}
          description="Orange and blue with shape markers, for colour-vision differences."
        />
        <Switch
          label="Reduce motion"
          checked={settings.reduceMotion}
          onChange={(reduceMotion) => update({ reduceMotion })}
          description="Turn off flips and other animations. Your system setting is always respected."
        />
        <Switch
          label="Sound effects"
          checked={settings.sound}
          onChange={(sound) => update({ sound })}
          description="Soft sounds for typing and results."
        />
        {hapticsSupported() && (
          <Switch
            label="Vibration"
            checked={settings.haptics}
            onChange={(haptics) => update({ haptics })}
            description="Short buzzes when typing and finishing a game."
          />
        )}

        <div className="py-4">
          {!confirming ? (
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block font-semibold">Reset statistics</span>
                <span className="mt-0.5 block text-sm text-muted">Clears Daily and Practice stats.</span>
              </span>
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                Reset…
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-danger/40 bg-danger/5 p-4" role="alert">
              <p className="text-sm">
                <strong>Erase all statistics and streaks?</strong> Practice progress is cleared too. Today’s Daily
                Challenge stays as it is. This can’t be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    onReset();
                    setConfirming(false);
                  }}
                >
                  Yes, reset
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)} autoFocus>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!storagePersistent && (
        <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm text-muted">
          Your browser is blocking local storage, so progress won’t be saved after you close this page.
        </p>
      )}
      <p className="mt-3 text-center text-xs text-subtle">
        {BRAND.name} · word list v{GAME.dictionaryVersion} · Daily resets at 00:00 UTC
      </p>
    </Dialog>
  );
}
