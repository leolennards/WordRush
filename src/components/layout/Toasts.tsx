import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { TIMING } from '@/config/game';

interface Toast {
  id: number;
  text: string;
  tone: 'neutral' | 'success' | 'error';
  duration: number;
}

interface ToastContextValue {
  toast: (text: string, opts?: { tone?: Toast['tone']; duration?: number }) => void;
  /** Politely announce text to screen readers without a visible toast. */
  announce: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const nextId = useRef(1);

  const announce = useCallback((text: string) => {
    // Clear first so repeating the same message is announced again.
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    (text, opts) => {
      const id = nextId.current++;
      setToasts((prev) => [
        // Keep at most 3; replace an identical message instead of stacking it.
        ...prev.filter((t) => t.text !== text).slice(-2),
        { id, text, tone: opts?.tone ?? 'neutral', duration: opts?.duration ?? TIMING.toast },
      ]);
      announce(text);
    },
    [announce],
  );

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const value = useMemo(() => ({ toast, announce }), [toast, announce]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDone={dismiss} />
          ))}
        </AnimatePresence>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
        {announcement}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  useEffect(() => {
    if (!Number.isFinite(toast.duration)) return;
    const t = window.setTimeout(() => onDone(toast.id), toast.duration);
    return () => window.clearTimeout(t);
  }, [toast, onDone]);

  const tone =
    toast.tone === 'error'
      ? 'bg-text text-bg'
      : toast.tone === 'success'
        ? 'bg-accent text-accent-ink'
        : 'bg-text text-bg';

  return (
    <m.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md ${tone}`}
    >
      {toast.text}
    </m.div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
