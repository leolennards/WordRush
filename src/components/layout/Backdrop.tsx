import { memo } from 'react';

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
  { x: 15, y: 24, size: 30, rotate: 9, letter: 'O', kind: 'outline', delay: 1.5 },
  { x: 6, y: 42, size: 40, rotate: 14, letter: 'R', kind: 'plain', delay: 3 },
  { x: 11, y: 64, size: 34, rotate: -7, letter: 'D', kind: 'present', delay: 0.8 },
  { x: 3, y: 84, size: 50, rotate: 6, letter: 'S', kind: 'outline', delay: 2.2 },
  { x: 19, y: 92, size: 26, rotate: -16, letter: '', kind: 'correct', delay: 4 },
  { x: 86, y: 6, size: 44, rotate: 11, letter: 'K', kind: 'present', delay: 1.1 },
  { x: 93, y: 22, size: 28, rotate: -9, letter: 'I', kind: 'outline', delay: 2.8 },
  { x: 82, y: 36, size: 36, rotate: 18, letter: '', kind: 'plain', delay: 0.4 },
  { x: 91, y: 52, size: 52, rotate: -14, letter: 'I', kind: 'correct', delay: 3.4 },
  { x: 84, y: 72, size: 32, rotate: 8, letter: 'S', kind: 'outline', delay: 1.9 },
  { x: 94, y: 90, size: 40, rotate: -5, letter: 'E', kind: 'present', delay: 0.2 },
  { x: 30, y: 3, size: 24, rotate: 20, letter: '', kind: 'outline', delay: 2.5 },
  { x: 66, y: 96, size: 28, rotate: -18, letter: 'A', kind: 'plain', delay: 3.8 },
  { x: 72, y: 2, size: 22, rotate: -6, letter: '', kind: 'correct', delay: 1.3 },
  { x: 34, y: 97, size: 22, rotate: 12, letter: '', kind: 'present', delay: 4.4 },
];

/**
 * Decorative background: a soft dot grid and scattered, gently floating
 * letter tiles in the game's own colours. Purely visual and inert.
 */
export const Backdrop = memo(function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="backdrop-dots" />
      <div className="backdrop-glow" />
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
    </div>
  );
});
