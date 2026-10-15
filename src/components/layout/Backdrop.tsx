import { memo } from 'react';
import type { BackgroundId } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';

type Kind = 'outline' | 'correct' | 'present' | 'plain';

interface Piece {
  /** Position in % of the viewport. */
  x: number;
  y: number;
  size: number;
  rotate: number;
  letter: string;
  kind: Kind;
  /** Float animation delay in seconds. */
  delay: number;
}

// Hand-placed around the edges so the middle (board, cards) stays calm.
const PIECES: Piece[] = [
  { x: 4, y: 8, size: 54, rotate: -12, letter: 'W', kind: 'correct', delay: 0 },
  {
    x: 15,
    y: 24,
    size: 30,
    rotate: 9,
    letter: 'O',
    kind: 'outline',
    delay: 1.5,
  },
  { x: 6, y: 42, size: 40, rotate: 14, letter: 'R', kind: 'plain', delay: 3 },
  {
    x: 11,
    y: 64,
    size: 34,
    rotate: -7,
    letter: 'D',
    kind: 'present',
    delay: 0.8,
  },
  {
    x: 3,
    y: 84,
    size: 50,
    rotate: 6,
    letter: 'S',
    kind: 'outline',
    delay: 2.2,
  },
  {
    x: 19,
    y: 92,
    size: 26,
    rotate: -16,
    letter: '',
    kind: 'correct',
    delay: 4,
  },
  {
    x: 86,
    y: 6,
    size: 44,
    rotate: 11,
    letter: 'K',
    kind: 'present',
    delay: 1.1,
  },
  {
    x: 93,
    y: 22,
    size: 28,
    rotate: -9,
    letter: 'I',
    kind: 'outline',
    delay: 2.8,
  },
  { x: 82, y: 36, size: 36, rotate: 18, letter: '', kind: 'plain', delay: 0.4 },
  {
    x: 91,
    y: 52,
    size: 52,
    rotate: -14,
    letter: 'I',
    kind: 'correct',
    delay: 3.4,
  },
  {
    x: 84,
    y: 72,
    size: 32,
    rotate: 8,
    letter: 'S',
    kind: 'outline',
    delay: 1.9,
  },
  {
    x: 94,
    y: 90,
    size: 40,
    rotate: -5,
    letter: 'E',
    kind: 'present',
    delay: 0.2,
  },
  {
    x: 30,
    y: 3,
    size: 24,
    rotate: 20,
    letter: '',
    kind: 'outline',
    delay: 2.5,
  },
  {
    x: 66,
    y: 96,
    size: 28,
    rotate: -18,
    letter: 'A',
    kind: 'plain',
    delay: 3.8,
  },
  {
    x: 72,
    y: 2,
    size: 22,
    rotate: -6,
    letter: '',
    kind: 'correct',
    delay: 1.3,
  },
  {
    x: 34,
    y: 97,
    size: 22,
    rotate: 12,
    letter: '',
    kind: 'present',
    delay: 4.4,
  },
];

/** Deterministic 0–1 numbers, so the scenes look the same on every render. */
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const many = (n: number) => Array.from({ length: n }, (_, i) => i);
const LETTER_RAIN = 'WORDSKIISABCEFGHLMNPTUY';

/**
 * Decorative background: a soft dot grid and the scene you picked in the shop
 * (floating letter tiles by default). Purely visual and inert.
 */
export const Backdrop = memo(function Backdrop() {
  const { settings } = useSettings();
  const scene: BackgroundId = settings.background;
  return (
    <div className="backdrop" data-scene={scene === 'tiles' || scene === 'plain' ? undefined : scene} aria-hidden>
      <div className="backdrop-dots" />
      <div className="backdrop-glow" />
      {scene === 'tiles' && <Tiles />}
      {scene === 'bubbles' &&
        many(18).map((i) => (
          <span
            key={i}
            className="scene-bubble"
            style={{
              left: `${rnd(i, 1) * 100}%`,
              width: 14 + rnd(i, 2) * 46,
              height: 14 + rnd(i, 2) * 46,
              animationDuration: `${14 + rnd(i, 3) * 14}s, ${3 + rnd(i, 4) * 3}s`,
              animationDelay: `${-rnd(i, 5) * 28}s, ${-rnd(i, 6) * 6}s`,
            }}
          />
        ))}
      {scene === 'stars' && (
        <>
          {many(80).map((i) => (
            <span
              key={i}
              className="scene-star"
              style={{
                left: `${rnd(i, 1) * 100}%`,
                top: `${rnd(i, 2) * 100}%`,
                width: 1.5 + rnd(i, 3) * 2.5,
                height: 1.5 + rnd(i, 3) * 2.5,
                animationDuration: `${2 + rnd(i, 4) * 4}s`,
                animationDelay: `${-rnd(i, 5) * 6}s`,
              }}
            />
          ))}
          <span className="scene-shooting" />
          <span className="scene-shooting" style={{ top: '30%', left: '70%', animationDelay: '-6s' }} />
        </>
      )}
      {scene === 'sakura' &&
        many(22).map((i) => (
          <span
            key={i}
            className="scene-petal"
            style={{
              left: `${rnd(i, 1) * 105 - 5}%`,
              width: 10 + rnd(i, 2) * 10,
              height: 8 + rnd(i, 2) * 7,
              animationDuration: `${11 + rnd(i, 3) * 10}s`,
              animationDelay: `${-rnd(i, 4) * 21}s`,
              ['--drift' as string]: `${(rnd(i, 5) - 0.3) * 160}px`,
            }}
          />
        ))}
      {scene === 'letters' &&
        many(26).map((i) => (
          <span
            key={i}
            className="scene-letter"
            style={{
              left: `${rnd(i, 1) * 100}%`,
              fontSize: 14 + rnd(i, 2) * 22,
              animationDuration: `${12 + rnd(i, 3) * 14}s`,
              animationDelay: `${-rnd(i, 4) * 26}s`,
            }}
          >
            {LETTER_RAIN[i % LETTER_RAIN.length]}
          </span>
        ))}
      {scene === 'aurora' && (
        <>
          <span className="scene-aurora" />
          <span
            className="scene-aurora"
            style={{
              top: '22%',
              animationDelay: '-7s',
              ['--hue' as string]: '60deg',
            }}
          />
          <span
            className="scene-aurora"
            style={{
              top: '62%',
              animationDelay: '-13s',
              ['--hue' as string]: '140deg',
            }}
          />
        </>
      )}
      {scene === 'synthwave' && (
        <>
          <span className="scene-sun" />
          <span className="scene-grid" />
        </>
      )}
    </div>
  );
});

function Tiles() {
  return (
    <>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="backdrop-tile"
          data-kind={p.kind}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            fontSize: p.size * 0.52,
            ['--r' as string]: `${p.rotate}deg`,
            animationDelay: `${-p.delay}s`,
          }}
        >
          {p.letter}
        </span>
      ))}
    </>
  );
}
