import { TINTS, isPhotoData } from '@/engine';
import { useFriends } from '@/features/friends/FriendsContext';

const HUES = [152, 38, 210, 280, 12, 190, 330, 95];

/** A player's look: picture and colour (shown to friends). */
export interface Look {
  /** 'photo', or null for their initial. */
  avatar?: string | null;
  photo?: string | null;
  tint?: string | null;
}

/** The background behind a picture: the chosen colour, or one picked from the player's id. */
function tintFor(uid: string, tint: string | null | undefined): string {
  const chosen = TINTS.find((t) => t.id === tint && t.css);
  if (chosen) return chosen.css;
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `oklch(0.62 0.13 ${HUES[h % HUES.length]})`;
}

/** A player's picture: their photo or initial (from their profile unless given). */
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
  const photo = look.avatar === 'photo' && isPhotoData(look.photo) ? look.photo : null;
  return (
    <span
      aria-hidden
      className={`avatar-face grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white ${dims}`}
      style={{ background: tintFor(uid, look.tint) }}
    >
      {photo ? (
        <img src={photo} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        (name.trim()[0] ?? '?').toUpperCase()
      )}
    </span>
  );
}
