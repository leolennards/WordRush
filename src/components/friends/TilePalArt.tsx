import { useId, type ReactNode } from 'react';
import type { PalExtra, PalFace, TilePal } from '@/engine';

const INK = '#2a2440';

/** Mixes a hex colour towards white (t > 0) or black (t < 0). */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  const ch = (v: number) => Math.round(v + (target - v) * k);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Soft oval eyes with a catchlight. */
const eyes = (
  <g>
    <ellipse cx="25.5" cy="36" rx="2.4" ry="3.1" fill={INK} />
    <ellipse cx="38.5" cy="36" rx="2.4" ry="3.1" fill={INK} />
    <circle cx="26.4" cy="34.8" r="0.95" fill="#fff" />
    <circle cx="39.4" cy="34.8" r="0.95" fill="#fff" />
  </g>
);
const line = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
const smile = <path d="M28.5 42.2 Q32 45.2 35.5 42.2" {...line} />;
const sparkle = (x: number, y: number, r: number, fill = '#fff') => (
  <path
    d={`M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`}
    fill={fill}
  />
);
const heart = (x: number) => (
  <path
    d={`M${x} 38.6 C${x - 4} 35.8 ${x - 3.6} 32.6 ${x - 1.5} 33.2 C${x - 0.6} 33.5 ${x} 34.2 ${x} 34.8 C${x} 34.2 ${x + 0.6} 33.5 ${x + 1.5} 33.2 C${x + 3.6} 32.6 ${x + 4} 35.8 ${x} 38.6Z`}
    fill="#e11d48"
  />
);

function Face({ face }: { face: PalFace }) {
  let content: ReactNode;
  switch (face) {
    case 'joy':
      content = (
        <>
          <path d="M23 36.6 Q25.5 33.6 28 36.6" {...line} />
          <path d="M36 36.6 Q38.5 33.6 41 36.6" {...line} />
          <path d="M28 41.2 H36 Q36 46.2 32 46.2 Q28 46.2 28 41.2Z" fill={INK} />
          <path d="M29.6 44.6 Q32 43.3 34.4 44.6 Q33.4 46.2 32 46.2 Q30.6 46.2 29.6 44.6Z" fill="#ff8fa3" />
        </>
      );
      break;
    case 'wink':
      content = (
        <>
          <ellipse cx="25.5" cy="36" rx="2.4" ry="3.1" fill={INK} />
          <circle cx="26.4" cy="34.8" r="0.95" fill="#fff" />
          <path d="M36 36.4 Q38.5 34 41 36.4" {...line} />
          {smile}
        </>
      );
      break;
    case 'cool':
      content = (
        <>
          <path d="M19.5 33 H44.5" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M20 33 H30.5 V35.5 Q30.5 39.5 25.2 39.5 Q20 39.5 20 35.5Z" fill={INK} />
          <path d="M33.5 33 H44 V35.5 Q44 39.5 38.8 39.5 Q33.5 39.5 33.5 35.5Z" fill={INK} />
          <path d="M22 34.6 L25 34.6" stroke="#9fb4ff" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M35.5 34.6 L38.5 34.6" stroke="#9fb4ff" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M29 43.2 Q32.5 45.2 35.6 42.4" {...line} />
        </>
      );
      break;
    case 'wow':
      content = (
        <>
          <ellipse cx="25.5" cy="35.6" rx="2.7" ry="3.5" fill={INK} />
          <ellipse cx="38.5" cy="35.6" rx="2.7" ry="3.5" fill={INK} />
          <circle cx="26.5" cy="34.3" r="1.1" fill="#fff" />
          <circle cx="39.5" cy="34.3" r="1.1" fill="#fff" />
          <ellipse cx="32" cy="43.8" rx="2" ry="2.5" fill={INK} />
        </>
      );
      break;
    case 'sleepy':
      content = (
        <>
          <path d="M23 36 Q25.5 38.4 28 36" {...line} />
          <path d="M36 36 Q38.5 38.4 41 36" {...line} />
          <ellipse cx="32" cy="43" rx="1.6" ry="1.2" fill={INK} />
        </>
      );
      break;
    case 'cheeky':
      content = (
        <>
          {eyes}
          {smile}
          <path d="M31.2 43.6 Q33 47.6 34.8 43.4" fill="#ff8fa3" />
        </>
      );
      break;
    case 'starry':
      content = (
        <>
          {sparkle(25.5, 36, 3.6, INK)}
          {sparkle(38.5, 36, 3.6, INK)}
          {sparkle(26.4, 34.8, 0.9)}
          {sparkle(39.4, 34.8, 0.9)}
          <path d="M28.5 41.4 H35.5 Q35.5 45.6 32 45.6 Q28.5 45.6 28.5 41.4Z" fill={INK} />
        </>
      );
      break;
    case 'love':
      content = (
        <>
          {heart(25.5)}
          {heart(38.5)}
          {smile}
        </>
      );
      break;
    case 'calm':
      content = (
        <>
          <path d="M23 36.6 Q25.5 33.6 28 36.6" {...line} />
          <path d="M36 36.6 Q38.5 33.6 41 36.6" {...line} />
          <path d="M29.5 42.2 Q32 44.2 34.5 42.2" {...line} />
        </>
      );
      break;
    default:
      content = (
        <>
          {eyes}
          {smile}
        </>
      );
  }
  return (
    <g>
      {face !== 'cool' && (
        <g opacity="0.55">
          <ellipse cx="21.5" cy="41.6" rx="3.2" ry="2" fill="#ff7d9a" />
          <ellipse cx="42.5" cy="41.6" rx="3.2" ry="2" fill="#ff7d9a" />
        </g>
      )}
      {content}
    </g>
  );
}

function Extra({ extra, id }: { extra: PalExtra; id: string }) {
  switch (extra) {
    case 'sprout':
      return (
        <g>
          <path d="M32 15.5 Q31.4 11.5 32 8.5" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M32 10.5 Q26.5 6 23.5 9.8 Q27.5 13 32 10.5Z" fill="#4ade80" />
          <path d="M32 9.5 Q37.5 4.5 41 8.6 Q36.8 12.4 32 9.5Z" fill="#22c55e" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M22 16.5 L23.4 8 L28 12.4 L32 6 L36 12.4 L40.6 8 L42 16.5 Z"
            fill={`url(#${id}-gold)`}
            stroke="#b45309"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="12.8" r="1.5" fill="#f43f5e" />
        </g>
      );
    case 'bow':
      return (
        <g transform="rotate(16 43 15)">
          <path d="M43 15 L36.5 11 Q35 15 36.5 19 Z" fill="#fb7185" />
          <path d="M43 15 L49.5 11 Q51 15 49.5 19 Z" fill="#fb7185" />
          <circle cx="43" cy="15" r="2" fill="#e11d48" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M15.5 21 Q15.5 9.5 32 9.5 Q48.5 9.5 48.5 21 Z" fill="#1e3a8a" />
          <path d="M15.5 21 H54 Q55 23.6 50.5 23.6 H15.5 Z" fill="#172554" />
          <circle cx="32" cy="10" r="1.6" fill="#facc15" />
        </g>
      );
    case 'halo':
      return <ellipse cx="32" cy="9" rx="10" ry="3" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="2.4" />;
    case 'headphones':
      return (
        <g>
          <path d="M14.5 33 Q14.5 11.5 32 11.5 Q49.5 11.5 49.5 33" stroke="#334155" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <rect x="10" y="29" width="7.5" height="12" rx="3.4" fill="#f43f5e" />
          <rect x="46.5" y="29" width="7.5" height="12" rx="3.4" fill="#f43f5e" />
        </g>
      );
    case 'moon':
      return <path d="M44 8.5 A6 6 0 1 0 50 16 A4.6 4.6 0 1 1 44 8.5Z" fill={`url(#${id}-gold)`} />;
    case 'sparkles':
      return (
        <g>
          {sparkle(13, 15, 3.8, '#fde68a')}
          {sparkle(51, 12, 3, '#fff')}
          {sparkle(53, 27, 2.2, '#f9a8d4')}
        </g>
      );
    default:
      return null;
  }
}

/** A Tile Pal: a soft, glossy letter tile with a face. */
export function TilePalArt({ pal, className = 'size-full' }: { pal: TilePal; className?: string }) {
  const id = useId().replace(/:/g, '');
  const [a, b] = Array.isArray(pal.color) ? pal.color : [pal.color, pal.color];
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-body`} cx="0.3" cy="0.22" r="0.95">
          <stop offset="0" stopColor={shade(a, 0.38)} />
          <stop offset="0.45" stopColor={a} />
          <stop offset="1" stopColor={shade(b, -0.12)} />
        </radialGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* A soft shadow, the tile's edge, then its face. */}
      <ellipse cx="32" cy="58.5" rx="17" ry="2.6" fill="#000" opacity="0.12" />
      <rect x="12" y="18.5" width="40" height="37.5" rx="13" fill={shade(b, -0.32)} />
      <rect x="12" y="15" width="40" height="38" rx="13" fill={`url(#${id}-body)`} />
      <rect x="12.6" y="15.6" width="38.8" height="36.8" rx="12.4" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.1" />
      <path d="M17 26 Q17 18.6 25 18.6 H39 Q47 18.6 47 26 Q32 30 17 26Z" fill={`url(#${id}-gloss)`} opacity="0.8" />
      <Face face={pal.face} />
      <Extra extra={pal.extra} id={id} />
    </svg>
  );
}
