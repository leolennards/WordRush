import type { MouseEvent } from 'react';

/**
 * Stops a mouse/touch press from moving focus onto a control, so a later
 * physical Enter press submits the guess instead of re-activating that
 * control. Keyboard (Tab) focus is unaffected.
 */
export const keepFocus = (e: MouseEvent) => e.preventDefault();
