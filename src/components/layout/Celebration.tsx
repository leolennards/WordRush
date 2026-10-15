import { useMemo } from 'react';
import { m } from 'motion/react';
import type { WinFxId } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';
import { Coin } from '@/components/shop/Coin';

const COLORS = ['var(--c-correct)', 'var(--c-present)', 'var(--c-accent)', 'var(--c-correct)'];
const SPARKS = ['#facc15', '#f472b6', '#38bdf8', '#a3e635', '#fb923c', '#c084fc'];

/** Deterministic pseudo-random numbers from the seed (keeps render pure). */
const rng = (seed: number) => (i: number, k: number) => {
  const x = Math.sin(seed * 127.1 + i * 311.7 + k * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

/** The win effect you picked in Settings (or bought in the shop). */
export function WinCelebration({ seed }: { seed: number }) {
  const { settings } = useSettings();
  return <Celebration seed={seed} fx={settings.winFx} />;
}

/** A short burst behind the board when a game is won. */
export function Celebration({ seed, fx = 'confetti' }: { seed: number; fx?: WinFxId }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible" aria-hidden>
      {fx === 'hearts' ? (
        <Hearts seed={seed} />
      ) : fx === 'coins' ? (
        <Coins seed={seed} />
      ) : fx === 'stars' ? (
        <Stars seed={seed} />
      ) : fx === 'fireworks' ? (
        <Fireworks seed={seed} />
      ) : (
        <Confetti seed={seed} />
      )}
    </div>
  );
}

function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    const rnd = rng(seed);
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
  return pieces.map((p, i) => (
    <m.span
      key={i}
      className="absolute rounded-[3px]"
      style={{ width: p.size, height: p.size, background: p.color }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
      animate={{ x: p.x, y: [0, p.y, p.y + 60], opacity: [0, 1, 0], scale: [0.4, 1, 0.8], rotate: p.rotate }}
      transition={{ duration: 1.3, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
    />
  ));
}

/** Hearts float up from the board, swaying as they go. */
function Hearts({ seed }: { seed: number }) {
  const hearts = useMemo(() => {
    const rnd = rng(seed);
    return Array.from({ length: 16 }, (_, i) => {
      const x = (rnd(i, 0) - 0.5) * 300;
      return {
        x,
        sway: (rnd(i, 1) - 0.5) * 60,
        rise: 160 + rnd(i, 2) * 140,
        size: 16 + rnd(i, 3) * 18,
        color: ['#f43f5e', '#ec4899', '#fb7185', '#f472b6'][i % 4],
        delay: rnd(i, 4) * 0.5,
      };
    });
  }, [seed]);
  return hearts.map((h, i) => (
    <m.svg
      key={i}
      viewBox="0 0 24 24"
      className="absolute drop-shadow"
      style={{ width: h.size, height: h.size }}
      initial={{ x: h.x, y: 60, opacity: 0, scale: 0.3 }}
      animate={{
        x: [h.x, h.x + h.sway, h.x - h.sway / 2, h.x + h.sway],
        y: [60, 0, -h.rise / 2, -h.rise],
        opacity: [0, 1, 1, 0],
        scale: [0.3, 1.1, 1, 0.9],
      }}
      transition={{ duration: 1.9, delay: h.delay, ease: 'easeOut' }}
    >
      <path
        d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 2.7 4.5 6.4 4.1c2.1-.2 4 .9 5.6 3 1.6-2.1 3.5-3.2 5.6-3 3.7.4 5.5 4.3 4 7.6C19.5 16.4 12 21 12 21z"
        fill={h.color}
      />
    </m.svg>
  ));
}

/** Wordskiis coins rain down over the board, spinning. */
function Coins({ seed }: { seed: number }) {
  const coins = useMemo(() => {
    const rnd = rng(seed);
    return Array.from({ length: 20 }, (_, i) => ({
      x: (rnd(i, 0) - 0.5) * 340,
      fall: 220 + rnd(i, 1) * 120,
      size: 18 + rnd(i, 2) * 14,
      spin: 360 * (1 + Math.round(rnd(i, 3) * 2)),
      delay: rnd(i, 4) * 0.7,
    }));
  }, [seed]);
  return coins.map((c, i) => (
    <m.span
      key={i}
      className="absolute"
      style={{ width: c.size, height: c.size }}
      initial={{ x: c.x, y: -c.fall, opacity: 0, rotateY: 0 }}
      animate={{ x: c.x, y: [-c.fall, c.fall * 0.6], opacity: [0, 1, 1, 0], rotateY: c.spin }}
      transition={{ duration: 1.6, delay: c.delay, ease: 'easeIn' }}
    >
      <Coin className="size-full drop-shadow-md" />
    </m.span>
  ));
}

/** Stars shoot out, twinkle and fall away. */
function Stars({ seed }: { seed: number }) {
  const stars = useMemo(() => {
    const rnd = rng(seed);
    return Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2 + rnd(i, 0) * 0.3;
      const dist = 110 + rnd(i, 1) * 130;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 30,
        size: 12 + rnd(i, 2) * 16,
        color: ['#facc15', '#fde68a', '#ffffff', '#fbbf24'][i % 4],
        delay: rnd(i, 3) * 0.2,
      };
    });
  }, [seed]);
  return stars.map((s, i) => (
    <m.svg
      key={i}
      viewBox="0 0 24 24"
      className="absolute"
      style={{ width: s.size, height: s.size, filter: `drop-shadow(0 0 6px ${s.color})` }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.2, rotate: 0 }}
      animate={{
        x: s.x,
        y: [0, s.y, s.y + 90],
        opacity: [0, 1, 0.6, 1, 0],
        scale: [0.2, 1.2, 0.8, 1.1, 0.6],
        rotate: 180,
      }}
      transition={{ duration: 1.8, delay: s.delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <path d="M12 1.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 8.8l7.1-.7z" fill={s.color} />
    </m.svg>
  ));
}

/** Three rockets burst into rings of sparks. */
function Fireworks({ seed }: { seed: number }) {
  const bursts = useMemo(() => {
    const rnd = rng(seed);
    return Array.from({ length: 3 }, (_, b) => ({
      x: (b - 1) * 115 + (rnd(b, 0) - 0.5) * 40,
      y: -70 - rnd(b, 1) * 90,
      delay: b * 0.4,
      color: SPARKS[(b * 2 + Math.floor(rnd(b, 3) * SPARKS.length)) % SPARKS.length]!,
      sparks: Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const dist = 70 + rnd(b * 20 + i, 2) * 45;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: SPARKS[(i + b * 2) % SPARKS.length]! };
      }),
    }));
  }, [seed]);
  return bursts.map((b, k) => (
    <span key={k} className="absolute">
      {/* The rocket going up. */}
      <m.span
        className="absolute -m-1 size-2 rounded-full bg-amber-100"
        style={{ boxShadow: '0 0 10px 3px #fde68a' }}
        initial={{ x: b.x, y: 200, opacity: 0 }}
        animate={{ y: [200, b.y, b.y], opacity: [0, 1, 0] }}
        transition={{ duration: 0.6, delay: b.delay, ease: 'easeOut' }}
      />
      {/* The flash as it bursts. */}
      <m.span
        className="absolute -m-10 size-20 rounded-full"
        style={{ background: `radial-gradient(circle, #fff 0%, ${b.color} 30%, transparent 70%)` }}
        initial={{ x: b.x, y: b.y, opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.4, 1.8] }}
        transition={{ duration: 0.6, delay: b.delay + 0.45, ease: 'easeOut' }}
      />
      {b.sparks.map((s, i) => (
        <m.span
          key={i}
          className="absolute -m-1.5 size-3 rounded-full"
          style={{ background: s.color, boxShadow: `0 0 10px 2px ${s.color}` }}
          initial={{ x: b.x, y: b.y, opacity: 0, scale: 0.4 }}
          animate={{ x: b.x + s.x, y: [b.y, b.y + s.y, b.y + s.y + 50], opacity: [0, 1, 1, 0], scale: [0.4, 1, 0.8, 0.3] }}
          transition={{ duration: 1.4, delay: b.delay + 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </span>
  ));
}
