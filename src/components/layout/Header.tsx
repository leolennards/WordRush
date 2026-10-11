import { BarChart3, CircleHelp, Moon, Settings, Sun } from 'lucide-react';
import { BRAND } from '@/config/game';
import type { GameMode } from '@/engine';
import { IconButton, Segmented } from '@/components/ui';
import { useSettings } from '@/features/settings/SettingsContext';
import { Logo } from './Logo';

interface HeaderProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
}

export function ModeTabs({ mode, onModeChange }: Pick<HeaderProps, 'mode' | 'onModeChange'>) {
  return (
    <Segmented<GameMode>
      label="Game mode"
      size="sm"
      value={mode}
      onChange={onModeChange}
      options={[
        { value: 'daily', label: 'Daily' },
        { value: 'practice', label: 'Practice' },
      ]}
    />
  );
}

export function Header({ mode, onModeChange, onHelp, onStats, onSettings }: HeaderProps) {
  const { resolvedTheme, update } = useSettings();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <header className="safe-top border-b border-border/70">
      <div className="relative mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-3 sm:px-4">
        <a href="#" className="flex items-center gap-2 rounded-lg" aria-label={`${BRAND.name} home`} onClick={(e) => { e.preventDefault(); onModeChange('daily'); }}>
          <Logo />
          <span className="text-[1.3rem] font-extrabold tracking-tight">
            Word<span className="text-accent">Rush</span>
          </span>
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 sm:block" aria-label="Game modes">
          <ModeTabs mode={mode} onModeChange={onModeChange} />
        </nav>

        <div className="flex items-center">
          <IconButton label="How to play" onClick={onHelp}>
            <CircleHelp className="size-[1.35rem]" aria-hidden />
          </IconButton>
          <IconButton label="Statistics" onClick={onStats}>
            <BarChart3 className="size-[1.35rem]" aria-hidden />
          </IconButton>
          <IconButton
            label={`Switch to ${nextTheme} theme`}
            onClick={() => update({ theme: nextTheme })}
            className="max-[359px]:hidden"
          >
            {resolvedTheme === 'dark' ? <Sun className="size-[1.3rem]" aria-hidden /> : <Moon className="size-[1.3rem]" aria-hidden />}
          </IconButton>
          <IconButton label="Settings" onClick={onSettings}>
            <Settings className="size-[1.35rem]" aria-hidden />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
