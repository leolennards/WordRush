import { useId } from 'react';

/** A 4-point sparkle. */
const SPARKLE =
  'M0 -1 C0.12 -0.12 0.12 -0.12 1 0 C0.12 0.12 0.12 0.12 0 1 C-0.12 0.12 -0.12 0.12 -1 0 C-0.12 -0.12 -0.12 -0.12 0 -1 Z';
/** Light rays behind a hero coin. */
const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);
/** The W, struck into the face. */
const W = 'M12.6 15.6h4.6l2.6 10.4 2.9-10.4h3.4l2.9 10.4 2.6-10.4h4.6l-5.2 16.6h-4.1L24 22.6l-3.1 9.6h-4.1z';

/**
 * The Wordskiis coin: a letter tile struck in gold. Holographic foil, a green
 * and an amber gem in the corners (the game's "correct" and "present"), and
 * an engraved W.
 *
 * - `shine`: now and then a glint of light sweeps across it.
 * - `sparkle`: a couple of twinkling stars.
 * - `spin`: it flips over every few seconds, like a tile.
 * - `hero`: the big version: a soft glow, slowly turning rays of light, the
 *   glint, sparkles and a gentle 3D tilt.
 */
export function Coin({
  className = 'size-5',
  spin = false,
  shine = false,
  sparkle = false,
  hero = false,
}: {
  className?: string;
  spin?: boolean;
  shine?: boolean;
  sparkle?: boolean;
  hero?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const u = (name: string) => `url(#${id}-${name})`;
  return (
    <svg
      viewBox="0 0 48 48"
      className={`coin ${className} shrink-0 overflow-visible ${spin ? 'coin-spin' : ''} ${hero ? 'coin-hero' : ''}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4b8" />
          <stop offset="0.25" stopColor="#fcd34d" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="0.78" stopColor="#c2410c" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.32" cy="0.25" r="0.95">
          <stop offset="0" stopColor="#fffbea" />
          <stop offset="0.2" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="0.78" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#d97706" />
        </radialGradient>
        <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c2410c" />
          <stop offset="1" stopColor="#6b210a" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-holo`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#ff7ad9" />
          <stop offset="0.2" stopColor="#7af0ff" />
          <stop offset="0.4" stopColor="#b6ff7a" />
          <stop offset="0.6" stopColor="#ffe57a" />
          <stop offset="0.8" stopColor="#c99bff" />
          <stop offset="1" stopColor="#ff7ad9" />
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-ray`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.25" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-body`}>
          <rect x="2.5" y="2.5" width="43" height="43" rx="12" />
        </clipPath>
        <clipPath id={`${id}-inner`}>
          <rect x="6.5" y="6.5" width="35" height="35" rx="8" />
        </clipPath>
      </defs>

      {/* Rays of light behind a hero coin. */}
      {hero && (
        <g className="coin-rays" fill={u('ray')}>
          {RAYS.map((a) => (
            <path key={a} d="M24 24 L22.2 -10 L25.8 -10 Z" transform={`rotate(${a} 24 24)`} />
          ))}
        </g>
      )}

      {/* A thick gold tile with a bevelled edge. */}
      <rect x="2.5" y="4" width="43" height="43" rx="12" fill="#7c2d12" fillOpacity="0.55" />
      <rect x="2.5" y="2.5" width="43" height="43" rx="12" fill={u('rim')} />
      <rect
        x="3.3"
        y="3.3"
        width="41.4"
        height="41.4"
        rx="11.3"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="0.8"
      />
      <rect x="6" y="6.8" width="36" height="36" rx="8.5" fill="#7c2d12" fillOpacity="0.4" />
      <rect x="6.5" y="6.5" width="35" height="35" rx="8" fill={u('face')} />

      {/* Holographic foil drifting across the face. */}
      <g clipPath={u('inner')}>
        <rect
          className={shine || hero ? 'coin-holo' : undefined}
          x="-30"
          y="0"
          width="108"
          height="48"
          fill={u('holo')}
          opacity="0.3"
          style={{ mixBlendMode: 'overlay' }}
        />
      </g>

      {/* Gems: the game's green and amber. */}
      <g>
        <rect
          x="9.6"
          y="9.6"
          width="4.6"
          height="4.6"
          rx="1"
          transform="rotate(45 11.9 11.9)"
          fill="#16a34a"
          stroke="#064e3b"
          strokeWidth="0.6"
        />
        <rect x="10.6" y="10.3" width="1.6" height="1.2" rx="0.4" transform="rotate(45 11.9 11.9)" fill="#bbf7d0" />
        <rect
          x="33.8"
          y="33.8"
          width="4.6"
          height="4.6"
          rx="1"
          transform="rotate(45 36.1 36.1)"
          fill="#f59e0b"
          stroke="#7c2d12"
          strokeWidth="0.6"
        />
        <rect x="34.8" y="34.5" width="1.6" height="1.2" rx="0.4" transform="rotate(45 36.1 36.1)" fill="#fef3c7" />
      </g>

      {/* The engraved W: a light lip below, the cut above. */}
      <path d={W} fill="#fff8dc" fillOpacity="0.9" transform="translate(0.6 0.9)" />
      <path d={W} fill={u('ink')} />
      <path d={W} fill="none" stroke="#7c2d12" strokeOpacity="0.35" strokeWidth="0.5" />

      {/* Glassy gloss over the top half. */}
      <path d="M8 14.5 Q8 6.5 16 6.5 H32 Q40 6.5 40 14.5 V19 Q24 23 8 19 Z" fill={u('gloss')} opacity="0.55" />

      {/* A glint of light sweeping across. */}
      {(shine || hero) && (
        <g clipPath={u('body')}>
          <g transform="rotate(24 24 24)">
            <rect className="coin-glint" x="-16" y="-8" width="11" height="64" fill={u('glint')} />
          </g>
        </g>
      )}

      {(sparkle || hero) && (
        <g fill="#fff">
          {[
            { at: 'translate(44 4) scale(5.5)', delay: '0s' },
            { at: 'translate(3 40) scale(3.6)', delay: '0.9s' },
          ].map((s) => (
            <g key={s.at} transform={s.at}>
              <path className="coin-sparkle" d={SPARKLE} style={{ animationDelay: s.delay }} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
