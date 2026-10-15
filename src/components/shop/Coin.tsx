import { useId } from 'react';

/** A Wordskiis coin: a gold disc stamped with a W. */
export function Coin({ className = 'size-5', spin = false }: { className?: string; spin?: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={`${className} shrink-0 ${spin ? 'coin-spin' : ''}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id}-rim)`} />
      <circle cx="16" cy="16" r="11.5" fill={`url(#${id}-face)`} stroke="#b45309" strokeOpacity="0.45" strokeWidth="1" />
      <path d="M9.6 11.5h2.3l1.7 6.6 1.6-6.6h1.6l1.6 6.6 1.7-6.6h2.3l-2.9 9.6h-2l-1.5-5.9-1.5 5.9h-2z" fill="#92400e" />
      <path d="M7 10.5a10 10 0 0 1 6-5" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
