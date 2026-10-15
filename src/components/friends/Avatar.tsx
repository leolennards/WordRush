import { Crown, Gem, Heart, Star, Zap } from 'lucide-react';
import type { BadgeId, FrameId } from '@/engine';
import { useFriends } from '@/features/friends/FriendsContext';

const HUES = [152, 38, 210, 280, 12, 190, 330, 95];

/** A player's frame and badge (bought in the shop). */
export interface Look {
  frame?: string | null;
  badge?: string | null;
}

/** A badge's icon. */
export function BadgeIcon({ id, className = 'size-3' }: { id: BadgeId | string; className?: string }) {
  switch (id) {
    case 'star':
      return <Star className={`${className} fill-amber-400 text-amber-500`} aria-hidden />;
    case 'heart':
      return <Heart className={`${className} fill-rose-500 text-rose-500`} aria-hidden />;
    case 'bolt':
      return <Zap className={`${className} fill-yellow-300 text-yellow-500`} aria-hidden />;
    case 'crown':
      return <Crown className={`${className} fill-amber-300 text-amber-600`} aria-hidden />;
    case 'diamond':
      return <Gem className={`${className} fill-sky-300 text-sky-600`} aria-hidden />;
    default:
      return null;
  }
}

const FRAMES: readonly string[] = ['gold', 'neon', 'rainbow', 'flames'] satisfies FrameId[];
const BADGES: readonly string[] = ['star', 'heart', 'bolt', 'crown', 'diamond'] satisfies BadgeId[];

/** A coloured initial, stable per player, with their frame and badge (from their profile unless given). */
export function Avatar({ uid, name, size = 'md', look: given }: { uid: string; name: string; size?: 'sm' | 'md' | 'lg'; look?: Look }) {
  const { lookOf } = useFriends();
  const look = given ?? lookOf(uid);
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  const dims = size === 'lg' ? 'size-14 text-xl' : size === 'sm' ? 'size-8 text-sm' : 'size-11 text-base';
  const frame = look?.frame && FRAMES.includes(look.frame) ? look.frame : null;
  const badge = look?.badge && BADGES.includes(look.badge) ? look.badge : null;
  const initial = (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${dims}`}
      style={{ background: `oklch(0.62 0.13 ${hue})` }}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
  if (!frame && !badge) return initial;
  return (
    <span className="avatar-frame" data-frame={frame ?? undefined} aria-hidden>
      {initial}
      {badge && (
        <span className="avatar-badge">
          <BadgeIcon id={badge} className={size === 'lg' ? 'size-4' : 'size-3'} />
        </span>
      )}
    </span>
  );
}
