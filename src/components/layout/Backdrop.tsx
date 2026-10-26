import { memo } from 'react';

/** Decorative background: a soft dot grid and a gentle glow. Purely visual and inert. */
export const Backdrop = memo(function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="backdrop-dots" />
      <div className="backdrop-glow" />
    </div>
  );
});
