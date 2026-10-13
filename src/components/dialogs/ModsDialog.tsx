import type { ReactNode } from 'react';
import { CloudFog, EyeOff, Skull } from 'lucide-react';
import { MOD_BONUS } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';
import { Dialog } from './Dialog';

interface ModsDialogProps {
  open: boolean;
  onClose: () => void;
  /** The current Practice word already has guesses, so changes apply from the next one. */
  locked: boolean;
}

/** Twists for Practice that make it harder, and worth more XP. */
export function ModsDialog({ open, onClose, locked }: ModsDialogProps) {
  const { settings, update } = useSettings();
  const pct = (n: number) => `+${Math.round(n * 100)}% XP`;

  return (
    <Dialog open={open} onClose={onClose} title="Mods">
      <div className="space-y-3 pt-1">
        <p className="text-sm text-muted">
          Twist your Practice games. Mods stack, and each one is worth extra XP when you win.
        </p>
        <ModCard
          icon={<CloudFog className="size-5" aria-hidden />}
          tint="bg-surface-3 text-text"
          name="Fog"
          bonus={pct(MOD_BONUS.fog)}
          description="Only your latest guess stays visible. Earlier rows clear when the game ends."
          checked={settings.modFog}
          onChange={(modFog) => update({ modFog })}
        />
        <ModCard
          icon={<EyeOff className="size-5" aria-hidden />}
          tint="bg-ink text-ink-text"
          name="Blind keys"
          bonus={pct(MOD_BONUS.blind)}
          description="The keyboard shows no colours. Keep track of letters yourself."
          checked={settings.modBlind}
          onChange={(modBlind) => update({ modBlind })}
        />
        <ModCard
          icon={<Skull className="size-5" aria-hidden />}
          tint="bg-danger/15 text-danger"
          name="Hard mode"
          bonus="+25 XP"
          description="Revealed hints must be used in later guesses. Applies to the Daily Challenge too."
          checked={settings.hardMode}
          onChange={(hardMode) => update({ hardMode })}
        />
        {locked && (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
            This word has already started, so changes apply from your next word.
          </p>
        )}
      </div>
    </Dialog>
  );
}

function ModCard(props: {
  icon: ReactNode;
  tint: string;
  name: string;
  bonus: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99] ${
        props.checked ? 'border-accent/60 bg-accent/8 ring-1 ring-accent/30' : 'border-border hover:border-border-strong'
      }`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${props.tint}`}>{props.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{props.name}</span>
          <span className="rounded-full bg-accent/15 px-2 py-px text-[0.7rem] font-bold text-accent">{props.bonus}</span>
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{props.description}</span>
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${props.checked ? 'bg-accent' : 'bg-surface-3'}`}
        aria-hidden
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            props.checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}
