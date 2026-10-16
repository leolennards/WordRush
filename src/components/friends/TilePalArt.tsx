import { useId, type ReactNode } from 'react';
import type { PalExtra, PalFace, PalShape, TilePal } from '@/engine';

const INK = '#1f2433';

/** The pal's body: a letter tile, a round pebble, a hexagon or a cloud, with a shine on top. */
function Body({ shape, fill }: { shape: PalShape; fill: string }) {
  const shade = 'rgb(0 0 0 / 0.18)';
  switch (shape) {
    case 'round':
      return (
        <>
          <circle cx="32" cy="39" r="20" fill={shade} />
          <circle cx="32" cy="37" r="20" fill={fill} />
          <ellipse cx="25" cy="26" rx="8" ry="4.5" fill="#fff" opacity="0.35" transform="rotate(-25 25 26)" />
        </>
      );
    case 'hex': {
      const pts = (cy: number) =>
        Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          return `${32 + Math.cos(a) * 22},${cy + Math.sin(a) * 22}`;
        }).join(' ');
      return (
        <>
          <polygon points={pts(39.5)} fill={shade} strokeLinejoin="round" stroke={shade} strokeWidth="4" />
          <polygon points={pts(37)} fill={fill} strokeLinejoin="round" stroke={fill} strokeWidth="4" />
          <path d="M19 27 L30 20" stroke="#fff" strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    }
    case 'cloud': {
      const cloud = (dy: number) => (
        <>
          <circle cx="21" cy={40 + dy} r="12" />
          <circle cx="33" cy={31 + dy} r="15" />
          <circle cx="44" cy={40 + dy} r="12" />
          <rect x="15" y={38 + dy} width="35" height="14" rx="7" />
        </>
      );
      return (
        <>
          <g fill={shade}>{cloud(2.5)}</g>
          <g fill={fill}>{cloud(0)}</g>
          <ellipse cx="28" cy="24" rx="7" ry="3.5" fill="#fff" opacity="0.4" transform="rotate(-15 28 24)" />
        </>
      );
    }
    default:
      return (
        <>
          <rect x="12" y="19" width="40" height="40" rx="11" fill={shade} />
          <rect x="12" y="16" width="40" height="40" rx="11" fill={fill} />
          <rect x="16" y="19" width="32" height="10" rx="5" fill="#fff" opacity="0.28" />
        </>
      );
  }
}

const eye = (x: number) => <circle cx={x} cy="36" r="2.9" fill={INK} />;
const twinkle = (x: number) => <circle cx={x + 1} cy="35" r="0.9" fill="#fff" />;
const cheeks = (
  <g fill="#ff6b8b" opacity="0.45">
    <ellipse cx="21" cy="42" rx="3.4" ry="2.2" />
    <ellipse cx="43" cy="42" rx="3.4" ry="2.2" />
  </g>
);
const smile = <path d="M26.5 43 Q32 48.5 37.5 43" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
const star = (x: number, y: number, r: number, fill: string) => (
  <path
    d={`M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`}
    fill={fill}
  />
);
const heart = (x: number) => (
  <path
    d={`M${x} 39 C${x - 5} 35.5 ${x - 4.5} 31.5 ${x - 1.8} 32.3 C${x - 0.8} 32.6 ${x} 33.5 ${x} 34.2 C${x} 33.5 ${x + 0.8} 32.6 ${x + 1.8} 32.3 C${x + 4.5} 31.5 ${x + 5} 35.5 ${x} 39 Z`}
    fill="#ef4444"
  />
);

function Face({ face }: { face: PalFace }) {
  const stroke = { stroke: INK, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };
  let content: ReactNode;
  switch (face) {
    case 'grin':
      content = (
        <>
          {eye(25)}
          {eye(39)}
          {twinkle(25)}
          {twinkle(39)}
          <path d="M25 42 H39 Q39 50 32 50 Q25 50 25 42 Z" fill={INK} />
          <path d="M28 47.5 Q32 45.5 36 47.5 Q34 50 32 50 Q30 50 28 47.5Z" fill="#ff7a93" />
        </>
      );
      break;
    case 'wink':
      content = (
        <>
          {eye(25)}
          {twinkle(25)}
          <path d="M36 36.5 Q39 33 42 36.5" {...stroke} />
          {smile}
        </>
      );
      break;
    case 'cool':
      content = (
        <>
          <rect x="18.5" y="31" width="12" height="8" rx="3" fill={INK} />
          <rect x="33.5" y="31" width="12" height="8" rx="3" fill={INK} />
          <path d="M30 33.5 H34" stroke={INK} strokeWidth="2" />
          <path d="M20.5 33 L24 33" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M35.5 33 L39 33" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M27 45 Q33 48 37.5 43.5" {...stroke} />
        </>
      );
      break;
    case 'wow':
      content = (
        <>
          <circle cx="25" cy="35.5" r="4" fill="#fff" />
          <circle cx="39" cy="35.5" r="4" fill="#fff" />
          <circle cx="25.5" cy="36" r="2.4" fill={INK} />
          <circle cx="39.5" cy="36" r="2.4" fill={INK} />
          <ellipse cx="32" cy="46" rx="3.2" ry="3.8" fill={INK} />
        </>
      );
      break;
    case 'sleepy':
      content = (
        <>
          <path d="M22 37 Q25 39.5 28 37" {...stroke} />
          <path d="M36 37 Q39 39.5 42 37" {...stroke} />
          <ellipse cx="32" cy="45.5" rx="2.2" ry="1.6" fill={INK} />
          <text x="44" y="27" fontSize="8" fontWeight="900" fill={INK} opacity="0.7">
            z
          </text>
          <text x="49" y="21" fontSize="6" fontWeight="900" fill={INK} opacity="0.5">
            z
          </text>
        </>
      );
      break;
    case 'cheeky':
      content = (
        <>
          {eye(25)}
          {eye(39)}
          {twinkle(25)}
          {twinkle(39)}
          {smile}
          <path d="M31 46.3 Q33.5 52 36.5 46" fill="#ff7a93" stroke={INK} strokeWidth="1.2" />
        </>
      );
      break;
    case 'starry':
      content = (
        <>
          {star(25, 36, 4.6, '#fff7c2')}
          {star(39, 36, 4.6, '#fff7c2')}
          <path d="M25 42 H39 Q39 49 32 49 Q25 49 25 42 Z" fill={INK} />
        </>
      );
      break;
    case 'love':
      content = (
        <>
          {heart(25)}
          {heart(39)}
          {smile}
        </>
      );
      break;
    case 'calm':
      content = (
        <>
          <path d="M22 37 Q25 33.5 28 37" {...stroke} />
          <path d="M36 37 Q39 33.5 42 37" {...stroke} />
          <path d="M28 44 Q32 47 36 44" {...stroke} />
        </>
      );
      break;
    case 'determined':
      content = (
        <>
          <path d="M21 30.5 L28 32.5" {...stroke} />
          <path d="M43 30.5 L36 32.5" {...stroke} />
          {eye(25)}
          {eye(39)}
          <path d="M28 45.5 H36" {...stroke} />
        </>
      );
      break;
    case 'laugh':
      content = (
        <>
          <path d="M22 34 L27 36.5 L22 39" {...stroke} />
          <path d="M42 34 L37 36.5 L42 39" {...stroke} />
          <path d="M24.5 42 H39.5 Q39.5 51 32 51 Q24.5 51 24.5 42 Z" fill={INK} />
          <path d="M28 48 Q32 45.5 36 48 Q34 51 32 51 Q30 51 28 48Z" fill="#ff7a93" />
        </>
      );
      break;
    default:
      content = (
        <>
          {eye(25)}
          {eye(39)}
          {twinkle(25)}
          {twinkle(39)}
          {smile}
        </>
      );
  }
  return (
    <g>
      {face !== 'cool' && cheeks}
      {content}
    </g>
  );
}

function Extra({ extra }: { extra: PalExtra }) {
  switch (extra) {
    case 'sprout':
      return (
        <g>
          <path d="M32 17 Q31 11 32 7" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M32 9 Q25 4 22 9 Q27 12 32 9Z" fill="#4ade80" />
          <path d="M32 8 Q38 2 42 7 Q37 11 32 8Z" fill="#22c55e" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M20 17 L22 6 L27.5 12 L32 4 L36.5 12 L42 6 L44 17 Z" fill="#facc15" stroke="#b45309" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="32" cy="12.5" r="1.8" fill="#ef4444" />
          <circle cx="25" cy="14" r="1.3" fill="#38bdf8" />
          <circle cx="39" cy="14" r="1.3" fill="#38bdf8" />
        </g>
      );
    case 'bow':
      return (
        <g transform="rotate(18 44 15)">
          <path d="M44 15 L36 10 Q34 15 36 20 Z" fill="#f472b6" stroke="#be185d" strokeWidth="1" />
          <path d="M44 15 L52 10 Q54 15 52 20 Z" fill="#f472b6" stroke="#be185d" strokeWidth="1" />
          <circle cx="44" cy="15" r="2.4" fill="#ec4899" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M14 22 Q14 9 32 9 Q50 9 50 22 Z" fill="#ef4444" />
          <path d="M14 22 H56 Q57 25 52 25 H14 Z" fill="#b91c1c" />
          <circle cx="32" cy="9.5" r="1.8" fill="#b91c1c" />
        </g>
      );
    case 'antenna':
      return (
        <g>
          <path d="M32 17 V8" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="7" r="3.2" fill="#facc15" stroke={INK} strokeWidth="1.2" />
        </g>
      );
    case 'halo':
      return <ellipse cx="32" cy="9" rx="11" ry="3.4" fill="none" stroke="#fde047" strokeWidth="2.6" />;
    case 'headphones':
      return (
        <g>
          <path d="M13 36 Q13 12 32 12 Q51 12 51 36" stroke={INK} strokeWidth="3" fill="none" />
          <rect x="8" y="31" width="8" height="13" rx="3.5" fill="#f43f5e" stroke={INK} strokeWidth="1.2" />
          <rect x="48" y="31" width="8" height="13" rx="3.5" fill="#f43f5e" stroke={INK} strokeWidth="1.2" />
        </g>
      );
    case 'sparkles':
      return (
        <g>
          {star(12, 16, 4, '#fde047')}
          {star(52, 12, 3, '#fff')}
          {star(55, 30, 2.4, '#f9a8d4')}
        </g>
      );
    default:
      return null;
  }
}

/** A Tile Pal: a little letter-tile character in the game's colours. */
export function TilePalArt({ pal, className = 'size-full' }: { pal: TilePal; className?: string }) {
  const id = useId().replace(/:/g, '');
  const fill = Array.isArray(pal.color) ? `url(#${id}-g)` : pal.color;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {Array.isArray(pal.color) && (
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={pal.color[0]} />
            <stop offset="1" stopColor={pal.color[1]} />
          </linearGradient>
        </defs>
      )}
      <Body shape={pal.shape} fill={fill} />
      <Face face={pal.face} />
      <Extra extra={pal.extra} />
    </svg>
  );
}
