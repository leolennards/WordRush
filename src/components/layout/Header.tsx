import { BarChart3, CircleHelp, Moon, Settings, Sun, Users } from 'lucide-react';
import { BRAND } from '@/config/game';
import type { SoloMode } from '@/engine';
import { IconButton, Segmented } from '@/components/ui';
import { useSettings } from '@/features/settings/SettingsContext';
import { CoinChip } from '@/components/shop/CoinChip';
import { Avatar } from '@/components/friends/Avatar';
import { useFriends } from '@/features/friends/FriendsContext';
import { Logo } from './Logo';

interface HeaderProps {
  /** Null on the home dashboard (mode tabs hidden). */
  mode: SoloMode | null;
  onHome: () => void;
  /** Omitted when Friends isn't available in this build. */
  onFriends?: () => void;
  /** Number of things waiting for the player (invites, challenges). */
  friendsBadge?: number;
  onModeChange: (mode: SoloMode) => void;
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
  onShop: () => void;
  onProfile: () => void;
}

export function ModeTabs({ mode, onModeChange }: { mode: SoloMode; onModeChange: (mode: SoloMode) => void }) {
  return (
    <Segmented<SoloMode>
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

export function Header({ mode, onHome, onFriends, friendsBadge = 0, onModeChange, onHelp, onStats, onSettings, onShop, onProfile }: HeaderProps) {
  const { resolvedTheme, update } = useSettings();
  const f = useFriends();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <header className="safe-top">
      <div className="relative mx-auto flex h-14 max-w-[60rem] items-center justify-between gap-2 px-3 sm:px-4">
        <a
          href="#"
          className="flex items-center gap-2 rounded-lg"
          aria-label={`${BRAND.name} home`}
          onClick={(e) => {
            e.preventDefault();
            onHome();
          }}
        >
          <Logo />
          <span className="text-[1.3rem] font-extrabold tracking-tight max-[389px]:sr-only">
            {BRAND.wordmark[0]}
            <span className="text-accent">{BRAND.wordmark[1]}</span>
          </span>
        </a>

        {mode && (
          <nav className="absolute left-1/2 hidden -translate-x-1/2 sm:block" aria-label="Game modes">
            <ModeTabs mode={mode} onModeChange={onModeChange} />
          </nav>
        )}

        <div className="flex items-center">
          <CoinChip onClick={onShop} />
          <button
            type="button"
            onClick={onProfile}
            aria-label="Your profile"
            className="mx-0.5 grid size-10 place-items-center rounded-full transition hover:scale-105 active:scale-95"
          >
            <Avatar uid={f.me?.uid ?? 'me'} name={f.me?.profile.name ?? 'You'} size="sm" look={f.lookOf('me')} />
          </button>
          {onFriends && (
            <IconButton
              label={friendsBadge > 0 ? `Friends (${friendsBadge} waiting)` : 'Friends'}
              onClick={onFriends}
              className="relative"
            >
              <Users className="size-[1.35rem]" aria-hidden />
              {friendsBadge > 0 && (
                <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-present px-1 text-[0.65rem] leading-none font-bold text-present-ink">
                  {friendsBadge}
                </span>
              )}
            </IconButton>
          )}
          <IconButton label="How to play" onClick={onHelp} className="max-[459px]:hidden">
            <CircleHelp className="size-[1.35rem]" aria-hidden />
          </IconButton>
          <IconButton label="Statistics" onClick={onStats} className="max-[429px]:hidden">
            <BarChart3 className="size-[1.35rem]" aria-hidden />
          </IconButton>
          <IconButton
            label={`Switch to ${nextTheme} theme`}
            onClick={() => update({ theme: nextTheme })}
            className="max-[559px]:hidden"
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
