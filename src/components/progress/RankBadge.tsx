import type { CSSProperties } from 'react';
import { rankFor, type Rank } from '@/engine';

const SIZES = { xs: 28, sm: 40, md: 56, lg: 96, xl: 148 } as const;

/**
 * A rank emblem: a bevelled hexagon in the rank's colours with the level in
 * the middle. Higher ranks add a sheen, a glowing aura, a rotating ring,
 * orbiting sparks and, for Legends, prismatic colour, light rays and particles.
 */
export function RankBadge({
  level,
  rank = rankFor(level).rank,
  size = 'md',
  locked = false,
  showLevel = true,
  className = '',
}: {
  level: number;
  rank?: Rank;
  size?: keyof typeof SIZES;
  /** Greyed-out preview of a rank not reached yet. */
  locked?: boolean;
  /** Hide the number (e.g. rank previews show the emblem only). */
  showLevel?: boolean;
  className?: string;
}) {
  const fx = locked ? 0 : rank.effects;
  const px = SIZES[size];
  const style = {
    '--size': `${px}px`,
    '--from': rank.from,
    '--to': rank.to,
    '--ink': rank.ink,
  } as CSSProperties;

  return (
    <span
      className={`rank-badge ${className}`}
      data-fx={fx}
      data-locked={locked || undefined}
      style={style}
      role="img"
      aria-label={locked ? `${rank.name} (locked)` : showLevel ? `Level ${level}, ${rank.name}` : rank.name}
    >
      {fx >= 5 && <span className="rank-rays" aria-hidden />}
      {fx >= 3 && <span className="rank-ring" aria-hidden />}
      <span className="rank-hexwrap" aria-hidden>
        <span className="rank-hex">
          <span className="rank-hex-inner">
            {showLevel && <span className="rank-num">{level}</span>}
          </span>
          {fx >= 1 && <span className="rank-sheen" />}
        </span>
      </span>
      {fx >= 4 && (
        <span className="rank-orbit" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      )}
      {fx >= 5 && (
        <span className="rank-particles" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
      )}
    </span>
  );
}
