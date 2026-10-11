import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it is still announced). */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, title, hideTitle, children, footer }: DialogProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <DialogPanel onClose={onClose} title={title} hideTitle={hideTitle} footer={footer}>
          {children}
        </DialogPanel>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function DialogPanel({ onClose, title, hideTitle, children, footer }: Omit<DialogProps, 'open'>) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = panel.current;
    node?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <m.div
        className="absolute inset-0 bg-[var(--c-overlay)] backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        aria-hidden
      />
      <m.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[min(92dvh,46rem)] w-full flex-col rounded-t-[var(--radius-card)] border border-border bg-surface shadow-lg outline-none sm:max-w-md sm:rounded-[var(--radius-card)]"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-4 px-5 pt-2 pb-1 sm:px-6 sm:pt-5">
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'text-lg font-bold tracking-tight'}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 ml-auto grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer}
      </m.div>
    </div>
  );
}
