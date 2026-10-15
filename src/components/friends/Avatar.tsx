import { Crown, Flame, Gem, Ghost, Heart, Music, Rocket, Star, Trophy, Zap } from 'lucide-react';
import { TINTS, isAvatarEmoji, isPhotoData, type BadgeId } from '@/engine';
import { useFriends } from '@/features/friends/FriendsContext';

const HUES = [152, 38, 210, 280, 12, 190, 330, 95];

/** A player's look: picture, colour, frame and badge (shown to friends). */
export interface Look {
  frame?: string | null;
  badge?: string | null;
  /** An emoji, 'photo', or null for their initial. */
  avatar?: string | null;
  photo?: string | null;
  tint?: string | null;
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
    case 'flame':
      return <Flame className={`${className} fill-orange-400 text-red-500`} aria-hidden />;
    case 'music':
      return <Music className={`${className} text-fuchsia-500`} strokeWidth={3} aria-hidden />;
    case 'rocket':
      return <Rocket className={`${className} fill-sky-200 text-indigo-600`} aria-hidden />;
    case 'ghost':
      return <Ghost className={`${className} fill-white text-slate-600`} aria-hidden />;
    case 'trophy':
      return <Trophy className={`${className} fill-amber-300 text-amber-600`} aria-hidden />;
    default:
      return null;
  }
}

const FRAMES = new Set(['gold', 'neon', 'rainbow', 'flames', 'leaves', 'pixel', 'orbit']);
const BADGES = new Set(['star', 'heart', 'bolt', 'crown', 'diamond', 'flame', 'music', 'rocket', 'ghost', 'trophy']);

/** The background behind a picture: the chosen colour, or one picked from the player's id. */
function tintFor(uid: string, tint: string | null | undefined): string {
  const chosen = TINTS.find((t) => t.id === tint && t.css);
  if (chosen) return chosen.css;
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `oklch(0.62 0.13 ${HUES[h % HUES.length]})`;
}

/** A player's picture (photo, emoji or initial), with their frame and badge (from their profile unless given). */
export function Avatar({
  uid,
  name,
  size = 'md',
  look: given,
}: {
  uid: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  look?: Look;
}) {
  const { lookOf } = useFriends();
  const look = given ?? lookOf(uid);
  const dims =
    size === 'xl' ? 'size-24 text-4xl' : size === 'lg' ? 'size-14 text-xl' : size === 'sm' ? 'size-8 text-sm' : 'size-11 text-base';
  const frame = look.frame && FRAMES.has(look.frame) ? look.frame : null;
  const badge = look.badge && BADGES.has(look.badge) ? look.badge : null;
  const photo = look.avatar === 'photo' && isPhotoData(look.photo) ? look.photo : null;
  const emoji = !photo && isAvatarEmoji(look.avatar) ? look.avatar : null;
  const face = (
    <span
      aria-hidden
      className={`avatar-face grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white ${dims}`}
      style={{ background: tintFor(uid, look.tint) }}
    >
      {photo ? (
        <img src={photo} alt="" className="size-full object-cover" draggable={false} />
      ) : emoji ? (
        <span className="leading-none" style={{ fontSize: '1.25em' }}>
          {emoji}
        </span>
      ) : (
        (name.trim()[0] ?? '?').toUpperCase()
      )}
    </span>
  );
  if (!frame && !badge) return face;
  return (
    <span className="avatar-frame" data-frame={frame ?? undefined} aria-hidden>
      {face}
      {badge && (
        <span className="avatar-badge">
          <BadgeIcon id={badge} className={size === 'xl' ? 'size-6' : size === 'lg' ? 'size-4' : 'size-3'} />
        </span>
      )}
    </span>
  );
}
