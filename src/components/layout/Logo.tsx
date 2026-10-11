/** Wordskiis mark: a tilted tile stack with a "W". Uses theme tokens. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect x="6" y="2" width="24" height="24" rx="6" fill="var(--c-present)" transform="rotate(8 18 14)" />
      <rect x="2" y="6" width="24" height="24" rx="6" fill="var(--c-correct)" />
      <path
        d="M7.5 12.5 L10.4 23 L14 15.6 L17.6 23 L20.5 12.5"
        fill="none"
        stroke="var(--c-correct-ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
