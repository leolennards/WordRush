import { useId } from 'react';

/** Little ridges around the rim, like a real coin's milled edge. */
const RIDGES = Array.from({ length: 40 }, (_, i) => (i / 40) * 360);

/** A 4-point sparkle. */
const SPARKLE = 'M0 -1 C0.12 -0.12 0.12 -0.12 1 0 C0.12 0.12 0.12 0.12 0 1 C-0.12 0.12 -0.12 0.12 -1 0 C-0.12 -0.12 -0.12 -0.12 0 -1 Z';

/**
 * A Wordskiis coin: polished gold with a milled edge and an engraved W.
 * `shine` sweeps a glint of light across it now and then, `sparkle` adds
 * twinkling stars, and `spin` flips it every few seconds.
 */
export function Coin({
  className = 'size-5',
  spin = false,
  shine = false,
  sparkle = false,
}: {
  className?: string;
  spin?: boolean;
  shine?: boolean;
  sparkle?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${className} shrink-0 overflow-visible ${spin ? 'coin-spin' : ''}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fff6bf" />
          <stop offset="0.28" stopColor="#fcd34d" />
          <stop offset="0.55" stopColor="#f59e0b" />
          <stop offset="0.82" stopColor="#b45309" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.36" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.22" stopColor="#fde68a" />
          <stop offset="0.52" stopColor="#fbbf24" />
          <stop offset="0.8" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
        <linearGradient id={`${id}-w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b45309" />
          <stop offset="1" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="24" cy="24" r="22.5" />
        </clipPath>
      </defs>

      {/* Rim with a milled edge. */}
      <circle cx="24" cy="24" r="22.5" fill={`url(#${id}-rim)`} />
      <g stroke="#7c2d12" strokeOpacity="0.32" strokeWidth="0.9" strokeLinecap="round">
        {RIDGES.map((a) => (
          <line key={a} x1="24" y1="2.2" x2="24" y2="4.4" transform={`rotate(${a} 24 24)`} />
        ))}
      </g>

      {/* The face, sunk into the rim. */}
      <circle cx="24" cy="24" r="17.8" fill="#92400e" fillOpacity="0.45" />
      <circle cx="24" cy="24.6" r="17.2" fill={`url(#${id}-face)`} />
      <circle cx="24" cy="24" r="14.6" fill="none" stroke="#b45309" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="1.2 1.6" />

      {/* Engraved W: a light lip below, the cut above. */}
      <path
        d="M13.2 16.5h4.3l2.6 10.1 2.8-10.1h3.4l2.8 10.1 2.6-10.1h4.3l-5 16h-3.9L24 23.1l-3.1 9.4H17z"
        fill="#fff7d6"
        fillOpacity="0.85"
        transform="translate(0.5 0.8)"
      />
      <path d="M13.2 16.5h4.3l2.6 10.1 2.8-10.1h3.4l2.8 10.1 2.6-10.1h4.3l-5 16h-3.9L24 23.1l-3.1 9.4H17z" fill={`url(#${id}-w)`} />

      {/* Polished highlight on the rim. */}
      <path d="M8.2 15.5a18 18 0 0 1 9.5-9.6" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M40.5 31.5a18 18 0 0 1-5.5 7" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" fill="none" />

      {/* A glint of light sweeping across. */}
      {shine && (
        <g clipPath={`url(#${id}-clip)`}>
          <g transform="rotate(24 24 24)">
            <rect className="coin-glint" x="-14" y="-6" width="12" height="60" fill={`url(#${id}-glint)`} />
          </g>
        </g>
      )}

      {sparkle && (
        <g fill="#fff">
          {[
            { at: 'translate(41 7) scale(5)', delay: '0s' },
            { at: 'translate(5 38) scale(3.4)', delay: '0.9s' },
            { at: 'translate(44 34) scale(2.6)', delay: '1.6s' },
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
