const HUES = [152, 38, 210, 280, 12, 190, 330, 95];

/** A coloured initial, stable per player. */
export function Avatar({ uid, name, size = 'md' }: { uid: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  const dims = size === 'lg' ? 'size-14 text-xl' : size === 'sm' ? 'size-8 text-sm' : 'size-11 text-base';
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${dims}`}
      style={{ background: `oklch(0.62 0.13 ${hue})` }}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}
