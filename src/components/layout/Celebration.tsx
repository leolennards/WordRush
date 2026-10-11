import { useMemo } from 'react';
import { m } from 'motion/react';

const COLORS = ['var(--c-correct)', 'var(--c-present)', 'var(--c-accent)', 'var(--c-correct)'];

/** A short, restrained burst of tiles behind the board when a game is won. */
export function Celebration({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    // Deterministic pseudo-random spread from the seed (keeps render pure).
    const rnd = (i: number, k: number) => {
      const x = Math.sin(seed * 127.1 + i * 311.7 + k * 74.7) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2 + rnd(i, 0) * 0.4;
      const dist = 120 + rnd(i, 1) * 120;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 40,
        rotate: rnd(i, 2) * 360 - 180,
        size: 8 + rnd(i, 3) * 8,
        color: COLORS[i % COLORS.length],
        delay: rnd(i, 4) * 0.12,
      };
    });
  }, [seed]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible" aria-hidden>
      {pieces.map((p, i) => (
        <m.span
          key={i}
          className="absolute rounded-[3px]"
          style={{ width: p.size, height: p.size, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 60], opacity: [0, 1, 0], scale: [0.4, 1, 0.8], rotate: p.rotate }}
          transition={{ duration: 1.3, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
