import { useEffect, useRef } from 'react';

interface Handlers {
  onLetter: (letter: string) => void;
  onDelete: () => void;
  onEnter: () => void;
}

const INTERACTIVE = 'button, a, input, textarea, select, [role="button"], [role="switch"], [role="radio"], [role="tab"]';

/**
 * Global physical-keyboard input. Disabled while `enabled` is false (e.g. a
 * dialog is open). Enter/Space on a focused control keep their native
 * behaviour so keyboard users can operate buttons without also submitting.
 */
export function usePhysicalKeyboard(handlers: Handlers, enabled: boolean) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const onControl = Boolean(target?.closest(INTERACTIVE));

      if (e.key === 'Enter') {
        if (onControl) return;
        e.preventDefault();
        if (!e.repeat) ref.current.onEnter();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        ref.current.onDelete();
      } else if (/^[a-z]$/i.test(e.key)) {
        ref.current.onLetter(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
